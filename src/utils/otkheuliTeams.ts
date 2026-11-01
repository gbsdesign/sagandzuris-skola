import { GROUP_SIZE, GROUPS_PER_GRID, checkPick, sameSet, type OtkheuliGrid, type OtkheuliGroup } from './otkheuli';
import { MAX_TEAMS, MIN_TEAMS } from './roundGames';

// „ოთხეული“ on one phone (the plan's hybrid, 2026-11-01): the grid on the screen, 2–6 teams in turn pick four. A group found
// is the team's (OTK_FIND points) and, before its name shows, the team says what joins the four — the host marks it
// (OTK_LINK more). Every pick passes the turn, a wrong one too („ერთი აკლია!“ helps the next team); the clock's end passes
// it without a pick. Once three groups are found the last four join by themselves and the next team may name their link.
// A game = 1–3 grids, each begun by the next team. Pure; tests in tests/otkheuliTeams.test.ts; the screen
// pages/games/otkheuli/Teams.tsx.

export const OTK_FIND = 2;
export const OTK_LINK = 1;
export const OTK_GRIDS = [1, 2, 3] as const;
export const OTK_TURN_SECONDS = [30, 60, 90] as const;
/** a group's finder: a team, or nobody yet, or nobody — the last four that joined by themselves */
export const NOT_YET = -1;
export const BY_ITSELF = -2;

export type OtkLast = { team: number; kind: 'solved' | 'oneAway' | 'wrong' | 'time' };

export interface OtkTeams {
  v: 1;
  names: string[];
  /** grids in the game, and this one's place (from 0) */
  count: number;
  at: number;
  grid: OtkheuliGrid;
  /** the groups of the grids played before this one (a game asks none twice) */
  used: string[];
  /** this grid's picks, as the daily record keeps them: '+' or '-', then the four words */
  moves: string[];
  /** per group of `grid.groups`: who found it (a team, NOT_YET or BY_ITSELF) and whether its link was named */
  owner: number[];
  linked: boolean[];
  scores: number[];
  /** who began this grid; whose turn it is; the turn's clock */
  first: number;
  turn: number;
  secs: number;
  t0: number;
  /** a group just found (or the last four) whose link `team` may name — the host's answer waits */
  ask: { group: number; team: number } | null;
  last: OtkLast | null;
  /** 'grid' = this grid is done and shown; 'over' = the game */
  phase: 'play' | 'grid' | 'over';
}

const nextTeam = (g: Pick<OtkTeams, 'names'>, t: number) => (t + 1) % g.names.length;

export const newOtkTeams = (names: string[], count: number, secs: number, grid: OtkheuliGrid, now: number): OtkTeams => ({
  v: 1,
  names,
  count,
  at: 0,
  grid,
  used: [],
  moves: [],
  owner: grid.groups.map(() => NOT_YET),
  linked: grid.groups.map(() => false),
  scores: names.map(() => 0),
  first: 0,
  turn: 0,
  secs,
  t0: now,
  ask: null,
  last: null,
  phase: 'play',
});

/** the tiles still on the board, in the grid's order */
export const otkLeft = (g: Pick<OtkTeams, 'grid' | 'owner'>) => {
  const gone = new Set(g.grid.groups.flatMap((x, i) => (g.owner[i] === NOT_YET ? [] : x.words)));
  return g.grid.tiles.filter(w => !gone.has(w));
};

export const otkTried = (g: Pick<OtkTeams, 'moves'>, picked: string[]) => g.moves.some(m => sameSet(m.slice(1).split('|'), picked));

/** the team on turn picks four (new ones — the screen refuses a four already tried) */
export const otkPick = (g: OtkTeams, picked: string[], now: number): OtkTeams => {
  if (g.phase !== 'play' || g.ask || picked.length !== GROUP_SIZE) return g;
  const verdict = checkPick(g.grid, picked);
  const team = g.turn;
  const moves = [...g.moves, `${verdict.kind === 'solved' ? '+' : '-'}${picked.join('|')}`];
  if (verdict.kind !== 'solved') {
    return { ...g, moves, turn: nextTeam(g, team), t0: now, last: { team, kind: verdict.kind } };
  }
  const gi = g.grid.groups.indexOf(verdict.group);
  if (g.owner[gi] !== NOT_YET) return g;
  const owner = g.owner.map((o, i) => (i === gi ? team : o));
  const scores = g.scores.map((s, t) => (t === team ? s + OTK_FIND : s));
  return { ...g, moves, owner, scores, ask: { group: gi, team }, last: { team, kind: 'solved' } };
};

/** the host's answer: did the team name what joins the four? Then the last four join by themselves (the next team is
 *  asked their link), or the grid is done, or the turn moves on */
export const otkLink = (g: OtkTeams, named: boolean, now: number): OtkTeams => {
  if (!g.ask) return g;
  const { group, team } = g.ask;
  const linked = g.linked.map((l, i) => (i === group ? named : l));
  const scores = named ? g.scores.map((s, t) => (t === team ? s + OTK_LINK : s)) : g.scores;
  const open = g.owner.flatMap((o, i) => (o === NOT_YET ? [i] : []));
  if (open.length === 1) {
    const owner = g.owner.map((o, i) => (i === open[0] ? BY_ITSELF : o));
    return { ...g, linked, scores, owner, ask: { group: open[0], team: nextTeam(g, team) } };
  }
  if (!open.length) return { ...g, linked, scores, ask: null, phase: 'grid' };
  return { ...g, linked, scores, ask: null, turn: nextTeam(g, team), t0: now };
};

/** the turn's clock ran out: the next team */
export const otkTime = (g: OtkTeams, now: number): OtkTeams =>
  (g.phase !== 'play' || g.ask ? g : { ...g, turn: nextTeam(g, g.turn), t0: now, last: { team: g.turn, kind: 'time' } });

/** after a grid: the next one (`grid` = a new grid of groups not used yet), begun by the next team — or the game's end */
export const otkNext = (g: OtkTeams, grid: OtkheuliGrid | undefined, now: number): OtkTeams => {
  if (g.phase !== 'grid') return g;
  if (g.at + 1 >= g.count || !grid) return { ...g, phase: 'over' };
  const first = nextTeam(g, g.first);
  return {
    ...g,
    at: g.at + 1,
    grid,
    used: [...g.used, ...g.grid.groups.map(x => x.id)],
    moves: [],
    owner: grid.groups.map(() => NOT_YET),
    linked: grid.groups.map(() => false),
    first,
    turn: first,
    t0: now,
    ask: null,
    last: null,
    phase: 'play',
  };
};

/** every group's id of this game so far (for the next grid's groups) */
export const otkUsed = (g: Pick<OtkTeams, 'used' | 'grid'>) => [...g.used, ...g.grid.groups.map(x => x.id)];

// ——— a game kept on the phone, read back with care
const isGroup = (x: unknown): x is OtkheuliGroup => {
  const o = x as Partial<OtkheuliGroup> | null;
  return !!o && typeof o.id === 'string' && typeof o.label === 'string' && Array.isArray(o.words) && o.words.length === GROUP_SIZE
    && o.words.every(w => typeof w === 'string');
};
const isGrid = (x: unknown): x is OtkheuliGrid => {
  const o = x as Partial<OtkheuliGrid> | null;
  if (!o || typeof o.key !== 'string' || !Array.isArray(o.groups) || o.groups.length !== GROUPS_PER_GRID || !o.groups.every(isGroup)) return false;
  const words = o.groups.flatMap(gr => gr.words);
  return Array.isArray(o.tiles) && o.tiles.length === words.length && sameSet(o.tiles as string[], words);
};
const int = (x: unknown, lo: number, hi: number) => Number.isInteger(x) && (x as number) >= lo && (x as number) <= hi;

export const parseOtkTeams = (raw: unknown): OtkTeams | null => {
  const g = raw as Partial<OtkTeams> | null;
  if (!g || g.v !== 1 || !isGrid(g.grid)) return null;
  const names = g.names;
  if (!Array.isArray(names) || names.length < MIN_TEAMS || names.length > MAX_TEAMS || !names.every(n => typeof n === 'string')) return null;
  const n = names.length;
  const four = GROUPS_PER_GRID;
  if (!int(g.count, 1, 9) || !int(g.at, 0, (g.count as number) - 1) || !int(g.first, 0, n - 1) || !int(g.turn, 0, n - 1)) return null;
  if (!Array.isArray(g.owner) || g.owner.length !== four || !g.owner.every(o => int(o, BY_ITSELF, n - 1))) return null;
  if (!Array.isArray(g.linked) || g.linked.length !== four || !g.linked.every(l => typeof l === 'boolean')) return null;
  if (!Array.isArray(g.scores) || g.scores.length !== n || !g.scores.every(s => int(s, 0, 9999))) return null;
  if (!Array.isArray(g.moves) || !g.moves.every(m => typeof m === 'string')) return null;
  if (!Array.isArray(g.used) || !g.used.every(u => typeof u === 'string')) return null;
  if (!int(g.secs, 5, 600) || typeof g.t0 !== 'number') return null;
  if (g.phase !== 'play' && g.phase !== 'grid' && g.phase !== 'over') return null;
  const ask = g.ask && int(g.ask.group, 0, four - 1) && int(g.ask.team, 0, n - 1) ? { group: g.ask.group, team: g.ask.team } : null;
  const last = g.last && int(g.last.team, 0, n - 1) && ['solved', 'oneAway', 'wrong', 'time'].includes(g.last.kind) ? g.last : null;
  return {
    v: 1, names, count: g.count as number, at: g.at as number, grid: g.grid, used: g.used, moves: g.moves, owner: g.owner,
    linked: g.linked, scores: g.scores, first: g.first as number, turn: g.turn as number, secs: g.secs as number, t0: g.t0,
    ask, last, phase: g.phase,
  };
};
