import type { RoundAnswer, RoundRules } from './roundGames';
import { shuffle } from './amikhseni';
import { nameKey, type KnownChant } from './chantRounds';

// „ხმების ტურნირი“ (like SingStar), 2026-10-31, the tender's five — the user's answer: a table of scores, everyone sings
// the same phrase in their own voice, three rounds. A round is a well-known chant's first phrase (data/chantGamePool.ts):
// each singer picks their voice (I, II, III), hears its phrase from the book notes and sings it into the phone; the phone
// counts the share of its notes sung right, in any key (utils/pitch.ts scoreSinging, as the pearls do) — that share is
// the round's points. Online every player sings on their own phone and sends it; on one phone it is passed hand to hand.
// Kept free of the chants' data, since the room's store (and so this file) is in the app's first bundle.

export interface TurniriQ {
  kind: 'turniri';
  /** the chant's version (data/chantLookup.ts) */
  id: string;
  title: string;
  service: string;
  /** its book notes: public/notes/<book>/<num>.json */
  book: string;
  num: number;
}

export const TURNIRI_ROUNDS = 3;
export const TURNIRI_SECONDS = 90;

/** a take's points: the share of the phrase's notes sung right, in per cent */
export const turniriPoints = (a: Pick<RoundAnswer, 'pick'>) => Math.max(0, Math.min(100, Math.round(a.pick)));

const text = (v: unknown, max: number) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;

export const TURNIRI_RULES: RoundRules<TurniriQ> = {
  steps: () => 1,
  seconds: () => TURNIRI_SECONDS,
  ok: (_, pick) => Number.isInteger(pick) && pick >= 0 && pick <= 100,
  points: (_, a) => turniriPoints(a),
  secret: [],
  valid: (q): q is TurniriQ => {
    if (!q || typeof q !== 'object') return false;
    const o = q as Partial<TurniriQ>;
    return o.kind === 'turniri' && text(o.id, 120) && text(o.title, 160) && text(o.service, 60) && text(o.book, 40)
      && Number.isInteger(o.num) && (o.num as number) > 0;
  },
};

/** a game's phrases: a different chant each (one name once), those not sung lately on this phone (`seen`) first */
export const drawTurniri = (pool: KnownChant[], count: number, seen: readonly string[] = [], rnd: () => number = Math.random): TurniriQ[] => {
  const byName = new Map<string, KnownChant[]>();
  pool.forEach(c => { const k = nameKey(c.title); if (k) byName.set(k, [...(byName.get(k) ?? []), c]); });
  const old = new Set(seen);
  const names = [...byName.keys()];
  const fresh = shuffle(names.filter(k => byName.get(k)!.some(c => !old.has(c.id))), rnd);
  const rest = shuffle(names.filter(k => !fresh.includes(k)), rnd);
  return [...fresh, ...rest].slice(0, count).map(k => {
    const versions = byName.get(k)!;
    const unseen = versions.filter(c => !old.has(c.id));
    const list = unseen.length ? unseen : versions;
    const c = list[Math.floor(rnd() * list.length)];
    return { kind: 'turniri', id: c.id, title: c.title, service: c.service, book: c.book, num: c.num };
  });
};
