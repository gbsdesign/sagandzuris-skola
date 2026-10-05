// "ჩამოწერა": keeps chant versions on the device so they open without internet (in church).
// Notes (JSON + page images) and the hymnography drawings go into a Cache Storage cache that the
// service worker also serves from (see vite.config.ts); recordings go into IndexedDB like the player's own offline copy.
import { findVersion } from '../data/chantLookup';
import { getChantMedia } from '../data/chantMediaRegistry';
import { hymnPair } from '../data/hymnOrnaments';
import { cacheAudio } from './audioCache';

export const NOTES_CACHE = 'sagandzuri-notes-v1';
const KEY = 'sagandzuri_offline_versions';
const pad3 = (n: number) => String(n).padStart(3, '0');

const readSet = (): Set<string> => {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { return new Set(); }
};
let saved = readSet();
const listeners = new Set<() => void>();
const write = () => {
  try { localStorage.setItem(KEY, JSON.stringify([...saved])); } catch { /* storage full or blocked */ }
  listeners.forEach(f => f());
};

export const isOffline = (variantId: string) => saved.has(variantId);
export const offlineCount = (ids: string[]) => ids.filter(id => saved.has(id)).length;
export const onOfflineChange = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };
export const offlineSupported = () => typeof caches !== 'undefined';

const cacheUrls = async (cache: Cache, urls: string[]) => {
  for (const url of urls) {
    if (await cache.match(url)) continue;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    await cache.put(url, res);
  }
};

/** Everything one version needs: notes JSON, its page images, the two drawings, the recording's tracks. */
const saveVersion = async (cache: Cache, variantId: string) => {
  const info = findVersion(variantId);
  if (!info) return;
  const { chant, variant } = info;
  const pair = hymnPair(chant.id);
  const urls = [pair.top.src, pair.bottom.src];
  if (variant.bookNums?.length) {
    const base = `/notes/${variant.book ?? 'book'}/`;
    const jsonUrl = `${base}${pad3(variant.bookNums[0])}.json`;
    await cacheUrls(cache, [jsonUrl]);
    const json = await (await cache.match(jsonUrl))!.json();
    for (const im of json.img ?? []) urls.push(base + im.src);
  }
  const media = getChantMedia(chant.id, variant.code);
  if (media) for (const n of media.notes) urls.push(n.url);
  await cacheUrls(cache, urls.filter(u => u.startsWith('/')));
  // Drive note sheets are cross-origin: kept as opaque copies, good enough for an <img>
  for (const u of urls.filter(u => !u.startsWith('/'))) {
    if (await cache.match(u)) continue;
    try { await cache.put(u, await fetch(u, { mode: 'no-cors' })); } catch { /* the sheet stays online-only */ }
  }
  if (media) for (const t of media.tracks.filter(Boolean)) await cacheAudio(t);
};

/** Saves the versions one by one; returns how many were saved. */
export const saveOffline = async (variantIds: string[], onProgress?: (done: number, total: number) => void) => {
  const todo = [...new Set(variantIds)].filter(id => !saved.has(id));
  const cache = await caches.open(NOTES_CACHE);
  let done = 0;
  for (const id of todo) {
    try {
      await saveVersion(cache, id);
      saved.add(id);
      write();
    } catch (err) {
      console.warn('offline save failed', id, err);
    }
    done += 1;
    onProgress?.(done, todo.length);
  }
  return done;
};

/** Rough size before a big download: about 160 KB of notes per version, 4.8 MB per recording. */
export const estimateMb = (variantIds: string[]) => {
  let kb = 0;
  for (const id of variantIds) {
    if (saved.has(id)) continue;
    const info = findVersion(id);
    if (!info) continue;
    kb += 160;
    if (getChantMedia(info.chant.id, info.variant.code)) kb += 4800;
  }
  return Math.max(1, Math.round(kb / 1024));
};
