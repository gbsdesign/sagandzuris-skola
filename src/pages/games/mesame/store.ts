import { useCallback, useSyncExternalStore } from 'react';

// „მესამე ხმა“'s settings and records, on this phone: the chant, my voice, the length, the speed and the guide alone; the
// phone's voices and the recording on one phone; the best take of each chant, voice and length.

export interface TrioConf {
  chant: string;
  /** my voice: 0 = I … 2 = III */
  voice: number;
  /** the whole chant, else its opening */
  whole: boolean;
  slow: boolean;
  /** my own voice softly with the others */
  guide: boolean;
}
export interface TableConf {
  chant: string;
  /** the voices the phone sings (one or two) */
  phone: number[];
  whole: boolean;
  slow: boolean;
  record: boolean;
}

const load = (key: string): unknown => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const save = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ } };
const voiceOf = (v: unknown, or = 0) => (v === 0 || v === 1 || v === 2 ? v : or);

const SOLO = 'sg-mesame';
const TABLE = 'sg-mesame-table';
const BEST = 'sg-mesame-best';

export const readConf = (): TrioConf => {
  const o = (load(SOLO) ?? {}) as Partial<TrioConf>;
  return {
    chant: typeof o.chant === 'string' ? o.chant : '', voice: voiceOf(o.voice), whole: o.whole === true, slow: o.slow === true, guide: o.guide === true,
  };
};
export const saveConf = (c: TrioConf) => save(SOLO, c);

export const readTable = (): TableConf => {
  const o = (load(TABLE) ?? {}) as Partial<TableConf>;
  const phone = Array.isArray(o.phone) ? [...new Set(o.phone.filter(v => v === 0 || v === 1 || v === 2))].slice(0, 2) : [];
  return {
    chant: typeof o.chant === 'string' ? o.chant : '', phone: phone.length ? phone.sort() : [2], whole: o.whole === true, slow: o.slow === true,
    record: o.record !== false,
  };
};
export const saveTable = (c: TableConf) => save(TABLE, c);

// ——— the best takes: `<chant>|<voice>|w` (the whole chant) or `…|o` (its opening) → per cent

const bestKey = (chant: string, voice: number, whole: boolean) => `${chant}|${voice}|${whole ? 'w' : 'o'}`;
let bests: Record<string, number> | null = null;
const subs = new Set<() => void>();
const readBests = (): Record<string, number> => {
  if (!bests) {
    const o = load(BEST);
    bests = {};
    if (o && typeof o === 'object') {
      for (const [k, v] of Object.entries(o as Record<string, unknown>)) if (typeof v === 'number' && v >= 0 && v <= 100) bests[k] = v;
    }
  }
  return bests;
};
export const readBest = (chant: string, voice: number, whole: boolean): number | null => readBests()[bestKey(chant, voice, whole)] ?? null;
/** keeps a take when it beats the best; true when it did */
export const keepBest = (chant: string, voice: number, whole: boolean, pct: number) => {
  const all = readBests();
  const k = bestKey(chant, voice, whole);
  if ((all[k] ?? -1) >= pct) return false;
  bests = { ...all, [k]: pct };
  save(BEST, bests);
  subs.forEach(f => f());
  return true;
};
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export const useBest = (chant: string, voice: number, whole: boolean) =>
  useSyncExternalStore(subscribe, useCallback(() => readBest(chant, voice, whole), [chant, voice, whole]));

/** the chants sung lately in a room on this phone (version ids), so the next room asks others first */
const SEEN = 'sg-mesame-seen';
export const readSeen = (): string[] => {
  const v = load(SEEN);
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
};
export const saveSeen = (ids: string[]) => save(SEEN, ids);
