import { useEffect, useState } from 'react';
import { SAMOSI_COLORS } from '../data/samosiData';

// Dyes the blue cloth of a "ჩემი სამოსი" picture into another colour, in the browser: only the blue pixels
// change (the hands, the golden trim and the silver tops of the masrebi stay). Works in OKLab, so every colour
// sits on the cloth as its swatch sits beside the photo's own blue swatch, and the folds keep their light
// and shade. Each picture is dyed once per colour and visit; the result is a blob URL.

const pending = new Map<string, Promise<string>>();
const ready = new Map<string, string>();

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c: number) => {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.max(0, c) ** (1 / 2.4) - 0.055;
  return Math.min(255, Math.max(0, v * 255));
};

// sRGB (0…1) → OKLab
const toLab = (r: number, g: number, b: number): [number, number, number] => {
  r = toLinear(r);
  g = toLinear(g);
  b = toLinear(b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
};

// OKLab → sRGB (0…255)
const fromLab = (L: number, a: number, b: number): [number, number, number] => {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    toSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    toSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    toSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
};

const hexToLab = (hex: string) => toLab(...([1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number]));

// the photo's blue swatch, and the cloth's mean lightness in the photo (measured on chokha.webp)
const BASE_L = hexToLab(SAMOSI_COLORS[0].hex)[0];
const CLOTH_L = 0.26;

// how surely a pixel is the chokha's blue cloth: 0 (anything else) … 1
const blueness = (r: number, g: number, b: number) => {
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (!max || !d) return 0;
  let h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return smooth(178, 198, h) * (1 - smooth(258, 278, h)) * smooth(0.12, 0.26, d / max);
};

/** How a part's own photo is dyed: every pixel whose lightness is in `range` moves from `base` (the photo's own
 *  colour; none = the mean of those pixels) to the new colour. Without it, the chokha photo's blue cloth is dyed. */
export interface DyeWay {
  range: [number, number];
  base?: string;
}

const dyeByLightness = (px: Uint8ClampedArray, hex: string, way: DyeWay) => {
  const [lo, hi] = way.range;
  const weight = (L: number) => (lo <= 0 ? 1 : smooth(lo - 0.05, lo + 0.05, L)) * (hi >= 1 ? 1 : 1 - smooth(hi - 0.05, hi + 0.05, L));
  let sum = 0;
  let n = 0;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 128) continue;
    const L0 = toLab(px[i] / 255, px[i + 1] / 255, px[i + 2] / 255)[0];
    if (weight(L0) > 0.5) {
      sum += L0;
      n++;
    }
  }
  const mean = n ? sum / n : 0.5;
  const [tL, ta, tb] = hexToLab(hex);
  const shift = tL - (way.base ? hexToLab(way.base)[0] : mean);
  const clothL = Math.max(0.05, mean + shift);
  for (let i = 0; i < px.length; i += 4) {
    if (!px[i + 3]) continue;
    const L0 = toLab(px[i] / 255, px[i + 1] / 255, px[i + 2] / 255)[0];
    const w = weight(L0);
    if (!w) continue;
    const L = Math.min(0.98, Math.max(0.02, L0 + shift));
    const k = Math.min(1.15, Math.max(0.35, L / clothL));
    const [nr, ng, nb] = fromLab(L, ta * k, tb * k);
    px[i] = px[i] * (1 - w) + nr * w;
    px[i + 1] = px[i + 1] * (1 - w) + ng * w;
    px[i + 2] = px[i + 2] * (1 - w) + nb * w;
  }
};

const dye = async (src: string, hex: string, way?: DyeWay): Promise<string> => {
  const img = new Image();
  img.src = src;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return src;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = data.data;
  if (way) {
    dyeByLightness(px, hex, way);
    ctx.putImageData(data, 0, 0);
    const blob = await new Promise<Blob | null>(done => canvas.toBlob(done, 'image/webp', 0.92));
    return blob ? URL.createObjectURL(blob) : src;
  }

  const [tL, ta, tb] = hexToLab(hex);
  const shift = tL - BASE_L;
  const clothL = CLOTH_L + shift;

  for (let i = 0; i < px.length; i += 4) {
    if (!px[i + 3]) continue;
    const r = px[i] / 255, g = px[i + 1] / 255, b = px[i + 2] / 255;
    const L0 = toLab(r, g, b)[0];
    // the deepest shadows and the cut-out's soft rim are cloth too, whatever their tint
    // (the hands, the trim and the embroidery are all much lighter)
    const w = Math.max(blueness(r, g, b), 1 - smooth(0.14, 0.22, L0), px[i + 3] < 250 ? 1 - smooth(0.3, 0.45, L0) : 0);
    if (!w) continue;
    // the fold's lightness moves with the colour; its tint fades in the shadows as real cloth does
    const L = Math.min(0.98, Math.max(0.02, L0 + shift));
    const k = Math.min(1.15, Math.max(0.35, L / clothL));
    const [nr, ng, nb] = fromLab(L, ta * k, tb * k);
    px[i] = px[i] * (1 - w) + nr * w;
    px[i + 1] = px[i + 1] * (1 - w) + ng * w;
    px[i + 2] = px[i + 2] * (1 - w) + nb * w;
  }
  ctx.putImageData(data, 0, 0);
  const blob = await new Promise<Blob | null>(done => canvas.toBlob(done, 'image/webp', 0.92));
  return blob ? URL.createObjectURL(blob) : src;
};

const keyOf = (src: string, hex: string | null, way?: DyeWay) => `${hex}|${src}|${way ? `${way.range.join(',')}:${way.base || ''}` : ''}`;

/** the URL of the picture `src` dyed into `hex` (null = its own colour), the way `way` says */
export const samosiPicture = (src: string, hex: string | null, way?: DyeWay): Promise<string> => {
  if (!hex) return Promise.resolve(src);
  const key = keyOf(src, hex, way);
  let job = pending.get(key);
  if (!job) {
    job = dye(src, hex, way)
      .catch(() => src)
      .then(u => (ready.set(key, u), u));
    pending.set(key, job);
  }
  return job;
};

/** the picture `src` dyed into `hex` (null = its own colour); null while it is being dyed */
export const useSamosiSrc = (src: string, hex: string | null, way?: DyeWay): string | null => {
  const key = keyOf(src, hex, way);
  const [url, setUrl] = useState<string | null>(() => (hex ? ready.get(key) ?? null : src));

  useEffect(() => {
    if (!hex) return setUrl(src);
    const done = ready.get(key);
    if (done) return setUrl(done);
    setUrl(null);
    let alive = true;
    samosiPicture(src, hex, way).then(u => alive && setUrl(u));
    return () => {
      alive = false;
    };
    // `src`, `hex` and `way` are all in `key`
  }, [key]);

  return url;
};
