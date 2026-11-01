import type { RoundAnswer, RoundRules } from './roundGames';
import { decodeTaps, type Melody } from './eqo';
import { shuffle } from './amikhseni';

// „მფრინავი ნოტები“ (2026-11-01, the plan's musical games, like Staff Wars): the notes of the app's chants and songs on a
// staff — the top voice on the treble clef (an octave up, as the chant books' octave-down clef shows it), the bass on the bass
// clef — and the player names each: დო რე მი… or C D E… (German letters: H = სი). Alone: the notes fly across the staff one
// by one, faster and faster; three misses end it, the record is the notes named. In a class's room: four notes a round on a
// still staff, every player names them on their own phone (250 a right note, half of it by the end of the time). On one
// phone: the same flight with the phone passed round the circle, a note each — the class's record. Natural notes only: a
// sharp or a flat of the melody is left out. The melodies: data/melodyPool.ts; the screens pages/games/mprinavi/.

export type Clef = 'treble' | 'bass';
export type ClefChoice = Clef | 'both';
export type NameKind = 'syl' | 'abc';

export const NOTE_NAMES: Record<NameKind, readonly string[]> = {
  syl: ['დო', 'რე', 'მი', 'ფა', 'სოლ', 'ლა', 'სი'],
  abc: ['C', 'D', 'E', 'F', 'G', 'A', 'H'],
};
const NATURAL = [0, 2, 4, 5, 7, 9, 11];
/** a natural note's name: 0 = დო … 6 = სი (a sharp or a flat: none) */
export const stepOf = (midi: number): number | null => {
  const i = NATURAL.indexOf(((midi % 12) + 12) % 12);
  return i < 0 ? null : i;
};
const diatonic = (midi: number) => Math.floor(midi / 12) * 7 + (stepOf(midi) ?? 0);
/** the bottom line's note: the treble clef's მი (E4), the bass clef's სოლ (G2) */
const BOTTOM: Record<Clef, number> = { treble: 64, bass: 43 };
/** where a note sits: 0 = the bottom line, 1 = the space over it … 8 = the top line; under and over the staff, ledger lines */
export const staffPos = (midi: number, clef: Clef) => diatonic(midi) - diatonic(BOTTOM[clef]);
/** two ledger lines under the staff or over it at most */
export const POS_MIN = -4;
export const POS_MAX = 12;
/** a melody's note as the staff shows it */
export const shownOn = (midi: number, clef: Clef) => (clef === 'treble' ? midi + 12 : midi);

/** a melody's natural notes on a clef, in order (the top voice on the treble clef, the bass on the bass clef): a sharp or a
 * flat left out, a note again on the same place once */
export const naturalsOf = (m: Pick<Melody, 'top' | 'bass'>, clef: Clef): number[] => {
  const out: number[] = [];
  for (const raw of clef === 'treble' ? m.top : m.bass) {
    const n = shownOn(raw, clef);
    const p = staffPos(n, clef);
    if (stepOf(n) === null || p < POS_MIN || p > POS_MAX || out[out.length - 1] === n) continue;
    out.push(n);
  }
  return out;
};

const clefsOf = (c: ClefChoice): Clef[] => (c === 'both' ? ['treble', 'bass'] : [c]);

// ——— a class's room

export interface MprinaviQ {
  kind: 'mprinavi';
  /** the melody (asked lately: the next games take others first) */
  id: string;
  clef: Clef;
  /** the notes as shown, MIDI */
  notes: number[];
  names: NameKind;
  title: string;
  ref: string;
}

export const MPRINAVI_NOTES = 4;
export const MPRINAVI_SECONDS = 20;
export const MPRINAVI_NOTE = 250;

/** how many of the notes the taps name right, each in its own place */
export const namedRight = (notes: readonly number[], taps: readonly number[]) => notes.filter((n, i) => taps[i] === stepOf(n)).length;

/** 250 a right note, half of it at the time's end */
export const mprinaviPoints = (q: Pick<MprinaviQ, 'notes'>, a: Pick<RoundAnswer, 'pick' | 'ms'>, limitMs: number) => {
  const taps = decodeTaps(a.pick);
  if (!taps) return 0;
  const late = limitMs > 0 ? Math.min(1, Math.max(0, a.ms / limitMs)) : 1;
  return Math.round(MPRINAVI_NOTE * namedRight(q.notes, taps) * (1 - late / 2));
};

const text = (v: unknown, max: number) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;

export const MPRINAVI_RULES: RoundRules<MprinaviQ> = {
  steps: () => 1,
  seconds: () => MPRINAVI_SECONDS,
  ok: (q, pick) => {
    const t = decodeTaps(pick);
    return !!t && t.length <= q.notes.length && t.every(k => k < 7);
  },
  points: mprinaviPoints,
  secret: ['title', 'ref'],
  valid: (q): q is MprinaviQ => {
    if (!q || typeof q !== 'object') return false;
    const o = q as Partial<MprinaviQ>;
    const clef = o.clef;
    return o.kind === 'mprinavi' && text(o.id, 80) && (clef === 'treble' || clef === 'bass')
      && Array.isArray(o.notes) && o.notes.length >= 1 && o.notes.length <= 8
      && o.notes.every(n => Number.isInteger(n) && stepOf(n) !== null && staffPos(n, clef) >= POS_MIN && staffPos(n, clef) <= POS_MAX)
      && (o.names === 'syl' || o.names === 'abc') && text(o.title, 160) && text(o.ref, 120);
  },
};

/** the one-phone game is the flight round the circle (pages/games/mprinavi/Flight.tsx); these are the shared screens' marks, never shown */
export const MPRINAVI_MARKS = [
  { points: 4, label: '4' },
  { points: 3, label: '3' },
  { points: 2, label: '2' },
  { points: 1, label: '1' },
  { points: 0, label: '0' },
] as const;

/**
 * A room's game: each round four notes in a row from a melody's natural notes on its clef (one clef, or both in turn), a
 * different melody each round while there are — the ones not asked lately on this phone first — and never the same four twice.
 */
export const drawMprinavi = (o: {
  melodies: readonly Melody[]; count: number; clefs: ClefChoice; names: NameKind; seen?: readonly string[]; rnd?: () => number;
}): MprinaviQ[] => {
  const rnd = o.rnd ?? Math.random;
  const seen = o.seen ?? [];
  const clefs = clefsOf(o.clefs);
  const out: MprinaviQ[] = [];
  const used = new Set<string>();
  const asked = new Set<string>();
  for (let r = 0; r < o.count; r++) {
    const clef = clefs[r % clefs.length];
    const fit = o.melodies.filter(m => naturalsOf(m, clef).length >= MPRINAVI_NOTES);
    if (!fit.length) continue;
    const order = [
      ...shuffle(fit.filter(m => !asked.has(m.id) && !seen.includes(m.id)), rnd),
      ...shuffle(fit.filter(m => !asked.has(m.id) && seen.includes(m.id)), rnd),
      ...shuffle(fit.filter(m => asked.has(m.id)), rnd),
    ];
    for (const m of order) {
      const line = naturalsOf(m, clef);
      const starts = shuffle(Array.from({ length: line.length - MPRINAVI_NOTES + 1 }, (_, i) => i), rnd);
      const at = starts.find(i => !used.has(`${clef}:${line.slice(i, i + MPRINAVI_NOTES).join('.')}`));
      if (at === undefined) continue;
      const notes = line.slice(at, at + MPRINAVI_NOTES);
      used.add(`${clef}:${notes.join('.')}`);
      asked.add(m.id);
      out.push({ kind: 'mprinavi', id: m.id, clef, notes, names: o.names, title: m.title, ref: m.ref });
      break;
    }
  }
  return out;
};

// ——— the flight (alone, and round the circle)

export const MPRINAVI_LIVES = 3;
/** a note's flight across the staff, in seconds: seven at first, less after every four named right, never under 2.2 */
export const flightSeconds = (right: number) => Math.max(2.2, 7 - 0.4 * Math.floor(right / 4));

export interface FlyNote { midi: number; clef: Clef; melody: string; title: string }

/** the flight's notes: melody after melody in a shuffled order (the ones not asked lately first), each one's natural notes in
 * order on its clef — with both clefs, a melody on each in turn */
export const flightNotes = (
  melodies: readonly Melody[], clefs: ClefChoice, seen: readonly string[] = [], rnd: () => number = Math.random, max = 600,
): FlyNote[] => {
  const order = [...shuffle(melodies.filter(m => !seen.includes(m.id)), rnd), ...shuffle(melodies.filter(m => seen.includes(m.id)), rnd)];
  const cs = clefsOf(clefs);
  const out: FlyNote[] = [];
  for (let i = 0; out.length < max && order.length && i < order.length * 4; i++) {
    const m = order[i % order.length];
    const clef = cs[i % cs.length];
    for (const midi of naturalsOf(m, clef)) out.push({ midi, clef, melody: m.id, title: m.title });
  }
  return out.slice(0, max);
};

export interface Flight { at: number; right: number; lives: number; over: boolean }
export const newFlight = (): Flight => ({ at: 0, right: 0, lives: MPRINAVI_LIVES, over: false });
/** a note named (right or wrong) or flown past (wrong): the next one comes; three misses end it, so does the end of the notes */
export const flightAnswer = (f: Flight, right: boolean, total: number): Flight => {
  if (f.over) return f;
  const lives = right ? f.lives : f.lives - 1;
  const at = f.at + 1;
  return { at, right: f.right + (right ? 1 : 0), lives, over: lives <= 0 || at >= total };
};
