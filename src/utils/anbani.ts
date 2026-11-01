// „სამი დამწერლობა“ (2026-11-01, the plan's Georgian game №9, like Duolingo): the two old scripts — asomtavruli and nuskhuri —
// learned letter by letter on a path of small daily lessons. Seven units bring the 33 letters, the most common first so that
// words come early (LETTER_UNITS); the eighth reads words, the ninth whole lines. A lesson is a run of exercises — meet a
// letter, name it, find it, trace it, read a word, put a line's words in order — with three hearts: a mistake costs one and
// its exercise comes back at the end; with no hearts left the lesson starts again. A day with a lesson keeps the streak. The
// record is the daily games' own (students.games.anbani.days, hooks/useDailyRecord.ts): a day's `guesses` are the lessons
// done that day, so the path follows a member from phone to phone. Teams before one screen read old letters aloud — the
// „ჰიბრიდული“ — with `ReadTeams` below.
import { ALPHABET, type Script } from './oldScripts';
import { dayBefore, type HangiDay } from './hangi';

export type OldScript = Exclude<Script, 'mkhedruli'>;
export const OLD_SCRIPTS: OldScript[] = ['asomtavruli', 'nuskhuri'];
export const isOldScript = (v: unknown): v is OldScript => v === 'asomtavruli' || v === 'nuskhuri';

/** the letters in the order they are learned: the most common first, so that words come early */
export const LETTER_UNITS: string[][] = ['აეიმდ', 'ოსრლბ', 'ნვგთუ', 'კცხშქ', 'ტყწპზ', 'ჩძჯღ', 'ფჭჰჟ'].map(u => [...u]);
/** after the letters: a unit of words, then one of whole lines */
export const WORDS_UNIT = LETTER_UNITS.length;
export const LINES_UNIT = LETTER_UNITS.length + 1;
export const UNITS = LETTER_UNITS.length + 2;
export const HEARTS = 3;

/** the letters known once units 0…u are done (u = −1: none yet) */
export const lettersThrough = (u: number) => LETTER_UNITS.slice(0, Math.max(0, Math.min(u + 1, LETTER_UNITS.length))).flat();
export const lessonId = (s: OldScript, u: number) => `${s === 'asomtavruli' ? 'a' : 'n'}${u + 1}`;
export const practiceId = (s: OldScript) => `${s === 'asomtavruli' ? 'a' : 'n'}p`;

// ---------- the record: a day = the lessons done that day ----------
export type Days = Record<string, HangiDay>;
const MAX_A_DAY = 20; // useDailyRecord keeps at most 20 entries of a day

export const lessonsDone = (days: Days) => new Set(Object.values(days).flatMap(d => d.guesses));
/** how far a script's path is done: its units open one by one */
export const unitsDone = (done: ReadonlySet<string>, s: OldScript) => {
  let n = 0;
  while (n < UNITS && done.has(lessonId(s, n))) n++;
  return n;
};
/** the day's record with one more lesson (a lesson played again the same day counts once) */
export const withLesson = (day: HangiDay | undefined, id: string): HangiDay => {
  const before = day?.guesses ?? [];
  const guesses = before.includes(id) ? before : [...before, id].slice(-MAX_A_DAY);
  return { id, guesses, won: true, done: true };
};
/** days in a row with a lesson, up to today (or up to yesterday while today is still open) */
export const streakOf = (days: Days, today: string) => {
  let n = 0;
  let cursor = days[today]?.done ? today : dayBefore(today);
  while (days[cursor]?.done) { n++; cursor = dayBefore(cursor); }
  return n;
};
/** the games hub's line: today's lessons, or the streak while today is still open */
export const anbaniMeta = (days: Days, today: string): string | undefined => {
  const streak = streakOf(days, today);
  const n = days[today]?.guesses.length ?? 0;
  if (n) return `დღეს ${n} გაკვეთილი · სერია ${streak}`;
  return streak ? `სერია: ${streak} დღე — დღეს ჯერ არა` : undefined;
};

// ---------- a seeded chance ----------
export const rng = (seed: number) => {
  let s = (seed >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
};
export const shuffle = <T,>(items: readonly T[], r: () => number): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
};
const pickN = <T,>(items: readonly T[], n: number, r: () => number) => shuffle(items, r).slice(0, n);

// ---------- the exercises ----------
export type Exercise = (
  | { kind: 'intro'; letter: string }
  /** an old letter: which of today's is it? */
  | { kind: 'pick'; letter: string; options: string[] }
  /** today's letter: which old one is it? (the options are today's letters, drawn old) */
  | { kind: 'find'; letter: string; options: string[] }
  | { kind: 'trace'; letter: string }
  /** an old word: which is it? */
  | { kind: 'word'; word: string; options: string[] }
  /** an old line: its words in order */
  | { kind: 'order'; line: string; words: string[] }
) & { again?: boolean };

/** a line's words, the punctuation left out */
export const lineWords = (line: string) => line.replace(/[^ა-ჰ\s]/g, ' ').split(/\s+/).filter(Boolean);
/** the words that can be read with these letters */
export const readable = (pool: readonly string[], letters: readonly string[]) => {
  const ok = new Set(letters);
  return pool.filter(w => [...w].every(c => ok.has(c)));
};

/** the letter and three others, the others from `from` while it has enough */
export const letterOptions = (letter: string, from: readonly string[], r: () => number) => {
  const own = [...new Set(from)].filter(l => l !== letter);
  const more = ALPHABET.filter(l => l !== letter && !own.includes(l));
  const others = [...pickN(own, 3, r), ...pickN(more, 3, r)].slice(0, 3);
  return shuffle([letter, ...others], r);
};
/** the word and three others: as long as it while there are such, else of any length */
export const wordOptions = (word: string, pool: readonly string[], r: () => number) => {
  const rest = [...new Set(pool)].filter(w => w !== word);
  const same = rest.filter(w => w.length === word.length);
  const near = rest.filter(w => Math.abs(w.length - word.length) === 1);
  const other = rest.filter(w => Math.abs(w.length - word.length) > 1);
  const others = [...pickN(same, 3, r), ...pickN(near, 3, r), ...pickN(other, 3, r)].slice(0, 3);
  return shuffle([word, ...others], r);
};
/** the letters most often missed first, the rest in a random order */
const weakFirst = (letters: readonly string[], weak: Readonly<Record<string, number>>, r: () => number) =>
  shuffle(letters, r).sort((a, b) => (weak[b] ?? 0) - (weak[a] ?? 0));

export interface LessonSource {
  /** words of today's letters (data/anbaniWords.ts) */
  pool: readonly string[];
  /** lines to read whole */
  lines: readonly string[];
  /** misses by letter (this device) */
  weak?: Readonly<Record<string, number>>;
}

/** one lesson of a unit — or, for 'practice', of the letters learned so far (`reached` = units done) */
export const buildLesson = (unit: number | 'practice', src: LessonSource, seed: number, reached = 0): Exercise[] => {
  const r = rng(seed);
  const weak = src.weak ?? {};
  const out: Exercise[] = [];
  const pick = (l: string, known: readonly string[]): Exercise => ({ kind: 'pick', letter: l, options: letterOptions(l, known, r) });
  const find = (l: string, known: readonly string[]): Exercise => ({ kind: 'find', letter: l, options: letterOptions(l, known, r) });
  const words = (ws: readonly string[], n: number, from: readonly string[]) =>
    pickN(ws, n, r).forEach(w => out.push({ kind: 'word', word: w, options: wordOptions(w, from, r) }));

  if (unit === 'practice') {
    const known = lettersThrough(Math.min(reached, LETTER_UNITS.length) - 1);
    if (!known.length) return [];
    weakFirst(known, weak, r).slice(0, 6).forEach((l, i) => out.push(i % 2 ? find(l, known) : pick(l, known)));
    out.push({ kind: 'trace', letter: weakFirst(known, weak, r)[0] });
    const ws = readable(src.pool, known);
    words(ws, 3, ws);
    if (reached > LINES_UNIT) pickN(src.lines, 1, r).forEach(line => out.push({ kind: 'order', line, words: lineWords(line) }));
    return shuffle(out, r);
  }
  if (unit === WORDS_UNIT) {
    const ws = src.pool.filter(w => w.length >= 4);
    words(ws, 10, ws);
    out.push({ kind: 'trace', letter: weakFirst(ALPHABET, weak, r)[0] });
    return shuffle(out, r);
  }
  if (unit === LINES_UNIT) {
    pickN(src.lines, 5, r).forEach(line => out.push({ kind: 'order', line, words: lineWords(line) }));
    const ws = src.pool.filter(w => w.length >= 5);
    words(ws, 3, ws);
    return out;
  }
  const fresh = LETTER_UNITS[unit];
  const before = lettersThrough(unit - 1);
  const known = [...before, ...fresh];
  // each new letter met, named, then found one step later
  fresh.forEach((l, i) => {
    out.push({ kind: 'intro', letter: l }, pick(l, known));
    if (i) out.push(find(fresh[i - 1], known));
  });
  out.push(find(fresh[fresh.length - 1], known));
  out.push({ kind: 'trace', letter: fresh[Math.floor(r() * fresh.length)] });
  const ws = readable(src.pool, known);
  const withFresh = ws.filter(w => [...w].some(c => fresh.includes(c)));
  words(withFresh.length >= 3 ? withFresh : ws, 3, ws);
  weakFirst(before, weak, r).slice(0, 2).forEach((l, i) => out.push(i ? find(l, known) : pick(l, known)));
  return out;
};

// ---------- a lesson's run ----------
export interface Run { items: Exercise[]; at: number; hearts: number; mistakes: number }
export const newRun = (items: Exercise[]): Run => ({ items, at: 0, hearts: HEARTS, mistakes: 0 });
/** after an answer: a mistake costs a heart and brings the exercise back at the end (once) */
export const answered = (run: Run, right: boolean): Run => {
  if (right) return run;
  const item = run.items[run.at];
  const items = !item || item.again ? run.items : [...run.items, { ...item, again: true }];
  return { ...run, items, hearts: Math.max(0, run.hearts - 1), mistakes: run.mistakes + 1 };
};
export const nextItem = (run: Run): Run => ({ ...run, at: run.at + 1 });
export const runLost = (run: Run) => run.hearts <= 0;
export const runWon = (run: Run) => !runLost(run) && run.at >= run.items.length;

/** is the answer right? (`pick`, `find`, `word`: the option chosen; `order`: the words in the order tapped) */
export const isRight = (ex: Exercise, answer: string | readonly string[]) => {
  if (ex.kind === 'pick' || ex.kind === 'find') return answer === ex.letter;
  if (ex.kind === 'word') return answer === ex.word;
  if (ex.kind === 'order') return Array.isArray(answer) && answer.length === ex.words.length && answer.every((w, i) => w === ex.words[i]);
  return true;
};

/** the misses of a run's letters kept on the device: a miss adds 2, a right answer takes 1 off */
export const updateWeak = (weak: Readonly<Record<string, number>>, letter: string, right: boolean) => {
  const n = Math.max(0, (weak[letter] ?? 0) + (right ? -1 : 2));
  const out = { ...weak };
  if (n) out[letter] = Math.min(n, 9); else delete out[letter];
  return out;
};

// ---------- tracing: how much of the letter the finger covered, and how much of its line kept to the letter ----------
export interface TraceMasks {
  /** the letter's pixels */
  glyph: ArrayLike<number>;
  /** the letter, drawn wider (the room a line may stray in) */
  glyphWide: ArrayLike<number>;
  /** the finger's line */
  ink: ArrayLike<number>;
  /** the finger's line, drawn wider (what it covers) */
  inkWide: ArrayLike<number>;
}
export const traceScore = ({ glyph, glyphWide, ink, inkWide }: TraceMasks) => {
  let g = 0, covered = 0, k = 0, inside = 0;
  for (let i = 0; i < glyph.length; i++) {
    if (glyph[i]) { g++; if (inkWide[i]) covered++; }
    if (ink[i]) { k++; if (glyphWide[i]) inside++; }
  }
  return { cover: g ? covered / g : 0, inside: k ? inside / k : 0 };
};
export const TRACE_COVER = 0.6;
export const TRACE_INSIDE = 0.7;
export const traceOk = (s: { cover: number; inside: number }) => s.cover >= TRACE_COVER && s.inside >= TRACE_INSIDE;

// ---------- „ჰიბრიდული“: teams before one screen read aloud ----------
export type ReadWhat = 'letters' | 'words' | 'lines';
export const READ_WHAT: ReadWhat[] = ['letters', 'words', 'lines'];
export type ReadScript = OldScript | 'both';
export const READ_ROUNDS = [10, 15, 20];
export const readPoints = (what: ReadWhat) => (what === 'lines' ? 2 : 1);
const NOBODY = -1;

export interface ReadTeams {
  teams: string[];
  script: ReadScript;
  what: ReadWhat;
  /** the alphabet's key shown under the item */
  key: boolean;
  items: { text: string; script: OldScript }[];
  /** the item on the screen */
  at: number;
  /** who read each item first: a team, or −1 for nobody; log[at] is there once the answer is open */
  log: number[];
}

export const newReadTeams = (
  o: { teams: string[]; script: ReadScript; what: ReadWhat; rounds: number; key: boolean },
  src: { pool: readonly string[]; lines: readonly string[] },
  seed: number,
): ReadTeams => {
  const r = rng(seed);
  const texts = o.what === 'letters'
    ? shuffle(ALPHABET, r).slice(0, Math.min(o.rounds, ALPHABET.length))
    : o.what === 'words' ? pickN(src.pool.filter(w => w.length >= 3 && w.length <= 8), o.rounds, r)
      : pickN(src.lines.filter(l => l.length <= 52), o.rounds, r);
  const items = texts.map(text => ({ text, script: o.script === 'both' ? OLD_SCRIPTS[Math.floor(r() * 2)] : o.script }));
  return { teams: o.teams, script: o.script, what: o.what, key: o.key, items, at: 0, log: [] };
};
export const readShown = (g: ReadTeams) => g.log.length > g.at;
export const readOver = (g: ReadTeams) => g.at >= g.items.length;
/** the team that read it first (or −1, nobody); tapping again while the answer is open changes the mark */
export const markRead = (g: ReadTeams, team: number | null): ReadTeams => ({ ...g, log: [...g.log.slice(0, g.at), team ?? NOBODY] });
export const nextRead = (g: ReadTeams): ReadTeams => (readShown(g) ? { ...g, at: g.at + 1 } : g);
export const readScores = (g: ReadTeams) => g.teams.map((_, t) => g.log.filter(x => x === t).length * readPoints(g.what));
/** the teams by points, ties sharing a place */
export const readRanking = (g: ReadTeams) => {
  const scores = readScores(g);
  const order = g.teams.map((name, i) => ({ i, name, points: scores[i] })).sort((a, b) => b.points - a.points || a.i - b.i);
  return order.map(x => ({ ...x, place: 1 + order.filter(y => y.points > x.points).length }));
};
export const parseReadTeams = (raw: unknown): ReadTeams | null => {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Partial<ReadTeams>;
  if (!Array.isArray(o.teams) || o.teams.length < 2 || !o.teams.every(t => typeof t === 'string')) return null;
  if (!(o.script === 'both' || isOldScript(o.script)) || !READ_WHAT.includes(o.what as ReadWhat)) return null;
  if (!Array.isArray(o.items) || !o.items.length || !o.items.every(i => i && typeof i.text === 'string' && isOldScript(i.script))) return null;
  if (typeof o.at !== 'number' || o.at < 0 || o.at > o.items.length) return null;
  if (!Array.isArray(o.log) || o.log.length > o.items.length || !o.log.every(x => Number.isInteger(x) && x >= NOBODY && x < o.teams!.length)) return null;
  if (o.log.length < o.at || o.log.length > o.at + 1) return null;
  return { teams: o.teams, script: o.script, what: o.what as ReadWhat, key: o.key !== false, items: o.items, at: o.at, log: o.log };
};
