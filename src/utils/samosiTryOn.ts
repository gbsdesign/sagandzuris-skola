import { useEffect, useMemo, useState } from 'react';
import { getApp } from 'firebase/app';
import { Bytes, Timestamp, deleteField, doc, onSnapshot, runTransaction, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { SAMOSI_ASPECT, SAMOSI_DEFAULT_COLOR, SAMOSI_PARTS, SamosiColor, samosiLayer } from '../data/samosiData';
import { samosiPicture } from './samosiDye';
import { georgiaToday } from './psalter';

// "ჩემი სამოსი" on the member's own photo: Gemini (through Firebase AI Logic) dresses the person in the chokha
// of the chosen colour. Only the finished picture is kept, in samosiTryOn/{uid} (Firestore Bytes), with the
// tries counted beside it: 3 on the first day, then 1 a day, 10 in all (firestore.rules lets the counters only
// grow, so deleting the picture never gives tries back). A try that brings no picture is not counted.

export const TRYON_MODEL = 'gemini-3.1-flash-image';
export const TRYON_TOTAL = 10;
// Gemini answers only requests that carry an App Check pass (reCAPTCHA key "sagandzuri-web", Google Cloud →
// Fraud Defense). Switched on at the first try, so the other pages never load reCAPTCHA.
const RECAPTCHA_KEY = '6LdS3_YtAAAAAFomGteA1WGyDA9WFkb8C3usatET';
let appCheckOn: Promise<void> | null = null;
const startAppCheck = () =>
  (appCheckOn ??= import('firebase/app-check').then(({ initializeAppCheck, ReCaptchaEnterpriseProvider }) => {
    initializeAppCheck(getApp(), { provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_KEY), isTokenAutoRefreshEnabled: false });
  }));
const FIRST_DAY_TRIES = 3;
const DAILY_TRIES = 1;

export interface TryOnRecord {
  firstDay?: string;
  day?: string;
  dayCount?: number;
  total?: number;
  image?: Bytes;
  color?: string;
  at?: Timestamp;
}

/** tries left today under the rule above */
export const triesLeft = (r: TryOnRecord | null, today: string): number => {
  const total = r?.total || 0;
  const usedToday = r?.day === today ? r.dayCount || 0 : 0;
  const perDay = !r?.firstDay || r.firstDay === today ? FIRST_DAY_TRIES : DAILY_TRIES;
  return Math.max(0, Math.min(perDay - usedToday, TRYON_TOTAL - total));
};

// the colours as the model is told them
const COLOR_WORDS: Record<string, string> = {
  blue: 'dark navy blue',
  green: 'dark green',
  shindi: 'dark burgundy (deep cornelian red)',
  black: 'black',
  white: 'ivory white',
  brown: 'brown',
  red: 'dark red',
  lilac: 'dark purple',
};

// the hats as the model is told them (the papakha in the member's kind)
const HAT_WORDS: Record<string, (color: string, kind?: string) => string> = {
  papakha: (c, kind) =>
    kind === 'banjgvliani'
      ? `a big ${c} papakha of long, straight, spiky sheep fleece hanging over the forehead and the ears`
      : `a big ${c} papakha of long curly sheep fleece in wavy locks hanging over the forehead and the ears`,
  kakhuri: c => `a ${c} felt Kakhetian hat with a deep turned-up band and a dark cross-shaped cord with a button on top`,
  svanuri: c => `a round ${c} felt Svan cap with thin dark cords sewn over the crown in a cross, a dark stitched edge and a small dark tassel`,
  kabalakhi: c => `a ${c} bashlyk hood (kabalakhi) wound round the head like a turban in the Megrelian way, one long end hanging at the side`,
};
// a hat's own colour, when the member has not picked one
const HAT_OWN: Record<string, string> = { kabalakhi: 'olive-yellow' };

/** what the member is dressed in: the chokha's and the akhalukhi's colours, the papanaki on the shoulder and the
 *  hat on the head (if any); a hat without a colour is in its own */
export interface TryOnLook {
  chokha: SamosiColor;
  akhalukhi: SamosiColor;
  papanaki?: SamosiColor;
  hat?: { id: string; label: string; kind?: string; color?: SamosiColor };
}

const words = (c: SamosiColor) => COLOR_WORDS[c.id] || COLOR_WORDS.blue;

const prompt = (look: TryOnLook) => {
  const coat = words(look.chokha);
  const hat = look.hat && HAT_WORDS[look.hat.id]?.(look.hat.color ? words(look.hat.color) : HAT_OWN[look.hat.id] || 'black', look.hat.kind);
  const papanaki = look.papanaki
    ? `a flat round ${words(look.papanaki)} felt papanakhi cap with silver embroidery and white piping, fastened on the left shoulder of the chokha, `
    : '';
  return (
    `Image 1 is a photo of a person. Image 2 shows a traditional Georgian chokha outfit: a long fitted ${coat} coat ` +
    `with rows of silver-capped cartridge holders (gazyri) on the chest and thin light piping, a ${words(look.akhalukhi)} ` +
    `stand-collar undershirt (akhalukhi) showing at the chest, ${papanaki}a narrow black leather belt and a silver dagger (khanjali). ` +
    `Create a realistic photograph of the same person from image 1 wearing exactly this chokha in ${coat}` +
    (hat ? `, and on the head ${hat}. ` : '. ') +
    `Keep the person's face, identity, age, hairstyle, skin tone and expression exactly as they are. ` +
    `If image 1 shows the whole body, keep the pose and the background, change only the clothing, and put soft ` +
    `black leather knee-high Georgian boots (aziurebi) on the feet. ` +
    `If it shows only the face or the upper body, show the person from the knees up in the chokha, standing ` +
    `in a calm natural pose against a soft, light, neutral background. The chokha must fit the person's body ` +
    `and age naturally. No text, logos or watermarks.`
  );
};

export class TryOnError extends Error {
  constructor(public kind: 'offline' | 'no-tries' | 'no-picture' | 'setup' | 'no-credits' | 'failed') {
    super(kind);
  }
}

const loadImage = async (src: string) => {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
};

const toBlob = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob>((done, fail) => canvas.toBlob(b => (b ? done(b) : fail(new Error('canvas'))), 'image/jpeg', quality));

const blobToBase64 = (blob: Blob) =>
  new Promise<string>((done, fail) => {
    const r = new FileReader();
    r.onload = () => done(String(r.result).split(',')[1] || '');
    r.onerror = () => fail(r.error);
    r.readAsDataURL(blob);
  });

// a picture scaled down to `max` px on its longer side, as a JPEG on white
const shrink = async (src: string, max: number, quality: number): Promise<Blob> => {
  const img = await loadImage(src);
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * k);
  canvas.height = Math.round(img.naturalHeight * k);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return toBlob(canvas, quality);
};

// the whole photographed outfit in the chosen colours, on white: the model's picture of the chokha
const outfit = async (look: TryOnLook): Promise<Blob> => {
  const dye = (c: SamosiColor) => (c.id === SAMOSI_DEFAULT_COLOR ? null : c.hex);
  const hexOf = (id: string) => (id === 'chokha' || id === 'masrebi' ? dye(look.chokha) : id === 'akhalukhi' ? dye(look.akhalukhi) : null);
  const parts = SAMOSI_PARTS.filter(p => !p.art && !p.photo);
  const layers = await Promise.all(parts.map(p => samosiPicture(samosiLayer(p.id), hexOf(p.id)).then(loadImage)));
  const canvas = document.createElement('canvas');
  canvas.height = 900;
  canvas.width = Math.round(900 * SAMOSI_ASPECT);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const img of layers) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return toBlob(canvas, 0.9);
};

/** Dresses the person on `photo` in the chokha of `look`. */
export const dressInChokha = async (photo: File, look: TryOnLook): Promise<Blob> => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new TryOnError('offline');
  const photoUrl = URL.createObjectURL(photo);
  let person: Blob;
  try {
    person = await shrink(photoUrl, 1280, 0.9);
  } finally {
    URL.revokeObjectURL(photoUrl);
  }
  const [personData, outfitData] = await Promise.all([blobToBase64(person), outfit(look).then(blobToBase64)]);

  await startAppCheck();
  const { getAI, getGenerativeModel, GoogleAIBackend, ResponseModality } = await import('firebase/ai');
  const model = getGenerativeModel(getAI(getApp(), { backend: new GoogleAIBackend() }), {
    model: TRYON_MODEL,
    generationConfig: {
      responseModalities: [ResponseModality.TEXT, ResponseModality.IMAGE],
      imageConfig: { aspectRatio: '3:4' },
    },
  });
  let picture: { mimeType: string; data: string } | undefined;
  try {
    const res = await model.generateContent([
      { text: prompt(look) },
      { inlineData: { mimeType: 'image/jpeg', data: personData } },
      { inlineData: { mimeType: 'image/jpeg', data: outfitData } },
    ]);
    picture = res.response.inlineDataParts()?.[0]?.inlineData;
  } catch (err) {
    console.warn('Gemini try-on note:', err);
    const text = String((err as Error)?.message || err);
    if (/prepay|credits|depleted|quota|resource.?exhausted|429/i.test(text)) throw new TryOnError('no-credits');
    if (/api.?key|not.?enabled|permission|403|billing|ai.?logic|app.?check|not found|404/i.test(text)) throw new TryOnError('setup');
    if (/safety|blocked|prohibited/i.test(text)) throw new TryOnError('no-picture');
    throw new TryOnError(navigator.onLine === false ? 'offline' : 'failed');
  }
  if (!picture?.data) throw new TryOnError('no-picture');
  // kept small enough for one Firestore document
  return shrink(`data:${picture.mimeType || 'image/png'};base64,${picture.data}`, 960, 0.86);
};

/** Saves a finished picture and counts the try; refuses when no try is left today. */
export const saveTryOn = async (uid: string, picture: Blob, colorId: string) => {
  const image = Bytes.fromUint8Array(new Uint8Array(await picture.arrayBuffer()));
  const ref = doc(db, 'samosiTryOn', uid);
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    const r = (snap.exists() ? snap.data() : null) as TryOnRecord | null;
    const today = georgiaToday();
    if (triesLeft(r, today) <= 0) throw new TryOnError('no-tries');
    const sameDay = r?.day === today;
    tx.set(ref, {
      firstDay: r?.firstDay || today,
      day: today,
      dayCount: sameDay ? (r?.dayCount || 0) + 1 : 1,
      total: (r?.total || 0) + 1,
      image,
      color: colorId,
      at: serverTimestamp(),
    });
  });
};

/** Removes the kept picture (the tries stay counted). */
export const removeTryOn = (uid: string) => updateDoc(doc(db, 'samosiTryOn', uid), { image: deleteField(), color: deleteField(), at: deleteField() });

/** The member's record, its picture as a URL, and the tries left today. */
export const useTryOn = (uid: string | null | undefined) => {
  const [record, setRecord] = useState<TryOnRecord | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setRecord(null);
    setLoaded(false);
    if (!uid) return;
    return onSnapshot(
      doc(db, 'samosiTryOn', uid),
      snap => {
        setRecord(snap.exists() ? (snap.data() as TryOnRecord) : null);
        setLoaded(true);
      },
      err => {
        console.warn('Firestore samosiTryOn note:', err);
        setLoaded(true);
      }
    );
  }, [uid]);

  const image = record?.image;
  const url = useMemo(() => (image ? URL.createObjectURL(new Blob([image.toUint8Array() as BlobPart], { type: 'image/jpeg' })) : null), [image]);
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);

  return { loaded, url, left: triesLeft(record, georgiaToday()), total: record?.total || 0 };
};
