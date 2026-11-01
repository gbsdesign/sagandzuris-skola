// A drawing's lines as short text („ნახატობანა“, 2026-11-01): strokes on a square of 1000 × 1000, each with a colour and a
// width, so one drawing goes through a game room's view (the host draws, every phone sees it grow) and a class chat's
// message (a drawing to guess). Four characters a point; a stroke is its colour's and width's digits, then its points;
// strokes are joined by dots. Pure and tested in tests/nakhati.test.ts; drawn by components/games/Ink.tsx.

export const INK_SIDE = 1000;
/** the colours, the last one the eraser (the paper's white) */
export const INK_COLORS = ['#2b2118', '#c0392b', '#e67e22', '#e3b505', '#2f7d4f', '#1e66c9', '#8b5a2b', '#ffffff'] as const;
export const INK_COLOR_NAMES = ['შავი', 'წითელი', 'ნარინჯისფერი', 'ყვითელი', 'მწვანე', 'ლურჯი', 'ყავისფერი', 'საშლელი'] as const;
export const ERASER = INK_COLORS.length - 1;
/** a line's width on the 1000 side: thin, middle, thick — the eraser's own are wider */
export const INK_WIDTHS = [7, 16, 34] as const;
export const ERASER_WIDTHS = [28, 56, 110] as const;
/** a drawing's text at most (a room's view and a chat message stay small) */
export const INK_MAX = 40_000;
/** points nearer than this to the last one are not kept */
export const INK_STEP = 4;

export interface Stroke { c: number; w: number; p: number[] }

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const VAL: Record<string, number> = Object.fromEntries([...B64].map((ch, i) => [ch, i]));
const clamp = (n: number) => Math.min(INK_SIDE - 1, Math.max(0, Math.round(n)));
const two = (n: number) => B64[(n >> 6) & 63] + B64[n & 63];

export const strokeWidth = (s: Pick<Stroke, 'c' | 'w'>) => (s.c === ERASER ? ERASER_WIDTHS : INK_WIDTHS)[s.w] ?? INK_WIDTHS[1];

export const encodeInk = (strokes: readonly Stroke[]): string => strokes
  .filter(s => s.p.length >= 2 && Number.isInteger(s.c) && s.c >= 0 && s.c < INK_COLORS.length && Number.isInteger(s.w) && s.w >= 0 && s.w < INK_WIDTHS.length)
  .map(s => {
    let out = `${s.c}${s.w}`;
    for (let i = 0; i + 1 < s.p.length; i += 2) out += two(clamp(s.p[i])) + two(clamp(s.p[i + 1]));
    return out;
  })
  .join('.');

/** the strokes back; a stroke that does not read right is left out */
export const decodeInk = (raw: unknown): Stroke[] => {
  if (typeof raw !== 'string' || !raw) return [];
  const out: Stroke[] = [];
  for (const part of raw.split('.')) {
    if (part.length < 6 || (part.length - 2) % 4) continue;
    const c = Number(part[0]), w = Number(part[1]);
    if (!Number.isInteger(c) || c >= INK_COLORS.length || !Number.isInteger(w) || w >= INK_WIDTHS.length) continue;
    const p: number[] = [];
    let ok = true;
    for (let i = 2; i < part.length; i += 2) {
      const hi = VAL[part[i]], lo = VAL[part[i + 1]];
      if (hi === undefined || lo === undefined) { ok = false; break; }
      p.push(Math.min(INK_SIDE - 1, hi * 64 + lo));
    }
    if (ok) out.push({ c, w, p });
  }
  return out;
};

/** a drawing's text that reads right and is not too long (a room's round, a chat message) */
export const isInk = (raw: unknown): raw is string => typeof raw === 'string' && raw.length <= INK_MAX && (raw === '' || /^[0-7][0-2](?:[A-Za-z0-9_-]{4})+(?:\.[0-7][0-2](?:[A-Za-z0-9_-]{4})+)*$/.test(raw));

/** a point onto a stroke's line, unless it is too near the last one (the first point always) */
export const addPoint = (p: number[], x: number, y: number, step = INK_STEP): boolean => {
  const nx = clamp(x), ny = clamp(y);
  const n = p.length;
  if (n >= 2 && Math.hypot(nx - p[n - 2], ny - p[n - 1]) < step) return false;
  p.push(nx, ny);
  return true;
};

export const inkPoints = (strokes: readonly Stroke[]) => strokes.reduce((sum, s) => sum + (s.p.length >> 1), 0);

/** the drawing as it was after its first `n` points (a replay, a drawing that grows on another phone) */
export const inkUpTo = (strokes: readonly Stroke[], n: number): Stroke[] => {
  const out: Stroke[] = [];
  let left = Math.max(0, Math.floor(n));
  for (const s of strokes) {
    if (left <= 0) break;
    const k = s.p.length >> 1;
    if (k <= left) { out.push(s); left -= k; continue; }
    out.push({ ...s, p: s.p.slice(0, left * 2) });
    left = 0;
  }
  return out;
};

/** the new text only adds to the old one (the last stroke longer, more strokes after it): a drawing that grows — a stroke
 * taken back or the page cleared is not */
export const inkGrows = (before: string, after: string) => after.startsWith(before);
