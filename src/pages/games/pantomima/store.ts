import { useSyncExternalStore } from 'react';
import { rememberShown } from '../../../utils/pantomima';

// „პანტომიმა“'s things kept on this phone: the themes chosen (none = all) and the little ones' way (words may be said) —
// shared by the room's lobby and the one-phone game — and the words shown lately, so the next games show others first.

const THEMES = 'sg-pantomima-themes';
const TALK = 'sg-pantomima-talk';
const SEEN = 'sg-pantomima-seen';

const load = (key: string): unknown => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const save = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ } };
const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

let themes: string[] | null = null;
let talk: boolean | null = null;
const subs = new Set<() => void>();
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
const ping = () => subs.forEach(f => f());

export const readThemes = (): string[] => (themes ??= strings(load(THEMES)));
export const setThemes = (next: string[]) => { themes = next; save(THEMES, next); ping(); };
export const readTalk = (): boolean => (talk ??= load(TALK) === true);
export const setTalk = (next: boolean) => { talk = next; save(TALK, next); ping(); };
export const useThemes = () => useSyncExternalStore(subscribe, readThemes);
export const useTalk = () => useSyncExternalStore(subscribe, readTalk);

export const readSeen = () => strings(load(SEEN));
export const rememberSeen = (words: string[]) => save(SEEN, rememberShown(readSeen(), words));
