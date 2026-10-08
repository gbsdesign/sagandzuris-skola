import { placementsVersion } from '../../data/placements';
import { ServiceType } from '../../context';
import {
  TSIRVA_CHANTS, MWUKHRI_CHANTS, CISKARI_CHANTS, SADGHESASWAULO_CHANTS, MARXVANI_CHANTS, ZATIKI_CHANTS,
  MOMIXSENENI_CHANTS, DZLISPIREBI_CHANTS, KATABASIEBI_CHANTS, DASADEBLEBI_CHANTS, ChantItem, FOLK_SONGS, FolkSong, getFolkRegion,
} from '../../data';
import { MORNING_EVENING, AKATHISTS, KATHISMAS, PSALTER_RULE, PRAYER_HOURS, weekPrayerId, prayerTitle } from '../../data/prayers';
import { SearchQuery, matchesQuery, searchKey } from '../../utils/searchUtils';

export type Service = NonNullable<ServiceType>;

// The chant list of every service
export const SERVICE_CHANTS: Record<Service, ChantItem[]> = {
  'წირვა': TSIRVA_CHANTS,
  'მწუხრი': MWUKHRI_CHANTS,
  'ცისკარი': CISKARI_CHANTS,
  'სადღესასწაულო': SADGHESASWAULO_CHANTS,
  'მარხვანი': MARXVANI_CHANTS,
  'ზატიკი': ZATIKI_CHANTS,
  'მომიხსენენი': MOMIXSENENI_CHANTS,
  'ძლისპირები': DZLISPIREBI_CHANTS,
  'კატაბასიები': KATABASIEBI_CHANTS,
  'დასადებლები': DASADEBLEBI_CHANTS,
};

// A chant is found by its title or by any of its versions' names; the key is made once per chant
const chantKeys = new WeakMap<ChantItem, string>();
const chantKey = (chant: ChantItem) => {
  let key = chantKeys.get(chant);
  if (key === undefined) {
    const names = (chant.variants || []).flatMap(v => [v.fullTitle, v.chantName, v.label, v.code]);
    key = searchKey([chant.title, ...names].filter(Boolean).join(' · '));
    chantKeys.set(chant, key);
  }
  return key;
};
export const chantMatches = (chant: ChantItem, q: SearchQuery | null) => matchesQuery(chantKey(chant), q);

export interface ChantHit { service: Service; chant: ChantItem }
export const searchChants = (q: SearchQuery, skip?: ServiceType): ChantHit[] =>
  (Object.keys(SERVICE_CHANTS) as Service[])
    .filter(s => s !== skip)
    .flatMap(service => SERVICE_CHANTS[service].filter(c => chantMatches(c, q)).map(chant => ({ service, chant })));

// Songs: title, region and place
// (made again after a recording is moved: data/placements)
let songIndex: { song: FolkSong; key: string }[] | null = null;
let songIndexOf = -1;
export const searchSongs = (q: SearchQuery, showOwnerOnly: boolean): FolkSong[] => {
  if (songIndexOf !== placementsVersion()) { songIndex = null; songIndexOf = placementsVersion(); }
  songIndex ??= FOLK_SONGS.map(song => ({
    song,
    key: searchKey([song.title, getFolkRegion(song.region).nameGe, song.municipality, song.area].filter(Boolean).join(' · ')),
  }));
  return songIndex.filter(s => (showOwnerOnly || !s.song.ownerOnly) && matchesQuery(s.key, q)).map(s => s.song);
};

// Prayers of the prayer book (the Bible chapters are left out: they are read by book, not looked up by name)
let prayerIndex: { id: string; title: string; key: string }[] | null = null;
export const searchPrayers = (q: SearchQuery) => {
  prayerIndex ??= [
    ...MORNING_EVENING.map(p => p.id),
    ...[0, 1, 2, 3, 4, 5, 6].flatMap(d => [weekPrayerId(d, 'dila'), weekPrayerId(d, 'dzili')]),
    ...PRAYER_HOURS.map(h => h.id),
    PSALTER_RULE.id,
    ...KATHISMAS.map(k => k.id),
    ...AKATHISTS.map(a => a.id),
  ].map(id => ({ id, title: prayerTitle(id), key: searchKey(prayerTitle(id)) }));
  return prayerIndex.filter(p => matchesQuery(p.key, q));
};
