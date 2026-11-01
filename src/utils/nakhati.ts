import type { RoundRules } from './roundGames';
import { isInk } from './ink';
import { shuffle } from './amikhseni';
import { otkhiPoints } from './otkhi';
import { drawGame } from './raSadRodis';

// „ნახატობანა“ (games hub, 2026-11-01, like Pictionary): one draws a word, the others guess it. In a class's room the host is
// the artist: the word is on their phone only, the drawing reaches every phone as it grows (utils/ink.ts, the round's
// `ink`), and every player picks it out of four of its theme — the quicker, the more. On one phone the class plays in teams:
// a team's artist sees the word, draws on the board, on paper or on the screen itself, the team guesses before the time
// is out; after each circle, if chosen, everybody's artist draws the same word and the first team to guess wins it. Alone,
// a drawing goes to the class's chat as a riddle (its word folded in the message). Pure and tested in tests/nakhati.test.ts;
// the words data/nakhatiWords.ts, the pages pages/games/nakhati/. Kept free of the words' data, since the room's store
// (and so this file) is in the app's first bundle.

export interface NakhatiPick { w: string; theme: string }

// ---------- the room: the host draws, four words to pick from ----------
export interface NakhatiQ {
  kind: 'nakhati';
  /** the word drawn (kept from the players with `right` until the reveal) */
  id: string;
  theme: string;
  /** four words of the theme, the drawn one among them */
  options: string[];
  right: number;
  /** the drawing so far (utils/ink.ts) */
  ink?: string;
}
export const NAKHATI_SECONDS = 90;
export const SEEN_KEEP = 120;

const word = (v: unknown) => typeof v === 'string' && v.trim().length > 0 && v.length <= 40;
const isIndex = (n: unknown, len: number) => Number.isInteger(n) && (n as number) >= 0 && (n as number) < len;

export const NAKHATI_RULES: RoundRules<NakhatiQ> = {
  steps: () => 1,
  seconds: () => NAKHATI_SECONDS,
  ok: (q, pick) => isIndex(pick, q.options.length),
  /** the right word 500–1000: the quicker, the more (as in „ოთხიდან ერთი“) */
  points: otkhiPoints,
  secret: ['id', 'right'],
  valid: (q): q is NakhatiQ => {
    const o = q as Partial<NakhatiQ>;
    return o.kind === 'nakhati' && word(o.id) && word(o.theme)
      && Array.isArray(o.options) && o.options.length >= 2 && o.options.length <= 4 && o.options.every(word)
      && new Set(o.options).size === o.options.length && isIndex(o.right, o.options.length) && o.options[o.right!] === o.id
      && (o.ink === undefined || isInk(o.ink));
  },
  /** a round drawn and shown keeps no lines: the host's state is written with every stroke */
  spent: ({ ink: _ink, ...q }) => q,
};

/**
 * A game's rounds: the themes in turn (utils/raSadRodis.ts `drawGame`), in each a word not drawn lately (else the one drawn
 * longest ago), with three others of its theme to pick from, in a new order.
 */
export const drawNakhati = ({ words, themes, count, seen, rnd = Math.random }: {
  words: readonly NakhatiPick[];
  /** the themes chosen; none = all */
  themes: readonly string[];
  count: number;
  /** words drawn in earlier games, oldest first */
  seen: readonly string[];
  rnd?: () => number;
}): NakhatiQ[] => {
  const all = [...new Set(words.map(w => w.theme))];
  const use = themes.filter(t => all.includes(t));
  const topics = use.length ? use : all;
  const bank = words.filter(w => topics.includes(w.theme)).map(w => ({ id: w.w, topic: w.theme }));
  return drawGame({ bank, topics, count, seen: [...seen], rnd }).flatMap(pick => {
    const others = shuffle(words.filter(w => w.theme === pick.topic && w.w !== pick.id).map(w => w.w), rnd).slice(0, 3);
    if (others.length < 3) return [];
    const options = shuffle([pick.id, ...others], rnd);
    return [{ kind: 'nakhati' as const, id: pick.id, theme: pick.topic, options, right: options.indexOf(pick.id) }];
  });
};

/** the words a game drew, after the ones before (oldest first), at most SEEN_KEEP */
export const rememberDrawn = (seen: readonly string[], drawn: readonly string[]) =>
  [...seen.filter(w => !drawn.includes(w)), ...drawn].slice(-SEEN_KEEP);

/** three words to choose from (a drawing for the chat): of the themes chosen, the ones drawn lately last */
export const threeToDraw = (words: readonly NakhatiPick[], themes: readonly string[], seen: readonly string[], rnd: () => number = Math.random): NakhatiPick[] => {
  const use = themes.filter(t => words.some(w => w.theme === t));
  const pool = shuffle(words.filter(w => !use.length || use.includes(w.theme)), rnd);
  const order = [...pool.filter(w => !seen.includes(w.w)), ...pool.filter(w => seen.includes(w.w))];
  const out: NakhatiPick[] = [];
  // three of different themes when there are, then any
  for (const w of order) if (out.length < 3 && !out.some(o => o.theme === w.theme)) out.push(w);
  for (const w of order) if (out.length < 3 && !out.includes(w)) out.push(w);
  return out;
};

// ---------- one phone: teams in turn ----------
/** where the artist draws: on the class's board or paper, or on the screen itself (the team watches it) */
export type NakhatiWhere = 'board' | 'screen';
export interface NakhatiTurn {
  /** the team whose turn it was (−1: everybody's artist drew) */
  team: number;
  w: string;
  /** the team that guessed it (null: nobody) */
  won: number | null;
}
export const NAKHATI_TURN_SECONDS = [60, 90, 120];
export const NAKHATI_ROUNDS = [2, 3, 4];
export const MIN_TEAMS = 2;
export const MAX_TEAMS = 6;

export interface NakhatiTable {
  names: string[];
  seconds: number;
  /** circles: every team draws once a circle */
  rounds: number;
  where: NakhatiWhere;
  /** after each circle everybody's artist draws the same word */
  allPlay: boolean;
  /** the words, shuffled; each turn takes the next, the deck goes round again once it is out */
  deck: string[];
  at: number;
  turns: NakhatiTurn[];
}

export const newNakhatiTable = (names: string[], opts: { seconds: number; rounds: number; where: NakhatiWhere; allPlay: boolean }, deck: readonly string[], rnd: () => number = Math.random): NakhatiTable | null =>
  names.length >= MIN_TEAMS && deck.length
    ? { names: names.slice(0, MAX_TEAMS), ...opts, deck: shuffle([...deck], rnd), at: 0, turns: [] }
    : null;

const perCircle = (g: Pick<NakhatiTable, 'names' | 'allPlay'>) => g.names.length + (g.allPlay ? 1 : 0);
/** whose turn it is: a team's (its index), or everybody's (−1, the circle's last turn when chosen) */
export const turnNow = (g: Pick<NakhatiTable, 'names' | 'allPlay' | 'turns'>) => {
  const i = g.turns.length % perCircle(g);
  return i < g.names.length ? i : -1;
};
export const circleNow = (g: Pick<NakhatiTable, 'names' | 'allPlay' | 'turns'>) => Math.floor(g.turns.length / perCircle(g)) + 1;
export const wordNow = (g: Pick<NakhatiTable, 'deck' | 'at'>) => g.deck[g.at % g.deck.length];
export const nakhatiOver = (g: Pick<NakhatiTable, 'names' | 'allPlay' | 'turns' | 'rounds'>) => g.turns.length >= g.rounds * perCircle(g);
export const nakhatiScores = (g: Pick<NakhatiTable, 'names' | 'turns'>) => {
  const s = g.names.map(() => 0);
  g.turns.forEach(t => { if (t.won !== null && t.won >= 0 && t.won < s.length) s[t.won] += 1; });
  return s;
};
/** the turn played: on a team's turn only that team may win it, on everybody's turn any team */
export const playNakhati = (g: NakhatiTable, won: number | null): NakhatiTable => {
  if (nakhatiOver(g)) return g;
  const team = turnNow(g);
  const ok = won === null || (team < 0 ? won >= 0 && won < g.names.length : won === team);
  return { ...g, at: g.at + 1, turns: [...g.turns, { team, w: wordNow(g), won: ok ? won : null }] };
};
/** another word before the turn begins (the artist does not know this one) */
export const skipWord = (g: NakhatiTable): NakhatiTable => ({ ...g, at: g.at + 1 });
/** the last turn mended (a team tapped by mistake) */
export const mendLast = (g: NakhatiTable, won: number | null): NakhatiTable => {
  const last = g.turns[g.turns.length - 1];
  if (!last) return g;
  const ok = won === null || (last.team < 0 ? won >= 0 && won < g.names.length : won === last.team);
  return ok ? { ...g, turns: [...g.turns.slice(0, -1), { ...last, won }] } : g;
};

/** a kept game, read back sane; words no longer in the deck's words are dropped */
export const parseNakhatiTable = (raw: unknown, known: ReadonlySet<string>): NakhatiTable | null => {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const names = Array.isArray(o.names) ? o.names.filter((n): n is string => typeof n === 'string' && !!n.trim()).map(n => n.slice(0, 16)).slice(0, MAX_TEAMS) : [];
  const deck = Array.isArray(o.deck) ? o.deck.filter((w): w is string => typeof w === 'string' && known.has(w)) : [];
  if (names.length < MIN_TEAMS || !deck.length) return null;
  const seconds = NAKHATI_TURN_SECONDS.includes(Number(o.seconds)) ? Number(o.seconds) : NAKHATI_TURN_SECONDS[1];
  const rounds = NAKHATI_ROUNDS.includes(Number(o.rounds)) ? Number(o.rounds) : NAKHATI_ROUNDS[0];
  const allPlay = o.allPlay === true;
  const g0 = { names, allPlay, rounds, turns: [] as NakhatiTurn[] };
  const turns: NakhatiTurn[] = [];
  for (const t of Array.isArray(o.turns) ? o.turns : []) {
    if (nakhatiOver({ ...g0, turns })) break;
    const r = (t ?? {}) as Record<string, unknown>;
    const team = turnNow({ ...g0, turns });
    if (typeof r.w !== 'string' || !r.w) continue;
    const won = Number.isInteger(r.won) && (r.won as number) >= 0 && (r.won as number) < names.length && (team < 0 || r.won === team) ? (r.won as number) : null;
    turns.push({ team, w: r.w.slice(0, 40), won });
  }
  const at = Number.isInteger(o.at) && (o.at as number) >= 0 ? (o.at as number) : 0;
  return { names, seconds, rounds, where: o.where === 'screen' ? 'screen' : 'board', allPlay, deck, at, turns };
};

// ---------- the chat's riddle: the word folded into the message ----------
const enc = new TextEncoder();
const dec = new TextDecoder();
const toB64 = (bytes: Uint8Array) => { let s = ''; bytes.forEach(b => { s += String.fromCharCode(b); }); return btoa(s); };
const fromB64 = (s: string) => Uint8Array.from(atob(s), ch => ch.charCodeAt(0));
const KEY = [17, 92, 41, 7, 66, 23, 101];

/** the word kept in a message so that nobody reads it by chance (any phone can read it back: no secret) */
export const foldWord = (w: string) => toB64(enc.encode(w.trim()).map((b, i) => b ^ KEY[i % KEY.length])).split('').reverse().join('');
export const unfoldWord = (s: unknown): string => {
  if (typeof s !== 'string' || !s || s.length > 200) return '';
  try { return dec.decode(fromB64(s.split('').reverse().join('')).map((b, i) => b ^ KEY[i % KEY.length])); } catch { return ''; }
};

/** a guess as it is compared: Georgian letters and single spaces only */
export const guessForm = (s: string) => s.replace(/[^ა-ჰ ]/g, ' ').replace(/\s+/g, ' ').trim();
/** a guess is the word: the same letters, or the same without the last vowel (ჩონგური · ჩონგურს would not, ჩონგურ would) */
export const sameWord = (guess: string, word: string) => {
  const a = guessForm(guess), b = guessForm(word);
  if (!a || !b) return false;
  if (a === b) return true;
  const stem = (x: string) => x.replace(/[აეიოუ]$/, '');
  return stem(a).length >= 3 && stem(a) === stem(b);
};
/** the word's letters as the boxes count them (spaces stay gaps) */
export const letterCount = (w: string) => [...guessForm(w)].filter(ch => ch !== ' ').length;
