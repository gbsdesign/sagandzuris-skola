// The movable days for „დღის მსახურება“ (stage 4 of the plan „მედავითნე: წიგნები, კალენდარი, დღის მსახურება“,
// 2026-11-18): which day of the Triodion or the Pentecostarion a date is (by its distance from Pascha), where its troparion
// and kontakion stand in ჟამნი „მარხვანი და ზატიკი“ (public/wignebi/jamni/25.json), the afterfeasts of the movable feasts,
// the Saturdays of the departed, the evenings of Great Compline and the days of St Andrew's canon. Pure —
// tests/triodion.test.ts checks every heading against the book and every saint's day against the calendar.
import type { Section, TextSrc } from './serviceTexts';

export type TriKind = 'sunday' | 'saturday' | 'departed' | 'saint' | 'holy' | 'lazarus' | 'feast' | 'canon' | 'pascha' | 'midfeast';
export interface TriDay {
  /** the day's name in a hymn's label: „ლაზარეს შაბათისა — ტროპარი“ */
  name: string;
  kind: TriKind;
  /** the day has its own troparion (else the resurrection's / none) */
  tr: boolean;
  /** its heading in ჟამნი 25; a day without one takes `hymnsOf`'s */
  head?: RegExp;
  hymnsOf?: number;
}

/** by the distance from Pascha (days) */
export const TRIODION: Record<number, TriDay> = {
  [-70]: { name: 'მეზვერისა და ფარისევლისა', kind: 'sunday', tr: false, head: /^კვირიაკესა მეზვერისა/ },
  [-63]: { name: 'უძღები ძისა', kind: 'sunday', tr: false, head: /^კვირიაკესა უძღებისასა/ },
  [-57]: { name: 'ხორციელის შაბათისა — მიცვალებულთა', kind: 'departed', tr: true, head: /^შაბათსა ჴორციელისასა/ },
  [-56]: { name: 'ხორციელის კვირიაკისა', kind: 'sunday', tr: false, head: /^ჴორციელისა კვირიაკესა/ },
  [-52]: { name: 'შიო მღვიმელისა', kind: 'saint', tr: true, head: /^ყველიერის ხუთშაბათსა/ },
  [-50]: { name: 'ყველიერის შაბათისა — ღირსთა მამათა', kind: 'saturday', tr: true, head: /^შაბათსა ყველიერისასა/ },
  [-49]: { name: 'ყველიერის კვირიაკისა', kind: 'sunday', tr: false, head: /^კვირიაკესა ყველიერისასა/ },
  [-43]: { name: 'თეოდორე ტირონისა', kind: 'saturday', tr: true, head: /^პირველსა შაბათსა მარხვათასა/ },
  [-42]: { name: 'მართლმადიდებლობისა', kind: 'sunday', tr: true, head: /^პირველსა კვირიაკესა წმიდათა მარხვათასა/ },
  [-36]: { name: 'მიცვალებულთა შაბათისა', kind: 'departed', tr: true, hymnsOf: -57 },
  [-35]: { name: 'გრიგოლ პალამასი', kind: 'sunday', tr: true, head: /^კვირიაკესა მეორესა მარხვათასა/ },
  [-29]: { name: 'მიცვალებულთა შაბათისა', kind: 'departed', tr: true, hymnsOf: -57 },
  [-28]: { name: 'ჯვართაყვანისცემისა', kind: 'sunday', tr: true, head: /^მესამესა კვირიაკესა მარხვათასა/ },
  [-22]: { name: 'მიცვალებულთა შაბათისა', kind: 'departed', tr: true, hymnsOf: -57 },
  [-21]: { name: 'იოანე კიბისაღმწერლისა', kind: 'sunday', tr: true, head: /^მეოთხესა კვირიაკესა მარხვათასა/ },
  [-17]: { name: 'ანდრია კრიტელის კანონისა', kind: 'canon', tr: false, head: /^ხუთშაბათსა მეხუთესა მარხვათასა/ },
  [-15]: { name: 'დაუჯდომლის შაბათისა', kind: 'saturday', tr: true, head: /^შაბათსა მეხუთესავე/ },
  [-14]: { name: 'მარიამ მეგვიპტელისა', kind: 'sunday', tr: true, head: /^მეხუთესა კვირიაკესა მარხვათასა/ },
  [-8]: { name: 'ლაზარეს შაბათისა', kind: 'lazarus', tr: true, head: /^მეექუსესა შაბათსა/ },
  [-7]: { name: 'ბზობისა', kind: 'feast', tr: true, head: /^კვირიაკესა ბაიასსა/ },
  [-6]: { name: 'დიდი ორშაბათისა', kind: 'holy', tr: true, head: /^წმიდასა და დიდსა ორშაბათსა/ },
  [-5]: { name: 'დიდი სამშაბათისა', kind: 'holy', tr: true, head: /^წმიდასა და დიდსა სამშაბათსა/ },
  [-4]: { name: 'დიდი ოთხშაბათისა', kind: 'holy', tr: true, head: /^წმიდასა და დიდსა ოთხშაბათსა/ },
  [-3]: { name: 'დიდი ხუთშაბათისა', kind: 'holy', tr: true, head: /^წმიდასა და დიდსა ხუთშაბათსა/ },
  [-2]: { name: 'დიდი პარასკევისა', kind: 'holy', tr: true, head: /^წმიდასა და დიდსა პარასკევსა/ },
  [-1]: { name: 'დიდი შაბათისა', kind: 'holy', tr: true, head: /^წმიდასა და დიდსა შაბათსა/ },
  0: { name: 'აღდგომისა', kind: 'pascha', tr: true, head: /^წმიდასა და დიდსა კვირიაკესა პასექისსა/ },
  7: { name: 'თომას კვირიაკისა', kind: 'sunday', tr: true, head: /^ახალსა კვირიაკესა თომასაგან/ },
  14: { name: 'მენელსაცხებლეთა', kind: 'sunday', tr: true, head: /^კვირიაკესა მენელსაცხებლეთასა/ },
  21: { name: 'განრღვეულისა', kind: 'sunday', tr: false, head: /^კვირიაკესა განრღვეულისასა/ },
  24: { name: 'შუაზატიკისა', kind: 'midfeast', tr: true, head: /^ოთხშაბათსა შუაზატიკისასა/ },
  28: { name: 'სამარიტელისა', kind: 'sunday', tr: false, head: /^კვირიაკესა სამარიტელისასა/ },
  35: { name: 'შობიდან ბრმისა', kind: 'sunday', tr: false, head: /^კვირიაკესა შობიდან ბრმისასა/ },
  38: { name: 'აღდგომის წარგზავნისა', kind: 'pascha', tr: true, hymnsOf: 0 },
  39: { name: 'ამაღლებისა', kind: 'feast', tr: true, head: /^ხუთშაბათსა ამაღლებასა/ },
  42: { name: 'ნიკეის 318 მამათა', kind: 'sunday', tr: true, head: /^კვირიაკესა წმიდათა 318/ },
  45: { name: 'დოდო გარეჯელისა', kind: 'saint', tr: true, head: /^მეშვიდესა ზატიკის ოთხშაბათსა/ },
  46: { name: 'დავით გარეჯელისა', kind: 'saint', tr: true, head: /^ამისა შემდგომად ხუთშაბათსა/ },
  48: { name: 'მიცვალებულთა შაბათისა', kind: 'departed', tr: true, hymnsOf: -57 },
  49: { name: 'სულთმოფენობისა', kind: 'feast', tr: true, head: /კვირიაკესა მეერგასესა/ },
  56: { name: 'ყოველთა წმიდათა', kind: 'sunday', tr: true, head: /^კვირიაკესა ყოველთა წმიდათასა/ },
};

export const triodionOf = (e: number): TriDay | null => TRIODION[e] ?? null;

/** the headings that end a day's run in ჟამნი 25 */
const ENDS = new RegExp(
  [...Object.values(TRIODION).filter(d => d.head).map(d => d.head!.source),
    '^უწყებულ იყავნ, ვითარმედ შემდგომა', '^შაბათსა უწინარეს სული', '^უწყებულ იყავნ, რამეთუ შემდგომად კვირიაკესა'].join('|'),
);

/** where the day's troparia and kontakia stand (ჟამნი „მარხვანი და ზატიკი“) */
export const triodionSrc = (e: number): TextSrc | null => {
  const d = TRIODION[e];
  const own = d?.hymnsOf !== undefined ? TRIODION[d.hymnsOf] : d;
  if (!own?.head) return null;
  return { coll: 'jamni', n: 25, part: 0, find: own.head, until: ENDS, label: `ჟამნი · ${own.name}` };
};

/** a day's run → its troparia and kontakia (the rubrics and Ps 50's repentance troparia left out) */
const SKIP = /^(უწყოდეთ|უწყებულ|მიწყალე|მასვე|ესრეთ|ხოლო წარდგომანი|მუხლი|\d+\s*გზის|\d+\s*გალობასა\s+ზედა\.\s*იკოს|ვიტყვით ამას)/;
export const splitHymns = (run: Section[]): { tr: Section[]; ko: Section[] } => {
  const out = { tr: [] as Section[], ko: [] as Section[] };
  let last: 'tr' | 'ko' | null = 'tr';
  run.forEach(([h, ps], i) => {
    if (!ps.length) return;
    if (i === 0) {
      // „…ტროპარი აღდგომის ხმისა, კონდაკი, ხმა 3.“ — the troparion is the resurrection's, the text below is the kontakion
      const ko = /კონდაკ/.test(h) && (!/ტროპარ/.test(h) || /ტროპარი აღდგომი/.test(h));
      const tone = h.match(/ხმა\s*(\d+)/)?.[1];
      out[ko ? 'ko' : 'tr'].push([`${ko ? 'კონდაკი' : 'ტროპარი'}${tone ? `, ხმა ${tone}` : ''}`, ps]);
      last = ko ? 'ko' : 'tr';
    } else if (SKIP.test(h)) last = null;
    else if (/კონდაკ/.test(h)) { out.ko.push([h, ps]); last = 'ko'; }
    else if (/ტროპარ|^ხმა\s*\d/.test(h)) { out.tr.push([h, ps]); last = 'tr'; }
    else if (/^(დიდება|აწ\s*და)/.test(h)) { if (last) out[last].push([h, ps]); }
    else last = null;
  });
  // the book names Ascension's kontakion „ტროპარი“ too: two troparia and no kontakion — the second is the kontakion
  if (!out.ko.length && out.tr.length >= 2) out.ko.push(['კონდაკი', out.tr.pop()![1]]);
  return out;
};

/**
 * What a movable day does to the troparia and kontakia:
 * `own` — the day's own hymns (source `e`); `after` — an afterfeast: the feast's hymns beside the saint's;
 * `paschal` — the Pentecostarion's weekdays: Pascha's kontakion in the place of the Theotokos' at the liturgy.
 */
export interface Movable { mode: 'own' | 'after' | 'paschal'; e: number; day: TriDay }
const after = (e: number, from: number, to: number) => e >= from && e <= to;
export const movableOf = (e: number): Movable | null => {
  const d = TRIODION[e];
  if (d && d.kind !== 'canon') return { mode: 'own', e: d.hymnsOf ?? e, day: d };
  // the movable feasts' afterfeasts (their own days above win): Mid-Pentecost to its leave-taking, Ascension, Pentecost
  if (after(e, 25, 31)) return { mode: 'after', e: 24, day: TRIODION[24] };
  if (after(e, 40, 47)) return { mode: 'after', e: 39, day: TRIODION[39] };
  if (after(e, 50, 55)) return { mode: 'after', e: 49, day: TRIODION[49] };
  if (after(e, 8, 37)) return { mode: 'paschal', e: 0, day: TRIODION[0] };
  return null;
};

/** the Saturdays of the departed (meatfare, the 2nd–4th of Lent, before Pentecost) */
export const departedSaturday = (e: number) => TRIODION[e]?.kind === 'departed';

/** Great Compline is read on Lent's Monday–Thursday evenings (weeks 1–6) — the evening before `e` */
// not before the Great Canon's Thursday: that evening matins itself is served (the Typikon: compline is read in the cells)
export const complineEve = (e: number, dow: number) => e >= -47 && e <= -9 && dow >= 2 && dow <= 5 && e !== -17;

/** St Andrew's canon at Great Compline in Lent's first week: 1 = Monday evening … 4 = Thursday evening */
export const andrewPart = (e: number): number | null => (e >= -47 && e <= -44 ? e + 48 : null);

/** Lent's Sunday evenings (the eve of its Mondays): the great prokeimenon, the Lenten vespers' first day */
export const lentSundayEvening = (e: number, dow: number) => dow === 1 && e >= -48 && e <= -13;

/** the twelve Passion Gospels (Holy Friday's matins, served on Thursday evening) */
export const PASSION_GOSPELS = [
  'ინ. 13:31–18:1', 'ინ. 18:1–28', 'მთ. 26:57–75', 'ინ. 18:28–19:16', 'მთ. 27:3–32', 'მრ. 15:16–32',
  'მთ. 27:33–54', 'ლკ. 23:32–49', 'ინ. 19:25–37', 'მრ. 15:43–47', 'ინ. 19:38–42', 'მთ. 27:62–66',
];
