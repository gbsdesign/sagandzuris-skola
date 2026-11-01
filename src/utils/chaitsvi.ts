// „ჩაიცვი ქართულად“ (2026-11-01, the plan's Georgian game №8, a dress-up game): dress the chokha — or the Georgian dress — part
// by part in the order it is worn, against the clock. A part put on too early goes back with the reason and costs PENALTY_MS.
// The parts, their pictures and stories are „ჩემი სამოსი“'s own (data/samosiData.ts, data/kabaData.ts); this file only knows
// their order.

export type Outfit = 'chokha' | 'kaba';
export const OUTFITS: Outfit[] = ['chokha', 'kaba'];
export const isOutfit = (v: unknown): v is Outfit => v === 'chokha' || v === 'kaba';

/** the chokha's hat: one of „ჩემი სამოსი“'s hats a game */
export const HAT = 'kudi';
export const HATS = ['papakha', 'kakhuri', 'svanuri', 'kabalakhi'];

export interface DressStep {
  id: string;
  /** what must be on before it */
  needs: string[];
  /** why, said when it comes too early */
  why: string;
}

/** the chokha: the undershirt first, the chokha over it, its cartridges and belt, the dagger on the belt, the hat last */
export const CHOKHA_STEPS: DressStep[] = [
  { id: 'akhalukhi', needs: [], why: '' },
  { id: 'chokha', needs: ['akhalukhi'], why: 'ჩოხა ახალუხზე იცმევა.' },
  { id: 'masrebi', needs: ['chokha'], why: 'მასრები ჩოხის მკერდზეა.' },
  { id: 'kamari', needs: ['chokha'], why: 'ქამარი ჩოხას წელზე ერტყმება.' },
  { id: 'khanjali', needs: ['kamari'], why: 'ხანჯალი ქამარზე ეკიდება.' },
  { id: HAT, needs: ['akhalukhi', 'chokha', 'masrebi', 'kamari', 'khanjali'], why: 'ქუდი ბოლოს იხურება.' },
];
/** the dress: the dress first, its chest panel and sash on it, the overcoat over them, the veil last */
export const KABA_STEPS: DressStep[] = [
  { id: 'kaba', needs: [], why: '' },
  { id: 'gulispiri', needs: ['kaba'], why: 'გულისპირი კაბის მკერდზე მაგრდება.' },
  { id: 'sartqeli', needs: ['kaba'], why: 'სარტყელი კაბას წელზე ერტყმება.' },
  { id: 'katibi', needs: ['kaba', 'gulispiri', 'sartqeli'], why: 'ქათიბი ყველაფერზე ზემოდან იცმევა.' },
  { id: 'lechaki', needs: ['kaba', 'gulispiri', 'sartqeli', 'katibi'], why: 'ლეჩაქი ბოლოს იხურება.' },
];
export const stepsOf = (o: Outfit) => (o === 'kaba' ? KABA_STEPS : CHOKHA_STEPS);

/** a part put on too early costs this much */
export const PENALTY_MS = 3000;

/** what is still missing before `id` may go on (empty = it may) */
export const missingFor = (o: Outfit, on: readonly string[], id: string): string[] =>
  stepsOf(o).find(s => s.id === id)?.needs.filter(n => !on.includes(n)) ?? [];

export type Put = { ok: true; on: string[] } | { ok: false; missing: string[]; why: string };
/** try to put a part on: it goes on when everything under it is on, else it comes back with what is missing and why */
export const tryPut = (o: Outfit, on: readonly string[], id: string): Put => {
  const step = stepsOf(o).find(s => s.id === id);
  if (!step || on.includes(id)) return { ok: true, on: [...on] };
  const missing = missingFor(o, on, id);
  return missing.length ? { ok: false, missing, why: step.why } : { ok: true, on: [...on, id] };
};
export const isDressed = (o: Outfit, on: readonly string[]) => stepsOf(o).every(s => on.includes(s.id));

/** the time that counts: the clock and the mistakes' penalties */
export const scoreMs = (ms: number, mistakes: number) => Math.max(0, Math.round(ms)) + mistakes * PENALTY_MS;
/** 83 400 ms → „1:23.4“, 9 800 → „9.8“ */
export const timeText = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 100)) / 10;
  const m = Math.floor(t / 60);
  const s = (t - m * 60).toFixed(1);
  return m ? `${m}:${s.padStart(4, '0')}` : s;
};

/** a fixed shuffle of the tray for a seed (so the order of the buttons gives nothing away) */
export const shuffled = <T,>(items: readonly T[], seed: number): T[] => {
  let s = (seed >>> 0) || 1;
  const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
};

// ---- the teams on one phone: each team dresses in turn, the fastest wins ----
export interface DressTeams {
  outfit: Outfit;
  names: boolean;
  teams: string[];
  /** each team's time that counts (null = not yet) and its mistakes */
  results: ({ ms: number; mistakes: number } | null)[];
  seed: number;
}
export const newDressTeams = (teams: string[], outfit: Outfit, names: boolean, seed: number): DressTeams =>
  ({ outfit, names, teams: [...teams], results: teams.map(() => null), seed });
/** whose turn it is (null when every team has dressed) */
export const turnOf = (g: DressTeams) => { const i = g.results.findIndex(r => r === null); return i < 0 ? null : i; };
export const recordTurn = (g: DressTeams, ms: number, mistakes: number): DressTeams => {
  const i = turnOf(g);
  if (i === null) return g;
  return { ...g, results: g.results.map((r, k) => (k === i ? { ms: scoreMs(ms, mistakes), mistakes } : r)) };
};
/** the teams by time, fastest first (ties share a place) */
export const ranking = (g: DressTeams) => g.results
  .map((r, i) => ({ i, name: g.teams[i], ms: r?.ms ?? Infinity, mistakes: r?.mistakes ?? 0 }))
  .filter(x => Number.isFinite(x.ms))
  .sort((a, b) => a.ms - b.ms || a.i - b.i)
  .map((x, k, all) => ({ ...x, place: all.findIndex(y => y.ms === x.ms) + 1 }));

export const parseDressTeams = (raw: unknown): DressTeams | null => {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Partial<DressTeams>;
  if (!isOutfit(o.outfit) || !Array.isArray(o.teams) || !Array.isArray(o.results) || o.teams.length < 2 || o.teams.length > 6) return null;
  if (o.results.length !== o.teams.length || !o.teams.every(t => typeof t === 'string')) return null;
  const results = o.results.map(r => (r && typeof r === 'object' && typeof r.ms === 'number' && typeof r.mistakes === 'number' ? { ms: r.ms, mistakes: r.mistakes } : null));
  return { outfit: o.outfit, names: o.names !== false, teams: o.teams, results, seed: typeof o.seed === 'number' ? o.seed : 1 };
};
