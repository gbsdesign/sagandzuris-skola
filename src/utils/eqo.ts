import type { RoundAnswer, RoundRules } from './roundGames';

// „ექო“ (2026-11-01, the plan's musical games, like Simon): the synthesizer plays the opening of a well-known chant or song —
// three notes, then four, five… — and the player taps it back on a small keyboard of the melody's own pitches (a key a pitch,
// low to high, named დო რე მი; at the first level the keys light up while it sounds). Alone: the phrase grows by a note after
// every right answer and a wrong key ends it — the record is the longest phrase. In a class's room: one melody a game, each
// round a note longer, every player taps it on their own phone (each right note from the start 100, the whole phrase twice
// as much). On one phone: the class in a circle, the phone passed on — who misses is out, the last one in wins. The melodies:
// data/melodyPool.ts (scripts/build-melody-pool.mjs); the screens pages/games/eqo/. Kept free of the pool: the room's store
// (and so this file) is in the app's first bundle.

/** a melody of the pool: the top voice and the bass as they sound (MIDI), a pitch sung again once */
export interface Melody {
  id: string;
  title: string;
  /** its service (a chant) or its region (a song) */
  where: string;
  ref: string;
  song?: boolean;
  top: readonly number[];
  bass: readonly number[];
}

const SYL = ['დო', 'რე', 'მი', 'ფა', 'სოლ', 'ლა', 'სი'];
/** each pitch class as the chant books mostly write it: the sharps of დო, ფა and სოლ, the flats of მი and სი */
const SPELL: readonly (readonly [number, string])[] = [
  [0, ''], [0, '♯'], [1, ''], [2, '♭'], [2, ''], [3, ''], [3, '♯'], [4, ''], [4, '♯'], [5, ''], [6, '♭'], [6, ''],
];
export const pitchName = (midi: number) => { const [s, acc] = SPELL[((midi % 12) + 12) % 12]; return SYL[s] + acc; };

/** a keyboard of eight keys at most */
export const EQO_KEYS = 8;
/** the first round's (and a run's first) phrase */
export const EQO_START = 3;
/** the most notes a phrase may have in a room (an answer is a number of so many digits) */
export const EQO_MAX_TAPS = 16;

/** the opening a melody gives the game: its top voice up to its ninth different pitch */
export const eqoLine = (m: Pick<Melody, 'top'>): number[] => {
  const keys = new Set<number>();
  const out: number[] = [];
  for (const n of m.top) {
    if (!keys.has(n) && keys.size >= EQO_KEYS) break;
    keys.add(n);
    out.push(n);
  }
  return out;
};
/** the keyboard: the phrase's pitches, low to high */
export const keysOf = (notes: readonly number[]) => [...new Set(notes)].sort((a, b) => a - b);

/** a note's time as the phrase sounds: even, like Simon's lights */
export const EQO_BEAT = 0.62;
export const eqoTimed = (notes: readonly number[]): [number, number, number][] => notes.map((m, i) => [i * EQO_BEAT, EQO_BEAT * 0.85, m]);
export const eqoLength = (n: number) => n * EQO_BEAT;

/** the keys tapped, in order, as one whole number (a room's answer): each key 1…8 a digit of base 9, the first the lowest —
 * so an answer cut short is a number too */
export const encodeTaps = (taps: readonly number[]) => taps.slice(0, EQO_MAX_TAPS).reduceRight((n, k) => n * 9 + k + 1, 0);
export const decodeTaps = (pick: number): number[] | null => {
  if (!Number.isSafeInteger(pick) || pick <= 0) return null;
  const out: number[] = [];
  for (let n = pick; n > 0; n = Math.floor(n / 9)) {
    const d = n % 9;
    if (!d) return null;
    out.push(d - 1);
  }
  return out;
};

/** how many of the phrase's notes the taps hit from its start, one after another (the first wrong one ends it) */
export const rightFromStart = (notes: readonly number[], keys: readonly number[], taps: readonly number[]) => {
  let k = 0;
  while (k < notes.length && k < taps.length && keys[taps[k]] === notes[k]) k++;
  return k;
};

/** alone and in the circle, after every tap: right so far (`more`), the whole phrase (`done`) or a wrong key */
export type TapResult = 'more' | 'done' | 'wrong';
export const checkTaps = (notes: readonly number[], keys: readonly number[], taps: readonly number[]): TapResult => {
  const k = rightFromStart(notes, keys, taps);
  if (k < taps.length) return 'wrong';
  return k === notes.length ? 'done' : 'more';
};

// ——— a class's room

export interface EqoQ {
  kind: 'eqo';
  /** the melody (asked lately: the next games take another) */
  id: string;
  /** the phrase of this round */
  notes: number[];
  /** the game's keyboard, low to high: the same in every round */
  keys: number[];
  /** the keys light up while it sounds */
  lights: boolean;
  title: string;
  ref: string;
}

export const EQO_NOTE = 100;
/** each right note from the start 100; the whole phrase twice as much */
export const eqoPoints = (q: Pick<EqoQ, 'notes' | 'keys'>, a: Pick<RoundAnswer, 'pick'>) => {
  const taps = decodeTaps(a.pick);
  if (!taps) return 0;
  const k = rightFromStart(q.notes, q.keys, taps);
  return k === q.notes.length ? 2 * EQO_NOTE * k : EQO_NOTE * k;
};
/** the round's time: the phrase sounds, then two seconds a note */
export const eqoSeconds = (q: Pick<EqoQ, 'notes'>) => Math.ceil(6 + 2 * q.notes.length);

const text = (v: unknown, max: number) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const isMidi = (n: unknown) => Number.isInteger(n) && (n as number) >= 24 && (n as number) <= 96;

export const EQO_RULES: RoundRules<EqoQ> = {
  steps: () => 1,
  seconds: q => eqoSeconds(q),
  ok: (q, pick) => {
    const t = decodeTaps(pick);
    return !!t && t.length <= q.notes.length && t.every(k => k < q.keys.length);
  },
  points: eqoPoints,
  secret: ['title', 'ref'],
  valid: (q): q is EqoQ => {
    if (!q || typeof q !== 'object') return false;
    const o = q as Partial<EqoQ>;
    const keys = o.keys;
    return o.kind === 'eqo' && text(o.id, 80) && Array.isArray(keys) && keys.length >= 2 && keys.length <= EQO_KEYS
      && keys.every((k, i) => isMidi(k) && (i === 0 || k > keys[i - 1]))
      && Array.isArray(o.notes) && o.notes.length >= 2 && o.notes.length <= EQO_MAX_TAPS && o.notes.every(n => keys.includes(n))
      && typeof o.lights === 'boolean' && text(o.title, 160) && text(o.ref, 120);
  },
};

/** the one-phone game is the circle (pages/games/eqo/Circle.tsx); these are the shared screens' marks, never shown */
export const EQO_MARKS = [
  { points: 2, label: 'მთლიანად' },
  { points: 1, label: 'ნაწილი' },
  { points: 0, label: 'ვერა' },
] as const;

/**
 * A room's game: one melody — one not asked lately on this phone, else the one asked longest ago — each round a note longer
 * from three; the keyboard is the whole game's from the start (Simon's buttons never change).
 */
export const drawEqo = (o: {
  melodies: readonly Melody[]; count: number; lights: boolean; seen?: readonly string[]; rnd?: () => number;
}): EqoQ[] => {
  const rnd = o.rnd ?? Math.random;
  const seen = o.seen ?? [];
  const need = Math.min(EQO_MAX_TAPS, EQO_START + o.count - 1);
  const lines = o.melodies.map(m => ({ m, line: eqoLine(m) })).filter(x => x.line.length >= need);
  if (!lines.length || o.count < 1) return [];
  const fresh = lines.filter(x => !seen.includes(x.m.id));
  const { m, line } = fresh.length
    ? fresh[Math.floor(rnd() * fresh.length)]
    : [...lines].sort((a, b) => seen.indexOf(a.m.id) - seen.indexOf(b.m.id))[0];
  const keys = keysOf(line.slice(0, need));
  return Array.from({ length: need - EQO_START + 1 }, (_, r) => ({
    kind: 'eqo' as const, id: m.id, notes: line.slice(0, EQO_START + r), keys, lights: o.lights, title: m.title, ref: m.ref,
  }));
};

/** a run alone or a circle's melody: one not asked lately (`seen`), with a phrase of `min` notes at least */
export const pickMelody = (melodies: readonly Melody[], seen: readonly string[] = [], min = 12, rnd: () => number = Math.random): Melody | null => {
  const long = melodies.filter(m => eqoLine(m).length >= min);
  if (!long.length) return null;
  const fresh = long.filter(m => !seen.includes(m.id));
  return fresh.length ? fresh[Math.floor(rnd() * fresh.length)] : [...long].sort((a, b) => seen.indexOf(a.id) - seen.indexOf(b.id))[0];
};

// ——— the circle (one phone, passed on)

export interface EqoRing {
  names: string[];
  /** still in */
  alive: boolean[];
  /** whose turn it is */
  at: number;
  /** the phrase's notes now */
  len: number;
  /** who has had their turn at this length (when everyone still in has, the phrase grows by a note) */
  had: boolean[];
  /** who went out, in order */
  outOrder: number[];
  /** the longest phrase someone got right */
  best: number;
  over: boolean;
}

export const newRing = (names: readonly string[]): EqoRing | null => (names.length < 2 ? null : {
  names: [...names], alive: names.map(() => true), at: 0, len: EQO_START, had: names.map(() => false), outOrder: [], best: 0, over: false,
});

/** the next one still in after a seat, round the circle */
const nextIn = (alive: readonly boolean[], from: number) => {
  for (let i = 1; i <= alive.length; i++) {
    const s = (from + i) % alive.length;
    if (alive[s]) return s;
  }
  return from;
};

/** the one whose turn it was answered: a miss puts them out; the turn goes on; once everyone still in has had a turn the
 * phrase grows; the last one in wins (or all still in, once the melody's opening has no more notes — `max`) */
export const ringAnswer = (r: EqoRing, right: boolean, max: number): EqoRing => {
  if (r.over) return r;
  const alive = r.alive.map((a, i) => (i === r.at ? a && right : a));
  const had = r.had.map((h, i) => h || i === r.at);
  const outOrder = right ? r.outOrder : [...r.outOrder, r.at];
  const best = right ? Math.max(r.best, r.len) : r.best;
  const round = alive.every((a, i) => !a || had[i]);
  const len = round ? r.len + 1 : r.len;
  const over = alive.filter(Boolean).length <= 1 || len > max;
  return {
    ...r, alive, outOrder, best, over,
    had: round ? had.map(() => false) : had,
    len: over ? r.len : len,
    at: over ? r.at : nextIn(alive, r.at),
  };
};
export const ringWinners = (r: EqoRing) => r.alive.flatMap((a, i) => (a ? [i] : []));
