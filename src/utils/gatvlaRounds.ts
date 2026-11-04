import type { RoundRules } from './roundGames';
import { beatsOf, countOut } from './gatvla';
import { otkhiPoints } from './otkhi';

// „გათვლა“ in a class's room (games hub, 2026-11-04; the one-phone tool is utils/gatvla.ts): „ვის შეხვდება?“ — the host
// reads a counting rhyme out in the room's call, every player sees the circle of the room's names and the rhyme on their
// own phone and taps the one its last word will land on; the quicker, the more (1000…500), and the one it lands on starts.
// Who was picked leaves the circle, so the rounds give the order of turns. Pure and tested in tests/gatvlaRounds.test.ts.

export interface GatvlaQ {
  kind: 'gatvla';
  /** the circle this round: the players not picked in the rounds before, in the room's order */
  names: string[];
  /** the rhyme's title and its beats (a word a beat) */
  title: string;
  words: string[];
  /** where the first beat lands (an index of `names`) */
  from: number;
  /** who was picked in the rounds before, in turn */
  before: string[];
}

export const GATVLA_SECONDS = 30;
/** the beats the screens count at the reveal, a beat each */
export const GATVLA_BEAT_MS = 260;

const name = (v: unknown) => typeof v === 'string' && v.trim().length > 0 && v.length <= 40;

/** where the rhyme lands: the index of `names` its last beat falls on */
export const landing = (q: Pick<GatvlaQ, 'names' | 'words' | 'from'>) => countOut(q.names.length, q.words.length, q.from);

export const GATVLA_RULES: RoundRules<GatvlaQ> = {
  steps: () => 1,
  seconds: () => GATVLA_SECONDS,
  ok: (q, pick) => Number.isInteger(pick) && pick >= 0 && pick < q.names.length,
  points: (q, a, limitMs) => otkhiPoints({ right: landing(q) }, a, limitMs),
  secret: [],
  valid: (q): q is GatvlaQ => {
    const o = q as Partial<GatvlaQ>;
    return o.kind === 'gatvla'
      && Array.isArray(o.names) && o.names.length >= 2 && o.names.length <= 40 && o.names.every(name)
      && typeof o.title === 'string' && o.title.length <= 60
      && Array.isArray(o.words) && o.words.length >= 1 && o.words.length <= 120 && o.words.every(w => typeof w === 'string' && w.length > 0 && w.length <= 30)
      && Number.isInteger(o.from) && o.from! >= 0 && o.from! < o.names.length
      && Array.isArray(o.before) && o.before.length <= 40 && o.before.every(name);
  },
};

/**
 * A game's rounds over the room's players: each round a rhyme of `rhymes` in turn (from a random one), the circle the ones
 * not picked yet, the first beat on a random one; the one it lands on leaves the circle. At most one round fewer than the
 * players (the last one would have no choice) and `count`.
 */
export const drawGatvla = ({ players, rhymes, count, rnd = Math.random }: {
  players: readonly string[];
  rhymes: readonly { title: string; text: string }[];
  count: number;
  rnd?: () => number;
}): GatvlaQ[] => {
  const usable = rhymes
    .map(r => ({ title: r.title.slice(0, 60), words: beatsOf(r.text).map(w => w.slice(0, 30)).slice(0, 120) }))
    .filter(r => r.words.length >= 2);
  let circle = [...new Set(players.map(p => p.trim().slice(0, 40)).filter(Boolean))];
  if (!usable.length || circle.length < 2) return [];
  const start = Math.floor(rnd() * usable.length);
  const out: GatvlaQ[] = [];
  const before: string[] = [];
  while (out.length < count && circle.length >= 2) {
    const r = usable[(start + out.length) % usable.length];
    const q: GatvlaQ = { kind: 'gatvla', names: circle, title: r.title, words: r.words, from: Math.floor(rnd() * circle.length), before: [...before] };
    out.push(q);
    const picked = circle[landing(q)];
    before.push(picked);
    circle = circle.filter(n => n !== picked);
  }
  return out;
};

/** the circle's names: each one's first name, the whole name where two share it */
export const shortNames = (names: readonly string[]) => {
  const first = names.map(n => n.trim().split(/\s+/)[0] ?? '');
  return names.map((n, i) => (first[i] && first.filter(f => f === first[i]).length === 1 ? first[i] : n.trim()));
};
