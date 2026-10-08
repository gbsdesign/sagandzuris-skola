import { ChantItem, ChantVariant, versionTitle } from './tsirvaChants';
import { ALL_CHANTS } from './gelatiBookChants';
import { FOLK_SONGS, getFolkRegion } from './songsData';
import { MTKMELI_AUTHORS } from './mtkmeliData';
import { INSTRUMENTS_LIST, InstrumentItem } from './instrumentsData';
import { MANERA_ITEMS, HABIT_ITEMS, ManeraItemType, HabitItemType } from './habitsAndManera';

export interface DataRegistryItem {
  id: string;
  title: string;
  category: 'chant' | 'song' | 'poem' | 'instrument';
  code: string;
  regionOrAuthor?: string;
}

// Quick lookup maps
const lookupCache = new Map<string, DataRegistryItem>();

export const getAllRegistryItems = (): Map<string, DataRegistryItem> => {
  if (lookupCache.size > 0) return lookupCache;

  // 1. Chants
  ALL_CHANTS.forEach((chant) => {
    chant.variants.forEach((v) => {
      lookupCache.set(v.id, {
        id: v.id,
        title: versionTitle(chant, v),
        category: 'chant',
        code: v.code,
        regionOrAuthor: v.label,
      });
    });
  });

  // 2. Songs
  FOLK_SONGS.forEach((song) => {
    const region = getFolkRegion(song.region);
    lookupCache.set(song.id, {
      id: song.id,
      title: song.title,
      category: 'song',
      code: region.regionCode,
      regionOrAuthor: region.nameGe,
    });
  });

  // 3. Poems
  MTKMELI_AUTHORS.forEach((author) => {
    author.works.forEach((work) => {
      lookupCache.set(work.id, {
        id: work.id,
        title: work.title,
        category: 'poem',
        code: getFolkRegion(author.region).regionCode,
        regionOrAuthor: author.name,
      });
    });
  });

  // 4. Instruments
  INSTRUMENTS_LIST.forEach((inst) => {
    lookupCache.set(inst.id, {
      id: inst.id,
      title: inst.nameGe,
      category: 'instrument',
      code: 'საკრავი',
      regionOrAuthor: inst.folk === false ? 'საკრავი' : 'ხალხური საკრავი',
    });
  });

  return lookupCache;
};

export const getRegistryItemById = (id: string): DataRegistryItem | undefined => {
  const map = getAllRegistryItems();
  return map.get(id);
};

export const isValidRegistryId = (id: string): boolean => {
  const map = getAllRegistryItems();
  if (map.has(id)) return true;
  const instrumentPrefixes = ['chonguri', 'fanduri', 'doli', 'garmoni', 'chuniri', 'changi'];
  return instrumentPrefixes.some((prefix) => id === prefix || id.startsWith(prefix));
};
