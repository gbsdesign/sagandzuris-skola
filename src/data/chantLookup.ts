// Finding a chant version anywhere in the six services, and the things the notes page needs around it:
// which service it belongs to, the version to open next, names of the books.
import { TSIRVA_CHANTS, ChantItem, ChantVariant } from './tsirvaChants';
import { MWUKHRI_CHANTS, CISKARI_CHANTS } from './gelatiBookChants';
import { SADGHESASWAULO_CHANTS } from './feastBookChants';
import { MARXVANI_CHANTS, ZATIKI_CHANTS } from './triodionBookChants';
import { getChantMedia } from './chantMediaRegistry';

export type ServiceName = 'წირვა' | 'მწუხრი' | 'ცისკარი' | 'სადღესასწაულო' | 'მარხვანი' | 'ზატიკი';

export const SERVICE_LISTS: [ServiceName, ChantItem[]][] = [
  ['წირვა', TSIRVA_CHANTS],
  ['მწუხრი', MWUKHRI_CHANTS],
  ['ცისკარი', CISKARI_CHANTS],
  ['სადღესასწაულო', SADGHESASWAULO_CHANTS],
  ['მარხვანი', MARXVANI_CHANTS],
  ['ზატიკი', ZATIKI_CHANTS],
];

export interface VersionInfo {
  chant: ChantItem;
  variant: ChantVariant;
  service: ServiceName;
  serviceIndex: number; // position of the service in SERVICE_LISTS
  chantIndex: number;   // position of the chant in its service
}

let index: Map<string, VersionInfo> | null = null;
const buildIndex = () => {
  const m = new Map<string, VersionInfo>();
  SERVICE_LISTS.forEach(([service, list], serviceIndex) =>
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

/** Something to show on the notes page: book notes, or the recording's own note sheets. */
export const canOpenNotes = (chant: ChantItem, v: ChantVariant) =>
  hasBookNotes(v) || Boolean(getChantMedia(chant.id, v.code)?.notes.length);

// "გ.ს. გამშვ" / "გ.ს. №162" -> "გ.ს."
export const schoolOf = (code: string) => (code || '').trim().split(/\s+/)[0];

export const SCHOOL_NAMES: Record<string, string> = {
  'გ.ს.': 'გელათის სკოლა',
  'ქ.კ.': 'ქართლ-კახური',
  'შ.ს.': 'შემოქმედის სკოლა',
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
  const list = SERVICE_LISTS[info.serviceIndex][1];
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
