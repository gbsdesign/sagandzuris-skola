import { getApp } from 'firebase/app';
import { Bytes, doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { startAppCheck } from '../../utils/samosiTryOn';
import { noteAiCall } from '../../utils/aiRules';
import { encodeMp3 } from '../../utils/chantSynth';
import { pcmToFloat, rateOf, sentenceHash, trimQuiet, type VoiceKind } from '../../utils/teacherVoice';
import { noteClipSaved } from './TeacherVoice';

// „მასწავლებლის ხმის სახელოსნო“'s maker: one ready sentence read aloud by Gemini through Firebase AI Logic's Live API
// (generateContent gives no sound in this SDK — its responseModalities take only IMAGE). A live session is opened with
// the AUDIO answer and a prebuilt voice, the sentence is sent with the instruction to read it exactly, the 24 kHz PCM is
// gathered until the turn is complete, cut of its quiet and made an MP3, and kept in aiVoice/{voice}_{hash}
// {mp3, text, voice, at} (< 200 KB; firestore.rules: the owner writes, the signed-in read) with the list aiVoice/index.

/** the Live models to try, the newest first; the one that answered is remembered on the device */
export const LIVE_MODELS = ['gemini-2.5-flash-native-audio-preview-09-2025', 'gemini-live-2.5-flash-preview', 'gemini-2.0-flash-live-001'];
const MODEL_KEY = 'sg-ai-voice-model';
/** Gemini's prebuilt voices: a calm woman's and a man's */
export const VOICE_NAMES: Record<VoiceKind, string> = { female: 'Kore', male: 'Charon' };
const MAX_BYTES = 195_000;
const TURN_MS = 40_000;

const INSTRUCTION = [
  'შენ ხარ ქართული გალობის სკოლის მასწავლებლის ხმა.',
  'მოგეცემა ერთი ან ორი ქართული წინადადება. წაიკითხე ზუსტად ის, რაც წერია — ქართულად, ქართული გამოთქმით,',
  'მშვიდად, თბილად და გარკვევით, ბუნებრივი ტემპით. არაფერი დაამატო და არაფერი გამოტოვო; არ მიესალმო, არ უპასუხო,',
  'არ ახსნა — მხოლოდ წაიკითხე.',
].join(' ');

export type MakeProblem = 'setup' | 'no-credits' | 'offline' | 'failed' | 'too-long' | 'silent';
export class MakeError extends Error { constructor(public kind: MakeProblem) { super(kind); } }
export const MAKE_PROBLEM_TEXT: Record<MakeProblem, string> = {
  setup: 'ხმის ჩაწერა ჯერ ვერ მუშაობს: Firebase AI Logic-ში Live API (ხმოვანი მოდელი) ჩართული არ არის ან მოდელი არ მოიძებნა.',
  'no-credits': 'AI-ს კრედიტი ამოიწურა — მოგვიანებით სცადე.',
  offline: 'ინტერნეტი არ არის.',
  failed: 'ხმა ვერ ჩაიწერა — კიდევ სცადე.',
  'too-long': 'ჩანაწერი ძალიან დიდი გამოვიდა — კიდევ სცადე.',
  silent: 'პასუხში ხმა არ იყო — კიდევ სცადე.',
};

const b64 = (s: string) => { const bin = atob(s); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; };
const modelMissing = (e: unknown) => /not.?found|404|not supported|unsupported model|models\//i.test(String((e as Error)?.message || e));
const kindOf = (e: unknown): MakeProblem => {
  if (e instanceof MakeError) return e.kind;
  const t = String((e as Error)?.message || e);
  if (/prepay|credits|depleted|quota|resource.?exhausted|429/i.test(t)) return 'no-credits';
  if (/api.?key|not.?enabled|permission|403|billing|ai.?logic|app.?check|recaptcha|not.?found|404|websocket|1007|1008/i.test(t)) return 'setup';
  return navigator.onLine === false ? 'offline' : 'failed';
};

const modelsToTry = () => {
  let first: string | null = null;
  try { first = localStorage.getItem(MODEL_KEY); } catch { /* none kept */ }
  return first && LIVE_MODELS.includes(first) ? [first, ...LIVE_MODELS.filter(m => m !== first)] : LIVE_MODELS;
};

/** one live session: the sentence in, its PCM out */
const speakOnce = async (model: string, text: string, voice: VoiceKind) => {
  const { getAI, getLiveGenerativeModel, GoogleAIBackend, ResponseModality } = await import('firebase/ai');
  const live = getLiveGenerativeModel(getAI(getApp(), { backend: new GoogleAIBackend() }), {
    model,
    systemInstruction: INSTRUCTION,
    generationConfig: {
      responseModalities: [ResponseModality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_NAMES[voice] } } },
      temperature: 0.2,
    },
  });
  const session = await live.connect();
  const chunks: Uint8Array[] = [];
  let rate = 24000;
  let timer = 0;
  try {
    await session.send(`წაიკითხე ზუსტად: ${text}`, true);
    const gather = (async () => {
      for await (const m of session.receive()) {
        if (m.type !== 'serverContent') continue;
        for (const p of m.modelTurn?.parts ?? []) {
          const d = p.inlineData;
          if (d?.data && /audio/i.test(d.mimeType)) { rate = rateOf(d.mimeType); chunks.push(b64(d.data)); }
        }
        if (m.turnComplete) break;
      }
    })();
    await Promise.race([gather, new Promise<never>((_, no) => { timer = window.setTimeout(() => no(new MakeError('failed')), TURN_MS); })]);
  } finally {
    window.clearTimeout(timer);
    await session.close().catch(() => undefined);
  }
  return { samples: pcmToFloat(chunks), rate };
};

const toMp3 = async (samples: Float32Array, rate: number) => {
  const buffer = new AudioBuffer({ length: samples.length, numberOfChannels: 1, sampleRate: rate });
  buffer.getChannelData(0).set(samples);
  let mp3 = await encodeMp3(buffer, undefined, 48);
  if (mp3.size > MAX_BYTES) mp3 = await encodeMp3(buffer, undefined, 32);
  if (mp3.size > MAX_BYTES) throw new MakeError('too-long');
  return mp3;
};

/** Reads one sentence aloud in the given voice and keeps it; returns the MP3 to hear. Counted as one AI answer. */
export const makeVoiceClip = async (uid: string, text: string, voice: VoiceKind): Promise<Blob> => {
  if (navigator.onLine === false) throw new MakeError('offline');
  try {
    await startAppCheck();
    let got: { samples: Float32Array; rate: number } | null = null;
    let last: unknown = null;
    for (const model of modelsToTry()) {
      try {
        got = await speakOnce(model, text, voice);
        try { localStorage.setItem(MODEL_KEY, model); } catch { /* tried in order next time */ }
        break;
      } catch (e) {
        last = e;
        if (!modelMissing(e)) throw e;
      }
    }
    if (!got) throw last ?? new MakeError('setup');
    const words = trimQuiet(got.samples, got.rate);
    if (words.length < got.rate * 0.3) throw new MakeError('silent');
    const mp3 = await toMp3(words, got.rate);
    noteAiCall(uid);
    const hash = sentenceHash(text);
    const at = Date.now();
    await setDoc(doc(db, 'aiVoice', `${voice}_${hash}`), {
      mp3: Bytes.fromUint8Array(new Uint8Array(await mp3.arrayBuffer())), text, voice, at,
    });
    await setDoc(doc(db, 'aiVoice', 'index'), { [voice]: { [hash]: at } }, { merge: true });
    noteClipSaved(voice, hash, at);
    return mp3;
  } catch (e) {
    console.warn('ai voice make:', e);
    throw e instanceof MakeError ? e : new MakeError(kindOf(e));
  }
};
