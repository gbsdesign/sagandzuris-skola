import type { RoundAnswer, RoundRules } from './roundGames';
import { shuffle } from './amikhseni';

// „ხმა-ხმად“ (like Bandle) and „სამ ნოტში!“ (like Name That Tune), 2026-10-31, the tender's five: a well-known chant sounds
// on the synthesizer from its book notes, a little more at each step — the bass alone, then with the middle voice, then all
// three voices; or the top voice's first three notes, then six, then its whole first phrase. Every player answers once,
// with one of four chants' names: the earlier the step, the more it earns. The chants are the pearls' sixty (წირვა,
// მწუხრი, ცისკარი) and the class's program (data/chantGamePool.ts); the sound pages/games/rounds/useSnippet.ts; the screens
// pages/games/chants/. Kept free of the chants' data, since the room's store (and so this file) is in the app's first bundle.

export type ChantGame = 'khmebi' | 'notebi';

/** one round: a chant to name, and four names to pick from */
export interface ChantRound {
  /** the chant's version (data/chantLookup.ts) */
  id: string;
  /** its book notes: public/notes/<book>/<num>.json (utils/chantSynth.ts loadBookScore) */
  book: string;
  num: number;
  options: string[];
  right: number;
  /** the service it is sung at */
  service: string;
}
export type KhmebiQ = ChantRound & { kind: 'khmebi' };
export type NotebiQ = ChantRound & { kind: 'notebi' };
export type ChantRoundQ = KhmebiQ | NotebiQ;

export const CHANT_STEPS = 3;
/** the step's points: all of them at the first step's start, a fifth less by its end */
export const STEP_TOP = [1000, 650, 350];

/** „ხმა-ხმად“: the voices that sound at each step, from this one down (0 = I, the top; 2 = III, the bass) — the bass
 * alone, then with the middle voice, then all three */
export const KHMEBI_FROM = [2, 1, 0];
export const KHMEBI_SECONDS = 20;
/** how long the opening plays at each step */
export const KHMEBI_CLIP = 16;
/** „სამ ნოტში!“: the top voice's notes at each step — so many different pitches, begun within so many seconds; the last
 * step its whole first phrase */
export const NOTEBI_CUTS: readonly { pitches: number; within: number }[] = [{ pitches: 3, within: 7 }, { pitches: 6, within: 11 }, { pitches: 0, within: 0 }];
export const NOTEBI_SECONDS = [12, 15, 20];

export const chantPoints = (q: Pick<ChantRoundQ, 'right'>, a: Pick<RoundAnswer, 'pick' | 'ms' | 'step'>, limitMs: number) => {
  if (a.pick !== q.right) return 0;
  const top = STEP_TOP[Math.min(STEP_TOP.length, Math.max(1, a.step)) - 1];
  const late = limitMs > 0 ? Math.min(1, Math.max(0, a.ms / limitMs)) : 1;
  return Math.round(top * (1 - late / 5));
};

const text = (v: unknown, max: number) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const isIndex = (n: unknown, len: number) => Number.isInteger(n) && (n as number) >= 0 && (n as number) < len;

const rulesFor = <Q extends ChantRoundQ>(kind: Q['kind'], seconds: (step: number) => number): RoundRules<Q> => ({
  steps: () => CHANT_STEPS,
  seconds: (_, step) => seconds(step),
  ok: (q, pick) => isIndex(pick, q.options.length),
  points: chantPoints,
  secret: ['id', 'right', 'service'],
  valid: (q): q is Q => {
    if (!q || typeof q !== 'object') return false;
    const o = q as Partial<ChantRoundQ>;
    return o.kind === kind && text(o.id, 120) && text(o.book, 40) && Number.isInteger(o.num) && (o.num as number) > 0
      && Array.isArray(o.options) && o.options.length >= 2 && o.options.length <= 4 && o.options.every(x => text(x, 160))
      && isIndex(o.right, o.options.length) && text(o.service, 60);
  },
});

export const KHMEBI_RULES = rulesFor<KhmebiQ>('khmebi', () => KHMEBI_SECONDS);
export const NOTEBI_RULES = rulesFor<NotebiQ>('notebi', step => NOTEBI_SECONDS[Math.min(CHANT_STEPS, Math.max(1, step)) - 1]);

/** the one-phone game: what the host marks for a team — by the step its paper names */
export const KHMEBI_MARKS = [
  { points: 3, label: 'ბანით' },
  { points: 2, label: 'ორი ხმით' },
  { points: 1, label: 'სამივეთი' },
  { points: 0, label: 'ვერა' },
] as const;
export const NOTEBI_MARKS = [
  { points: 3, label: '3 ნოტით' },
  { points: 2, label: '6 ნოტით' },
  { points: 1, label: 'ფრაზით' },
  { points: 0, label: 'ვერა' },
] as const;

// ——— a game's rounds from the chants it knows

export interface KnownChant {
  id: string;
  title: string;
  service: string;
  book: string;
  num: number;
}

/** two names are one when they differ only in signs, brackets, case or the old spelling (თაყუანის = თაყვანის, დიდებაჲ = დიდება) */
export const nameKey = (s: string) => s.replace(/\([^)]*\)/g, ' ').toLowerCase().replace(/[„“"'«».,!?;:–—\-]/g, ' ')
  .replace(/ვ/g, 'უ').replace(/ჲ/g, '').replace(/\s+/g, ' ').trim();

/**
 * A game's rounds: a different chant each (one name once), those not asked lately on this phone (`seen`, version ids)
 * first; the three wrong names from the same service while it has enough of them, else from all.
 */
export const drawChantRounds = (kind: ChantGame, pool: KnownChant[], count: number, seen: readonly string[] = [], rnd: () => number = Math.random): ChantRoundQ[] => {
  const byName = new Map<string, KnownChant[]>();
  pool.forEach(c => { const k = nameKey(c.title); if (k) byName.set(k, [...(byName.get(k) ?? []), c]); });
  const names = [...byName.keys()];
  if (names.length < 4) return [];
  const old = new Set(seen);
  const fresh = shuffle(names.filter(k => byName.get(k)!.some(c => !old.has(c.id))), rnd);
  const rest = shuffle(names.filter(k => !fresh.includes(k)), rnd);
  return [...fresh, ...rest].slice(0, count).map(k => {
    const versions = byName.get(k)!;
    const unseen = versions.filter(c => !old.has(c.id));
    const list = unseen.length ? unseen : versions;
    const c = list[Math.floor(rnd() * list.length)];
    const sameService = names.filter(n => n !== k && byName.get(n)!.some(x => x.service === c.service));
    const others = sameService.length >= 3 ? sameService : names.filter(n => n !== k);
    const wrong = shuffle(others, rnd).slice(0, 3).map(n => byName.get(n)![0].title);
    const options = shuffle([c.title, ...wrong], rnd);
    return { kind, id: c.id, book: c.book, num: c.num, options, right: options.indexOf(c.title), service: c.service };
  });
};

/** the chants' versions to remember as asked (oldest first, at most `keep`) */
export const rememberChants = (seen: string[], asked: string[], keep = 120): string[] =>
  [...seen.filter(id => !asked.includes(id)), ...asked].slice(-keep);
