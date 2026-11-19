import { useEffect, useSyncExternalStore } from 'react';
import { deleteField, doc, getDoc, onSnapshot, setDoc, type Bytes } from 'firebase/firestore';
import { db } from '../../firebase';
import {
  SPEED_RATE, VOICE_KEY, cleanPhraseTexts, readVoiceSettings, sentenceHash, setTeacherTalking, splitSentences,
  type PhraseTexts, type VoiceKind, type VoiceSettings,
} from '../../utils/teacherVoice';

// „მასწავლებლის ხმა“ on the phone (board x-ai-khma): the device's settings (sg-ai-voice), the list of what is recorded
// (aiVoice/index {female: {hash: at}, male: {…}}, kept on the device too), each clip fetched once and kept in the Cache
// API, and the player. It speaks only inside the AI lesson (`useTeacherVoiceHere`), never in church mode or a call (the
// lesson gives `allowed`), and a tap anywhere hushes it — so it never sounds into a take.

// ---- settings ---------------------------------------------------------------------------------------------------------

const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
let settings: VoiceSettings = readVoiceSettings(read(VOICE_KEY));
const settingsListeners = new Set<() => void>();

export const voiceSettings = () => settings;
export const saveVoiceSettings = (patch: Partial<VoiceSettings>) => {
  settings = { ...settings, ...patch };
  try { localStorage.setItem(VOICE_KEY, JSON.stringify(settings)); } catch { /* kept for this visit */ }
  settingsListeners.forEach(l => l());
  if (!settings.on) hushTeacher();
};
const subSettings = (l: () => void) => { settingsListeners.add(l); return () => { settingsListeners.delete(l); }; };
export const useVoiceSettings = () => useSyncExternalStore(subSettings, () => settings);

// ---- what is recorded ---------------------------------------------------------------------------------------------

export type VoiceIndex = Record<VoiceKind, Record<string, number>>;
const INDEX_KEY = 'sg-ai-voice-index';
const cleanIndex = (d: unknown): VoiceIndex => {
  const o = (d && typeof d === 'object' ? d : {}) as Record<string, unknown>;
  const one = (v: unknown) => Object.fromEntries(Object.entries((v && typeof v === 'object' ? v : {}) as Record<string, unknown>)
    .filter(([, at]) => typeof at === 'number')) as Record<string, number>;
  return { female: one(o.female), male: one(o.male) };
};
let index: VoiceIndex = cleanIndex((() => { try { return JSON.parse(read(INDEX_KEY) || '{}'); } catch { return {}; } })());
let indexLoad: Promise<void> | null = null;
const indexListeners = new Set<() => void>();
const setIndex = (next: VoiceIndex) => {
  index = next;
  try { localStorage.setItem(INDEX_KEY, JSON.stringify(next)); } catch { /* fetched again next time */ }
  indexListeners.forEach(l => l());
};

/** the list from the server once a visit (the device's copy meanwhile, and offline) */
export const loadVoiceIndex = (fresh = false) => {
  if (!indexLoad || fresh) {
    indexLoad = getDoc(doc(db, 'aiVoice', 'index'))
      .then(s => setIndex(cleanIndex(s.data())))
      .catch(e => { console.warn('ai voice index:', e?.code || e); indexLoad = null; });
  }
  return indexLoad;
};
/** the studio kept a clip: the list knows it at once */
export const noteClipSaved = (voice: VoiceKind, hash: string, at: number) =>
  setIndex({ ...index, [voice]: { ...index[voice], [hash]: at } });

const subIndex = (l: () => void) => { indexListeners.add(l); return () => { indexListeners.delete(l); }; };
export const useVoiceIndex = () => useSyncExternalStore(subIndex, () => index);
export const clipAt = (voice: VoiceKind, sentence: string) => index[voice]?.[sentenceHash(sentence)] ?? 0;

// ---- the clips --------------------------------------------------------------------------------------------------------

const CACHE = 'sg-ai-voice-v1';
const cacheUrl = (id: string, at: number) => `${location.origin}/__sg-ai-voice/${id}-${at}.mp3`;
const clips = new Map<string, Promise<string | null>>();

/** a sentence's recording as a playable address, or null (none recorded, or offline and never fetched) */
export const clipUrl = (voice: VoiceKind, sentence: string): Promise<string | null> => {
  const hash = sentenceHash(sentence);
  const at = index[voice]?.[hash];
  if (!at) return Promise.resolve(null);
  const id = `${voice}_${hash}`;
  const key = `${id}-${at}`;
  const had = clips.get(key);
  if (had) return had;
  const p = (async () => {
    try {
      const hit = await (await caches.open(CACHE)).match(cacheUrl(id, at));
      if (hit) return URL.createObjectURL(await hit.blob());
    } catch { /* no Cache API here: from the server */ }
    if (navigator.onLine === false) return null;
    const snap = await getDoc(doc(db, 'aiVoice', id));
    const mp3 = snap.data()?.mp3 as Bytes | undefined;
    if (!mp3) return null;
    const blob = new Blob([mp3.toUint8Array() as BlobPart], { type: 'audio/mpeg' });
    try { await (await caches.open(CACHE)).put(cacheUrl(id, at), new Response(blob, { headers: { 'Content-Type': 'audio/mpeg' } })); } catch { /* kept for this visit only */ }
    return URL.createObjectURL(blob);
  })().catch(e => { console.warn('ai voice clip:', e?.code || e); return null; });
  clips.set(key, p);
  // a miss (offline) is tried again next time
  void p.then(url => { if (!url) clips.delete(key); });
  return p;
};

// ---- where it may speak -----------------------------------------------------------------------------------------------

let scopes = 0;
const scopeListeners = new Set<() => void>();
const subScope = (l: () => void) => { scopeListeners.add(l); return () => { scopeListeners.delete(l); }; };
const useScope = () => useSyncExternalStore(subScope, () => scopes > 0);

/** The AI lesson: the teacher may speak while it is open and `allowed` (the switch on for the person, not the kids'
 *  mode, not church mode, not a call). Loads the list of recordings. */
export const useTeacherVoiceHere = (allowed: boolean) => {
  useEffect(() => {
    if (!allowed) return;
    scopes += 1;
    scopeListeners.forEach(l => l());
    void loadVoiceIndex();
    return () => {
      scopes -= 1;
      scopeListeners.forEach(l => l());
      hushTeacher();
    };
  }, [allowed]);
};

// ---- the player -------------------------------------------------------------------------------------------------------

let audio: HTMLAudioElement | null = null;
let run = 0;

// a tap anywhere (but on a speaker button) hushes the teacher: the next thing may be singing
const onTap = (e: Event) => {
  if ((e.target as Element | null)?.closest?.('[data-teacher-voice]')) return;
  hushTeacher();
};
const watchTaps = (on: boolean) => {
  if (on) { document.addEventListener('pointerdown', onTap, true); document.addEventListener('keydown', onTap, true); }
  else { document.removeEventListener('pointerdown', onTap, true); document.removeEventListener('keydown', onTap, true); }
};

export const hushTeacher = () => {
  run += 1;
  if (audio) { audio.onended = null; audio.onerror = null; audio.pause(); }
  setTeacherTalking(false);
  watchTaps(false);
};

const playOne = (url: string, rate: number) => new Promise<void>(done => {
  const a = audio ?? new Audio();
  audio = a;
  a.onended = () => done();
  a.onerror = () => done();
  a.src = url;
  a.playbackRate = rate;
  a.preservesPitch = true;
  a.play().catch(() => done());
});

/**
 * Says a text's recorded sentences one after another (a sentence with no recording is skipped — it stays text).
 * `force`: the speaker button — it speaks even with „ხმით მელაპარაკოს“ off (never outside the lesson's scope).
 */
export const speakTeacher = async (text: string, force = false) => {
  hushTeacher();
  const my = run;
  const s = settings;
  if ((!s.on && !force) || scopes <= 0) return;
  const parts = splitSentences(text).filter(x => clipAt(s.voice, x));
  if (!parts.length) return;
  const urls = parts.map(x => clipUrl(s.voice, x));
  setTeacherTalking(true);
  watchTaps(true);
  for (const u of urls) {
    const url = await u;
    if (my !== run) return;
    if (!url) continue;
    await playOne(url, SPEED_RATE[s.speed]);
    if (my !== run) return;
    await new Promise(r => window.setTimeout(r, 160));
    if (my !== run) return;
  }
  setTeacherTalking(false);
  watchTaps(false);
};

/** A ready sample of the settings screen: played in the chosen voice and speed, true when it had a recording. */
export const playSample = async (text: string) => {
  if (!splitSentences(text).some(x => clipAt(settings.voice, x))) return false;
  await speakTeacher(text, true);
  return true;
};

/**
 * `TeacherSays`'s part: a new text is spoken by itself (once, a moment after it shows) while the lesson allows and the
 * setting is on. `has` = some sentence of it has a recording (the speaker button then plays it).
 */
export const useTeacherVoiceAuto = (text: string | undefined) => {
  const s = useVoiceSettings();
  const idx = useVoiceIndex();
  const here = useScope();
  const has = here && !!text && splitSentences(text).some(x => idx[s.voice]?.[sentenceHash(x)]);
  useEffect(() => {
    if (!has || !s.on || !text) return;
    const t = window.setTimeout(() => void speakTeacher(text), 300);
    return () => window.clearTimeout(t);
    // a text speaks once; the voice or a new recording do not repeat it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, has]);
  return { has, play: () => { if (text) void speakTeacher(text, true); } };
};

// ---- the school's own words (board x-ai-prazebi) -------------------------------------------------------------------
// settings/aiPhrases { texts: { [hash]: text } }: one live listener for the whole app while any teacher's line is on
// screen, the last copy kept on the device (the lesson works offline).

const PHRASES_KEY = 'sg-ai-phrases';
let phrases: PhraseTexts = cleanPhraseTexts((() => { try { return JSON.parse(read(PHRASES_KEY) || '{}'); } catch { return {}; } })());
const phraseListeners = new Set<() => void>();
let phraseStop: (() => void) | null = null;
const phrasesRef = () => doc(db, 'settings', 'aiPhrases');
const subPhrases = (l: () => void) => {
  phraseListeners.add(l);
  if (!phraseStop) {
    phraseStop = onSnapshot(phrasesRef(), snap => {
      phrases = cleanPhraseTexts(snap.data()?.texts);
      try { localStorage.setItem(PHRASES_KEY, JSON.stringify(phrases)); } catch { /* read again next time */ }
      phraseListeners.forEach(f => f());
    }, e => console.warn('ai phrases:', e?.code || e));
  }
  return () => {
    phraseListeners.delete(l);
    if (!phraseListeners.size && phraseStop) { phraseStop(); phraseStop = null; }
  };
};
/** the school's changed sentences, live */
export const usePhraseTexts = () => useSyncExternalStore(subPhrases, () => phrases);
/** the school changes one sentence (null = back to the app's own) */
export const savePhraseText = (sentence: string, text: string | null) =>
  setDoc(phrasesRef(), { texts: { [sentenceHash(sentence)]: text ?? deleteField() }, at: new Date().toISOString() }, { merge: true });
