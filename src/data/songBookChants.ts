import type { ChantItem } from './tsirvaChants';
import { BOYS_SONGS, BOYS_SONGS_2025, GIRLS_SONGS, type ProgramItem } from './abituriProgram';

// The admission program's songs that have notes (public/notes/song/NNN.json + webp, made from the songs' PDFs by the
// OMR scripts; 9 and 10 are scans: pictures only, no synthesizer). They open on the notes page like chant versions
// (id "sg-N"), listed only on the "აბიტურიენტს" page — no service tab, not in the search.
export const SONG_BOOK = 'song';
export const songVid = (n: number) => `sg-${n}`;

const withNotes = (): ProgramItem[] => {
  const seen = new Set<number>();
  return [...BOYS_SONGS, ...GIRLS_SONGS, ...BOYS_SONGS_2025].filter(it => it.notes && !seen.has(it.notes) && seen.add(it.notes))
    .sort((a, b) => a.notes! - b.notes!);
};

export const SONG_ITEMS: ProgramItem[] = withNotes();

export const SONG_CHANTS: ChantItem[] = SONG_ITEMS.map(it => ({
  id: `song-${it.notes}`,
  index: it.notes!,
  title: it.title,
  variants: [{
    id: songVid(it.notes!),
    code: it.sub.split(' · ')[0],
    label: it.sub,
    chantName: it.title,
    fullTitle: `${it.title} (${it.sub})`,
    version: it.sub,
    book: SONG_BOOK,
    bookNums: [it.notes!],
  }],
}));
