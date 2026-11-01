import { useSyncExternalStore } from 'react';
import type { HangebiLevel } from '../../../utils/hangebi';

// „ოთხი ჰანგი, ერთი სიტყვა“'s things kept on this phone: the level chosen (by word, by ear or both) and the puzzles asked
// lately (the next games ask others first). The best run alone is rounds/soloStore.ts.

const LEVEL = 'sg-hangebi-level';
const SEEN = 'sg-hangebi-seen';

const load = (key: string): unknown => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const save = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ } };

/** both levels, or one */
export type LevelChoice = HangebiLevel | 'both';
const isChoice = (v: unknown): v is LevelChoice => v === 'both' || v === 'ear' || v === 'word';

let level: LevelChoice | null = null;
const subs = new Set<() => void>();
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

export const readLevel = (): LevelChoice => (level ??= (v => (isChoice(v) ? v : 'both'))(load(LEVEL)));
export const setLevel = (v: LevelChoice) => { level = v; save(LEVEL, v); subs.forEach(f => f()); };
export const useLevel = () => useSyncExternalStore(subscribe, readLevel);

export const readSeen = (): string[] => {
  const v = load(SEEN);
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
};
export const rememberAsked = (ids: string[]) => save(SEEN, [...readSeen().filter(x => !ids.includes(x)), ...ids].slice(-80));
