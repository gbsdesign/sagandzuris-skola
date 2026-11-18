import { COLOR } from '../../../design/tokens';
import type { CardText } from '../../../utils/learnedCard';

// The card as a PNG (1080 × 1350), drawn on a canvas — the board's look: a wine card, the logo in a white tile, „ვისწავლე“,
// the chant's name big, one line, a thin rule, the footer. Colours are the design tokens' (design/tokens.ts).

export const CARD_W = 1080;
export const CARD_H = 1350;

const loadImage = (src: string, cors: boolean) => new Promise<HTMLImageElement>((resolve, reject) => {
  const img = new Image();
  if (cors) img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('logo'));
  img.src = src;
});

/** The first logo that loads for a canvas (the school's own from the settings may be on another site: tried with CORS). */
export const loadLogo = async (urls: (string | undefined)[]): Promise<HTMLImageElement | null> => {
  for (const u of urls) {
    if (!u) continue;
    try { return await loadImage(u, /^https?:/.test(u) && !u.startsWith(location.origin)); } catch { /* next */ }
  }
  return null;
};

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

/** Breaks a name into lines that fit `max` px: at spaces, then after a hyphen, then anywhere. */
const wrap = (ctx: CanvasRenderingContext2D, text: string, max: number): string[] => {
  const pieces = text.split(/(?<=[\s-])/);
  const lines: string[] = [];
  let cur = '';
  const fits = (s: string) => ctx.measureText(s.trim()).width <= max;
  for (const p of pieces) {
    if (fits(cur + p)) { cur += p; continue; }
    if (cur) lines.push(cur.trim());
    cur = '';
    if (fits(p)) { cur = p; continue; }
    // one long word: cut by letters
    for (const ch of Array.from(p)) {
      if (fits(cur + ch)) cur += ch;
      else { lines.push(cur.trim()); cur = ch; }
    }
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines;
};

export const drawCard = async (text: CardText, logo: HTMLImageElement | null): Promise<Blob> => {
  const family = getComputedStyle(document.body).fontFamily || 'sans-serif';
  try {
    await document.fonts.ready;
    await Promise.all([`700 60px ${family}`, `400 40px ${family}`].map(f => document.fonts.load(f, 'ვისწავლე აბგ')));
  } catch { /* the fallback font draws */ }

  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');

  const grad = ctx.createLinearGradient(0, 0, CARD_W * 0.5, CARD_H);
  grad.addColorStop(0, COLOR.wine);
  grad.addColorStop(1, COLOR.wineDeep);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const cx = CARD_W / 2;
  const inner = CARD_W - 2 * 130;

  // the name first, to know how tall the block is
  let size = 128;
  let lines: string[] = [];
  for (; size >= 48; size -= 8) {
    ctx.font = `700 ${size}px ${family}`;
    lines = wrap(ctx, text.title, inner);
    // no word cut in two, at most three lines
    const words = text.title.split(/[\s-]+/);
    if (lines.length <= 3 && words.every(w => ctx.measureText(w).width <= inner)) break;
  }
  const lead = Math.round(size * 1.18);
  const extra = (text.line ? 1 : 0) + (text.person ? 1 : 0);
  const block = 176 + 70 + 66 + lines.length * lead + (extra ? 64 + extra * 56 : 0) + 100 + 52;
  let y = Math.max(150, (CARD_H - block) / 2);

  // logo tile
  const tile = 176;
  ctx.fillStyle = COLOR.surf;
  roundRect(ctx, cx - tile / 2, y, tile, tile, 44);
  ctx.fill();
  if (logo) {
    const pad = 12;
    const box = tile - 2 * pad;
    const k = Math.min(box / logo.width, box / logo.height);
    const w = logo.width * k;
    const h = logo.height * k;
    ctx.save();
    roundRect(ctx, cx - tile / 2 + pad, y + pad, box, box, 34);
    ctx.clip();
    ctx.drawImage(logo, cx - w / 2, y + tile / 2 - h / 2, w, h);
    ctx.restore();
  }
  y += tile + 70;

  ctx.fillStyle = COLOR.surf;
  ctx.globalAlpha = 0.72;
  ctx.font = `700 44px ${family}`;
  ctx.fillText(text.kicker, cx, y);
  ctx.globalAlpha = 1;
  y += 66;

  ctx.font = `700 ${size}px ${family}`;
  y += size * 0.8;
  for (const l of lines) { ctx.fillText(l, cx, y); y += lead; }
  y -= lead - size * 0.2;

  if (extra) {
    y += 64;
    ctx.font = `400 46px ${family}`;
    if (text.line) { ctx.globalAlpha = 0.82; ctx.fillText(text.line, cx, y + 20, inner); y += 56; }
    if (text.person) { ctx.globalAlpha = 0.82; ctx.fillText(text.person, cx, y + 20, inner); y += 56; }
    ctx.globalAlpha = 1;
  }

  y += 70;
  ctx.globalAlpha = 0.3;
  ctx.fillRect(130, y, CARD_W - 260, 2);
  ctx.globalAlpha = 0.78;
  ctx.font = `400 38px ${family}`;
  ctx.fillText(text.footer, cx, y + 80, inner);
  ctx.globalAlpha = 1;

  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('png'))), 'image/png'));
};

const FILE_BAD = /[\\/:*?"<>|]+/g;
export const cardFileName = (title: string) => `ვისწავლე — ${title}`.replace(FILE_BAD, ' ').replace(/\s+/g, ' ').trim() + '.png';

/** „გაზიარება“: the phone's share sheet with the picture, else the picture is saved. 'shared' | 'saved' | 'failed' */
export const shareCard = async (blob: Blob, title: string): Promise<'shared' | 'saved' | 'failed'> => {
  const file = new File([blob], cardFileName(title), { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: `ვისწავლე — ${title}` });
      return 'shared';
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return 'shared';
    }
  }
  return saveCard(blob, title);
};

/** „სურათად შენახვა“ (the apps take a download to their share sheet / downloads). */
export const saveCard = (blob: Blob, title: string): 'saved' | 'failed' => {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = cardFileName(title);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return 'saved';
  } catch { return 'failed'; }
};
