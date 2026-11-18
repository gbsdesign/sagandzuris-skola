// „მასწავლებლის ხმა“ (board x-ai-khma) — the pure part. The teacher's ready sentences (utils/aiLesson.ts) are recorded
// once by the owner (components/aiLesson/TeacherVoiceStudio) in a woman's and a man's voice and kept in aiVoice/{voice}_{hash};
// a phone fetches a sentence once and keeps it. A shown text is split into sentences and each one with a recording is
// spoken; a sentence without one — and every sentence the AI writes — stays text only. Tested in tests/teacherVoice.test.ts.

import { READY_SENTENCES, ordinal } from './aiLesson';

export type VoiceKind = 'female' | 'male';
export type VoiceSpeed = 'slow' | 'normal' | 'fast';
export interface VoiceSettings { on: boolean; voice: VoiceKind; speed: VoiceSpeed }

export const VOICE_DEFAULT: VoiceSettings = { on: true, voice: 'female', speed: 'normal' };
export const VOICE_KEY = 'sg-ai-voice';
export const VOICE_WORD: Record<VoiceKind, string> = { female: 'ქალის', male: 'კაცის' };
export const SPEED_WORD: Record<VoiceSpeed, string> = { slow: 'ნელი', normal: 'ჩვეულებრივი', fast: 'სწრაფი' };
/** played this much faster or slower (the pitch kept) */
export const SPEED_RATE: Record<VoiceSpeed, number> = { slow: 0.85, normal: 1, fast: 1.15 };

export const readVoiceSettings = (raw: string | null): VoiceSettings => {
  try {
    const v = raw ? JSON.parse(raw) : {};
    return {
      on: typeof v.on === 'boolean' ? v.on : VOICE_DEFAULT.on,
      voice: v.voice === 'male' ? 'male' : 'female',
      speed: v.speed === 'slow' || v.speed === 'fast' ? v.speed : 'normal',
    };
  } catch { return VOICE_DEFAULT; }
};

/** a text's sentences, as the teacher's lines join them („ზუსტად! მესამე ნოტი ცოტა დაბლა იყო.“ → two) */
export const splitSentences = (text: string): string[] =>
  text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?…])\s+(?=\S)/).map(s => s.trim()).filter(Boolean);

/** FNV-1a of a sentence (spaces folded), as a short id */
export const sentenceHash = (s: string): string => {
  let h = 0x811c9dc5;
  for (const ch of s.replace(/\s+/g, ' ').trim()) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36).padStart(7, '0');
};
export const clipId = (voice: VoiceKind, sentence: string) => `${voice}_${sentenceHash(sentence)}`;

const COUNT = ['', '', 'ორი', 'სამი', 'ოთხი', 'ხუთი', 'ექვსი'];
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

/**
 * Every sentence worth a recording: the ready sentences' own, and the forms the lesson makes of them (a note's place
 * 1–12, a piece of 2–7 notes, a phrase's number, days since a phrase was learned). The live words said while singing
 * („ზუსტად“, „ოდნავ მაღლა“) are left out — nothing speaks then.
 */
export const VOICE_SENTENCES: string[] = (() => {
  const out: string[] = [];
  const add = (...lines: string[]) => lines.flatMap(splitSentences).forEach(s => out.push(s));
  READY_SENTENCES.filter(g => g.title !== 'სიმღერისას').forEach(g => add(...g.lines));
  // one correction: any of the first twelve notes
  range(1, 12).forEach(k => add(`${ordinal(k)} ნოტი ცოტა დაბლა იყო.`, `${ordinal(k)} ნოტი ცოტა მაღლა იყო.`, `${ordinal(k)} ნოტი არ გაისმა.`));
  // a phrase in pieces (components/aiLesson/PhraseStep)
  range(2, 7).forEach(n => add(`ჯერ პირველი ${n} ნოტი.`, `ახლა შემდეგი ${n} ნოტი.`, `ჯერ მხოლოდ ${n} ნოტი.`, `ჯერ მხოლოდ ${n} ნოტი, ნელა.`));
  add('მოუსმინე და გაიმეორე.', 'ეს ადგილი ძნელია.', 'ახლა ყველა ერთად. ორი ხმა შენ გელოდება.', 'ახლა ერთად. მეორე ხმა შენ გელოდება.',
    'ეს ფრაზა ადრე ისწავლე. ერთხელ იმღერე — გავიხსენოთ.', 'ახლა მარტო — მთელი ფრაზა.', 'სამი წრე მორჩა. ახლა — მარტო.',
    'გავიხსენეთ.', 'ხვალ კიდევ გავიმეორებთ.', 'ეს ფრაზა დღეს ისწავლე.', 'ეს ფრაზა გუშინ ისწავლე.');
  range(2, 14).forEach(d => add(`ეს ფრაზა ${d} დღის წინ ისწავლე.`));
  range(1, 12).forEach(k => add(`${ordinal(k)} ფრაზა ნასწავლია.`));
  // the lesson's other parts (components/aiLesson/steps, AiLesson)
  add('კარგია. ახლა — გამეორება.', 'ბოლოს — სიამოვნებისთვის. შეცდომას აღარ ვითვლი.', 'კარგი იყო. ახლა — შეჯამება.',
    'ეს ნაწილი დღეს გამოვტოვოთ.', 'დღეს ხმას ვავარჯიშებთ. დავიწყოთ გახურებით.', 'გამარჯობა!');
  // the summary
  range(2, 6).forEach(n => add(`დღეს ${n} ფრაზა ისწავლე.`));
  range(2, 12).forEach(k => add(`ხვალ — ${ordinal(k)} ფრაზა.`));
  // praise only when true
  range(3, 6).forEach(n => add(`${COUNT[n]} ცდა — და უკვე გამოდის.`, `${COUNT[n]} ცდა — და უკვე ნახევარი გამოდის.`));
  return [...new Set(out)];
})();

const KNOWN = new Set(VOICE_SENTENCES);
/** a sentence the studio records (anything else the teacher shows stays text) */
export const isVoiceSentence = (s: string) => KNOWN.has(s.replace(/\s+/g, ' ').trim());

// ---- the teacher talking now: the voice commands do not listen meanwhile ---------------------------------------------

let talking = false;
const talkListeners = new Set<() => void>();
export const setTeacherTalking = (on: boolean) => {
  if (talking === on) return;
  talking = on;
  talkListeners.forEach(l => l());
};
export const teacherTalking = () => talking;
export const onTeacherTalking = (l: () => void) => { talkListeners.add(l); return () => { talkListeners.delete(l); }; };

// ---- the PCM the Live API sends: 16-bit little-endian, mono -------------------------------------------------------

/** base64 PCM16 chunks → one Float32 signal */
export const pcmToFloat = (chunks: Uint8Array[]): Float32Array => {
  const total = chunks.reduce((n, c) => n + c.length, 0) >> 1;
  const out = new Float32Array(total);
  let at = 0;
  for (const c of chunks) {
    const view = new DataView(c.buffer, c.byteOffset, c.byteLength);
    for (let i = 0; i + 1 < c.length; i += 2) out[at++] = view.getInt16(i, true) / 32768;
  }
  return out;
};

/** the quiet before and after the words cut off (a little room left on both sides) */
export const trimQuiet = (x: Float32Array, rate: number, floor = 0.01): Float32Array => {
  let a = 0, b = x.length - 1;
  while (a < x.length && Math.abs(x[a]) < floor) a++;
  while (b > a && Math.abs(x[b]) < floor) b--;
  if (a >= b) return x.subarray(0, 0);
  const pad = Math.round(rate * 0.12);
  return x.subarray(Math.max(0, a - pad), Math.min(x.length, b + pad));
};

/** the sample rate in a mime like „audio/pcm;rate=24000“ */
export const rateOf = (mime: string | undefined) => Number(mime?.match(/rate=(\d+)/)?.[1]) || 24000;
