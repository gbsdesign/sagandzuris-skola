import { useCallback, useSyncExternalStore } from 'react';
import { parseBest, type SoloBest } from '../../../utils/soloRun';

// A quick game's best run alone (rounds/Solo.tsx), kept on this phone under `<store>-best`.

const load = (key: string): unknown => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const save = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ } };

const cache = new Map<string, SoloBest | null>();
const subs = new Set<() => void>();
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

export const readSoloBest = (key: string): SoloBest | null => {
  if (!cache.has(key)) cache.set(key, parseBest(load(key)));
  return cache.get(key) ?? null;
};
export const setSoloBest = (key: string, best: SoloBest) => { cache.set(key, best); save(key, best); subs.forEach(f => f()); };
export const useSoloBest = (key: string) => useSyncExternalStore(subscribe, useCallback(() => readSoloBest(key), [key]));
