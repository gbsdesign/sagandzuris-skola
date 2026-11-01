import { useSyncExternalStore } from 'react';
import { CHAMO_TOPICS, type ChamoTopic } from '../../../utils/chamotvale';

// „ჩამოთვალე!“'s things kept on this phone: the topics a room's game draws from, the lists played lately (the next ones take
// others first), my best per list alone, the keyboard I type with, the teams' setup and their paused game.

const load = (key: string): unknown => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
export const save = (key: string, value: unknown) => {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
};
export const loadKey = load;

const store = <T,>(key: string, read: (v: unknown) => T) => {
  let v: T | undefined;
  const subs = new Set<() => void>();
  const get = (): T => (v === undefined ? (v = read(load(key))) : v);
  const set = (x: T) => { v = x; save(key, x); subs.forEach(f => f()); };
  const use = () => useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f); }; }, get);
  return { read: get, set, use };
};

const ALL = CHAMO_TOPICS.map(t => t.id);
/** the topics of a room's lists: none chosen = every topic */
export const topics = store<ChamoTopic[]>('sg-chamotvale-topics', v => (Array.isArray(v) ? v.filter((t): t is ChamoTopic => ALL.includes(t as ChamoTopic)) : []));

/** the screen's keyboard (the phone's own has no Georgian letters on many phones) — on a touch screen unless turned off */
const touch = () => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;
export const screenKeys = store<boolean>('sg-chamotvale-keys', v => (typeof v === 'boolean' ? v : touch()));

/** my best per list alone: the most found, then the quickest */
export interface Best { found: number; n: number; ms: number }
export const bests = store<Record<string, Best>>('sg-chamotvale-best', v => {
  if (!v || typeof v !== 'object') return {};
  const out: Record<string, Best> = {};
  for (const [k, b] of Object.entries(v as Record<string, Partial<Best>>)) {
    if (b && Number.isInteger(b.found) && Number.isInteger(b.n) && typeof b.ms === 'number') out[k] = { found: b.found!, n: b.n!, ms: b.ms };
  }
  return out;
});
export const better = (a: Best, b: Best | undefined) => !b || a.found > b.found || (a.found === b.found && a.ms < b.ms);
export const keepBest = (id: string, b: Best) => {
  const all = bests.read();
  if (!better(b, all[id])) return false;
  bests.set({ ...all, [id]: b });
  return true;
};

const SEEN = 'sg-chamotvale-seen';
export const readSeen = (): string[] => {
  const v = load(SEEN);
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
};
export const rememberPlayed = (ids: string[]) => save(SEEN, [...readSeen().filter(x => !ids.includes(x)), ...ids].slice(-40));

export const TEAMS_GAME = 'sg-chamotvale-teams';
/** the teams' setup: how many, their names, a turn's seconds, the list */
export const TEAMS_CONF = 'sg-chamotvale-table';
