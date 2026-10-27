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

/** The melody one voice sings between two beats: its pitches in order, a repeated pitch taken once (as the pearls'
 *  scoring wants it). A voice split in two keeps the upper note for I, the lower one for the others. */
export const melodyIn = (score: BookScore, voice: number, b0: number, b1: number): number[] => {
  const list = [...(score.voices[voice] || [])]
    .filter(n => n[0] >= b0 - 1e-6 && n[0] < b1 - 1e-6)
    .sort((a, b) => a[0] - b[0] || (voice === 0 ? b[2] - a[2] : a[2] - b[2]));
  const out: number[] = [];
  list.forEach((n, i) => {
    if (i > 0 && n[0] === list[i - 1][0]) return;
    if (out[out.length - 1] !== n[2]) out.push(n[2]);
  });
  return out;
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
