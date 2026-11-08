import { useEffect, useState } from 'react';
import { getApp } from 'firebase/app';
import { Bytes, arrayRemove, arrayUnion, deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { AI_TEACHER_MODEL } from './aiTeacher';
import { startAppCheck } from './samosiTryOn';
import { georgiaToday } from './psalter';
import type { Outfit } from './samosiTry';

// „ჩემი სამოსი“'s real parts (2026-11-08, the user's picks: only the camera, a small photo kept, the dress too): a part
// stays for good only once the member photographs their own real one and the AI sees it is that thing. The ids of the
// proven parts are in students/{uid}.samosiReal (the chokha's) and .kabaReal (the dress's); each proof photo, small, in
// samosiProof/{uid}/parts/{partId} (the member, their teachers and admins see it). A part tapped without a photo is only
// tried on (utils/samosiTry.ts).

/** the student's record's field of each outfit's proven parts */
export const REAL_FIELD: Record<Outfit, 'samosiReal' | 'kabaReal'> = { chokha: 'samosiReal', kaba: 'kabaReal' };

/** checks a day on this device (the owner: no limit) */
export const PROOF_DAILY = 10;

// what each part is, as the model reads it
const PART_WORDS: Record<string, string> = {
  chokha: 'a chokha — the traditional Georgian men\'s long fitted coat, usually with rows of cartridge holders (gazyri) on the chest',
  akhalukhi: 'an akhalukhi — the fitted shirt worn under a Georgian chokha, with a high stand-up collar and a row of small buttons',
  masrebi: 'masrebi (gazyri) — the row of cartridge holders on the chest of a Georgian chokha (a chokha whose chest shows them counts)',
  kamari: 'a narrow leather belt worn with a Georgian chokha, often with silver fittings',
  khanjali: 'a khanjali — a Georgian (Caucasian) straight double-edged dagger, often in an ornamented sheath',
  aziurebi: 'aziurebi — soft knee-high leather boots worn with a chokha (any soft high leather boots count)',
  papanaki: 'a papanaki — a small flat round felt cap of Georgian traditional dress, often embroidered',
  papakha: 'a papakha — a tall hat of sheep fleece (fur)',
  kakhuri: 'a Kakhetian hat — a felt hat with a turned-up band',
  svanuri: 'a Svan hat — a round felt cap, usually grey or white, with cords sewn over the crown',
  kabalakhi: 'a kabalakhi (bashlyk) — a hood with two long scarf-like ends',
  kaba: 'a kartuli kaba — the long traditional Georgian women\'s dress with a fitted bodice and a wide long skirt',
  gulispiri: 'a gulispiri — the embroidered decorative chest panel of a traditional Georgian women\'s dress',
  sartqeli: 'a sartqeli — the long embroidered sash of a traditional Georgian women\'s dress, its ends hanging down the front',
  katibi: 'a katibi — the traditional Georgian women\'s velvet overcoat, often trimmed with fur or gold braid',
  lechaki: 'a lechaki — the thin white veil of Georgian traditional dress, worn falling from a headband (tavsakravi)',
};

const prompt = (id: string, label: string) => [
  'You check a photo for a Georgian school app, where students collect the parts of the national costume.',
  `A student says they own a real ${PART_WORDS[id] || label} (in Georgian „${label}“) and has just photographed it with the phone's camera.`,
  `Does the photo show a real, physical ${label} of this kind — worn by someone, held, hanging or lying anywhere?`,
  'Answer no when the photo shows a screen or monitor, a printed or drawn picture of it, when the thing is clearly something else,',
  'or when the photo is too dark or blurred to tell. Be fair, not strict: a simple, home-made, child\'s or souvenir one counts,',
  'and so does one that is part of a whole costume in the photo.',
  'Reply only with JSON: {"ok": true or false, "why": "one short kind sentence in Georgian to the student, with „შენ“;',
  'when no, say what to do — e.g. photograph it closer, whole, in good light"}.',
].join(' ');

export type ProofProblem = 'setup' | 'no-credits' | 'offline' | 'failed' | 'no-tries';
export class ProofError extends Error {
  constructor(public kind: ProofProblem) { super(kind); }
}
export const PROOF_PROBLEM_TEXT: Record<ProofProblem, string> = {
  setup: 'შემოწმება ჯერ არ არის ჩართული — მალე ჩაირთვება.',
  'no-credits': 'შემოწმება დღეს დაიღალა — ხვალ სცადე.',
  offline: 'ინტერნეტი არ არის — შემოწმებას ინტერნეტი სჭირდება.',
  failed: 'პასუხი ვერ მოვიდა — ცოტა ხანში კიდევ სცადე.',
  'no-tries': `დღეს უკვე ${PROOF_DAILY}-ჯერ შეამოწმე — ხვალ ისევ შეგეძლება.`,
};

const dayKey = (uid: string) => `sg-samosi-proof-${uid}-${georgiaToday()}`;
const usedToday = (uid: string) => { try { return Number(localStorage.getItem(dayKey(uid))) || 0; } catch { return 0; } };
const countTry = (uid: string) => { try { localStorage.setItem(dayKey(uid), String(usedToday(uid) + 1)); } catch { /* storage off */ } };
export const proofTriesLeft = (uid: string, unlimited: boolean) => (unlimited ? Infinity : Math.max(0, PROOF_DAILY - usedToday(uid)));

const offline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

const blobToBase64 = (b: Blob) => new Promise<string>((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(',')[1] || '');
  r.onerror = () => reject(r.error);
  r.readAsDataURL(b);
});

/** the photo scaled down to `max` px on its longer side, as a JPEG */
const shrink = async (file: Blob, max: number, quality: number): Promise<Blob> => {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * k));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * k));
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((done, fail) => canvas.toBlob(b => (b ? done(b) : fail(new Error('canvas'))), 'image/jpeg', quality));
  } finally {
    URL.revokeObjectURL(url);
  }
};

/** The model's answer, made safe: {ok, why}; null when it is not one. */
export const parseVerdict = (raw: string): { ok: boolean; why: string } | null => {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const o = JSON.parse(m[0]);
    if (typeof o?.ok !== 'boolean') return null;
    return { ok: o.ok, why: typeof o.why === 'string' ? o.why.replace(/\*+/g, '').trim().slice(0, 300) : '' };
  } catch {
    return null;
  }
};

export interface Verdict { ok: boolean; why: string; small: Blob }

/** Asks the AI whether `photo` shows the member's real part; counts the try only when an answer came. `small` = the
 *  photo to keep when it does. */
export const checkRealPart = async (uid: string, part: { id: string; label: string }, photo: Blob, unlimited = false): Promise<Verdict> => {
  if (proofTriesLeft(uid, unlimited) <= 0) throw new ProofError('no-tries');
  if (offline()) throw new ProofError('offline');
  const [big, small] = await Promise.all([shrink(photo, 1024, 0.86), shrink(photo, 360, 0.8)]);
  const data = await blobToBase64(big);
  let raw = '';
  try {
    await startAppCheck();
    const { getAI, getGenerativeModel, GoogleAIBackend } = await import('firebase/ai');
    const model = getGenerativeModel(getAI(getApp(), { backend: new GoogleAIBackend() }), {
      model: AI_TEACHER_MODEL,
      generationConfig: { responseMimeType: 'application/json' },
    });
    const res = await model.generateContent([{ text: prompt(part.id, part.label) }, { inlineData: { mimeType: 'image/jpeg', data } }]);
    raw = res.response.text().trim();
  } catch (err) {
    console.warn('samosi proof note:', err);
    const text = String((err as Error)?.message || err);
    if (/prepay|credits|depleted|quota|resource.?exhausted|429/i.test(text)) throw new ProofError('no-credits');
    if (/api.?key|not.?enabled|permission|403|billing|ai.?logic|app.?check|not found|404|recaptcha/i.test(text)) throw new ProofError('setup');
    if (/safety|blocked|prohibited/i.test(text)) return { ok: false, why: '', small };
    throw new ProofError(offline() ? 'offline' : 'failed');
  }
  const verdict = parseVerdict(raw);
  if (!verdict) throw new ProofError('failed');
  if (!unlimited) countTry(uid);
  return { ...verdict, small };
};

const proofRef = (uid: string, partId: string) => doc(db, 'samosiProof', uid, 'parts', partId);

/** Keeps the proof photo and makes the part the member's for good. */
export const saveProof = async (uid: string, outfit: Outfit, partId: string, small: Blob) => {
  const image = Bytes.fromUint8Array(new Uint8Array(await small.arrayBuffer()));
  await setDoc(proofRef(uid, partId), { image, at: serverTimestamp() });
  const field = REAL_FIELD[outfit];
  await setDoc(doc(db, 'students', uid), { [field]: arrayUnion(partId) }, { mergeFields: [field] });
};

/** Takes a proven part back (its photo goes too). */
export const removeProof = async (uid: string, outfit: Outfit, partId: string) => {
  const field = REAL_FIELD[outfit];
  await setDoc(doc(db, 'students', uid), { [field]: arrayRemove(partId) }, { mergeFields: [field] });
  await deleteDoc(proofRef(uid, partId)).catch(err => console.warn('samosi proof delete:', err?.code || err));
};

/** One proven part's photo (as a URL), read when it is shown; null while it loads or when there is none. */
export const useProofPhoto = (uid: string | undefined, partId: string | null, version = 0) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    setUrl(null);
    if (!uid || !partId) return;
    let live = true;
    let made: string | null = null;
    getDoc(proofRef(uid, partId))
      .then(snap => {
        const image = snap.data()?.image as Bytes | undefined;
        if (!live || !image) return;
        made = URL.createObjectURL(new Blob([image.toUint8Array() as BlobPart], { type: 'image/jpeg' }));
        setUrl(made);
      })
      .catch(err => console.warn('samosi proof read:', err?.code || err));
    return () => {
      live = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [uid, partId, version]);
  return url;
};
