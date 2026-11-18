// „გაკვეთილის მომზადება“ (the teacher's AI tools, part 2): the pure part. A chant's notes are measured on the phone —
// phrases, leaps, range, which exercises fit — and the AI only adds a few questions about the words (utils/aiTeacher.ts
// `askWordQuestions`). The teacher approves the lesson; it is kept in classes/{id}.aiLessons[variantId].
import { findDrill } from '../data/vocalDrills';

export type PrepLevel = 'easy' | 'mid' | 'hard';
export const LEVEL_WORD: Record<PrepLevel, string> = { easy: 'მარტივი', mid: 'საშუალო', hard: 'რთული' };

/** the book score's notes: [start beat, beats, midi] per voice (I, II, III) */
type Notes = [number, number, number][];

export interface PrepAnalysis {
  phrases: number;
  /** leaps in the voice that has most of them; a leap = more than a fourth (6+ semitones) */
  leaps: number;
  /** the biggest leap, semitones */
  biggest: number;
  low: number;
  high: number;
  /** high − low, semitones */
  range: number;
  /** how many different note lengths there are */
  lengths: number;
  /** the longest phrase, beats */
  longest: number;
}

/** a leap is a step wider than a fourth (a fourth = 5 semitones) */
export const LEAP_FROM = 6;

/** Measures the chosen voices of a score over its phrases ([b0, b1) beats each). */
export const analyse = (voices: Notes[], phrases: { b0: number; b1: number }[]): PrepAnalysis => {
  let leaps = 0, biggest = 0, low = Infinity, high = -Infinity;
  const lens = new Set<number>();
  for (const v of voices) {
    let n = 0;
    for (const p of phrases) {
      const line = v.filter(x => x[0] >= p.b0 - 1e-6 && x[0] < p.b1 - 1e-6).sort((a, b) => a[0] - b[0]);
      line.forEach((x, i) => {
        low = Math.min(low, x[2]); high = Math.max(high, x[2]);
        lens.add(Math.round(x[1] * 8) / 8);
        if (i) {
          const d = Math.abs(x[2] - line[i - 1][2]);
          if (d >= LEAP_FROM) { n++; biggest = Math.max(biggest, d); }
        }
      });
    }
    leaps = Math.max(leaps, n);
  }
  const has = Number.isFinite(low);
  return {
    phrases: phrases.length, leaps, biggest,
    low: has ? low : 0, high: has ? high : 0, range: has ? high - low : 0,
    lengths: lens.size,
    longest: phrases.reduce((m, p) => Math.max(m, p.b1 - p.b0), 0),
  };
};

/** easy: at most one leap and a range of a fifth or less (7 semitones); hard: five leaps or more, or a range over an octave
 *  (12 semitones); everything between is mid. */
export const levelOf = (a: Pick<PrepAnalysis, 'leaps' | 'range'>): PrepLevel =>
  a.leaps >= 5 || a.range > 12 ? 'hard' : a.leaps <= 1 && a.range <= 7 ? 'easy' : 'mid';

const COUNT = ['', 'ერთი', 'ორი', 'სამი', 'ოთხი', 'ხუთი', 'ექვსი', 'შვიდი', 'რვა', 'ცხრა', 'ათი'];
export const leapsText = (n: number) => (n <= 0 ? 'ნახტომების გარეშე' : `${COUNT[n] ?? n} ნახტომი`);

/** the range's name: the interval from the lowest to the highest note */
export const rangeText = (semis: number) => {
  if (semis <= 0) return 'ერთი ნოტი';
  if (semis <= 2) return 'სეკუნდა';
  if (semis <= 4) return 'ტერცია';
  if (semis === 5) return 'კვარტა';
  if (semis <= 7) return 'კვინტა';
  if (semis <= 9) return 'სექსტა';
  if (semis <= 11) return 'სეპტიმა';
  if (semis === 12) return 'ოქტავა';
  return 'ოქტავაზე მეტი';
};

/** The three exercises, by what the chant needs (ids of „ოსტატობა“ drills):
 *   leaps  — none: five notes from the chant; up to a fifth-ish (biggest < 9): the three basic intervals; wider: all intervals, sung;
 *   rhythm — two note lengths or fewer: copy the rhythm; more: rhythm dictation;
 *   breath — a phrase of 24 beats or more: breath across a chain; shorter: the long „სსს“. */
export const drillsFor = (a: Pick<PrepAnalysis, 'leaps' | 'biggest' | 'lengths' | 'longest'>): string[] => [
  a.leaps === 0 ? 'm-echo5' : a.biggest < 9 ? 'm-iv-basic-sing' : 'm-iv-all-sing',
  a.lengths <= 2 ? 'm-rhythm-copy' : 'm-rhythm-dict',
  a.longest >= 24 ? 'm-chain-breath' : 'm-breath',
];

/** what the three exercises are about, for the row's grey line */
export const DRILL_ABOUT = 'ნახტომი, რიტმი, სუნთქვა';
export const drillTitle = (id: string) => findDrill(id)?.title ?? id;

export interface PrepQuestion { q: string; a: string }
export const MIN_QUESTIONS = 3;
export const MAX_QUESTIONS = 5;

/** The AI's answer (JSON, a list or {questions: [...]}) as clean questions; null when fewer than three are usable. */
export const parseQuestions = (raw: string): PrepQuestion[] | null => {
  let data: unknown;
  try { data = JSON.parse(raw.replace(/^```(?:json)?|```$/g, '').trim()); } catch { return null; }
  const list = Array.isArray(data) ? data : (data as { questions?: unknown } | null)?.questions;
  if (!Array.isArray(list)) return null;
  const out: PrepQuestion[] = [];
  for (const it of list) {
    const q = typeof it?.q === 'string' ? it.q.replace(/\*+/g, '').trim() : '';
    const a = typeof it?.a === 'string' ? it.a.replace(/\*+/g, '').trim() : '';
    if (q && a && q.length <= 200 && a.length <= 300) out.push({ q, a });
  }
  return out.length >= MIN_QUESTIONS ? out.slice(0, MAX_QUESTIONS) : null;
};

/** The words the AI may ask about: the chant's own text, trimmed. Empty text = no questions. */
export const wordsText = (lyrics: string | undefined | null) => (lyrics ?? '').trim().slice(0, 2500);

/** What is kept in classes/{id}.aiLessons[variantId]. */
export interface PrepRecord {
  at: string; by: string; approved: boolean;
  phrases: number; level: PrepLevel; leaps: string; range: string;
  drills: string[]; questions: PrepQuestion[];
}

/** A stored record read safely (anything else = none). */
export const readRecord = (d: unknown): PrepRecord | null => {
  const r = d as Partial<PrepRecord> | null | undefined;
  if (!r || typeof r !== 'object') return null;
  const level: PrepLevel = r.level === 'easy' || r.level === 'hard' ? r.level : 'mid';
  return {
    at: String(r.at ?? ''), by: String(r.by ?? ''), approved: r.approved === true,
    phrases: Number(r.phrases) || 0, level, leaps: String(r.leaps ?? ''), range: String(r.range ?? ''),
    drills: Array.isArray(r.drills) ? r.drills.filter((x): x is string => typeof x === 'string') : [],
    questions: Array.isArray(r.questions)
      ? r.questions.filter((x): x is PrepQuestion => typeof x?.q === 'string' && typeof x?.a === 'string') : [],
  };
};

/** up to `n` questions for a student's summary: the same ones the whole day (by the day's number), so a reload shows them again */
export const quizFor = (questions: PrepQuestion[], day: string, n = 2): PrepQuestion[] => {
  if (!questions.length) return [];
  const seed = Array.from(day).reduce((s, c) => s + c.charCodeAt(0), 0);
  const start = seed % questions.length;
  return Array.from({ length: Math.min(n, questions.length) }, (_, i) => questions[(start + i) % questions.length]);
};
