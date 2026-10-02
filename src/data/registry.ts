import { TSIRVA_CHANTS, ChantItem, ChantVariant } from './tsirvaChants';
import { GEORGIA_REGIONS, SongItem, RegionData } from './songsData';
import { MTKMELI_REGIONS, PoemItem, MtkmeliRegionData } from './mtkmeliData';
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
  TSIRVA_CHANTS.forEach((chant) => {
    chant.variants.forEach((v) => {
      lookupCache.set(v.id, {
        id: v.id,
        title: v.fullTitle || v.chantName,
        category: 'chant',
        code: v.code,
        regionOrAuthor: v.label,
      });
    });
  });

  // 2. Songs
  GEORGIA_REGIONS.forEach((region) => {
    region.topSongs.forEach((song) => {
      lookupCache.set(song.id, {
        id: song.id,
        title: song.title,
        category: 'song',
        code: song.regionCode,
        regionOrAuthor: region.nameGe,
      });
    });
  });

  // 3. Poems
  MTKMELI_REGIONS.forEach((region) => {
    region.poems.forEach((poem) => {
      lookupCache.set(poem.id, {
        id: poem.id,
        title: poem.title,
        category: 'poem',
        code: poem.regionCode,
        regionOrAuthor: poem.author || region.nameGe,
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
      regionOrAuthor: 'ხალხური საკრავი',
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
