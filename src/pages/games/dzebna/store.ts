import { MAX_STATIONS, MAX_TEAMS, MIN_STATIONS, PLACE_MAX, SEEDS, TASK_KINDS, isTaskKind, type HuntConf } from '../../../utils/dzebna';

// What „საგანძურის ძებნა“ keeps on the device: the day's (or a free) hunt on its way, the teacher's last setup and the chest
// of a hunt in the yard, and a team phone's finds. Nothing goes to Firestore but the day's record (useDailyRecord('dzebna')).

export const NOW_KEY = 'sg-dzebna-now';
export const SETUP_KEY = 'sg-dzebna-setup';
export const CHEST_KEY = 'sg-dzebna-chest';
export const TEAM_KEY = 'sg-dzebna-team';
export const TAB_KEY = 'sg-dzebna-tab';

export const readJson = (k: string): unknown => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
export const writeJson = (k: string, v: unknown) => {
  try { if (v === null || v === undefined) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ }
};

const int = (v: unknown, lo: number, hi: number, d: number) => (Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi ? (v as number) : d);
const strs = (v: unknown, n: number) => Array.from({ length: n }, (_, i) => (Array.isArray(v) && typeof v[i] === 'string' ? (v[i] as string).slice(0, PLACE_MAX) : ''));

/** the teacher's hunt being set: the code's settings and where each card hides */
export interface Setup extends HuntConf { places: string[] }
export const newSeed = () => Math.floor(Math.random() * SEEDS);
export const readSetup = (): Setup => {
  const o = readJson(SETUP_KEY) as Partial<Setup> | null;
  const stations = int(o?.stations, MIN_STATIONS, MAX_STATIONS, 6);
  const kinds = Array.isArray(o?.kinds) ? TASK_KINDS.filter(k => o!.kinds!.includes(k) && isTaskKind(k)) : [];
  return {
    seed: int(o?.seed, 0, SEEDS - 1, newSeed()),
    stations,
    teams: int(o?.teams, 1, MAX_TEAMS, 3),
    kinds: kinds.length ? kinds : ['quiz', 'region', 'year', 'old'],
    places: strs(o?.places, MAX_STATIONS),
  };
};

/** the chest of a hunt under way: since when, and when each team brought its word (ms after the start) */
export interface ChestState { code: string; places: string[]; start: number; arrived: (number | null)[]; ended: boolean }
export const readChest = (): ChestState | null => {
  const o = readJson(CHEST_KEY) as Partial<ChestState> | null;
  if (!o || typeof o.code !== 'string' || !/^\d{8}$/.test(o.code) || !Number.isFinite(o.start)) return null;
  return {
    code: o.code,
    places: strs(o.places, MAX_STATIONS),
    start: o.start as number,
    arrived: Array.from({ length: MAX_TEAMS }, (_, i) => (Array.isArray(o.arrived) && Number.isFinite(o.arrived[i]) ? (o.arrived[i] as number) : null)),
    ended: !!o.ended,
  };
};

/** a team's phone in the yard: which team, the stations solved, the answers struck, a wrong answer's wait, and the hiding
 *  places the cards' links told */
export interface TeamPhone { code: string; team: number; found: number[]; struck: Record<string, number[]>; wait: number; places: Record<string, string> }
export const readTeam = (code: string): TeamPhone | null => {
  const o = readJson(TEAM_KEY) as Partial<TeamPhone> | null;
  if (!o || o.code !== code || !Number.isInteger(o.team)) return null;
  const nums = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is number => Number.isInteger(x) && x >= 0 && x < MAX_STATIONS) : []);
  const struck: Record<string, number[]> = {};
  if (o.struck && typeof o.struck === 'object') Object.entries(o.struck).forEach(([k, v]) => { struck[k] = nums(v).filter(x => x < 4); });
  const places: Record<string, string> = {};
  if (o.places && typeof o.places === 'object') Object.entries(o.places).forEach(([k, v]) => { if (typeof v === 'string') places[k] = v.slice(0, PLACE_MAX); });
  return { code, team: o.team as number, found: [...new Set(nums(o.found))], struck, wait: Number.isFinite(o.wait) ? (o.wait as number) : 0, places };
};
