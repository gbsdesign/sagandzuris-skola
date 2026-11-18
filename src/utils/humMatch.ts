// „ძებნა სიმღერით“: a hummed tune against the chants' openings, by the steps between notes (so the key and the octave
// do not matter). Pure — the notes come from the existing pitch code (`notesFromFrames`), the chants from data/humIndex.
import { mergeHeld, notesFromFrames } from './pitch';

/** below this a hit is no hit */
export const MIN_SCORE = 0.4;
/** fewer steps than this say too little to search by */
export const MIN_STEPS = 4;

export type HumLabel = 'ძალიან' | 'ჰგავს' | 'ოდნავ';
export interface HumHit<T> { entry: T; score: number; label: HumLabel }

export const labelOf = (score: number): HumLabel => (score >= 0.75 ? 'ძალიან' : score >= 0.55 ? 'ჰგავს' : 'ოდნავ');

/** The sung notes of a take as whole MIDI numbers, a held or repeated pitch once. */
export const hummedNotes = (frames: { t: number; midi: number | null }[]): number[] => {
  const out: number[] = [];
  mergeHeld(notesFromFrames(frames)).forEach(n => {
    const m = Math.round(n.midi);
    if (out[out.length - 1] !== m) out.push(m);
  });
  return out;
};

/** the steps between neighbouring notes, a step folded into −6…+6 (an octave leap counts as no step) */
export const stepsOf = (notes: number[]): number[] => {
  const out: number[] = [];
  for (let i = 1; i < notes.length; i++) {
    const d = (((notes[i] - notes[i - 1]) % 12) + 12) % 12;
    out.push(d > 6 ? d - 12 : d);
  }
  return out;
};

// The scoring: every sung step must be placed (a step sung that the chant lacks, or a chant step left out, costs),
// against the chant from its first note (its 2nd or 3rd may be where the singer came in — a small cost). Tried on
// random tunes against the whole index: their best is ~0.3 (90 % under ~0.5); a chant's opening sung a semitone off in
// one place keeps ~0.85. Many chants open alike, so the right one is often 2nd or 3rd — hence three answers.
const MATCH = 1;
const NEAR = 0.35; // a step a semitone off
const MISS = -0.9;
const GAP = -0.7;
const SKIP = 0.12; // a chant's first step or two not sung
const MAX_SUNG = 12; // the opening only: more sung steps than the index holds would be gaps

const sub = (a: number, b: number) => {
  const d = Math.abs(a - b);
  return d === 0 ? MATCH : d === 1 ? NEAR : MISS;
};

/** 0…1: the alignment's score per sung step, less for a short take (a few steps match anything by chance) */
export const similarity = (sung: number[], chant: number[]): number => {
  const s = stepsOf(sung).slice(0, MAX_SUNG);
  const t = stepsOf(chant);
  if (s.length < MIN_STEPS || t.length < MIN_STEPS) return 0;
  let prev = Array.from({ length: t.length + 1 }, (_, j) => (j <= 2 ? -SKIP * j : -Infinity));
  for (let i = 1; i <= s.length; i++) {
    const cur = new Array<number>(t.length + 1).fill(-Infinity);
    cur[0] = i * GAP;
    for (let j = 1; j <= t.length; j++) {
      cur[j] = Math.max(prev[j - 1] + sub(s[i - 1], t[j - 1]), prev[j] + GAP, cur[j - 1] + GAP);
    }
    prev = cur;
  }
  const best = Math.max(...prev) / s.length;
  const weight = 0.6 + 0.4 * Math.min(1, (s.length - 3) / 5);
  return Math.max(0, Math.min(1, best)) * weight;
};

/** The best `limit` chants for the sung notes; nothing above `MIN_SCORE` = an empty list („ვერ ვიცანი“). */
export const matchHum = <T extends { m: number[] }>(sung: number[], index: readonly T[], limit = 3): HumHit<T>[] =>
  index
    .map(entry => ({ entry, score: similarity(sung, entry.m) }))
    .filter(h => h.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(h => ({ ...h, label: labelOf(h.score) }));
