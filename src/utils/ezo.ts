import { EZO_GAMES, EZO_FIGURES, EZO_QUIZ_MORE, type EzoId } from '../data/ezoGames';
import { mulberry32, shuffle } from './otkheuli';

// „ეზოს მსაჯი“ (2026-11-04): the referee's rules — the class's season of yard games, the fair split into two teams by it,
// a teams game's clock and points, the hopscotch's turns, hide-and-seek's marks, the statues' stops and the rules quiz.
// Everything here is plain data kept on the teacher's phone (pages/games/ezo/store.ts); nothing is sent.

// ——— the season

export interface EzoRound {
  id: string;
  game: EzoId;
  /** when it ended */
  at: number;
  /** who played (names) */
  players: string[];
  winners: string[];
  /** a teams game that ended level: everybody in it gets a draw */
  draw?: boolean;
  teams?: [string[], string[]];
  score?: [number, number];
}

export interface EzoSeason { start: number; log: EzoRound[] }

export const MAX_LOG = 300;
export const WIN_POINTS = 3;
export const DRAW_POINTS = 1;

export const newSeason = (now: number): EzoSeason => ({ start: now, log: [] });
export const recordRound = (s: EzoSeason, r: EzoRound): EzoSeason => ({ ...s, log: [...s.log, r].slice(-MAX_LOG) });
export const dropLast = (s: EzoSeason): EzoSeason => ({ ...s, log: s.log.slice(0, -1) });

export interface EzoStanding { name: string; played: number; wins: number; draws: number; points: number }

/** the table: a win 3, a draw 1; ahead — more points, then more wins, then fewer games */
export const standings = (s: EzoSeason): EzoStanding[] => {
  const rows = new Map<string, EzoStanding>();
  for (const r of s.log) {
    const won = new Set(r.winners);
    for (const name of new Set(r.players)) {
      let x = rows.get(name);
      if (!x) rows.set(name, (x = { name, played: 0, wins: 0, draws: 0, points: 0 }));
      x.played++;
      if (won.has(name)) { x.wins++; x.points += WIN_POINTS; }
      else if (r.draw) { x.draws++; x.points += DRAW_POINTS; }
    }
  }
  return [...rows.values()].sort((a, b) => b.points - a.points || b.wins - a.wins || a.played - b.played || a.name.localeCompare(b.name, 'ka'));
};

/** places with ties: equal points share a place */
export const placesOfRows = (rows: EzoStanding[]) => rows.map(r => 1 + rows.filter(o => o.points > r.points).length);

/** how strong the season says one is, 0…1 (one never seen = ½; a draw is half a win) */
export const strengthOf = (st: EzoStanding | undefined) => (st ? (st.wins + st.draws / 2 + 1) / (st.played + 2) : 0.5);

// ——— the fair split

/** two teams of the names: the strongest by the season spread snake-wise (A B B A …), ties in a seeded order,
 *  the sizes differ by one at most */
export const splitTeams = (names: string[], s: EzoSeason, seed: number): [string[], string[]] => {
  const st = new Map(standings(s).map(x => [x.name, x]));
  const rnd = mulberry32(seed);
  const order = shuffle([...new Set(names)], rnd)
    .map(n => ({ n, v: strengthOf(st.get(n)) }))
    .sort((a, b) => b.v - a.v);
  const a: string[] = [];
  const b: string[] = [];
  order.forEach((x, i) => (i % 4 === 0 || i % 4 === 3 ? a : b).push(x.n));
  return rnd() < 0.5 ? [a, b] : [b, a];
};

/** one name to the other team */
export const movePlayer = (teams: [string[], string[]], name: string): [string[], string[]] => {
  const from = teams[0].includes(name) ? 0 : teams[1].includes(name) ? 1 : -1;
  if (from < 0) return teams;
  const next: [string[], string[]] = [teams[0].filter(n => n !== name), teams[1].filter(n => n !== name)];
  next[1 - from].push(name);
  return next;
};

/** the names still in the list, the new ones to the smaller team */
export const keepTeams = (teams: [string[], string[]], names: string[]): [string[], string[]] => {
  const here = new Set(names);
  const next: [string[], string[]] = [teams[0].filter(n => here.has(n)), teams[1].filter(n => here.has(n))];
  for (const n of names) if (!next[0].includes(n) && !next[1].includes(n)) next[next[0].length <= next[1].length ? 0 : 1].push(n);
  return next;
};

/** a team's season wins together (the split's balance, shown to the referee) */
export const teamWins = (team: string[], s: EzoSeason) => {
  const st = new Map(standings(s).map(x => [x.name, x]));
  return team.reduce((sum, n) => sum + (st.get(n)?.wins ?? 0), 0);
};

// ——— a teams game

export interface EzoMatch {
  game: EzoId;
  teams: [string[], string[]];
  /** the round's length */
  ms: number;
  /** the clock's run before `t0` */
  spent: number;
  /** when the clock last started; 0 = stopped */
  t0: number;
  /** the points in order: whose and when on the game's clock */
  points: { team: 0 | 1; at: number }[];
  /** the start whistle was blown */
  kicked: boolean;
  ended: boolean;
}

export const LAST_MINUTE = 60_000;

export const newMatch = (game: EzoId, teams: [string[], string[]], minutes: number): EzoMatch =>
  ({ game, teams: [[...teams[0]], [...teams[1]]], ms: Math.round(minutes * 60_000), spent: 0, t0: 0, points: [], kicked: false, ended: false });

export const runMs = (m: EzoMatch, now: number) => Math.min(m.ms, m.spent + (m.t0 ? Math.max(0, now - m.t0) : 0));
export const leftMs = (m: EzoMatch, now: number) => m.ms - runMs(m, now);
export const kickOff = (m: EzoMatch, now: number): EzoMatch => (m.kicked || m.ended ? m : { ...m, kicked: true, t0: now });
export const pauseMatch = (m: EzoMatch, now: number): EzoMatch => (m.t0 ? { ...m, spent: runMs(m, now), t0: 0 } : m);
export const resumeMatch = (m: EzoMatch, now: number): EzoMatch => (m.t0 || m.ended || !m.kicked ? m : { ...m, t0: now });
export const addPoint = (m: EzoMatch, team: 0 | 1, now: number): EzoMatch => (m.ended || !m.kicked ? m : { ...m, points: [...m.points, { team, at: runMs(m, now) }] });
export const undoPoint = (m: EzoMatch): EzoMatch => ({ ...m, points: m.points.slice(0, -1) });
export const endMatch = (m: EzoMatch, now: number): EzoMatch => ({ ...pauseMatch(m, now), ended: true });

export const scoreOf = (m: Pick<EzoMatch, 'points'>): [number, number] =>
  [m.points.filter(p => p.team === 0).length, m.points.filter(p => p.team === 1).length];

export const matchWinner = (m: Pick<EzoMatch, 'points'>): 0 | 1 | null => {
  const [a, b] = scoreOf(m);
  return a === b ? null : a > b ? 0 : 1;
};

/** the season's line of an ended teams game */
export const matchRound = (m: EzoMatch, now: number, id: string): EzoRound => {
  const w = matchWinner(m);
  return {
    id, game: m.game, at: now,
    players: [...m.teams[0], ...m.teams[1]],
    winners: w === null ? [] : [...m.teams[w]],
    draw: w === null,
    teams: [[...m.teams[0]], [...m.teams[1]]],
    score: scoreOf(m),
  };
};

// ——— hopscotch: one at a time, a miss passes the turn

export const KLASI = 10;
export type TurnMove = 'ok' | 'miss';
export interface EzoTurns { players: string[]; moves: TurnMove[] }
export interface TurnsView { level: number[]; turn: number; winner: number | null }

/** the turns replayed: `level` = the classes each has passed, `turn` = who jumps now, `winner` = who passed the tenth */
export const turnsView = (t: EzoTurns): TurnsView => {
  const level = t.players.map(() => 0);
  let turn = 0;
  let winner: number | null = null;
  if (!t.players.length) return { level, turn, winner };
  for (const mv of t.moves) {
    if (winner !== null) break;
    if (mv === 'ok') {
      level[turn]++;
      if (level[turn] >= KLASI) winner = turn;
    } else turn = (turn + 1) % t.players.length;
  }
  return { level, turn, winner };
};

export const turnsMove = (t: EzoTurns, mv: TurnMove): EzoTurns => (turnsView(t).winner !== null ? t : { ...t, moves: [...t.moves, mv] });
export const turnsUndo = (t: EzoTurns): EzoTurns => ({ ...t, moves: t.moves.slice(0, -1) });

// ——— hide and seek: every hider found, safe or still hidden

export type SeekMark = 'hidden' | 'found' | 'safe';
export interface EzoSeek { seeker: string; hiders: string[]; marks: Record<string, SeekMark>; found: string[] }

export const newSeek = (seeker: string, players: string[]): EzoSeek => ({ seeker, hiders: players.filter(n => n !== seeker), marks: {}, found: [] });

/** a tap on a hider: hidden → found → safe → hidden; `found` keeps who was found first */
export const tapHider = (s: EzoSeek, name: string): EzoSeek => {
  if (!s.hiders.includes(name)) return s;
  const now = s.marks[name] ?? 'hidden';
  const next: SeekMark = now === 'hidden' ? 'found' : now === 'found' ? 'safe' : 'hidden';
  return { ...s, marks: { ...s.marks, [name]: next }, found: next === 'found' ? [...s.found.filter(n => n !== name), name] : s.found.filter(n => n !== name) };
};

/** the round: whoever was not found wins; the first found seeks next (none found — the seeker again) */
export const seekResult = (s: EzoSeek) => {
  const winners = s.hiders.filter(n => (s.marks[n] ?? 'hidden') !== 'found');
  return { winners, nextSeeker: s.found[0] ?? s.seeker };
};

// ——— „ზღვა ღელავს“: the sea stops at a random moment, a theme a statue

export const SEA_MIN = 6_000;
export const SEA_MAX = 18_000;
export const HOLD_SECONDS = 10;
export const seaStop = (rnd: () => number) => Math.round(SEA_MIN + rnd() * (SEA_MAX - SEA_MIN));
export const figureOf = (rnd: () => number, last: string | null) => {
  const pool = EZO_FIGURES.filter(f => f !== last);
  return pool[Math.floor(rnd() * pool.length)] ?? EZO_FIGURES[0];
};

/** hide-and-seek's count (the seeker counts aloud with the phone) */
export const COUNTS = [20, 30, 50];

// ——— the rules quiz

export interface EzoQuizCard { id: string; q: string; options: string[]; right: number; note?: string; game?: EzoId }
export const QUIZ_SIZE = 10;

const allQuiz = () => [...EZO_GAMES.flatMap(g => g.quiz.map(q => ({ ...q, game: g.id as EzoId | undefined }))), ...EZO_QUIZ_MORE.map(q => ({ ...q, game: undefined }))];

/** ten questions: one of every game at least, the rest from all of them; the answers in a seeded order */
export const quizDeal = (seed: number, n = QUIZ_SIZE): EzoQuizCard[] => {
  const rnd = mulberry32(seed);
  const pool = allQuiz();
  const sure = EZO_GAMES.map(g => shuffle(pool.filter(q => q.game === g.id), rnd)[0]).filter(Boolean);
  const rest = shuffle(pool.filter(q => !sure.includes(q)), rnd).slice(0, Math.max(0, n - sure.length));
  return shuffle([...sure, ...rest], rnd).slice(0, n).map(q => {
    const options = shuffle([q.a, ...q.wrong], rnd);
    return { id: q.id, q: q.q, options, right: options.indexOf(q.a), note: q.note, game: q.game };
  });
};

/** stars of a quiz: all right ★★★, 8+ ★★, 6+ ★ */
export const quizStars = (right: number, of: number) => (right >= of ? 3 : right >= of - 2 ? 2 : right >= of - 4 ? 1 : 0);

// ——— reading back what the phone kept

const isStr = (x: unknown): x is string => typeof x === 'string';
const strs = (x: unknown) => (Array.isArray(x) ? x.filter(isStr) : []);
const GAME_IDS = new Set<string>(EZO_GAMES.map(g => g.id));

export const parseSeason = (raw: unknown, now: number): EzoSeason => {
  const r = raw as Partial<EzoSeason> | null;
  if (!r || typeof r !== 'object' || !Array.isArray(r.log)) return newSeason(now);
  const log = r.log.flatMap((x): EzoRound[] => {
    const e = x as Partial<EzoRound> | null;
    if (!e || !isStr(e.id) || !isStr(e.game) || !GAME_IDS.has(e.game) || typeof e.at !== 'number') return [];
    const teams = Array.isArray(e.teams) && e.teams.length === 2 ? [strs(e.teams[0]), strs(e.teams[1])] as [string[], string[]] : undefined;
    const score = Array.isArray(e.score) && e.score.length === 2 && e.score.every(v => typeof v === 'number') ? e.score as [number, number] : undefined;
    return [{ id: e.id, game: e.game as EzoId, at: e.at, players: strs(e.players), winners: strs(e.winners), ...(e.draw ? { draw: true } : {}), ...(teams ? { teams } : {}), ...(score ? { score } : {}) }];
  });
  return { start: typeof r.start === 'number' ? r.start : now, log: log.slice(-MAX_LOG) };
};

export const parseMatch = (raw: unknown): EzoMatch | null => {
  const m = raw as Partial<EzoMatch> | null;
  if (!m || typeof m !== 'object' || !isStr(m.game) || !GAME_IDS.has(m.game)) return null;
  if (!Array.isArray(m.teams) || m.teams.length !== 2 || typeof m.ms !== 'number' || m.ms <= 0) return null;
  const points = Array.isArray(m.points) ? m.points.filter(p => p && (p.team === 0 || p.team === 1) && typeof p.at === 'number') : [];
  return {
    game: m.game as EzoId, teams: [strs(m.teams[0]), strs(m.teams[1])], ms: m.ms,
    spent: typeof m.spent === 'number' ? m.spent : 0, t0: typeof m.t0 === 'number' ? m.t0 : 0,
    points, kicked: !!m.kicked, ended: !!m.ended,
  };
};

export const parseTurns = (raw: unknown): EzoTurns | null => {
  const t = raw as Partial<EzoTurns> | null;
  if (!t || typeof t !== 'object') return null;
  const players = strs(t.players);
  if (players.length < 1) return null;
  const moves = Array.isArray(t.moves) ? t.moves.filter((m): m is TurnMove => m === 'ok' || m === 'miss') : [];
  return { players, moves };
};
