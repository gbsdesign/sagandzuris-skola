export interface PoemItem {
  id: string;
  title: string;
  author: string;
  regionCode: string;
  text: string;
}

export interface MtkmeliRegionData {
  id: string;
  nameGe: string;
  regionCode: string;
  poems: PoemItem[];
}

export const MTKMELI_REGIONS: MtkmeliRegionData[] = [
  { id: 'abkhazia', nameGe: 'აფხაზეთი', regionCode: 'აფხ.', poems: [] },
  { id: 'samegrelo', nameGe: 'სამეგრელო-ზემო სვანეთი', regionCode: 'სამეგ.', poems: [] },
  { id: 'racha_lechkhumi', nameGe: 'რაჭა-ლეჩხუმი', regionCode: 'რაჭ.', poems: [] },
  { id: 'imereti', nameGe: 'იმერეთი', regionCode: 'იმერ.', poems: [] },
  { id: 'guria', nameGe: 'გურია', regionCode: 'გურ.', poems: [] },
  { id: 'adjara', nameGe: 'აჭარა', regionCode: 'აჭარ.', poems: [] },
  { id: 'samtskhe_javakheti', nameGe: 'სამცხე-ჯავახეთი', regionCode: 'მესხ.', poems: [] },
  { id: 'shida_kartli', nameGe: 'შიდა ქართლი', regionCode: 'ქართლ.', poems: [] },
  { id: 'mtskheta_mtianeti', nameGe: 'მცხეთა-მთიანეთი', regionCode: 'მთიან.', poems: [] },
  { id: 'samachablo', nameGe: 'ცხინვალის რეგიონი', regionCode: 'ცხინვ.', poems: [] },
  { id: 'kvemo_kartli', nameGe: 'ქვემო ქართლი', regionCode: 'ქვ.ქ.', poems: [] },
  { id: 'tbilisi', nameGe: 'თბილისი', regionCode: 'თბილ.', poems: [] },
  { id: 'kakheti', nameGe: 'კახეთი', regionCode: 'კახ.', poems: [] },
];
