import type { RoundRules } from './roundGames';

// „ხმის წყვილები“ (2026-11-01, the plan's №3, like Memory): cards face down in a grid. A sound card plays a chant's opening
// (its book notes on the synthesizer) or a folk song's piece (a recording); its pair is the card with its name — or, the easier
// way, a second card with the same sound (the name shows when the pair is found). Two cards a move: a pair stays open, two
// others close again. Alone: the fewest moves; a class's room: everyone plays the same board on their own phone against the
// clock; one phone: teams take turns, a team that found a pair goes again.

/** what a sound card plays: a book's chant (book + its first number) or a recording from a share of its length */
export type TsqSound = { book: string; num: number } | { url: string; from: number };
export interface TsqItem { id: string; name: string; sub: string; sound: TsqSound }
/** a pair: a sound and its name, or the same sound twice */
export type TsqMode = 'name' | 'same';
export type TsqWhat = 'chants' | 'songs' | 'both';

/** the boards' sizes in cards */
export const TSQ_SIZES = [8, 12, 16] as const;
export type TsqSize = typeof TSQ_SIZES[number];

/**
 * The deal: card i holds `cards[i]` = its pair × 2 + (0 — the sound, 1 — the pair's other card). The other card is the name
 * (mode `name`) or the same sound again (mode `same`).
 */
export const dealCards = (pairs: number, rnd: () => number = Math.random): number[] => {
  const cards = Array.from({ length: pairs * 2 }, (_, i) => i);
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
};
export const pairOf = (card: number) => card >> 1;
export const isName = (card: number, mode: TsqMode) => mode === 'name' && (card & 1) === 1;

/** a board being played: the cards face up now that are not found yet (≤ 2), the found ones, the moves, the pairs */
export interface TsqBoard { open: number[]; done: boolean[]; moves: number; pairs: number }
export const newBoard = (cards: number): TsqBoard => ({ open: [], done: Array.from({ length: cards }, () => false), moves: 0, pairs: 0 });
export type FlipEvent = 'none' | 'open' | 'match' | 'miss';

/** a tap on card `i`: a third card first closes the two that missed; the second card of a move counts it */
export const flipCard = (b: TsqBoard, cards: readonly number[], i: number): { board: TsqBoard; event: FlipEvent } => {
  if (!Number.isInteger(i) || i < 0 || i >= cards.length || b.done[i] || (b.open.length < 2 && b.open.includes(i))) return { board: b, event: 'none' };
  const open = b.open.length >= 2 ? [i] : [...b.open, i];
  if (open.length < 2) return { board: { ...b, open }, event: 'open' };
  const [a, c] = open;
  const moves = b.moves + 1;
  if (pairOf(cards[a]) === pairOf(cards[c])) {
    const done = b.done.slice();
    done[a] = true;
    done[c] = true;
    return { board: { open: [], done, moves, pairs: b.pairs + 1 }, event: 'match' };
  }
  return { board: { ...b, open, moves }, event: 'miss' };
};
/** after a miss's pause: its two cards close */
export const closeMiss = (b: TsqBoard): TsqBoard => (b.open.length >= 2 ? { ...b, open: [] } : b);
export const isClear = (b: TsqBoard) => b.done.length > 0 && b.done.every(Boolean);

/** a board read back from this phone (a paused one-phone game) */
export const parseBoard = (v: unknown, cards: number): TsqBoard | null => {
  if (!v || typeof v !== 'object') return null;
  const o = v as Partial<TsqBoard>;
  const ints = (a: unknown) => Array.isArray(a) && a.every(n => Number.isInteger(n) && n >= 0 && n < cards);
  if (!ints(o.open) || (o.open as number[]).length > 2 || !Array.isArray(o.done) || o.done.length !== cards || !o.done.every(d => typeof d === 'boolean')) return null;
  if (!Number.isInteger(o.moves) || !Number.isInteger(o.pairs) || o.moves! < 0 || o.pairs! < 0 || o.pairs! * 2 !== o.done.filter(Boolean).length) return null;
  return { open: o.open as number[], done: o.done as boolean[], moves: o.moves!, pairs: o.pairs! };
};

// ——— a class's room: the same board on every phone, against the clock

export interface TsqvilebiQ { kind: 'tsqvilebi'; id: string; mode: TsqMode; items: TsqItem[]; cards: number[] }

/** a player's answer: the pairs found and the moves made, as one int */
export const encodeResult = (pairs: number, moves: number) => Math.min(999, Math.max(0, moves)) * 32 + Math.min(31, Math.max(0, pairs));
export const decodeResult = (pick: number) => ({ pairs: pick % 32, moves: Math.floor(pick / 32) });

export const TSQ_PAIR = 100;
/** each pair 100; the whole board up to 600 more — all of it when every move found a pair, half when it took twice as many */
export const tsqPoints = (q: Pick<TsqvilebiQ, 'items'>, pick: number) => {
  const { pairs, moves } = decodeResult(pick);
  const all = q.items.length;
  if (pairs < 1) return 0;
  return TSQ_PAIR * pairs + (pairs === all ? Math.round((6 * TSQ_PAIR * all) / Math.max(moves, all)) : 0);
};
/** a board's time: half a minute and 14 s a pair */
export const tsqSeconds = (q: Pick<TsqvilebiQ, 'items'>) => 30 + 14 * q.items.length;

const text = (v: unknown, max: number) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const soundOk = (s: unknown) => {
  if (!s || typeof s !== 'object') return false;
  const o = s as Record<string, unknown>;
  if ('url' in o) return typeof o.url === 'string' && o.url.startsWith('https://') && o.url.length <= 300 && typeof o.from === 'number' && o.from >= 0 && o.from <= 1;
  return text(o.book, 24) && Number.isInteger(o.num) && (o.num as number) > 0 && (o.num as number) < 5000;
};

export const TSQ_RULES: RoundRules<TsqvilebiQ> = {
  steps: () => 1,
  seconds: q => tsqSeconds(q),
  ok: (q, pick) => {
    if (!Number.isInteger(pick) || pick < 0) return false;
    const { pairs, moves } = decodeResult(pick);
    return pairs <= q.items.length && moves >= pairs && moves <= 999;
  },
  points: (q, a) => tsqPoints(q, a.pick),
  secret: [],
  valid: (q): q is TsqvilebiQ => {
    if (!q || typeof q !== 'object') return false;
    const o = q as Partial<TsqvilebiQ>;
    const items = o.items, cards = o.cards;
    if (o.kind !== 'tsqvilebi' || !text(o.id, 120) || (o.mode !== 'name' && o.mode !== 'same')) return false;
    if (!Array.isArray(items) || items.length < 2 || items.length > 10 || !Array.isArray(cards) || cards.length !== items.length * 2) return false;
    return new Set(cards).size === cards.length && cards.every(c => Number.isInteger(c) && c >= 0 && c < cards.length)
      && items.every(it => !!it && text(it.id, 120) && text(it.name, 160) && typeof it.sub === 'string' && it.sub.length <= 120 && soundOk(it.sound));
  },
};

/** the one-phone game is teams taking turns (pages/games/tsqvilebi/Teams.tsx); these are the shared screens' marks, never shown */
export const TSQ_MARKS = [
  { points: 1, label: 'იპოვა' },
  { points: 0, label: 'ვერა' },
] as const;

// ——— the boards

/**
 * A name for a small card: soft hyphens (U+00AD) between the syllables of its long words, so a narrow card breaks
 * „ბაბილოვნისათა“ as ბა-ბი-ლოვ-ნისათა, never mid-letter-run. A consonant between two vowels goes to the next syllable,
 * of two or more the first stays (ღმრთის-მშო-ბელო); a word keeps two letters before its first break and three after its last.
 */
export const softBreaks = (name: string, min = 8) => name.replace(/[ა-ჰ]+/g, w => {
  if (w.length < min) return w;
  const vowels = [...w].flatMap((ch, i) => ('აეიოუ'.includes(ch) ? [i] : []));
  const at = new Set<number>();
  for (let k = 0; k + 1 < vowels.length; k++) {
    const between = vowels[k + 1] - vowels[k] - 1;
    if (between < 1) continue;
    const b = vowels[k] + (between === 1 ? 1 : 2);
    if (b >= 2 && w.length - b >= 3) at.add(b);
  }
  return [...w].map((ch, i) => (at.has(i) ? `­${ch}` : ch)).join('');
});

/** a name's key: one way of writing it (old spelling, quotes, case) */
const keyOf = (name: string) => name.toLowerCase().replace(/ჲ/g, '').replace(/ვ(?=[აეიოუ])/g, 'უ').replace(/[^ა-ჰa-z0-9]+/g, ' ').trim();

/**
 * A board's items: `pairs` of them, different names, the ones not asked lately on this phone (`seen`) first; with both
 * kinds, half of each (`groups`: the chants', the songs').
 */
export const pickItems = (groups: readonly (readonly TsqItem[])[], pairs: number, seen: readonly string[] = [], rnd: () => number = Math.random): TsqItem[] => {
  const live = groups.filter(g => g.length);
  if (!live.length || pairs < 1) return [];
  const want = live.map((_, i) => Math.floor(pairs / live.length) + (i < pairs % live.length ? 1 : 0));
  const out: TsqItem[] = [];
  const names = new Set<string>();
  const take = (g: readonly TsqItem[], n: number) => {
    const order = [...g].map(it => ({ it, r: rnd() + (seen.includes(it.id) ? 1 + seen.indexOf(it.id) / Math.max(1, seen.length) : 0) }))
      .sort((a, b) => a.r - b.r).map(x => x.it);
    for (const it of order) {
      if (n <= 0) break;
      const k = keyOf(it.name);
      if (names.has(k) || out.some(o => o.id === it.id)) continue;
      names.add(k);
      out.push(it);
      n--;
    }
    return n;
  };
  let short = 0;
  live.forEach((g, i) => { short += take(g, want[i]); });
  // a group too small: the others fill its places
  for (const g of live) if (short > 0) short = take(g, short);
  return out;
};

/** a room's game: `count` boards of different items */
export const drawTsqvilebi = (o: {
  groups: readonly (readonly TsqItem[])[]; count: number; pairs: number; mode: TsqMode; seen?: readonly string[]; rnd?: () => number;
}): TsqvilebiQ[] => {
  const rnd = o.rnd ?? Math.random;
  const out: TsqvilebiQ[] = [];
  let seen = [...(o.seen ?? [])];
  for (let r = 0; r < o.count; r++) {
    const items = pickItems(o.groups, o.pairs, seen, rnd);
    if (items.length < 2) break;
    seen = [...seen.filter(id => !items.some(it => it.id === id)), ...items.map(it => it.id)];
    out.push({ kind: 'tsqvilebi', id: `${r + 1}:${items.map(it => it.id).join('|')}`.slice(0, 120), mode: o.mode, items, cards: dealCards(items.length, rnd) });
  }
  return out;
};
