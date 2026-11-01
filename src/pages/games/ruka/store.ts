import { useSyncExternalStore } from 'react';
import { isRukaTopic, parseBest, type RukaSoloBest, type RukaTopic } from '../../../utils/ruka';

// „რუკის ვიქტორინა“'s things kept on this phone: the topics chosen (none = all), whether a song is asked by its tune alone,
// the items asked lately (the next games ask others first) and the best run alone. The choices' chips show them as they change.

const TOPICS = 'sg-ruka-topics';
const HIDE = 'sg-ruka-hide';
const SEEN = 'sg-ruka-seen';
const BEST = 'sg-ruka-best';

const load = (key: string): unknown => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const save = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ } };

interface Opts { topics: RukaTopic[]; hide: boolean }
let opts: Opts | null = null;
const subs = new Set<() => void>();
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
const ping = () => subs.forEach(f => f());

export const readOpts = (): Opts => (opts ??= {
  topics: (Array.isArray(load(TOPICS)) ? (load(TOPICS) as unknown[]) : []).filter(isRukaTopic),
  hide: load(HIDE) === true,
});
export const setTopics = (topics: RukaTopic[]) => { opts = { ...readOpts(), topics }; save(TOPICS, topics); ping(); };
export const setHide = (hide: boolean) => { opts = { ...readOpts(), hide }; save(HIDE, hide); ping(); };
export const useOpts = () => useSyncExternalStore(subscribe, readOpts);

export const readSeen = (): string[] => {
  const v = load(SEEN);
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
};
export const rememberAsked = (ids: string[]) => save(SEEN, [...readSeen().filter(x => !ids.includes(x)), ...ids].slice(-150));

let best: RukaSoloBest | null | undefined;
export const readBest = (): RukaSoloBest | null => (best === undefined ? (best = parseBest(load(BEST))) : best);
export const setBest = (b: RukaSoloBest) => { best = b; save(BEST, b); ping(); };
export const useBest = () => useSyncExternalStore(subscribe, readBest);
