import { useSyncExternalStore } from 'react';
import { rememberDrawn } from '../../../utils/nakhati';

// „ნახატობანა“'s things kept on this phone: the themes chosen (none = all; the room's lobby, the one-phone game and the
// riddle share them), the words drawn lately (the next games draw others first), the chat's riddles already guessed, and a
// riddle's drawing not sent yet.

const THEMES = 'sg-nakhati-themes';
const SEEN = 'sg-nakhati-seen';
const SOLVED = 'sg-nakhati-solved';
const DRAFT = 'sg-nakhati-draft';

const load = (key: string): unknown => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const save = (key: string, value: unknown) => {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
};
const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

let themes: string[] | null = null;
let solved: Record<string, 1 | 2> | null = null;
const subs = new Set<() => void>();
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
const ping = () => subs.forEach(f => f());

export const readThemes = (): string[] => (themes ??= strings(load(THEMES)));
export const setThemes = (next: string[]) => { themes = next; save(THEMES, next); ping(); };
export const useThemes = () => useSyncExternalStore(subscribe, readThemes);

export const readSeen = () => strings(load(SEEN));
export const rememberSeen = (words: string[]) => save(SEEN, rememberDrawn(readSeen(), words));

/** the chat's riddles this phone has done: 1 guessed, 2 given up */
const readSolved = (): Record<string, 1 | 2> => {
  if (solved) return solved;
  const o = load(SOLVED);
  solved = {};
  if (o && typeof o === 'object') for (const [k, v] of Object.entries(o as Record<string, unknown>)) if (v === 1 || v === 2) solved[k] = v;
  return solved;
};
export const setSolved = (id: string, how: 1 | 2) => {
  const all = { ...readSolved(), [id]: how };
  // the newest 300 are enough
  const keys = Object.keys(all);
  solved = keys.length > 300 ? Object.fromEntries(keys.slice(-300).map(k => [k, all[k]])) : all;
  save(SOLVED, solved);
  ping();
};
export const useSolved = (id: string) => useSyncExternalStore(subscribe, () => readSolved()[id] ?? 0);

/** a riddle drawn but not sent yet: its word, theme and lines */
export interface Draft { w: string; theme: string; ink: string }
export const readDraft = (): Draft | null => {
  const o = load(DRAFT) as Partial<Draft> | null;
  return o && typeof o.w === 'string' && o.w && typeof o.theme === 'string' && typeof o.ink === 'string' ? { w: o.w, theme: o.theme, ink: o.ink } : null;
};
export const saveDraft = (d: Draft | null) => save(DRAFT, d);
