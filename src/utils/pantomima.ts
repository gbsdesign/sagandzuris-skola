import type { RoundRules } from './roundGames';
import { shuffle } from './amikhseni';
import { otkhiPoints } from './otkhi';
import { drawGame } from './raSadRodis';

// „პანტომიმა“ (games hub, 2026-11-01, like Charades and Heads Up!): a word is shown with the body, without a word said (or,
// for the little ones, explained in words). In a class's room the host is the actor: the word is on their phone only, they
// show it in the game's call, every player picks it out of four on their own phone — the quicker, the more. On one phone
// the class plays in teams: the actor holds the phone (or it stands on the guesser's forehead, the team shows the words),
// a word guessed is a point, the turn's time runs out, the next team comes. Pure and tested in tests/pantomima.test.ts; the
// words data/pantomimaCards.ts, the pages pages/games/pantomima/. Kept free of the words' data, since the room's store
// (and so this file) is in the app's first bundle.

export interface PantoWord { w: string; theme: string }

// ---------- the room: four words, one shown ----------
export interface PantoQ {
  kind: 'pantomima';
  /** the word shown (kept from the players with `right` until the reveal) */
  id: string;
  theme: string;
  /** four words of the theme, the shown one among them */
  options: string[];
  right: number;
  /** the host may explain in words too (the little ones' way) */
  talk?: boolean;
}
export const PANTO_SECONDS = 60;
export const SEEN_KEEP = 120;

const word = (v: unknown) => typeof v === 'string' && v.trim().length > 0 && v.length <= 40;
const isIndex = (n: unknown, len: number) => Number.isInteger(n) && (n as number) >= 0 && (n as number) < len;

export const PANTO_RULES: RoundRules<PantoQ> = {
  steps: () => 1,
  seconds: () => PANTO_SECONDS,
  ok: (q, pick) => isIndex(pick, q.options.length),
  /** the right word 500–1000: the quicker, the more (as in „ოთხიდან ერთი“) */
  points: otkhiPoints,
  secret: ['id', 'right'],
  valid: (q): q is PantoQ => {
    const o = q as Partial<PantoQ>;
    return o.kind === 'pantomima' && word(o.id) && word(o.theme)
      && Array.isArray(o.options) && o.options.length >= 2 && o.options.length <= 4 && o.options.every(word)
      && new Set(o.options).size === o.options.length && isIndex(o.right, o.options.length) && o.options[o.right!] === o.id
      && (o.talk === undefined || typeof o.talk === 'boolean');
  },
};

/**
 * A game's rounds: the themes in turn (utils/raSadRodis.ts `drawGame`), in each a word not shown lately (else the one shown
 * longest ago), with three others of its theme to pick from, in a new order.
 */
export const drawPantomima = ({ words, themes, count, seen, talk = false, rnd = Math.random }: {
  words: readonly PantoWord[];
  /** the themes chosen; none = all */
  themes: readonly string[];
  count: number;
  /** words shown in earlier games, oldest first */
  seen: readonly string[];
  talk?: boolean;
  rnd?: () => number;
}): PantoQ[] => {
  const all = [...new Set(words.map(w => w.theme))];
  const use = themes.filter(t => all.includes(t));
  const topics = use.length ? use : all;
  const bank = words.filter(w => topics.includes(w.theme)).map(w => ({ id: w.w, topic: w.theme }));
  return drawGame({ bank, topics, count, seen: [...seen], rnd }).flatMap(pick => {
    const others = shuffle(words.filter(w => w.theme === pick.topic && w.w !== pick.id).map(w => w.w), rnd).slice(0, 3);
    if (others.length < 3) return [];
    const options = shuffle([pick.id, ...others], rnd);
    return [{ kind: 'pantomima' as const, id: pick.id, theme: pick.topic, options, right: options.indexOf(pick.id), ...(talk ? { talk } : {}) }];
  });
};

/** the words a game showed, after the ones before (oldest first), at most SEEN_KEEP */
export const rememberShown = (seen: readonly string[], shown: readonly string[]) =>
  [...seen.filter(w => !shown.includes(w)), ...shown].slice(-SEEN_KEEP);

// ---------- one phone: teams in turn ----------
/** who sees the word: the actor holds the phone, or it stands on the guesser's forehead and the team shows */
export type PantoHow = 'actor' | 'forehead';
export interface PantoMark { w: string; ok: boolean }
export interface PantoTurn { team: number; marks: PantoMark[] }
export const PANTO_TURN_SECONDS = [60, 90, 120];
export const PANTO_ROUNDS = [1, 2, 3];
export const MIN_TEAMS = 2;
export const MAX_TEAMS = 6;

export interface PantoTable {
  names: string[];
  seconds: number;
  /** turns a team plays */
  rounds: number;
  how: PantoHow;
  /** words may be said (the little ones' way) */
  talk: boolean;
  /** the words, shuffled; a turn takes them in order, the deck goes round again once it is out */
  deck: string[];
  at: number;
  turns: PantoTurn[];
}

export const newPantoTable = (names: string[], opts: { seconds: number; rounds: number; how: PantoHow; talk: boolean }, deck: readonly string[], rnd: () => number = Math.random): PantoTable | null =>
  names.length >= MIN_TEAMS && deck.length
    ? { names: names.slice(0, MAX_TEAMS), ...opts, deck: shuffle([...deck], rnd), at: 0, turns: [] }
    : null;
/** the team whose turn it is */
export const teamNow = (g: Pick<PantoTable, 'turns' | 'names'>) => g.turns.length % g.names.length;
/** the word `i` places after the turn's first */
export const wordAt = (g: Pick<PantoTable, 'deck' | 'at'>, i: number) => g.deck[(g.at + i) % g.deck.length];
export const turnPoints = (t: Pick<PantoTurn, 'marks'>) => t.marks.filter(m => m.ok).length;
export const pantoScores = (g: Pick<PantoTable, 'turns' | 'names'>) => {
  const s = g.names.map(() => 0);
  g.turns.forEach(t => { if (t.team < s.length) s[t.team] += turnPoints(t); });
  return s;
};
export const pantoOver = (g: Pick<PantoTable, 'turns' | 'names' | 'rounds'>) => g.turns.length >= g.names.length * g.rounds;
export const playTurn = (g: PantoTable, marks: PantoMark[]): PantoTable =>
  pantoOver(g) ? g : { ...g, at: g.at + marks.length, turns: [...g.turns, { team: teamNow(g), marks }] };
/** the last turn's list mended (a ✓ given by mistake) */
export const toggleMark = (marks: readonly PantoMark[], i: number): PantoMark[] => marks.map((m, j) => (j === i ? { ...m, ok: !m.ok } : m));

/** a kept game, read back sane; words no longer in the deck's words are dropped */
export const parsePantoTable = (raw: unknown, known: ReadonlySet<string>): PantoTable | null => {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const names = Array.isArray(o.names) ? o.names.filter((n): n is string => typeof n === 'string' && !!n.trim()).map(n => n.slice(0, 16)).slice(0, MAX_TEAMS) : [];
  const deck = Array.isArray(o.deck) ? o.deck.filter((w): w is string => typeof w === 'string' && known.has(w)) : [];
  if (names.length < MIN_TEAMS || !deck.length) return null;
  const seconds = PANTO_TURN_SECONDS.includes(Number(o.seconds)) ? Number(o.seconds) : PANTO_TURN_SECONDS[0];
  const rounds = PANTO_ROUNDS.includes(Number(o.rounds)) ? Number(o.rounds) : 2;
  const turns: PantoTurn[] = (Array.isArray(o.turns) ? o.turns : []).flatMap(t => {
    const r = (t ?? {}) as Record<string, unknown>;
    const team = Number(r.team);
    if (!Number.isInteger(team) || team < 0 || team >= names.length || !Array.isArray(r.marks)) return [];
    const marks = r.marks.flatMap(m => {
      const x = (m ?? {}) as Record<string, unknown>;
      return typeof x.w === 'string' && x.w ? [{ w: x.w.slice(0, 40), ok: x.ok === true }] : [];
    });
    return [{ team, marks }];
  }).slice(0, names.length * rounds);
  const at = Number.isInteger(o.at) && (o.at as number) >= 0 ? (o.at as number) : 0;
  return { names, seconds, rounds, how: o.how === 'forehead' ? 'forehead' : 'actor', talk: o.talk === true, deck, at, turns };
};

// ---------- the forehead: a nod down is „guessed“, a nod up is „pass“ ----------
/** where the screen faces, from the device's orientation (degrees): +1 the sky, −1 the floor, 0 standing upright — the up
 * part of the screen's normal, the same in portrait and landscape */
export const facingOf = (beta: number, gamma: number) => Math.cos((beta * Math.PI) / 180) * Math.cos((gamma * Math.PI) / 180);
/** a tilt counts past ~40° from upright (facing = the sine of it); the phone must stand again (under ~20°) before the next */
export const TILT_ON = 0.64;
export const TILT_OFF = 0.34;
export type Tilt = 'down' | 'up' | null;
export const readTilt = (facing: number, armed: boolean): { tilt: Tilt; armed: boolean } => {
  if (!armed) return { tilt: null, armed: Math.abs(facing) < TILT_OFF };
  if (facing <= -TILT_ON) return { tilt: 'down', armed: false };
  if (facing >= TILT_ON) return { tilt: 'up', armed: false };
  return { tilt: null, armed: true };
};
