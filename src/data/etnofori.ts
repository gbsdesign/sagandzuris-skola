// „ვიდეოები“ — the TV programme „ეთნოფორი“ (Adjara TV, author and host მიხეილ გაბაიძე) on its YouTube channel. The list is
// `etnoforiVideos.json`, made by `scripts/etnofori/build.py` from the channel's list — never edit it by hand. A song's
// region = the place its title names (the songs map's 13 regions, ლაზეთი, or „abroad“); full episodes have their own list.
import { FOLK_EXTRA_REGIONS, FOLK_REGIONS, FolkRegion, FolkRegionId } from './songsData';

export const ETNOFORI_CHANNEL = 'https://www.youtube.com/@etnofori';

/** [YouTube id, song, who and where (as the title says), region, place (the municipality), seconds] */
export type EtnoSong = [string, string, string, string, string, number];
/** [YouTube id, the episode's № („329–330“ for a double one), date dd.mm.yyyy, part („I ნაწილი“ or ''), seconds] */
export type EtnoEpisode = [string, string, string, string, number];
export interface EtnoData { updated: string; songs: EtnoSong[]; episodes: EtnoEpisode[] }

let loading: Promise<EtnoData> | null = null;
export const loadEtnofori = () =>
  (loading ??= import('./etnoforiVideos.json').then(m => m.default as unknown as EtnoData).catch(e => { loading = null; throw e; }));

/** recordings made outside Georgia: a card after the map's regions, like ლაზეთი */
export const ABROAD = { id: 'abroad' as FolkRegionId, nameGe: 'უცხოეთი', regionCode: 'უცხ.', color: '#9db0c4' } satisfies FolkRegion;
const LAZETI = FOLK_EXTRA_REGIONS.find(r => r.id === 'lazeti')!;
/** the cards under the map */
export const ETNO_EXTRA: FolkRegion[] = [LAZETI, ABROAD];

/** on this page Tbilisi is the place the songs were recorded, not the songs' „ქალაქური“ */
export const etnoRegionName = (r: FolkRegion) => (r.id === 'kalakuri' ? 'თბილისი' : r.nameGe);
export const etnoRegion = (id: string): FolkRegion | null =>
  [...FOLK_REGIONS, ...ETNO_EXTRA].find(r => r.id === id) ?? null;

export const thumbOf = (id: string) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
export const embedOf = (id: string) =>
  `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1&modestbranding=1`;
export const watchOf = (id: string) => `https://www.youtube.com/watch?v=${id}`;

/** 3:05 · 1:02:40 */
export const clock = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const two = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${two(m)}:${two(sec)}` : `${m}:${two(sec)}`;
};

const MONTHS = ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი', 'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'];
/** „01.11.2026“ → „1 ნოემბერი, 2026“ */
export const dayText = (d: string) => {
  const [dd, mm, yy] = d.split('.').map(Number);
  return `${dd} ${MONTHS[mm - 1] ?? ''}, ${yy}`;
};
