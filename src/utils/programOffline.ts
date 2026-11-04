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
import { estimateMb, isOffline } from './offlineNotes';

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
