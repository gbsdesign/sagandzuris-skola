import { useSyncExternalStore } from 'react';
import type { LotoDeck } from '../../../utils/loto';

// „საგალობო ლოტო“'s things kept on this phone: what sounds (the room's deck and the solo game's), the game alone on its way and
// its best, the one-phone game with paper cards (its setup and the game paused).

const load = (key: string): unknown => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
export const save = (key: string, value: unknown) => {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
};
export const loadKey = load;

const choice = <T extends string>(key: string, all: readonly T[], fallback: T) => {
  let v: T | null = null;
  const subs = new Set<() => void>();
  const read = (): T => (v ??= (x => (all.includes(x as T) ? (x as T) : fallback))(load(key)));
  const set = (x: T) => { v = x; save(key, x); subs.forEach(f => f()); };
  const use = () => useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f); }; }, read);
  return { read, set, use };
};

export const decks = choice<LotoDeck>('sg-loto-deck', ['chants', 'songs', 'regions'], 'chants');
export const SOLO_RUN = 'sg-loto-solo';
export const SOLO_BEST = 'sg-loto-best';
export const TABLE_GAME = 'sg-loto-table';
export const TABLE_CONF = 'sg-loto-table-conf';

export interface Best { ms: number; mistakes: number; heard: number }
export const readBest = (deck: LotoDeck): Best | null => {
  const o = load(SOLO_BEST) as Record<string, Best> | null;
  const b = o?.[deck];
  return b && Number.isFinite(b.ms) && Number.isInteger(b.mistakes) ? b : null;
};
/** a full card kept when quicker than the best so far (true: a new best) */
export const keepBest = (deck: LotoDeck, b: Best): boolean => {
  const old = readBest(deck);
  if (old && old.ms <= b.ms) return false;
  const o = (load(SOLO_BEST) as Record<string, Best> | null) ?? {};
  save(SOLO_BEST, { ...o, [deck]: b });
  return true;
};
