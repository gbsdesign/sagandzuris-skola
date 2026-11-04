import { useSyncExternalStore } from 'react';
import type { RsrQuestion } from '../../../data/raSadRodisQuestions';
import { TEAM_NAMES } from '../../../utils/amikhseni';
import { COUNT_CHOICES, DEFAULT_SETTINGS, MAX_TEAMS, MIN_TEAMS, parseGame, parseMine, rememberSeen, type RsrGame, type RsrSettings } from '../../../utils/raSadRodis';

// „რა? სად? როდის?“'s things kept on this phone (2026-10-28; gathered here 2026-11-04, when it got its online tab): the
// one-phone game's settings and team names (`sg-rsr`) — its topics are the online game's too —, the game in play
// (`sg-rsr-game`), the ids asked lately (`sg-rsr-seen`, so the next games ask others first) and the teacher's own
// questions (`sg-rsr-mine`). The chips and the editor show them as they change.

const KEY = 'sg-rsr';
const GAME_KEY = 'sg-rsr-game';
const SEEN_KEY = 'sg-rsr-seen';
const MINE_KEY = 'sg-rsr-mine';

const load = (key: string): unknown => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const save = (key: string, value: unknown) => {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
};

export interface RsrConf { settings: RsrSettings; names: string[] }

const parseConf = (): RsrConf => {
  const o = load(KEY) as { settings?: Partial<RsrSettings>; names?: unknown[] } | null;
  const s = { ...DEFAULT_SETTINGS, ...(o?.settings ?? {}) };
  s.teams = Math.min(MAX_TEAMS, Math.max(MIN_TEAMS, Math.round(Number(s.teams)) || DEFAULT_SETTINGS.teams));
  if (!COUNT_CHOICES.includes(s.count)) s.count = DEFAULT_SETTINGS.count;
  s.topics = Array.isArray(s.topics) ? s.topics.filter((t): t is string => typeof t === 'string') : [];
  const names = TEAM_NAMES.map((n, i) => { const v = o?.names?.[i]; return (typeof v === 'string' && v ? v : n).slice(0, 16); });
  return { settings: s, names };
};

let conf: RsrConf | null = null;
let mine: RsrQuestion[] | null = null;
const subs = new Set<() => void>();
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
const ping = () => subs.forEach(f => f());

export const readConf = (): RsrConf => (conf ??= parseConf());
export const setSettings = (patch: Partial<RsrSettings>) => {
  const c = readConf();
  conf = { settings: { ...c.settings, ...patch }, names: c.names };
  save(KEY, conf);
  ping();
};
export const renameTeam = (i: number, name: string) => {
  const c = readConf();
  const names = [...c.names];
  names[i] = name.slice(0, 16);
  conf = { settings: c.settings, names };
  save(KEY, conf);
  ping();
};
export const useConf = () => useSyncExternalStore(subscribe, readConf);

export const readMine = (): RsrQuestion[] => (mine ??= parseMine(load(MINE_KEY)));
export const setMine = (next: RsrQuestion[]) => { mine = next; save(MINE_KEY, next); ping(); };
export const useMine = () => useSyncExternalStore(subscribe, readMine);

export const readSeen = (): string[] => { const v = load(SEEN_KEY); return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []; };
export const rememberAsked = (ids: string[]) => save(SEEN_KEY, rememberSeen(readSeen(), ids));

/** the one-phone game kept after every step (a finished one is let go) */
export const readGame = (): RsrGame | null => { const g = parseGame(load(GAME_KEY)); return g && g.phase !== 'end' ? g : null; };
export const saveGame = (g: RsrGame | null) => save(GAME_KEY, g && g.phase !== 'end' ? g : null);
