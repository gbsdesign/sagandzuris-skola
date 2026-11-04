import { useSyncExternalStore } from 'react';
import { WORD_CATEGORIES } from '../../../data/amikhseniWords';
import { DEFAULT_SETTINGS, MAX_TEAMS, TEAM_NAMES, type AliasSettings } from '../../../utils/amikhseni';
import { rememberAmik } from '../../../utils/amikhseniRounds';

// „ამიხსენი“'s things kept on this phone: the one-phone game's settings and team names (`sg-amikhseni`, since 2026-10-28;
// its themes are the room's too, so both tabs share them) and the words a room showed lately (`sg-amikhseni-seen`), so the
// next games show others first.

const KEY = 'sg-amikhseni';
const SEEN = 'sg-amikhseni-seen';

export const ALL_CATS = WORD_CATEGORIES.map(c => c.id);
// the themes before 2026-11-01: a device that had every one of them on gets the new ones on too
const OLD_ALL = ['galoba', 'musika', 'sakravebi', 'simgera', 'kutkhe', 'samosi', 'tsmindanebi', 'tsinaprebi', 'qopa', 'istoria'];

export interface AmikConf { settings: AliasSettings; names: string[] }

const load = (key: string): unknown => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const save = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ } };

const parse = (): AmikConf => {
  const o = load(KEY) as { settings?: Partial<AliasSettings>; names?: unknown[] } | null;
  const s: AliasSettings = { ...DEFAULT_SETTINGS, categories: ALL_CATS, ...(o && typeof o === 'object' ? o.settings ?? {} : {}) };
  s.teams = Math.min(MAX_TEAMS, Math.max(2, s.teams | 0));
  const cats = Array.isArray(s.categories) ? s.categories.filter(c => ALL_CATS.includes(c)) : [];
  s.categories = !cats.length || OLD_ALL.every(c => cats.includes(c)) ? ALL_CATS : cats;
  const names = TEAM_NAMES.map((n, i) => {
    const v = o && Array.isArray(o.names) ? o.names[i] : null;
    return (typeof v === 'string' && v ? v : n).slice(0, 16);
  });
  return { settings: s, names };
};

let conf: AmikConf | null = null;
const subs = new Set<() => void>();
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

export const readConf = (): AmikConf => (conf ??= parse());
const setConf = (next: AmikConf) => { conf = next; save(KEY, next); subs.forEach(f => f()); };
export const useConf = () => useSyncExternalStore(subscribe, readConf);
export const setSettings = (patch: Partial<AliasSettings>) => { const c = readConf(); setConf({ ...c, settings: { ...c.settings, ...patch } }); };
export const renameTeam = (i: number, name: string) => {
  const c = readConf();
  setConf({ ...c, names: c.names.map((n, j) => (j === i ? name.slice(0, 16) : n)) });
};

export const readSeen = () => { const v = load(SEEN); return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []; };
export const rememberSeen = (words: string[]) => save(SEEN, rememberAmik(readSeen(), words));
