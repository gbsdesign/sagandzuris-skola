// Offline mode: what the app keeps on the device so it works without internet.
// • The app itself — every page, picture and font — is precached by the service worker (vite.config.ts).
// • The data under public/ comes in packs (scripts/lib/offline-manifest.mjs). The light auto-* packs download by
//   themselves in the background; a chant book's page pictures (notes-<book>) and the saints' lives when turned on in
//   „ოფლაინ რეჟიმი“ (pages/OfflinePage.tsx). One Cache Storage cache per pack ("sg-pack-<id>"); every stored response
//   is marked x-sg-pack, so the service worker answers it from the device. A pack is brought up to date file by file
//   (content hashes) when a new version is published.
// • Recordings go into the players' IndexedDB store (utils/audioIdb.ts), chosen by group or one by one
//   (data/offlineRecordings.ts). Only what was downloaded here is ever removed here.
// One queue does all of it, one thing at a time; the header's cloud (components/offline/OfflineButton.tsx) shows it.
import { useSyncExternalStore } from 'react';
import { listAudioKeys, removeAudioFromIndexedDB, saveAudioToArrayBufferIdb } from './audioIdb';
import { recordingsAreHidden } from '../data/runtimeRecordings';

export interface PackInfo { id: string; v: string; n: number; b: number; c?: number }
type FileEntry = [path: string, bytes: number, hash: string];
interface PackRecord { v: string | null; have: Record<string, string>; bytes: number }
export interface Choice { packs: string[]; groups: string[]; items: string[] }
interface RecGroupRef { id: string; items: { id: string }[] }

export interface OfflineState {
  supported: boolean;
  online: boolean;
  saveData: boolean;                  // the phone's data saver: the automatic packs wait
  appReady: boolean;                  // an active service worker holds the whole app
  packs: PackInfo[];                  // the last offline/index.json seen
  stored: Record<string, { bytes: number; complete: boolean }>;
  choice: Choice;                     // optional packs, recording groups and single recordings turned on
  tracks: ReadonlySet<string>;        // recordings on the device (from any player)
  sizes: Readonly<Record<string, number>>; // recording sizes seen so far (bytes)
  run: { what: string; done: number; total: number } | null; // the download in progress (bytes)
  recMissing: number;                 // chosen recordings not on the device yet
  failed: boolean;                    // the last run could not get something from the server
  usage: number | null;               // bytes the app uses on the device
  quota: number | null;               // bytes the browser lets the app use in all
}

const CHOICE_KEY = 'sg_offline_choice';
const INDEX_KEY = 'sg_offline_index';
export const isAutoPack = (id: string) => id.startsWith('auto-');
const packCache = (id: string) => `sg-pack-${id}`;

const readJson = <T,>(key: string, fallback: T): T => {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
};
const writeJson = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full or blocked */ }
};

// what was downloaded, in a small key-value store: "pack:<id>" → PackRecord, "rec" → recordings downloaded here
let dbp: Promise<IDBDatabase> | null = null;
const openDb = () => (dbp ??= new Promise((resolve, reject) => {
  const r = indexedDB.open('sagandzuri-offline', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('kv');
  r.onsuccess = () => resolve(r.result);
  r.onerror = () => reject(r.error);
}));
const kvGet = async <T,>(key: string): Promise<T | undefined> => {
  try {
    const db = await openDb();
    return await new Promise(resolve => {
      const q = db.transaction('kv').objectStore('kv').get(key);
      q.onsuccess = () => resolve(q.result as T | undefined);
      q.onerror = () => resolve(undefined);
    });
  } catch { return undefined; }
};
const kvPut = async (key: string, value: unknown) => {
  try {
    const db = await openDb();
    await new Promise<void>(resolve => {
      const store = db.transaction('kv', 'readwrite').objectStore('kv');
      const q = value === undefined ? store.delete(key) : store.put(value, key);
      q.onsuccess = () => resolve();
      q.onerror = () => resolve();
    });
  } catch { /* blocked */ }
};

type Connection = { saveData?: boolean; addEventListener?: (type: 'change', f: () => void) => void };
const connection = () => (typeof navigator === 'undefined' ? undefined : (navigator as Navigator & { connection?: Connection }).connection);
const supported = typeof window !== 'undefined' && typeof caches !== 'undefined' && typeof indexedDB !== 'undefined';

let state: OfflineState = {
  supported,
  online: typeof navigator === 'undefined' || navigator.onLine,
  saveData: !!connection()?.saveData,
  appReady: false,
  packs: readJson<PackInfo[]>(INDEX_KEY, []),
  stored: {},
  choice: { packs: [], groups: [], items: [], ...readJson<Partial<Choice>>(CHOICE_KEY, {}) },
  tracks: new Set(),
  sizes: {},
  run: null,
  recMissing: 0,
  failed: false,
  usage: null,
  quota: null,
};
const listeners = new Set<() => void>();
const set = (patch: Partial<OfflineState>) => {
  state = { ...state, ...patch };
  listeners.forEach(f => f());
};
const subscribe = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };
export const useOffline = () => useSyncExternalStore(subscribe, () => state);

const records: Record<string, PackRecord> = {};
const epoch: Record<string, number> = {}; // bumped when a pack is removed: a download still running for it stops
let owned = new Set<string>();             // recordings downloaded here (others belong to the players' own buttons)
let sizes: Record<string, number> = {};
let needed = new Set<string>();            // recordings the choice asks for
let forced = false;                        // the member asked to download despite the data saver
let failed = false;

/** Whether a recording is on the device (players that build their own <audio> check this first). */
export const hasTrack = (url: string) => state.tracks.has(url);

export const isKept = (s: OfflineState, id: string) => isAutoPack(id) || s.choice.packs.includes(id);
const fetchable = (id: string) => isKept(state, id) && (!isAutoPack(id) || !state.saveData || forced);
const storedOf = () => Object.fromEntries(state.packs.map(p => [p.id, { bytes: records[p.id]?.bytes ?? 0, complete: records[p.id]?.v === p.v }]));
const countBytes = (rec: PackRecord, files: FileEntry[]) => files.reduce((s, [path, bytes, hash]) => (rec.have[path] === hash ? s + bytes : s), 0);

/** Recording sizes: known once downloaded, else the average of those seen (3 MB before any). */
export const trackEstimate = (known: Readonly<Record<string, number>>) => {
  const all = Object.values(known);
  const avg = all.length >= 3 ? all.reduce((a, b) => a + b, 0) / all.length : 3 * 1024 * 1024;
  return (url: string) => known[url] || avg;
};

const refreshUsage = async () => {
  try {
    const e = await navigator.storage?.estimate?.();
    if (e?.usage !== undefined) set({ usage: e.usage, quota: e.quota ?? null });
  } catch { /* not available */ }
};
const askToKeep = () => { navigator.storage?.persist?.().catch(() => undefined); };
const saveRec = () => kvPut('rec', { owned: [...owned], sizes });

let loaded: Promise<void> | null = null;
const load = () => (loaded ??= (async () => {
  const rec = await kvGet<{ owned: string[]; sizes: Record<string, number> }>('rec');
  owned = new Set(rec?.owned ?? []);
  sizes = rec?.sizes ?? {};
  for (const p of state.packs) {
    const r = await kvGet<PackRecord>(`pack:${p.id}`);
    if (!r) continue;
    // the browser may clear the device copy when space runs low: such a pack starts over
    if (r.bytes && !(await caches.has(packCache(p.id)))) { void kvPut(`pack:${p.id}`, undefined); continue; }
    records[p.id] = r;
  }
  set({ tracks: new Set(await listAudioKeys()), sizes: { ...sizes }, stored: storedOf() });
  void refreshUsage();
})());

const fetchIndex = async () => {
  try {
    const res = await fetch('/offline/index.json', { cache: 'no-cache' });
    if (!res.ok) return false;
    const { packs } = (await res.json()) as { packs: PackInfo[] };
    writeJson(INDEX_KEY, packs);
    for (const p of packs) {
      if (records[p.id]) continue;
      const r = await kvGet<PackRecord>(`pack:${p.id}`);
      if (r) records[p.id] = r;
    }
    state = { ...state, packs };
    set({ stored: storedOf() });
    return true;
  } catch { return false; }
};

const removePack = async (id: string) => {
  epoch[id] = (epoch[id] ?? 0) + 1;
  delete records[id];
  await caches.delete(packCache(id)).catch(() => false);
  await kvPut(`pack:${id}`, undefined);
  set({ stored: storedOf() });
};

let run = { what: '', done: 0, total: 0 };
let lastEmit = 0;
const progress = (bytes: number, what: string) => {
  run.done += bytes;
  run.what = what;
  const now = Date.now();
  if (now - lastEmit > 300) { lastEmit = now; set({ run: { ...run }, stored: storedOf() }); }
};

interface Job { p: PackInfo; files: FileEntry[]; todo: FileEntry[] }

/** Downloads a pack's missing or changed files, three at a time; false when the internet went away. */
const runPack = async ({ p, files, todo }: Job) => {
  const my = epoch[p.id] ?? 0;
  const alive = () => (epoch[p.id] ?? 0) === my && isKept(state, p.id);
  const cache = await caches.open(packCache(p.id));
  const rec = (records[p.id] ??= { v: null, have: {}, bytes: 0 });
  const listed = new Set(files.map(f => f[0]));
  for (const path of Object.keys(rec.have)) {
    if (listed.has(path)) continue;
    await cache.delete(`/${path}`);
    delete rec.have[path];
  }
  const save = () => { rec.bytes = countBytes(rec, files); return alive() ? kvPut(`pack:${p.id}`, rec) : Promise.resolve(); };
  let next = 0, since = 0, lost = false, broken = false;
  const worker = async () => {
    while (!lost && next < todo.length && alive()) {
      const [path, bytes, hash] = todo[next++];
      try {
        // ?sg= passes the service worker by (vite.config.ts) and any stale copy on the way
        const res = await fetch(`/${path}?sg=${hash}`);
        if (!res.ok) { broken = true; continue; }
        const body = await res.blob();
        if (!alive()) return;
        const type = res.headers.get('Content-Type') || 'application/octet-stream';
        await cache.put(`/${path}`, new Response(body, { headers: { 'Content-Type': type, 'x-sg-pack': p.id } }));
        rec.have[path] = hash;
        rec.bytes += bytes;
        progress(bytes, p.id);
        if (++since >= 40) { since = 0; void save(); }
      } catch {
        lost = true;
      }
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  if (!alive()) return true;
  if (!lost && !broken) rec.v = p.v;
  // a fetch that threw while the phone is online: the server is unreachable, not the internet gone
  if (broken || (lost && navigator.onLine)) failed = true;
  await save();
  set({ stored: storedOf() });
  return !lost;
};

/** What the chosen recordings need; removes at once what was downloaded here and is no longer chosen. */
const planRecordings = async () => {
  const { groups, items } = state.choice;
  // before sign-in is known the recordings are hidden: keep everything as it is and look again later
  if (recordingsAreHidden()) return;
  if (!groups.length && !items.length && !owned.size) { needed = new Set(); set({ recMissing: 0 }); return; }
  const { recordingGroups, notesKeptTracks } = await import('../data/offlineRecordings');
  const want = new Set<string>();
  for (const g of recordingGroups()) {
    for (const it of g.items) if (groups.includes(g.id) || items.includes(it.id)) it.tracks.forEach(t => want.add(t));
  }
  needed = want;
  const keep = new Set([...want, ...notesKeptTracks()]);
  const drop = [...owned].filter(t => !keep.has(t));
  if (drop.length) {
    const tracks = new Set(state.tracks);
    for (const t of drop) { await removeAudioFromIndexedDB(t); owned.delete(t); tracks.delete(t); }
    await saveRec();
    set({ tracks });
  }
  set({ recMissing: [...want].filter(t => !state.tracks.has(t)).length });
};

/** Downloads the chosen recordings one by one; false when the internet went away. */
const runRecordings = async () => {
  for (const url of [...needed]) {
    if (state.tracks.has(url) || !needed.has(url)) continue;
    try {
      const res = await fetch(url);
      if (!res.ok) { failed = true; continue; }
      const buf = await res.arrayBuffer();
      if (!needed.has(url)) continue;
      if (!(await saveAudioToArrayBufferIdb(url, buf))) { failed = true; continue; }
      owned.add(url);
      sizes[url] = buf.byteLength;
      void saveRec();
      set({ tracks: new Set(state.tracks).add(url), sizes: { ...sizes }, recMissing: Math.max(0, state.recMissing - 1) });
      progress(buf.byteLength, 'rec');
    } catch {
      if (navigator.onLine) failed = true;
      return false;
    }
  }
  return true;
};

const syncOnce = async () => {
  failed = false;
  await load();
  const fresh = navigator.onLine ? await fetchIndex() : false;
  if (fresh) {
    // packs turned off, or gone from the new version
    const ids = new Set(state.packs.map(p => p.id));
    for (const name of await caches.keys()) {
      if (!name.startsWith('sg-pack-')) continue;
      const id = name.slice(8);
      if (!ids.has(id) || !isKept(state, id)) await removePack(id);
    }
  }
  await planRecordings();
  if (!navigator.onLine) { set({ online: false }); return; }
  if (!fresh) { failed = true; return; }
  const order = (id: string) => (isAutoPack(id) ? -1 : state.choice.packs.indexOf(id));
  const jobs: Job[] = [];
  for (const p of [...state.packs].sort((a, b) => order(a.id) - order(b.id))) {
    if (!fetchable(p.id) || records[p.id]?.v === p.v) continue;
    try {
      const res = await fetch(`/offline/${p.id}.json?v=${p.v}`);
      if (!res.ok) { failed = true; continue; }
      const { files } = (await res.json()) as { files: FileEntry[] };
      const have = records[p.id]?.have ?? {};
      jobs.push({ p, files, todo: files.filter(([path, , hash]) => have[path] !== hash) });
    } catch { return; }
  }
  const recTodo = [...needed].filter(t => !state.tracks.has(t));
  if (!jobs.length && !recTodo.length) return;
  const est = trackEstimate(sizes);
  run = {
    what: jobs[0]?.p.id ?? 'rec',
    done: 0,
    total: jobs.reduce((s, j) => s + j.todo.reduce((a, f) => a + f[1], 0), 0) + recTodo.reduce((s, t) => s + est(t), 0),
  };
  set({ run: { ...run } });
  for (const job of jobs) if (!(await runPack(job))) return;
  await runRecordings();
};

let running = false, again = false;
const sync = async () => {
  if (running) { again = true; return; }
  running = true;
  try {
    do { again = false; await syncOnce(); } while (again);
  } catch (err) {
    // the device's storage refused (full, or blocked in a private window)
    console.warn('offline sync failed', err);
    failed = true;
  } finally {
    running = false;
    set({ run: null, failed, stored: storedOf() });
    void refreshUsage();
  }
};

let timer: number | undefined;
const schedule = (ms: number) => { window.clearTimeout(timer); timer = window.setTimeout(() => void sync(), ms); };

/** Runs the queue now; `force` also downloads the automatic packs while the data saver is on. */
export const syncNow = (force = false) => { if (force) forced = true; schedule(0); };

const saveChoice = (choice: Choice) => { writeJson(CHOICE_KEY, choice); set({ choice }); };

/** Turns optional packs (a chant book's pages, the saints' lives) on or off; off removes them from the device at once. */
export const setPacks = async (ids: string[], on: boolean) => {
  const rest = state.choice.packs.filter(x => !ids.includes(x));
  saveChoice({ ...state.choice, packs: on ? [...rest, ...ids] : rest });
  if (on) { askToKeep(); schedule(0); return; }
  for (const id of ids) await removePack(id);
  void refreshUsage();
};

const afterRecChange = async (on: boolean) => {
  if (on) askToKeep();
  await planRecordings();
  if (on) schedule(0);
  void refreshUsage();
};

/** A whole recording group on or off (on also takes the group's future recordings). */
export const setGroup = async (group: RecGroupRef, on: boolean) => {
  const inGroup = new Set(group.items.map(i => i.id));
  const groups = state.choice.groups.filter(g => g !== group.id);
  saveChoice({ ...state.choice, groups: on ? [...groups, group.id] : groups, items: state.choice.items.filter(i => !inGroup.has(i)) });
  await afterRecChange(on);
};

/** One recording on or off; when every recording of the group is on, the whole group is. */
export const setItem = async (group: RecGroupRef, itemId: string, on: boolean) => {
  const inGroup = new Set(group.items.map(i => i.id));
  let { groups, items } = state.choice;
  if (groups.includes(group.id)) {
    groups = groups.filter(g => g !== group.id);
    items = [...items.filter(i => !inGroup.has(i)), ...inGroup];
  }
  items = on ? [...new Set([...items, itemId])] : items.filter(i => i !== itemId);
  if (group.items.every(i => items.includes(i.id))) {
    groups = [...groups, group.id];
    items = items.filter(i => !inGroup.has(i));
  }
  saveChoice({ ...state.choice, groups, items });
  await afterRecChange(on);
};

export type OfflineStatus = 'run' | 'offline' | 'pending' | 'ready' | 'starting';
/** One word for the header's cloud and the page's top line. */
export const offlineStatus = (s: OfflineState): OfflineStatus => {
  if (s.run) return 'run';
  if (!s.online) return 'offline';
  if (!s.packs.length) return 'starting';
  if (s.recMissing > 0 || s.packs.some(p => isKept(s, p.id) && !s.stored[p.id]?.complete)) return 'pending';
  return s.appReady ? 'ready' : 'starting';
};
export const runPercent = (s: OfflineState) => (s.run?.total ? Math.min(99, Math.floor((s.run.done / s.run.total) * 100)) : 0);

let started = false;
/** Called once at start-up (main.tsx): the first run waits until the app has settled, so it never slows the first screen. */
export const startOffline = () => {
  if (started || !supported) return;
  started = true;
  window.addEventListener('online', () => { set({ online: true }); schedule(2000); });
  window.addEventListener('offline', () => set({ online: false }));
  connection()?.addEventListener?.('change', () => set({ saveData: !!connection()?.saveData }));
  // a service worker becomes active only once all the app's files are on the device (the next opening runs from
  // them even without internet, though the very first page is not yet in its hands)
  navigator.serviceWorker?.ready.then(() => set({ appReady: true })).catch(() => undefined);
  void load().then(() => { if (import.meta.env.PROD) schedule(8000); });
};
