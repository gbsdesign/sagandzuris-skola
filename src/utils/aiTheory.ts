// „პატარა თეორია“ (board x-ai-teoria) — the pure part: which rules a phrase of my voice shows, where, and the words. Only
// what the book notes hold is read (each note's start, length and pitch): a long held note, a leap of a fifth or more, a
// rest, a run of syllables on one note, the bass's drone, a half-tone step. The texts are data/aiTheory.ts; the school's
// rewording (settings/aiTheory) is laid over them. Tested in tests/aiTheory.test.ts.

import { AI_THEORY, type TheoryEntry, type TheoryId } from '../data/aiTheory';
import { ordinal, ordinalAt } from './aiLesson';

export type { TheoryId } from '../data/aiTheory';

/** one note of my voice: [start s, length s, MIDI], the start counted from the phrase's start (as learn.ts timelineIn) */
export type LineNote = [number, number, number];

export interface TheoryHit {
  id: TheoryId;
  /** the note it is on (counted as the lesson counts notes: a repeated pitch is one), from 0 */
  at: number;
  /** where its place is said: on a note, between `at` and the next, after `at` */
  place: 'on' | 'between' | 'after';
  /** the stretch „მაგალითი“ plays, seconds from the phrase's start */
  s0: number;
  s1: number;
  /** whose notes the example sounds: mine alone, or all (the drone under the others) */
  who: 'mine' | 'all';
}

/** a long note: this many times the phrase's usual note, and at least this long */
export const LONG_TIMES = 2.5;
export const LONG_MIN_S = 1.2;
/** a leap worth naming: a fifth or more */
export const LEAP_MIN = 7;
/** a rest: this much silence between two notes of my voice */
export const REST_MIN_S = 0.4;
/** a run of syllables on one note */
export const RECITE_MIN = 4;
/** the drone: one note of the bass holding this share of the phrase */
export const DRONE_SHARE = 0.6;

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0;
};

/**
 * What the phrase shows, in the order the texts list them (data/aiTheory.ts), at most one hit a kind.
 * `lowest` = my voice is the bass of several (the drone is the bass's).
 */
export const findTheory = (line: readonly LineNote[], o: { lowest?: boolean } = {}): TheoryHit[] => {
  if (!line.length) return [];
  // a repeated pitch is one note, as the lesson counts and draws them
  const at: number[] = [];
  const runs: { from: number; to: number; midi: number; s0: number; s1: number }[] = [];
  line.forEach(([t0, len, midi], k) => {
    const last = runs[runs.length - 1];
    if (last && last.midi === midi) { last.to = k; last.s1 = t0 + len; } else runs.push({ from: k, to: k, midi, s0: t0, s1: t0 + len });
    at.push(runs.length - 1);
  });
  const end = Math.max(...line.map(([t0, len]) => t0 + len));
  const hits: Partial<Record<TheoryId, TheoryHit>> = {};
  const usual = median(line.map(n => n[1]));

  // the longest note, when it is far longer than the usual one (the last of equals: a phrase's held end)
  let longK = -1;
  line.forEach(([, len], k) => { if (len >= LONG_MIN_S && len >= usual * LONG_TIMES && (longK < 0 || len >= line[longK][1])) longK = k; });
  if (longK >= 0) {
    const [t0, len] = line[longK];
    const prev = runs[at[longK] - 1];
    hits.long = { id: 'long', at: at[longK], place: 'on', s0: prev ? prev.s0 : t0, s1: t0 + len, who: 'mine' };
  }

  // the widest leap of a fifth or more between two notes
  let leapI = -1;
  for (let i = 1; i < runs.length; i++) {
    const d = Math.abs(runs[i].midi - runs[i - 1].midi);
    if (d >= LEAP_MIN && (leapI < 0 || d > Math.abs(runs[leapI].midi - runs[leapI - 1].midi))) leapI = i;
  }
  if (leapI > 0) hits.leap = { id: 'leap', at: leapI - 1, place: 'between', s0: runs[leapI - 1].s0, s1: runs[leapI].s1, who: 'mine' };

  // the first rest inside the phrase
  for (let k = 0; k + 1 < line.length; k++) {
    const gap = line[k + 1][0] - (line[k][0] + line[k][1]);
    if (gap >= REST_MIN_S) {
      hits.rest = { id: 'rest', at: at[k], place: 'after', s0: line[k][0], s1: line[k + 1][0] + line[k + 1][1], who: 'mine' };
      break;
    }
  }

  // the longest run of syllables on one note
  let recite = -1;
  runs.forEach((r, i) => { if (r.to - r.from + 1 >= RECITE_MIN && (recite < 0 || r.to - r.from > runs[recite].to - runs[recite].from)) recite = i; });
  if (recite >= 0) hits.recite = { id: 'recite', at: recite, place: 'on', s0: runs[recite].s0, s1: runs[recite].s1, who: 'mine' };

  // the bass holding one note through most of the phrase
  if (o.lowest && end > 0) {
    let d = -1;
    runs.forEach((r, i) => { if ((r.s1 - r.s0) / end >= DRONE_SHARE && (d < 0 || r.s1 - r.s0 > runs[d].s1 - runs[d].s0)) d = i; });
    if (d >= 0) hits.drone = { id: 'drone', at: d, place: 'on', s0: 0, s1: end, who: 'all' };
  }

  // the first half-tone step
  for (let i = 1; i < runs.length; i++) {
    if (Math.abs(runs[i].midi - runs[i - 1].midi) === 1) {
      hits.half = { id: 'half', at: i - 1, place: 'between', s0: runs[i - 1].s0, s1: runs[i].s1, who: 'mine' };
      break;
    }
  }
  return AI_THEORY.map(t => hits[t.id]).filter((h): h is TheoryHit => !!h);
};

/** the first rule the member has not met yet (one a phrase), or null */
export const pickTheory = (hits: readonly TheoryHit[], seen: readonly string[]): TheoryHit | null =>
  hits.find(h => !seen.includes(h.id)) ?? null;

/** „მესამე ნოტზეა“, „ბოლო ნოტზეა“, „მეორე და მესამე ნოტს შორისაა“, „მეორე ნოტის შემდეგაა“ — `count` = the phrase's notes */
export const placeWords = (h: Pick<TheoryHit, 'at' | 'place'>, count: number): string => {
  const last = (k: number) => k === count - 1 && count > 1;
  const dat = (k: number) => (last(k) ? 'ბოლო' : ordinalAt(k + 1));
  if (h.place === 'between') return `${dat(h.at)} და ${last(h.at + 1) ? 'ბოლო' : ordinal(h.at + 2)} ნოტს შორისაა`;
  if (h.place === 'after') return `${last(h.at) ? 'ბოლო' : ordinal(h.at + 1)} ნოტის შემდეგაა`;
  return `${dat(h.at)} ნოტზეა`;
};

/** the where-sentence of a rule in this phrase */
export const whereLine = (entry: Pick<TheoryEntry, 'where'>, h: TheoryHit, count: number) =>
  entry.where.replace(/\{(on|between|after)\}/g, () => placeWords(h, count));

/** the school's rewording of a term and its meaning (settings/aiTheory.texts) */
export interface TheoryText { term: string; meaning: string }
export const TERM_MAX = 40;
export const MEANING_MAX = 300;

/** the stored rewording, only what is a usable text */
export const theoryOverrides = (raw: unknown): Partial<Record<TheoryId, TheoryText>> => {
  const out: Partial<Record<TheoryId, TheoryText>> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const t of AI_THEORY) {
    const v = (raw as Record<string, unknown>)[t.id] as Partial<TheoryText> | undefined;
    if (!v || typeof v !== 'object') continue;
    const term = typeof v.term === 'string' ? v.term.trim().slice(0, TERM_MAX) : '';
    const meaning = typeof v.meaning === 'string' ? v.meaning.trim().slice(0, MEANING_MAX) : '';
    if (term || meaning) out[t.id] = { term: term || t.term, meaning: meaning || t.meaning };
  }
  return out;
};

/** the texts as the lesson shows them: the school's wording where it has one */
export const theoryEntry = (id: TheoryId, over: Partial<Record<TheoryId, TheoryText>> = {}): TheoryEntry => {
  const base = AI_THEORY.find(t => t.id === id)!;
  const o = over[id];
  return o ? { ...base, term: o.term, meaning: o.meaning } : base;
};
