// Finding a chant version anywhere in the six services, and the things the notes page needs around it:
// which service it belongs to, the version to open next, names of the books.
import { TSIRVA_CHANTS, ChantItem, ChantVariant } from './tsirvaChants';
import { MWUKHRI_CHANTS, CISKARI_CHANTS } from './gelatiBookChants';
import { SADGHESASWAULO_CHANTS } from './feastBookChants';
import { MARXVANI_CHANTS, ZATIKI_CHANTS } from './triodionBookChants';
import { MOMIXSENENI_CHANTS } from './beatitudesBookChants';
import { DZLISPIREBI_CHANTS, KATABASIEBI_CHANTS } from './irmosBookChants';
import { DASADEBLEBI_CHANTS } from './sticheraBookChants';
import { SONG_CHANTS } from './songBookChants';

export type ServiceName = 'წირვა' | 'მწუხრი' | 'ცისკარი' | 'სადღესასწაულო' | 'მარხვანი' | 'ზატიკი' | 'მომიხსენენი'
  | 'ძლისპირები' | 'კატაბასიები' | 'დასადებლები';
/** A list the notes page can open: a service tab, or the admission program's songs (no tab). */
export type NotesListName = ServiceName | 'სიმღერა';
export const isServiceTab = (s: NotesListName): s is ServiceName => s !== 'სიმღერა';

export const SERVICE_LISTS: [ServiceName, ChantItem[]][] = [
  ['წირვა', TSIRVA_CHANTS],
  ['მწუხრი', MWUKHRI_CHANTS],
  ['ცისკარი', CISKARI_CHANTS],
  ['სადღესასწაულო', SADGHESASWAULO_CHANTS],
  ['მარხვანი', MARXVANI_CHANTS],
  ['ზატიკი', ZATIKI_CHANTS],
  ['მომიხსენენი', MOMIXSENENI_CHANTS],
  ['ძლისპირები', DZLISPIREBI_CHANTS],
  ['კატაბასიები', KATABASIEBI_CHANTS],
  ['დასადებლები', DASADEBLEBI_CHANTS],
];

// everything the notes page can open: the services, then lists without a service tab — the admission program's
// songs (songBookChants.ts). Search, recordings admin and synth downloads use SERVICE_LISTS only.
export const NOTES_LISTS: [NotesListName, ChantItem[]][] = [...SERVICE_LISTS, ['სიმღერა', SONG_CHANTS]];

export interface VersionInfo {
  chant: ChantItem;
  variant: ChantVariant;
  service: NotesListName;
  serviceIndex: number; // position of the service in SERVICE_LISTS
  chantIndex: number;   // position of the chant in its service
}

let index: Map<string, VersionInfo> | null = null;
const buildIndex = () => {
  const m = new Map<string, VersionInfo>();
  NOTES_LISTS.forEach(([service, list], serviceIndex) =>
    list.forEach((chant, chantIndex) =>
      (chant.variants ?? []).forEach(variant => {
        if (!m.has(variant.id)) m.set(variant.id, { chant, variant, service, serviceIndex, chantIndex });
      })
    )
  );
  return m;
};

export const findVersion = (variantId: string | null | undefined): VersionInfo | undefined =>
  variantId ? (index ??= buildIndex()).get(variantId) : undefined;

export const hasBookNotes = (v: ChantVariant) => Boolean(v.bookNums?.length);

/** The notes page shows the books' notes only (never the Drive copies of a recording's sheets). */
export const canOpenNotes = (_chant: ChantItem, v: ChantVariant) => hasBookNotes(v);

// "გ.ს. გამშვ" / "გ.ს. №162" -> "გ.ს."
export const schoolOf = (code: string) => (code || '').trim().split(/\s+/)[0];

export const SCHOOL_NAMES: Record<string, string> = {
  'გ.ს.': 'გელათის სკოლა',
  'ქ.კ.': 'ქართლ-კახური',
  'შ.ს.': 'შემოქმედის სკოლა',
  'ე.კ.': 'ექვთიმე კერესელიძის ხელნაწერი',
  'რ.ძ.': 'რვახმა საცისკრო ძლისპირები',
  'ჰ.კ.': 'ჰიმნოგრაფიული კრებული',
};

export const BOOK_NAMES: Record<string, string> = {
  book: 'გელათის სკოლის საგალობლები, I ტომი',
  feast: 'გელათის სკოლის საგალობლები, II ტომი',
  kk: 'ქართლ-კახური საგალობლები, III ტომი',
  triod: 'გელათის სკოლის საგალობლები, IV ტომი',
  v5: 'წირვის საგალობლები, V ტომი',
  karb: 'კარბელაანთ კილო, VII ტომი',
  pat: 'დიმიტრი პატარავას საგალობლები',
  v9: 'გელათის სკოლის საგალობლები, IX ტომი',
  momix: 'ჰიმნოგრაფიული კრებული I, მომიხსენენი',
  v8: 'რვახმა საცისკრო ძლისპირები, VIII ტომი',
  dasd1: 'ჰიმნოგრაფიული კრებული II, დასდებელნი ხმა ა–ბ',
  dasd2: 'ჰიმნოგრაფიული კრებული III, დასდებელნი ხმა გ–დ',
  song: 'აბიტურიენტის პროგრამა — სიმღერები',
};

/** Order of a version inside the services (service first, then the chant's place in it). */
export const serviceOrder = (info: VersionInfo) => info.serviceIndex * 10000 + info.chantIndex;

/**
 * The version to open after (dir 1) or before (dir -1) this one in its service: the neighbouring chant that has notes,
 * in the same book and school when it has such a version.
 */
export const neighbourVersion = (variantId: string, dir: 1 | -1): string | null => {
  const info = findVersion(variantId);
  if (!info) return null;
  const list = NOTES_LISTS[info.serviceIndex][1];
  const book = info.variant.book ?? 'book';
  const school = schoolOf(info.variant.code);
  for (let i = info.chantIndex + dir; i >= 0 && i < list.length; i += dir) {
    const chant = list[i];
    const open = (chant.variants ?? []).filter(v => canOpenNotes(chant, v));
    if (!open.length) continue;
    const same = open.find(v => (v.book ?? 'book') === book && schoolOf(v.code) === school)
      ?? open.find(v => schoolOf(v.code) === school)
      ?? open[0];
    return same.id;
  }
  return null;
};
