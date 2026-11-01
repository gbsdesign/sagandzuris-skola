import type { RoundAnswer, RoundRules } from './roundGames';
import { SNIPPETS } from './hangi';
import { shuffle } from './amikhseni';
import { nameKey } from './chantRounds';

// „დღის ჰანგი“ with the class (2026-11-01, the user's „ყველას ონლაინ, ჰიბრიდული და ამოსაბეჭდი“): the daily game's ladder over
// the quick games' rounds — a recording of the school from its very start, 1 second, then 2, 4, 7, 11 and 16 — and four
// names to pick from; every player answers once, the earlier the step the more it earns. Online in a class's room (each on
// their own phone) or on one phone with the class in teams. The recordings are the daily game's pool (data/hangiPool.ts),
// the screens pages/games/hangi/face.tsx. Kept free of the pool's data: the room's store (and so this file) is in the app's
// first bundle.

export interface HangiQ {
  kind: 'hangi';
  /** the pool's item (data/hangiPool.ts) */
  id: string;
  /** the recording, through the audio Worker */
  url: string;
  options: string[];
  right: number;
  /** where it is from: the service and the school, or the song's region */
  sub: string;
  song: boolean;
}

export const HANGI_STEPS = SNIPPETS.length;
/** the step's points: all of them at the step's start, a fifth less by its end */
export const HANGI_TOP = [1000, 850, 700, 550, 400, 250];
/** a step's time: its piece and a little to think */
export const HANGI_THINK = 8;

const stepAt = (step: number) => Math.min(HANGI_STEPS, Math.max(1, step)) - 1;
/** how much of the recording sounds at a step */
export const hangiPiece = (step: number) => SNIPPETS[stepAt(step)];
export const hangiSeconds = (step: number) => hangiPiece(step) + HANGI_THINK;

export const hangiPoints = (q: Pick<HangiQ, 'right'>, a: Pick<RoundAnswer, 'pick' | 'ms' | 'step'>, limitMs: number) => {
  if (a.pick !== q.right) return 0;
  const late = limitMs > 0 ? Math.min(1, Math.max(0, a.ms / limitMs)) : 1;
  return Math.round(HANGI_TOP[stepAt(a.step)] * (1 - late / 5));
};

const text = (v: unknown, max: number) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const isIndex = (n: unknown, len: number) => Number.isInteger(n) && (n as number) >= 0 && (n as number) < len;

export const HANGI_RULES: RoundRules<HangiQ> = {
  steps: () => HANGI_STEPS,
  seconds: (_, step) => hangiSeconds(step),
  ok: (q, pick) => isIndex(pick, q.options.length),
  points: hangiPoints,
  secret: ['id', 'right', 'sub', 'song'],
  valid: (q): q is HangiQ => {
    if (!q || typeof q !== 'object') return false;
    const o = q as Partial<HangiQ>;
    return o.kind === 'hangi' && text(o.id, 200) && text(o.url, 400) && /^https:\/\//.test(o.url as string)
      && Array.isArray(o.options) && o.options.length >= 2 && o.options.length <= 4 && o.options.every(x => text(x, 160))
      && isIndex(o.right, o.options.length) && typeof o.sub === 'string' && o.sub.length <= 200 && typeof o.song === 'boolean';
  },
};

/** the one-phone game: what the host marks for a team — by the seconds its paper names */
export const HANGI_MARKS = [
  ...SNIPPETS.map((s, i) => ({ points: SNIPPETS.length - i, label: `${s} წმ` })),
  { points: 0, label: 'ვერა' },
];

// ——— a game's rounds from the recordings the member may hear

export interface HangiTake { id: string; title: string; sub: string; url: string; kind: 'chant' | 'song' }
/** what sounds: chants and songs, or only one of them */
export type HangiKinds = 'all' | 'chant' | 'song';
export const HANGI_KINDS: readonly HangiKinds[] = ['all', 'chant', 'song'];

/** where a take's wrong names come from first: a chant's service, a song's region */
const groupOf = (t: HangiTake) => (t.kind === 'chant' ? t.sub.split(' · ')[0] : t.sub.split(' · ')[1] ?? '');

/**
 * A game's rounds: a different name each (a chant sung by many choirs is one name), those not asked lately on this phone
 * (`seen`, the pool's ids) first; the three wrong names of the same kind — of the same service, or the same region, while it
 * has enough of them.
 */
export const drawHangiRounds = (
  pool: readonly HangiTake[], count: number, seen: readonly string[] = [], kinds: HangiKinds = 'all', rnd: () => number = Math.random,
): HangiQ[] => {
  const byName = new Map<string, HangiTake[]>();
  pool.forEach(t => {
    if (kinds !== 'all' && t.kind !== kinds) return;
    const k = nameKey(t.title);
    if (k) byName.set(k, [...(byName.get(k) ?? []), t]);
  });
  const names = [...byName.keys()];
  if (names.length < 4) return [];
  const old = new Set(seen);
  const isFresh = (k: string) => byName.get(k)!.some(t => !old.has(t.id));
  const order = [...shuffle(names.filter(isFresh), rnd), ...shuffle(names.filter(k => !isFresh(k)), rnd)];
  return order.slice(0, count).map(k => {
    const takes = byName.get(k)!;
    const unseen = takes.filter(t => !old.has(t.id));
    const list = unseen.length ? unseen : takes;
    const t = list[Math.floor(rnd() * list.length)];
    const others = names.filter(n => n !== k);
    const sameKind = others.filter(n => byName.get(n)!.some(x => x.kind === t.kind));
    const sameGroup = sameKind.filter(n => byName.get(n)!.some(x => x.kind === t.kind && groupOf(x) === groupOf(t)));
    const from = sameGroup.length >= 3 ? sameGroup : sameKind.length >= 3 ? sameKind : others;
    const wrong = shuffle(from, rnd).slice(0, 3).map(n => byName.get(n)![0].title);
    const options = shuffle([t.title, ...wrong], rnd);
    return { kind: 'hangi', id: t.id, url: t.url, options, right: options.indexOf(t.title), sub: t.sub, song: t.kind === 'song' };
  });
};
