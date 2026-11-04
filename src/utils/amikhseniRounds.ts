import type { RoundAnswer, RoundRules } from './roundGames';
import { drawGame, rsrMatch } from './raSadRodis';

// „ამიხსენი“ in a class's room (games hub, 2026-11-04; the one-phone Alias game of teams is utils/amikhseni.ts): the host
// explains a word in the game's call without saying it — the word is on their phone only —, every player writes it on
// their own phone. One try each, the quicker the more: a right word at once is 1000, at the last second 500. The app
// judges the words as „რა? სად? როდის?“ does (`rsrMatch`: a case's ending, one slip in a long word) but wants the word, not
// a list of guesses; the host may judge a line again at the reveal. Pure and tested in tests/amikhseniRounds.test.ts; kept
// free of the word cards' data, since the room's store (and so this file) is in the app's first bundle.

export interface AmikQ {
  kind: 'amikhseni';
  /** the word (kept from the players until the reveal) */
  id: string;
  /** its card category, shown to everybody as a hint */
  theme: string;
}

export const AMIK_SECONDS = 60;
export const AMIK_TOP = 1000;
/** how many words more than the card's a guess may have („ეს ჩონგურია“), so a list of guesses is not an answer */
export const AMIK_EXTRA = 2;
/** the words shown lately, kept on the device so the next games show others first */
export const AMIK_SEEN_KEEP = 200;

const word = (v: unknown, max: number) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;

/** is the written guess the word? */
export const amikMatch = (card: string, written: string) => rsrMatch(card, written, AMIK_EXTRA);

/** a right word 500–1000 by how quickly it came; a wrong one or none 0 (the host's judgement wins when given) */
export const amikPoints = (q: Pick<AmikQ, 'id'>, a: Pick<RoundAnswer, 'ms' | 'text' | 'ok'>, limitMs: number) => {
  if (!(a.ok ?? amikMatch(q.id, a.text ?? ''))) return 0;
  const late = limitMs > 0 ? Math.min(1, Math.max(0, a.ms / limitMs)) : 1;
  return Math.round(AMIK_TOP * (1 - late / 2));
};

export const AMIK_RULES: RoundRules<AmikQ> = {
  steps: () => 1,
  seconds: () => AMIK_SECONDS,
  ok: () => true,
  typed: true,
  points: (q, a, limitMs) => amikPoints(q, a, limitMs),
  secret: ['id'],
  valid: (q): q is AmikQ => {
    const o = q as Partial<AmikQ>;
    return o.kind === 'amikhseni' && word(o.id, 80) && word(o.theme, 40);
  },
};

/**
 * A game's words: the chosen categories in turn (`drawGame`), in each a word not shown lately (else the one shown longest
 * ago); a word of two categories is one card, under the first.
 */
export const drawAmikhseni = ({ cats, chosen, count, seen, rnd = Math.random }: {
  cats: readonly { id: string; words: readonly string[] }[];
  /** the categories chosen; none (or none known) = all */
  chosen: readonly string[];
  count: number;
  /** words shown in earlier games, oldest first */
  seen: readonly string[];
  rnd?: () => number;
}): AmikQ[] => {
  const all = cats.map(c => c.id);
  const use = chosen.filter(c => all.includes(c));
  const topics = use.length ? use : all;
  const taken = new Set<string>();
  const bank = cats.filter(c => topics.includes(c.id)).flatMap(c => c.words.flatMap(w => {
    const id = w.trim();
    if (!word(id, 80) || taken.has(id)) return [];
    taken.add(id);
    return [{ id, topic: c.id }];
  }));
  return drawGame({ bank, topics: topics.filter(t => bank.some(b => b.topic === t)), count, seen: [...seen], rnd })
    .map(p => ({ kind: 'amikhseni' as const, id: p.id, theme: p.topic }));
};

/**
 * Another word of the round's category, for a host who does not know this one (before anybody answers): one not shown
 * lately, else the one shown longest ago; null when the category has no other.
 */
export const swapAmikhseni = ({ cats, q, seen, rnd = Math.random }: {
  cats: readonly { id: string; words: readonly string[] }[];
  q: Pick<AmikQ, 'id' | 'theme'>;
  /** words shown lately, oldest first (a game's own words are in it from its start) */
  seen: readonly string[];
  rnd?: () => number;
}): AmikQ | null => {
  const words = [...new Set((cats.find(c => c.id === q.theme)?.words ?? []).map(w => w.trim()))].filter(w => word(w, 80) && w !== q.id);
  if (!words.length) return null;
  const age = new Map(seen.map((w, i) => [w, i]));
  const fresh = words.filter(w => !age.has(w));
  const id = fresh.length ? fresh[Math.floor(rnd() * fresh.length)] : words.reduce((a, b) => ((age.get(a) ?? 0) <= (age.get(b) ?? 0) ? a : b));
  return { kind: 'amikhseni', id, theme: q.theme };
};

/** the words a game showed, after the ones before (oldest first), at most AMIK_SEEN_KEEP */
export const rememberAmik = (seen: readonly string[], shown: readonly string[]) =>
  [...seen.filter(w => !shown.includes(w)), ...shown].slice(-AMIK_SEEN_KEEP);
