export interface SongItem {
  id: string;
  title: string;
  genre: string;
  regionCode: string;
}

export interface RegionData {
  id: string;
  nameGe: string;
  shortDesc: string;
  regionCode: string;
  topSongs: SongItem[];
}

export const GEORGIA_REGIONS: RegionData[] = [
  {
    id: 'abkhazia',
    nameGe: 'აფხაზეთი',
    shortDesc: 'აფხაზური ხალხური სიმღერები და საგალობლები',
    regionCode: 'აფხ.',
    topSongs: [
      { id: 'abk_1', title: 'აზამათ', genre: 'ხალხური ბალადა', regionCode: 'აფხ.' },
      { id: 'abk_2', title: 'ვარადო', genre: 'რიტუალური საგალობელი', regionCode: 'აფხ.' },
      { id: 'abk_3', title: 'აფხაზური საქორწილო', genre: 'სამგზავრო / სასიმღერო', regionCode: 'აფხ.' },
    ],
  },
  {
    id: 'samegrelo',
    nameGe: 'სამეგრელო-ზემო სვანეთი',
    shortDesc: 'მეგრული და სვანური მრავალხმიანობა',
    regionCode: 'სამეგ.',
    topSongs: [
      { id: 'sam_1', title: 'მეგრული ნანა', genre: 'აკვნის ნანა', regionCode: 'სამეგ.' },
      { id: 'sam_2', title: 'ჩელა', genre: 'შრომითი / ეთნოგრაფიული', regionCode: 'სამეგ.' },
      { id: 'sam_3', title: 'სვანური ლილე', genre: 'მზის ჰიმნი / რიტუალური', regionCode: 'სვან.' },
    ],
  },
  {
    id: 'racha_lechkhumi',
    nameGe: 'რაჭა-ლეჩხუმი',
    shortDesc: 'რაჭული საცეკვაო, ნადური და გუდატვირი',
    regionCode: 'რაჭ.',
    topSongs: [
      { id: 'rac_1', title: 'რაჭული საცეკვაო', genre: 'ფერხული / საცეკვაო', regionCode: 'რაჭ.' },
      { id: 'rac_2', title: 'ქვეთქუშა', genre: 'გუდატვირის თანხლებით', regionCode: 'რაჭ.' },
      { id: 'rac_3', title: 'რაჭული ნადური', genre: 'შრომის სიმღერა', regionCode: 'რაჭ.' },
    ],
  },
  {
    id: 'imereti',
    nameGe: 'იმერეთი',
    shortDesc: 'იმერული მგზავრული, ნადური და მაყრული',
    regionCode: 'იმერ.',
    topSongs: [
      { id: 'ime_1', title: 'იმერული მგზავრული', genre: 'საგზაო / სამგზავრო', regionCode: 'იმერ.' },
      { id: 'ime_2', title: 'იმერული ნადური', genre: 'შრომის მრავალხმიანი', regionCode: 'იმერ.' },
      { id: 'ime_3', title: 'იმერული ჩონგურული', genre: 'ჩონგურის თანხლებით', regionCode: 'იმერ.' },
    ],
  },
  {
    id: 'guria',
    nameGe: 'გურია',
    shortDesc: 'გურული კრიმანჭული და რთული მრავალხმიანობა',
    regionCode: 'გურ.',
    topSongs: [
      { id: 'gur_1', title: 'ჰასანბეგურა', genre: 'ისტორიული ბალადა', regionCode: 'გურ.' },
      { id: 'gur_2', title: 'კალოსხელური', genre: 'შრომის / სამკლო', regionCode: 'გურ.' },
      { id: 'gur_3', title: 'ვახტანგური', genre: 'სუფრული / სადღეგრძელო', regionCode: 'გურ.' },
    ],
  },
  {
    id: 'adjara',
    nameGe: 'აჭარა',
    shortDesc: 'აჭარული ხორუმი, განდაგანა და მაყრული',
    regionCode: 'აჭარ.',
    topSongs: [
      { id: 'adj_1', title: 'აჭარული ხორუმი', genre: 'საბრძოლო ფერხული', regionCode: 'აჭარ.' },
      { id: 'adj_2', title: 'განდაგანა', genre: 'საცეკვაო / მხიარული', regionCode: 'აჭარ.' },
      { id: 'adj_3', title: 'აჭარული მაყრული', genre: 'საქორწილო', regionCode: 'აჭარ.' },
    ],
  },
  {
    id: 'samtskhe_javakheti',
    nameGe: 'სამცხე-ჯავახეთი',
    shortDesc: 'მესხური ხორუმი და უძველესი ოროველა',
    regionCode: 'მესხ.',
    topSongs: [
      { id: 'samj_1', title: 'მესხური ოროველა', genre: 'შრომითი / ხვნისა', regionCode: 'მესხ.' },
      { id: 'samj_2', title: 'მესხური ხორუმი', genre: 'უძველესი საბრძოლო', regionCode: 'მესხ.' },
      { id: 'samj_3', title: 'მესხური ალილო', genre: 'საახალწლო / რიტუალური', regionCode: 'მესხ.' },
    ],
  },
  {
    id: 'shida_kartli',
    nameGe: 'შიდა ქართლი',
    shortDesc: 'ქართლური ოროველა, მაყრული და სუფრული',
    regionCode: 'ქართლ.',
    topSongs: [
      { id: 'shi_1', title: 'ქართლური ოროველა', genre: 'შრომითი მელოდია', regionCode: 'ქართლ.' },
      { id: 'shi_2', title: 'ქართლური მაყრული', genre: 'საქორწილო მაყრული', regionCode: 'ქართლ.' },
      { id: 'shi_3', title: 'ქართლური მგზავრული', genre: 'სამგზავრო სიმღერა', regionCode: 'ქართლ.' },
    ],
  },
  {
    id: 'mtskheta_mtianeti',
    nameGe: 'მცხეთა-მთიანეთი',
    shortDesc: 'მოხეური, მთიულური და ხევსურული ბალადები',
    regionCode: 'მთიან.',
    topSongs: [
      { id: 'mts_1', title: 'მოხეური ხალხური', genre: 'მთიულური მრავალხმიანი', regionCode: 'მთიან.' },
      { id: 'mts_2', title: 'ხევსურული ბალადა', genre: 'ეპიკური / საგმირო', regionCode: 'მთიან.' },
      { id: 'mts_3', title: 'მთიულური ფერხული', genre: 'საცეკვაო ფერხული', regionCode: 'მთიან.' },
    ],
  },
  {
    id: 'samachablo',
    nameGe: 'ცხინვალის რეგიონი',
    shortDesc: 'ლიახვის ხეობის ხალხური სიმღერები',
    regionCode: 'ცხინვ.',
    topSongs: [
      { id: 'tsh_1', title: 'ლიახვის ხეობის მაყრული', genre: 'საქორწილო', regionCode: 'ცხინვ.' },
      { id: 'tsh_2', title: 'ქართლურ-ლიახვური ოროველა', genre: 'შრომითი', regionCode: 'ცხინვ.' },
      { id: 'tsh_3', title: 'დილის საგალობელი', genre: 'რიტუალური', regionCode: 'ცხინვ.' },
    ],
  },
  {
    id: 'kvemo_kartli',
    nameGe: 'ქვემო ქართლი',
    shortDesc: 'ქვემო ქართლის შრომითი და საქორწილო სიმღერები',
    regionCode: 'ქვ.ქ.',
    topSongs: [
      { id: 'kve_1', title: 'ქვემო ქართლის ოროველა', genre: 'ხვნა-თესვის სიმღერა', regionCode: 'ქვ.ქ.' },
      { id: 'kve_2', title: 'ქვემო ქართლური მაყრული', genre: 'საქორწილო', regionCode: 'ქვ.ქ.' },
      { id: 'kve_3', title: 'საფერხულო', genre: 'ხალხური ფერხული', regionCode: 'ქვ.ქ.' },
    ],
  },
  {
    id: 'tbilisi',
    nameGe: 'თბილისი',
    shortDesc: 'ძველი თბილისური ქალაქური სიმღერები',
    regionCode: 'თბილ.',
    topSongs: [
      { id: 'tbi_1', title: 'კარაბადინი', genre: 'ძველი ქალაქური', regionCode: 'თბილ.' },
      { id: 'tbi_2', title: 'კინტოური', genre: 'ქალაქური საცეკვაო', regionCode: 'თბილ.' },
      { id: 'tbi_3', title: 'თბილისო', genre: 'ქალაქური ლირიკული', regionCode: 'თბილ.' },
    ],
  },
  {
    id: 'kakheti',
    nameGe: 'კახეთი',
    shortDesc: 'კახური მრავალხმიანობა, ჩაკრულო და მრავალჟამიერი',
    regionCode: 'კახ.',
    topSongs: [
      { id: 'kak_1', title: 'ჩაკრულო', genre: 'სუფრული / ეპიკური', regionCode: 'კახ.' },
      { id: 'kak_2', title: 'შენ ხარ ვენახი', genre: 'საგალობელი / ჰიმნი', regionCode: 'კახ.' },
      { id: 'kak_3', title: 'კახური მრავალჟამიერი', genre: 'სადღეგრძელო / სუფრული', regionCode: 'კახ.' },
    ],
  },
];
