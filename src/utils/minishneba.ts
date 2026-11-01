import { TABU_CARDS, type TabuEntry } from '../data/tabuCards';
import { mulberry32, shuffle } from './otkheuli';
import { givesAway, isWord, letters } from './tabu';

// „ერთი მინიშნება“ (games hub, 2026-11-01, like Just One): everybody but the guesser writes one clue for the same word,
// the same clues cancel out, the guesser sees what is left and has one try. Thirteen cards; a wrong guess loses the next
// card too. Alone on the phone the clues are the „ნუ იტყვი!“ card's five words, with the most telling one or two struck as
// if two players had written them; in a class one phone goes round the table. Pure and tested in tests/minishneba.test.ts.

export const JO_CARDS = 13;
export type JoResult = 'right' | 'wrong' | 'pass' | 'lost';

/** the scale of the original game, in the school's words */
export const joVerdict = (score: number) =>
  score >= 13 ? 'უნაკლო! ყველა სიტყვა გამოიცანით'
    : score === 12 ? 'საოცარია!'
    : score === 11 ? 'ძალიან კარგია!'
    : score >= 9 ? 'კარგია — თითქმის ყველა'
    : score >= 7 ? 'არა უშავს — ცოტაც და…'
    : score >= 4 ? 'დასაწყისისთვის კარგია'
    : 'კიდევ სცადეთ!';

/** a word's base: a plural's „ები“ and the last vowel off, so ზარი · ზარები · ზარს stay one clue */
export const baseOf = (s: string) => {
  let l = letters(s).replace(/ებ(ი|ს|ით|ის)?$/, '');
  if (l.length > 2 && /[აეიოუ]$/.test(l)) l = l.slice(0, -1);
  if (l.length > 3 && /ს$/.test(l)) l = l.slice(0, -1);
  return l;
};
export const sameClue = (a: string, b: string) => {
  const x = baseOf(a);
  return !!x && x === baseOf(b);
};

export type ClueFate = 'ok' | 'same' | 'part' | 'empty';
/** each clue's fate: nothing written, a part of the word (may not be shown), the same as another's (both go), or shown */
export const judgeClues = (clues: readonly string[], word: string): ClueFate[] =>
  clues.map((c, i) => {
    if (!letters(c)) return 'empty';
    if (givesAway(c, word)) return 'part';
    return clues.some((o, j) => j !== i && letters(o) && !givesAway(o, word) && sameClue(c, o)) ? 'same' : 'ok';
  });

// ---------- results, alone or in a class ----------
/** a card's result by its place in the deck; none yet = not played */
export interface JoScore { res: (JoResult | undefined)[]; penalty: number }
/** the cards won; a wrong last guess costs one already won (there is no next card to lose) */
export const joScore = (s: JoScore) => Math.max(0, s.res.filter(r => r === 'right').length - s.penalty);
/** a guess judged: right; wrong — the next card is lost too (none left: a won one goes); „I don't know“ — only this one */
export const judgeGuess = <T extends JoScore & { at: number }>(s: T, n: number, right: boolean | null): T => {
  if (s.res[s.at]) return s;
  const res = [...s.res];
  res[s.at] = right === null ? 'pass' : right ? 'right' : 'wrong';
  let penalty = s.penalty;
  if (right === false) {
    if (s.at + 1 < n) res[s.at + 1] = 'lost';
    else penalty += 1;
  }
  return { ...s, res, penalty };
};
/** the next card that is still to play */
export const nextAt = (res: readonly (JoResult | undefined)[], at: number) => {
  let i = at + 1;
  while (res[i] === 'lost') i += 1;
  return i;
};

// ---------- alone ----------
export interface JoRound { card: number; struck: number }
export interface JoRun extends JoScore { seed: number; rounds: JoRound[]; at: number; guess: string }

/** thirteen cards, the ones not met lately first; a card's one or two most telling clues struck as the same (0: 30 %,
 * 1: 50 %, 2: 20 %) */
export const newJoRun = (seed: number, seen: readonly number[] = [], cards: readonly TabuEntry[] = TABU_CARDS): JoRun => {
  const rnd = mulberry32(seed);
  const fresh = shuffle(cards.filter(c => !seen.includes(c.id)), rnd);
  const old = shuffle(cards.filter(c => seen.includes(c.id)), rnd);
  const rounds = [...fresh, ...old].slice(0, JO_CARDS).map(c => {
    const r = rnd();
    return { card: c.id, struck: r < 0.3 ? 0 : r < 0.8 ? 1 : 2 };
  });
  return { seed, rounds, at: 0, res: [], penalty: 0, guess: '' };
};
/** the clues a round shows (shuffled, as players write them) and how many were struck */
export const joClues = (run: JoRun, i: number, cards: readonly TabuEntry[] = TABU_CARDS) => {
  const r = run.rounds[i];
  const card = cards.find(c => c.id === r?.card);
  if (!r || !card) return { word: '', shown: [] as string[], struck: 0 };
  const shown = shuffle(card.no.slice(0, card.no.length - r.struck), mulberry32((run.seed ^ Math.imul(i + 1, 0x9e3779b1)) >>> 0));
  return { word: card.w, shown, struck: r.struck };
};
export const joGuess = (run: JoRun, typed: string, cards: readonly TabuEntry[] = TABU_CARDS): JoRun => {
  const word = cards.find(c => c.id === run.rounds[run.at]?.card)?.w ?? '';
  if (!word || run.res[run.at] || !letters(typed)) return run;
  return { ...judgeGuess(run, run.rounds.length, isWord(typed, word)), guess: typed.trim().slice(0, 40) };
};
export const joPass = (run: JoRun): JoRun => (run.res[run.at] ? run : { ...judgeGuess(run, run.rounds.length, null), guess: '' });
export const joNext = (run: JoRun): JoRun => (run.res[run.at] ? { ...run, at: nextAt(run.res, run.at), guess: '' } : run);
export const joOver = (run: Pick<JoRun, 'at' | 'rounds'>) => run.at >= run.rounds.length;

const RESULTS = new Set<JoResult>(['right', 'wrong', 'pass', 'lost']);
const cleanRes = (raw: unknown, n: number): (JoResult | undefined)[] => (Array.isArray(raw) ? raw : []).slice(0, n).map(x => (RESULTS.has(x as JoResult) ? (x as JoResult) : undefined));

export const parseJoRun = (raw: unknown, cards: readonly TabuEntry[] = TABU_CARDS): JoRun | null => {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const ids = new Set(cards.map(c => c.id));
  const rounds = (Array.isArray(o.rounds) ? o.rounds : []).flatMap(x => {
    const r = x as Record<string, unknown>;
    return r && ids.has(r.card as number) && [0, 1, 2].includes(r.struck as number) ? [{ card: r.card as number, struck: r.struck as number }] : [];
  }).slice(0, JO_CARDS);
  if (!rounds.length) return null;
  const res = cleanRes(o.res, rounds.length);
  const at = Number.isInteger(o.at) ? Math.min(Math.max(0, o.at as number), rounds.length) : 0;
  return {
    seed: Number.isInteger(o.seed) ? (o.seed as number) >>> 0 : 1,
    rounds, at, res,
    penalty: Number.isInteger(o.penalty) ? Math.min(3, Math.max(0, o.penalty as number)) : 0,
    guess: typeof o.guess === 'string' ? o.guess.slice(0, 40) : '',
  };
};

// ---------- the class: one phone round the table ----------
export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 8;
export type JoPhase = 'pass' | 'write' | 'guess' | 'reveal';
export interface JoTable extends JoScore {
  names: string[];
  /** the cards' ids */
  deck: number[];
  at: number;
  /** this card's clues by seat; the guesser's stays empty */
  clues: string[];
  /** the seat writing now (−1: all have written) */
  giver: number;
  phase: JoPhase;
  guess: string;
  /** the clues the givers struck by hand before the guesser got the phone (a word of the same family the phone did not see) */
  off: number[];
}
/** the guesser of the deck's card i: the seats in turn */
export const guesserOf = (g: Pick<JoTable, 'names' | 'at'>) => g.at % g.names.length;
/** the givers of the card, in the seats' order after the guesser */
export const giversOf = (g: Pick<JoTable, 'names' | 'at'>) => {
  const n = g.names.length;
  const gu = guesserOf(g);
  return Array.from({ length: n - 1 }, (_, i) => (gu + 1 + i) % n);
};
export const newJoTable = (names: string[], deck: number[]): JoTable | null => {
  const ns = names.map(n => n.trim()).filter(Boolean).slice(0, MAX_PLAYERS);
  if (ns.length < MIN_PLAYERS || !deck.length) return null;
  const g = { names: ns, deck: deck.slice(0, JO_CARDS), at: 0, res: [], penalty: 0, clues: ns.map(() => ''), giver: -1, phase: 'pass' as JoPhase, guess: '', off: [] };
  return { ...g, giver: giversOf(g)[0] };
};
/** a giver's clue written: on to the next giver, or to the guesser when all have written */
export const writeClue = (g: JoTable, clue: string): JoTable => {
  if (g.phase !== 'write' || g.giver < 0) return g;
  const clues = g.clues.map((c, i) => (i === g.giver ? clue.trim().slice(0, 30) : c));
  const order = giversOf(g);
  const next = order[order.indexOf(g.giver) + 1] ?? -1;
  return { ...g, clues, giver: next, phase: next < 0 ? 'guess' : 'pass' };
};
export const openWord = (g: JoTable): JoTable => (g.phase === 'pass' && g.giver >= 0 ? { ...g, phase: 'write' } : g);
/** the guesser's word: typed (or „I don't know“: null) */
export const guessTable = (g: JoTable, typed: string | null, cards: readonly TabuEntry[] = TABU_CARDS): JoTable => {
  if (g.phase !== 'guess') return g;
  const word = cards.find(c => c.id === g.deck[g.at])?.w ?? '';
  if (typed !== null && !letters(typed)) return g;
  const judged = judgeGuess(g, g.deck.length, typed === null ? null : isWord(typed, word));
  return { ...judged, guess: typed?.trim().slice(0, 40) ?? '', phase: 'reveal' };
};
/** the host mends the verdict (the phone did not know a word for the same thing): right ↔ wrong */
export const mendGuess = (g: JoTable): JoTable => {
  if (g.phase !== 'reveal' || (g.res[g.at] !== 'right' && g.res[g.at] !== 'wrong')) return g;
  const res = [...g.res];
  let penalty = g.penalty;
  if (res[g.at] === 'right') {
    res[g.at] = 'wrong';
    if (g.at + 1 < g.deck.length) res[g.at + 1] = 'lost'; else penalty += 1;
  } else {
    res[g.at] = 'right';
    if (g.at + 1 < g.deck.length) res[g.at + 1] = undefined; else penalty = Math.max(0, penalty - 1);
  }
  return { ...g, res, penalty };
};
export const nextTableCard = (g: JoTable): JoTable => {
  if (g.phase !== 'reveal') return g;
  const at = nextAt(g.res, g.at);
  const base = { ...g, at, clues: g.names.map(() => ''), guess: '', phase: 'pass' as JoPhase, off: [] };
  return { ...base, giver: at < g.deck.length ? giversOf(base)[0] : -1 };
};
export const tableOver = (g: Pick<JoTable, 'at' | 'deck'>) => g.at >= g.deck.length;

/** the card's clues, a note a giver in the seats' order: the phone's verdict, a shown one struck if the givers struck it */
export const notesOf = (g: JoTable, cards: readonly TabuEntry[] = TABU_CARDS): { seat: number; text: string; fate: ClueFate }[] => {
  const word = cards.find(c => c.id === g.deck[g.at])?.w ?? '';
  const givers = giversOf(g);
  const fates = judgeClues(givers.map(s => g.clues[s]), word);
  return givers.map((seat, k) => ({ seat, text: g.clues[seat], fate: fates[k] === 'ok' && g.off.includes(seat) ? 'same' : fates[k] }));
};
/** the givers look the clues over before the guesser gets the phone: a tap strikes one as the same as another, or takes it back */
export const strikeClue = (g: JoTable, seat: number): JoTable => {
  if (g.phase !== 'guess' || !giversOf(g).includes(seat)) return g;
  return { ...g, off: g.off.includes(seat) ? g.off.filter(s => s !== seat) : [...g.off, seat] };
};

export const parseJoTable = (raw: unknown, cards: readonly TabuEntry[] = TABU_CARDS): JoTable | null => {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const names = (Array.isArray(o.names) ? o.names : []).filter((x): x is string => typeof x === 'string' && !!x.trim()).map(x => x.slice(0, 24)).slice(0, MAX_PLAYERS);
  const ids = new Set(cards.map(c => c.id));
  const deck = (Array.isArray(o.deck) ? o.deck : []).filter((x): x is number => ids.has(x as number)).slice(0, JO_CARDS);
  if (names.length < MIN_PLAYERS || !deck.length) return null;
  const at = Number.isInteger(o.at) ? Math.min(Math.max(0, o.at as number), deck.length) : 0;
  const phases: JoPhase[] = ['pass', 'write', 'guess', 'reveal'];
  const phase = phases.includes(o.phase as JoPhase) ? (o.phase as JoPhase) : 'pass';
  const clues = names.map((_, i) => (Array.isArray(o.clues) && typeof o.clues[i] === 'string' ? (o.clues[i] as string).slice(0, 30) : ''));
  const base = { names, deck, at, res: cleanRes(o.res, deck.length), penalty: Number.isInteger(o.penalty) ? Math.min(3, Math.max(0, o.penalty as number)) : 0, clues, giver: -1, phase, guess: typeof o.guess === 'string' ? o.guess.slice(0, 40) : '', off: [] as number[] };
  const givers = giversOf(base);
  base.off = (Array.isArray(o.off) ? o.off : []).filter((x): x is number => givers.includes(x as number));
  const giver = Number.isInteger(o.giver) && givers.includes(o.giver as number) ? (o.giver as number) : -1;
  // a writing step needs its giver; without one the card goes back to its first giver
  if ((phase === 'pass' || phase === 'write') && giver < 0) return at < deck.length ? { ...base, phase: 'pass', clues: names.map(() => ''), giver: givers[0] } : base;
  return { ...base, giver };
};
