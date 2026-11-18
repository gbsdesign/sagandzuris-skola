// A class's „სასწავლო პროგრამა“ on the phone in one tap (2026-11-05, the user: „ბევრი რამე უკვე აპს ქონდეს და არ
// უწევდეს ჩამოტვირთვა“). The app itself and the notes' JSON are on the device already (the service worker's precache and
// the automatic packs, utils/offlineFiles.ts); what a class still downloads on opening is kept here:
// • a chant version — its book pages, drawings and the school's recording — by the notes' own „ჩამოწერა“ (offlineNotes.ts);
// • a folk song — its recordings — through the offline queue (offlineFiles.ts `chooseItems`, the items of
//   data/offlineRecordings.ts `s:<song>`), which the header's cloud shows and never removes by itself.
// Poems' texts (მთქმელი) come in an automatic pack; instruments have nothing to keep.
import { findVersion } from '../data/chantLookup';
import { recordingGroups } from '../data/offlineRecordings';
import { categoryOf } from './pathItems';
import { useSyncExternalStore } from 'react';
import { chooseItems } from './offlineFiles';
import { NOTES_CACHE, estimateMb, isOffline, saveOffline, saveVersionNotes } from './offlineNotes';

export interface ProgramPlan {
  /** chant versions (their notes and the school's recording) */
  versions: string[];
  /** folk songs' recording items of the offline queue (s:<song id>) and their tracks */
  songs: string[];
  tracks: string[];
}

export const programPlan = (ids: string[]): ProgramPlan => {
  const versions = [...new Set(ids.filter(id => categoryOf(id) === 'galoba' && findVersion(id)))];
  const wanted = new Set(ids.filter(id => categoryOf(id) === 'simghera').map(id => `s:${id}`));
  const songs: string[] = [];
  const tracks: string[] = [];
  if (wanted.size) {
    for (const g of recordingGroups()) {
      if (g.section !== 'simghera') continue;
      for (const it of g.items) {
        if (!wanted.has(it.id) || songs.includes(it.id)) continue;
        songs.push(it.id);
        tracks.push(...it.tracks);
      }
    }
  }
  return { versions, songs, tracks: [...new Set(tracks)] };
};

/** Everything of the plan is on this device. */
export const planSaved = (plan: ProgramPlan, hasTrack: (url: string) => boolean) =>
  plan.versions.every(isOffline) && plan.tracks.every(hasTrack);

/** Roughly what is left to download (MB): the notes' own estimate, about 4.8 MB a recording. */
export const planMb = (plan: ProgramPlan, hasTrack: (url: string) => boolean) => {
  const notes = plan.versions.some(id => !isOffline(id)) ? estimateMb(plan.versions) : 0;
  const recs = plan.tracks.filter(t => !hasTrack(t)).length * 4.8;
  return Math.max(1, Math.round(notes + recs));
};

// ---- the save itself, shared by the class page's ☁ and the automatic watcher (2026-11-18) ----------------------------

export interface ProgramRun { notes: { done: number; total: number } | null; asked: boolean; trouble: string }
let run: ProgramRun = { notes: null, asked: false, trouble: '' };
const subs = new Set<() => void>();
const set = (p: Partial<ProgramRun>) => { run = { ...run, ...p }; subs.forEach(f => f()); };
const subscribeRun = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export const useProgramRun = () => useSyncExternalStore(subscribeRun, () => run);

// versions whose notes (without the recording) were saved by „მხოლოდ ნოტები“
const ONLY_KEY = 'sg-program-notes-only';
const readOnly = (): Set<string> => { try { return new Set(JSON.parse(localStorage.getItem(ONLY_KEY) || '[]')); } catch { return new Set(); } };
let onlyNotes = readOnly();
export const notesOnlyHas = (id: string) => onlyNotes.has(id);

/** Saves the plan: the notes first (with their own count), then the folk songs' recordings in the offline queue. */
export const runProgramSave = async (plan: ProgramPlan, online: boolean, notesOnly = false) => {
  if (run.notes) return;
  set({ trouble: '', asked: true });
  if (!online) set({ trouble: 'ინტერნეტი არ არის — ჩაირთვება, როცა დაბრუნდება.' });
  if (plan.versions.length) {
    set({ notes: { done: 0, total: plan.versions.length } });
    try {
      if (notesOnly) {
        const cache = await caches.open(NOTES_CACHE);
        let done = 0;
        for (const id of plan.versions) {
          try {
            if (!isOffline(id)) { await saveVersionNotes(cache, id); onlyNotes = new Set([...onlyNotes, id]); }
          } catch (err) { console.warn('notes save failed', id, err); }
          done += 1;
          set({ notes: { done, total: plan.versions.length } });
        }
        try { localStorage.setItem(ONLY_KEY, JSON.stringify([...onlyNotes])); } catch { /* storage full */ }
      } else {
        await saveOffline(plan.versions, (done, total) => set({ notes: { done, total } }));
      }
    } finally { set({ notes: null }); }
  }
  if (!notesOnly && plan.songs.length) await chooseItems(plan.songs);
  if (plan.versions.some(id => !isOffline(id) && !(notesOnly && onlyNotes.has(id)))) {
    set({ trouble: 'ნაწილი ვერ ჩამოიწერა. შეამოწმე ინტერნეტი და სცადე თავიდან.' });
  }
};

/** The notes alone: about 160 KB a version still to save. */
export const notesOnlyMb = (plan: ProgramPlan) =>
  Math.max(1, Math.round(plan.versions.filter(id => !isOffline(id) && !onlyNotes.has(id)).length * 0.16));

/** Free room on the phone in MB (quota − usage), or null when the browser cannot tell. */
export const freeMb = async (): Promise<number | null> => {
  try {
    const e = await navigator.storage?.estimate?.();
    if (!e?.quota) return null;
    return Math.max(0, Math.round((e.quota - (e.usage || 0)) / (1024 * 1024)));
  } catch { return null; }
};

// ---- the device's settings per class (the automatic download) ----
export interface AutoSetting { auto: boolean; wifi: boolean; askedDay?: string; spaceDay?: string }
const AUTO_KEY = 'sg-program-auto';
const autoSubs = new Set<() => void>();
const readAuto = (): Record<string, Partial<AutoSetting>> => { try { return JSON.parse(localStorage.getItem(AUTO_KEY) || '{}') || {}; } catch { return {}; } };
export const autoOf = (classId: string): AutoSetting => ({ auto: true, wifi: true, ...readAuto()[classId] });
export const setAutoOf = (classId: string, patch: Partial<AutoSetting>) => {
  const all = readAuto();
  all[classId] = { ...autoOf(classId), ...patch };
  try { localStorage.setItem(AUTO_KEY, JSON.stringify(all)); } catch { /* private window */ }
  autoSubs.forEach(f => f());
};
export const useAutoOf = (classId: string): AutoSetting => {
  const raw = useSyncExternalStore(f => { autoSubs.add(f); return () => { autoSubs.delete(f); }; }, () => localStorage.getItem(AUTO_KEY) || '');
  void raw;
  return autoOf(classId);
};
