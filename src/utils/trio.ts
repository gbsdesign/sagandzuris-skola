import type { RoundAnswer, RoundRules } from './roundGames';
import { drawTurniri } from './turniri';
import type { KnownChant } from './chantRounds';

// „მესამე ხმა“ (2026-11-01, the plan's №6, like Smule): the phone sings two voices of a chant from its book notes and
// the singer sings the third into the microphone. The take is scored in the trio's own key, octaves aside: each note
// of my voice counts by its length, sung when most of it is in tune. Alone the whole chant or its opening; online a
// class's room sings three chants' openings, each on their own phone in earphones (the share in per cent is the
// round's points); on one phone the speaker sings one or two voices and the room the rest. Kept free of the chants'
// data (the room's store has this file in the app's first bundle).

export interface TrioQ {
  kind: 'mesame';
  /** the chant's version (data/chantLookup.ts) */
  id: string;
  title: string;
  service: string;
  /** its book notes: public/notes/<book>/<num>.json */
  book: string;
  num: number;
}

export const TRIO_ROUNDS = 3;
export const TRIO_SECONDS = 120;

/** a take's points: the share of the opening sung right, in per cent */
export const trioPoints = (a: Pick<RoundAnswer, 'pick'>) => Math.max(0, Math.min(100, Math.round(a.pick)));

const text = (v: unknown, max: number) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;

export const TRIO_RULES: RoundRules<TrioQ> = {
  steps: () => 1,
  seconds: () => TRIO_SECONDS,
  ok: (_, pick) => Number.isInteger(pick) && pick >= 0 && pick <= 100,
  points: (_, a) => trioPoints(a),
  secret: [],
  valid: (q): q is TrioQ => {
    if (!q || typeof q !== 'object') return false;
    const o = q as Partial<TrioQ>;
    return o.kind === 'mesame' && text(o.id, 120) && text(o.title, 160) && text(o.service, 60) && text(o.book, 40)
      && Number.isInteger(o.num) && (o.num as number) > 0;
  },
};

/** a game's chants: a different one each round, those not sung lately on this phone first (as „ხმების ტურნირი“ draws) */
export const drawTrio = (pool: KnownChant[], count: number, seen: readonly string[] = [], rnd: () => number = Math.random): TrioQ[] =>
  drawTurniri(pool, count, seen, rnd).map(q => ({ ...q, kind: 'mesame' as const }));

// ——— the take

/** a note of my voice: start and length in the score's seconds (at its own tempo), midi */
export type TrioNote = [at: number, len: number, midi: number];
/** one look at the microphone: seconds since listening began, the sung pitch (null: no voice) */
export interface TrioFrame { t: number; midi: number | null }

/** how far a sung pitch is from a note, in semitones, octaves aside: −6 … 6 (above 0: sung higher) */
export const pcOff = (sung: number, target: number) => {
  const d = (((sung - target) % 12) + 12) % 12;
  return d > 6 ? d - 12 : d;
};
/** a sung pitch moved by whole octaves next to the note (the mirror draws it there) */
export const foldNear = (sung: number, target: number) => target + pcOff(sung, target);

/** in tune: within three quarters of a semitone */
export const IN_TUNE = 0.75;
export const inTune = (sung: number, target: number) => Math.abs(pcOff(sung, target)) <= IN_TUNE;

/** a note sung for this share of its time in tune counts whole */
const ENOUGH = 0.6;
/** a note's first and last moments are the voice moving between notes: not counted (so the delay found below is the
 *  middle of the ones that fit) — nor is a note shorter than this */
const EDGE = 0.08;
const SHORTEST = 0.12;

/** where a moment of the take lies in the score: `from` is heard `delay` seconds after listening began */
export const placeOf = (from: number, delay: number, speed: number) => (t: number) => from + (t - delay) * speed;

export interface TrioScore {
  /** per note: 0 … 1 */
  credits: number[];
  /** the share of the (counted) notes' time sung right, 0 … 100 */
  pct: number;
  /** the notes counted: those that started before the take stopped */
  counted: number;
}

/**
 * A take's score: every note of my voice from the section, by the frames that fall on it (placed by `place`); a note's
 * credit is the share of its frames in tune over 60 % of them, its first and last moments aside. Notes after `until` (the
 * take stopped early) are left out, as are very short ones. Frames must be in time order.
 */
export const scoreTrio = (notes: readonly TrioNote[], frames: readonly TrioFrame[], place: (t: number) => number, until = Infinity): TrioScore => {
  const t = tally(notes, frames, place, until, ENOUGH);
  return { credits: t.credits, pct: t.weight ? Math.round((100 * t.sum) / t.weight) : 0, counted: t.counted };
};

const tally = (notes: readonly TrioNote[], frames: readonly TrioFrame[], place: (t: number) => number, until: number, enough: number) => {
  const credits: number[] = [];
  let sum = 0;
  let weight = 0;
  let counted = 0;
  let k = 0;
  const at = frames.map(f => place(f.t));
  for (const [s, len, m] of notes) {
    if (s >= until) { credits.push(0); continue; }
    counted++;
    if (len < SHORTEST) { credits.push(0); continue; }
    const edge = Math.min(EDGE, len * 0.2);
    const a = s + edge;
    const b = Math.min(s + len - edge, until);
    while (k < at.length && at[k] < a) k++;
    let all = 0;
    let good = 0;
    for (let j = k; j < at.length && at[j] < b; j++) {
      all++;
      const midi = frames[j].midi;
      if (midi != null && inTune(midi, m)) good++;
    }
    const c = all ? Math.min(1, good / (all * enough)) : 0;
    credits.push(c);
    sum += c * len;
    weight += len;
  }
  return { credits, sum, weight, counted };
};

/**
 * The take's delay, found by the take itself: the sound the singer hears comes later than the phone plays it (more in
 * Bluetooth earphones), and the singer is a little late or early too. Tried from `guess` − 0.1 s to `guess` + 0.5 s by
 * the plain share of each note sung in tune (not capped as the score is, so the fit has one peak); the best wins, the
 * nearest to the guess among equals, then the middle of the equally good ones around it.
 */
export const fitDelay = (
  notes: readonly TrioNote[], frames: readonly TrioFrame[], from: number, speed: number, guess: number, until = Infinity,
): number => {
  const tried = Array.from({ length: 31 }, (_, i) => {
    const d = guess + (i - 5) * 0.02;
    return { d, fit: Math.round(tally(notes, frames, placeOf(from, d, speed), until, 1).sum * 1000) };
  });
  const top = Math.max(...tried.map(x => x.fit));
  if (top <= 0) return guess;
  let at = -1;
  tried.forEach((x, i) => { if (x.fit === top && (at < 0 || Math.abs(x.d - guess) < Math.abs(tried[at].d - guess))) at = i; });
  let lo = at;
  let hi = at;
  while (lo > 0 && tried[lo - 1].fit === top) lo--;
  while (hi < tried.length - 1 && tried[hi + 1].fit === top) hi++;
  return (tried[lo].d + tried[hi].d) / 2;
};

/** a note is sung when it got at least half */
export const hitsOf = (s: TrioScore) => s.credits.map(c => c >= 0.5);

// ——— the section sung

export interface TrioPart { s0: number; s1: number }

/** the opening: the first lines of the book's notes until about 12 seconds (three lines at most) */
export const openingEnd = (parts: readonly TrioPart[], aim = 12): number => {
  if (!parts.length) return 0;
  let end = parts[0].s1;
  for (let i = 1; i < Math.min(3, parts.length) && end < aim; i++) end = parts[i].s1;
  return end;
};

/** the notes of a voice's line that start inside the section, cut at its end */
export const notesIn = (line: readonly TrioNote[], from: number, to: number): TrioNote[] =>
  line.filter(([s]) => s >= from - 1e-6 && s < to - 1e-6).map(([s, len, m]) => [s, Math.min(len, to - s), m] as TrioNote);

/** the share of each part (line of the notes) sung right, 0 … 100; a part with nothing counted (not reached) is null */
export const partShares = (notes: readonly TrioNote[], credits: readonly number[], parts: readonly TrioPart[], until = Infinity): (number | null)[] =>
  parts.map(p => {
    let sum = 0;
    let weight = 0;
    notes.forEach(([s, len], i) => {
      if (s < p.s0 - 1e-6 || s >= p.s1 - 1e-6 || s >= until || len < SHORTEST) return;
      sum += credits[i] * len;
      weight += len;
    });
    return weight ? Math.round((100 * sum) / weight) : null;
  });
