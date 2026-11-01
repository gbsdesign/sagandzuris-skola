import { useSyncExternalStore } from 'react';
import type { TsqMode, TsqWhat } from '../../../utils/tsqvilebi';

// „ხმის წყვილები“'s things kept on this phone: what sounds (chants, songs or both), how a pair goes (a sound and its name, or
// the same sound twice), the board's size, the sounds asked lately (the next boards take others first), the teams' setup and their
// paused game. The best board alone is rounds/soloStore.ts (`sg-tsqvilebi-best-<cards>`).

const load = (key: string): unknown => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
export const save = (key: string, value: unknown) => {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
};
export const loadKey = load;

const choice = <T extends string | number>(key: string, all: readonly T[], fallback: T) => {
  let v: T | null = null;
  const subs = new Set<() => void>();
  const read = (): T => (v ??= (x => (all.includes(x as T) ? (x as T) : fallback))(load(key)));
  const set = (x: T) => { v = x; save(key, x); subs.forEach(f => f()); };
  const use = () => useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f); }; }, read);
  return { read, set, use };
};

export const whats = choice<TsqWhat>('sg-tsqvilebi-what', ['chants', 'songs', 'both'], 'chants');
export const modes = choice<TsqMode>('sg-tsqvilebi-mode', ['name', 'same'], 'name');
export const sizes = choice<number>('sg-tsqvilebi-size', [8, 12, 16], 12);
export const bestKey = (cards: number, mode: TsqMode) => `sg-tsqvilebi-best-${cards}${mode === 'same' ? '-same' : ''}`;
export const TEAMS_GAME = 'sg-tsqvilebi-teams';
/** the teams' setup on this phone: how many, their names */
export const TEAMS_CONF = 'sg-tsqvilebi-table';

const SEEN = 'sg-tsqvilebi-seen';
export const readSeen = (): string[] => {
  const v = load(SEEN);
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
};
export const rememberAsked = (ids: string[]) => save(SEEN, [...readSeen().filter(x => !ids.includes(x)), ...ids].slice(-80));
