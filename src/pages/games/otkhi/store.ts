import { useSyncExternalStore } from 'react';
import { parseMine, rememberOtkhi, type OtkhiItem } from '../../../utils/otkhi';

// „ოთხიდან ერთი“'s things kept on this phone: the topics chosen (none = all), the teacher's own questions and the ids
// asked lately (the next games ask others first). The topics' chips and the editor of my questions show them as they change.

const TOPICS = 'sg-otkhi-topics';
const MINE = 'sg-otkhi-mine';
const SEEN = 'sg-otkhi-seen';

const load = (key: string): unknown => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const save = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ } };
const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

let topics: string[] | null = null;
let mine: OtkhiItem[] | null = null;
const subs = new Set<() => void>();
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
const ping = () => subs.forEach(f => f());

export const readTopics = (): string[] => (topics ??= strings(load(TOPICS)));
export const setTopics = (next: string[]) => { topics = next; save(TOPICS, next); ping(); };
export const readMine = (): OtkhiItem[] => (mine ??= parseMine(load(MINE)));
export const setMine = (next: OtkhiItem[]) => { mine = next; save(MINE, next); ping(); };

export const useTopics = () => useSyncExternalStore(subscribe, readTopics);
export const useMine = () => useSyncExternalStore(subscribe, readMine);

export const readSeen = () => strings(load(SEEN));
export const rememberAsked = (ids: string[]) => save(SEEN, rememberOtkhi(readSeen(), ids));
