import type { BookScore } from './chantSynth';
import { phraseOf } from './pearls';

// The pieces of „ხმა-ხმად“ and „სამ ნოტში!“ (utils/chantRounds.ts): a chant's opening with only its lower voices, from
// their first note (the top voice often begins alone), or the top voice of its first phrase (utils/pearls.ts phraseOf —
// long notes and recitations shortened for the ear), cut after so many different notes in a row. Tested in
// tests/chantRounds.test.ts.

export type Timed = [at: number, len: number, midi: number];

/**
 * The first notes of the top voice: up to `pitches` different ones (a note sung again on one pitch counts once) that
 * begin within `within` seconds (a recited opening reaches its third pitch late); 0, 0: the whole phrase.
 */
export const firstPitches = (score: BookScore, pitches: number, within = 0): Timed[] => cutPitches(phraseOf(score, 0).notes, pitches, within);

export const cutPitches = (notes: Timed[], pitches: number, within = 0): Timed[] => {
  const out: Timed[] = [];
  let distinct = 0;
  let last: number | null = null;
  for (const n of notes) {
    if (n[2] !== last) { distinct += 1; last = n[2]; }
    if (pitches && distinct > pitches) break;
    if (within && out.length && n[0] >= within) break;
    out.push(n);
  }
  return out;
};

/**
 * The voices that sound from `from` down (never past the lowest one the chant has: a chant of two voices keeps its lower
 * one), and the beat where the first of them begins.
 */
export const lowerVoices = (score: Pick<BookScore, 'voices'>, from: number) => {
  const first = Math.max(0, Math.min(score.voices.length - 1, from));
  let beat = Infinity;
  score.voices.slice(first).forEach(v => v.forEach(([t]) => { if (t < beat) beat = t; }));
  return { first, beat: Number.isFinite(beat) ? beat : 0 };
};

/** when the last note ends, in seconds */
export const notesLength = (notes: Timed[]) => notes.reduce((m, [at, len]) => Math.max(m, at + len), 0);
