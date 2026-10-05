import { addDays, easterIso } from '../churchCalendar';

// orthodoxy.ge/dgesastsaulebi.htm, word for word. Fixed feasts carry their date in both styles
// (old / new); movable ones their distance from Easter, so the dates work out for any year.

export interface Feast {
  name: string;
  /** "დიდ-მარხვის მეექვსე კვირას" — how the source states a movable feast's day */
  rule?: string;
  /** days from Easter */
  fromEaster?: number[];
  /** [day, month] old style and new style */
  fixed?: { old: [number, number]; new: [number, number] }[];
  /** article on orthodoxy.ge */
  href?: string;
}

export interface FeastGroup {
  title: string;
  subtitle?: string;
  feasts: Feast[];
}

const SITE = 'https://www.orthodoxy.ge/';

export const FEAST_GROUPS: FeastGroup[] = [
  {
    title: '12 საუფლო დღესასწაული',
    subtitle: 'მოძრავი',
    feasts: [
      { name: 'ბრწყინვალე აღდგომა უფლისა ღმრთისა და მაცხოვრისა ჩუენისა იესუ ქრისტესი', rule: 'თარიღი ყოველ წელს გამოითვლება', fromEaster: [0], href: 'dgesastsaulebi/agdgoma.htm' },
      { name: 'ბზობა (ბაიობა) ანუ უფლის დიდებით შესვლა იერუსალიმში', rule: 'დიდ-მარხვის მეექვსე კვირას', fromEaster: [-7], href: 'markhvebi/didmarkhva/6kvira/kvira.htm' },
      { name: 'ამაღლება', rule: 'აღდგომიდან მე-40 დღეს', fromEaster: [39], href: 'dgesastsaulebi/amagleba.htm' },
      { name: 'სულთმოფენობა', rule: 'აღდგომიდან 50-ე დღეს', fromEaster: [49], href: 'dgesastsaulebi/sultmofenoba.htm' },
    ],
  },
  {
    title: '12 საუფლო დღესასწაული',
    subtitle: 'უძრავი',
    feasts: [
      { name: 'განცხადება - ნათლისღება უფლისა ჩუენისა იესუ ქრისტესი', fixed: [{ old: [6, 1], new: [19, 1] }], href: 'dgesastsaulebi/natlisgeba.htm' },
      { name: 'მირქმა - მიგებება იესუ ქრისტესი', fixed: [{ old: [2, 2], new: [15, 2] }], href: 'dgesastsaulebi/mirkma.htm' },
      { name: 'ხარება ყოვლადწმიდისა ღმრთისმშობელისა', fixed: [{ old: [25, 3], new: [7, 4] }], href: 'dgesastsaulebi/khareba.htm' },
      { name: 'ფერისცვალება იესუ ქრისტესი', fixed: [{ old: [6, 8], new: [19, 8] }], href: 'dgesastsaulebi/peristsvaleba.htm' },
      { name: 'მარიამობა - მიძინება ყოვლადწმიდისა ღმრთისმშობელისა', fixed: [{ old: [15, 8], new: [28, 8] }], href: 'dgesastsaulebi/mariamoba.htm' },
      { name: 'ღმრთისმშობლობა - შობა ყოვლადწმიდისა ღმრთისმშობელისა', fixed: [{ old: [8, 9], new: [21, 9] }], href: 'dgesastsaulebi/gvtismshoblis_shoba.htm' },
      { name: 'ჯვართამაღლება - მსოფლიო ამაღლება ცხოველსმყოფელისა და პატიოსნისა ჯვარისა', fixed: [{ old: [14, 9], new: [27, 9] }], href: 'dgesastsaulebi/jvartamagleba.htm' },
      { name: 'ტაძრად მიყვანება ყოვლადწმიდისა ღმრთისმშობელისა', fixed: [{ old: [21, 11], new: [4, 12] }], href: 'dgesastsaulebi/tadzrad_mikvaneba.htm' },
      { name: 'ქრისტეშობა - ხორციელად შობა უფლისა ღმრთისა და მაცხოვრისა ჩუენისა იესუ ქრისტესი', fixed: [{ old: [25, 12], new: [7, 1] }], href: 'dgesastsaulebi/shoba.htm' },
    ],
  },
  {
    title: 'დიდი დღესასწაულები',
    feasts: [
      { name: 'წინადაცვეთა უფლისა ჩვენისა იესუ ქრისტესი და ხსენება წმ. ბასილი დიდისა', fixed: [{ old: [1, 1], new: [14, 1] }], href: 'dgesastsaulebi/tsinadatsveta.htm' },
      { name: 'წმიდისა დედისა ჩუენისა მოციქულთა სწორისა ნინო ქართველთა განმანათლებელისა', fixed: [{ old: [14, 1], new: [27, 1] }, { old: [19, 5], new: [1, 6] }], href: 'dgesastsaulebi/nino.htm' },
      { name: 'წმიდა იოანე ნათლისმცემლის შობა', fixed: [{ old: [24, 6], new: [7, 7] }], href: 'dgesastsaulebi/ioanes_shoba.htm' },
      { name: 'წმიდათა თავთა მოციქულთა პეტრესი და პავლესი', fixed: [{ old: [29, 6], new: [12, 7] }], href: 'dgesastsaulebi/petre-pavloba.htm' },
      { name: 'წმიდა იოანე ნათლისმცემლის თავისკვეთა', fixed: [{ old: [29, 8], new: [11, 9] }], href: 'dgesastsaulebi/taviskveta.htm' },
      { name: 'მცხეთობა-სვეტიცხოვლობა - ყოვლადწმიდა ღმრთისმშობლის საფარველი', fixed: [{ old: [1, 10], new: [14, 10] }, { old: [30, 6], new: [13, 7] }], href: 'dgesastsaulebi/svetitskhovloba.htm' },
    ],
  },
  {
    title: 'გარდამავალი დღესასწაულები',
    feasts: [
      { name: 'ღირსისა მამისა ჩუენისა შიო მღვიმელისა', rule: 'ყველიერის ხუთშაბათს', fromEaster: [-52], href: 'dgesastsaulebi/shio.htm' },
      { name: 'დიდმოწამისა თეოდორე ტირონისა', rule: 'დიდი მარხვის პირველ შაბათს', fromEaster: [-43], href: 'markhvebi/didmarkhva/1kvira/shab.htm' },
      { name: 'წმიდისა გრიგოლ პალამასი', rule: 'დიდი მარხვის მეორე კვირას', fromEaster: [-35], href: 'tsmindanebi/grigol_palama.htm' },
      { name: 'ღირსისა იოანე კლემაქსისა', rule: 'დიდი მარხვის მეოთხე კვირას', fromEaster: [-21], href: 'tsmindanebi/ioane_klemaqsi.htm' },
      { name: 'ღირსისა დედისა ჩუენისა მარიამ მეგვიპტელისა', rule: 'დიდი მარხვის მეხუთე კვირას', fromEaster: [-14], href: 'tsmindanebi/mariam_egvipteli.htm' },
      { name: 'მართალი ლაზარეს მკვდრეთით აღდგინება, ქებაჲ და დიდებაჲ ქართულისა ენისაჲ', rule: 'ბზობის წინა შაბათს', fromEaster: [-8], href: 'markhvebi/didmarkhva/6kvira/shab.htm' },
      { name: 'მენელსაცხებლე დედათა', rule: 'აღდგომიდან მესამე კვირას', fromEaster: [14], href: 'dgesastsaulebi/menelsatskheble.htm' },
      { name: 'კეთილმორწმუნისა მეფისა თამარისა', rule: 'მენელსაცხებლე დედათა კვირასა და 1 / 14 მაისს', fromEaster: [14], fixed: [{ old: [1, 5], new: [14, 5] }], href: 'tveni/maisi/01-tamari.htm' },
      { name: 'მართალი ტაბითასი', rule: 'აღდგომიდან მეოთხე კვირას', fromEaster: [21] },
      { name: 'ღირსისა დოდო გარეჯელისა', rule: 'ამაღლების შემდეგ ოთხშაბათს', fromEaster: [45] },
      { name: 'ღირსისა დავით გარეჯელისა', rule: 'ამაღლების შემდეგ ხუთშაბათს', fromEaster: [46], href: 'dgesastsaulebi/mamadavitoba.htm' },
      { name: 'ყოველთა წმიდათა', rule: 'სულთმოფენობის შემდეგ კვირას', fromEaster: [56] },
    ],
  },
  {
    title: 'საეკლესიო სამახსოვრო დღეები',
    feasts: [
      { name: 'საქართველოს სამოციქულო ეკლესიის ავტოკეფალიის აღდგენის დღე (1917 წ.)', fixed: [{ old: [12, 3], new: [25, 3] }], href: 'dgesastsaulebi/avtokefalia.htm' },
      { name: 'უწმიდესისა და უნეტარესის, სრულიად საქართველოს კათოლიკოს-პატრიარქის ილია II ინტრონიზაციის დღე (1977 წ.)', fixed: [{ old: [12, 12], new: [25, 12] }] },
      { name: 'უწმიდესისა და უნეტარესის, სრულიად საქართველოს კათოლიკოს-პატრიარქის ილია II ანგელოზის დღე', fixed: [{ old: [20, 7], new: [2, 8] }] },
      { name: 'უწმიდესისა და უნეტარესის, სრულიად საქართველოს კათოლიკოს-პატრიარქის ილია II დაბადების დღე (1933 წ.)', fixed: [{ old: [22, 12], new: [4, 1] }] },
    ],
  },
];

export const FEASTS_SOURCE_URL = `${SITE}dgesastsaulebi.htm`;
export const feastUrl = (f: Feast) => (f.href ? SITE + f.href : null);

const pad = (n: number) => String(n).padStart(2, '0');

/** the feast's days in a (new-style) year, earliest first */
export const feastDates = (f: Feast, year: number): string[] => {
  const easter = easterIso(year);
  const dates = [
    ...(f.fromEaster ?? []).map(n => addDays(easter, n)),
    ...(f.fixed ?? []).map(({ new: [d, m] }) => `${year}-${pad(m)}-${pad(d)}`),
  ];
  return [...new Set(dates)].sort();
};
