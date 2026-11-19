// „დღის საზრდო“ — what is eaten on a church day, for the head of „დღის მსახურება“ (stage 4 of the plan „მედავითნე: წიგნები,
// კალენდარი, დღის მსახურება“, 2026-11-18; the user's pick: the Typikon's rule, the calendar's own note when it has one).
// The rule is the Typikon's (ch. 32–33) as the fasting calendars give it (checked against orthochristian.com „The Rule of
// Fasting“ and iveron.ca's Great Lent page): the four fasts, Wednesdays and Fridays, the fast-free weeks, the single fast
// days, the feasts that relax a fast. Pure — tests/fasting.test.ts.
import { addDays, orthodoxEaster } from '../data/churchFeasts';

export type Food = 'free' | 'meatless' | 'fish' | 'oil' | 'dry' | 'strict' | 'none';
export interface DayFood {
  food: Food;
  label: string;
  /** what makes it so: „დიდი მარხვა“, „ოთხშაბათი“ */
  why?: string;
  /** a word more: „ძალისამებრ…“ */
  extra?: string;
  /** the calendar's own words for the day */
  cal?: string;
}
/** the feast's weight for the fast: a saint with the great doxology / polyeleos, a vigil (or the temple's day), a great feast */
export type FeastWeight = 'none' | 'doxology' | 'vigil' | 'great';

export const FOOD_LABEL: Record<Food, string> = {
  free: 'ხსნილია',
  meatless: 'ხორცი არ იჭმევა — რძე, კვერცხი და თევზი ნებადართულია',
  fish: 'თევზი, ზეთი და ღვინო ნებადართულია',
  oil: 'ზეთი და ღვინო ნებადართულია, თევზი — არა',
  dry: 'მშრალი ჭამა — უზეთოდ და ღვინის გარეშე',
  strict: 'მკაცრი მარხვა',
  none: 'სრული თავშეკავება',
};

const dowOf = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();
const easterOffset = (iso: string) =>
  Math.round((Date.parse(`${iso}T12:00:00Z`) - Date.parse(`${orthodoxEaster(Number(iso.slice(0, 4)))}T12:00:00Z`)) / 864e5);
const mk = (food: Food, why?: string, extra?: string): DayFood => ({ food, label: FOOD_LABEL[food], why, extra });
/** ჟამნი's own marks beside the saints of its menologion, by the old-style month and day: „ხსნილი თევზითა“ and „ხსნილი
 *  ღვინითა და ზეთითა“. The calendars printed in Georgia relax a Wednesday, a Friday or a fast's weekday by these marks and
 *  not by the saint's rank (the 2021 Anchiskhati calendar: 20 January, a Wednesday — „ხსნილია თევზით (ჟამნიდან)“; St Nino's
 *  day on a Wednesday — only „მარხვა“). */
const FISH_OLD = new Set(['09-08', '10-01', '11-14', '11-21', '01-01', '01-07', '02-02', '03-25', '06-24', '06-29', '06-30', '08-06', '08-15']);
const OIL_OLD = new Set([
  '09-01', '09-06', '09-09', '09-13', '09-20', '09-23', '09-26', '10-06', '10-18', '10-23', '10-26', '11-01', '11-08', '11-12', '11-13', '11-30',
  '12-04', '12-05', '12-06', '12-09', '12-12', '12-13', '12-17', '12-20', '01-11', '01-16', '01-17', '01-18', '01-20', '01-25', '01-27', '01-30',
  '02-08', '02-11', '02-17', '02-24', '03-09', '03-26', '04-23', '04-25', '04-30', '05-02', '05-08', '05-13', '05-15', '05-21', '05-24', '05-25',
  '06-08', '06-11', '07-01', '07-02', '07-08', '07-17', '07-20', '07-22', '07-25', '07-27', '08-31',
]);
/** the day's mark in ჟამნი, if it has one */
const markOf = (iso: string): Food | null => {
  const old = addDays(iso, -13).slice(5);
  return FISH_OLD.has(old) ? 'fish' : OIL_OLD.has(old) ? 'oil' : null;
};
/** the stronger relaxation wins */
const ORDER: Food[] = ['none', 'strict', 'dry', 'oil', 'fish', 'meatless', 'free'];
const atLeast = (a: Food, b: Food): Food => (ORDER.indexOf(a) >= ORDER.indexOf(b) ? a : b);

/** the calendar's own words about the food: „ხსნილია თევზით.“, „მძიმე მარხვა.“ … */
export const calendarFoodNote = (text: string): string | null => {
  const m = /(ხსნილია[^.]{0,60}\.|მძიმე მარხვა\.|(?:^|\s)მარხვა\.)/.exec(text);
  return m ? m[1].trim() : null;
};

/**
 * The day's food (new-style `iso`; the Church's fixed days are counted in the old style, 13 days behind until 2100).
 * `weight` = the day's feast as the service sees it (dayService's rank: polyeleos/doxology → 'doxology', vigil → 'vigil').
 */
export const foodOf = (iso: string, weight: FeastWeight = 'none', calendarText = ''): DayFood => {
  const own = calendarFoodNote(calendarText);
  const base = ruleOf(iso, weight);
  return own ? { ...base, cal: own } : base;
};

const ruleOf = (iso: string, weight: FeastWeight): DayFood => {
  const e = easterOffset(iso);
  const dow = dowOf(iso);
  const md = iso.slice(5);
  const year = Number(iso.slice(0, 4));
  const weekend = dow === 0 || dow === 6;
  const mark = markOf(iso);

  // the fast-free weeks
  if (e >= 0 && e <= 6) return mk('free', 'ბრწყინვალე შვიდეული');
  if (e >= 50 && e <= 56) return mk('free', 'სულთმოფენობის შვიდეული');
  if (e >= -69 && e <= -64) return mk('free', 'მეზვერისა და ფარისევლის შვიდეული');
  if (e >= -55 && e <= -49) return mk('meatless', 'ყველიერის შვიდეული');
  if (md >= '01-07' && md <= '01-17') return mk('free', 'შობიდან ნათლისღებამდე');

  // Holy Week and Great Lent
  if (e === -2) return mk('none', 'დიდი პარასკევი', 'გარდამოხსნის გამოსვენებამდე — ძალისამებრ');
  if (e === -1) return mk('dry', 'დიდი შაბათი');
  if (e === -3) return mk('oil', 'დიდი ხუთშაბათი');
  // the Annunciation in Holy Week: wine and oil, no fish (the official calendar, 2026)
  if (e >= -6 && e <= -4) return mk(md === '04-07' ? 'oil' : 'dry', md === '04-07' ? 'ხარება ვნების შვიდეულში' : 'ვნების შვიდეული');
  if (e === -7) return mk('fish', 'ბზობა');
  // the Georgian calendars: fish (the official one of 2026, Anchiskhati's of 2021)
  if (e === -8) return mk('fish', 'ლაზარეს შაბათი');
  if (e >= -48 && e <= -9) {
    if (md === '04-07') return mk('fish', 'ხარება');
    if (weekend) return mk('oil', 'დიდი მარხვა — შაბათ-კვირა');
    if (e === -48 || e === -47) return mk('strict', 'დიდი მარხვის პირველი დღეები', 'ძალისამებრ — სრული თავშეკავება; სუსტთათვის მშრალი ჭამა');
    // what relaxes Lent's weekdays: the finding of the Forerunner's head, the forty martyrs, the Archangel's synaxis after the
    // Annunciation (ჟამნი's marks), the Great Canon's Thursday — and the temple's own day; a saint's rank alone does not
    const old = addDays(iso, -13).slice(5);
    if (old === '02-24' || old === '03-09' || old === '03-26' || e === -17 || weight === 'vigil' || weight === 'great') return mk('oil', 'დიდი მარხვა — დღესასწაულის გამო');
    return mk('dry', 'დიდი მარხვა');
  }

  // the single fast days
  if (md === '01-18') return mk(dow === 0 || dow === 6 ? 'oil' : 'strict', 'ნათლისღების წინადღე');
  if (md === '09-11') return mk('oil', 'ნათლისმცემლის თავის კვეთა');
  if (md === '09-27') return mk('oil', 'ჯვართამაღლება');

  // the Nativity fast: 15 Nov – 24 Dec old style (28 Nov – 6 Jan new style)
  const nativity = md >= '11-28' || md <= '01-06';
  if (nativity) {
    if (md === '01-06') return mk(weekend ? 'oil' : 'strict', 'შობის წინადღე', 'პირველ ვარსკვლავამდე');
    if (md === '12-04') return mk('fish', 'ტაძრად მიყვანება');
    // from 20 Dec old style (2 Jan new) no fish even on Saturday and Sunday
    if (md >= '01-02' && md <= '01-05') return mk(weekend || mark ? 'oil' : 'dry', 'შობის მარხვა — ბოლო დღეები');
    return smallFast(dow, weight, mark, 'შობის მარხვა');
  }

  // the Apostles' fast: from the Monday after All Saints to 28 June old style (11 July new)
  const apostles = addDays(orthodoxEaster(year), 57);
  if (iso >= apostles && md <= '07-11') {
    if (md === '07-07') return mk('fish', 'იოანე ნათლისმცემლის შობა');
    return smallFast(dow, weight, mark, 'პეტრე-პავლეს მარხვა');
  }

  // the Dormition fast: 1–14 Aug old style (14–27 Aug new)
  if (md >= '08-14' && md <= '08-27') {
    if (md === '08-19') return mk('fish', 'ფერისცვალება');
    return mk(weekend ? 'oil' : weight === 'vigil' || weight === 'great' ? 'oil' : 'dry', 'მიძინების მარხვა');
  }

  // Wednesdays and Fridays through the year
  if (dow === 3 || dow === 5) {
    if (weight === 'great') return mk(md === '01-07' || md === '01-19' ? 'free' : 'fish', 'ოთხშაბათ-პარასკევი — დღესასწაულის გამო');
    if (e >= 7 && e <= 49) return mk(e === 24 || e === 38 ? 'fish' : 'oil', 'ოთხშაბათ-პარასკევი — ზატიკში');
    if (weight === 'vigil' || mark === 'fish') return mk('fish', 'ოთხშაბათ-პარასკევი — დღესასწაულის გამო');
    if (weight === 'doxology' || mark === 'oil') return mk('oil', 'ოთხშაბათ-პარასკევი — დღესასწაულის გამო');
    return mk('dry', dow === 3 ? 'ოთხშაბათი' : 'პარასკევი');
  }
  return mk('free');
};

/** the Nativity and the Apostles' fasts: fish on Saturday and Sunday, oil and wine on Tuesday and Thursday, neither on Monday,
 *  Wednesday and Friday; a feast — by its weight or by ჟამნი's mark — relaxes the day */
const smallFast = (dow: number, weight: FeastWeight, mark: Food | null, why: string): DayFood => {
  const plain: Food = dow === 0 || dow === 6 ? 'fish' : dow === 2 || dow === 4 ? 'oil' : 'dry';
  const strictDay = dow === 1 || dow === 3 || dow === 5;
  const feast: Food = weight === 'great' || weight === 'vigil' ? 'fish' : weight === 'doxology' ? (strictDay ? 'oil' : 'fish') : 'dry';
  return mk(atLeast(atLeast(plain, feast), mark ?? 'dry'), why);
};
