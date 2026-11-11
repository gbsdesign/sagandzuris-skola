import type { CalendarDay } from '../data/churchCalendar';
import { FEAST_RULES, addDays, orthodoxEaster } from '../data/churchFeasts';
import { dayText, readingsOf, toneOf, type Reading } from './dayReadings';
import {
  gospelNumberOf, menaion, octoechos, pentecostarion, saintKindOf, saintProkeimenon, sundayExapost, weekdayExapost, type TextSrc,
} from './serviceTexts';

// „დღის მსახურება“ (pages/medavitneoba/DayService.tsx, the user, 2026-11-09: „მიმდინარე დღის ღილაკი მედავითნეობის თავში
// … მწუხრი, ცისკარი, წირვა … ხმები, მსახურების რანგები, ტაძრის სახელობა“; plan doc „დღის მსახურების გეგმა“). One church
// day = the eve's vespers, the morning's matins, the hours and the liturgy, step by step, built from the calendar day
// (data/calendar), the week's tone, the day's rank and the reader's temple. The rules are the Jerusalem Typikon's
// (ch. 17 kathismas, ch. 52 troparia at the entrance) in their usual parish form; stage 1 covers the Octoechos part of
// the year — the Triodion / Pentecostarion get a warning (`period`) until stage 4.

export type Rank = 'simple' | 'doxology' | 'polyeleos' | 'vigil' | 'great';
export const RANKS: { id: Rank; label: string; hint: string }[] = [
  { id: 'simple', label: 'უბრალო', hint: 'ყოველდღიური მწუხრი და ცისკარი' },
  { id: 'doxology', label: 'სადიდებელი', hint: 'ცისკარზე დიდი დოქსოლოგია' },
  { id: 'polyeleos', label: 'პოლიელეოსი', hint: 'დიდი მწუხრი, ცისკარზე სახარება' },
  { id: 'vigil', label: 'ღამისთევა', hint: 'მწუხრი და ცისკარი ერთად, ლიტიით' },
  { id: 'great', label: 'დიდი დღესასწაული', hint: 'დღესასწაულის განგება' },
];
export const rankLabel = (r: Rank) => RANKS.find(x => x.id === r)!.label;
const LEVEL: Record<Rank, number> = { simple: 0, doxology: 1, polyeleos: 2, vigil: 3, great: 4 };
export const atLeast = (r: Rank, min: Rank) => LEVEL[r] >= LEVEL[min];

// ---------- the reader's temple ----------
export type PatronKind = 'lord' | 'theotokos' | 'saint';
export interface Patron {
  name: string;
  kind: PatronKind;
  /** its new-style day „MM-DD“, or days after Easter */
  md?: string;
  easter?: number;
  /** a FEAST_RULES id when picked from the list */
  id?: string;
}
const LORD = new Set(['jvari', 'migebeba', 'natlisgeba', 'peristsvaleba', 'amagleba', 'sameba', 'agdgoma', 'shoba', 'svetitskhovloba']);
const THEOTOKOS = new Set(['mariam-shoba', 'mariamoba', 'khareba', 'tadrad']);
/** the temples' feasts of data/churchFeasts.ts as a pick list: the Lord's, the Theotokos', the saints' */
export const PATRON_PRESETS: Patron[] = FEAST_RULES.filter(f => f.id !== 'gabriel-beri').map(f => ({
  id: f.id, name: f.label, md: f.md, easter: f.easter,
  kind: LORD.has(f.id) ? 'lord' : THEOTOKOS.has(f.id) ? 'theotokos' : 'saint',
}));
export const isPatron = (v: unknown): v is Patron => {
  const p = v as Patron;
  return !!p && typeof p.name === 'string' && ['lord', 'theotokos', 'saint'].includes(p.kind)
    && (typeof p.md === 'string' || typeof p.easter === 'number');
};
/** the patron's day in the civil year of `iso` */
export const patronDay = (p: Patron, iso: string) => {
  const y = iso.slice(0, 4);
  return p.md ? `${y}-${p.md}` : addDays(orthodoxEaster(Number(y)), p.easter ?? 0);
};

// ---------- the day ----------
const dowOf = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();
const easterOffset = (iso: string) =>
  Math.round((Date.parse(`${iso}T12:00:00Z`) - Date.parse(`${orthodoxEaster(Number(iso.slice(0, 4)))}T12:00:00Z`)) / 864e5);

/** old-style { month, day } of a new-style day (the lag is 13 days until 2100) */
export const oldMD = (iso: string) => {
  const o = addDays(iso, -13);
  return { month: Number(o.slice(5, 7)), day: Number(o.slice(8, 10)) };
};

export interface Great { id: string; name: string; kind: 'lord' | 'theotokos'; trisagion?: 'baptized' | 'cross' }
const GREAT_FIXED: Record<string, Great> = {
  '09-21': { id: 'mariam-shoba', name: 'ღვთისმშობლის შობა', kind: 'theotokos' },
  '09-27': { id: 'jvari', name: 'ჯვართამაღლება', kind: 'lord', trisagion: 'cross' },
  '12-04': { id: 'tadrad', name: 'ღვთისმშობლის ტაძრად მიყვანება', kind: 'theotokos' },
  '01-07': { id: 'shoba', name: 'ქრისტეშობა', kind: 'lord', trisagion: 'baptized' },
  '01-14': { id: 'tsinadatsveta', name: 'უფლის წინადაცვეთა', kind: 'lord' },
  '01-19': { id: 'natlisgeba', name: 'ნათლისღება', kind: 'lord', trisagion: 'baptized' },
  '02-15': { id: 'migebeba', name: 'მიგებება', kind: 'lord' },
  '04-07': { id: 'khareba', name: 'ხარება', kind: 'theotokos' },
  '08-19': { id: 'peristsvaleba', name: 'ფერისცვალება', kind: 'lord' },
  '08-28': { id: 'mariamoba', name: 'ღვთისმშობლის მიძინება', kind: 'theotokos' },
};
const GREAT_MOVABLE: Record<number, Great> = {
  [-7]: { id: 'bzoba', name: 'იერუსალიმს შესვლა (ბზობა)', kind: 'lord' },
  0: { id: 'agdgoma', name: 'აღდგომა', kind: 'lord', trisagion: 'baptized' },
  39: { id: 'amagleba', name: 'ამაღლება', kind: 'lord' },
  49: { id: 'sameba', name: 'სულთმოფენობა (სამება)', kind: 'lord', trisagion: 'baptized' },
};
/** the Georgian Church's great saints' days kept with a vigil (new style) */
const VIGIL_FIXED = new Set(['01-27', '10-14', '11-23', '07-07', '07-12', '09-11', '12-19']);

export const greatFeastOf = (iso: string): Great | null => GREAT_MOVABLE[easterOffset(iso)] ?? GREAT_FIXED[iso.slice(5)] ?? null;

export type Period = 'octoechos' | 'triodion' | 'pentecostarion';
export const periodOf = (iso: string): Period => {
  const e = easterOffset(iso);
  if (e >= -70 && e < 0) return 'triodion';
  if (e >= 0 && e <= 56) return 'pentecostarion';
  return 'octoechos';
};

/** the calendar's lines for one service: „მწუხრ.:“ / „ცისკ.:“ (the readings that make a feast) */
const lineOf = (day: CalendarDay, re: RegExp) => {
  const text = day.p.map(p => p.map(r => r[0]).join('')).join('\n');
  const m = re.exec(text);
  return m ? m[1].replace(/\s+/g, ' ').trim().replace(/[.;]\s*$/, '') : '';
};
export const vespersReadingsText = (day: CalendarDay) => lineOf(day, /მწუხ(?:რ)?\.?\s*:\s*([^\n]+)/);

/** the rank the app guesses: a great feast, the temple's day, a Sunday, readings at vespers or a matins Gospel, a red saint */
export const guessRank = (iso: string, day: CalendarDay | null, patron: Patron | null): Rank => {
  if (greatFeastOf(iso)) return 'great';
  if (patron && patronDay(patron, iso) === iso) return 'vigil';
  if (VIGIL_FIXED.has(iso.slice(5))) return 'vigil';
  if (dowOf(iso) === 0) return 'vigil';
  if (!day) return 'simple';
  // Lent's weekday readings at vespers are the Triodion's, not a feast's
  const e = easterOffset(iso);
  if (e >= -48 && e <= -9 && dowOf(iso) >= 1 && dowOf(iso) <= 5) return day.s.some(s => s.b) ? 'doxology' : 'simple';
  const rs = readingsOf(day);
  if (vespersReadingsText(day) || rs.some(r => r.label === 'ცისკ')) return 'polyeleos';
  if (day.s.some(s => s.b)) return 'doxology';
  return 'simple';
};

/** the week's tone: the day's own, else the Sunday before it */
export const weekTone = (day: CalendarDay | null, sunday: CalendarDay | null) => (day && toneOf(day)) ?? (sunday && toneOf(sunday)) ?? null;

// ---------- the psalter (Typikon ch. 17) ----------
/** the winter order: from 22 Sept to 19 Dec, and from 15 Jan until Lent (old style) */
const winter = (iso: string) => {
  const { month, day } = oldMD(iso);
  const md = month * 100 + day;
  if (md >= 922 && md <= 1219) return true;
  return md >= 115 && month < 9 && easterOffset(iso) < -48;
};
const SUMMER_MATINS: number[][] = [[2, 3], [4, 5], [7, 8], [10, 11], [13, 14], [19, 20], [16, 17]];
const WINTER_MATINS: number[][] = [[2, 3, 17], [4, 5, 6], [7, 8, 9], [10, 11, 12], [13, 14, 15], [19, 20], [16, 17]];
const SUMMER_VESPERS: (number | null)[] = [null, 6, 9, 12, 15, 18, 1]; // by the eve's weekday (the evening's)
export const matinsKathismas = (iso: string, rank: Rank) => {
  const list = (winter(iso) ? WINTER_MATINS : SUMMER_MATINS)[dowOf(iso)];
  return atLeast(rank, 'polyeleos') ? list.slice(0, 2) : list;
};
/** the vespers' kathisma for the day `iso` (sung the evening before): a number, „first“ (only „ნეტარ არს კაცი“) or none */
export const vespersKathisma = (iso: string, rank: Rank): number | 'first' | null => {
  const eve = (dowOf(iso) + 6) % 7;
  if (eve === 6) return 1; // Saturday evening, for the Sunday
  if (eve === 0) return null; // Sunday evening
  if (atLeast(rank, 'polyeleos')) return 'first';
  return winter(iso) ? 18 : SUMMER_VESPERS[eve];
};

// the evening prokeimenon by the evening's weekday, the liturgy's day by its own
const VESPERS_PROKEIMENON = ['ფს. 133 — „აწ აკურთხევდით უფალსა“', 'ფს. 4', 'ფს. 22', 'ფს. 53', 'ფს. 120', 'ფს. 58', 'ფს. 92 — „უფალი სუფევს“'];
const DAY_THEME = ['აღდგომა', 'უხორცო ძალნი', 'იოანე ნათლისმცემელი', 'ჯვარი და ღვთისმშობელი', 'მოციქულნი და წმ. ნიკოლოზი', 'ჯვარი', 'ყოველნი წმიდანი და მიცვალებულნი'];
const COMMUNION = ['ფს. 148: 1', 'ფს. 103: 4', 'ფს. 111: 6', 'ფს. 115: 4', 'ფს. 18: 5', 'ფს. 73: 12', 'ფს. 32: 1'];
const WEEKDAY_NOM = ['კვირას', 'ორშაბათს', 'სამშაბათს', 'ოთხშაბათს', 'ხუთშაბათს', 'პარასკევს', 'შაბათს'];
export const WEEKDAY_GEN = ['კვირისა', 'ორშაბათისა', 'სამშაბათისა', 'ოთხშაბათისა', 'ხუთშაბათისა', 'პარასკევისა', 'შაბათისა'];

// ---------- the services ----------
export type Who = 'reader' | 'choir' | 'priest' | 'deacon';
export const WHO_LABEL: Record<Who, string> = { reader: 'მედავითნე', choir: 'გუნდი', priest: 'მღვდელი', deacon: 'დიაკონი' };

/** what a step can unfold or open */
export type Extra =
  | { kind: 'kathisma'; n: number }
  | { kind: 'prayer'; id: string; label: string }
  | { kind: 'book'; coll: string; n: number; part?: number; label: string }
  | { kind: 'troparia'; at: 'vespers' | 'matins' | 'hours' | 'liturgy' }
  | { kind: 'vespersReadings'; text: string }
  | { kind: 'readings'; items: Reading[] }
  | { kind: 'tone' }
  | { kind: 'text'; src: TextSrc; label: string };

export interface Step {
  title: string;
  who: Who[];
  /** what changes today, in a line (wine) */
  note?: string;
  /** a softer second line */
  hint?: string;
  extras?: Extra[];
  /** the chants of the books (data/chantLookup SERVICE_LISTS ids) sung here — their notes open from the step */
  chants?: string[];
  /** offer the versions in the week's tone first */
  toned?: boolean;
}
export type ServiceId = 'vespers' | 'matins' | 'hours' | 'liturgy';
export interface Service { id: ServiceId; title: string; when: string; steps: Step[]; note?: string }

export interface DayInput {
  iso: string;
  day: CalendarDay | null;
  tone: number | null;
  rank: Rank;
  patron: Patron | null;
}

/** the troparia and kontakia in their order (Typikon ch. 52 in its parish form) — names; the page shows the texts */
export interface Hymn { role: 'feast' | 'resurrection' | 'day' | 'temple' | 'saint' | 'protection' | 'theotokion'; label: string; glory?: 'glory' | 'now' }
export const hymnsOf = (inp: DayInput, at: 'vespers' | 'matins' | 'hours' | 'liturgy'): { troparia: Hymn[]; kontakia: Hymn[] } => {
  const great = greatFeastOf(inp.iso);
  const dow = dowOf(inp.iso);
  const sunday = dow === 0;
  const p = inp.patron;
  const templeToday = !!p && patronDay(p, inp.iso) === inp.iso;
  const toneTxt = inp.tone ? `, ხმა ${inp.tone}` : '';
  if (great) return {
    troparia: [{ role: 'feast', label: `${great.name} — დღესასწაულის ტროპარი` }],
    kontakia: at === 'vespers' || at === 'matins' ? [] : [{ role: 'feast', label: `${great.name} — დღესასწაულის კონდაკი` }],
  };
  const who = templeToday ? `ტაძრის წმიდანის (${p!.name})` : 'დღის წმიდანის';
  const saintT: Hymn = { role: 'saint', label: `${who} ტროპარი` };
  const saintK: Hymn = { role: 'saint', label: `${who} კონდაკი` };
  const resT: Hymn = { role: 'resurrection', label: `აღდგომის ტროპარი${toneTxt}` };
  const resK: Hymn = { role: 'resurrection', label: `აღდგომის კონდაკი${toneTxt}` };
  const dayT: Hymn = { role: 'day', label: `${WEEKDAY_GEN[dow]} ტროპარი (${DAY_THEME[dow]})` };
  const dayK: Hymn = { role: 'day', label: `${WEEKDAY_GEN[dow]} კონდაკი` };
  // a feast-rank saint (or the temple's own day) takes the weekday's place
  const ownDay = !sunday && (templeToday || atLeast(inp.rank, 'polyeleos'));
  const withGlory = (list: Hymn[], last: Hymn) => {
    const out = list.map(h => ({ ...h }));
    if (out.length > 1) out[out.length - 1].glory = 'glory';
    return [...out, { ...last, glory: 'now' as const }];
  };
  if (at === 'vespers' || at === 'matins') {
    const theotokion: Hymn = { role: 'theotokion', label: 'ღვთისმშობლისა — ბოლო ტროპარის ხმაზე' };
    return { troparia: withGlory(sunday ? [resT, saintT] : [saintT], theotokion), kontakia: [] };
  }
  if (at === 'hours') return { troparia: sunday ? [resT, saintT] : ownDay ? [saintT] : [dayT, saintT], kontakia: [sunday ? resK : saintK] };
  // liturgy, after the small entrance: a Lord's or the Theotokos' temple sings its troparion first on a weekday,
  // a saint's temple after the day's; on Sunday the resurrection's always leads
  const temple = p && !templeToday ? p : null;
  const templeT: Hymn | null = temple ? { role: 'temple', label: `ტაძრის ტროპარი — ${temple.name}` } : null;
  const templeK: Hymn | null = temple ? { role: 'temple', label: `ტაძრის კონდაკი — ${temple.name}` } : null;
  const head = sunday ? resT : ownDay ? saintT : dayT;
  const tr: Hymn[] = [];
  if (templeT && temple!.kind !== 'saint' && !sunday) tr.push(templeT, head);
  else { tr.push(head); if (templeT) tr.push(templeT); }
  if (head !== saintT) tr.push(saintT);
  const ko: Hymn[] = [sunday ? resK : ownDay ? saintK : dayK];
  if (templeK && temple!.kind !== 'theotokos') ko.push(templeK);
  if (ko[0] !== saintK) ko.push(saintK);
  const last: Hymn = templeK && temple!.kind === 'theotokos' ? templeK : { role: 'protection', label: '„ქრისტიანეთა მეოხო“ — ღვთისმშობლისა' };
  return { troparia: tr, kontakia: withGlory(ko, last) };
};
const dedupe = (list: Hymn[]) => list.filter((h, i) => list.findIndex(x => x.label === h.label) === i);

const BOOK = {
  vespers: { coll: 'jamni', n: 10, label: 'ჟამნი · მწუხრი' },
  matins: { coll: 'jamni', n: 4, label: 'ჟამნი · ცისკარი' },
  hour1: { coll: 'jamni', n: 5, label: 'ჟამნი · პირველი ჟამი' },
  hour3: { coll: 'jamni', n: 6, label: 'ჟამნი · მესამე ჟამი' },
  hour6: { coll: 'jamni', n: 7, label: 'ჟამნი · მეექვსე ჟამი' },
  hour9: { coll: 'jamni', n: 9, label: 'ჟამნი · მეცხრე ჟამი' },
  typika: { coll: 'jamni', n: 8, label: 'ჟამნი · სადილის ჟამი' },
  weekdayHymns: { coll: 'jamni', n: 28, label: 'ჟამნი · ტროპარნი მსგეფსისანი' },
  sunVespers: { coll: 'mgalobeltatvis', n: 2, label: 'მგალობელთათვის · დიდი მწუხრი' },
  sunMatins: { coll: 'mgalobeltatvis', n: 3, label: 'მგალობელთათვის · დიდი ცისკარი' },
  sunLiturgy: { coll: 'mgalobeltatvis', n: 1, label: 'მგალობელთათვის · კვირის ლიტურგია' },
  liturgy: { coll: 'mgalobeltatvis', n: 4, label: 'მგალობელთათვის · ლიტურგია (სადაგი)' },
  dayVespers: { coll: 'mgalobeltatvis', n: 5, label: 'მგალობელთათვის · მწუხრი (სადაგი)' },
  dayMatins: { coll: 'mgalobeltatvis', n: 6, label: 'მგალობელთათვის · ცისკარი (სადაგი)' },
  exapost: { coll: 'paraklitoni', n: 9, label: 'პარაკლიტონი · განმანათლებელნი' },
};
const book = (b: { coll: string; n: number; label: string }, part?: number): Extra => ({ kind: 'book', ...b, part });
const text = (src: TextSrc | null, label?: string): Extra | null => (src ? { kind: 'text', src, label: label ?? src.label } : null);
const some = (...xs: (Extra | null | false | undefined)[]) => xs.filter(Boolean) as Extra[];

/** the day's saint whose kind the common services know: the red one first, then the first named */
export const saintKindOfDay = (day: CalendarDay | null) => {
  if (!day) return 0;
  const list = [...day.s.filter(x => x.b), ...day.s];
  for (const x of list) { const k = saintKindOf(x.n); if (k) return k; }
  return 0;
};

/** where the year stands for the services (stage 4): Lent's weekdays, Holy Week, Bright Week, the Paschal forty days */
export const seasonOf = (iso: string) => {
  const e = easterOffset(iso);
  const dow = dowOf(iso);
  return {
    e,
    lentWeekday: e >= -48 && e <= -9 && dow >= 1 && dow <= 5,
    presanctified: e >= -48 && e <= -4 && (dow === 3 || dow === 5) && e !== -2,
    holyWeek: e >= -6 && e <= -1,
    basil: [-42, -35, -28, -21, -14, -3, -1].includes(e) || iso.slice(5) === '01-14',
    bright: e >= 0 && e <= 6,
    paschal: e >= 0 && e <= 38,
    psalm136: [-63, -56, -49].includes(e),
    repentance: dow === 0 && e >= -70 && e <= -14,
    lazarus: e === -8,
    kneeling: e === 50,
  };
};

export const buildServices = (inp: DayInput): Service[] => {
  const { iso, day, tone, rank } = inp;
  const dow = dowOf(iso);
  const sunday = dow === 0;
  const great = greatFeastOf(iso);
  const season = seasonOf(iso);
  if (season.bright) return brightWeek(inp, season.e);
  const vigil = atLeast(rank, 'vigil');
  const big = atLeast(rank, 'polyeleos');
  const readings = day ? readingsOf(day) : [];
  const vespersText = day ? vespersReadingsText(day) : '';
  const matinsGospel = readings.filter(r => r.label === 'ცისკ');
  const liturgy = readings.filter(r => r.label !== 'ცისკ' && r.label !== 'მწუხრ');
  const apostle = liturgy.filter(r => r.apostle);
  const gospel = liturgy.filter(r => !r.apostle);
  const toneTxt = tone ? `ხმა ${tone}` : 'კვირის ხმა';
  const eveDow = (dow + 6) % 7;
  const kind = great ? 0 : saintKindOfDay(day);
  const gospelNo = day ? gospelNumberOf(dayText(day).match(/ცისკ[^\n]*/)?.[0] ?? '') : null;
  const zatiki = season.paschal || (season.e >= 39 && season.e <= 56) ? pentecostarion(season.e) : null;
  const lentText = season.e >= -70 && season.e < 0 ? text({ coll: 'jamni', n: 25, part: 0, label: 'ჟამნი · მარხვანი' }) : null;
  const christIsRisen = season.paschal;

  // ----- vespers -----
  const k = season.lentWeekday ? 18 : vespersKathisma(iso, rank);
  const v: Step[] = [];
  if (christIsRisen) v.push({ title: '„ქრისტე აღდგა“ — სამგზის', who: ['priest', 'choir'], note: 'აღდგომის წარგზავნამდე მსახურება ასე იწყება' });
  if (!vigil) v.push({ title: 'მეცხრე ჟამი', who: ['reader'], hint: 'ფს. 83, 84, 85 · დღის ტროპარი და კონდაკი', extras: [book(BOOK.hour9)] });
  v.push({ title: '„მოვედით თაყვანი-ვსცეთ“ და ფსალმუნი 103', who: vigil ? ['choir'] : ['reader'], note: vigil ? 'ღამისთევაზე ფს. 103-ს გუნდი გალობს' : undefined, extras: [book(sunday ? BOOK.sunVespers : BOOK.dayVespers)], chants: ['mw-2', 'mw-3'] });
  v.push({ title: 'დიდი კვერექსი', who: ['deacon', 'choir'], chants: ['mw-4'] });
  if (k === 'first') v.push({ title: 'დავითნის კანონი 1 — პირველი დიდება', who: ['choir'], note: '„ნეტარ არს კაცი“ — დღესასწაულის წინა საღამოს', extras: [{ kind: 'kathisma', n: 1 }], chants: ['mw-5'] });
  else if (k) v.push({ title: `დავითნის კანონი ${k}`, who: ['reader'], note: k === 1 && sunday ? '„ნეტარ არს კაცი“ — მთელი კანონი' : season.lentWeekday ? 'მარხვის განრიგით' : undefined, extras: [{ kind: 'kathisma', n: k }], chants: k === 1 ? ['mw-5'] : undefined });
  else v.push({ title: 'დავითნის კანონი', who: ['reader'], note: 'კვირა საღამოს კანონი არ იკითხება' });
  if (season.kneeling) v.push({ title: 'მუხლმოდრეკის ლოცვები', who: ['priest'], note: 'სულთმოფენობის საღამოს — სამი ლოცვა მუხლმოდრეკით' });
  v.push({
    title: '„უფალო ღაღად-ვყავ“ და დასდებელნი', who: ['choir'],
    note: great ? 'დღესასწაულის დასდებელნი' : zatiki ? 'ზატიკის დასდებელნი' : season.lentWeekday ? 'მარხვანისა და წმიდანისა' : sunday ? `${toneTxt} · აღდგომისანი და წმიდანისა` : big ? 'წმიდანის დასდებელნი' : `${toneTxt} · 3 პარაკლიტონისა, 3 წმიდანისა`,
    hint: sunday ? '„დიდება… აწდა“ — დოგმატიკონი' : '„დიდება“ — წმიდანისა · „აწდა“ — ღვთისმშობლისა',
    extras: great ? undefined : some(
      text(zatiki, `ტექსტი — ${zatiki?.label}`),
      !zatiki && !season.lentWeekday && text(octoechos(tone, eveDow, 'stichera'), `ტექსტი — პარაკლიტონი`),
      season.lentWeekday && lentText,
      !zatiki && text(menaion(kind, 'stichera'), 'ტექსტი — წმიდანისა (საზიარო)'),
    ),
    chants: ['mw-7', 'mw-8', ...(sunday ? ['mw-10'] : ['mw-9'])], toned: true,
  });
  if (big || sunday || season.presanctified) v.push({ title: 'შესვლა საცეცხლურით', who: ['priest', 'deacon'] });
  v.push({ title: '„ნათელო მხიარულო“', who: big || sunday ? ['choir'] : ['reader'], chants: ['mw-12'] });
  v.push({ title: 'წარდგომა', who: ['deacon', 'choir'], note: season.kneeling ? 'დიდი წარდგომა — „ვინ არს ღმერთი დიდ“' : VESPERS_PROKEIMENON[eveDow], chants: ['mw-13'] });
  if (vespersText) v.push({ title: 'საწინასწარმეტყველო საკითხავები', who: ['reader'], note: vespersText, extras: some(big && text(menaion(kind, 'readings'), 'ტექსტი — საზიარო საკითხავები')) });
  if (big || sunday) v.push({ title: 'მრჩობლი კვერექსი', who: ['deacon', 'choir'], chants: ['mw-15'] });
  v.push({ title: '„ღირს-მყავ, უფალო“', who: big || sunday ? ['choir'] : ['reader'], note: big || sunday ? 'იგალობება' : 'იკითხება' });
  v.push({ title: 'თხოვნითი კვერექსი', who: ['deacon', 'choir'], chants: ['mw-16'] });
  if (vigil) v.push({ title: 'ლიტია', who: ['choir', 'priest', 'deacon'], note: 'ტაძრის წმიდანისა და დღისა დასდებელნი', extras: some(!sunday && text(menaion(kind, 'litya'), 'ტექსტი — ლიტიისა (საზიარო)')) });
  v.push({
    title: 'სტიხარონსა ზედა დასდებელნი', who: ['choir'],
    note: sunday ? `${toneTxt} · აღდგომისანი` : big ? 'წმიდანისანი' : season.lentWeekday ? 'მარხვანისა' : `${toneTxt} · პარაკლიტონისანი`,
    extras: great || zatiki ? undefined : some(sunday || !big ? text(octoechos(tone, eveDow, 'aposticha'), 'ტექსტი — პარაკლიტონი') : text(menaion(kind, 'aposticha'), 'ტექსტი — წმიდანისა (საზიარო)')),
    chants: sunday ? ['mw-a12-160'] : undefined, toned: true,
  });
  v.push({ title: '„აწ განუტევე“ და სამწმიდაო', who: ['reader'], chants: ['mw-19'], extras: [{ kind: 'prayer', id: 'dila', label: 'სამწმიდაო — ლოცვანში' }] });
  if (vigil && sunday) v.push({ title: 'ტროპარი — „ღვთისმშობელო ქალწულო“', who: ['choir'], note: 'სამგზის', chants: ['mw-20'] });
  else v.push({ title: 'ტროპარნი', who: vigil ? ['choir'] : ['reader'], note: vigil ? (great ? 'დღესასწაულის ტროპარი სამგზის' : 'წმიდანის ტროპარი ორგზის, „ღვთისმშობელო ქალწულო“ ერთგზის') : season.lentWeekday ? '„ღვთისმშობელო ქალწულო“ და სხვანი — მარხვის წესით' : undefined, extras: vigil && !great ? undefined : [{ kind: 'troparia', at: 'vespers' }], chants: vigil ? ['mw-20'] : undefined });
  if (season.lentWeekday) v.push({ title: 'ეფრემ ასურის ლოცვა', who: ['priest'], note: '„უფალო და მეუფეო ცხოვრებისა ჩემისაო“ — მეტანიებით', extras: [{ kind: 'prayer', id: 'efrem-asuri', label: 'ეფრემ ასურის ლოცვა' }] });
  if (!big && !sunday) v.push({ title: 'მრჩობლი კვერექსი', who: ['deacon', 'choir'], chants: ['mw-15'] });
  if (vigil) v.push({ title: 'ხუთი პურის კურთხევა', who: ['priest', 'choir'], note: '„აკურთხევდე უფალსა“ (ფს. 33) — ცისკარი იწყება ექვსი ფსალმუნით' });
  else v.push({ title: 'განტევება', who: ['priest'], chants: ['mw-21'] });

  // ----- matins -----
  const m: Step[] = [];
  if (!vigil) m.push({ title: 'მეფური ფსალმუნები (19, 20)', who: ['reader'], hint: 'ტროპარნი, მცირე კვერექსი', extras: [book(sunday ? BOOK.sunMatins : BOOK.dayMatins)] });
  if (christIsRisen && !vigil) m.push({ title: '„ქრისტე აღდგა“ — სამგზის', who: ['priest', 'choir'] });
  m.push({ title: 'ექვსი ფსალმუნი', who: ['reader'], hint: 'ფს. 3, 37, 62, 87, 102, 142 — ტაძარში ჩუმად ისმენენ', extras: [book(BOOK.matins)] });
  m.push({ title: 'დიდი კვერექსი', who: ['deacon', 'choir'], chants: ['ck-2'] });
  if (season.lentWeekday) m.push({ title: '„ალილუია“ და სამების საგალობლები', who: ['choir', 'reader'], note: '„ღმერთი უფალის“ ნაცვლად — მარხვის დღეებში', extras: some(lentText) });
  else m.push({ title: '„ღმერთი უფალი“ და ტროპარნი', who: ['choir'], note: tone ? `${great ? 'დღესასწაულის' : sunday ? `აღდგომის, ხმა ${tone}` : 'დღის ტროპარის'} ხმით` : undefined, extras: [{ kind: 'troparia', at: 'matins' }], chants: sunday ? ['ck-3', 'ck-4', 'ck-v9-79'] : ['ck-3', 'ck-a10-133'], toned: sunday });
  const mk = matinsKathismas(iso, rank);
  m.push({
    title: `დავითნის კანონები ${mk.join(', ')}`, who: ['reader'], hint: 'თითო კანონის შემდეგ — მცირე კვერექსი და წარდგომანი (ჯდომითნი)',
    extras: [...mk.map(n => ({ kind: 'kathisma', n }) as Extra), ...some(
      great || zatiki ? null : sunday ? text(octoechos(tone, 6, 'sedalens'), 'ჯდომითნი — პარაკლიტონი') : big ? text(menaion(kind, 'sedalens'), 'ჯდომითნი — წმიდანისა (საზიარო)') : text(octoechos(tone, eveDow, 'sedalens'), 'ჯდომითნი — პარაკლიტონი'),
    )],
  });
  if (sunday && !great) m.push({ title: 'იპაკოი და აღსავალნი (ანტიფონები)', who: ['choir'], note: toneTxt, extras: some(!zatiki && text(octoechos(tone, 6, 'antiphons'), 'ტექსტი — პარაკლიტონი')), chants: ['ck-a11-40', 'ck-11'], toned: true });
  if (big) {
    m.push({ title: 'პოლიელეოსი — „აქებდით სახელსა უფლისასა“', who: ['choir'], hint: season.psalm136 ? 'ფს. 134, 135 და ფს. 136 — „მდინარეთა ზედა ბაბილოვნისათა“' : 'ფს. 134, 135', chants: season.psalm136 ? ['ck-6', 'ck-7'] : ['ck-6'] });
    if (sunday) m.push({ title: '„ქებულ ხარ, უფალო“ — „გუნდნი ანგელოზთანი“', who: ['choir'], hint: 'აღდგომის ტროპარნი, ხმა 5', chants: ['ck-9'] });
    m.push({
      title: 'საცისკრო წარდგომა და სახარება', who: ['deacon', 'priest'],
      note: matinsGospel.length ? matinsGospel.map(r => `${r.name} ${r.ref}`).join(' · ') : undefined,
      extras: some(matinsGospel.length > 0 && { kind: 'readings', items: matinsGospel }, sunday && !zatiki ? text(octoechos(tone, 6, 'prokeimenon'), 'წარდგომა — პარაკლიტონი') : text(saintProkeimenon(kind))),
      chants: ['ck-14', 'ck-a10-197'], toned: sunday,
    });
    if (sunday) m.push({ title: '„აღდგომა ქრისტესი ვიხილეთ“', who: ['choir'], chants: ['ck-19'] });
  }
  m.push({ title: 'ფსალმუნი 50', who: ['reader'], note: season.repentance ? 'შემდეგ — „სინანულისა კარნი განმიღე“ (ტრიოდიდან)' : undefined });
  m.push({
    title: 'კანონი (9 გალობა)', who: ['choir', 'reader'],
    note: great ? 'დღესასწაულის კანონი' : zatiki ? 'ზატიკის კანონი' : season.lentWeekday ? 'ტრიოდისა და წმიდანისა' : sunday ? `აღდგომისა, ${toneTxt}, და წმიდანისა` : big ? 'წმიდანისა' : `პარაკლიტონისა (${toneTxt}) და წმიდანისა`,
    hint: 'მე-3 გალობის შემდეგ — ჯდომითი · მე-6-ის შემდეგ — კონდაკი და იკოსი',
    extras: great ? undefined : some(
      text(zatiki, `ტექსტი — ${zatiki?.label}`),
      !zatiki && !season.lentWeekday && text(octoechos(tone, sunday ? 6 : eveDow, 'canon'), 'კანონი — პარაკლიტონი'),
      season.lentWeekday && lentText,
      !zatiki && text(menaion(kind, 'canon'), 'კანონი — წმიდანისა (საზიარო)'),
    ),
  });
  m.push({ title: '„უპატიოსნესსა“ — მე-9 გალობაზე', who: ['choir'], note: great ? 'დიდ დღესასწაულზე — დღესასწაულის ძლისპირი' : season.paschal ? 'ზატიკში — „ანგელოზი ღაღადებდა“' : undefined, chants: great || season.paschal ? undefined : ['ck-20', 'ck-21'] });
  if (sunday) m.push({ title: '„წმიდა არს უფალი ღმერთი ჩვენი“', who: ['deacon', 'choir'], chants: ['ck-22'] });
  m.push({
    title: 'განმანათლებელი', who: sunday || big ? ['choir'] : ['reader'], note: sunday ? `კვირისა — სახარების რიგით${gospelNo ? ` (${gospelNo})` : ''}` : undefined,
    extras: great || zatiki ? undefined : some(sunday ? text(sundayExapost(gospelNo ?? 0)) : big ? text(menaion(kind, 'exapostilarion'), 'ტექსტი — წმიდანისა (საზიარო)') : text(weekdayExapost(dow))),
    chants: ['ck-a16-131'],
  });
  const praises = atLeast(rank, 'doxology') || sunday;
  m.push({
    title: 'ქებანი (ფს. 148–150)', who: praises ? ['choir'] : ['reader'], note: praises ? 'დასდებელნით' : undefined,
    extras: great || zatiki ? undefined : some(sunday ? text(octoechos(tone, 6, 'lauds'), 'ტექსტი — პარაკლიტონი') : praises ? text(menaion(kind, 'lauds'), 'ტექსტი — წმიდანისა (საზიარო)') : null),
    chants: sunday ? ['ck-15', 'ck-a17-3'] : ['ck-15'], toned: sunday,
  });
  m.push(praises
    ? { title: 'დიდი დოქსოლოგია — „დიდება მაღალთა შინა ღმერთსა“', who: ['choir'], note: 'იგალობება', chants: ['ck-24', 'ck-1'] }
    : { title: 'ყოველდღიური დოქსოლოგია', who: ['reader'], note: 'იკითხება' });
  if (!praises && !season.lentWeekday) m.push({ title: 'სტიხარონსა ზედა დასდებელნი', who: ['choir', 'reader'], note: `${toneTxt} · პარაკლიტონისანი`, extras: some(!zatiki && text(octoechos(tone, eveDow, 'lauds'), 'ტექსტი — პარაკლიტონი')) });
  m.push({ title: sunday ? 'ტროპარი — „დღეს ცხორებაჲ“ ან „აღდეგ საფლავისაგან“' : 'ტროპარი, კვერექსები, განტევება', who: ['choir', 'deacon', 'priest'], hint: sunday ? 'კენტ ხმებში — „დღეს ცხორებაჲ“, ლუწში — „აღდეგ საფლავისაგან“; შემდეგ კვერექსები და განტევება' : undefined, chants: sunday ? [(tone ?? 1) % 2 ? 'ck-25' : 'ck-26', 'ck-16', 'ck-27'] : ['ck-16', 'ck-27'] });
  if (season.lentWeekday) m.push({ title: 'ეფრემ ასურის ლოცვა', who: ['priest'], note: 'მეტანიებით', extras: [{ kind: 'prayer', id: 'efrem-asuri', label: 'ეფრემ ასურის ლოცვა' }] });
  m.push({ title: 'პირველი ჟამი', who: ['reader'], hint: 'ფს. 5, 89, 100 · ტროპარი და კონდაკი · ბოლოს „ზეშთა მბრძოლისა“', extras: [book(BOOK.hour1)], chants: ['ck-a17-112', 'ck-29'] });

  // ----- hours -----
  const h: Step[] = [
    { title: 'მესამე ჟამი', who: ['reader'], hint: 'ფს. 16, 24, 50', note: season.lentWeekday ? 'მარხვაში — დავითნის კანონით და ჟამის ტროპარით' : undefined, extras: [book(BOOK.hour3)] },
    { title: 'მეექვსე ჟამი', who: ['reader'], hint: 'ფს. 53, 54, 90', note: season.lentWeekday ? 'მარხვაში — წინასწარმეტყველების საკითხავით' : undefined, extras: [book(BOOK.hour6)] },
    { title: 'ჟამების ტროპარნი და კონდაკნი', who: ['reader'], note: season.lentWeekday ? 'მარხვაში — ჟამის ტროპარი მეტანიებით' : 'ორივე ჟამზე ერთნაირი', extras: [{ kind: 'troparia', at: 'hours' }] },
  ];
  if (season.lentWeekday) h.push({ title: 'ეფრემ ასურის ლოცვა', who: ['reader'], note: 'ყოველი ჟამის ბოლოს — მეტანიებით', extras: [{ kind: 'prayer', id: 'efrem-asuri', label: 'ეფრემ ასურის ლოცვა' }] });

  // ----- liturgy -----
  const services: Service[] = [
    { id: 'vespers', title: 'მწუხრი', when: `${WEEKDAY_NOM[eveDow]} საღამოს${vigil ? ' · ღამისთევა' : ''}`, steps: v },
    { id: 'matins', title: 'ცისკარი', when: vigil ? 'მწუხრს მიჰყვება' : 'დილით', steps: m },
    { id: 'hours', title: 'ჟამები', when: 'წირვის წინ', steps: h },
  ];
  if (season.e === -2) {
    services.push({ id: 'liturgy', title: 'წირვა', when: 'დიდი პარასკევი', steps: [
      { title: 'სამეუფო ჟამები', who: ['reader', 'priest'], note: 'დიდ პარასკევს წირვა არ აღესრულება', extras: [book(BOOK.hour1)] },
      { title: 'მწუხრი — გარდამოხსნა', who: ['choir', 'priest'], note: 'შუადღეს: გარდამოხსნის გამოსვენება' },
    ] });
    return services;
  }
  if (season.lentWeekday && !season.presanctified && !great) {
    services.push({ id: 'liturgy', title: 'წირვა', when: 'მარხვის დღე', steps: [
      { title: 'წირვა არ აღესრულება', who: ['reader'], note: 'მარხვის ორშაბათს, სამშაბათს და ხუთშაბათს — სადილის ჟამი (ტიპიკა)', extras: [book(BOOK.typika)] },
      { title: 'მეცხრე ჟამი და მწუხრი', who: ['reader', 'choir'], note: 'მწუხრი შუადღის შემდეგ — მარხვის წესით' },
    ] });
    return services;
  }
  if (season.presanctified && !great) {
    services.push({ id: 'liturgy', title: 'წირვა', when: 'წინასწარ კურთხეულთა', note: 'მწუხრთან ერთად', steps: [
      { title: 'მეცხრე ჟამი და სადილის ჟამი', who: ['reader'], extras: [book(BOOK.typika)] },
      { title: '„კურთხეულ არს სუფევა“ და ფს. 103', who: ['priest', 'reader'] },
      { title: 'დავითნის კანონი 18', who: ['reader'], extras: [{ kind: 'kathisma', n: 18 }] },
      { title: '„უფალო ღაღად-ვყავ“', who: ['choir'], extras: some(lentText) },
      { title: 'შესვლა და „ნათელო მხიარულო“', who: ['priest', 'choir'] },
      { title: 'წარდგომა და საკითხავები', who: ['reader'], note: vespersText || 'დაბადებისა და იგავთა — კალენდრის მიხედვით' },
      { title: '„წარემართენ ლოცვაჲ ჩემი“', who: ['choir'], note: 'ფს. 140 — მუხლმოდრეკით' },
      { title: 'ეფრემ ასურის ლოცვა', who: ['priest'], extras: [{ kind: 'prayer', id: 'efrem-asuri', label: 'ეფრემ ასურის ლოცვა' }] },
      ...(apostle.length ? [{ title: 'სამოციქულო', who: ['reader'] as Who[], note: apostle.map(r => `${r.name} ${r.ref}`).join(' · '), extras: [{ kind: 'readings', items: apostle } as Extra] }] : []),
      { title: 'კვერექსები და „აწ ძალნი ზეცისანი“', who: ['deacon', 'choir'], note: 'ქერუბიმთა გალობის ნაცვლად' },
      { title: '„მამაო ჩვენო“', who: ['choir'], chants: ['chant-35'] },
      { title: 'ზიარების მუხლი — „იხილეთ და იგემეთ“', who: ['choir'], hint: 'ამ დროს მედავითნე კითხულობს ზიარების წინა ლოცვებს', extras: [{ kind: 'prayer', id: 'ziarebis-tsin', label: 'ზიარების წინა ლოცვები' }] },
      { title: '„ვაკურთხო უფალი“, ფს. 33 და განტევება', who: ['choir', 'reader', 'priest'] },
    ] });
    return services;
  }
  const typika = sunday || big;
  const l: Step[] = [];
  l.push({ title: 'დიდი კვერექსი', who: ['deacon', 'choir'], note: season.basil ? 'ბასილი დიდის ლიტურგია' : undefined, extras: [book(sunday ? BOOK.sunLiturgy : BOOK.liturgy)], chants: ['chant-4'] });
  l.push({
    title: 'ანტიფონები', who: ['choir'],
    note: great ? 'დღესასწაულის ანტიფონები' : season.paschal ? 'აღდგომის ანტიფონები (თომას კვირიდან — სახვითნი)' : typika ? 'სახვითნი: ფს. 102, 145, „მხოლოდ-შობილო“' : 'ყოველდღიური ანტიფონები',
    hint: typika || great ? undefined : 'ა — „კეთილ არს აღსარება“ · ბ — „უფალი სუფევს“ · გ — „მოვედით, უგალობდეთ“; „მხოლოდ-შობილო“ — მეორის შემდეგ',
    chants: great ? undefined : typika ? ['chant-5', 'chant-a2-276', 'chant-7'] : ['chant-a2-310', 'chant-a2-311', 'chant-7', 'chant-a2-312'],
  });
  if (typika && !great) l.push({ title: 'ნეტარებანი', who: ['choir'], note: sunday ? `${toneTxt} · აღდგომისანი` : 'წმიდანის კანონიდან', extras: some(sunday && !zatiki && text(octoechos(tone, 6, 'beatitudes'), 'ტექსტი — პარაკლიტონი')), chants: ['chant-8'] });
  l.push({ title: 'მცირე შესვლა — „მოვედით თაყვანი-ვსცეთ“', who: ['choir'], note: great ? 'დღესასწაულის შესავალი მუხლი' : sunday || season.paschal ? '„…რომელი აღსდეგ მკუდრეთით“' : '„…რომელი საკვირველ ხარ წმიდათა შორის“', chants: ['chant-10'] });
  l.push({ title: 'ტროპარნი და კონდაკნი', who: ['choir'], note: season.paschal ? 'ბოლოს — აღდგომის კონდაკი' : undefined, extras: [{ kind: 'troparia', at: 'liturgy' }] });
  const trisagion = great?.trisagion ?? (season.lazarus ? 'baptized' : undefined);
  l.push({ title: trisagion === 'baptized' ? '„რაოდენთა ქრისტეს მიერ ნათელ-იღეთ“' : trisagion === 'cross' ? '„ჯუარსა შენსა თაყუანის-ვსცემთ“' : 'სამწმიდაო — „წმიდაო ღმერთო“', who: ['choir'], note: trisagion ? 'სამწმიდაოს ნაცვლად' : undefined, chants: trisagion ? undefined : ['chant-12'] });
  l.push({ title: 'წარდგომა', who: ['reader'], note: sunday ? `${toneTxt} — აღდგომისა${big ? ' და წმიდანისა' : ''}` : great ? 'დღესასწაულისა' : big ? 'წმიდანისა' : `${WEEKDAY_GEN[dow]} (${DAY_THEME[dow]})`, chants: sunday ? ['chant-13'] : ['chant-a3-48'], toned: sunday });
  l.push({ title: 'სამოციქულო', who: ['reader'], note: apostle.length ? apostle.map(r => `${r.name} ${r.ref}`).join(' · ') : 'კალენდარში ჩანაწერი არ არის', extras: apostle.length ? [{ kind: 'readings', items: apostle }] : undefined });
  l.push({ title: 'ალილუია', who: ['reader', 'choir'], note: sunday ? `${toneTxt}` : undefined, chants: ['chant-14'], toned: sunday });
  l.push({ title: 'სახარება', who: ['deacon', 'priest'], note: gospel.length ? gospel.map(r => `${r.name} ${r.ref}`).join(' · ') : undefined, chants: ['chant-15'] });
  l.push({ title: 'კვერექსები და ქერუბიმთა გალობა', who: ['deacon', 'choir'], chants: ['chant-16', 'chant-17', 'chant-18', 'chant-20', 'chant-21'] });
  l.push({ title: 'თხოვნითი კვერექსი და სარწმუნოების სიმბოლო — „მრწამს“', who: ['choir'], chants: ['chant-22', 'chant-23', 'chant-24'] });
  l.push({ title: 'ანაფორა — „წყალობა მშვიდობისა“', who: ['choir'], hint: '„გვაქვს უფლისა მიმართ“ · „ღირს არს და მართალ“ · „წმიდა არს“ · „შენ გიგალობთ“', chants: ['chant-25', 'chant-27', 'chant-28', 'chant-29', 'chant-30'] });
  l.push(great
    ? { title: 'დღესასწაულის ძლისპირი (ღირს არსის ნაცვლად)', who: ['choir'], extras: [{ kind: 'prayer', id: 'ghirs-arsis-nacvlad', label: 'ღირს-არსის ნაცვლად საკითხავნი' }] }
    : season.basil ? { title: '„შენდამი იხარებს“', who: ['choir'], note: 'ბასილი დიდის ლიტურგიაზე — „ღირს არსის“ ნაცვლად', chants: ['chant-31'] }
    : season.paschal ? { title: '„ანგელოზი ღაღადებდა“', who: ['choir'], note: 'აღდგომის წარგზავნამდე — „ღირს არსის“ ნაცვლად', extras: [{ kind: 'prayer', id: 'ghirs-arsis-nacvlad', label: 'ღირს-არსის ნაცვლად საკითხავნი' }] }
    : { title: '„ღირს არს ჭეშმარიტად“', who: ['choir'], chants: ['chant-32'] });
  l.push({ title: 'თხოვნითი კვერექსი და „მამაო ჩვენო“', who: ['choir'], chants: ['chant-34', 'chant-35'] });
  l.push({ title: '„ერთ არს წმიდა“ და ზიარების მუხლი', who: ['choir'], note: great ? 'დღესასწაულისა' : season.paschal ? '„ხორცსა ქრისტესსა“' : sunday ? COMMUNION[0] : big ? `${COMMUNION[dow]} · და წმიდანისა` : `${COMMUNION[dow]} (${DAY_THEME[dow]})`, hint: 'ამ დროს მედავითნე კითხულობს ზიარების წინა ლოცვებს', extras: [{ kind: 'prayer', id: 'ziarebis-tsin', label: 'ზიარების წინა ლოცვები' }], chants: ['chant-37', 'chant-41', 'chant-a3-376', 'chant-a3-382'] });
  l.push({ title: 'ზიარება — „კურთხეულ არს მომავალი“, „ხორცი ქრისტესი“', who: ['choir'], chants: ['chant-39', 'chant-40'] });
  l.push({ title: season.paschal ? '„ქრისტე აღდგა“ და „აღავსე პირი ჩემი“' : '„ვიხილეთ ნათელი ჭეშმარიტი“ და „აღავსე პირი ჩემი“', who: ['choir'], chants: season.paschal ? ['chant-43'] : ['chant-42', 'chant-43'] });
  l.push({ title: '„იყავნ სახელი უფლისა“, ფსალმუნი 33 და განტევება', who: ['choir', 'reader', 'priest'], extras: [{ kind: 'prayer', id: 'ziarebis-shemdeg', label: 'ზიარების შემდგომი ლოცვები' }], chants: ['chant-45', 'chant-46'] });
  services.push({ id: 'liturgy', title: 'წირვა', when: season.basil ? 'ბასილი დიდისა' : 'დილით', steps: l });
  return services;
};

/** Bright Week: the Paschal services, every day the same (ზატიკი) */
const brightWeek = (inp: DayInput, e: number): Service[] => {
  const z = pentecostarion(e);
  const zt = some(text(z, `ტექსტი — ${z?.label}`));
  const readings = inp.day ? readingsOf(inp.day) : [];
  const apostle = readings.filter(r => r.apostle && r.label !== 'ცისკ');
  const gospel = readings.filter(r => !r.apostle && r.label !== 'ცისკ');
  const hours = [{ kind: 'prayer', id: 'paseqis-zhamni', label: 'პასექის ჟამნი' } as Extra];
  return [
    { id: 'vespers', title: 'მწუხრი', when: e === 0 ? 'აღდგომის საღამოს' : 'წინა საღამოს', note: 'ბრწყინვალე შვიდეული', steps: [
      { title: '„ქრისტე აღდგა“ — მუხლებით', who: ['priest', 'choir'], note: 'დავითნი არ იკითხება' },
      { title: '„უფალო ღაღად-ვყავ“ — აღდგომის დასდებელნი', who: ['choir'], extras: zt },
      { title: 'დიდი წარდგომა — „ვინ არს ღმერთი დიდ“', who: ['deacon', 'choir'] },
      { title: 'სტიხარონსა ზედა — „აღდგეს ღმერთი“', who: ['choir'] },
      { title: '„ქრისტე აღდგა“ და განტევება', who: ['choir', 'priest'] },
    ] },
    { id: 'matins', title: 'ცისკარი', when: 'დილით', steps: [
      { title: '„ქრისტე აღდგა“ — მუხლებით', who: ['priest', 'choir'], note: 'ექვსი ფსალმუნი არ იკითხება' },
      { title: 'აღდგომის კანონი — „აღდგომისა დღე არს“', who: ['choir'], extras: some(text({ coll: 'zatiki', n: 1, part: 0, from: /კანონი/, label: 'კანონი — ზატიკი' })) },
      { title: 'განმანათლებელი — „ხორციელად დაიძინე“', who: ['choir'] },
      { title: 'ქებანი და აღდგომის დასდებელნი', who: ['choir'], extras: zt },
      { title: '„ქრისტე აღდგა“ და განტევება', who: ['choir', 'priest'] },
    ] },
    { id: 'hours', title: 'ჟამები', when: 'წირვის წინ', steps: [
      { title: 'პასექის ჟამნი', who: ['reader', 'choir'], note: 'ბრწყინვალე შვიდეულში ჩვეულებრივი ჟამების ნაცვლად', extras: hours },
    ] },
    { id: 'liturgy', title: 'წირვა', when: 'დილით', steps: [
      { title: '„ქრისტე აღდგა“ და აღდგომის ანტიფონები', who: ['priest', 'choir'] },
      { title: 'შესვლა — „კრებულთა შინა აკურთხევდით ღმერთსა“', who: ['deacon', 'choir'] },
      { title: 'ტროპარნი — „ქრისტე აღდგა“, იპაკოი, აღდგომის კონდაკი', who: ['choir'] },
      { title: '„რაოდენთა ქრისტეს მიერ ნათელ-იღეთ“', who: ['choir'], note: 'სამწმიდაოს ნაცვლად' },
      { title: 'სამოციქულო', who: ['reader'], note: apostle.map(r => `${r.name} ${r.ref}`).join(' · ') || undefined, extras: apostle.length ? [{ kind: 'readings', items: apostle }] : undefined },
      { title: 'სახარება', who: ['deacon', 'priest'], note: gospel.map(r => `${r.name} ${r.ref}`).join(' · ') || undefined },
      { title: '„ანგელოზი ღაღადებდა“ — „ნათლით შემოსილო“', who: ['choir'], note: '„ღირს არსის“ ნაცვლად', extras: [{ kind: 'prayer', id: 'ghirs-arsis-nacvlad', label: 'ღირს-არსის ნაცვლად საკითხავნი' }] },
      { title: 'ზიარების მუხლი — „ხორცსა ქრისტესსა“', who: ['choir'], extras: [{ kind: 'prayer', id: 'ziarebis-tsin', label: 'ზიარების წინა ლოცვები' }] },
      { title: '„ქრისტე აღდგა“ და განტევება', who: ['choir', 'priest'], extras: [{ kind: 'prayer', id: 'ziarebis-shemdeg', label: 'ზიარების შემდგომი ლოცვები' }] },
    ] },
  ];
};
