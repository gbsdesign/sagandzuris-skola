import { AUDIO_PROXY, type ChantMediaItem } from './chantMediaRegistry';
import { recordingsAreHidden } from './runtimeRecordings';
import type { ProgramTake } from './abituriProgram';
import { SONG_ITEMS, songVid } from './songBookChants';

// Player media for the admission program's recordings (voice by voice), on the "აბიტურიენტს" page and on
// the songs' notes pages.

// a Drive file id → the audio Worker; "e:<path>" → the Worker's galoba.edu.ge route
const trackUrl = (src?: string) => {
  if (!src) return '';
  if (src.startsWith('e:')) return `${AUDIO_PROXY}/edu/${src.slice(2).split('/').map(encodeURIComponent).join('/')}`;
  return `${AUDIO_PROXY}/${src}`;
};

export const takeMedia = (key: string, title: string, t: ProgramTake): ChantMediaItem => ({
  key,
  title,
  folderId: '',
  folderUrl: '',
  tracks: [trackUrl(t.v1), trackUrl(t.v2), trackUrl(t.v3), trackUrl(t.all)],
  availableVoices: { voice1: !!t.v1, voice2: !!t.v2, voice3: !!t.v3, all: !!t.all },
  notes: [],
});

export const hasVoices = (t: ProgramTake) => Boolean(t.v1 || t.v2 || t.v3);

/** The recordings of a song's notes page (sg-N), for its ჩანაწერი panel; the files are played as they are. */
export const songRecordings = (vid: string): { label: string; media: ChantMediaItem }[] => {
  if (recordingsAreHidden()) return [];
  const item = SONG_ITEMS.find(it => songVid(it.notes!) === vid);
  return (item?.takes ?? []).map((t, k) => ({
    label: `${t.label}${hasVoices(t) ? ' · ხმებით' : ''}`,
    media: takeMedia(`song:${vid}:${k}`, item!.title, t),
  }));
};
