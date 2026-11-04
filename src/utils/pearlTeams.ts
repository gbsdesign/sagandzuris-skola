import { CHESTS } from '../data/pearls';
import { POLISH_PCT } from './pearls';

// „მარგალიტები“ on one phone — the hub's „ჰიბრიდული“ (2026-11-04), „კლასის სკივრი“: 2–6 teams in turn take the phone, each turn
// a pearl of the chosen chest; the team picks a voice, hears its first phrase and sings it into the phone, scored as the pearls
// are (pages/games/turniri/Sing.tsx over utils/pitch.ts). A take's per cent is the team's points; 80 % polishes the pearl —
// on the class's own chest too, kept on this phone (the best take in each voice), so lesson by lesson the class fills its
// three chests. The pearls the class has polished least come first. Pure, tested in tests/pearlTeams.test.ts.

export const PER_TEAM = [2, 3, 4] as const;
export type Voice3 = 0 | 1 | 2;

/** a turn's take: its per cent and the voice sung (0 = I); null = skipped */
export type Take = { pct: number; voice: Voice3 } | null;

export interface PearlTeams {
  chest: string;
  teams: string[];
  /** the game's pearls, a turn each: team t sings turns t, t + n, t + 2n… */
  order: string[];
  takes: Take[];
}

/** the class's chest on this phone: a pearl's best per cent in each voice (I, II, III; -1 = not sung) */
export type ClassChest = Record<string, [number, number, number]>;

const voicesOf = (c: ClassChest, id: string): [number, number, number] => c[id] ?? [-1, -1, -1];
/** how many voices of a pearl the class has polished */
export const polishedVoices = (c: ClassChest, id: string) => voicesOf(c, id).filter(p => p >= POLISH_PCT).length;

const shuffled = <T,>(list: readonly T[], rnd: () => number) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** a game: `perTeam` pearls a team, those the class has polished in fewest voices first (shuffled among equals) */
export const newPearlTeams = ({ chest, teams, perTeam, have = {}, rnd = Math.random }: {
  chest: string; teams: readonly string[]; perTeam: number; have?: ClassChest; rnd?: () => number;
}): PearlTeams | null => {
  const c = CHESTS.find(x => x.id === chest);
  if (!c || teams.length < 1 || perTeam < 1) return null;
  const ranked = [0, 1, 2, 3].flatMap(k => shuffled(c.pearls.filter(id => polishedVoices(have, id) === k), rnd));
  const count = teams.length * perTeam;
  const order = Array.from({ length: count }, (_, i) => ranked[i % ranked.length]);
  return { chest, teams: [...teams], order, takes: [] };
};

export const turnOf = (g: PearlTeams) => g.takes.length;
export const isOver = (g: PearlTeams) => g.takes.length >= g.order.length;
export const teamOf = (g: PearlTeams, turn: number) => turn % g.teams.length;

/** the take of the turn on: a per cent 0–100, or null to skip it */
export const recordTake = (g: PearlTeams, pct: number | null, voice: number): PearlTeams => {
  if (isOver(g)) return g;
  const take: Take = pct === null ? null : { pct: Math.max(0, Math.min(100, Math.round(pct))), voice: (voice === 1 || voice === 2 ? voice : 0) };
  return { ...g, takes: [...g.takes, take] };
};
export const undoTake = (g: PearlTeams): PearlTeams => ({ ...g, takes: g.takes.slice(0, -1) });

/** each team's points (the per cents of its takes) and pearls polished in this game */
export const teamScores = (g: PearlTeams) => g.teams.map((_, t) => g.takes.reduce((s, k, i) => (k && teamOf(g, i) === t ? s + k.pct : s), 0));
export const teamPolished = (g: PearlTeams) => g.teams.map((_, t) => g.takes.filter((k, i) => k && teamOf(g, i) === t && k.pct >= POLISH_PCT).length);

/** the teams by points (then pearls polished), a place each — equal ones share it */
export const standings = (g: PearlTeams) => {
  const pts = teamScores(g);
  const pol = teamPolished(g);
  const rows = g.teams.map((name, i) => ({ i, name, points: pts[i], polished: pol[i] }))
    .sort((a, b) => b.points - a.points || b.polished - a.polished || a.i - b.i);
  let place = 0;
  return rows.map((r, k) => {
    if (k === 0 || rows[k - 1].points !== r.points || rows[k - 1].polished !== r.polished) place = k + 1;
    return { ...r, place };
  });
};

/** the class's chest after a take: its voice keeps its best */
export const chestPatch = (c: ClassChest, id: string, take: Take): ClassChest => {
  if (!take) return c;
  const v = [...voicesOf(c, id)] as [number, number, number];
  if (take.pct <= v[take.voice]) return c;
  v[take.voice] = take.pct;
  return { ...c, [id]: v };
};

/** the class's chest with a game's takes on it (kept apart while the game goes on, so a take can be undone) */
export const chestWith = (c: ClassChest, g: PearlTeams): ClassChest => g.takes.reduce((acc, k, i) => chestPatch(acc, g.order[i], k), c);

/** a chest's pearls the class has polished (in a voice at least) and golden ones (all three) */
export const chestCounts = (c: ClassChest, chest: string) => {
  const ids = CHESTS.find(x => x.id === chest)?.pearls ?? [];
  return { polished: ids.filter(id => polishedVoices(c, id) > 0).length, golden: ids.filter(id => polishedVoices(c, id) === 3).length, total: ids.length };
};

const isPct = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= -1 && v <= 100;
export const parseClassChest = (raw: unknown): ClassChest => {
  const out: ClassChest = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(v) && v.length === 3 && v.every(isPct) && CHESTS.some(c => c.pearls.includes(id))) out[id] = v as [number, number, number];
  }
  return out;
};

export const parsePearlTeams = (raw: unknown): PearlTeams | null => {
  const o = (raw && typeof raw === 'object' ? raw : null) as Partial<PearlTeams> | null;
  const c = o && CHESTS.find(x => x.id === o.chest);
  if (!o || !c || !Array.isArray(o.teams) || !o.teams.length || o.teams.length > 6 || !o.teams.every(t => typeof t === 'string')) return null;
  if (!Array.isArray(o.order) || !o.order.length || !o.order.every(id => c.pearls.includes(id))) return null;
  if (!Array.isArray(o.takes) || o.takes.length > o.order.length) return null;
  const okTake = (k: unknown) => k === null || (!!k && typeof k === 'object' && isPct((k as { pct: unknown }).pct) && [0, 1, 2].includes((k as { voice: number }).voice));
  if (!o.takes.every(okTake)) return null;
  return { chest: c.id, teams: o.teams, order: o.order, takes: o.takes };
};
