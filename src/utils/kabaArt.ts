import { useEffect, useState } from 'react';
import { getApp } from 'firebase/app';
import { Bytes, collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { startAppCheck, TRYON_MODEL } from './samosiTryOn';
import { SAMOSI_FIGURE, SAMOSI_PARTS, samosiLayer } from '../data/samosiData';
import type { KabaPart } from '../data/kabaData';

// The pictures of „ქართული კაბა“ (redesign stage 5). The owner makes them in the studio: Gemini draws the whole dress
// in the chokha photo's style on flat green, then each part is cut out of that one picture (so the parts stack), and
// the headdress gets a picture of its own; the green is keyed out here. Kept in Firestore (no Storage):
//   samosiArt/kaba            {published, at, by}  members see the dress only while published
//   samosiArt/kaba-full       {image, mime, w, h, at}
//   samosiArt/kaba-<partId>   {image, thumb, mime, w, h, at}

export const KABA_WIDTH = 480;

const loadImg = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const i = new Image();
  i.crossOrigin = 'anonymous';
  i.onload = () => resolve(i);
  i.onerror = () => reject(new Error('image ' + src.slice(0, 40)));
  i.src = src;
});

const canvasBlob = (c: HTMLCanvasElement, type: string, q?: number) =>
  new Promise<Blob>((resolve, reject) => c.toBlob(b => (b ? resolve(b) : reject(new Error('canvas'))), type, q));

const blobToBase64 = (b: Blob) => new Promise<string>((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(',')[1] || '');
  r.onerror = () => reject(r.error);
  r.readAsDataURL(b);
});

/** the chokha photo as the style reference: the whole figure on white, as a JPEG */
const chokhaReference = async () => {
  const fig = await loadImg(SAMOSI_FIGURE);
  const c = document.createElement('canvas');
  c.width = fig.naturalWidth;
  c.height = fig.naturalHeight;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, c.width, c.height);
  g.drawImage(fig, 0, 0);
  for (const p of SAMOSI_PARTS.filter(x => !x.art && !x.photo)) g.drawImage(await loadImg(samosiLayer(p.id)), 0, 0, c.width, c.height);
  return blobToBase64(await canvasBlob(c, 'image/jpeg', 0.9));
};

const GREEN = 'Background: perfectly flat, uniform pure chroma-key green (#00FF00) everywhere around the garment, no shadow, no floor, no gradient, no text, no watermark. Do not use any green colour in the garment itself.';

const FIGURE_PROMPT = [
  'Make a studio product photograph in exactly the same style, framing, scale, camera angle, lighting and proportions as the reference photo of a Georgian chokha:',
  'the garment is worn by an invisible mannequin, seen from the front, standing straight, the hands relaxed at the sides as in the reference,',
  'cut off at the neck (no head, no face, no hair), the whole length down to the hem.',
  "The garment: the traditional Georgian women's festive dress (kartuli kaba) — a long dress of deep wine-red cloth with a fitted bodice,",
  'long sleeves and a very long full skirt to the floor; on the chest an embroidered panel (gulispiri) in gold thread with small pearls;',
  'a long embroidered sash (sartqeli) round the waist, its two ends hanging down the front below the knees; over the dress a short dark',
  'velvet overcoat (katibi), open at the front, edged with gold braid. Authentic, modest, festive; nothing modern.',
  GREEN,
].join(' ');

const layerPrompt = (p: KabaPart) => [
  `Edit this photo. Keep ONLY ${p.keep}, exactly as it is: the same pixels, the same position and size, nothing moved or redrawn.`,
  'Replace everything else with perfectly flat pure chroma-key green (#00FF00). Keep the image size and framing.',
].join(' ');

const HEAD_PROMPT = [
  "A studio product photograph of the traditional Georgian women's headdress that belongs to this dress, in the same style and lighting:",
  'a round velvet headband (tavsakravi) embroidered with gold thread and small pearls, worn on an invisible head, with a long sheer',
  'white tulle veil (lechaki) falling from under it down the back to the shoulders. Seen from the front, centred, filling most of the frame;',
  'no face, no hair, no person.',
  GREEN,
].join(' ');

export type KabaProblem = 'setup' | 'no-credits' | 'no-picture' | 'offline' | 'failed';
export class KabaError extends Error {
  constructor(public kind: KabaProblem) { super(kind); }
}
export const KABA_PROBLEM_TEXT: Record<KabaProblem, string> = {
  setup: 'Gemini ჯერ არ პასუხობს (Firebase AI Logic-ის ან App Check-ის პარამეტრები).',
  'no-credits': 'Gemini-ის ლიმიტი ამოიწურა — მოგვიანებით სცადე.',
  'no-picture': 'სურათი არ მოვიდა — კიდევ სცადე.',
  offline: 'ინტერნეტი არ არის.',
  failed: 'ვერ შეიქმნა — კიდევ სცადე.',
};

const askPicture = async (parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[], aspectRatio: '9:16' | '1:1') => {
  try {
    await startAppCheck();
    const { getAI, getGenerativeModel, GoogleAIBackend, ResponseModality } = await import('firebase/ai');
    const model = getGenerativeModel(getAI(getApp(), { backend: new GoogleAIBackend() }), {
      model: TRYON_MODEL,
      generationConfig: { responseModalities: [ResponseModality.TEXT, ResponseModality.IMAGE], imageConfig: { aspectRatio } },
    });
    const res = await model.generateContent(parts);
    const pic = res.response.inlineDataParts()?.[0]?.inlineData;
    if (!pic?.data) throw new KabaError('no-picture');
    return `data:${pic.mimeType || 'image/png'};base64,${pic.data}`;
  } catch (err) {
    if (err instanceof KabaError) throw err;
    console.warn('kaba picture note:', err);
    const text = String((err as Error)?.message || err);
    if (/prepay|credits|depleted|quota|resource.?exhausted|429/i.test(text)) throw new KabaError('no-credits');
    if (/api.?key|not.?enabled|permission|403|billing|ai.?logic|app.?check|not found|404|recaptcha/i.test(text)) throw new KabaError('setup');
    if (/safety|blocked|prohibited/i.test(text)) throw new KabaError('no-picture');
    throw new KabaError(navigator.onLine === false ? 'offline' : 'failed');
  }
};

/** Flat green → transparent, with a soft edge and the green spill taken off the edge pixels; scaled to `width`. */
export const keyGreen = async (src: string, width = KABA_WIDTH) => {
  const img = await loadImg(src);
  const c = document.createElement('canvas');
  c.width = width;
  c.height = Math.round((img.naturalHeight * width) / img.naturalWidth);
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(img, 0, 0, c.width, c.height);
  const d = g.getImageData(0, 0, c.width, c.height);
  const px = d.data;
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i], gr = px[i + 1], b = px[i + 2];
    const other = Math.max(r, b);
    if (gr <= other) continue;
    const k = gr > 60 ? (gr - other) / gr : 0; // 0 = no green cast, 1 = pure green
    // the spill: green never above the other two (the dress has no green), so a sheer white veil stays white
    px[i + 1] = other;
    if (k <= 0.22) continue;
    px[i + 3] = Math.round(px[i + 3] * Math.max(0, 1 - (k - 0.22) / 0.26));
  }
  g.putImageData(d, 0, 0);
  return c;
};

/** a square picture of what the cut-out holds, for the part's tile */
const thumbOf = (c: HTMLCanvasElement, size = 120) => {
  const g = c.getContext('2d', { willReadFrequently: true })!;
  const { data } = g.getImageData(0, 0, c.width, c.height);
  let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      if (data[(y * c.width + x) * 4 + 3] > 40) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  const t = document.createElement('canvas');
  t.width = t.height = size;
  if (x1 <= x0 || y1 <= y0) return t;
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const scale = (size * 0.92) / Math.max(w, h);
  t.getContext('2d')!.drawImage(c, x0, y0, w, h, (size - w * scale) / 2, (size - h * scale) / 2, w * scale, h * scale);
  return t;
};

// WebP where the browser makes it (smaller), else PNG; made smaller until it fits one Firestore document (the
// pictures are shown stretched to the figure, so a smaller one still lies exactly over the others)
const encode = async (c: HTMLCanvasElement): Promise<Blob> => {
  let b = await canvasBlob(c, 'image/webp', 0.9);
  if (b.type !== 'image/webp') b = await canvasBlob(c, 'image/png');
  if (b.size <= 900_000 || c.width < 200) return b;
  const s = document.createElement('canvas');
  s.width = Math.round(c.width * 0.8);
  s.height = Math.round(c.height * 0.8);
  s.getContext('2d')!.drawImage(c, 0, 0, s.width, s.height);
  return encode(s);
};

const bytesOf = async (b: Blob) => Bytes.fromUint8Array(new Uint8Array(await b.arrayBuffer()));

/** the whole dress, as Gemini drew it, keyed */
export const makeKabaFigure = async () => keyGreen(await askPicture([{ text: FIGURE_PROMPT }, { inlineData: { mimeType: 'image/jpeg', data: await chokhaReference() } }], '9:16'));

/** one part: a layer cut out of the whole dress (`full` = the dress picture as Gemini drew it), or the headdress */
export const makeKabaPart = async (part: KabaPart, fullSrc: string) => {
  const full = await loadImg(fullSrc);
  const c = document.createElement('canvas');
  c.width = full.naturalWidth;
  c.height = full.naturalHeight;
  const g = c.getContext('2d')!;
  // the cut-out back on green, as the model last saw it
  g.fillStyle = '#00ff00';
  g.fillRect(0, 0, c.width, c.height);
  g.drawImage(full, 0, 0);
  const data = await blobToBase64(await canvasBlob(c, 'image/png'));
  const src = part.head
    ? await askPicture([{ text: HEAD_PROMPT }, { inlineData: { mimeType: 'image/png', data } }], '1:1')
    : await askPicture([{ text: layerPrompt(part) }, { inlineData: { mimeType: 'image/png', data } }], '9:16');
  // a layer must lie exactly over the dress: same size as the dress picture
  return keyGreen(src, part.head ? 360 : full.naturalWidth);
};

export const canvasUrl = async (c: HTMLCanvasElement) => URL.createObjectURL(await canvasBlob(c, 'image/png'));

/** keeps a picture (the dress: id 'full'; a part: its id) */
export const saveKabaPiece = async (id: string, c: HTMLCanvasElement) => {
  const image = await encode(c);
  await setDoc(doc(db, 'samosiArt', `kaba-${id}`), {
    image: await bytesOf(image),
    mime: image.type,
    w: c.width,
    h: c.height,
    ...(id === 'full' ? {} : { thumb: await bytesOf(await canvasBlob(thumbOf(c), 'image/png')) }),
    at: new Date().toISOString(),
  });
};

export const publishKaba = (published: boolean, by: string) =>
  setDoc(doc(db, 'samosiArt', 'kaba'), { published, at: new Date().toISOString(), by }, { merge: true });

/** where the headdress sits over the collar: `y` = how far it reaches down past the collar, `w` = its width (both % of
 *  the figure's width); the owner nudges them in the studio */
export interface KabaHead { y: number; w: number }
export const KABA_HEAD_DEFAULT: KabaHead = { y: 4, w: 56 };
export const saveKabaHead = (head: KabaHead) => setDoc(doc(db, 'samosiArt', 'kaba'), { head }, { merge: true });

export interface KabaPiece { url: string; thumb?: string; w: number; h: number }

/** whether members see the dress, and where its headdress sits */
export const useKabaSettings = () => {
  // `loaded`: the answer has come (the pearls' gifts wait for it before choosing the outfit, utils/pearlGifts.ts)
  const [v, setV] = useState<{ published: boolean; head: KabaHead; loaded: boolean }>({ published: false, head: KABA_HEAD_DEFAULT, loaded: false });
  useEffect(() => onSnapshot(doc(db, 'samosiArt', 'kaba'), s => {
    const d = s.data();
    const h = d?.head;
    setV({
      published: d?.published === true,
      head: h && typeof h.y === 'number' && typeof h.w === 'number' ? { y: h.y, w: h.w } : KABA_HEAD_DEFAULT,
      loaded: true,
    });
  }, () => setV({ published: false, head: KABA_HEAD_DEFAULT, loaded: true })), []);
  return v;
};

/** the dress's pictures (full + parts), as object URLs; null while loading */
export const useKabaArt = (enabled: boolean) => {
  const [pieces, setPieces] = useState<Record<string, KabaPiece> | null>(null);
  useEffect(() => {
    if (!enabled) { setPieces(null); return; }
    let urls: string[] = [];
    const unsub = onSnapshot(collection(db, 'samosiArt'), s => {
      urls.forEach(u => URL.revokeObjectURL(u));
      urls = [];
      const out: Record<string, KabaPiece> = {};
      for (const d of s.docs) {
        if (!d.id.startsWith('kaba-')) continue;
        const v = d.data();
        if (!(v.image instanceof Bytes)) continue;
        const url = URL.createObjectURL(new Blob([v.image.toUint8Array() as Uint8Array<ArrayBuffer>], { type: v.mime || 'image/png' }));
        urls.push(url);
        let thumb: string | undefined;
        if (v.thumb instanceof Bytes) {
          thumb = URL.createObjectURL(new Blob([v.thumb.toUint8Array() as Uint8Array<ArrayBuffer>], { type: 'image/png' }));
          urls.push(thumb);
        }
        out[d.id.slice(5)] = { url, thumb, w: v.w || 1, h: v.h || 1 };
      }
      setPieces(out);
    }, () => setPieces({}));
    return () => { unsub(); urls.forEach(u => URL.revokeObjectURL(u)); };
  }, [enabled]);
  return pieces;
};
