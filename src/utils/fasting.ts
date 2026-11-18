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
  if (e >= -6 && e <= -4) return mk(md === '04-07' ? 'fish' : 'dry', 'ვნების შვიდეული');
  if (e === -7) return mk('fish', 'ბზობა');
  if (e === -8) return mk('oil', 'ლაზარეს შაბათი', 'თევზის ხიზილალაც ნებადართულია');
  if (e >= -48 && e <= -9) {
    if (md === '04-07') return mk('fish', 'ხარება');
    if (weekend) return mk('oil', 'დიდი მარხვა — შაბათ-კვირა');
    if (e === -48 || e === -47) return mk('strict', 'დიდი მარხვის პირველი დღეები', 'ძალისამებრ — სრული თავშეკავება; სუსტთათვის მშრალი ჭამა');
    // the feasts that relax Lent's weekdays: the forty martyrs, the finding of the Forerunner's head, the Great Canon's Thursday
    if (md === '03-22' || md === '03-09' || e === -17 || weight !== 'none') return mk('oil', 'დიდი მარხვა — დღესასწაულის გამო');
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
    if (md >= '01-02' && md <= '01-05') return mk(weekend ? 'oil' : 'dry', 'შობის მარხვა — ბოლო დღეები');
    return smallFast(dow, weight, 'შობის მარხვა');
  }

  // the Apostles' fast: from the Monday after All Saints to 28 June old style (11 July new)
  const apostles = addDays(orthodoxEaster(year), 57);
  if (iso >= apostles && md <= '07-11') {
    if (md === '07-07') return mk('fish', 'იოანე ნათლისმცემლის შობა');
    return smallFast(dow, weight, 'პეტრე-პავლეს მარხვა');
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
    if (weight === 'vigil') return mk('fish', 'ოთხშაბათ-პარასკევი — დღესასწაულის გამო');
    if (weight === 'doxology') return mk('oil', 'ოთხშაბათ-პარასკევი — დღესასწაულის გამო');
    return mk('dry', dow === 3 ? 'ოთხშაბათი' : 'პარასკევი');
  }
  return mk('free');
};

/** the Nativity and the Apostles' fasts: fish on Saturday and Sunday, oil and wine on Tuesday and Thursday; feasts relax it */
const smallFast = (dow: number, weight: FeastWeight, why: string): DayFood => {
  const plain: Food = dow === 0 || dow === 6 ? 'fish' : dow === 2 || dow === 4 ? 'oil' : 'dry';
  const wedFri = dow === 3 || dow === 5;
  const feast: Food = weight === 'great' || weight === 'vigil' ? 'fish' : weight === 'doxology' ? (wedFri ? 'oil' : 'fish') : 'dry';
  return mk(atLeast(plain, feast), why);
};
