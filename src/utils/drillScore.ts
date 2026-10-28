// The score of one „ოსტატობა“ exercise run, from what the microphone heard (utils/singCapture.ts frames).
// Notes: each look at the voice is compared with the note the step asks for at that moment (any octave, so a girl
// can sing a man's line), with a little slack for coming late to a new note. Rhythm: the claps (sudden loud starts)
// are compared with the beat grid after a one-bar count-in — during a scored round the click sounds only in that
// count-in, so the phone hears the student and not its own speaker. The tips (posture, breathing…) are judged by the
// AI teacher instead (utils/aiTeacher.ts askAiScore). Pure functions, tested in tests/drillScore.test.ts.
import type { ManeraStep } from '../data/maneraLessons';
import type { Drill } from '../data/vocalDrills';
import type { SingFrame } from './singCapture';

export type ScoreKind = 'pitch' | 'rhythm' | 'ai';

export const scoreKindOf = (d: Drill): ScoreKind =>
  d.id.startsWith('tip-') ? 'ai' : d.id.startsWith('rhythm-') ? 'rhythm' : 'pitch';

/** the voice this step's synth leaves to the student (null: all sound, or the step has no voices) */
export const myPart = (s: ManeraStep, chosen: number) => (!s.parts || s.listen ? null : s.voice ?? Math.min(chosen, s.parts.length - 1));

/** the line the student sings in this step: `sing`, else their voice, else the tones (null: nothing to sing) */
export const lineOf = (s: ManeraStep, chosen: number): number[] | null => {
  const mine = myPart(s, chosen);
  const line = s.sing ?? (mine !== null ? s.parts![mine] : s.tones);
  return line?.length ? line : null;
};

/** the note of the step's line at `t` seconds into the round */
export const targetAt = (s: ManeraStep, chosen: number, t: number): number | null => {
  const line = lineOf(s, chosen);
  if (!line) return null;
  if (!s.secs) return line.length === 1 ? line[0] : null;
  return line[Math.min(line.length - 1, Math.max(0, Math.floor(t / (s.secs / line.length))))];
};

/** Does a round of this step count toward the score? Only timed steps the student does (not „listen“ alone). */
export const scoredStep = (s: ManeraStep, kind: ScoreKind, chosen: number) => {
  if (!s.secs) return false;
  if (kind === 'rhythm') return !!s.bpm && !s.listen;
  if (kind === 'pitch') return !!lineOf(s, chosen) && !(s.listen && !s.sing);
  return false;
};

/** beats of click before a scored rhythm round is heard (one bar, at least two beats) */
export const countInBeats = (s: ManeraStep) => Math.max(2, Math.min(6, s.bar ?? 2));

/** the semitone distance of a sung note from the target, folded to the nearest octave (−6…6) */
export const foldedDiff = (midi: number, target: number) => ((((midi - target + 6) % 12) + 12) % 12) - 6;

/** frames of one round, their times made seconds from the round's start */
export const roundFrames = (frames: SingFrame[], fromMs: number, toMs: number) =>
  frames.filter(f => f.t >= fromMs && f.t < toMs).map(f => ({ ...f, t: (f.t - fromMs) / 1000 }));

/**
 * 0…1 for one round of a pitch step. Each voiced look scores 1 within 0.35 semitone of a note the line holds around
 * that moment (the note itself, or its neighbours within a short slack), ½ within 0.7, else 0; the share is cut when
 * the student sang less than half of the round.
 */
export const scorePitchRound = (frames: { t: number; midi: number | null }[], s: ManeraStep, chosen: number, base: number): number => {
  const line = lineOf(s, chosen);
  if (!line || !s.secs) return 0;
  const d = s.secs / line.length;
  const slack = Math.max(0.25, Math.min(0.6, d * 0.5));
  const from = 0.3; // the first moment is the reaction to the cue
  const heard = frames.filter(f => f.t >= from && f.t <= s.secs!);
  const voiced = heard.filter(f => f.midi !== null);
  if (!voiced.length) return 0;
  let credit = 0;
  for (const f of voiced) {
    const near = new Set<number>();
    for (const t of [f.t - slack, f.t, f.t + slack]) {
      const i = Math.min(line.length - 1, Math.max(0, Math.floor(t / d)));
      near.add(base + line[i]);
    }
    const best = Math.min(...[...near].map(n => Math.abs(foldedDiff(f.midi!, n))));
    credit += best <= 0.35 ? 1 : best <= 0.7 ? 0.5 : 0;
  }
  const accuracy = credit / voiced.length;
  const sang = voiced.length / Math.max(1, heard.length);
  return accuracy * Math.min(1, sang / 0.5);
};

/** sudden loud starts (claps, „ტა“): seconds of each, at least 0.12 s apart */
export const onsetsOf = (frames: { t: number; rms: number }[]): number[] => {
  if (!frames.length) return [];
  const sorted = [...frames].map(f => f.rms).sort((a, b) => a - b);
  const floor = sorted[Math.floor(sorted.length * 0.2)] || 0;
  const loud = Math.max(0.015, floor * 4);
  const out: number[] = [];
  let prev = 0;
  for (const f of frames) {
    if (f.rms >= loud && f.rms > prev * 1.6 && (!out.length || f.t - out[out.length - 1] >= 0.12)) out.push(f.t);
    prev = f.rms;
  }
  return out;
};

/**
 * 0…1 for one round of a rhythm step, from its onsets (seconds from the round's start). After the count-in each
 * required point (every beat, the accented ones, the „and“s or every half beat) is matched with the nearest onset:
 * 1 when on time, down to ½ at the edge of the slack (30% of the grid step, at most 0.15 s), 0 when missed. Onsets
 * far from any point of the grid take up to half of it away.
 */
export const scoreRhythmRound = (onsets: number[], s: ManeraStep): number => {
  if (!s.bpm || !s.secs) return 0;
  const beat = 60 / s.bpm;
  const claps = s.claps ?? 'beats';
  const step = claps === 'half' ? beat / 2 : beat;
  const shift = claps === 'off' ? beat / 2 : 0;
  const start = countInBeats(s) * beat;
  const tol = Math.min(0.15, step * 0.3);
  const bar = s.bar ?? 1;
  const accents = s.accents ?? [0];
  const grid: number[] = [];
  const required: number[] = [];
  for (let i = 0; ; i++) {
    const t = i * step + shift;
    if (t > s.secs - 0.1) break;
    if (t < start - tol) continue;
    grid.push(t);
    const beatNo = claps === 'half' ? Math.floor(i / 2) : i;
    if (claps !== 'accents' || accents.includes(beatNo % bar)) required.push(t);
  }
  // the other beats may sound too (knee, fingers, the foot under the „and“s): they are on the grid, not wrong
  const fullGrid = claps === 'accents' || claps === 'off'
    ? [...grid, ...Array.from({ length: Math.ceil(s.secs / beat) }, (_, i) => i * beat).filter(t => t >= start - tol)]
    : grid;
  if (!required.length) return 0;
  const heard = onsets.filter(t => t >= start - tol);
  let credit = 0;
  for (const r of required) {
    const dt = Math.min(Infinity, ...heard.map(t => Math.abs(t - r)));
    if (dt <= tol) credit += 1 - (dt / tol) * 0.5;
  }
  const wrong = heard.filter(t => !fullGrid.some(g => Math.abs(t - g) <= tol)).length;
  const coverage = credit / required.length;
  return Math.max(0, coverage * (1 - 0.5 * (heard.length ? wrong / heard.length : 0)));
};

/** the run's percent: every scored round of the exercise counts, the ones skipped as 0 */
export const runPercent = (rounds: number[], expected: number) =>
  expected ? Math.round((100 * rounds.reduce((a, r) => a + Math.max(0, Math.min(1, r)), 0)) / Math.max(expected, rounds.length)) : 0;

/** {"score": 72, "text": "…"} — or, if the model wrapped it in words, the first such object found */
export const parseScore = (raw: string): { score: number; text: string } | null => {
  const tryParse = (s: string) => { try { return JSON.parse(s) as { score?: unknown; text?: unknown }; } catch { return null; } };
  const j = tryParse(raw) ?? tryParse(raw.match(/\{[\s\S]*\}/)?.[0] ?? '');
  const score = Number(j?.score);
  if (!j || !Number.isFinite(score)) return null;
  return { score: Math.max(0, Math.min(100, Math.round(score))), text: String(j.text ?? '').replace(/\*+/g, '').trim() };
};
