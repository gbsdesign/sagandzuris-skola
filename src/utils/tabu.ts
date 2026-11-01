import { TABU_CARDS, type TabuEntry } from '../data/tabuCards';
import { mulberry32, shuffle } from './otkheuli';
import { winnerOf } from './amikhseni';
import { dayBefore, type HangiDay } from './hangi';

// „ნუ იტყვი!“ (games hub, 2026-11-01, like Taboo): one explains a word to their team without five words the card forbids.
// Alone on the phone the card is turned round: its five forbidden words come one by one as clues, the vaguest first, and the
// player types the word — the fewer clues, the more points (5 … 1). Twenty cards a day, the same for the whole school; in a
// class one phone shows the card to the explainer and to a watcher of the other team, who rings at a forbidden word. Pure
// and tested in tests/tabu.test.ts; the cards are data/tabuCards.ts, the pages pages/games/tabu/.

// ---------- words ----------
/** Georgian letters and digits only: a typed word is compared by these */
export const letters = (s: string) => s.replace(/[^ა-ჰ0-9]/g, '');
/** a word without its last vowel (ჩონგურ·ი, თამარ·ი), so a nominative's ending does not decide */
export const stemOf = (s: string) => {
  const l = letters(s);
  return l.length > 3 && /[აეიოუ]$/.test(l) ? l.slice(0, -1) : l;
};
/** a typed word is the card's: the same letters, or the same without the last vowel (one letter more or less) */
export const isWord = (typed: string, word: string) => {
  const t = letters(typed);
  const w = letters(word);
  if (!t) return false;
  return t === w || (stemOf(t) === stemOf(w) && Math.abs(t.length - w.length) <= 1);
};
/** a clue gives the word away: it holds the word's stem, or the word holds the clue's (a part of the word may not be said) */
export const givesAway = (clue: string, word: string) => {
  const c = letters(clue);
  const w = stemOf(word);
  if (!c) return false;
  if (w.length >= 3 && c.includes(w)) return true;
  const cs = stemOf(clue);
  return cs.length >= 4 && letters(word).includes(cs);
};

/** a text seed: the same text, the same deal (FNV-1a) */
export const seedOfText = (s: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
};
const dayNumber = (iso: string) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / 86_400_000);

// ---------- alone: the day's twenty cards ----------
export const DAY_CARDS = 20;
export const CLUES = 5;
export const MAX_DAY_POINTS = DAY_CARDS * CLUES;

/** The day's cards, the same for the whole school: the bank in a fixed shuffle cut into days, so no card comes twice before
 * every card has come (180 cards = nine days), then a new shuffle. */
export const dayDeal = (iso: string, cards: readonly TabuEntry[] = TABU_CARDS): TabuEntry[] => {
  const per = Math.floor(cards.length / DAY_CARDS);
  if (!per) return [...cards];
  const d = dayNumber(iso);
  const cycle = Math.floor(d / per);
  const order = shuffle([...cards], mulberry32(seedOfText(`tabu|${cycle}`)));
  const at = (((d % per) + per) % per) * DAY_CARDS;
  return order.slice(at, at + DAY_CARDS);
};

export interface TabuRun {
  iso: string;
  /** the card on the screen */
  at: number;
  /** how many of its clues are out (1 … 5) */
  shown: number;
  /** the wrong words typed at it */
  wrong: string[];
  /** a finished card's points, in order */
  pts: number[];
}
export const newTabuRun = (iso: string): TabuRun => ({ iso, at: 0, shown: 1, wrong: [], pts: [] });
/** the card on the screen is over (its word is shown) */
export const cardOver = (r: TabuRun) => r.pts.length > r.at;
export const runOver = (r: TabuRun, n = DAY_CARDS) => r.at >= n;
export const runScore = (r: Pick<TabuRun, 'pts'>) => r.pts.reduce((a, b) => a + b, 0);

/** a word typed: right = the points of the clues out; wrong = the next clue, and after the fifth the card is lost */
export const tryWord = (r: TabuRun, typed: string, card: TabuEntry): TabuRun => {
  if (cardOver(r) || !letters(typed)) return r;
  if (isWord(typed, card.w)) return { ...r, pts: [...r.pts, CLUES + 1 - r.shown] };
  const wrong = [...r.wrong, typed.trim()];
  return r.shown < CLUES ? { ...r, wrong, shown: r.shown + 1 } : { ...r, wrong, pts: [...r.pts, 0] };
};
/** one more clue without a guess (a point less) */
export const moreClue = (r: TabuRun): TabuRun => (cardOver(r) || r.shown >= CLUES ? r : { ...r, shown: r.shown + 1 });
/** „I don't know“: the card is lost */
export const giveUp = (r: TabuRun): TabuRun => (cardOver(r) ? r : { ...r, pts: [...r.pts, 0] });
export const nextCard = (r: TabuRun): TabuRun => (cardOver(r) ? { ...r, at: r.at + 1, shown: 1, wrong: [] } : r);

/** a kept run, read back sane (another day's is dropped) */
export const parseTabuRun = (raw: unknown, iso: string, n = DAY_CARDS): TabuRun | null => {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o.iso !== iso) return null;
  const pts = (Array.isArray(o.pts) ? o.pts : []).filter((x): x is number => Number.isInteger(x) && x >= 0 && x <= CLUES).slice(0, n);
  const at = Math.min(Number.isInteger(o.at) ? Math.max(0, o.at as number) : 0, pts.length, n);
  const shown = Number.isInteger(o.shown) ? Math.min(CLUES, Math.max(1, o.shown as number)) : 1;
  const wrong = (Array.isArray(o.wrong) ? o.wrong : []).filter((x): x is string => typeof x === 'string').map(x => x.slice(0, 40)).slice(0, CLUES);
  return { iso, at, shown, wrong, pts: pts.slice(0, at + 1) };
};

// ---------- the day's record ----------
// HangiDay.guesses = one mark `p:<a digit a card, 0 … 5>`; `won` = the twenty were played (a streak counts days played).

export const pointsOf = (d: Pick<HangiDay, 'guesses'>) =>
  [...(d.guesses.find(g => g.startsWith('p:'))?.slice(2) ?? '')].filter(c => /[0-5]/.test(c)).map(Number).slice(0, DAY_CARDS);
export const finishedTabuDay = (iso: string, pts: readonly number[]): HangiDay => ({ id: iso, won: true, done: true, guesses: [`p:${pts.join('')}`] });
/** a card's square: guessed from one or two clues, from three or four, from the last, lost */
export const ptsSquare = (p: number) => (p >= 4 ? '🟩' : p >= 2 ? '🟨' : p === 1 ? '🟧' : '⬛');

export interface TabuStats { played: number; streak: number; best: number; average: number | null }
export const tabuStats = (days: Record<string, HangiDay>, today: string): TabuStats => {
  const done = Object.values(days).filter(d => d.done);
  let streak = 0;
  let cursor = days[today]?.done ? today : dayBefore(today);
  while (days[cursor]?.done) { streak++; cursor = dayBefore(cursor); }
  const scores = done.map(d => runScore({ pts: pointsOf(d) }));
  return {
    played: done.length,
    streak,
    best: scores.length ? Math.max(...scores) : 0,
    average: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
  };
};
/** the result for the clipboard or the share sheet: the score and a square a card, ten a line — never the words */
export const tabuShareText = (n: number, day: HangiDay, site = 'sagandzureli.ge') => {
  const pts = pointsOf(day);
  const sq = pts.map(ptsSquare);
  return [`ნუ იტყვი! №${n} · ${runScore({ pts })}/${MAX_DAY_POINTS}`, sq.slice(0, 10).join(''), sq.slice(10).join(''), `საგანძურის სკოლა · ${site}`].filter(Boolean).join('\n');
};
/** one line for the games hub's row */
export const tabuMeta = (days: Record<string, HangiDay>, today: string): string | undefined => {
  const d = days[today];
  if (d?.done) return `დღეს: ${runScore({ pts: pointsOf(d) })}/${MAX_DAY_POINTS}`;
  const { streak } = tabuStats(days, today);
  return streak ? `სერია: ${streak} დღე` : undefined;
};

// ---------- the class: teams on one phone ----------
export type TabuMark = 'ok' | 'skip' | 'taboo';
export interface TabuTurn { team: number; marks: { card: number; m: TabuMark }[] }
export const TABU_SECONDS = [60, 90, 120];
export const TABU_TARGETS = [10, 20, 30];

/** a turn's points: a word guessed +1, a forbidden word said −1, a card skipped −1 when the class plays so, else 0 */
export const turnPoints = (t: TabuTurn, skipCost: boolean) =>
  t.marks.reduce((s, { m }) => s + (m === 'ok' ? 1 : m === 'taboo' ? -1 : skipCost ? -1 : 0), 0);
export const tabuScores = (turns: readonly TabuTurn[], teams: number, skipCost: boolean) => {
  const s = Array.from({ length: teams }, () => 0);
  turns.forEach(t => { if (t.team < teams) s[t.team] += turnPoints(t, skipCost); });
  return s;
};
/** the winner once every team has had as many turns and one is at the target alone */
export const tabuWinner = (turns: readonly TabuTurn[], teams: number, target: number, skipCost: boolean) =>
  winnerOf(tabuScores(turns, teams, skipCost), target, turns.length);
/** the next mark of a card in the turn's list: ✓ → ⏭ → 🔔 → ✓ (the host mends a slip after the bell) */
export const cycleMark = (m: TabuMark): TabuMark => (m === 'ok' ? 'skip' : m === 'skip' ? 'taboo' : 'ok');

export interface TabuTable {
  names: string[];
  seconds: number;
  target: number;
  skipCost: boolean;
  /** the cards' ids, shuffled; a turn takes them in order */
  deck: number[];
  at: number;
  turns: TabuTurn[];
}
export const newTabuTable = (names: string[], opts: { seconds: number; target: number; skipCost: boolean }, rnd: () => number = Math.random, cards: readonly TabuEntry[] = TABU_CARDS): TabuTable => ({
  names: names.slice(0, 6), ...opts, deck: shuffle(cards.map(c => c.id), rnd), at: 0, turns: [],
});
/** the card on top; the deck goes round again once it is out */
export const tableCard = (g: TabuTable, cards: readonly TabuEntry[] = TABU_CARDS) => cards.find(c => c.id === g.deck[g.at % g.deck.length]);
/** a turn played: its cards leave the deck's top (the one on the screen when the time ran out stays for the next team) */
export const playTurn = (g: TabuTable, turn: TabuTurn): TabuTable => ({ ...g, at: g.at + turn.marks.length, turns: [...g.turns, turn] });

export const parseTabuTable = (raw: unknown, cards: readonly TabuEntry[] = TABU_CARDS): TabuTable | null => {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const names = (Array.isArray(o.names) ? o.names : []).filter((x): x is string => typeof x === 'string').map(x => x.slice(0, 24)).slice(0, 6);
  if (names.length < 2) return null;
  const ids = new Set(cards.map(c => c.id));
  const deck = (Array.isArray(o.deck) ? o.deck : []).filter((x): x is number => Number.isInteger(x) && ids.has(x as number));
  if (!deck.length) return null;
  const marks = new Set<TabuMark>(['ok', 'skip', 'taboo']);
  const turns = (Array.isArray(o.turns) ? o.turns : []).flatMap(t => {
    const x = t as Record<string, unknown>;
    if (!x || !Number.isInteger(x.team) || (x.team as number) < 0 || (x.team as number) >= names.length || !Array.isArray(x.marks)) return [];
    const ms = (x.marks as unknown[]).flatMap(m => {
      const y = m as Record<string, unknown>;
      return y && ids.has(y.card as number) && marks.has(y.m as TabuMark) ? [{ card: y.card as number, m: y.m as TabuMark }] : [];
    });
    return [{ team: x.team as number, marks: ms }];
  });
  return {
    names,
    seconds: TABU_SECONDS.includes(o.seconds as number) ? (o.seconds as number) : TABU_SECONDS[0],
    target: TABU_TARGETS.includes(o.target as number) ? (o.target as number) : TABU_TARGETS[1],
    skipCost: Boolean(o.skipCost),
    deck,
    at: Number.isInteger(o.at) && (o.at as number) >= 0 ? (o.at as number) : 0,
    turns,
  };
};
