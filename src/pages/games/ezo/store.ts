import { useSyncExternalStore } from 'react';
import { newSeason, parseSeason, type EzoSeason } from '../../../utils/ezo';

// „ეზოს მსაჯი“ on this phone: the season of the class's yard games, the game under way (✕ only pauses it), the referee's
// last settings and the quiz's best. Nothing goes to Firestore.

export const TAB_KEY = 'sg-ezo-tab';
export const SEASON_KEY = 'sg-ezo-season';
export const MATCH_KEY = 'sg-ezo-match';
export const TURNS_KEY = 'sg-ezo-turns';
export const CONF_KEY = 'sg-ezo-conf';
export const QUIZ_BEST_KEY = 'sg-ezo-quiz-best';

export const readJson = (key: string): unknown => {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
};
export const writeJson = (key: string, v: unknown) => {
  try {
    if (v === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(v));
  } catch { /* private mode */ }
};

// the season, shared by every screen of the game
let season: EzoSeason | null = null;
const subs = new Set<() => void>();
const getSeason = () => (season ??= parseSeason(readJson(SEASON_KEY), Date.now()));
export const setSeason = (s: EzoSeason) => {
  season = s;
  writeJson(SEASON_KEY, s);
  subs.forEach(f => f());
};
export const freshSeason = () => setSeason(newSeason(Date.now()));
export const useSeason = () => useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f); }; }, getSeason);

/** the referee's last choices */
export interface EzoConf { minutes: Record<string, number>; count: number; seek: number; grid: string[] }
export const readConf = (): EzoConf => {
  const r = readJson(CONF_KEY) as Partial<EzoConf> | null;
  return {
    minutes: r && typeof r.minutes === 'object' && r.minutes ? r.minutes as Record<string, number> : {},
    count: typeof r?.count === 'number' ? r.count : 30,
    seek: typeof r?.seek === 'number' ? r.seek : 5,
    grid: Array.isArray(r?.grid) ? r.grid.filter((x): x is string => typeof x === 'string') : [],
  };
};
export const writeConf = (c: EzoConf) => writeJson(CONF_KEY, c);

export const roundId = () => `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
