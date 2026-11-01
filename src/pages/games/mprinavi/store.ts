import { useSyncExternalStore } from 'react';
import type { ClefChoice, NameKind } from '../../../utils/mprinavi';

// „მფრინავი ნოტები“'s things kept on this phone: the clef (treble, bass or both in turn), the notes' names (დო რე მი or the
// letters), the melodies asked lately (the next games take others first) and the class's best flight round the circle. The
// best flight alone is rounds/soloStore.ts (`sg-mprinavi-best`).

const load = (key: string): unknown => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const save = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ } };

const choice = <T extends string>(key: string, all: readonly T[], fallback: T) => {
  let v: T | null = null;
  const subs = new Set<() => void>();
  const read = (): T => (v ??= (x => (all.includes(x as T) ? (x as T) : fallback))(load(key)));
  const set = (x: T) => { v = x; save(key, x); subs.forEach(f => f()); };
  const use = () => useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f); }; }, read);
  return { read, set, use };
};

export const clefs = choice<ClefChoice>('sg-mprinavi-clef', ['treble', 'bass', 'both'], 'treble');
export const names = choice<NameKind>('sg-mprinavi-names', ['syl', 'abc'], 'syl');
export const BEST = 'sg-mprinavi-best';
export const CLASS_BEST = 'sg-mprinavi-class-best';

const SEEN = 'sg-mprinavi-seen';
export const readSeen = (): string[] => {
  const v = load(SEEN);
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
};
export const rememberAsked = (ids: string[]) => save(SEEN, [...readSeen().filter(x => !ids.includes(x)), ...ids].slice(-30));
