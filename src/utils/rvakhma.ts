import type { RoundAnswer, RoundRules } from './roundGames';
import { shuffle } from './amikhseni';

// „რვა ხმა“ (2026-11-01, the musical games, like Functional Ear Trainer): a heirmos of vol. VIII („რვახმა საცისკრო
// ძლისპირები“) sounds on the synthesizer from its book notes — its first phrase, then more — and the player names its tone out
// of the eight. Every tone has eight heirmoi in the book (files 1–64: tone I = 1–8 … tone VIII = 57–64). Online in a class's
// room (each on their own phone) or on one phone with the class in teams. The screens pages/games/rvakhma/face.tsx. Kept free
// of the book's list: the room's store (and so this file) is in the app's first bundle.

/** the tones as the books write them: ხმა ა … ხმა ჱ */
export const TONE_LETTERS = ['ა', 'ბ', 'გ', 'დ', 'ე', 'ვ', 'ზ', 'ჱ'] as const;
export const toneName = (t: number) => `ხმა ${TONE_LETTERS[t] ?? '?'}`;

export interface RvakhmaQ {
  kind: 'rvakhma';
  /** its book notes: public/notes/<book>/<num>.json */
  book: string;
  num: number;
  /** its tone, 0 = I … 7 = VIII */
  right: number;
  /** the heirmos: its ode („ძლისპირი გ“), its opening words, its page in the book */
  name: string;
  words: string;
  page: number;
}

export const RVAKHMA_STEPS = 2;
/** the step's points: all of them at the step's start, a fifth less by its end */
export const RVAKHMA_TOP = [1000, 500];
/** how long the heirmos sounds at a step (from its start), and the step's time */
export const RVAKHMA_CLIP = [12, 26];
export const RVAKHMA_SECONDS = [18, 30];

const stepAt = (step: number) => Math.min(RVAKHMA_STEPS, Math.max(1, step)) - 1;
export const rvakhmaPiece = (step: number) => RVAKHMA_CLIP[stepAt(step)];

export const rvakhmaPoints = (q: Pick<RvakhmaQ, 'right'>, a: Pick<RoundAnswer, 'pick' | 'ms' | 'step'>, limitMs: number) => {
  if (a.pick !== q.right) return 0;
  const late = limitMs > 0 ? Math.min(1, Math.max(0, a.ms / limitMs)) : 1;
  return Math.round(RVAKHMA_TOP[stepAt(a.step)] * (1 - late / 5));
};

const text = (v: unknown, max: number) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const isTone = (n: unknown) => Number.isInteger(n) && (n as number) >= 0 && (n as number) < 8;

export const RVAKHMA_RULES: RoundRules<RvakhmaQ> = {
  steps: () => RVAKHMA_STEPS,
  seconds: (_, step) => RVAKHMA_SECONDS[stepAt(step)],
  ok: (_, pick) => isTone(pick),
  points: rvakhmaPoints,
  secret: ['right', 'name', 'words', 'page'],
  valid: (q): q is RvakhmaQ => {
    if (!q || typeof q !== 'object') return false;
    const o = q as Partial<RvakhmaQ>;
    return o.kind === 'rvakhma' && text(o.book, 40) && Number.isInteger(o.num) && (o.num as number) > 0 && isTone(o.right)
      && text(o.name, 80) && typeof o.words === 'string' && o.words.length <= 200 && Number.isInteger(o.page);
  },
};

/** the one-phone game: what the host marks for a team — by the step its paper names */
export const RVAKHMA_MARKS = [
  { points: 2, label: 'პირველ ფრაზაზე' },
  { points: 1, label: 'მეტით' },
  { points: 0, label: 'ვერა' },
] as const;

// ——— a game's rounds from the book's heirmoi

export interface Heirmos { tone: number; book: string; num: number; name: string; words: string; page: number }

/**
 * A game's rounds: the tones spread — the eight in a shuffled order, then again, never one twice running — each a heirmos of
 * that tone not asked lately on this phone (`seen`, their file numbers) if it has one.
 */
export const drawRvakhmaRounds = (pool: readonly Heirmos[], count: number, seen: readonly number[] = [], rnd: () => number = Math.random): RvakhmaQ[] => {
  const tones = [...new Set(pool.map(h => h.tone))];
  if (tones.length < 4) return [];
  const order: number[] = [];
  while (order.length < count) {
    let next = shuffle(tones, rnd);
    if (order.length && next[0] === order[order.length - 1]) next = [...next.slice(1), next[0]];
    order.push(...next);
  }
  const old = new Set(seen);
  const used = new Set<number>();
  return order.slice(0, count).map(t => {
    const all = pool.filter(h => h.tone === t && !used.has(h.num));
    const fresh = all.filter(h => !old.has(h.num));
    const list = fresh.length ? fresh : all.length ? all : pool.filter(h => h.tone === t);
    const h = list[Math.floor(rnd() * list.length)];
    used.add(h.num);
    return { kind: 'rvakhma', book: h.book, num: h.num, right: h.tone, name: h.name, words: h.words, page: h.page };
  });
};

/** a tone's model to compare with: its first heirmos, or its second when the round's own is the first */
export const modelOf = (pool: readonly Heirmos[], tone: number, not = 0): Heirmos | undefined => {
  const mine = pool.filter(h => h.tone === tone).sort((a, b) => a.num - b.num);
  return mine.find(h => h.num !== not) ?? mine[0];
};

/** the heirmoi to remember as asked (oldest first, at most `keep`) */
export const rememberHeirmoi = (seen: number[], asked: number[], keep = 40): number[] =>
  [...seen.filter(n => !asked.includes(n)), ...asked].slice(-keep);
