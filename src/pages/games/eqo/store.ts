import { useSyncExternalStore } from 'react';

// „ექო“'s things kept on this phone: the level (the keys light up while the phrase sounds, or the ear alone), how the circle
// answers (on the keys, the phone passed on, or by singing, the host judging), the melodies played lately (the next games
// take others first) and a paused circle. The best run alone is rounds/soloStore.ts (`sg-eqo-best`).

const LIGHTS = 'sg-eqo-lights';
const SING = 'sg-eqo-sing';
const SEEN = 'sg-eqo-seen';
export const CIRCLE_GAME = 'sg-eqo-circle';
export const BEST = 'sg-eqo-best';

export const load = (key: string): unknown => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
export const save = (key: string, value: unknown) => {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
};

const flag = (key: string, fallback: boolean) => {
  let v: boolean | null = null;
  const subs = new Set<() => void>();
  const read = () => (v ??= (x => (typeof x === 'boolean' ? x : fallback))(load(key)));
  const set = (x: boolean) => { v = x; save(key, x); subs.forEach(f => f()); };
  const use = () => useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f); }; }, read);
  return { read, set, use };
};

/** the keys light up while it sounds (the first level) */
export const lights = flag(LIGHTS, true);
/** the circle sings the phrase back (the host judges) instead of tapping it */
export const sing = flag(SING, false);

export const readSeen = (): string[] => {
  const v = load(SEEN);
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
};
export const rememberPlayed = (ids: string[]) => save(SEEN, [...readSeen().filter(x => !ids.includes(x)), ...ids].slice(-30));
