// „სასწავლო რეჟიმი“: a chant (or a song's recording) cut into small parts that are learned one by one — hear it in
// a loop, slower, my voice alone or the others without it; sing it back; parts already learned come back for a
// short review 1, 3 and 7 days later. Pure functions, tested in tests/learn.test.ts.
import type { BookScore } from './chantSynth';
import { makeTimeMap } from './chantSynth';
import { POLISH_SHARE } from './pitch';

export interface LearnPart {
  b0: number; b1: number;   // beats (book notes) — a recording's parts use seconds in s0/s1 only
  s0: number; s1: number;   // seconds at the score's tempo
  sys: number[];            // the score's lines (systems) this part shows
}

// a line shorter than this many beats (a lone amen, a tail) goes with its neighbour
const MIN_BEATS = 6;

/** A chant's parts: one per line of the book's notes, a very short line joined to the one after it (the last to
 *  the one before). A score without lines (rare) is cut every 12 beats. */
export const partsOfScore = (score: BookScore): LearnPart[] => {
  const { toSec } = makeTimeMap(score.tempos);
  const make = (b0: number, b1: number, sys: number[]): LearnPart => ({ b0, b1, s0: toSec(b0), s1: toSec(b1), sys });
  if (!score.sys.length) {
    const out: LearnPart[] = [];
    for (let b = 0; b < score.dur; b += 12) out.push(make(b, Math.min(score.dur, b + 12), []));
    return out;
  }
  const lines = score.sys.map((s, i) => ({ b0: s[5], b1: s[6], sys: [i] })).sort((a, b) => a.b0 - b.b0);
  const merged: typeof lines = [];
  for (const l of lines) {
    const prev = merged[merged.length - 1];
    if (prev && prev.b1 - prev.b0 < MIN_BEATS) { prev.b1 = l.b1; prev.sys.push(...l.sys); }
    else merged.push({ ...l, sys: [...l.sys] });
  }
  const last = merged[merged.length - 1];
  if (merged.length > 1 && last.b1 - last.b0 < MIN_BEATS) {
    merged.pop();
    const prev = merged[merged.length - 1];
    prev.b1 = last.b1;
    prev.sys.push(...last.sys);
  }
  return merged.map(l => make(l.b0, l.b1, l.sys));
};

/** A recording cut into parts of about 12 seconds (never shorter than 8). */
export const partsOfRecording = (seconds: number, size = 12): LearnPart[] => {
  if (!(seconds > 0)) return [];
  const n = Math.max(1, Math.round(seconds / size));
  const len = seconds / n;
  return Array.from({ length: n }, (_, i) => ({ b0: 0, b1: 0, s0: i * len, s1: i === n - 1 ? seconds : (i + 1) * len, sys: [] }));
};

/**
 * A recording cut where the singers breathe: `energy` is the loudness every `hop` seconds. Each cut goes to the
 * quietest moment between `min` and `max` seconds after the one before (a little toward `aim`); the rest is the last
 * part, joined to the one before when shorter than `min`. Without a clear pause the cut still falls in that window.
 */
export const partsAtBreaths = (energy: ArrayLike<number>, hop: number, seconds: number, aim = 10, min = 6, max = 16): LearnPart[] => {
  if (!(seconds > 0) || !energy.length) return partsOfRecording(seconds);
  // a slightly smoothed loudness, so one quiet sample inside a note is not a pause
  const n = energy.length;
  const smooth = Array.from({ length: n }, (_, i) => {
    let sum = 0, k = 0;
    for (let j = Math.max(0, i - 2); j <= Math.min(n - 1, i + 2); j++) { sum += energy[j]; k++; }
    return sum / k;
  });
  const loud = [...smooth].sort((a, b) => a - b)[Math.floor(n * 0.9)] || 1;
  const cuts: number[] = [0];
  for (;;) {
    const from = cuts[cuts.length - 1];
    if (seconds - from <= max) break;
    let best = -1, bestScore = Infinity;
    for (let i = Math.ceil((from + min) / hop); i <= Math.min(n - 1, Math.floor((from + max) / hop)); i++) {
      const score = smooth[i] / loud + Math.abs(i * hop - from - aim) / (max - min) * 0.15;
      if (score < bestScore) { bestScore = score; best = i; }
    }
    if (best < 0) break;
    cuts.push(best * hop);
  }
  if (cuts.length > 1 && seconds - cuts[cuts.length - 1] < min) cuts.pop();
  return cuts.map((c, i) => ({ b0: 0, b1: 0, s0: c, s1: i === cuts.length - 1 ? seconds : cuts[i + 1], sys: [] }));
};

/** The lines of a song's words that go with part `i` of `n`, shared out in order (an estimate: the words have no times). */
export const wordsForPart = (lines: string[], i: number, n: number): string[] => {
  if (!lines.length || n <= 0) return [];
  const a = Math.floor((i * lines.length) / n);
  const b = Math.max(a + 1, Math.floor(((i + 1) * lines.length) / n));
  return lines.slice(a, Math.min(b, lines.length));
};

// one voice's notes starting between two beats, one per onset: a voice split in two keeps the upper note for I,
// the lower one for the others
const lineIn = (score: BookScore, voice: number, b0: number, b1: number) => {
  const list = [...(score.voices[voice] || [])]
    .filter(n => n[0] >= b0 - 1e-6 && n[0] < b1 - 1e-6)
    .sort((a, b) => a[0] - b[0] || (voice === 0 ? b[2] - a[2] : a[2] - b[2]));
  return list.filter((n, i) => i === 0 || n[0] !== list[i - 1][0]);
};

/** The melody one voice sings between two beats: its pitches in order, a repeated pitch taken once (as the pearls'
 *  scoring wants it). */
export const melodyIn = (score: BookScore, voice: number, b0: number, b1: number): number[] => {
  const out: number[] = [];
  for (const n of lineIn(score, voice, b0, b1)) if (out[out.length - 1] !== n[2]) out.push(n[2]);
  return out;
};

/** The same voice as a timeline for the singing mirror: [start, length, midi] in seconds from the part's start (at
 *  the score's tempo); a note sounds until the next one starts. */
export const timelineIn = (score: BookScore, voice: number, b0: number, b1: number): [number, number, number][] => {
  const { toSec } = makeTimeMap(score.tempos);
  const line = lineIn(score, voice, b0, b1);
  const s0 = toSec(b0);
  return line.map(([beat, beats, midi], i) => {
    const end = Math.min(toSec(beat + beats), line[i + 1] ? toSec(line[i + 1][0]) : Infinity, toSec(b1));
    return [toSec(beat) - s0, Math.max(0.1, end - toSec(beat)), midi];
  });
};

// where the notes of a line start on the page: after the clef and key, and the last note's end before the barline
const LINE_LEFT = 0.1;
const LINE_RIGHT = 0.03;

/**
 * Where a beat sits across a line of the book's notes, 0–1 of the line's width. The page has no note positions, so it
 * is estimated the way music is engraved: every note start gets its place, a longer note a little more room (the
 * square root of its length), and a beat between two starts is placed between their places.
 */
export const markerAt = (score: BookScore, sys: number, beat: number): number => {
  const [, , , , , t0, t1] = score.sys[sys];
  const starts = [...new Set(score.voices.flatMap(v => v.filter(n => n[0] >= t0 - 1e-6 && n[0] < t1 - 1e-6).map(n => n[0])))].sort((a, b) => a - b);
  if (!starts.length || starts[0] > t0 + 1e-6) starts.unshift(t0);
  starts.push(t1);
  const room = starts.slice(1).map((b, i) => Math.sqrt(Math.max(0.05, b - starts[i])));
  const total = room.reduce((a, b) => a + b, 0);
  let k = 0;
  while (k < room.length - 1 && beat >= starts[k + 1]) k++;
  const before = room.slice(0, k).reduce((a, b) => a + b, 0);
  const within = Math.max(0, Math.min(1, (beat - starts[k]) / (starts[k + 1] - starts[k] || 1)));
  return LINE_LEFT + ((before + within * room[k]) / total) * (1 - LINE_LEFT - LINE_RIGHT);
};

// ---- progress ----------------------------------------------------------------------------------------------------

/** One part's record. level: 0 = being learned, 1–3 = learned and waiting for the review after 1 / 3 / 7 days,
 *  4 = kept (no more reviews). best: the best share sung right (0–100), or -1 when the part has no notes to check. */
export interface PartRecord { best: number; level: number; due?: string; at: string }
export type LearnRecord = Record<string, PartRecord>; // part number (from 0) -> record
export type PartState = 'new' | 'learning' | 'learned' | 'due' | 'kept';

const REVIEW_DAYS = [1, 3, 7];
export const LEARNED_SHARE = POLISH_SHARE * 100;

const addDays = (iso: string, days: number) => {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export const partState = (rec: PartRecord | undefined, today: string): PartState =>
  !rec ? 'new' : rec.level <= 0 ? 'learning' : rec.level >= 4 ? 'kept' : rec.due && rec.due <= today ? 'due' : 'learned';

/**
 * After a try: `ok` = sung right enough (or, for a recording, the member says „ვიცი“). The first success learns the
 * part (review tomorrow); a success on a review day moves it on (3 days, 7 days, kept); a failed review brings it back
 * to tomorrow. A try on a day with no review due changes nothing but the best score.
 */
export const afterTry = (rec: PartRecord | undefined, pct: number, ok: boolean, today: string): PartRecord => {
  const best = Math.max(rec?.best ?? -1, pct);
  const level = rec?.level ?? 0;
  const at = today;
  if (level <= 0) return ok ? { best, level: 1, due: addDays(today, REVIEW_DAYS[0]), at } : { best, level: 0, at };
  if (level >= 4) return { ...rec!, best, at };
  const due = rec!.due && rec!.due <= today;
  if (!due) return { ...rec!, best, at };
  if (!ok) return { best, level: 1, due: addDays(today, REVIEW_DAYS[0]), at };
  const next = level + 1;
  return next >= 4 ? { best, level: 4, at } : { best, level: next, due: addDays(today, REVIEW_DAYS[next - 1]), at };
};

/** The share of a piece learned (parts with level ≥ 1), 0–1. */
export const learnedShare = (rec: LearnRecord | undefined, parts: number) =>
  parts ? Math.min(1, Object.entries(rec || {}).filter(([k, r]) => Number(k) < parts && r.level >= 1).length / parts) : 0;

/** How many parts wait for their review today. */
export const dueCount = (rec: LearnRecord | undefined, parts: number, today: string) =>
  Object.entries(rec || {}).filter(([k, r]) => Number(k) < parts && partState(r, today) === 'due').length;

// ---- takes sent to the teacher -----------------------------------------------------------------------------------
// They share the pearls' store (pearlTakes/{uid}/takes, teacher's „ჩათვლა“ in students.pearlShine) under ids
// „learn~<piece>~<part>“; <piece> is a chant version id or „song-<songId>-t<take>“, <part> a number or „all“.

export const LEARN_PREFIX = 'learn~';
export const learnTakeId = (piece: string, part: number | 'all') => `${LEARN_PREFIX}${piece}~${part}`;
export const parseLearnTakeId = (id: string): { piece: string; part: number | 'all' } | null => {
  if (!id.startsWith(LEARN_PREFIX)) return null;
  const rest = id.slice(LEARN_PREFIX.length);
  const k = rest.lastIndexOf('~');
  if (k <= 0) return null;
  const p = rest.slice(k + 1);
  return { piece: rest.slice(0, k), part: p === 'all' ? 'all' : Number(p) };
};
export const songPiece = (songId: string, take: number) => `song-${songId}-t${take}`;
export const parseSongPiece = (piece: string) => {
  const m = /^song-(.+)-t(\d+)$/.exec(piece);
  return m ? { songId: m[1], take: Number(m[2]) } : null;
};

// ---- reviews across everything a member learns ----------------------------------------------------------------------

/** The pieces with parts waiting for their review today (or overdue), most parts first. */
export const reviewsDue = (learning: Record<string, LearnRecord> | undefined, today: string) =>
  Object.entries(learning || {})
    .map(([piece, rec]) => ({ piece, parts: Object.keys(rec).filter(k => partState(rec[k], today) === 'due').map(Number).sort((a, b) => a - b) }))
    .filter(x => x.parts.length)
    .sort((a, b) => b.parts.length - a.parts.length || a.piece.localeCompare(b.piece));

/** The next day with a review (today if one is due or overdue), and how many parts wait on it. */
export const nextReviewDay = (learning: Record<string, LearnRecord> | undefined, today: string): { day: string; count: number } | null => {
  let day = '';
  let count = 0;
  for (const rec of Object.values(learning || {})) {
    for (const r of Object.values(rec)) {
      if (!r.due || r.level < 1 || r.level >= 4) continue;
      const d = r.due < today ? today : r.due;
      if (!day || d < day) { day = d; count = 1; } else if (d === day) count++;
    }
  }
  return day ? { day, count } : null;
};

// ---- an assigned piece (the teacher's „დავალება“) ------------------------------------------------------------------

/** A part as the teacher's bar shows it: 0 not tried, 1 being learned, 2 learned. */
export type PartMark = 0 | 1 | 2;
export interface PieceProgress { piece: string; total: number; learned: number; marks: PartMark[] }

export const pieceProgress = (piece: string, rec: LearnRecord | undefined, total: number): PieceProgress => {
  const marks = Array.from({ length: total }, (_, i): PartMark => (!rec?.[i] ? 0 : rec[i].level >= 1 ? 2 : 1));
  return { piece, total, learned: marks.filter(m => m === 2).length, marks };
};

/**
 * How far a member is with an assigned chant version (its id) or song (its best-learned recording), from their
 * learning records and the part counts their learning mode noted (students.learnParts). Null until they opened it.
 */
export const assignedProgress = (id: string, learning?: Record<string, LearnRecord>, parts?: Record<string, number>): PieceProgress | null => {
  let best: PieceProgress | null = null;
  for (const [piece, total] of Object.entries(parts || {})) {
    if (!(total > 0) || (piece !== id && parseSongPiece(piece)?.songId !== id)) continue;
    const p = pieceProgress(piece, learning?.[piece], total);
    if (!best || p.learned / p.total > best.learned / best.total) best = p;
  }
  return best;
};

/** Every part learned in the learning mode: the assignment counts as done. */
export const allLearned = (p: PieceProgress | null) => !!p && p.learned >= p.total;
