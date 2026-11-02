import type { RoundAnswer, RoundRules, RoundsState } from './roundGames';

// „საგალობო ლოტო“ (2026-11-01, the plan's live game №15, like Bingo): instead of numbers, pieces sound — a chant's opening
// on the synthesizer from its book notes, a folk song's recording, or a song to be placed in its region — and each player
// marks them on a card of nine (3 × 3). Three marked in a row, a column or a diagonal is a line: „საგანძური!“.
// The room (every player's own card on their phone, one of the round games, utils/roundGames.ts): every name of a deck of
// thirteen sounds once, in an order of its own; a seat's card comes from the game's seed (`cardOf`), so the host's phone
// and the player's agree without sending it; the marks so far ride in each round (`carry`). Alone (`LotoSolo`): one card,
// the pieces keep coming, a mistake wipes the last mark and its piece comes back, until the card is full. One phone with
// paper cards (`LotoTable`): the printed kit's thirty cards over its twenty chants (`kitCards`), or cards the children write
// themselves; the phone plays and checks a call. Kept free of the chants' and songs' data, since the room's store (and so
// this file) is in the app's first bundle: the decks are made in pages/games/loto/.

export type LotoDeck = 'chants' | 'songs' | 'regions';
export const LOTO_DECKS: readonly LotoDeck[] = ['chants', 'songs', 'regions'];

/** a card: nine names, three by three (the cells read row by row) */
export const CARD_SIZE = 9;
/** the room's and the solo game's deck: thirteen names, nine of them on each card */
export const LOTO_ROUNDS = 13;
/** a round's time, and how long its piece plays */
export const LOTO_SECONDS = 25;
export const LOTO_CLIP = 16;
/** a mark: 100, and up to 100 more by speed; each line it closes: 300 */
export const MARK_POINTS = 100;
export const LINE_POINTS = 300;
/** the answer „it is not on my card“ */
export const NOT_MINE = -1;

/** the card's eight lines, as cells: three rows, three columns, two diagonals */
export const LINES: readonly (readonly number[])[] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6],
];

/** a small seeded random (mulberry32): the same seed gives the same cards on every phone */
export const seeded = (seed: number) => {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
export const shuffled = <T,>(list: readonly T[], rnd: () => number): T[] => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ——— the cards

const made = new Map<string, number[][]>();

/** the first `count` cards of a game over a deck of `n`: each the nine names used least on the cards before it (so every
 * name is on about as many cards), drawn at random among equals, laid out at random — no two cards with the same nine */
export const cardsOf = (seed: number, count: number, n: number): number[][] => {
  if (n < CARD_SIZE || count < 1) return [];
  const key = `${seed}:${n}`;
  const have = made.get(key) ?? [];
  if (have.length >= count) return have.slice(0, count);
  const rnd = seeded(seed);
  // the generator is replayed from the start, so a card never depends on how many were asked for before
  const cards: number[][] = [];
  const used = Array.from({ length: n }, () => 0);
  const sets = new Set<string>();
  while (cards.length < count) {
    let card: number[] = [];
    for (let tries = 0; tries < 40; tries++) {
      const order = shuffled(Array.from({ length: n }, (_, i) => i), rnd).sort((a, b) => used[a] - used[b]);
      card = shuffled(order.slice(0, CARD_SIZE), rnd);
      if (!sets.has([...card].sort((a, b) => a - b).join(','))) break;
    }
    sets.add([...card].sort((a, b) => a - b).join(','));
    card.forEach(i => { used[i] += 1; });
    cards.push(card);
  }
  made.set(key, cards);
  return cards.slice(0, count);
};
export const cardOf = (seed: number, seat: number, n: number): number[] => cardsOf(seed, seat + 1, n)[seat] ?? [];

/** how many of a card's lines are whole with these names marked */
export const linesOf = (card: readonly number[], marked: Iterable<number>): number => {
  const m = new Set(marked);
  return card.length === CARD_SIZE ? LINES.filter(l => l.every(c => m.has(card[c]))).length : 0;
};
/** the cells of the whole lines (to light them) */
export const lineCells = (card: readonly number[], marked: Iterable<number>): Set<number> => {
  const m = new Set(marked);
  const out = new Set<number>();
  if (card.length === CARD_SIZE) for (const l of LINES) if (l.every(c => m.has(card[c]))) l.forEach(c => out.add(c));
  return out;
};
/** the marks a card still lacks for its nearest line (0: a line is whole) */
export const toLine = (card: readonly number[], marked: Iterable<number>): number => {
  const m = new Set(marked);
  return card.length === CARD_SIZE ? Math.min(...LINES.map(l => l.filter(c => !m.has(card[c])).length)) : 3;
};

// ——— the room: one round a piece

/** what a round plays and what it is */
export interface LotoPiece {
  /** the chant's version, or the song (and its take) */
  id: string;
  /** a chant's book notes (the synthesizer plays them) */
  book?: string;
  num?: number;
  /** a recording, and where its piece starts: a share of its length (each phone plays the same piece) */
  url?: string;
  from?: number;
  /** a region's deck: the song that sounds, where it was recorded, who sings */
  song?: string;
  place?: string;
  who?: string;
  /** a chant's service */
  service?: string;
}

export interface LotoQ extends LotoPiece {
  kind: 'loto';
  deck: LotoDeck;
  /** the deck: its names in the cards' numbering */
  names: string[];
  /** the cards: a seat's is cardOf(seed, seat, names.length) */
  seed: number;
  /** the piece's name, an index of `names` */
  right: number;
  /** by seat: the names marked so far, and the lines they make (from the rounds before this one) */
  marks: number[][];
  lines: number[];
}

/** a game's rounds: every name once, in an order of its own; the pieces by the deck's numbering */
export const lotoRounds = (deck: LotoDeck, names: readonly string[], pieces: readonly LotoPiece[], rnd: () => number = Math.random): LotoQ[] => {
  if (names.length < CARD_SIZE || names.length !== pieces.length) return [];
  const seed = Math.floor(rnd() * 2147483647) + 1;
  return shuffled(names.map((_, i) => i), rnd).map(right => ({
    ...pieces[right], kind: 'loto' as const, deck, names: [...names], seed, right, marks: [], lines: [],
  }));
};

/** what a seat's answer earns: a mark on its own card, the quicker the more, and every line it closes */
export const lotoPoints = (q: LotoQ, a: Pick<RoundAnswer, 'pick' | 'ms'>, limitMs: number, seat?: number): number => {
  if (seat === undefined || seat < 0 || a.pick !== q.right) return 0;
  const card = cardOf(q.seed, seat, q.names.length);
  const mine = q.marks[seat] ?? [];
  if (!card.includes(a.pick) || mine.includes(a.pick)) return 0;
  const late = limitMs > 0 ? Math.min(1, Math.max(0, a.ms / limitMs)) : 1;
  const lines = linesOf(card, [...mine, a.pick]) - linesOf(card, mine);
  return MARK_POINTS + Math.round(MARK_POINTS * (1 - late)) + LINE_POINTS * lines;
};

/** a seat's marks after a round: the piece, when it was marked right on its own card */
export const marksAfter = (q: LotoQ, seat: number, pick: number | null | undefined): number[] => {
  const mine = q.marks[seat] ?? [];
  if (pick !== q.right || mine.includes(q.right) || !cardOf(q.seed, seat, q.names.length).includes(q.right)) return mine;
  return [...mine, q.right];
};

/** the next round takes the marks along */
export const carryLoto = (next: LotoQ, s: Pick<RoundsState, 'players' | 'answers' | 'rounds' | 'at'>): LotoQ => {
  const cur = s.rounds[s.at];
  if (!cur || cur.kind !== 'loto') return next;
  const marks = s.players.map((_, seat) => marksAfter(cur, seat, s.answers[seat]?.pick));
  return { ...next, marks, lines: marks.map((m, seat) => linesOf(cardOf(next.seed, seat, next.names.length), m)) };
};

const text = (v: unknown, max: number) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const isIndex = (n: unknown, len: number) => Number.isInteger(n) && (n as number) >= 0 && (n as number) < len;
const maybe = (v: unknown, max: number) => v === undefined || text(v, max);

export const LOTO_RULES: RoundRules<LotoQ> = {
  steps: () => 1,
  seconds: () => LOTO_SECONDS,
  ok: (q, pick) => pick === NOT_MINE || isIndex(pick, q.names.length),
  points: (q, a, limitMs, seat) => lotoPoints(q, a, limitMs, seat),
  secret: ['right', 'id', 'song', 'place', 'who', 'service'],
  carry: carryLoto,
  valid: (q): q is LotoQ => {
    const o = q as Partial<LotoQ>;
    const n = Array.isArray(o.names) ? o.names.length : 0;
    return o.kind === 'loto' && LOTO_DECKS.includes(o.deck as LotoDeck) && n >= CARD_SIZE && n <= 30
      && o.names!.every(x => text(x, 80)) && Number.isInteger(o.seed) && isIndex(o.right, n) && text(o.id, 200)
      && (o.book === undefined ? o.num === undefined : text(o.book, 20) && Number.isInteger(o.num))
      && maybe(o.url, 300) && (o.from === undefined || (typeof o.from === 'number' && o.from >= 0 && o.from <= 1))
      && maybe(o.song, 120) && maybe(o.place, 120) && maybe(o.who, 160) && maybe(o.service, 40)
      && Array.isArray(o.marks) && o.marks.length <= 40 && o.marks.every(m => Array.isArray(m) && m.length <= CARD_SIZE && m.every(i => isIndex(i, n)))
      && Array.isArray(o.lines) && o.lines.length <= 40 && o.lines.every(x => Number.isInteger(x) && x >= 0 && x <= LINES.length);
  },
};

/** the seats that closed a line in this round (their lines before → after), and whether it was the game's first */
export const lineNews = (q: LotoQ, picks: readonly (number | null)[]) => {
  const before = picks.map((_, seat) => q.lines[seat] ?? 0);
  const news = picks.flatMap((pick, seat) => {
    const card = cardOf(q.seed, seat, q.names.length);
    const now = linesOf(card, marksAfter(q, seat, pick));
    return now > before[seat] ? [{ seat, lines: now, gained: now - before[seat] }] : [];
  });
  return { news, first: news.length > 0 && before.every(x => x === 0) };
};

// ——— alone: one card, the pieces keep coming until it is full

export interface LotoSolo {
  v: 1;
  deck: LotoDeck;
  names: string[];
  pieces: LotoPiece[];
  /** my card: nine of the deck's names */
  card: number[];
  /** the pieces to come, the next first */
  queue: number[];
  /** the names marked, in the order marked */
  marks: number[];
  heard: number;
  mistakes: number;
  /** the piece by which the first line was whole */
  firstLine: number | null;
  /** the time spent answering, ms */
  spent: number;
  /** the last answer, for its word on the screen */
  last: { piece: number; pick: number; result: 'mark' | 'wrong' | 'missed' | 'clear'; erased?: number } | null;
}

export const newLotoSolo = (deck: LotoDeck, names: readonly string[], pieces: readonly LotoPiece[], rnd: () => number = Math.random): LotoSolo | null => {
  if (names.length < CARD_SIZE || names.length !== pieces.length) return null;
  const card = shuffled(names.map((_, i) => i), rnd).slice(0, CARD_SIZE);
  return {
    v: 1, deck, names: [...names], pieces: [...pieces], card, queue: shuffled(names.map((_, i) => i), rnd), marks: [], heard: 0, mistakes: 0,
    firstLine: null, spent: 0, last: null,
  };
};

/** a piece put back into the queue: not next if it can be helped */
const putBack = (queue: number[], piece: number, rnd: () => number) => {
  if (queue.includes(piece)) return queue;
  const at = queue.length < 2 ? queue.length : 1 + Math.floor(rnd() * queue.length);
  return [...queue.slice(0, at), piece, ...queue.slice(at)];
};

/** my answer to the piece now sounding: a name of my card (`NOT_MINE`: not on it — also when the time ran out). A mark
 * stays; a wrong name wipes my last mark (its piece comes back) and the piece itself comes back if it was mine; a piece of
 * mine let go comes back too */
export const soloAnswer = (s: LotoSolo, pick: number, ms: number, rnd: () => number = Math.random): LotoSolo => {
  const piece = s.queue[0];
  if (piece === undefined || soloDone(s)) return s;
  let queue = s.queue.slice(1);
  let marks = s.marks;
  let mistakes = s.mistakes;
  let erased: number | undefined;
  const mine = s.card.includes(piece) && !s.marks.includes(piece);
  let result: NonNullable<LotoSolo['last']>['result'];
  if (pick === piece && mine) {
    marks = [...marks, piece];
    result = 'mark';
  } else if (pick === NOT_MINE) {
    result = mine ? 'missed' : 'clear';
    if (mine) queue = putBack(queue, piece, rnd);
  } else {
    result = 'wrong';
    mistakes += 1;
    if (marks.length) {
      erased = marks[marks.length - 1];
      marks = marks.slice(0, -1);
      queue = putBack(queue, erased, rnd);
    }
    if (mine) queue = putBack(queue, piece, rnd);
  }
  const heard = s.heard + 1;
  const firstLine = s.firstLine ?? (linesOf(s.card, marks) > 0 ? heard : null);
  return { ...s, queue, marks, mistakes, heard, firstLine, spent: s.spent + Math.max(0, Math.round(ms)), last: { piece, pick, result, ...(erased !== undefined ? { erased } : {}) } };
};
export const soloDone = (s: LotoSolo) => s.marks.length >= CARD_SIZE;

export const parseLotoSolo = (raw: unknown): LotoSolo | null => {
  const o = raw as Partial<LotoSolo> | null;
  if (!o || o.v !== 1 || !LOTO_DECKS.includes(o.deck as LotoDeck) || !Array.isArray(o.names) || !Array.isArray(o.pieces)) return null;
  const n = o.names.length;
  const ix = (l: unknown) => Array.isArray(l) && l.every(i => isIndex(i, n));
  if (n < CARD_SIZE || o.pieces.length !== n || !ix(o.card) || o.card!.length !== CARD_SIZE || !ix(o.queue) || !ix(o.marks)) return null;
  if (!Number.isInteger(o.heard) || !Number.isInteger(o.mistakes) || !Number.isInteger(o.spent)) return null;
  // every piece of my card not marked must still be to come
  if (o.card!.some(i => !o.marks!.includes(i) && !o.queue!.includes(i))) return null;
  return { ...(o as LotoSolo), firstLine: Number.isInteger(o.firstLine) ? o.firstLine! : null, last: o.last ?? null };
};

/**
 * A chant whose opening is a reciting tone (data/lotoKit.ts PLAIN_OPENINGS): its top voice's first 16 notes keep under four
 * pitches, or one pitch more than 60 % of the time. `voice` as in public/notes: [beat, beats, midi]; where the voice splits,
 * the upper note counts.
 */
export const plainOpening = (voice: readonly (readonly number[])[]): boolean => {
  const sorted = [...voice].sort((a, b) => a[0] - b[0] || b[2] - a[2]);
  const notes = sorted.filter((n, i) => i === 0 || n[0] !== sorted[i - 1][0]).slice(0, 16);
  const counts = new Map<number, number>();
  for (const n of notes) counts.set(n[2], (counts.get(n[2]) ?? 0) + 1);
  return counts.size < 4 || Math.max(...counts.values()) > 0.6 * notes.length;
};

// ——— one phone, paper cards: the phone plays, the children mark with beans, a call is checked

/** the printed kit: thirty cards over its twenty chants (data/lotoKit.ts), the same here and on paper */
export const KIT_CARDS = 30;
export const KIT_SEED = 1501;
export const kitCards = (n: number) => cardsOf(KIT_SEED, KIT_CARDS, n);

export interface LotoWin { label: string; at: number; lines: number }

export interface LotoTable {
  v: 1;
  /** the kit's numbered cards, or the children's own (nine names of the deck, written in a 3 × 3 grid) */
  cards: 'print' | 'own';
  deck: LotoDeck;
  names: string[];
  pieces: LotoPiece[];
  /** the order of play; `at` of them have sounded */
  order: number[];
  at: number;
  /** the calls found right, in their order */
  wins: LotoWin[];
}

export const newLotoTable = (cards: LotoTable['cards'], deck: LotoDeck, names: readonly string[], pieces: readonly LotoPiece[], rnd: () => number = Math.random): LotoTable | null => {
  if (names.length < CARD_SIZE || names.length !== pieces.length) return null;
  return { v: 1, cards, deck, names: [...names], pieces: [...pieces], order: shuffled(names.map((_, i) => i), rnd), at: 0, wins: [] };
};
export const tablePlayed = (t: LotoTable) => t.order.slice(0, t.at);
export const tableNext = (t: LotoTable): LotoTable => (t.at < t.order.length ? { ...t, at: t.at + 1 } : t);
export const tableOver = (t: LotoTable) => t.at >= t.order.length;

/** a call checked: a printed card by its number (its whole lines), or the names a child reads out (all sounded?) */
export const checkKitCard = (t: LotoTable, no: number) => {
  const card = t.cards === 'print' ? kitCards(t.names.length)[no - 1] : undefined;
  if (!card) return null;
  const played = tablePlayed(t);
  return { card, lines: linesOf(card, played), cells: lineCells(card, played), marked: card.filter(i => played.includes(i)) };
};
export const checkNames = (t: LotoTable, picked: readonly number[]) => {
  const played = new Set(tablePlayed(t));
  const missing = picked.filter(i => !played.has(i));
  return { ok: picked.length >= 3 && missing.length === 0, missing };
};
export const addWin = (t: LotoTable, label: string, lines: number): LotoTable => ({ ...t, wins: [...t.wins, { label: label.trim().slice(0, 40), at: t.at, lines }] });
export const undoWin = (t: LotoTable): LotoTable => ({ ...t, wins: t.wins.slice(0, -1) });

export const parseLotoTable = (raw: unknown): LotoTable | null => {
  const o = raw as Partial<LotoTable> | null;
  if (!o || o.v !== 1 || (o.cards !== 'print' && o.cards !== 'own') || !LOTO_DECKS.includes(o.deck as LotoDeck)) return null;
  if (!Array.isArray(o.names) || !Array.isArray(o.pieces) || o.names.length < CARD_SIZE || o.pieces.length !== o.names.length) return null;
  const n = o.names.length;
  if (!Array.isArray(o.order) || o.order.length !== n || !o.order.every(i => isIndex(i, n)) || new Set(o.order).size !== n) return null;
  if (!Number.isInteger(o.at) || o.at! < 0 || o.at! > n) return null;
  const wins = Array.isArray(o.wins) ? o.wins.filter(w => w && typeof w.label === 'string' && Number.isInteger(w.at) && Number.isInteger(w.lines)) : [];
  return { ...(o as LotoTable), wins };
};
