import { FOLK_SONGS, type MapRegionId } from './songsData';
import { kutkhePool } from './kutkhePool';
import { RUKA_PLACES } from './rukaPlaces';
import { KUTKHE_REGIONS } from '../utils/kutkhe';
import { NAMES_A_REGION, type RukaItem } from '../utils/ruka';

// „რუკის ვიქტორინა“'s items (utils/ruka.ts): the places of data/rukaPlaces.ts, and the folk songs — with the school's whole
// takes when the member may hear them (data/kutkhePool.ts), else by their title alone, the known ones (three takes or more
// in the archive). A title that names its region („გურული …“, „კახური …“) or is sung in more than one region is asked only
// by its tune.

const NOT_A_SONG = /მელოდია|პოპური|გარმონზე|ჭიბონზე|ფანდურზე|^საქორწილო( სიმღერა)?$|^თხრობა$|ხმით ტირილი/;

const regionOf = (id: string) => KUTKHE_REGIONS.indexOf(id as MapRegionId);

const PLACES: RukaItem[] = RUKA_PLACES.map(p => ({ id: `p:${p.name}`, topic: p.topic, region: regionOf(p.region), name: p.name, note: p.note }));

let plain: { titles: Set<string>; known: RukaItem[] } | null = null;
/** the titles that may be shown, and the known songs to ask by title */
const titled = () => {
  if (plain) return plain;
  const regions = new Map<string, Set<string>>();
  for (const s of FOLK_SONGS) {
    if (s.ownerOnly || regionOf(s.region) < 0) continue;
    const t = s.title.trim();
    regions.set(t, new Set([...(regions.get(t) ?? []), s.region]));
  }
  const ok = (t: string) => !NAMES_A_REGION.test(t) && !NOT_A_SONG.test(t) && (regions.get(t)?.size ?? 0) === 1;
  const titles = new Set([...regions.keys()].filter(ok));
  const known = FOLK_SONGS.flatMap(s => {
    const t = s.title.trim();
    const takes = s.versions.length + (s.recs?.length ?? 0) + (s.centre?.length ?? 0);
    if (s.ownerOnly || regionOf(s.region) < 0 || !titles.has(t) || takes < 3) return [];
    const place = [s.area, s.municipality].filter(Boolean).join(', ');
    return [{ id: `s:${s.id}`, topic: 'song' as const, region: regionOf(s.region), name: t, ...(place ? { note: place } : {}) }];
  });
  plain = { titles, known };
  return plain;
};

/** what a game may ask: the songs heard (`hideTitles`: by their tune alone — any title) or by title, and the places */
export const rukaItems = (hideTitles: boolean): RukaItem[] => {
  const heard = kutkhePool();
  const { titles, known } = titled();
  const songs: RukaItem[] = heard.length
    ? heard.filter(s => hideTitles || titles.has(s.song)).map(s => ({
      id: `s:${s.id}`, topic: 'song', region: s.region, name: s.song, ...(s.place ? { note: s.place } : {}), takes: s.takes,
    }))
    : known;
  return [...songs, ...PLACES];
};

/** the songs can be heard (else they are asked by title) */
export const rukaHears = () => kutkhePool().length > 0;
