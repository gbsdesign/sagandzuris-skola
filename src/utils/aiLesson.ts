// The AI teacher's day lesson (2026-11-18, step 1 of the AI teacher's plan) — the pure part: what a lesson holds, how a
// sung take is read note by note, and the teacher's ready sentences. Nothing here asks the AI: the notes are counted by
// the measure (utils/pitch.ts) and the words come from these rules, so a correction never waits for the internet and a
// member under 18 (the kids' mode) gets the same lesson. Tested in tests/aiLesson.test.ts.
//
// The words follow the plan's „მასწავლებლის სიტყვები“: „შენ“, one idea at a time, praise only what the numbers show;
// never „ცუდია“, „არასწორია“, „ისევ შეცდი“.

import { mergeHeld, type Scoring, type SungNote } from './pitch';
import { partState, type LearnRecord } from './learn';

// ---- the lesson's five parts ---------------------------------------------------------------------------------------

export type LessonPartId = 'warm' | 'review' | 'new' | 'sing' | 'sum';
export const LESSON_PARTS: { id: LessonPartId; name: string }[] = [
  { id: 'warm', name: 'გახურება' },
  { id: 'review', name: 'გამეორება' },
  { id: 'new', name: 'ახალი ფრაზა' },
  { id: 'sing', name: 'გალობა' },
  { id: 'sum', name: 'შეჯამება' },
];
export type LessonLength = 5 | 10;

/** Each part's minutes: the ten-minute lesson 1 · 2 · 5 · 1 · ½, the five-minute one about half. */
export const PART_MINUTES: Record<LessonLength, Record<LessonPartId, number>> = {
  10: { warm: 1, review: 2, new: 5, sing: 1, sum: 0.5 },
  5: { warm: 0.5, review: 1, new: 2.5, sing: 0.5, sum: 0.5 },
};

/** „1 წუთი“, „2 წუთი“, „ნახევარი წუთი“ */
export const minutesWord = (m: number) => (m < 1 ? 'ნახევარი წუთი' : `${Math.round(m)} წუთი`);

/** The minutes still left, as the lesson's top shows them: „დარჩა 9 წთ“ (never below one while something is left). */
export const leftWord = (leftMs: number) => `დარჩა ${Math.max(1, Math.ceil(leftMs / 60000))} წთ`;

// ---- warm-up ---------------------------------------------------------------------------------------------------------

/** Three notes from the voice's base (low = a man's voice, high = a woman's or a child's): do, re, mi. */
export const warmNotes = (base: number): number[] => [base, base + 2, base + 4];
/** A warm-up note counts once it was held this long, within this many semitones (in any octave). */
export const WARM_HOLD_MS = 2500;
export const WARM_BAND = 0.6;

/** Semitones from a sung pitch to the nearest octave of the goal (−6…+6). */
export const offPitch = (sung: number, goal: number) => {
  const d = (((sung - goal) % 12) + 12) % 12;
  return d > 6 ? d - 12 : d;
};

/** While singing, one word: on the note, a little higher, a little lower (the direction to go). */
export const liveWord = (sung: number | null, goal: number | null, band = 0.35): 'ზუსტად' | 'ოდნავ მაღლა' | 'ოდნავ დაბლა' | '' => {
  if (sung == null || goal == null) return '';
  const d = offPitch(sung, goal);
  return Math.abs(d) <= band ? 'ზუსტად' : d < 0 ? 'ოდნავ მაღლა' : 'ოდნავ დაბლა';
};

// ---- a take, note by note ------------------------------------------------------------------------------------------

export interface NoteRead {
  hit: boolean;
  /** how far off the closest sung note was, in semitones (+ = high), when one was near enough to tell; null = not heard */
  dev: number | null;
}
export interface TakeRead {
  n: number;
  hits: number;
  heard: boolean;
  notes: NoteRead[];
  /** the note most worth one sentence (index), or -1 */
  worst: number;
  /** a leap of a major third or more whose landing note was missed (index of the landing note), or -1 */
  jump: number;
  /** the phrase's end sagged: its last notes sung flat while the start was in tune */
  sag: boolean;
  /** the last note let go early */
  shortEnd: boolean;
}

/**
 * Reads a scored take note by note. `target`: the phrase's pitches (a repeated pitch once, as melodyIn gives them);
 * `lengths`: each target note's length in seconds (its share of the phrase); `sung`: the notes heard; `scoring`: what
 * scoreSinging found (the key shift and the sung note matched to each target note).
 */
export const readTake = (target: number[], lengths: number[], sung: SungNote[], scoring: Scoring): TakeRead => {
  const n = target.length;
  const { matched, offset } = scoring;
  // as many notes sung as written (the usual clean take): each sung note belongs to the note at its place
  const merged = mergeHeld(sung);
  const paired = merged.length === n;
  const notes: NoteRead[] = target.map((t, i) => {
    const m = matched[i];
    if (m) return { hit: true, dev: m.midi - offset - t };
    if (paired) return { hit: false, dev: offPitch(merged[i].midi - offset, t) };
    // missed: the sung note between its neighbours' matches that is closest to it tells how far off it was
    const from = i > 0 ? matched.slice(0, i).reverse().find(Boolean)?.end ?? -Infinity : -Infinity;
    const to = matched.slice(i + 1).find(Boolean)?.start ?? Infinity;
    let dev: number | null = null;
    for (const s of sung) {
      if (s.start < from - 20 || s.end > to + 20) continue;
      const d = offPitch(s.midi - offset, t);
      if (dev == null || Math.abs(d) < Math.abs(dev)) dev = d;
    }
    return { hit: false, dev };
  });
  const hits = notes.filter(x => x.hit).length;
  // the landing note of a leap (four semitones or more) missed
  let jump = -1;
  for (let i = 1; i < n; i++) if (!notes[i].hit && Math.abs(target[i] - target[i - 1]) >= 4) { jump = i; break; }
  // the end sagged: the last three heard notes all flat by a quarter tone or more, the first half fine
  const devAt = (i: number) => (paired ? offPitch(merged[i].midi - offset, target[i]) : notes[i].dev);
  const heardDevs = notes.map((_, i) => [i, devAt(i)] as const).filter(([, d]) => d != null) as [number, number][];
  const tail = heardDevs.slice(-3);
  const head = heardDevs.filter(([i]) => i < n / 2);
  const sag = n >= 6 && tail.length === 3 && tail.every(([i, d]) => i >= n / 2 && d <= -0.25)
    && head.length >= 2 && head.every(([, d]) => Math.abs(d) < 0.3);
  // the last note let go early: held under 40% of its share of the take
  let shortEnd = false;
  const last = matched[n - 1];
  const first = matched.find(Boolean);
  const total = lengths.reduce((a, b) => a + b, 0);
  if (last && first && first !== last && total > 0) {
    const sungSpan = last.end - first.start;
    const share = (last.end - last.start) / Math.max(1, sungSpan);
    const want = (lengths[n - 1] ?? 0) / total;
    shortEnd = want >= 0.12 && share < want * 0.4;
  }
  // the one note to name: a missed note heard off-pitch first (the biggest miss), else the worst heard hit
  let worst = -1, size = 0;
  notes.forEach((x, i) => {
    if (x.dev == null) return;
    const s = Math.abs(x.dev) + (x.hit ? 0 : 1);
    if (s > size && (Math.abs(x.dev) >= 0.3 || !x.hit)) { size = s; worst = i; }
  });
  if (worst < 0) worst = notes.findIndex(x => !x.hit);
  return { n, hits, heard: sung.length > 0, notes, worst, jump, sag, shortEnd };
};

// ---- the teacher's ready sentences ---------------------------------------------------------------------------------

const ORD = ['პირველი', 'მეორე', 'მესამე', 'მეოთხე', 'მეხუთე', 'მეექვსე', 'მეშვიდე', 'მერვე', 'მეცხრე', 'მეათე',
  'მეთერთმეტე', 'მეთორმეტე', 'მეცამეტე', 'მეთოთხმეტე', 'მეთხუთმეტე'];
/** „პირველი“, „მეექვსე“, then „მე-16“ */
export const ordinal = (k: number) => ORD[k - 1] ?? `მე-${k}`;

/** The first sentence: how many of the notes were right, in words (no percent). */
export const verdictLine = (hits: number, n: number): string => {
  if (n <= 0) return '';
  const share = hits / n;
  if (hits === n) return 'ზუსტად!';
  if (share >= 0.75) return 'თითქმის ზუსტად!';
  if (share >= 0.5) return 'ნახევარი გამოვიდა.';
  return 'ჯერ მოუსმინე და ისევ სცადე.';
};
/** „8 ნოტიდან 6 ზუსტად“ — the count shown under the sentence */
export const countLine = (hits: number, n: number) => `${n} ნოტიდან ${hits} ზუსტად`;

export type FixKind = 'none' | 'quiet' | 'jump' | 'sag' | 'end' | 'high' | 'low' | 'missing';
/** The second sentence: one correction, never two. `focus` = the note to hear alone (index), or -1. */
export const fixLine = (r: TakeRead): { kind: FixKind; text: string; focus: number } => {
  if (!r.heard) return { kind: 'quiet', text: 'ხმა ვერ გავიგონე. ტელეფონი ახლოს მოიტანე.', focus: -1 };
  if (r.hits === r.n) return { kind: 'none', text: '', focus: -1 };
  if (r.jump >= 0) return { kind: 'jump', text: 'ნახტომზე ვერ ახვედი. ჯერ მხოლოდ ნახტომი ვცადოთ.', focus: r.jump };
  if (r.sag) return { kind: 'sag', text: 'ფრაზის ბოლოს ხმა დაგიდაბლდა. შუაში ჩაისუნთქე.', focus: -1 };
  const w = r.worst;
  if (w >= 0 && r.notes[w].dev != null && Math.abs(r.notes[w].dev!) >= 0.3) {
    const high = r.notes[w].dev! > 0;
    return { kind: high ? 'high' : 'low', text: `${ordinal(w + 1)} ნოტი ცოტა ${high ? 'მაღლა' : 'დაბლა'} იყო.`, focus: w };
  }
  if (r.shortEnd) return { kind: 'end', text: 'ბოლო ნოტი ადრე გაუშვი — ბოლომდე გააჩერე.', focus: r.n - 1 };
  if (w >= 0) return { kind: 'missing', text: `${ordinal(w + 1)} ნოტი არ გაისმა.`, focus: w };
  return { kind: 'none', text: '', focus: -1 };
};

export type NextMove = 'note' | 'slow' | 'tempo' | 'again' | 'split' | 'later' | 'done';
export interface TryContext {
  /** the shares (0–1) of this piece's earlier tries in this lesson, oldest first */
  before: number[];
  /** sung at the slower pace now */
  slow: boolean;
  /** good tries in a row at the slower pace before this one */
  slowGood: number;
  /** the piece was already cut in two once in this lesson */
  split: boolean;
  /** the share that passes (0.7 for a small piece, 0.8 for the whole phrase) */
  pass: number;
}

/**
 * The third sentence and the move it asks for. Three tries that did not pass change the way (a smaller piece, then
 * another day) instead of „once more“; the pace rises by itself after two good slow tries.
 */
export const nextLine = (share: number, fix: { kind: FixKind; focus: number }, ctx: TryContext): { move: NextMove; text: string } => {
  const fails = [...ctx.before, share].slice(-3).filter(s => s < ctx.pass).length;
  if (share >= ctx.pass) {
    // slow: after two good tries in a row the real pace comes by itself (a good try always moves on)
    if (ctx.slow && ctx.slowGood >= 1) return { move: 'tempo', text: 'ახლა ნამდვილი ტემპით.' };
    return { move: 'done', text: '' };
  }
  if (fix.kind === 'quiet') return { move: 'again', text: '' };
  // stuck: three tries in a row under the mark, and this one no better than the two before
  const stuck = fails >= 3 && share <= Math.max(...ctx.before.slice(-2)) + 0.05;
  if (ctx.before.length >= 2 && stuck) {
    return ctx.split
      ? { move: 'later', text: 'დღეს სხვა ფრაზა ვცადოთ. ამას ხვალ დავუბრუნდებით.' }
      : { move: 'split', text: 'ეს ადგილი ძნელია. დავყოთ ორ ნაწილად.' };
  }
  if (fix.focus >= 0 && fix.kind !== 'end') return { move: 'note', text: 'მოუსმინე მხოლოდ იმ ნოტს და კიდევ სცადე.' };
  if (!ctx.slow) return { move: 'slow', text: 'კიდევ ერთხელ, ნელა.' };
  return { move: 'again', text: 'კიდევ სცადე.' };
};

const COUNT = ['ერთი', 'ორი', 'სამი', 'ოთხი', 'ხუთი', 'ექვსი', 'შვიდი', 'რვა', 'ცხრა', 'ათი'];
const countWord = (k: number) => COUNT[k - 1] ?? String(k);

/** Praise only what is true: a rise over this lesson's tries. */
export const cheerLine = (share: number, before: number[], pass: number): string => {
  if (share >= pass && before.length && before[before.length - 1] >= pass) return 'ეს ფრაზა უკვე იცი. გადავიდეთ შემდეგზე.';
  if (before.length >= 2 && before[0] < 0.5 && share >= 0.5) {
    return `${countWord(before.length + 1)} ცდა — და უკვე ${share >= pass ? 'გამოდის' : 'ნახევარი გამოდის'}.`;
  }
  return '';
};

/**
 * What the teacher says after a try: up to three short sentences — the result, one correction, what to do — and the
 * move. `focus`: the note to hear alone.
 */
export const afterTake = (r: TakeRead, ctx: TryContext) => {
  const share = r.n ? r.hits / r.n : 0;
  const fix = fixLine(r);
  const next = nextLine(share, fix, ctx);
  const cheer = cheerLine(share, ctx.before, ctx.pass);
  // passed with a slip: the slip is still named once (one correction after every try), then the way on
  // three tries that did not pass: only the new way (its own two sentences); a take under half: its first sentence
  // already says what to do, so no third
  const lines = !r.heard
    ? [fix.text]
    : next.move === 'split' || next.move === 'later'
      ? [next.text]
      : share >= ctx.pass
        ? [verdictLine(r.hits, r.n), fix.text, next.text || (fix.text ? '' : cheer)]
        : [cheer || verdictLine(r.hits, r.n), fix.text, share < 0.5 ? '' : next.text];
  // never more than three, and never the same sentence twice
  const say = [...new Set(lines.filter(Boolean))].slice(0, 3).join(' ');
  return { say, share, move: next.move, focus: fix.focus, kind: fix.kind };
};

// ---- the lesson's start and end --------------------------------------------------------------------------------------

/** The opening sentence: what today holds. */
export const openingLine = (o: { review: boolean; fresh: boolean; back: boolean }) => {
  if (o.back) return 'კარგია, რომ დაბრუნდი. გეგმა გადავაწყვე. დავიწყოთ გამეორებით.';
  if (o.fresh && o.review) return 'დღეს ახალი ფრაზაა და ცოტა გამეორება. დავიწყოთ.';
  if (o.fresh) return 'დღეს ახალი ფრაზაა. დავიწყოთ გახურებით.';
  if (o.review) return 'დღეს გავიმეორებთ ნასწავლს. დავიწყოთ გახურებით.';
  return 'დღეს ხმას ვავარჯიშებთ. დავიწყოთ გახურებით.';
};

/** The closing sentence: one true thing about today and what comes tomorrow. */
export const closingLine = (o: { learned: number; improved: boolean; nextPhrase: number | null }) => {
  const first = o.learned > 0 ? (o.learned === 1 ? 'დღეს ახალი ფრაზა ისწავლე.' : `დღეს ${o.learned} ფრაზა ისწავლე.`)
    : o.improved ? 'დღეს უკეთ გამოგივიდა, ვიდრე დასაწყისში.' : 'დღეს ივარჯიშე — ეს მთავარია.';
  const then = o.nextPhrase != null ? ` ხვალ — ${ordinal(o.nextPhrase)} ფრაზა.` : ' ხვალ — მოკლე გამეორება.';
  return first + then;
};

/** A day with no lesson for this long before: the plan was re-made and the lesson starts with a review. */
export const MISSED_DAYS = 3;
export const dayGap = (lastDay: string | undefined, today: string) => {
  if (!lastDay) return 0;
  const ms = Date.parse(today + 'T12:00:00Z') - Date.parse(lastDay + 'T12:00:00Z');
  return Math.max(0, Math.round(ms / 86400000));
};

// ---- what today's lesson holds ---------------------------------------------------------------------------------------

/** The first phrase of a piece still to learn (none learned yet or failed), or -1 when every known phrase is learned.
 *  `parts` = how many phrases the piece has (0 = not known yet: the first one with no record). */
export const firstOpenPart = (rec: LearnRecord | undefined, parts: number): number => {
  const r = rec || {};
  const n = parts > 0 ? parts : Object.keys(r).length + 1;
  for (let i = 0; i < n; i++) if (!r[i] || r[i].level <= 0) return i;
  return -1;
};

export interface Candidate { piece: string; voice?: string; from: 'focus' | 'work' | 'learning' | 'program' | 'start' }

/**
 * The pieces a new phrase may come from, in order: the teacher's assignments, a piece already being learned (the one
 * worked on last first), the class program, then the starter chants. A piece with every phrase learned is left out.
 */
export const freshCandidates = (o: {
  work: { piece: string; voice?: string }[];
  learning: Record<string, LearnRecord>;
  parts: Record<string, number>;
  program: string[];
  starter: string[];
  isChant: (piece: string) => boolean;
  /** „კვირის წირვა“: the chants the member is preparing for the coming Sunday — they come first (utils/sundayReady.ts) */
  focus?: string[];
}): Candidate[] => {
  const out: Candidate[] = [];
  const seen = new Set<string>();
  const add = (piece: string, from: Candidate['from'], voice?: string) => {
    if (seen.has(piece) || !o.isChant(piece)) return;
    seen.add(piece);
    if (firstOpenPart(o.learning[piece], o.parts[piece] || 0) < 0) return;
    out.push({ piece, from, voice });
  };
  (o.focus ?? []).forEach(p => add(p, 'focus'));
  o.work.forEach(w => add(w.piece, 'work', w.voice));
  Object.entries(o.learning)
    .filter(([piece, rec]) => o.isChant(piece) && Object.keys(rec).length > 0)
    .map(([piece, rec]) => ({ piece, at: Object.values(rec).reduce((m, r) => (r.at > m ? r.at : m), '') }))
    .sort((a, b) => b.at.localeCompare(a.at) || a.piece.localeCompare(b.piece))
    .forEach(x => add(x.piece, 'learning'));
  o.program.forEach(p => add(p, 'program'));
  o.starter.forEach(p => add(p, 'start'));
  return out;
};

export interface ReviewPick { piece: string; part: number; at: string }

/** The phrases to review today: due or overdue ones of the chants, the longest waiting first, at most `max`. */
export const pickReviews = (learning: Record<string, LearnRecord>, today: string, max: number, isChant: (piece: string) => boolean, focus: readonly string[] = []): ReviewPick[] =>
  Object.entries(learning)
    .filter(([piece]) => isChant(piece))
    .flatMap(([piece, rec]) => Object.entries(rec)
      .filter(([, r]) => partState(r, today) === 'due')
      .map(([part, r]) => ({ piece, part: Number(part), at: r.at, due: r.due || today })))
    .sort((a, b) => Number(focus.includes(b.piece)) - Number(focus.includes(a.piece)) || a.due.localeCompare(b.due) || a.piece.localeCompare(b.piece) || a.part - b.part)
    .slice(0, max)
    .map(({ piece, part, at }) => ({ piece, part, at }));

/** „ბოლოს 7 დღის წინ“, „ბოლოს გუშინ“ */
export const lastSeenWord = (at: string, today: string) => {
  const d = dayGap(at, today);
  return d <= 0 ? 'ბოლოს დღეს' : d === 1 ? 'ბოლოს გუშინ' : `ბოლოს ${d} დღის წინ`;
};

/** Every ready sentence the teacher says, by kind (the school's rules show them: ⚙ „სკოლა“ → AI მასწავლებელი →
 *  „მზა ფრაზები“). A note's place and a count change by the take; the examples show one. */
export const READY_SENTENCES: { title: string; lines: string[] }[] = [
  { title: 'გაკვეთილის დასაწყისი', lines: [
    'დღეს ახალი ფრაზაა და ცოტა გამეორება. დავიწყოთ.', 'დღეს ახალი ფრაზაა. დავიწყოთ გახურებით.',
    'დღეს გავიმეორებთ ნასწავლს. დავიწყოთ გახურებით.', 'კარგია, რომ დაბრუნდი. გეგმა გადავაწყვე. დავიწყოთ გამეორებით.',
    'ხმა გავათბოთ. მოუსმინე ნოტს და გააგრძელე.', 'ჯერ პირველი 4 ნოტი. მოუსმინე და გაიმეორე.',
  ] },
  { title: 'შედეგი', lines: ['ზუსტად!', 'თითქმის ზუსტად!', 'ნახევარი გამოვიდა.', 'ჯერ მოუსმინე და ისევ სცადე.'] },
  { title: 'ერთი შესწორება', lines: [
    'მესამე ნოტი ცოტა დაბლა იყო.', 'მესამე ნოტი ცოტა მაღლა იყო.', 'მესამე ნოტი არ გაისმა.', 'ბოლო ნოტი ადრე გაუშვი — ბოლომდე გააჩერე.',
    'ნახტომზე ვერ ახვედი. ჯერ მხოლოდ ნახტომი ვცადოთ.', 'ფრაზის ბოლოს ხმა დაგიდაბლდა. შუაში ჩაისუნთქე.',
  ] },
  { title: 'რა ქნა', lines: ['მოუსმინე მხოლოდ იმ ნოტს და კიდევ სცადე.', 'კიდევ ერთხელ, ნელა.', 'ახლა ნამდვილი ტემპით.', 'კიდევ სცადე.'] },
  { title: 'სიმღერისას', lines: ['ზუსტად', 'ოდნავ მაღლა', 'ოდნავ დაბლა'] },
  { title: 'გამხნევება — მხოლოდ როცა მართალია', lines: [
    'ეს ფრაზა უკვე იცი. გადავიდეთ შემდეგზე.', 'სამი ცდა — და უკვე ნახევარი გამოდის.', 'სამი ცდა — და უკვე გამოდის.',
  ] },
  { title: 'როცა სამჯერ არ გამოვიდა', lines: ['ეს ადგილი ძნელია. დავყოთ ორ ნაწილად.', 'დღეს სხვა ფრაზა ვცადოთ. ამას ხვალ დავუბრუნდებით.'] },
  { title: 'როცა ვერ გიგონებს', lines: ['ხმა ვერ გავიგონე. ტელეფონი ახლოს მოიტანე.'] },
  { title: 'გაკვეთილის ბოლო', lines: [
    'დღეს ახალი ფრაზა ისწავლე. ხვალ — მეოთხე ფრაზა.', 'დღეს უკეთ გამოგივიდა, ვიდრე დასაწყისში. ხვალ — მოკლე გამეორება.',
    'დღეს ივარჯიშე — ეს მთავარია. ხვალ — მესამე ფრაზა.', 'დიდხანს ივარჯიშე. ხმასაც დასვენება უნდა. ხვალ აქედან გავაგრძელებთ.',
    'პირველი მარგალიტი შენია! „ალილუია“ „ნასწავლში“ ჩაიწერა — შენი ხმით.',
  ] },
  // AI step 2 (utils/aiPlan.ts, components/aiLesson): the first meeting, the voice check, the first week, the weak spot
  { title: 'გაცნობა', lines: ['გამარჯობა! მე AI მასწავლებელი ვარ. გალობას ნაბიჯ-ნაბიჯ გასწავლი. ჯერ სამი რამ მითხარი.'] },
  { title: 'ხმის შემოწმება', lines: [
    'ორ წუთში გავიგებ, როგორ ჟღერს შენი ხმა. უბრალოდ იმღერე, როგორც გამოგდის — აქ შეცდომა არ არსებობს.',
    'კარგი სმენა გაქვს. ნოტსაც იჭერ და გაგონილსაც იმეორებ — პირველი დონიდან დავიწყებთ.',
    'კარგი დასაწყისია. ერთი ნოტი მყარად გიჭირავს — აქედან დავიწყებთ.',
    'დავიწყოთ ერთი ნოტით. ყოველდღე ცოტა — და ხმა თვითონ გაგყვება.', 'კარგად დაიჭირე!', 'ჩავინიშნე. გავაგრძელოთ.',
  ] },
  { title: 'პირველი კვირა', lines: ['დღევანდელი გავლილია. ხვალ — „მაღლა თუ დაბლა?“.', 'პირველი კვირა გავლილია!'] },
  { title: 'სუსტი ადგილი', lines: [
    'ამ კვირაში ნახტომი რე → სოლ ხუთჯერ აგერია. დღეს გამეორების ნაცვლად ეს ვივარჯიშოთ.', 'მოუსმინე ორ ნოტს და გაიმეორე.',
    'კიდევ ერთხელ.', 'ახლა — ფრაზაში.', 'ახლა — „ოსტატობის“ სავარჯიშო.',
    'ახლა — „ოსტატობის“ სავარჯიშო: ოქტავა, კვინტა, კვარტა — იმღერე.',
  ] },
  // AI step 3: the exam (pages/v2/gamocda, utils/aiExam.ts)
  { title: 'გამოცდა', lines: ['მზად ხარ? სამი წესია.', 'ახლოს ხარ. ხვალ ისევ სცადე.', 'ჯერ მოუსმინე და ისევ სცადე. ხვალ — ახალი ცდა.'] },
];
