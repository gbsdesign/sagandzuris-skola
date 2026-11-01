import type { VinKind, VinPerson } from '../data/vinPeople';
import { dayNumber, hangiStats, hash32, type HangiDay } from './hangi';
import { mulberry32, shuffle } from './otkheuli';

// „ვინ ვარ მე?“ (2026-11-01, like Twenty Questions and Guess Who). Alone („ონლაინ“): the app keeps a person in mind — the
// same one for the whole school a day — and a board of 24 names; the player asks ready yes/no questions („ქალია?“,
// „მეფე იყო?“, „1800 წლამდე დაიბადა?“…), the app answers from the person's own data and greys out every name the answer
// rules out; a name tapped is a guess, and a guess is a question too. Twenty questions at most. On one phone („ჰიბრიდული“)
// the name stands on a guesser's forehead, the class answers and the app counts the questions, 3·2·1 points by how few.
// Pure; tests in tests/vin.test.ts; the people data/vinPeople.ts; the screens pages/games/vin/.

export const MAX_QUESTIONS = 20;
export const BOARD_SIZE = 24;

export interface VinQuestion { id: string; text: string; group: 'who' | 'when'; test: (p: VinPerson) => boolean }

const kind = (k: VinKind) => (p: VinPerson) => p.kinds.includes(k);
const before = (year: number) => (p: VinPerson) => p.born < year;
/** the years the „when“ questions ask about — none is anybody's year of birth, so no answer is on the edge */
export const VIN_YEARS = [1000, 1500, 1800, 1850, 1885, 1900, 1932] as const;

export const VIN_QUESTIONS: readonly VinQuestion[] = [
  { id: 'f', text: 'ქალია?', group: 'who', test: p => p.sex === 'f' },
  { id: 'saint', text: 'წმინდანად არის შერაცხული?', group: 'who', test: kind('saint') },
  { id: 'ruler', text: 'მეფე ან დედოფალი იყო?', group: 'who', test: kind('ruler') },
  { id: 'warrior', text: 'მეომარი ან სარდალი იყო?', group: 'who', test: kind('warrior') },
  { id: 'clergy', text: 'ბერი, მღვდელი ან ეპისკოპოსი იყო?', group: 'who', test: kind('clergy') },
  { id: 'writer', text: 'მწერალი ან პოეტი იყო?', group: 'who', test: kind('writer') },
  { id: 'music', text: 'მომღერალი, მგალობელი ან კომპოზიტორი იყო?', group: 'who', test: kind('music') },
  { id: 'art', text: 'მხატვარი ან მოქანდაკე იყო?', group: 'who', test: kind('art') },
  { id: 'science', text: 'მეცნიერი იყო?', group: 'who', test: kind('science') },
  { id: 'stage', text: 'მსახიობი, რეჟისორი ან მოცეკვავე იყო?', group: 'who', test: kind('stage') },
  { id: 'sport', text: 'სპორტსმენი იყო?', group: 'who', test: kind('sport') },
  { id: 'lari', text: 'ლარის ქაღალდზეა გამოსახული?', group: 'who', test: p => p.lari !== undefined },
  ...VIN_YEARS.map(y => ({ id: `y${y}`, text: `${y} წლამდე დაიბადა?`, group: 'when' as const, test: before(y) })),
];
export const vinQuestion = (id: string) => VIN_QUESTIONS.find(q => q.id === id);

/** what every question says of a person, as one string — two people alike here can be told apart only by a guess */
export const signatureOf = (p: VinPerson) => VIN_QUESTIONS.map(q => (q.test(p) ? '1' : '0')).join('');

// ---------- a game alone: the person, the board, the questions asked ----------
/** asked: 'q:<question id>' or 'g:<person id>' (a guess), in order */
export interface VinRun { hidden: string; board: string[]; asked: string[] }

/** a board of `size` names around the hidden one: nobody that every question would answer alike, by the year of birth */
export const boardFor = (hidden: string, people: readonly VinPerson[], size: number, rnd: () => number): string[] => {
  const h = people.find(p => p.id === hidden);
  if (!h) return [];
  const sig = signatureOf(h);
  const others = shuffle(people.filter(p => p.id !== hidden && signatureOf(p) !== sig), rnd).slice(0, Math.max(0, size - 1));
  return [h, ...others].sort((a, b) => a.born - b.born || a.name.localeCompare(b.name, 'ka')).map(p => p.id);
};

/** the day's person: every one once in a round of days, in an order of that round, the same for the whole school */
export const hiddenOfDay = (iso: string, people: readonly VinPerson[]): string => {
  const n = people.length;
  const d = dayNumber(iso);
  const round = Math.floor(d / n);
  const order = shuffle(people.map(p => p.id), mulberry32(hash32(`vin|${round}`)));
  return order[((d % n) + n) % n];
};
export const dayRun = (iso: string, people: readonly VinPerson[]): VinRun => {
  const hidden = hiddenOfDay(iso, people);
  return { hidden, board: boardFor(hidden, people, BOARD_SIZE, mulberry32(hash32(`vin-board|${iso}`))), asked: [] };
};
/** a free game: any person, a board of `size` (the whole deck when it is bigger) */
export const freeRun = (people: readonly VinPerson[], size: number, seed: number): VinRun => {
  const rnd = mulberry32(seed);
  const hidden = people[Math.floor(rnd() * people.length)].id;
  return { hidden, board: boardFor(hidden, people, size, rnd), asked: [] };
};

export const runWon = (r: VinRun) => r.asked.includes(`g:${r.hidden}`);
export const runOver = (r: VinRun) => runWon(r) || r.asked.length >= MAX_QUESTIONS;
export const questionsLeft = (r: VinRun) => MAX_QUESTIONS - r.asked.length;

/** a question asked: its answer is the hidden person's (once a question; nothing after the end) */
export const askQuestion = (r: VinRun, id: string): VinRun =>
  runOver(r) || !vinQuestion(id) || r.asked.includes(`q:${id}`) ? r : { ...r, asked: [...r.asked, `q:${id}`] };
/** a name named: right ends the game won, wrong greys it out — a question either way */
export const guessName = (r: VinRun, id: string): VinRun =>
  runOver(r) || !r.board.includes(id) || r.asked.includes(`g:${id}`) ? r : { ...r, asked: [...r.asked, `g:${id}`] };

/** every name on the board the answers so far (and the wrong guesses) rule out */
export const ruledOut = (r: VinRun, people: readonly VinPerson[]): Set<string> => {
  const by = new Map(people.map(p => [p.id, p]));
  const h = by.get(r.hidden);
  const out = new Set<string>();
  if (!h) return out;
  const qs = r.asked.flatMap(a => (a.startsWith('q:') ? [vinQuestion(a.slice(2))].filter((q): q is VinQuestion => !!q) : []));
  for (const id of r.board) {
    const p = by.get(id);
    if (!p || (r.asked.includes(`g:${id}`) && id !== r.hidden)) { out.add(id); continue; }
    if (qs.some(q => q.test(p) !== q.test(h))) out.add(id);
  }
  return out;
};
/** the answer the hidden person gives to an asked question */
export const answerOf = (r: VinRun, id: string, people: readonly VinPerson[]): boolean | null => {
  const h = people.find(p => p.id === r.hidden);
  const q = vinQuestion(id);
  return h && q ? q.test(h) : null;
};

/** a kept run read back: only a known person, a board of known names holding it, questions and guesses that exist */
export const parseVinRun = (raw: unknown, people: readonly VinPerson[]): VinRun | null => {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Partial<VinRun>;
  const known = new Set(people.map(p => p.id));
  if (typeof o.hidden !== 'string' || !known.has(o.hidden) || !Array.isArray(o.board)) return null;
  const board = [...new Set(o.board.filter((x): x is string => typeof x === 'string' && known.has(x)))];
  if (!board.includes(o.hidden)) return null;
  const asked: string[] = [];
  for (const a of Array.isArray(o.asked) ? o.asked : []) {
    if (typeof a !== 'string' || asked.includes(a) || asked.length >= MAX_QUESTIONS) continue;
    if ((a.startsWith('q:') && vinQuestion(a.slice(2))) || (a.startsWith('g:') && board.includes(a.slice(2)))) asked.push(a);
    if (asked.includes(`g:${o.hidden}`)) break;
  }
  return { hidden: o.hidden, board, asked };
};

// ---------- the day's record ----------
/** the day's record: the person and what was asked, in order */
export const vinDay = (r: VinRun): HangiDay => ({ id: r.hidden, guesses: r.asked.slice(0, MAX_QUESTIONS), won: runWon(r), done: runOver(r) });

export interface VinStats { played: number; won: number; streak: number; best: number; avg: number | null }
export const vinStats = (days: Record<string, HangiDay>, today: string): VinStats => {
  const { played, won, streak, best } = hangiStats(days, today);
  const counts = Object.values(days).filter(d => d.done && d.won).map(d => d.guesses.length);
  return { played, won, streak, best, avg: counts.length ? Math.round((counts.reduce((s, n) => s + n, 0) / counts.length) * 10) / 10 : null };
};
export const vinMeta = (days: Record<string, HangiDay>, today: string): string | undefined => {
  const d = days[today];
  if (d?.done) return d.won ? `დღეს: ${d.guesses.length} კითხვით` : 'დღეს ვერ გამოიცანი';
  const { streak } = hangiStats(days, today);
  return streak ? `სერია: ${streak} დღე` : undefined;
};

/** the result for the clipboard or the share sheet — answers as squares, without the name */
export const vinShareText = (n: number, r: VinRun, people: readonly VinPerson[], site = 'sagandzureli.ge') => {
  const marks = r.asked.map(a => {
    if (a.startsWith('g:')) return a === `g:${r.hidden}` ? '⭐' : '🟥';
    return answerOf(r, a.slice(2), people) ? '🟩' : '⬜';
  });
  return `ვინ ვარ მე? №${n} · ${runWon(r) ? r.asked.length : 'X'}/${MAX_QUESTIONS}\n${marks.join('')}\nსაგანძურის სკოლა · ${site}`;
};

// ---------- one phone: the name on a forehead, the class answers, the app counts ----------
export const VIN_ROUNDS = [1, 2, 3];
/** a turn's clock: none, two or three minutes */
export const VIN_SECONDS = [0, 120, 180];
export const MIN_TEAMS = 2;
export const MAX_TEAMS = 6;

export interface VinTurn { team: number; who: string; q: number; ok: boolean }
export interface VinTable { names: string[]; rounds: number; seconds: number; deck: string[]; at: number; turns: VinTurn[] }

/** a name guessed with the q-th question: 3 points within five, 2 within ten, 1 within twenty; not guessed nothing */
export const vinPoints = (q: number, ok: boolean) => (!ok || q < 1 || q > MAX_QUESTIONS ? 0 : q <= 5 ? 3 : q <= 10 ? 2 : 1);

const roundsOf = (n: unknown) => (VIN_ROUNDS.includes(n as number) ? (n as number) : VIN_ROUNDS[0]);
const secondsOf = (n: unknown) => (VIN_SECONDS.includes(n as number) ? (n as number) : VIN_SECONDS[2]);

export const newVinTable = (names: string[], opts: { rounds: number; seconds: number }, deck: string[], rnd: () => number = Math.random): VinTable | null => {
  const teams = names.map(n => n.trim()).filter(Boolean).slice(0, MAX_TEAMS);
  if (teams.length < MIN_TEAMS || !deck.length) return null;
  return { names: teams, rounds: roundsOf(opts.rounds), seconds: secondsOf(opts.seconds), deck: shuffle([...new Set(deck)], rnd), at: 0, turns: [] };
};
export const vinTeamNow = (g: VinTable) => g.turns.length % g.names.length;
export const vinWho = (g: VinTable) => g.deck[g.at % g.deck.length];
export const vinOver = (g: VinTable) => g.turns.length >= g.names.length * g.rounds;
export const vinScores = (g: VinTable) => g.names.map((_, t) => g.turns.filter(x => x.team === t).reduce((s, x) => s + vinPoints(x.q, x.ok), 0));
/** a turn played: the name guessed with the q-th question (ok) or not; the next name comes up */
export const playVinTurn = (g: VinTable, q: number, ok: boolean): VinTable => {
  if (vinOver(g)) return g;
  const turn: VinTurn = { team: vinTeamNow(g), who: vinWho(g), q: Math.max(0, Math.min(MAX_QUESTIONS, Math.round(q))), ok };
  return { ...g, at: g.at + 1, turns: [...g.turns, turn] };
};

export const parseVinTable = (raw: unknown, known: ReadonlySet<string>): VinTable | null => {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Partial<VinTable>;
  const names = Array.isArray(o.names) ? o.names.filter((n): n is string => typeof n === 'string' && !!n.trim()).slice(0, MAX_TEAMS) : [];
  const deck = Array.isArray(o.deck) ? [...new Set(o.deck.filter((w): w is string => typeof w === 'string' && known.has(w)))] : [];
  if (names.length < MIN_TEAMS || !deck.length) return null;
  const turns = (Array.isArray(o.turns) ? o.turns : []).filter((t): t is VinTurn =>
    !!t && typeof t === 'object' && Number.isInteger(t.team) && t.team >= 0 && t.team < names.length && typeof t.who === 'string'
    && Number.isInteger(t.q) && t.q >= 0 && t.q <= MAX_QUESTIONS && typeof t.ok === 'boolean');
  return {
    names,
    rounds: roundsOf(o.rounds),
    seconds: secondsOf(o.seconds),
    deck,
    at: Number.isInteger(o.at) && (o.at as number) >= 0 ? (o.at as number) : 0,
    turns: turns.map(t => ({ team: t.team, who: t.who, q: t.q, ok: t.ok })),
  };
};
