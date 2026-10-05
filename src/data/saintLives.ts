import { useEffect, useState } from 'react';
import { MONTHS_GE, fromOldStyle, oldStyleOf, todayIso } from './churchCalendar';

// orthodoxy.ge's "წმინდანთა ცხოვრება", made by scripts/fetch-saint-lives.mjs: the list is bundled
// (src/data/library/saintLives.json), each life is fetched when opened (public/lives/<id>.json).

/** one life in the list: m/d = its old-style day, h = when a movable one is kept, i = icon,
 *  g = a Georgian saint, x = a longer version or chapter, opened from its life rather than listed */
export interface LifeEntry { id: string; t: string; m?: number; d?: number; h?: string; i?: string; g?: 1; x?: 1 }
/** a run of text: [text, flags (1 bold, 2 italic), id of the life the words link to] */
export type LifeRun = [string, number?, string?];
export type LifeBlock =
  | { r: LifeRun[]; a?: 'c' | 'r' }
  | { h: string; l?: string }
  | { img: string; w?: number; h?: number };
export interface Life { t: string; h: string; b: LifeBlock[] }

export const RUN_BOLD = 1;
export const RUN_ITALIC = 2;

let listing: Promise<LifeEntry[]> | null = null;
export const loadLivesIndex = () =>
  (listing ??= import('./library/saintLives.json').then(m => (m.default as unknown as { lives: LifeEntry[] }).lives));

/** the whole list, once loaded */
export const useLivesIndex = () => {
  const [lives, setLives] = useState<LifeEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    loadLivesIndex().then(l => alive && setLives(l)).catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, []);
  return { lives, failed };
};

export const lifeAsset = (path: string) => `/lives/${path}`;

const loaded = new Map<string, Promise<Life>>();
export const loadLife = (id: string) => {
  if (!loaded.has(id)) {
    const p = fetch(lifeAsset(`${id}.json`))
      .then(r => {
        // the site answers a missing file with the app's page: that is not a life either
        if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) throw new Error(`${r.status}`);
        return r.json() as Promise<Life>;
      });
    p.catch(() => loaded.delete(id)); // try again next time (back online)
    loaded.set(id, p);
  }
  return loaded.get(id)!;
};

/** a life: undefined while loading, null when it could not be read (a new attempt reads it again) */
export const useLife = (id: string | null, attempt = 0) => {
  const [state, setState] = useState<{ id: string | null; life: Life | null | undefined }>({ id: null, life: undefined });
  useEffect(() => {
    if (!id) return;
    let alive = true;
    setState({ id, life: undefined });
    loadLife(id).then(life => alive && setState({ id, life }), () => alive && setState({ id, life: null }));
    return () => { alive = false; };
  }, [id, attempt]);
  return state.id === id ? state.life : undefined;
};

/** "22 სექტემბერი" — the old-style day a life is read on */
export const lifeOldDay = (l: LifeEntry) => (l.m && l.d ? `${l.d} ${MONTHS_GE[l.m - 1]}` : '');
/** the new-style date of that day this year (the church year that holds today) */
export const lifeNewIso = (l: LifeEntry) => {
  if (!l.m || !l.d) return null;
  const year = oldStyleOf(todayIso()).year;
  // 29 February of a common year is read on the 28th
  const day = l.m === 2 && l.d === 29 && year % 4 !== 0 ? 28 : l.d;
  return fromOldStyle(year, l.m, day);
};

/** a title without its trailing "(+117)" / "(IV)", and that note on its own */
export const splitTitle = (t: string) => {
  const m = t.match(/^(.*?)\s*\(((?:[^()]|\([^()]*\))*)\)\s*$/);
  return m && m[1] ? { name: m[1].replace(/[\s,–-]+$/, ''), note: m[2] } : { name: t, note: '' };
};

// Any part of the app opens a life with openSaintLife(id); the overlay (SaintLifeOverlay) shows it.
export const LIFE_EVENT = 'open-saint-life';
export const openSaintLife = (id: string) => window.dispatchEvent(new CustomEvent(LIFE_EVENT, { detail: id }));
