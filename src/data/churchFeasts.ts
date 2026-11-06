import type { Church } from './churches';

// „დღეს ტაძრობაა“ (pages/ChurchesPage.tsx): a church's feast is read from its name — „წმინდა გიორგის სახელობის ეკლესია“ →
// გიორგობა, 23 ნოემბერი. Dates are the Georgian Church's (the civil calendar, as orthodoxy.ge gives them); each fixed date
// is checked against data/calendar/2026.json by tests/churchFeasts.test.ts (its `check` word must stand on that day).
// A name that says only „ღვთისმშობლის“ or a saint we are not sure of gets no feast — better none than a wrong one.

export interface FeastRule {
  id: string;
  /** what the people call it */
  label: string;
  re: RegExp;
  /** MM-DD, or days after Easter */
  md?: string;
  easter?: number;
  /** a word of the calendar's line that day (the test) */
  check: string;
}

// the first rule that matches wins: the specific ones stand before the general
export const FEAST_RULES: FeastRule[] = [
  { id: 'gabriel-beri', label: 'ბერი გაბრიელის ხსენება', re: /ბერი გაბრიელ|გაბრიელ (?:ურგებაძ|აღმსარებ)/, md: '11-02', check: 'გაბრიელ' },
  { id: 'jvari', label: 'ჯვართამაღლება', re: /ჯვართამაღლ|ჯვარამაღლ|ჯვრის ამაღლ|ამაღლება ჯვრ|ამაღლების ჯვრ/, md: '09-27', check: 'ჯვარ' },
  { id: 'mariam-shoba', label: 'ღვთისმშობლის შობა', re: /(?:ღვთისმშობლის|ღმრთისმშობლის|ღვთისშობლის|მარიამის) შობ/, md: '09-21', check: 'შობა' },
  { id: 'mariamoba', label: 'მარიამობა', re: /მიძინ/, md: '08-28', check: 'მიძინება' },
  { id: 'khareba', label: 'ხარება', re: /ხარებ/, md: '04-07', check: 'ხარება' },
  { id: 'tadrad', label: 'ტაძრად მიყვანება', re: /ტაძრად ?მიყვან/, md: '12-04', check: 'ტაძრად' },
  { id: 'migebeba', label: 'მიგებება', re: /მიგებ/, md: '02-15', check: 'მიგებება' },
  { id: 'natlisgeba', label: 'ნათლისღება', re: /ნათლისღებ/, md: '01-19', check: 'ნათლისღება' },
  { id: 'tavisk', label: 'იოანე ნათლისმცემლის თავისკვეთა', re: /თავისკვეთ/, md: '09-11', check: 'თავისკვეთა' },
  { id: 'ioane-shoba', label: 'იოანე ნათლისმცემლის შობა', re: /ნათლისმცემ|წინამორბედ/, md: '07-07', check: 'ნათლისმცემ' },
  { id: 'peristsvaleba', label: 'ფერისცვალება', re: /ფერისცვალ/, md: '08-19', check: 'ფერისცვალება' },
  { id: 'amagleba', label: 'ამაღლება', re: /ამაღლ/, easter: 39, check: 'ამაღლება' },
  { id: 'sameba', label: 'სამება', re: /სამებ/, easter: 49, check: 'მეერგასე' },
  { id: 'agdgoma', label: 'აღდგომა', re: /აღდგომ/, easter: 0, check: 'აღდგომა' },
  { id: 'shoba', label: 'შობა', re: /(?:მაცხოვრის|ქრისტეს|უფლის) შობ|ქრისტეშობ|ბეთლემ/, md: '01-07', check: 'შობა' },
  { id: 'svetitskhovloba', label: 'სვეტიცხოვლობა', re: /სვეტიცხოვ/, md: '10-14', check: 'სვეტიცხოვლობა' },
  { id: 'mtavarangelozi', label: 'მთავარანგელოზთა კრება', re: /მთავარანგელოზ|მიქაელ|გაბრიელ/, md: '11-21', check: 'მთავარანგელოზთა' },
  { id: 'giorgoba', label: 'გიორგობა', re: /გიორგ/, md: '11-23', check: 'გიორგი' },
  { id: 'ninooba', label: 'ნინოობა', re: /ნინო(?!წმ)/, md: '01-27', check: 'ნინო' },
  { id: 'nikolozoba', label: 'ნიკოლოზობა', re: /ნიკოლოზ/, md: '12-19', check: 'ნიკოლოზ' },
  { id: 'elioba', label: 'ელიობა', re: /ელია|ილია/, md: '08-02', check: 'ელია' },
  { id: 'tamaroba', label: 'თამარობა', re: /თამარ/, md: '05-14', check: 'თამარ' },
  { id: 'davit', label: 'დავით აღმაშენებლის ხსენება', re: /დავით აღმაშენ/, md: '02-08', check: 'აღმაშენებელ' },
  { id: 'ketevan', label: 'ქეთევანობა', re: /ქეთევან/, md: '09-26', check: 'ქეთევან' },
  { id: 'marine', label: 'მარინობა', re: /მარინე/, md: '07-30', check: 'მარინე' },
  { id: 'barbare', label: 'ბარბარობა', re: /ბარბარე/, md: '12-17', check: 'ბარბარე' },
  { id: 'petre-pavle', label: 'პეტრე-პავლობა', re: /პეტრე|პავლე/, md: '07-12', check: 'პეტრე' },
  { id: 'andria', label: 'ანდრიაობა', re: /ანდრია/, md: '12-13', check: 'ანდრია' },
  { id: 'dimitri', label: 'დიმიტრობა', re: /დიმიტრ/, md: '11-08', check: 'დიმიტრი' },
  { id: 'kvirike', label: 'კვირიკობა', re: /კვირიკე|ივლიტ/, md: '07-28', check: 'კვირიკე' },
  { id: 'asureli', label: 'ასურელ მამათა ხსენება', re: /ასურელ/, md: '05-20', check: 'ასურელ' },
  { id: 'konstantine', label: 'კონსტანტინე და ელენე', re: /კონსტანტინე|ელენე/, md: '06-03', check: 'კონსტანტინე' },
  { id: 'panteleimon', label: 'პანტელეიმონის ხსენება', re: /პანტელეიმონ/, md: '08-09', check: 'პანტელეიმონ' },
  { id: 'serapime', label: 'სერაფიმე საროველის ხსენება', re: /სერაფიმ/, md: '01-15', check: 'სერაფიმე' },
];

const cache = new Map<string, FeastRule | null>();
/** the church's feast by its name, or null */
export const feastOf = (c: Pick<Church, 'id' | 'name'>): FeastRule | null => {
  let f = cache.get(c.id);
  if (f === undefined) {
    f = FEAST_RULES.find(r => r.re.test(c.name)) ?? null;
    cache.set(c.id, f);
  }
  return f;
};

/** Orthodox Easter (the civil date) — the Julian computus + 13 days, right from 1900 to 2099 */
export const orthodoxEaster = (year: number): string => {
  const a = year % 4, b = year % 7, c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  return addDays(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, 13);
};

export const addDays = (iso: string, n: number) => {
  const t = new Date(`${iso}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};

/** the feast's day in that year (YYYY-MM-DD) */
export const feastDay = (f: FeastRule, year: number) => (f.md ? `${year}-${f.md}` : addDays(orthodoxEaster(year), f.easter ?? 0));

/** the next time it comes, from `today` on (today included) */
export const nextFeastDay = (f: FeastRule, today: string) => {
  const y = Number(today.slice(0, 4));
  const d = feastDay(f, y);
  return d >= today ? d : feastDay(f, y + 1);
};

/** today in Tbilisi (UTC+4), YYYY-MM-DD */
export const tbilisiToday = (now = Date.now()) => new Date(now + 4 * 3600 * 1000).toISOString().slice(0, 10);

const MONTHS = ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი', 'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'];
/** „23 ნოემბერი“ */
export const dayText = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;

/** the feasts of one day with their churches, the biggest first */
export const feastsOnDay = (list: Church[], iso: string) => {
  const y = Number(iso.slice(0, 4));
  const by = new Map<FeastRule, Church[]>();
  for (const c of list) {
    const f = feastOf(c);
    if (f && feastDay(f, y) === iso) by.set(f, [...(by.get(f) ?? []), c]);
  }
  return [...by.entries()].map(([feast, churches]) => ({ feast, churches })).sort((a, b) => b.churches.length - a.churches.length);
};

/** the first day from `today` on (≤ a year ahead) that has feasts */
export const nextFeastDayWithChurches = (list: Church[], today: string) => {
  for (let i = 0; i < 370; i++) {
    const d = addDays(today, i);
    const feasts = feastsOnDay(list, d);
    if (feasts.length) return { day: d, feasts };
  }
  return null;
};
