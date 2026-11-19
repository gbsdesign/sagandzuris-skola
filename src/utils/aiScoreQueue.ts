import { AiTeacherError, askAiScore, type AiScore, type DrillAbout } from './aiTeacher';
import { saveDrillScore } from './drillScores';
import { markDrillDone } from './maneraPractice';

// „ოსტატობა“'s AI score without the internet (stage 7, boards x-ultra-ai — „შეფასებას ინტერნეტი სჭირდება. ჩანაწერი შენახულია —
// როცა დაბრუნდება, გამოგიგზავნი“): the take waits on the device (IndexedDB, one a drill a person — a newer take replaces it)
// and is sent once the connection is back, from wherever the app is open. The answer is kept on the device for the drill's
// screen (`lastAiAnswer`) and its score saved like any other; an event (`AI_ANSWER_EVENT`) tells an open screen.

const DB_NAME = 'sg-ai-score-queue-v1';
const STORE = 'takes';
export const AI_ANSWER_EVENT = 'sg-ai-answer';

interface Pending { uid: string; drillId: string; about: DrillAbout; mp3: Blob; at: number; best: number }
export interface StoredAnswer extends AiScore { at: number; record: boolean; seen?: boolean }

const keyOf = (uid: string, drillId: string) => `${uid}~${drillId}`;
const answerKey = (uid: string, drillId: string) => `sg-ai-answer:${uid}:${drillId}`;

const open = () => new Promise<IDBDatabase>((resolve, reject) => {
  if (typeof indexedDB === 'undefined') { reject(new Error('no IndexedDB')); return; }
  const req = indexedDB.open(DB_NAME, 1);
  req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE); };
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

const run = async <T>(mode: IDBTransactionMode, job: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const req = job(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

/** Keeps a take to be scored once the connection is back. False when the phone cannot keep it. */
export const queueAiScore = async (p: Omit<Pending, 'at'>): Promise<boolean> => {
  try {
    await run('readwrite', s => s.put({ ...p, at: Date.now() }, keyOf(p.uid, p.drillId)));
    return true;
  } catch (e) {
    console.warn('AI score queue:', e);
    return false;
  }
};

/** A take of this drill still waiting for the connection. */
export const isAiScoreWaiting = async (uid: string, drillId: string) => {
  try { return Boolean(await run('readonly', s => s.get(keyOf(uid, drillId)))); } catch { return false; }
};

export const lastAiAnswer = (uid: string, drillId: string): StoredAnswer | null => {
  try { return JSON.parse(localStorage.getItem(answerKey(uid, drillId)) || 'null'); } catch { return null; }
};
export const markAiAnswerSeen = (uid: string, drillId: string) => {
  const a = lastAiAnswer(uid, drillId);
  if (!a || a.seen) return;
  try { localStorage.setItem(answerKey(uid, drillId), JSON.stringify({ ...a, seen: true })); } catch { /* storage off */ }
};
const keepAnswer = (uid: string, drillId: string, a: StoredAnswer) => {
  try { localStorage.setItem(answerKey(uid, drillId), JSON.stringify(a)); } catch { /* storage off */ }
};

let flushing = false;
/** Sends every waiting take; one that cannot go yet stays (offline, a busy model), one that never will is dropped. */
export const flushAiScores = async () => {
  if (flushing || navigator.onLine === false) return;
  flushing = true;
  try {
    const all = await run('readonly', s => s.getAll() as IDBRequest<Pending[]>).catch(() => [] as Pending[]);
    for (const p of all) {
      try {
        const r = await askAiScore(p.uid, p.mp3, p.about);
        const record = await saveDrillScore(p.drillId, r.score, p.uid, p.best);
        markDrillDone(p.drillId, p.uid);
        keepAnswer(p.uid, p.drillId, { ...r, at: Date.now(), record });
        await run('readwrite', s => s.delete(keyOf(p.uid, p.drillId)));
        window.dispatchEvent(new CustomEvent(AI_ANSWER_EVENT, { detail: { uid: p.uid, drillId: p.drillId } }));
      } catch (e) {
        const kind = e instanceof AiTeacherError ? e.kind : 'failed';
        if (kind === 'offline') break;
        // the kids' mode or a missing setup will not change by waiting: the take goes
        if (kind === 'kids' || kind === 'setup') await run('readwrite', s => s.delete(keyOf(p.uid, p.drillId))).catch(() => undefined);
      }
    }
  } finally {
    flushing = false;
  }
};

let started = false;
/** Once a visit: send what waits now, and again whenever the connection comes back. */
export const startAiScoreQueue = () => {
  if (started || typeof window === 'undefined') return;
  started = true;
  window.addEventListener('online', () => { void flushAiScores(); });
  void flushAiScores();
};
