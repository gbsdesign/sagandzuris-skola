// Items of a student's "საგანძურის გზა" (selectedChantVariants): building them from any catalogue id,
// searching the catalogue, and one shared ordering (teacher-set `order` first, else catalogue order).
import { ALL_CHANTS } from '../data/gelatiBookChants';
import { versionTitle } from '../data/tsirvaChants';
import { FOLK_SONGS, getFolkRegion } from '../data/songsData';
import { MTKMELI_AUTHORS } from '../data/mtkmeliData';
import { INSTRUMENTS_LIST } from '../data/instrumentsData';

export type Voice = '1' | '2' | '3';

export interface PathItem {
  variantId: string;
  chantId: string;
  chantName: string;
  code: string;
  label: string;
  fullTitle: string;
  isLearned?: boolean;
  voices?: Voice[];
  order?: number;          // position set by the teacher
  assignedByClass?: string; // class id that put this item on the path
}

export type PathCategory = 'galoba' | 'simghera' | 'mtkmeli' | 'sakravebi';

export const CATEGORY_LABEL: Record<PathCategory, string> = {
  galoba: 'გალობა',
  simghera: 'სიმღერა',
  mtkmeli: 'მთქმელი',
  sakravebi: 'საკრავები',
};

const CATALOG_ORDER: Record<string, number> = {};
let n = 0;
ALL_CHANTS.forEach(c => c.variants.forEach(v => { CATALOG_ORDER[v.id] = n++; }));

const INSTRUMENT_IDS = INSTRUMENTS_LIST.map(i => i.id);

// same rules GzaView has always used
export const categoryOf = (id: string): PathCategory => {
  if (id.startsWith('tsirva_') || CATALOG_ORDER[id] !== undefined) return 'galoba';
  if (id.includes('_p') || id.startsWith('abk_p') || id.startsWith('sam_p')) return 'mtkmeli';
  if (INSTRUMENT_IDS.some(p => id.startsWith(p))) return 'sakravebi';
  return 'simghera';
};

/** Voice-marked (chants, songs) or simply learned (poems, instruments). */
export const usesVoices = (id: string) => {
  const c = categoryOf(id);
  return c === 'galoba' || c === 'simghera';
};

const sortKey = (it: PathItem) => (typeof it.order === 'number' ? it.order : 1e6 + (CATALOG_ORDER[it.variantId] ?? 1e6));

export const sortPathItems = <T extends PathItem>(items: T[]): T[] =>
  [...items].sort((a, b) => sortKey(a) - sortKey(b) || a.variantId.localeCompare(b.variantId));

export interface CatalogEntry {
  id: string;
  title: string;
  code: string;
  category: PathCategory;
  make: () => PathItem;
}

let catalog: CatalogEntry[] | null = null;

export const getCatalog = (): CatalogEntry[] => {
  if (catalog) return catalog;
  const list: CatalogEntry[] = [];
  ALL_CHANTS.forEach(chant =>
    chant.variants.forEach(v =>
      list.push({
        id: v.id,
        title: versionTitle(chant, v),
        code: v.code,
        category: 'galoba',
        make: () => ({ variantId: v.id, chantId: chant.id, chantName: chant.title, code: v.code, label: v.label, fullTitle: versionTitle(chant, v), isLearned: false, voices: [] }),
      })
    )
  );
  FOLK_SONGS.forEach(song => {
    const r = getFolkRegion(song.region);
    const name = `${song.title} (${r.nameGe})`;
    list.push({
      id: song.id, title: name, code: r.regionCode, category: 'simghera',
      make: () => ({ variantId: song.id, chantId: song.id, chantName: name, code: r.regionCode, label: r.nameGe, fullTitle: name, isLearned: false, voices: [] }),
    });
  });
  MTKMELI_AUTHORS.forEach(author => {
    const r = getFolkRegion(author.region);
    author.works.forEach(w => {
      const name = `${w.title} - ${author.name} (${r.nameGe})`;
      list.push({
        id: w.id, title: name, code: r.regionCode, category: 'mtkmeli',
        make: () => ({ variantId: w.id, chantId: w.id, chantName: name, code: r.regionCode, label: r.nameGe, fullTitle: name, isLearned: false, voices: [] }),
      });
    });
  });
  INSTRUMENTS_LIST.forEach(inst =>
    list.push({
      id: inst.id, title: inst.nameGe, code: 'საკრავი', category: 'sakravebi',
      make: () => ({ variantId: inst.id, chantId: inst.id, chantName: inst.nameGe, code: 'საკრავი', label: inst.nameGe, fullTitle: inst.nameGe, isLearned: false, voices: [] }),
    })
  );
  catalog = list;
  return list;
};

export const findCatalogEntry = (id: string) => getCatalog().find(e => e.id === id);

export const searchCatalog = (query: string, limit = 30): CatalogEntry[] => {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const out: CatalogEntry[] = [];
  for (const e of getCatalog()) {
    const hay = `${e.title} ${e.code}`.toLowerCase();
    if (words.every(w => hay.includes(w))) {
      out.push(e);
      if (out.length >= limit) break;
    }
  }
  return out;
};

/** Voices of an item, tolerating old records that stored them as a string. */
export const voicesOf = (it: { voices?: unknown; isLearned?: boolean }, id: string): Voice[] => {
  if (!usesVoices(id)) return it.isLearned ? ['1'] : [];
  const v = it.voices;
  const arr = Array.isArray(v) ? v.map(String) : typeof v === 'string' ? v.split(',').map(s => s.trim()) : [];
  return arr.filter((x): x is Voice => x === '1' || x === '2' || x === '3');
};
