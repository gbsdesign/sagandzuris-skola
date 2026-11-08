import type { FolkRegionId } from './songsData';

export interface InstrumentItem {
  id: string;
  nameGe: string;
  /** false: not a Georgian folk instrument (e.g. the guitar) */
  folk?: boolean;
  /** the songs map's regions where it is played (the instruments' map, 2026-11-08) */
  regions: FolkRegionId[];
  /** one short line: where it comes from, in words (the full list under the map) */
  where: string;
  /** a region's own word for it, or what is special there (shown in that region's list) */
  here?: Partial<Record<FolkRegionId, string>>;
}

// Where each instrument is played, checked in two places (2026-11-08): the International Research Center for Traditional
// Polyphony (polyphony.ge — „Musical Instruments“ by instrument and „Provinces“ by region) and Georgian Wikipedia /
// geofolk.ge (ჩონგური, ჭიანური, ფანდური, ლარჩემი-სოინარი). Tusheti is on the map's Kakheti, Khevsureti, Pshavi, Khevi and
// Mtiuleti on Mtskheta-Mtianeti, „Kartli“ = both Kartlis. „Rarely“ places (panduri in Racha and Upper Imereti, chonguri in
// Lechkhumi) are left out.
export const INSTRUMENTS_LIST: InstrumentItem[] = [
  { id: 'chonguri', nameGe: 'ჩონგური', where: 'დასავლეთ საქართველო', regions: ['guria', 'samegrelo', 'imereti', 'achara', 'abkhazeti'] },
  {
    id: 'fanduri', nameGe: 'ფანდური', where: 'აღმოსავლეთ საქართველოს მთა და ბარი',
    regions: ['kakheti', 'shidakartli', 'kvemokartli', 'mtianeti'],
    here: { mtianeti: 'ხევსურეთში ორსიმიანიც' },
  },
  {
    id: 'doli', nameGe: 'დოლი', where: 'საქართველოს ბარი',
    regions: ['kakheti', 'shidakartli', 'kvemokartli', 'samtskhe', 'imereti', 'samegrelo', 'guria', 'achara'],
  },
  { id: 'garmoni', nameGe: 'გარმონი', where: 'განსაკუთრებით თუშეთი', regions: ['kakheti'], here: { kakheti: 'განსაკუთრებით თუშეთში' } },
  {
    id: 'chuniri', nameGe: 'ჭუნირი', where: 'სვანეთი, რაჭა, ხევსურეთი, თუშეთი',
    regions: ['svaneti', 'racha', 'mtianeti', 'kakheti'],
    here: { racha: 'აქ ჭიანური ჰქვია', mtianeti: 'ხევსურეთში — ჭიანური', kakheti: 'თუშეთში — ჭიანური' },
  },
  { id: 'changi', nameGe: 'ჩანგი', where: 'სვანეთი', regions: ['svaneti'] },
  {
    id: 'salamuri', nameGe: 'სალამური', where: 'ქართლი, კახეთი, მესხეთი, თუშეთი, ფშავი',
    regions: ['shidakartli', 'kvemokartli', 'kakheti', 'samtskhe', 'mtianeti'],
    here: { mtianeti: 'ფშავში', samtskhe: 'მესხეთში' },
  },
  {
    id: 'larchemi', nameGe: 'ლარჩემი', where: 'სამეგრელო, აფხაზეთი, გურია (სოინარი)',
    regions: ['samegrelo', 'abkhazeti', 'guria'],
    here: { guria: 'აქ სოინარი ჰქვია' },
  },
  { id: 'gitara', nameGe: 'გიტარა', folk: false, where: 'ქალაქური სიმღერა, იმერეთი', regions: ['kalakuri', 'imereti'] },
];

/** the instruments played in a region, in the list's order */
export const instrumentsIn = (region: FolkRegionId) => INSTRUMENTS_LIST.filter(i => i.regions.includes(region));
