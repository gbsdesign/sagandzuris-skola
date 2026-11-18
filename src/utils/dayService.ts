import type { CalendarDay } from '../data/churchCalendar';
import { FEAST_RULES, addDays, orthodoxEaster } from '../data/churchFeasts';
import { dayText, readingsOf, toneOf, type Reading } from './dayReadings';
import {
  FIX, PRIEST, gospelNumberOf, menaion, octoechos, pentecostarion, saintKindOf, saintProkeimenon, sundayExapost, weekdayExapost, type TextSrc,
} from './serviceTexts';
import { PASSION_GOSPELS, TRIODION, andrewPart, complineEve, lentSundayEvening, movableOf, triodionSrc, type Movable } from './triodion';
import { OWN_SERVICES } from '../data/ownServices';
import { EXTRA_BOOKS } from '../data/extraBooks';

// „დღის მსახურება“ (pages/medavitneoba/DayService.tsx, the user, 2026-11-09: „მიმდინარე დღის ღილაკი მედავითნეობის თავში
// … მწუხრი, ცისკარი, წირვა … ხმები, მსახურების რანგები, ტაძრის სახელობა“; plan doc „დღის მსახურების გეგმა“). One church
// day = the eve's vespers, the morning's matins, the hours and the liturgy, step by step, built from the calendar day
// (data/calendar), the week's tone, the day's rank and the reader's temple. The rules are the Jerusalem Typikon's
// (ch. 17 kathismas, ch. 52 troparia at the entrance) in their usual parish form; stage 1 covers the Octoechos part of
// the year — the Triodion / Pentecostarion get a warning (`period`) until stage 4.

export type Rank = 'simple' | 'doxology' | 'polyeleos' | 'vigil' | 'great';
export const RANKS: { id: Rank; label: string; hint: string }[] = [
  { id: 'simple', label: 'უბრალო', hint: 'ყოველდღიური მწუხრი და ცისკარი' },
  { id: 'doxology', label: 'დიდებამაღალიანი', hint: 'ცისკარზე დიდებამაღალიანი იგალობება' },
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

export interface Great { id: string; name: string; kind: 'lord' | 'theotokos'; trisagion?: 'baptized' | 'cross'; /** its hymns are another movable day's (ჟამნი 25) */ hymnsOf?: number }
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
  // the Monday of the Holy Spirit: Pentecost's second day, kept as the feast itself
  50: { id: 'suliwmida', name: 'სულიწმიდის დღე', kind: 'lord', trisagion: 'baptized', hymnsOf: 49 },
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
  // until the eve of the Prodigal Son's Sunday (15 days before Lent); from that Sunday to Lent — the summer order
  return md >= 115 && month < 9 && easterOffset(iso) < -63;
};

/** Lent's psalter (Typikon ch. 17 — checked with OCA's and liturgy.royaldoors.net's tables, 2026-11-18): the day's matins and
 *  hours, and the vespers of its own evening. Weeks 1–4 and 6 share one order, the 5th has its own, Holy Week Mon–Wed another. */
type LentDay = { m: number[]; h: Partial<Record<1 | 3 | 6 | 9, number>>; v: number | null };
const LENT_WEEK: LentDay[] = [
  { m: [2, 3, 17], h: {}, v: null },
  { m: [4, 5, 6], h: { 3: 7, 6: 8, 9: 9 }, v: 18 },
  { m: [10, 11, 12], h: { 1: 13, 3: 14, 6: 15, 9: 16 }, v: 18 },
  { m: [19, 20, 1], h: { 1: 2, 3: 3, 6: 4, 9: 5 }, v: 18 },
  { m: [6, 7, 8], h: { 1: 9, 3: 10, 6: 11, 9: 12 }, v: 18 },
  { m: [13, 14, 15], h: { 3: 19, 6: 20 }, v: 18 },
  { m: [16, 17], h: {}, v: 1 },
];
const LENT_FIFTH: Partial<Record<number, LentDay>> = {
  1: { m: [4, 5, 6], h: { 3: 7, 6: 8, 9: 9 }, v: 10 },
  2: { m: [11, 12, 13], h: { 1: 14, 3: 15, 6: 16, 9: 18 }, v: 19 },
  3: { m: [20, 1, 2], h: { 1: 3, 3: 4, 6: 5, 9: 6 }, v: 7 },
  // the Great Canon's Thursday: one kathisma at matins; its hours differ between the tables — left unnamed
  4: { m: [8], h: {}, v: null },
};
const HOLY_PSALTER: Record<number, LentDay> = {
  [-6]: { m: [4, 5, 6], h: { 3: 7, 6: 8 }, v: 18 },
  [-5]: { m: [9, 10, 11], h: { 3: 12, 6: 13 }, v: 18 },
  [-4]: { m: [14, 15, 16], h: { 3: 19, 6: 20 }, v: 18 },
};
export const lentPsalter = (e: number): LentDay | null => {
  if (HOLY_PSALTER[e]) return HOLY_PSALTER[e];
  if (e < -48 || e > -8) return null;
  const dow = (((e + 48) % 7) + 8) % 7; // -48 is a Monday
  if (e >= -20 && e <= -15) return LENT_FIFTH[dow] ?? LENT_WEEK[dow];
  return LENT_WEEK[dow];
};
const SUMMER_MATINS: number[][] = [[2, 3], [4, 5], [7, 8], [10, 11], [13, 14], [19, 20], [16, 17]];
const WINTER_MATINS: number[][] = [[2, 3, 17], [4, 5, 6], [7, 8, 9], [10, 11, 12], [13, 14, 15], [19, 20], [16, 17]];
const SUMMER_VESPERS: (number | null)[] = [null, 6, 9, 12, 15, 18, 1]; // by the eve's weekday (the evening's)
export const matinsKathismas = (iso: string, rank: Rank) => {
  const lent = lentPsalter(easterOffset(iso));
  const list = lent?.m ?? (winter(iso) ? WINTER_MATINS : SUMMER_MATINS)[dowOf(iso)];
  // a Lent weekday keeps its three kathismas even with a polyeleos saint; a great feast and a Sunday take two
  if (lent && dowOf(iso) !== 0 && rank !== 'great') return list;
  return atLeast(rank, 'polyeleos') ? list.slice(0, 2) : list;
};
/** the vespers' kathisma for the day `iso` (sung the evening before): a number, „first“ (only „ნეტარ არს კაცი“) or none */
export const vespersKathisma = (iso: string, rank: Rank): number | 'first' | null => {
  const eve = (dowOf(iso) + 6) % 7;
  if (eve === 6) return 1; // Saturday evening, for the Sunday
  if (eve === 0) return null; // Sunday evening
  if (rank === 'great') return 'first';
  // Lent: the evening's own kathisma (none on the Great Canon's Thursday)
  const lent = lentPsalter(easterOffset(iso) - 1);
  if (lent) return lent.v;
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

/** how a temple serves (2026-11-11, the user: „სხვა ტაძარს სჭირდება სხვანაირად … დატოვე არჩევანის საშუალება“) — each reader sets it */
export interface TempleOrder {
  /** Saturday evening and a vigil saint's eve: vespers alone (matins in the morning), vespers + matins, or the vigil with the litya */
  sat: 'apart' | 'vigil' | 'litya';
  /** a weekday's evening: vespers alone (matins in the morning before the liturgy) or vespers + matins */
  weekday: 'apart' | 'joined';
}
/** the user's own temple: vespers alone on both evenings */
export const DEFAULT_ORDER: TempleOrder = { sat: 'apart', weekday: 'apart' };
export const isOrder = (v: unknown): v is TempleOrder => {
  const o = v as TempleOrder;
  return !!o && ['apart', 'vigil', 'litya'].includes(o.sat) && ['apart', 'joined'].includes(o.weekday);
};

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

/** what the reader reads, in order — shown open on the page („საკითხავი რიგი“, 2026-11-11) */
export type Read =
  | { src: TextSrc }
  | { kathisma: number }
  | { hymns: 'vespers' | 'matins' | 'hours' | 'liturgy'; only?: 'tr' | 'ko'; prev?: boolean }
  | { say: string };

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
  /** the priest's and deacon's own part (a litany with its answers, a prayer, the dismissal): shown only with „მღვდლის ტექსტები“ on */
  priest?: boolean;
  /** the reader's text, in order */
  read?: Read[];
  /** the priest's / deacon's words here (კონდაკი) — with „მღვდლის ტექსტები“ on */
  pt?: TextSrc[];
}
export type ServiceId = 'vespers' | 'compline' | 'matins' | 'hours' | 'liturgy';
export interface Service { id: ServiceId; title: string; when: string; steps: Step[]; note?: string }

export interface DayInput {
  iso: string;
  day: CalendarDay | null;
  tone: number | null;
  rank: Rank;
  patron: Patron | null;
  order?: TempleOrder;
}

/** the troparia and kontakia in their order — as the weekly „ტიბიკონი“ of „მედავითნეთათვის“ sets them (№682, checked 2026-11-11) */
export interface Hymn {
  role: 'feast' | 'resurrection' | 'day' | 'temple' | 'saint' | 'protection' | 'departed' | 'theotokion' | 'triodion';
  label: string;
  glory?: 'glory' | 'now';
  /** a movable day's hymns: ჟამნი 25 by the distance from Pascha (utils/triodion) */
  e?: number;
  /** a fixed feast's hymns: its old-style day in ჟამნი's month „MM-DD“ (the afterfeast, 2026-11-18) */
  md?: string;
}

/** a fixed great feast's tide by the calendar's words: „…წინადღესასწაული“, „…შემდგომი დღესასწაული“, „წარგზავნა…“ */
const TIDE_FEASTS: { re: RegExp; id: string }[] = [
  { re: /ჯვრის ამაღლ|ჯვარის ამაღლ/, id: 'jvari' }, { re: /ღმრთისმშობ[ე]?ლის შობ/, id: 'mariam-shoba' }, { re: /ტაძრად მიყვან/, id: 'tadrad' },
  { re: /ქრისტე(?:ს)?შობ/, id: 'shoba' }, { re: /ნათლისღ/, id: 'natlisgeba' }, { re: /მიგებ/, id: 'migebeba' }, { re: /ხარებ/, id: 'khareba' },
  { re: /ფერისცვალ/, id: 'peristsvaleba' }, { re: /მიძინ/, id: 'mariamoba' },
];
export interface Tide { kind: 'fore' | 'after' | 'leave'; feast: Great; md: string }
export const feastTideOf = (day: CalendarDay | null): Tide | null => {
  if (!day) return null;
  for (const x of day.s) {
    const kind = /წარგზავნ/.test(x.n) ? 'leave' : /შემდგომი დღესასწაულ|დღესასწაულის შემდგომ/.test(x.n) ? 'after' : /წინადღესასწაულ/.test(x.n) ? 'fore' : null;
    if (!kind) continue;
    const f = TIDE_FEASTS.find(t => t.re.test(x.n));
    const md = f && Object.keys(GREAT_FIXED).find(k => GREAT_FIXED[k].id === f.id);
    if (md) return { kind, feast: GREAT_FIXED[md], md: oldOf(md) };
  }
  return null;
};
/** a new-style „MM-DD“ → its old-style „MM-DD“ (13 days, the lag until 2100) */
const oldOf = (md: string) => addDays(`2001-${md}`, -13).slice(5);

const PASCHA_K: Hymn = { role: 'triodion', label: 'აღდგომის კონდაკი', e: 0, glory: 'now' };

/** the troparia and kontakia in their order — as the weekly „ტიბიკონი“ of „მედავითნეთათვის“ sets them (№682, checked 2026-11-11) */
export const hymnsOf = (inp: DayInput, at: 'vespers' | 'matins' | 'hours' | 'liturgy'): { troparia: Hymn[]; kontakia: Hymn[] } => {
  const great = greatFeastOf(inp.iso);
  const e = easterOffset(inp.iso);
  if (great) {
    const own = GREAT_MOVABLE[e] ? (TRIODION[e] ? e : GREAT_MOVABLE[e].hymnsOf) : undefined; // a movable feast's hymns stand in ჟამნი 25
    const md = own === undefined ? Object.keys(GREAT_FIXED).find(k => GREAT_FIXED[k].id === great.id) : undefined;
    const fT: Hymn = { role: 'feast', label: `${great.name} — დღესასწაულის ტროპარი`, e: own, md: md && oldOf(md) };
    const fK: Hymn = { role: 'feast', label: `${great.name} — დღესასწაულის კონდაკი`, e: own, md: md && oldOf(md) };
    // the Theotokos' feast on a Sunday keeps the resurrection's hymns before its own (the Lord's feasts take the day whole)
    if (great.kind === 'theotokos' && dowOf(inp.iso) === 0) {
      const tone = inp.tone ? `, ხმა ${inp.tone}` : '';
      const resT: Hymn = { role: 'resurrection', label: `აღდგომის ტროპარი${tone}` };
      const resK: Hymn = { role: 'resurrection', label: `აღდგომის კონდაკი${tone}` };
      if (at === 'vespers' || at === 'matins') return { troparia: [resT, { ...fT, glory: 'glory' }], kontakia: [] };
      return { troparia: [resT, fT], kontakia: [resK, { ...fK, glory: 'now' }] };
    }
    // the Annunciation on a movable day with hymns of its own (Lent's Sundays and Saturdays, Holy Week): both, the day's first
    const tri = md ? movableOf(e) : null;
    if (tri?.mode === 'own') {
      const T: Hymn = { role: 'triodion', label: `${tri.day.name} — ტროპარი`, e: tri.e };
      const K: Hymn = { role: 'triodion', label: `${tri.day.name} — კონდაკი`, e: tri.e };
      return { troparia: [T, fT], kontakia: at === 'vespers' || at === 'matins' ? [] : [K, { ...fK, glory: 'now' }] };
    }
    return { troparia: [fT], kontakia: at === 'vespers' || at === 'matins' ? [] : [fK] };
  }
  const mv = movableOf(e);
  if (mv?.mode === 'own' && mv.day.kind !== 'midfeast') return ownHymns(inp, at, mv);
  const base = ordinaryHymns(inp, at);
  const tide = mv ? null : feastTideOf(inp.day);
  if (mv?.mode === 'paschal') return { troparia: base.troparia, kontakia: base.kontakia.map(h => (h.role === 'protection' ? PASCHA_K : h)) };
  if (mv || (tide && tide.kind !== 'fore')) {
    // an afterfeast: the feast's hymns first, the saint's beside them; the weekday's and the Theotokos' step aside
    const src = mv ? { role: 'triodion' as const, e: mv.e } : { role: 'feast' as const, md: tide!.md };
    const fT: Hymn = { ...src, label: mv ? `${mv.day.name} — ტროპარი` : `${tide!.feast.name} — დღესასწაულის ტროპარი` };
    const fK: Hymn = { ...src, label: mv ? `${mv.day.name} — კონდაკი` : `${tide!.feast.name} — დღესასწაულის კონდაკი` };
    // the leave-taking is the feast's day whole: the saint's hymns step aside too (ჟამნი: „ითქმის ყოველივე დღესასწაულისა“)
    const leave = tide?.kind === 'leave';
    const keep = (hs: Hymn[]) => hs.filter(h => (h.role === 'saint' && !leave) || h.role === 'temple').map(h => ({ ...h, glory: undefined }));
    const saintT = keep(base.troparia).filter(h => h.role === 'saint');
    if (at === 'vespers' || at === 'matins') return { troparia: [fT, ...saintT.map(h => ({ ...h, glory: 'glory' as const }))], kontakia: [] };
    if (at === 'hours') return { troparia: [fT, ...saintT.map(h => ({ ...h, glory: 'glory' as const }))], kontakia: [fK] };
    const ks = keep(base.kontakia);
    return { troparia: [fT, ...keep(base.troparia)], kontakia: [...ks.map((h, i) => (i === ks.length - 1 ? { ...h, glory: 'glory' as const } : h)), { ...fK, glory: 'now' }] };
  }
  return base;
};

/** a movable day with hymns of its own (utils/triodion): Lent's and the Pentecostarion's Sundays, Saturdays, Holy Week */
const ownHymns = (inp: DayInput, at: 'vespers' | 'matins' | 'hours' | 'liturgy', mv: Movable): { troparia: Hymn[]; kontakia: Hymn[] } => {
  const d = mv.day;
  const e = easterOffset(inp.iso);
  const p = inp.patron;
  const templeToday = !!p && patronDay(p, inp.iso) === inp.iso;
  const temple = p && !templeToday ? p : null;
  const tone = inp.tone ? `, ხმა ${inp.tone}` : '';
  const T: Hymn = { role: 'triodion', label: `${d.name} — ტროპარი`, e: mv.e };
  const K: Hymn = { role: 'triodion', label: `${d.name} — კონდაკი`, e: mv.e };
  const resT: Hymn = { role: 'resurrection', label: `აღდგომის ტროპარი${tone}` };
  const resK: Hymn = { role: 'resurrection', label: `აღდგომის კონდაკი${tone}` };
  const saintT: Hymn = { role: 'saint', label: 'დღის წმიდანის ტროპარი' };
  const saintK: Hymn = { role: 'saint', label: 'დღის წმიდანის კონდაკი' };
  const templeT: Hymn | null = temple ? { role: 'temple', label: `ტაძრის ტროპარი — ${temple.name}` } : null;
  const templeK: Hymn | null = temple ? { role: 'temple', label: `ტაძრის კონდაკი — ${temple.name}` } : null;
  const theotokion: Hymn = { role: 'theotokion', label: 'ღვთისმშობლისა — აღდგომის განსატევებელი, ტროპარის ხმაზე', glory: 'now' };
  const G = (h: Hymn): Hymn => ({ ...h, glory: 'glory' });
  const N = (h: Hymn): Hymn => ({ ...h, glory: 'now' });
  const list = (...xs: (Hymn | null | false | undefined)[]) => xs.filter(Boolean) as Hymn[];
  const evening = at === 'vespers' || at === 'matins';
  // Holy Week, Lazarus, Pascha and the Saturdays of the departed: the day's own hymns alone
  if (d.kind === 'holy' || d.kind === 'lazarus' || d.kind === 'pascha' || d.kind === 'departed') return { troparia: [T], kontakia: evening ? [] : [K] };
  if (d.kind === 'saint' || d.kind === 'saturday' || d.kind === 'feast') {
    if (evening) return { troparia: [T, G(saintT)], kontakia: [] };
    if (at === 'hours') return { troparia: [T, G(saintT)], kontakia: [K] };
    return { troparia: list(T, templeT, saintT), kontakia: list(K, templeK, G(saintK)) };
  }
  // a Sunday: in Lent its saint steps aside (to compline); Thomas' Sunday has no resurrection hymns; the Pentecostarion's
  // Sundays sing their own kontakion and end with Pascha's
  const lent = e >= -48 && e < 0;
  const thomas = e === 7;
  const dayT = d.tr ? T : null;
  if (evening) return { troparia: list(!thomas && resT, dayT ? G(dayT) : !lent && G(saintT), N(theotokion)), kontakia: [] };
  if (at === 'hours') return { troparia: list(!thomas && resT, dayT ? G(dayT) : !lent && G(saintT)), kontakia: [K] };
  if (e > 0) return { troparia: list(!thomas && resT, dayT, templeT, !lent && saintT), kontakia: list(K, templeK, G(saintK), !thomas && PASCHA_K) };
  return { troparia: list(resT, dayT, templeT, !lent && saintT), kontakia: list(resK, templeK, !lent && G(saintK), N(K)) };
};

/** an ordinary day's troparia and kontakia (the Octoechos' part of the year, Lent's weekdays) */
const ordinaryHymns = (inp: DayInput, at: 'vespers' | 'matins' | 'hours' | 'liturgy'): { troparia: Hymn[]; kontakia: Hymn[] } => {
  const dow = dowOf(inp.iso);
  const sunday = dow === 0;
  const p = inp.patron;
  const templeToday = !!p && patronDay(p, inp.iso) === inp.iso;
  const toneTxt = inp.tone ? `, ხმა ${inp.tone}` : '';
  const who = templeToday ? `ტაძრის წმიდანის (${p!.name})` : 'დღის წმიდანის';
  const saintT: Hymn = { role: 'saint', label: `${who} ტროპარი` };
  const saintK: Hymn = { role: 'saint', label: `${who} კონდაკი` };
  const resT: Hymn = { role: 'resurrection', label: `აღდგომის ტროპარი${toneTxt}` };
  const resK: Hymn = { role: 'resurrection', label: `აღდგომის კონდაკი${toneTxt}` };
  const dayT: Hymn = { role: 'day', label: `${WEEKDAY_GEN[dow]} ტროპარი (${DAY_THEME[dow]})` };
  const dayK: Hymn = { role: 'day', label: `${WEEKDAY_GEN[dow]} კონდაკი` };
  const G = (h: Hymn): Hymn => ({ ...h, glory: 'glory' });
  const N = (h: Hymn): Hymn => ({ ...h, glory: 'now' });
  if (at === 'vespers' || at === 'matins') {
    const theotokion: Hymn = { role: 'theotokion', label: sunday || atLeast(inp.rank, 'doxology') ? 'ღვთისმშობლისა — აღდგომის განსატევებელი, ტროპარის ხმაზე' : 'ღვთისმშობლისა — შვიდეულის დღისა, ტროპარის ხმაზე', glory: 'now' };
    return { troparia: sunday ? [resT, G(saintT), theotokion] : [saintT, theotokion], kontakia: [] };
  }
  // the hours: the saint's own; on Sunday the resurrection's, „დიდება“ the saint's, and only the resurrection's kontakion
  if (at === 'hours') return sunday ? { troparia: [resT, G(saintT)], kontakia: [resK] } : { troparia: [saintT], kontakia: [saintK] };
  // the liturgy, after the small entrance
  const temple = p && !templeToday ? p : null;
  const high = temple && temple.kind !== 'saint'; // the Lord's or the Theotokos' temple
  const templeT: Hymn | null = temple ? { role: 'temple', label: `ტაძრის ტროპარი — ${temple.name}` } : null;
  const templeK: Hymn | null = temple ? { role: 'temple', label: `ტაძრის კონდაკი — ${temple.name}` } : null;
  const protect: Hymn = { role: 'protection', label: '„სასოო და შესავედრებელო ქრისტიანეთაო“ — ღვთისმშობლისა' };
  const departed: Hymn = { role: 'departed', label: '„წმიდათა თანა განუსვენე“' };
  const list = (...xs: (Hymn | null | false | undefined)[]) => xs.filter(Boolean) as Hymn[];
  if (sunday) {
    if (temple?.kind === 'lord') return { troparia: [resT, saintT], kontakia: [G(saintK), N(resK)] };
    if (temple?.kind === 'theotokos') return { troparia: [resT, templeT!, saintT], kontakia: [resK, G(saintK), N(templeK!)] };
    return { troparia: list(resT, templeT, saintT), kontakia: list(resK, templeK, G(saintK), N(protect)) };
  }
  // a saint with the great doxology or higher (and the temple's own day) leaves the weekday's hymns out
  if (templeToday || atLeast(inp.rank, 'doxology')) {
    if (high) return { troparia: [templeT!, saintT], kontakia: [G(saintK), N(templeK!)] };
    const own = atLeast(inp.rank, 'vigil'); // a vigil saint in a saint's temple: only his
    return { troparia: list(!own && templeT, saintT), kontakia: list(!own && templeK, G(saintK), N(protect)) };
  }
  if (dow === 6) return { troparia: list(high && templeT, dayT, saintT), kontakia: [saintK, G(departed), N(dayK)] };
  return high
    ? { troparia: [templeT!, dayT, saintT], kontakia: [templeK!, dayK, saintK, G(departed), N(protect)] }
    : { troparia: list(dayT, templeT, saintT), kontakia: list(dayK, templeK, saintK, G(departed), N(protect)) };
};

const BOOK = {
  vespers: { coll: 'jamni', n: 10, label: 'ჟამნი · მწუხრი' },
  matins: { coll: 'jamni', n: 4, label: 'ჟამნი · ცისკარი' },
  hour1: { coll: 'jamni', n: 5, label: 'ჟამნი · პირველი ჟამი' },
  hour3: { coll: 'jamni', n: 6, label: 'ჟამნი · მესამე ჟამი' },
  hour6: { coll: 'jamni', n: 7, label: 'ჟამნი · მეექვსე ჟამი' },
  hour9: { coll: 'jamni', n: 9, label: 'ჟამნი · მეცხრე ჟამი' },
  typika: { coll: 'jamni', n: 8, label: 'ჟამნი · სადილის ჟამი' },
  sunVespers: { coll: 'mgalobeltatvis', n: 2, label: 'მგალობელთათვის · დიდი მწუხრი' },
  sunMatins: { coll: 'mgalobeltatvis', n: 3, label: 'მგალობელთათვის · დიდი ცისკარი' },
  sunLiturgy: { coll: 'mgalobeltatvis', n: 1, label: 'მგალობელთათვის · კვირის ლიტურგია' },
  liturgy: { coll: 'mgalobeltatvis', n: 4, label: 'მგალობელთათვის · ლიტურგია (სადაგი)' },
  dayVespers: { coll: 'mgalobeltatvis', n: 5, label: 'მგალობელთათვის · მწუხრი (სადაგი)' },
  dayMatins: { coll: 'mgalobeltatvis', n: 6, label: 'მგალობელთათვის · ცისკარი (სადაგი)' },
  priestLiturgy: { coll: 'kondaki', n: 4, label: 'კონდაკი · ლიტურგია' },
};
const book = (b: { coll: string; n: number; label: string }, part?: number): Extra => ({ kind: 'book', ...b, part });
const text = (src: TextSrc | null, label?: string): Extra | null => (src ? { kind: 'text', src, label: label ?? src.label } : null);
const some = (...xs: (Extra | null | false | undefined)[]) => xs.filter(Boolean) as Extra[];
const R = (src: TextSrc): Read => ({ src });
/** a part of the priest and the deacon (with the choir's answers) */
const P = (title: string, pt?: TextSrc[], more?: Partial<Step>): Step => ({ title, who: ['deacon', 'priest', 'choir'], priest: true, pt, ...more });
const AMEN = 'ამინ.';

/** an hour as the reader reads it: psalms, troparion, the Theotokos', the Trisagion, kontakion, the hour's prayer */
const hourRead = (n: number, first: boolean, prev = false, kathisma?: number): Read[] => [
  ...(first ? [R(FIX.opening), R(FIX.twelve)] : [R(FIX.come)]),
  R(FIX.hourPsalms(n)),
  // Lent: the hour's kathisma after its psalms
  ...(kathisma ? [{ kathisma } as Read] : []),
  { hymns: 'hours', only: 'tr', prev },
  R(FIX.hourTheotokion(n)),
  R(FIX.trisagion),
  { hymns: 'hours', only: 'ko', prev },
  R(FIX.hourEnd(n)),
];

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
    // Lent's Wednesdays and Fridays, and Holy Week's Monday–Wednesday
    presanctified: (e >= -48 && e <= -9 && (dow === 3 || dow === 5)) || (e >= -6 && e <= -4),
    holyWeek: e >= -6 && e <= -1,
    basil: [-42, -35, -28, -21, -14, -3, -1].includes(e) || iso.slice(5) === '01-14'
      // the eves of Christmas and Theophany on a weekday; when an eve falls on Saturday or Sunday, on the feast itself
      || ((iso.slice(5) === '01-06' || iso.slice(5) === '01-18') && dow >= 1 && dow <= 5)
      || ((iso.slice(5) === '01-07' || iso.slice(5) === '01-19') && (dow === 0 || dow === 1)),
    /** the eves of Christmas and Theophany (the Royal Hours; on Saturday or Sunday they move to the Friday before) */
    paramony: iso.slice(5) === '01-06' || iso.slice(5) === '01-18',
    /** the Friday that takes the Royal Hours of an eve falling on Saturday or Sunday */
    royalFriday: dow === 5 && ['01-04', '01-05', '01-16', '01-17'].includes(iso.slice(5)),
    bright: e >= 0 && e <= 6,
    paschal: e >= 0 && e <= 38,
    psalm136: [-63, -56, -49].includes(e),
    repentance: dow === 0 && e >= -70 && e <= -14,
    /** Great Compline the evening before (Lent's Monday–Thursday evenings), St Andrew's canon in its first week */
    compline: complineEve(e, dow),
    andrew: andrewPart(e),
    /** the Great Canon at matins (5th week's Thursday, sung on Wednesday evening), the Akathist (5th Saturday, Friday evening) */
    greatCanon: e === -17,
    akathist: e === -15,
    /** Lent's Sunday evenings: the great prokeimenon; the first of them — the vespers of forgiveness */
    lentSundayEve: lentSundayEvening(e, dow),
    forgiveness: e === -48,
    departed: TRIODION[e]?.kind === 'departed',
    lazarus: e === -8,
    kneeling: e === 50,
  };
};

export const buildServices = (inp: DayInput): Service[] => {
  const { iso, day, tone, rank } = inp;
  const order = inp.order ?? DEFAULT_ORDER;
  const dow = dowOf(iso);
  const sunday = dow === 0;
  const great = greatFeastOf(iso);
  const season = seasonOf(iso);
  /** a Lent weekday kept as such — the Annunciation takes its day whole */
  const lentDay = season.lentWeekday && !great;
  if (season.bright) return brightWeek(inp, season.e);
  if (season.holyWeek) return holyWeek(inp, season.e);
  const vigilDay = atLeast(rank, 'vigil'); // Sunday, a vigil saint, a great feast
  const big = atLeast(rank, 'polyeleos');
  const dox = atLeast(rank, 'doxology');
  const festal = big || sunday; // the great vespers, with the entrance
  /** vespers and matins served together in the evening */
  // Christmas' and Theophany's vigil is Great Compline with matins whatever the temple's custom
  const joined = iso.slice(5) === '01-07' || iso.slice(5) === '01-19' || (vigilDay ? order.sat !== 'apart' : order.weekday === 'joined');
  const litya = vigilDay && order.sat === 'litya';
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
  const lentText = season.e >= -70 && season.e < 0 ? text({ coll: 'jamni', n: 25, part: 0, label: 'ჟამნი · მარხვანი' }, 'ტროპარ-კონდაკი — ჟამნი · მარხვანი') : null;
  const own = ownServicesOf(iso);
  const ownBooks = own.map(b => xbook(b.n, `საკუთარი განგება — ${b.t}`));
  /** the extra books for Lent's Saturdays (the school's PDFs, „დამატებითი წიგნები“) */
  const lentSat = [-36, -29, -22].includes(season.e) ? xbook(23, 'განგება — დიდი მარხვის შაბათები') : season.akathist ? xbook(24, 'განგება — დაუჯდომლის შაბათი') : null;
  const christIsRisen = season.paschal;
  const V = PRIEST.vespers, M = PRIEST.matins, L = PRIEST.liturgy;

  // ----- vespers -----
  /** the evening is a Lent weekday's (or a Lent Sunday's): its vespers are the Triodion's and end in Lent's way */
  const lentEve = !great && ((season.e - 1 >= -48 && season.e - 1 <= -9 && eveDow >= 1 && eveDow <= 5) || season.lentSundayEve);
  const k = vespersKathisma(iso, rank);
  const psDay = lentPsalter(season.e), psEve = lentPsalter(season.e - 1);
  const v: Step[] = [];
  v.push(P('„კურთხეულ არს ღმერთი ჩვენი“', [V.begin], { who: ['priest'], hint: vigilDay && joined ? 'ღამისთევაზე: „აღსდეგით!“ და „დიდება წმიდასა“ — „მოვედით, თაყვანის-ვსცეთ“' : undefined }));
  if (christIsRisen) v.push({ title: '„ქრისტე აღდგა“ — სამგზის', who: ['priest', 'choir'], note: 'აღდგომის წარგზავნამდე მსახურება ასე იწყება' });
  if (!(vigilDay && joined)) v.push({ title: 'მეცხრე ჟამი', who: ['reader'], note: 'ტროპარი და კონდაკი — წინა დღის წმიდანისა', hint: 'მღვდლის „კურთხეულ არს“-ის შემდეგ იწყებ', read: hourRead(9, true, true, psEve?.h[9]), extras: [book(BOOK.hour9)] });
  v.push(festal
    ? { title: '„მოვედით, თაყვანის-ვსცეთ“ და ფსალმუნი 103', who: ['choir'], note: 'დიდ მწუხრზე იგალობება', extras: some(text(FIX.ps103), book(sunday ? BOOK.sunVespers : BOOK.dayVespers)), chants: ['mw-2', 'mw-3'] }
    : { title: '„მოვედით, თაყვანის-ვსცეთ“ და ფსალმუნი 103', who: ['reader'], note: 'იკითხება', read: [R(FIX.come), R(FIX.ps103), { say: 'დიდება მამასა და ძესა და წმიდასა სულსა, აწ და მარადის და უკუნითი უკუნისამდე, ამინ. ალილუია, ალილუია, ალილუია, დიდება შენდა, ღმერთო (სამგზის).' }], chants: ['mw-2', 'mw-3'] });
  v.push(P('დიდი კვერექსი', [V.great], { hint: 'ამ დროს მღვდელი საიდუმლოდ კითხულობს სანთლის ლოცვებს', chants: ['mw-4'] }));
  if (k === 'first') v.push({ title: '„ნეტარ არს კაცი“ — კანონი 1-ის პირველი დიდება', who: ['choir'], note: 'დღესასწაულის წინა საღამოს — იგალობება', extras: [{ kind: 'kathisma', n: 1 }], chants: ['mw-5'] });
  else if (k === 1) v.push({ title: 'დავითნის კანონი 1 — „ნეტარ არს კაცი“', who: ['choir', 'reader'], note: 'შაბათ საღამოს — მთელი კანონი', read: [{ kathisma: 1 }], chants: ['mw-5'] });
  else if (k) v.push({ title: `დავითნის კანონი ${k}`, who: ['reader'], note: lentEve ? 'მარხვის განრიგით' : undefined, hint: 'თუ წინა დღეს ღამისთევა იყო, კანონი არ იკითხება', read: [{ kathisma: k }] });
  if (k) v.push(P('მცირე კვერექსი', [V.small], { chants: ['mw-6'] }));
  if (season.kneeling) v.push({ title: 'მუხლმოდრეკის ლოცვები', who: ['priest'], note: 'სულთმოფენობის საღამოს — სამი ლოცვა მუხლმოდრეკით' });
  v.push({
    title: '„უფალო, ღაღად-ვყავ“ და დასდებელნი', who: ['choir'],
    note: great ? 'დღესასწაულის დასდებელნი' : zatiki ? 'ზატიკის დასდებელნი' : lentEve ? 'მარხვანისა (ბეჭდურ ტრიოდიონშია — აპში ჯერ არ არის) და წმიდანისა' : sunday ? `${toneTxt} · 10 მუხლად: აღდგომისანი და წმიდანისა` : dox ? '6 მუხლად — წმიდანისა' : `${toneTxt} · 6 მუხლად: 3 პარაკლიტონისა, 3 წმიდანისა`,
    hint: sunday ? '„დიდება“ — წმიდანისა · „აწდა“ — კვირის ხმის დოგმატიკონი' : dox ? '„დიდება“ — წმიდანისა · „აწდა“ — დოგმატიკონი „დიდების“ ხმაზე' : '„დიდება“ — წმიდანისა · „აწდა“ — ღვთისმშობლისა, შვიდეულის დღისა („დიდების“ ხმაზე)',
    extras: some(
      text(FIX.lordICry, 'ფსალმუნები და მუხლები — ჟამნი'),
      ...ownBooks, lentSat,
      !great && text(zatiki, `ტექსტი — ${zatiki?.label}`),
      !great && !zatiki && !lentEve && (sunday || !dox) && text(octoechos(tone, eveDow, 'stichera'), `დასდებელნი — პარაკლიტონი`),
      !great && lentEve && lentText,
      !great && !zatiki && text(menaion(kind, 'stichera'), 'დასდებელნი — წმიდანისა (საზიარო)'),
    ),
    chants: ['mw-7', 'mw-8', ...(sunday ? ['mw-10'] : ['mw-9'])], toned: true,
  });
  if (festal || season.presanctified) v.push(P('შესვლა საცეცხლურით — „სიბრძნით აღემართენით“', [V.entrance], { who: ['priest', 'deacon'] }));
  v.push(festal
    ? { title: '„ნათელო მხიარულო“', who: ['choir'], extras: some(text(FIX.gladLight)), chants: ['mw-12'] }
    : { title: '„ნათელო მხიარულო“', who: ['reader'], note: 'იკითხება', read: [R(FIX.gladLight)], chants: ['mw-12'] });
  if (season.lentSundayEve) v.push({ title: 'დიდი წარდგომა', who: ['deacon', 'choir'], note: 'მარხვის კვირა საღამოს — დიდი წარდგომა, ხმა 8', hint: 'მუხლებით; ამ დღიდან მწუხრი მარხვის წესით მთავრდება — „ღირს მყვენ“ იკითხება, მერე ეფრემ ასურის ლოცვა', pt: [V.prokeimenon], extras: some(text({ coll: 'jamni', n: 25, part: 0, after: season.forgiveness ? /^კვირიაკესა ყველიერისასა/ : /^პირველსა კვირიაკესა წმიდათა მარხვათასა/, find: /წარდგომა დიდი/, until: /^(ხოლო წარდგომანი|უწყებულ|პირველსა შაბათსა|კვირიაკესა მეორესა)/, label: 'დიდი წარდგომა — ჟამნი' })), chants: ['mw-13'] });
  else if (lentEve) v.push({ title: 'წარდგომა, დაბადება, წარდგომა, იგავნი', who: ['deacon', 'choir', 'reader'], note: 'მარხვის მწუხრი — ორი წარდგომა ტრიოდიონიდან, შუაში დაბადების, ბოლოს იგავთა საკითხავი', hint: 'საკითხავები — წინა დღის კალენდარში (მწუხრ.)', pt: [V.prokeimenon] });
  else v.push({ title: 'წარდგომა', who: ['deacon', 'choir'], note: season.kneeling ? 'დიდი წარდგომა — „ვინ არს ღმერთი დიდ“' : `${WEEKDAY_GEN[eveDow]} საღამოსი — ${VESPERS_PROKEIMENON[eveDow]}`, pt: [V.prokeimenon], extras: some(!season.kneeling && text(FIX.eveProkeimenon(eveDow), 'წარდგომა და მუხლები')), chants: ['mw-13'] });
  if (vespersText) v.push({ title: 'საწინასწარმეტყველო საკითხავები', who: ['reader'], note: vespersText, extras: some(big && text(menaion(kind, 'readings'), 'ტექსტი — საზიარო საკითხავები')) });
  if (festal) v.push(P('მრჩობლი კვერექსი', [V.augmented], { chants: ['mw-15'] }));
  v.push({ title: '„ღირს მყვენ ჩვენ, უფალო“', who: ['reader'], note: 'იკითხება', read: [R(FIX.vouchsafe)] });
  v.push(P('თხოვნითი კვერექსი', [V.supplication], { chants: ['mw-16'] }));
  if (litya) v.push({ title: 'ლიტია', who: ['choir', 'priest', 'deacon'], note: 'ტაძრის წმიდანისა და დღისა დასდებელნი', pt: [V.litya], extras: some(!sunday && text(menaion(kind, 'litya'), 'ტექსტი — ლიტიისა (საზიარო)')) });
  v.push({
    title: 'სტიქარონსა ზედა დასდებელნი', who: ['choir'],
    note: great ? 'დღესასწაულისანი' : sunday ? `${toneTxt} · აღდგომისანი` : dox ? 'წმიდანისანი — თავისი ჩასართავებით' : lentEve ? 'მარხვანისა' : `${toneTxt} · პარაკლიტონისანი`,
    hint: sunday ? '„დიდება“ — წმიდანისა · „აწდა“ — ღვთისმშობლისა' : dox ? undefined : 'ჩასართავი მუხლები — ჟამნიდან: „შენდამი აღვიხილენ“, „მიწყალენ ჩვენ, უფალო“',
    extras: great || zatiki ? undefined : some(
      !sunday && !dox && text(FIX.eveVerses, 'ჩასართავი მუხლები — ჟამნი'),
      sunday || !dox ? text(octoechos(tone, eveDow, 'aposticha'), 'დასდებელნი — პარაკლიტონი') : text(menaion(kind, 'aposticha'), 'დასდებელნი — წმიდანისა (საზიარო)'),
    ),
    chants: sunday ? ['mw-a12-160'] : undefined, toned: true,
  });
  v.push({ title: '„აწ განუტევე“ და სამწმიდაო', who: ['reader'], hint: '„მამაო ჩვენოს“ შემდეგ მღვდელი: „რამეთუ შენი არს სუფევა“ — შენ: „ამინ“', read: [R(FIX.nunc), R(FIX.trisagion)], chants: ['mw-19'] });
  if (vigilDay && joined) v.push({ title: sunday ? '„ღვთისმშობელო ქალწულო, გიხაროდენ“ — სამგზის' : 'ტროპარი', who: ['choir'], note: sunday ? undefined : great ? 'დღესასწაულის ტროპარი სამგზის' : 'წმიდანის ტროპარი ორგზის, „ღვთისმშობელო ქალწულო“ ერთგზის', extras: sunday ? undefined : [{ kind: 'troparia', at: 'vespers' }], chants: ['mw-20'] });
  else if (festal) v.push({ title: 'ტროპარნი', who: ['choir'], note: sunday ? `აღდგომის ტროპარი (${toneTxt}) · „დიდება“ — წმიდანისა · „აწდა“ — ღვთისმშობლისა` : undefined, extras: [{ kind: 'troparia', at: 'vespers' }], toned: sunday });
  else v.push({ title: 'ტროპარნი', who: ['reader'], note: lentEve ? '„ღვთისმშობელო ქალწულო“ და სხვანი — მარხვის წესით' : 'წმიდანის ტროპარი · „დიდება… აწდა“ — ღვთისმშობლისა', read: [{ hymns: 'vespers' }] });
  if (lentEve) v.push({ title: 'ეფრემ ასურის ლოცვა', who: ['priest'], note: '„უფალო და მეუფეო ცხოვრებისა ჩემისაო“ — მეტანიებით', extras: [{ kind: 'prayer', id: 'efrem-asuri', label: 'ეფრემ ასურის ლოცვა' }] });
  if (!festal) v.push(P('მრჩობლი კვერექსი', [M.augmented], { chants: ['mw-15'] }));
  if (litya) v.push(P('ხუთი პურის კურთხევა', [V.bread, V.blessing], { who: ['priest', 'choir'], hint: '„იყავნ სახელი უფლისა“ (სამგზის) და ფსალმუნი 33 — „ვაკურთხო უფალი“', extras: some(text(FIX.typikaEnd)) }));
  if (joined) v.push({ title: 'ცისკარი იწყება', who: ['reader'], note: 'განტევება არ ითქმის — მწუხრს ცისკარი მოსდევს, ექვსფსალმუნებიდან', hint: 'გადადი ჩანართზე „ცისკარი“' });
  else v.push(P('განტევება', [M.dismissal], { who: ['priest', 'choir'], hint: '„სიბრძნით“ — „გვაკურთხენ“ · „უპატიოსნესსა“ · „დიდება, აწდა. უფალო, შეგვიწყალენ (3). გვაკურთხენ“', chants: ['mw-21'] }));
  if (season.forgiveness) v.push({ title: 'მიტევების წესი', who: ['priest', 'reader', 'choir'], note: 'მწუხრის შემდეგ ყველანი ერთმანეთს შენდობას სთხოვენ', hint: '„შემინდე მე, ცოდვილსა“ — „ღმერთმან შეგინდოს“ · ამ დროს იგალობება აღდგომის დასდებელნი' });
  if (season.departed) v.push({ title: 'პარასტასი — დიდი პანაშვიდი', who: ['priest', 'choir', 'reader'], note: 'მიცვალებულთა შაბათის წინა საღამოს, მწუხრის შემდეგ', extras: [book({ coll: 'kurtxevani', n: 16, label: 'კურთხევანი · დიდი პანაშვიდი' })] });

  // ----- matins -----
  const m: Step[] = [];
  if (!joined) {
    m.push(P('„კურთხეულ არს ღმერთი ჩვენი“', [M.begin], { who: ['priest'] }));
    m.push({ title: 'ფსალმუნები 19 და 20', who: ['reader'], hint: 'ამ დროს მღვდელი ტაძარს აკმევს', read: [{ say: AMEN }, R(FIX.come), R(FIX.royal), { say: 'დიდება მამასა და ძესა და წმიდასა სულსა, აწ და მარადის და უკუნითი უკუნისამდე, ამინ.' }, R(FIX.trisagion), R(FIX.royalTroparia)], extras: [book(sunday ? BOOK.sunMatins : BOOK.dayMatins)] });
    m.push(P('მოკლე მრჩობლი კვერექსი', [M.short, M.glory], { hint: 'ბოლოს: „სახელითა უფლისათა გვაკურთხენ, მამაო“ — მღვდელი: „დიდება წმიდასა…“' }));
  }
  if (christIsRisen && !joined) m.push({ title: '„ქრისტე აღდგა“ — სამგზის', who: ['priest', 'choir'] });
  m.push({ title: 'ექვსფსალმუნება', who: ['reader'], note: 'ფს. 3, 37, 62, 87, 102, 142', hint: 'კრძალვით, აუჩქარებლად — ტაძარში ჩუმად ისმენენ; მღვდელი ამ დროს ცისკრის ლოცვებს კითხულობს', read: [{ say: AMEN }, R(FIX.sixPsalms)] });
  m.push(P('დიდი კვერექსი', [M.great], { chants: ['ck-2'] }));
  if (lentDay) m.push({ title: '„ალილუია“ და სამების საგალობლები', who: ['choir', 'reader'], note: '„ღმერთი უფალის“ ნაცვლად — მარხვის დღეებში', extras: some(lentText) });
  else m.push({
    title: '„ღმერთი უფალი“ და ტროპარნი', who: ['choir'],
    note: great ? 'დღესასწაულის ტროპარი — სამგზის' : sunday ? `აღდგომის ტროპარი (${toneTxt}) ორგზის · „დიდება“ — წმიდანისა · „აწდა“ — ღვთისმშობლისა` : 'წმიდანის ტროპარი ორგზის · „დიდება… აწდა“ — ღვთისმშობლისა',
    hint: '„ღმერთი უფალი“ ტროპარის ხმაზე იგალობება', pt: [M.godIsLord], extras: [{ kind: 'troparia', at: 'matins' }], chants: sunday ? ['ck-3', 'ck-4', 'ck-v9-79'] : ['ck-3', 'ck-a10-133'], toned: sunday,
  });
  const mk = matinsKathismas(iso, rank);
  // the small litany after a kathisma: none on a plain day; with the great doxology — after the first two; on Saturday, Sunday and feasts — after each
  const litanyAfter = (i: number) => (big || sunday || dow === 6 ? true : dox ? i < 2 && i < mk.length - 1 : false);
  const sedalens = great || zatiki || lentDay ? null : sunday ? text(octoechos(tone, 6, 'sedalens'), 'წარდგომანი — პარაკლიტონი') : text(octoechos(tone, eveDow, 'sedalens'), 'წარდგომანი — პარაკლიტონი');
  const saintSedalens = !great && !zatiki && dox && !sunday ? text(menaion(kind, 'sedalens'), 'წარდგომანი — წმიდანისა (საზიარო)') : null;
  mk.forEach((n, i) => {
    m.push({ title: `დავითნის კანონი ${n}`, who: ['reader'], read: [{ kathisma: n }] });
    if (litanyAfter(i)) m.push(P('მცირე კვერექსი', [M.small]));
    m.push({
      title: `წარდგომა ${i + 1} სტიქოლოგიის შემდეგ`, who: ['choir', 'reader'],
      note: great ? 'დღესასწაულისა' : lentDay ? 'ტრიოდიონისა (ბეჭდურ ტრიოდიონშია — აპში ჯერ არ არის)' : sunday ? `${toneTxt} · პარაკლიტონიდან` : dox && (big || i < 2) ? 'წმიდანისა' : `${toneTxt} · პარაკლიტონიდან`,
      extras: i === 0 ? some(saintSedalens, sedalens) : undefined,
    });
  });
  if (big) {
    m.push({ title: 'პოლიელეოსი — „აქებდით სახელსა უფლისასა“', who: ['choir'], hint: season.psalm136 ? 'ფს. 134, 135 და ფს. 136 — „მდინარეთა ზედა ბაბილოვნისათა“' : 'ფს. 134, 135', chants: season.psalm136 ? ['ck-6', 'ck-7'] : ['ck-6'] });
    if (sunday) m.push({ title: '„კურთხეულ ხარ შენ, უფალო“ — „გუნდნი ანგელოზთანი“', who: ['choir'], hint: 'აღდგომის ტროპარნი, ხმა 5', chants: ['ck-9'] });
    else if (!great) m.push({ title: '„გადიდებთ“ — წმიდანისა', who: ['choir'], hint: 'ფსალმუნთაგან გამოკრებილი მუხლებით' });
    m.push(P('მცირე კვერექსი', [M.small]));
  }
  if (sunday && !great) m.push({ title: 'იპაკოი და აღსავალნი (ანტიფონები)', who: ['choir', 'reader'], note: toneTxt, extras: some(!zatiki && text(octoechos(tone, 6, 'antiphons'), 'ტექსტი — პარაკლიტონი')), chants: ['ck-a11-40', 'ck-11'], toned: true });
  if (big) {
    m.push({
      title: 'საცისკრო წარდგომა და სახარება', who: ['deacon', 'priest', 'choir'],
      note: matinsGospel.length ? matinsGospel.map(r => `${r.name} ${r.ref}`).join(' · ') : undefined,
      hint: '„ყოველი სული აქებდით უფალსა“ · სახარების წინ და შემდეგ: „დიდება შენდა, უფალო, დიდება შენდა“',
      pt: [M.gospel],
      extras: some(matinsGospel.length > 0 && { kind: 'readings', items: matinsGospel }, sunday && !zatiki ? text(octoechos(tone, 6, 'prokeimenon'), 'წარდგომა — პარაკლიტონი') : text(saintProkeimenon(kind))),
      chants: ['ck-14', 'ck-a10-197'], toned: sunday,
    });
    if (sunday) m.push({ title: '„აღდგომა ქრისტესი ვიხილეთ“', who: ['choir', 'reader'], chants: ['ck-19'] });
  }
  m.push({
    title: 'ფსალმუნი 50', who: ['reader'],
    note: season.repentance ? 'შემდეგ — „სინანულისა კარნი განმიღე“ (ტრიოდიდან)' : undefined,
    hint: big ? (sunday ? 'შემდეგ გუნდი: „დიდება“ — „მოციქულთა ვედრებითა“ · „აწდა“ — „ღვთისმშობლის მეოხებითა“ · „აღდგა რა იესო“' : 'შემდეგ გუნდი: „დიდება“ — „მეოხებითა წმიდისა…“ · „აწდა“ — „ღვთისმშობლის მეოხებითა“ და წმიდანის გერი') : undefined,
    read: [R(FIX.ps50)],
  });
  if (big) m.push(P('„აცხოვნე, ღმერთო, ერი შენი“', undefined, { who: ['deacon', 'choir'], hint: 'გუნდი: „უფალო, შეგვიწყალენ“ — 12-გზის' }));
  m.push({
    title: 'კანონი (9 გალობა)', who: ['choir', 'reader'],
    note: great ? 'დღესასწაულის კანონი' : zatiki ? 'ზატიკის კანონი' : season.greatCanon ? 'ანდრია კრიტელის დიდი კანონი — სრულად, მარიამ მეგვიპტელის ცხოვრების კითხვით' : season.akathist ? 'ღვთისმშობლის დაუჯდომელი — ოთხ ნაწილად, კანონთან ერთად' : lentDay ? 'ტრიოდისა (ბეჭდურ ტრიოდიონშია — აპში ჯერ არ არის) და წმიდანისა' : sunday ? `${toneTxt}: აღდგომისა (4), ჯვარაღდგომისა (3), ღვთისმშობლისა (3) და წმიდანისა (4)` : big ? 'ღვთისმშობლისა (6) და წმიდანისა (8)' : dox ? `პარაკლიტონის ორი კანონი (4 + 4) და წმიდანისა (6)` : `პარაკლიტონის ორი კანონი (6 + 4) და წმიდანისა (4)`,
    hint: `${dox || sunday ? 'კატავასია — „აღაღე პირი ჩემი“, ყოველი გალობის შემდეგ' : 'კატავასია — მხოლოდ მე-3, მე-6, მე-8 და მე-9 გალობის შემდეგ (ბოლო კანონის ძლისპირი)'} · მე-3-ის შემდეგ — მცირე კვერექსი და წარდგომა · მე-6-ის შემდეგ — მცირე კვერექსი, კონდაკი და იკოსი`,
    extras: great ? undefined : some(
      ...ownBooks, lentSat,
      ...(season.greatCanon ? [1, 2, 3, 4].map(n => text({ coll: 'kriteli', n, part: 0, label: 'ანდრია კრიტელი' }, `დიდი კანონი — ${['', 'ორშაბათისა', 'სამშაბათისა', 'ოთხშაბათისა', 'ხუთშაბათისა'][n]} ნაწილი`)) : []),
      text(zatiki, `ტექსტი — ${zatiki?.label}`),
      !zatiki && !lentDay && !(big && !sunday) && text(octoechos(tone, sunday ? 6 : eveDow, 'canon'), 'კანონი — პარაკლიტონი'),
      lentDay && lentText,
      !zatiki && text(menaion(kind, 'canon'), 'კანონი — წმიდანისა (საზიარო)'),
    ),
  });
  m.push({ title: '„ადიდებს სული ჩემი უფალსა“ — „უპატიოსნესსა“', who: ['choir'], note: great ? 'დიდ დღესასწაულზე — დღესასწაულის ჩასართავები' : season.paschal ? 'ზატიკში — „ანგელოზი ღაღადებდა“' : 'მე-8 გალობის შემდეგ', extras: great || season.paschal ? undefined : some(text(FIX.magnificat)), chants: great || season.paschal ? undefined : ['ck-20', 'ck-21'] });
  if (!dox && !sunday && !lentDay) m.push({ title: '„ღირს არს ჭეშმარიტად“', who: ['choir', 'reader'], note: 'მე-9 გალობის შემდეგ — მხოლოდ სადაგ დღეს' });
  m.push(P('მცირე კვერექსი', [M.afterNine]));
  if (sunday) m.push({ title: '„წმიდა არს უფალი ღმერთი ჩვენი“', who: ['deacon', 'choir'], chants: ['ck-22'] });
  m.push({
    title: 'განმანათლებელი', who: ['choir', 'reader'],
    note: great ? 'დღესასწაულისა' : lentDay ? 'მარხვისა — ხმისა, ტრიოდიონიდან · „დიდება… აწდა“ — ღვთისმშობლისა' : sunday ? `აღდგომისა — სახარების რიგით${gospelNo ? ` (${gospelNo})` : ''} · „დიდება“ — წმიდანისა · „აწდა“ — ღვთისმშობლისა` : dox ? 'წმიდანისა' : 'შვიდეულის დღისა · „დიდება“ — წმიდანისა · „აწდა“ — ღვთისმშობლისა',
    extras: great || zatiki ? undefined : some(sunday ? text(sundayExapost(gospelNo ?? 0)) : dox ? text(menaion(kind, 'exapostilarion'), 'ტექსტი — წმიდანისა (საზიარო)') : text(weekdayExapost(dow))),
    chants: ['ck-a16-131'],
  });
  const praises = dox || sunday;
  if (praises) {
    m.push({
      title: '„ყოველი სული აქებდით უფალსა“ — ქებანი დასდებლებით', who: ['choir'], note: great ? 'დღესასწაულისა' : sunday ? `${toneTxt} · აღდგომისანი — 8 მუხლად` : 'წმიდანისა — 4 მუხლად',
      hint: sunday ? '„დიდება“ — სახარების გერი · „აწდა“ — „უმეტესად კურთხეულ ხარ“' : undefined,
      extras: great || zatiki ? undefined : some(sunday ? text(octoechos(tone, 6, 'lauds'), 'დასდებელნი — პარაკლიტონი') : text(menaion(kind, 'lauds'), 'დასდებელნი — წმიდანისა (საზიარო)')),
      chants: sunday ? ['ck-15', 'ck-a17-3'] : ['ck-15'], toned: sunday,
    });
    m.push({ title: 'დიდი დიდებამაღალიანი — „დიდება მაღალთა შინა ღმერთსა“', who: ['choir'], note: 'იგალობება', extras: some(text(FIX.greatDoxology)), chants: ['ck-24', 'ck-1'] });
    if (great?.id === 'jvari') m.push({ title: 'ჯვრის ამაღლება', who: ['priest', 'choir'], note: 'დიდებამაღალიანის შემდეგ — ჯვარს შუა ტაძარში გამოასვენებენ და ხუთგზის აღამაღლებენ', hint: 'გუნდი ყოველ მხარეს: „უფალო, შეგვიწყალენ“ — 100-გზის · შემდეგ „ჯვარსა შენსა თაყვანის-ვსცემთ, მეუფეო“', extras: [book({ coll: 'kondaki', n: 8, label: 'კონდაკი · ჯვართამაღლების ცისკარი' })] });
    m.push(sunday
      ? { title: (tone ?? 1) % 2 ? 'ტროპარი — „დღეს ცხორება არს“' : 'ტროპარი — „აღსდეგ საფლავისაგან“', who: ['choir'], hint: 'კენტ ხმებში (1, 3, 5, 7) — „დღეს ცხორება“, ლუწში — „აღსდეგ საფლავისაგან“', chants: [(tone ?? 1) % 2 ? 'ck-25' : 'ck-26'] }
      : { title: 'ტროპარნი', who: ['choir'], note: great ? 'დღესასწაულის ტროპარი' : 'წმიდანის ტროპარი · „დიდება… აწდა“ — ღვთისმშობლისა', extras: [{ kind: 'troparia', at: 'matins' }] });
    m.push(P('მრჩობლი კვერექსი', [M.augmented], { chants: ['ck-16'] }));
    m.push(P('თხოვნითი კვერექსი', [M.supplication], { chants: ['ck-27'] }));
  } else {
    m.push({ title: 'ქებანი — „აქებდით უფალსა ცათაგან“', who: ['reader'], note: 'იკითხება, დასდებლების გარეშე', read: [R(FIX.praises)] });
    m.push({ title: '„შენდა დიდება შვენის“ და დიდებამაღალიანი', who: ['reader'], note: 'ყოველდღიური — იკითხება', read: [{ say: 'დიდება მამასა და ძესა და წმიდასა სულსა, აწ და მარადის და უკუნითი უკუნისამდე, ამინ.' }, R(FIX.dailyDoxology)] });
    m.push(P('თხოვნითი კვერექსი', [M.supplication], { chants: ['ck-27'] }));
    if (lentDay) m.push({ title: '„აღვივსენით“-სა ზედა დასდებელნი', who: ['choir', 'reader'], note: 'მარხვანისა — ტრიოდიონიდან (აპში ჯერ არ არის)', hint: 'ჩასართავი მუხლები — ჟამნიდან · „დიდება… აწდა“ — ღვთისმშობლისა', extras: some(text(FIX.mornVerses, 'ჩასართავი მუხლები — ჟამნი')) });
    else m.push({ title: '„აღვივსენით“-სა ზედა დასდებელნი', who: ['choir', 'reader'], note: `${toneTxt} · პარაკლიტონისანი`, hint: 'ჩასართავი მუხლები — ჟამნიდან · „დიდება… აწდა“ — ღვთისმშობლისა', extras: some(text(FIX.mornVerses, 'ჩასართავი მუხლები — ჟამნი'), !zatiki && text(octoechos(tone, eveDow, 'lauds'), 'დასდებელნი — პარაკლიტონი')) });
    m.push({ title: '„კეთილ არს აღსარებად უფლისა“ და სამწმიდაო', who: ['reader'], note: 'ერთგზის', hint: '„მამაო ჩვენოს“ შემდეგ მღვდელი: „რამეთუ შენი არს სუფევა“ — შენ: „ამინ“', read: [R(FIX.goodToConfess), R(FIX.trisagion)] });
    m.push({ title: 'ტროპარნი', who: ['reader'], note: 'წმიდანის ტროპარი · „დიდება… აწდა“ — ღვთისმშობლისა', read: [{ hymns: 'matins' }] });
    m.push(P('მრჩობლი კვერექსი', [M.augmented], { chants: ['ck-16'] }));
  }
  if (lentDay) m.push({ title: 'ეფრემ ასურის ლოცვა', who: ['priest'], note: 'მეტანიებით', extras: [{ kind: 'prayer', id: 'efrem-asuri', label: 'ეფრემ ასურის ლოცვა' }] });
  m.push(P('განტევება', [M.dismissal], { who: ['priest', 'choir'], hint: 'სადაგ დღეს განტევების ნაცვლად: „სიბრძნით“ — „გვაკურთხენ“ — „რომელი იგი არს კურთხეულ“ — „ამინ. დაამტკიცე, ღმერთო“ და მაშინვე პირველი ჟამი' }));
  m.push({ title: 'პირველი ჟამი', who: ['reader'], note: great ? 'ტროპარი და კონდაკი — დღესასწაულისა' : sunday ? 'ტროპარი — აღდგომისა, „დიდება“ — წმიდანისა · კონდაკი — აღდგომისა' : 'ტროპარი და კონდაკი — წმიდანისა', hint: 'ბოლოს მღვდელი: „ქრისტე, ნათელო ჭეშმარიტო“ · გუნდი: „ზეშთა მბრძოლისა“', read: hourRead(5, false, false, psDay?.h[1]), extras: [book(BOOK.hour1)], chants: ['ck-a17-112', 'ck-29'] });

  if (great?.id === 'bzoba') {
    const at = m.findIndex(st => st.title === 'ფსალმუნი 50');
    if (at > 0) m.splice(at, 0, { title: 'ბზის კურთხევა', who: ['priest'], note: 'სახარების შემდეგ — მღვდელი ბზას აკურთხებს და ასხურებს' });
  }

  // ----- hours -----
  const hourNote = sunday ? 'ტროპარი — აღდგომისა, „დიდება“ — წმიდანისა · კონდაკი — აღდგომისა' : great ? 'ტროპარი და კონდაკი — დღესასწაულისა' : 'ტროპარი და კონდაკი — წმიდანისა';
  const h: Step[] = [
    P('„კურთხეულ არს ღმერთი ჩვენი“', [V.begin], { who: ['priest'] }),
    { title: 'მესამე ჟამი', who: ['reader'], note: lentDay ? 'მარხვაში — დავითნის კანონით და ჟამის ტროპარით' : hourNote, hint: 'ფს. 16, 24, 50 · „მამაო ჩვენოს“ შემდეგ მღვდელი: „რამეთუ შენი არს სუფევა“ — შენ: „ამინ“', read: hourRead(6, true, false, psDay?.h[3]), extras: [book(BOOK.hour3)] },
    { title: 'მეექვსე ჟამი', who: ['reader'], note: lentDay ? 'მარხვაში — წინასწარმეტყველების საკითხავით' : hourNote, hint: 'ფს. 53, 54, 90 · ბოლოს მღვდელი განტევებას ამბობს', read: hourRead(7, false, false, psDay?.h[6]), extras: [book(BOOK.hour6)] },
  ];
  if (lentDay) h.push({ title: 'ეფრემ ასურის ლოცვა', who: ['reader'], note: 'ყოველი ჟამის ბოლოს — მეტანიებით', extras: [{ kind: 'prayer', id: 'efrem-asuri', label: 'ეფრემ ასურის ლოცვა' }] });
  // the Royal Hours of Christmas' and Theophany's eves (on Saturday or Sunday they are read on the Friday before)
  const royal = (season.paramony && dow >= 1 && dow <= 5) || season.royalFriday;
  if (royal) h.unshift({ title: 'სამეუფო ჟამები — პირველი, მესამე, მეექვსე და მეცხრე', who: ['reader', 'priest', 'deacon'], note: `${iso.slice(5) <= '01-06' ? 'ქრისტეშობის' : 'ნათლისღების'} წინადღისა — ყოველ ჟამზე წინასწარმეტყველება, სამოციქულო და სახარება`, hint: 'ფსალმუნები და საკითხავები — ბეჭდურ თვენში (იანვარი); აპში ჯერ არ არის', extras: [book(BOOK.hour1)] });

  // ----- liturgy -----
  const eveName = `${WEEKDAY_NOM[eveDow]} საღამოს`;
  const md5 = iso.slice(5);
  const notes = [
    own.length ? `${own.map(o => o.t).join(', ')} — საკუთარი განგება „დამატებით წიგნებშია“` : '',
    season.departed ? 'მიცვალებულთა შაბათი — პარასკევ საღამოს პარასტასი' : '',
    season.akathist ? 'პარასკევ საღამოს ცისკარზე — ღვთისმშობლის დაუჯდომელი' : '',
    season.greatCanon ? 'ოთხშაბათ საღამოს ცისკარზე — ანდრია კრიტელის დიდი კანონი' : '',
  ].filter(Boolean).join(' · ') || undefined;
  // Christmas and Theophany: their eve's vespers is served with the morning's liturgy (weekday) or in the afternoon (Saturday,
  // Sunday); the evening's vigil begins with Great Compline and the litya
  const festEve = (md5 === '01-07' || md5 === '01-19');
  const eveWeekday = eveDow >= 1 && eveDow <= 5;
  const services: Service[] = [
    festEve
      ? { id: 'vespers', title: 'დიდი სერობა — ღამისთევა', when: eveName, note: eveWeekday ? 'წინადღის მწუხრი დილით, ბასილის წირვასთან აღესრულა — იხ. წინა დღის „წირვა“' : 'წინადღის დიდი მწუხრი საკითხავებით — შუადღის შემდეგ, ცალკე', steps: [
        P('„კურთხეულ არს ღმერთი ჩვენი“', [V.begin], { who: ['priest'] }),
        { title: 'დიდი სერობა', who: ['reader', 'choir'], note: '„ჩვენ თანა არს ღმერთი“ — იგალობება დღესასწაულის მსგავსად · შემდეგ დღესასწაულის ტროპარი და კონდაკი', read: [{ src: { coll: 'jamni', n: 11, part: 0, label: 'ჟამნი · დიდი სერობა' } }] },
        { title: 'ლიტია', who: ['choir', 'priest', 'deacon'], note: 'დღესასწაულის დასდებელნი', pt: [V.litya] },
        P('ხუთი პურის კურთხევა', [V.bread, V.blessing], { who: ['priest', 'choir'] }),
        { title: 'ცისკარი იწყება', who: ['reader'], note: 'ექვსფსალმუნებიდან', hint: 'გადადი ჩანართზე „ცისკარი“' },
      ] }
      : { id: 'vespers', title: 'მწუხრი', when: `${eveName}${vigilDay && joined ? ' · ღამისთევა' : ''}`, steps: v, note: notes },
    ...(season.compline ? [complineService(season.e, eveDow)] : []),
    { id: 'matins', title: 'ცისკარი', when: joined ? `${eveName} — მწუხრს მოსდევს` : 'დილით', steps: m, note: notes },
    { id: 'hours', title: 'ჟამები', when: 'წირვის წინ', steps: h },
  ];
  if (lentDay && !season.presanctified && !great) {
    services.push({ id: 'liturgy', title: 'წირვა', when: 'მარხვის დღე', steps: [
      { title: 'წირვა არ აღესრულება', who: ['reader'], note: 'მარხვის ორშაბათს, სამშაბათს და ხუთშაბათს — სადილის ჟამი (ტიპიკა)', extras: [book(BOOK.typika)] },
      { title: 'მეცხრე ჟამი და მწუხრი', who: ['reader', 'choir'], note: 'მწუხრი შუადღის შემდეგ — მარხვის წესით' },
    ] });
    return services;
  }
  if (season.presanctified && !great) {
    const steps = presanctifiedSteps({ vespersText, apostle, gospel: [], lentText });
    // the first Friday: St Theodore's canon and the blessing of the kolyva after the liturgy
    if (season.e === -44) steps.push({ title: 'თეოდორე ტირონის კანონი — კოლიოს კურთხევა', who: ['priest', 'choir'], note: 'წირვის შემდეგ', extras: [xbook(22, 'თეოდორე ტირონის პარაკლისი')] });
    services.push({ id: 'liturgy', title: 'წირვა', when: 'წინასწარ კურთხეულთა', note: 'მწუხრთან ერთად', steps });
    return services;
  }
  const typika = sunday || big;
  const l: Step[] = [];
  l.push(P('„კურთხეულ არს მეუფება“', [L.begin], { who: ['priest'], note: season.basil ? 'ბასილი დიდის ლიტურგია' : undefined, extras: [book(BOOK.priestLiturgy)] }));
  l.push(P('დიდი კვერექსი', [L.great], { extras: [book(sunday ? BOOK.sunLiturgy : BOOK.liturgy)], chants: ['chant-4'] }));
  l.push({
    title: 'ანტიფონები', who: ['choir'],
    note: great ? 'დღესასწაულის ანტიფონები' : season.paschal ? 'აღდგომის ანტიფონები (თომას კვირიდან — სახვითნი)' : typika ? 'გამომსახველობითი: ფს. 102, 145, „მხოლოდშობილო“' : 'ყოველდღიური ანტიფონები',
    hint: typika || great ? 'ანტიფონებს შორის — მცირე კვერექსები' : 'ა — „კეთილ არს აღსარებად“ · ბ — „უფალი სუფევს“ · გ — „მოვედით, უგალობდეთ“; „მხოლოდშობილო“ — მეორის შემდეგ · ანტიფონებს შორის — მცირე კვერექსები',
    pt: [L.small],
    chants: great ? undefined : typika ? ['chant-5', 'chant-a2-276', 'chant-7'] : ['chant-a2-310', 'chant-a2-311', 'chant-7', 'chant-a2-312'],
  });
  if (typika && !great) l.push({ title: 'ნეტარებანი — „მომიხსენე“', who: ['choir', 'reader'], note: sunday ? `${toneTxt} · აღდგომისანი 6 და წმიდანის კანონის მე-3 გალობიდან 4` : 'წმიდანის კანონის მე-3 და მე-6 გალობიდან — 8 მუხლად', extras: some(sunday && !zatiki && text(octoechos(tone, 6, 'beatitudes'), 'ტექსტი — პარაკლიტონი')), chants: ['chant-8'] });
  l.push({ title: 'მცირე შესვლა — „მოვედით, თაყვანის-ვსცეთ“', who: ['choir'], note: great ? 'დღესასწაულის შესავალი მუხლი' : sunday || season.paschal ? '„…რომელი აღსდეგ მკვდრეთით“' : '„…რომელი საკვირველ ხარ წმიდათა შორის“', pt: [L.entrance], chants: ['chant-10'] });
  l.push({ title: 'ტროპარნი და კონდაკნი', who: ['choir', 'reader'], note: season.paschal ? 'ბოლოს — აღდგომის კონდაკი' : inp.patron ? undefined : 'აირჩიე „ჩემი ტაძარი“ — რიგი ტაძრის სახელობაზეა დამოკიდებული', extras: [{ kind: 'troparia', at: 'liturgy' }] });
  const trisagion = great?.trisagion ?? (season.lazarus ? 'baptized' : undefined);
  l.push({ title: trisagion === 'baptized' ? '„რაოდენთა ქრისტეს მიერ ნათელ-იღეთ“' : trisagion === 'cross' ? '„ჯუარსა შენსა თაყუანის-ვსცემთ“' : 'სამწმიდაო — „წმიდაო ღმერთო“', who: ['choir'], note: trisagion ? 'სამწმიდაოს ნაცვლად' : undefined, pt: [L.trisagion], chants: trisagion ? undefined : ['chant-12'] });
  l.push({ title: 'წარდგომა', who: ['reader', 'choir'], note: sunday ? `${toneTxt} — აღდგომისა${dox ? ' და წმიდანისა' : ''}` : great ? 'დღესასწაულისა' : vigilDay ? 'წმიდანისა' : `დღისა (${DAY_THEME[dow]}) და წმიდანისა`, hint: 'დიაკონი: „მოხედენ“ · მღვდელი: „მშვიდობა ყოველთა“ · შენ: „და სულისაცა შენისა თანა“ · დიაკონი: „სიბრძნით“ — და ამბობ წარდგომას', pt: [L.apostle], extras: some(!sunday && !great && text(saintProkeimenon(kind))), chants: sunday ? ['chant-13'] : ['chant-a3-48'], toned: sunday });
  l.push({ title: 'სამოციქულო', who: ['reader'], note: apostle.length ? apostle.map(r => `${r.name} ${r.ref}`).join(' · ') : 'კალენდარში ჩანაწერი არ არის', hint: 'დიაკონი: „სიბრძნით“ — შენ ამბობ სათაურს · დიაკონი: „მოხედენ“ — კითხულობ · ბოლოს მღვდელი: „მშვიდობა შენდა“ — შენ: „და სულისაცა შენისა თანა“', extras: apostle.length ? [{ kind: 'readings', items: apostle }] : undefined });
  l.push({ title: 'ალილუია', who: ['reader', 'choir'], note: sunday ? `${toneTxt}` : undefined, chants: ['chant-14'], toned: sunday });
  l.push({ title: 'სახარება', who: ['deacon', 'priest'], note: gospel.length ? gospel.map(r => `${r.name} ${r.ref}`).join(' · ') : undefined, hint: 'წინ და შემდეგ გუნდი: „დიდება შენდა, უფალო, დიდება შენდა“', chants: ['chant-15'] });
  l.push(P('მრჩობლი კვერექსი და კათაკმეველთა კვერექსი', [L.augmented], { chants: ['chant-16', 'chant-17'] }));
  l.push({ title: 'ქერუბიმთა გალობა — „რომელნი ქერუბიმთა“', who: ['choir'], hint: 'დიდი შესვლა', chants: ['chant-18', 'chant-20', 'chant-21'] });
  l.push(P('თხოვნითი კვერექსი', [L.supplication], { chants: ['chant-22'] }));
  l.push({ title: '„მამასა და ძესა“ და სარწმუნოების სიმბოლო — „მრწამს“', who: ['choir'], chants: ['chant-23', 'chant-24'] });
  l.push({ title: 'ანაფორა — „წყალობა მშვიდობისა“', who: ['choir'], hint: '„გვაქვს უფლისა მიმართ“ · „ღირს არს და მართალ“ · „წმიდა არს“ · „შენ გიგალობთ“', chants: ['chant-25', 'chant-27', 'chant-28', 'chant-29', 'chant-30'] });
  l.push(great
    ? { title: 'დღესასწაულის ძლისპირი (ღირს არსის ნაცვლად)', who: ['choir'], extras: [{ kind: 'prayer', id: 'ghirs-arsis-nacvlad', label: 'ღირს-არსის ნაცვლად საკითხავნი' }] }
    : season.basil ? { title: '„შენდამი იხარებს“', who: ['choir'], note: 'ბასილი დიდის ლიტურგიაზე — „ღირს არსის“ ნაცვლად', chants: ['chant-31'] }
    : season.paschal ? { title: '„ანგელოზი ღაღადებდა“', who: ['choir'], note: 'აღდგომის წარგზავნამდე — „ღირს არსის“ ნაცვლად', extras: [{ kind: 'prayer', id: 'ghirs-arsis-nacvlad', label: 'ღირს-არსის ნაცვლად საკითხავნი' }] }
    : { title: '„ღირს არს ჭეშმარიტად“', who: ['choir'], chants: ['chant-32'] });
  l.push(P('თხოვნითი კვერექსი „მამაო ჩვენოს“ წინ', [L.beforeOurFather], { chants: ['chant-34'] }));
  l.push({ title: '„მამაო ჩვენო“', who: ['choir'], chants: ['chant-35'] });
  l.push({ title: '„ერთ არს წმიდა“ და ზიარების მუხლი', who: ['choir'], note: great ? 'დღესასწაულისა' : season.paschal ? '„ხორცსა ქრისტესსა“' : sunday ? `${COMMUNION[0]}${dox ? ' · და წმიდანისა' : ''}` : vigilDay ? 'წმიდანისა' : `${COMMUNION[dow]} (${DAY_THEME[dow]}) · და წმიდანისა`, chants: ['chant-37', 'chant-41', 'chant-a3-376', 'chant-a3-382'] });
  l.push({ title: 'ზიარების წინა ლოცვები', who: ['reader'], note: 'სანამ სამღვდელოება ეზიარება — კითხულობ ხმამაღლა', extras: [{ kind: 'prayer', id: 'ziarebis-tsin', label: 'ზიარების წინა ლოცვები' }] });
  l.push({ title: 'ზიარება — „კურთხეულ არს მომავალი“, „ხორცი ქრისტესი“', who: ['choir'], pt: [L.communion], chants: ['chant-39', 'chant-40'] });
  l.push({ title: season.paschal ? '„ქრისტე აღდგა“ და „აღავსე პირი ჩემი“' : '„ვიხილეთ ნათელი ჭეშმარიტი“ და „აღავსე პირი ჩემი“', who: ['choir'], chants: season.paschal ? ['chant-43'] : ['chant-42', 'chant-43'] });
  l.push(P('სამადლობელი კვერექსი და ამბიონის ლოცვა', [L.thanks]));
  l.push({ title: '„იყავნ სახელი უფლისა“ და ფსალმუნი 33', who: ['choir', 'reader'], note: '„იყავნ სახელი უფლისა“ — სამგზის, შემდეგ ფსალმუნი 33', read: [R(FIX.typikaEnd)], chants: ['chant-45', 'chant-46'] });
  l.push(P('განტევება', undefined, { who: ['priest', 'choir'] }));
  l.push({ title: 'ზიარების შემდგომი ლოცვები', who: ['reader'], note: 'განტევების შემდეგ — ზიარებულთათვის', extras: [{ kind: 'prayer', id: 'ziarebis-shemdeg', label: 'ზიარების შემდგომი ლოცვები' }] });
  // the feasts' blessings: the Great Blessing of the Waters, the candles at the Meeting, the grapes at the Transfiguration
  const md = iso.slice(5);
  if (md === '01-18' || md === '01-19') l.push({ title: 'დიდი აიაზმა — წყლის კურთხევა', who: ['priest', 'choir', 'reader'], note: md === '01-18' ? 'ნათლისღების წინადღეს, წირვის შემდეგ' : 'ნათლისღებას, წირვის შემდეგ', hint: 'მედავითნე კითხულობს წინასწარმეტყველებას, სამოციქულოს; გუნდი — „ხმა უფლისა წყალთა ზედა“', extras: [book({ coll: 'kurtxevani', n: 25, label: 'კურთხევანი · დიდი აიაზმა' })] });
  if (md === '02-15') l.push({ title: 'სანთლის კურთხევა', who: ['priest', 'choir'], note: 'მიგებებას — სანთლები იკურთხება', extras: [xbook(26, 'სანთლის კურთხევა')] });
  if (md === '08-19') l.push({ title: 'ყურძნისა და ხილის კურთხევა', who: ['priest', 'choir'], note: 'ფერისცვალებას, ამბიონის ლოცვის შემდეგ' });
  // the eve of Christmas or Theophany on a weekday: St Basil's liturgy begins with vespers and its readings
  if (season.paramony && dow >= 1 && dow <= 5) l.splice(0, l.length, ...vesperalBasil(iso, vespersText, apostle, gospel), ...l.filter(st => /აიაზმა/.test(st.title)));
  if (season.paramony && (dow === 0 || dow === 6)) l.unshift({ title: 'წინადღე შაბათს ან კვირას', who: ['reader'], note: 'სამეუფო ჟამები პარასკევს იკითხება, ბასილი დიდის წირვა — დღესასწაულის დღეს; დღეს — ოქროპირისა' });
  services.push({ id: 'liturgy', title: 'წირვა', when: season.basil ? (season.paramony ? 'ბასილი დიდისა, მწუხრთან ერთად' : 'ბასილი დიდისა') : 'დილით', steps: l });
  return season.e === 7 ? thomasSunday(services) : services;
};

/** Thomas' Sunday (Antipascha) is served wholly from ზატიკი: no Octoechos — its notes name the Sunday's own hymns */
const THOMAS = 'თომას კვირისა — ზატიკიდან';
const thomasSunday = (services: Service[]): Service[] => {
  const fix = (x?: string) => x
    ?.replace(/(?:ხმა \d|კვირის ხმა) · (?:აღდგომისანი|პარაკლიტონ[ა-ჰ]*)(?: — \d+ მუხლად)?(?: 6 და წმიდანის[^·]*)?/g, THOMAS)
    .replace(/აღდგომის ტროპარი \((?:ხმა \d|კვირის ხმა)\)/g, 'თომას კვირის ტროპარი')
    .replace(/(ტროპარი|კონდაკი) — აღდგომისა/g, '$1 — თომას კვირისა')
    .replace(/აღდგომისა — სახარების რიგით(?: \(\d+\))?/g, THOMAS)
    .replace(/(?:ხმა \d|კვირის ხმა) — აღდგომისა/g, 'თომას კვირისა')
    .replace(/^(?:ხმა \d|კვირის ხმა)$/, THOMAS)
    .replace('ბოლოს — აღდგომის კონდაკი', 'თომას კვირის კონდაკი');
  return services.map(sv => ({ ...sv, steps: sv.steps.map(st => ({
    ...st, note: fix(st.note), hint: fix(st.hint), toned: false,
    extras: st.extras?.filter(x => !(x.kind === 'text' && x.src.coll === 'paraklitoni')),
  })) }));
};

/** St Basil's liturgy with vespers on the eves of Christmas and Theophany (on a weekday) */
const vesperalBasil = (iso: string, vespersText: string, apostle: Reading[], gospel: Reading[]): Step[] => {
  const christmas = iso.slice(5) === '01-06';
  const L = PRIEST.liturgy;
  const reads = (rs: Reading[]): Extra[] => (rs.length ? [{ kind: 'readings', items: rs }] : []);
  return [
    P('„კურთხეულ არს სუფევა“', [L.begin], { who: ['priest'] }),
    { title: 'ფსალმუნი 103 და დიდი კვერექსი', who: ['reader', 'deacon'], read: [R(FIX.come), R(FIX.ps103)] },
    { title: '„უფალო, ღაღად-ვყავ“', who: ['choir'], note: 'დღესასწაულის დასდებელნი', extras: some(text(FIX.lordICry, 'ფსალმუნები და მუხლები — ჟამნი')) },
    { title: 'შესვლა და „ნათელო მხიარულო“', who: ['priest', 'choir'], extras: some(text(FIX.gladLight)) },
    { title: `${christmas ? '8' : '13'} საწინასწარმეტყველო საკითხავი`, who: ['reader', 'choir'], note: vespersText || 'საკითხავები — კალენდრის მიხედვით', hint: christmas ? 'მე-3 და მე-6 საკითხავის შემდეგ გუნდი ტროპარს გალობს მუხლებით' : 'მე-3, მე-6 და მე-8 საკითხავის შემდეგ გუნდი გალობს' },
    { title: 'სამწმიდაო', who: ['choir'] },
    { title: 'სამოციქულო', who: ['reader'], note: apostle.map(r => `${r.name} ${r.ref}`).join(' · ') || undefined, extras: reads(apostle) },
    { title: 'სახარება', who: ['deacon', 'priest'], note: gospel.map(r => `${r.name} ${r.ref}`).join(' · ') || undefined, extras: reads(gospel) },
    { title: 'ქერუბიმთა გალობა — „რომელნი ქერუბიმთა“', who: ['choir'] },
    { title: '„შენდამი იხარებს“', who: ['choir'], note: 'ბასილი დიდის ლიტურგიაში — „ღირს არსის“ ნაცვლად' },
    { title: 'ზიარება და განტევება', who: ['choir', 'priest'], extras: [{ kind: 'prayer', id: 'ziarebis-tsin', label: 'ზიარების წინა ლოცვები' }] },
    ...(christmas ? [{ title: 'სანთელი შუა ტაძარში — დღესასწაულის ტროპარი და კონდაკი', who: ['choir', 'priest'] as Who[], note: 'წირვის შემდეგ' }] : []),
  ];
};

/** the Liturgy of the Presanctified Gifts, joined to vespers (Lent's Wednesdays and Fridays, Holy Week's first three days) */
const presanctifiedSteps = (x: { vespersText: string; apostle: Reading[]; gospel: Reading[]; lentText: Extra | null; holy?: boolean }): Step[] => {
  const V = PRIEST.vespers;
  const steps: Step[] = [
      { title: 'მეცხრე ჟამი და სადილის ჟამი', who: ['reader'], extras: [book(BOOK.typika)] },
      { title: '„კურთხეულ არს სუფევა“ და ფს. 103', who: ['priest', 'reader'], read: [R(FIX.come), R(FIX.ps103)] },
      P('დიდი კვერექსი', [V.great]),
      { title: 'დავითნის კანონი 18', who: ['reader'], hint: 'ყოველი დიდების შემდეგ — მცირე კვერექსი', read: [{ kathisma: 18 }] },
      { title: '„უფალო, ღაღად-ვყავ“', who: ['choir'], extras: some(text(FIX.lordICry, 'ფსალმუნები და მუხლები — ჟამნი'), x.lentText) },
      { title: 'შესვლა და „ნათელო მხიარულო“', who: ['priest', 'choir'], extras: some(text(FIX.gladLight)) },
      { title: 'წარდგომა და საკითხავები', who: ['reader'], note: x.vespersText || 'დაბადებისა და იგავთა — კალენდრის მიხედვით' },
      { title: '„წარემართენ ლოცვაჲ ჩემი“', who: ['choir'], note: 'ფს. 140 — მუხლმოდრეკით' },
      { title: 'ეფრემ ასურის ლოცვა', who: ['priest'], extras: [{ kind: 'prayer', id: 'efrem-asuri', label: 'ეფრემ ასურის ლოცვა' }] },
      ...(x.apostle.length ? [{ title: 'სამოციქულო', who: ['reader'] as Who[], note: x.apostle.map(r => `${r.name} ${r.ref}`).join(' · '), extras: [{ kind: 'readings', items: x.apostle } as Extra] }] : []),
      P('კვერექსები'),
      { title: '„აწ ძალნი ზეცისანი“', who: ['choir'], note: 'ქერუბიმთა გალობის ნაცვლად' },
      { title: '„მამაო ჩვენო“', who: ['choir'], chants: ['chant-35'] },
      { title: 'ზიარების მუხლი — „იხილეთ და იგემეთ“', who: ['choir'], hint: 'ამ დროს მედავითნე კითხულობს ზიარების წინა ლოცვებს', extras: [{ kind: 'prayer', id: 'ziarebis-tsin', label: 'ზიარების წინა ლოცვები' }] },
      { title: '„ვაკურთხო უფალი“, ფს. 33 და განტევება', who: ['choir', 'reader', 'priest'], read: [R(FIX.typikaEnd)] },
  ];
  return steps.flatMap((st): Step[] => (x.gospel.length && st.title === '„აწ ძალნი ზეცისანი“'
    ? [{ title: 'სახარება', who: ['deacon', 'priest'] as Who[], note: x.gospel.map(r => `${r.name} ${r.ref}`).join(' · '), extras: [{ kind: 'readings', items: x.gospel } as Extra] }, st]
    : [st]));
};

/** a book of „დამატებითი წიგნები“ (public/wignebi-x) */
const xbook = (n: number, label: string): Extra => ({ kind: 'book', coll: 'x', n, label });
/** the saints and icons whose own services stand among „დამატებითი წიგნები“ (stage 4) */
export const ownServicesOf = (iso: string) => {
  const o = oldMD(iso);
  const md = `${String(o.month).padStart(2, '0')}-${String(o.day).padStart(2, '0')}`;
  const e = easterOffset(iso);
  return OWN_SERVICES.filter(x => x.md.includes(md) || x.e === e).map(x => ({ n: x.n, t: EXTRA_BOOKS.find(b => b.n === x.n)?.t ?? '' }));
};

/** Great Compline (Lent's Monday–Thursday evenings) with St Andrew's canon in the first week (the user's pick: a tab of its own) */
const COMPLINE: TextSrc = { coll: 'jamni', n: 11, part: 0, label: 'ჟამნი · დიდი სერობა' };
const COMPLINE_SPLIT = /^და მეყსეულად ითქუმიან მუჴლნი/;
const complineService = (e: number, eveDow: number): Service => {
  const part = andrewPart(e);
  const day = ['', 'ორშაბათისა', 'სამშაბათისა', 'ოთხშაბათისა', 'ხუთშაბათისა'];
  const steps: Step[] = part
    ? [
      { title: 'დიდი სერობა — ფსალმუნები, „ჩვენ თანა არს ღმერთი“, „მრწამს“', who: ['reader', 'choir'], hint: 'დასაწყისს მღვდელი იტყვის: „კურთხეულ არს ღმერთი ჩვენი“', read: [{ src: { ...COMPLINE, to: COMPLINE_SPLIT } }], extras: [book({ coll: 'jamni', n: 11, label: COMPLINE.label })] },
      { title: `ანდრია კრიტელის დიდი კანონი — ${day[part]} ნაწილი`, who: ['reader', 'choir', 'priest'], note: 'ძლისპირები იგალობება, ტროპარნი იკითხება', hint: 'ყოველ ტროპარზე: „შემიწყალე მე, ღმერთო, შემიწყალე მე“ — მეტანიით', read: [{ src: { coll: 'kriteli', n: part, part: 0, label: 'ანდრია კრიტელი' } }] },
      { title: 'დიდი სერობა — გაგრძელება და მიტევება', who: ['reader', 'choir', 'priest'], read: [{ src: { ...COMPLINE, from: COMPLINE_SPLIT } }] },
    ]
    : [{ title: 'დიდი სერობა', who: ['reader', 'choir', 'priest'], note: 'სამ ნაწილად: ფსალმუნები და „ჩვენ თანა არს ღმერთი“ · ფს. 50, 101 და მანასეს ლოცვა · ფს. 69, 142 და „აქებდით ღმერთსა“', hint: 'დასაწყისს მღვდელი იტყვის: „კურთხეულ არს ღმერთი ჩვენი“', read: [{ src: COMPLINE }], extras: [book({ coll: 'jamni', n: 11, label: COMPLINE.label })] }];
  return { id: 'compline', title: 'დიდი სერობა', when: `${WEEKDAY_NOM[eveDow]} საღამოს`, note: part ? 'მწუხრის შემდეგ — ანდრია კრიტელის კანონით' : 'მწუხრის შემდეგ', steps };
};

/** Holy Week (stage 4): each day's own order — the Bridegroom's matins, the Presanctified, Thursday's and Saturday's
 *  liturgies of St Basil with vespers, Friday's twelve Gospels, Royal Hours and the vespers of the Shroud */
const holyWeek = (inp: DayInput, e: number): Service[] => {
  const readings = inp.day ? readingsOf(inp.day) : [];
  const matinsGospel = readings.filter(r => r.label === 'ცისკ');
  const liturgy = readings.filter(r => r.label !== 'ცისკ' && r.label !== 'მწუხრ');
  const apostle = liturgy.filter(r => r.apostle);
  const gospel = liturgy.filter(r => !r.apostle);
  const vespersText = inp.day ? vespersReadingsText(inp.day) : '';
  const name = TRIODION[e].name;
  const tri = text(triodionSrc(e), `ტროპარ-კონდაკი — ჟამნი · ${name}`);
  const khareba = greatFeastOf(inp.iso)?.id === 'khareba' ? 'ამ დღეს ხარებაც არის — მისი საგალობლები ვნების შვიდეულისას ერთვის (მღვდელს ჰკითხე წესი)' : undefined;
  const V = PRIEST.vespers, M = PRIEST.matins, L = PRIEST.liturgy;
  const hymns = (at: 'vespers' | 'matins' | 'hours' | 'liturgy'): Read => ({ hymns: at });
  const readsOf = (rs: Reading[]): Extra[] => (rs.length ? [{ kind: 'readings', items: rs }] : []);
  const ephrem: Step = { title: 'ეფრემ ასურის ლოცვა', who: ['priest', 'reader'], note: 'მეტანიებით', extras: [{ kind: 'prayer', id: 'efrem-asuri', label: 'ეფრემ ასურის ლოცვა' }] };
  const x25 = (part: number, label: string, more: Partial<TextSrc> = {}): Extra => ({ kind: 'text', src: { coll: 'x', n: 25, part, label, ...more }, label });
  const ROYAL = /^I – III - VI და IX სამეუფო/;
  const services: Service[] = [];

  if (e <= -4) {
    const ps = HOLY_PSALTER[e];
    // Monday–Wednesday: the Bridegroom's matins the evening before, the hours with the Gospel, the Presanctified
    services.push(
      { id: 'vespers', title: 'მწუხრი', when: 'წირვასთან ერთად — დღის მეორე ნახევარში', note: 'ვნების შვიდეული · წინასწარ კურთხეულთა ლიტურგიის ნაწილია — იხ. ჩანართი „წირვა“', steps: [
        { title: 'მწუხრი წინასწარ კურთხეულთა ლიტურგიასთან', who: ['reader', 'choir'], note: 'სრული რიგი — ჩანართში „წირვა“', extras: some(tri) },
      ] },
      { id: 'matins', title: 'სიძის ცისკარი', when: 'წინა საღამოს', note: khareba, steps: [
        P('„კურთხეულ არს ღმერთი ჩვენი“', [M.begin], { who: ['priest'] }),
        { title: 'ექვსფსალმუნება', who: ['reader'], read: [{ say: AMEN }, R(FIX.sixPsalms)] },
        P('დიდი კვერექსი', [M.great], { chants: ['ck-2'] }),
        { title: '„ალილუია“ და „აჰა, სიძე მოვალს შუაღამესა“', who: ['choir'], note: 'ტროპარი სამგზის, ნელა', extras: some(tri), read: [hymns('matins')] },
        { title: `დავითნის კანონები ${ps.m.join(', ')}`, who: ['reader'], hint: 'ყოველი კანონის შემდეგ — მცირე კვერექსი', read: ps.m.map(kathisma => ({ kathisma })) },
        { title: 'სახარება', who: ['priest'], note: matinsGospel.map(r => `${r.name} ${r.ref}`).join(' · ') || undefined, extras: readsOf(matinsGospel) },
        { title: 'ფსალმუნი 50', who: ['reader'], read: [R(FIX.ps50)] },
        { title: 'კანონი — სამგალობელი', who: ['choir', 'reader'], note: 'ტრიოდიონის სამგალობელი (ბეჭდურ ტრიოდიონშია — აპში ჯერ არ არის)', hint: 'მე-9 გალობის შემდეგ — „ღირს არს“ არ იგალობება, მის ნაცვლად ძლისპირი' },
        { title: 'განმანათლებელი — „სასძლოსა შენსა ვხედავ, მაცხოვარ ჩემო“', who: ['choir'], note: 'სამგზის, ნელა' },
        { title: 'ქებანი, დიდებამაღალიანი და სტიქარონი', who: ['reader', 'choir'], read: [R(FIX.praises), R(FIX.dailyDoxology)] },
        { title: '„კეთილ არს აღსარებად უფლისა“ და სამწმიდაო', who: ['reader'], read: [R(FIX.goodToConfess), R(FIX.trisagion)] },
        { title: 'ტროპარი', who: ['choir'], read: [hymns('matins')] },
        ephrem,
        P('განტევება', [M.dismissal], { who: ['priest', 'choir'] }),
      ] },
      { id: 'hours', title: 'ჟამები', when: 'დილით', note: 'დიდ ორშაბათს, სამშაბათს და ოთხშაბათს ჟამებზე ოთხთავი იკითხება', steps: [
        { title: 'პირველი, მესამე, მეექვსე და მეცხრე ჟამი', who: ['reader'], note: 'მარხვის წესით — დავითნის კანონებითა და სახარების კითხვით', read: [...hourRead(5, true, false, ps.h[1]), ...hourRead(6, false, false, ps.h[3]), ...hourRead(7, false, false, ps.h[6]), ...hourRead(9, false, false, ps.h[9])], extras: [book(BOOK.hour1)] },
        ephrem,
      ] },
      { id: 'liturgy', title: 'წირვა', when: 'წინასწარ კურთხეულთა', note: 'მწუხრთან ერთად', steps: presanctifiedSteps({ vespersText, apostle, gospel, lentText: tri, holy: true }) },
    );
    return services;
  }
  if (e === -3) {
    // Holy Thursday: matins the evening before, St Basil's liturgy with vespers
    services.push(
      { id: 'vespers', title: 'მწუხრი', when: 'წირვასთან ერთად', note: 'ბასილი დიდის ლიტურგიის ნაწილია — იხ. ჩანართი „წირვა“', steps: [{ title: 'მწუხრი ბასილი დიდის ლიტურგიასთან', who: ['reader', 'choir'], note: 'სრული რიგი — ჩანართში „წირვა“', extras: some(tri) }] },
      { id: 'matins', title: 'ცისკარი', when: 'წინა საღამოს', note: khareba, steps: [
        P('„კურთხეულ არს ღმერთი ჩვენი“', [M.begin], { who: ['priest'] }),
        { title: 'ექვსფსალმუნება', who: ['reader'], read: [{ say: AMEN }, R(FIX.sixPsalms)] },
        { title: '„ალილუია“ და „რაჟამს დიდებულნი მოწაფენი“', who: ['choir'], note: 'ტროპარი სამგზის', read: [hymns('matins')] },
        { title: 'სახარება', who: ['priest'], note: matinsGospel.map(r => `${r.name} ${r.ref}`).join(' · ') || 'ლკ. 22:1–39', extras: readsOf(matinsGospel) },
        { title: 'ფსალმუნი 50', who: ['reader'], read: [R(FIX.ps50)] },
        { title: 'კანონი — „განიპო ზღუაჲ“', who: ['choir', 'reader'], note: 'ტრიოდიონის კანონი (ბეჭდურ ტრიოდიონშია — აპში ჯერ არ არის)' },
        { title: 'ქებანი, დიდებამაღალიანი', who: ['reader', 'choir'], read: [R(FIX.praises), R(FIX.dailyDoxology)] },
        { title: 'ტროპარი და განტევება', who: ['choir', 'priest'], read: [hymns('matins')] },
      ] },
      { id: 'hours', title: 'ჟამები', when: 'წირვის წინ', steps: [{ title: 'მესამე, მეექვსე და მეცხრე ჟამი', who: ['reader'], read: [...hourRead(6, true), ...hourRead(7, false), ...hourRead(9, false)] }] },
      { id: 'liturgy', title: 'წირვა', when: 'ბასილი დიდისა, მწუხრთან ერთად', note: khareba, steps: [
        P('„კურთხეულ არს სუფევა“', [L.begin], { who: ['priest'] }),
        { title: 'ფსალმუნი 103 და დიდი კვერექსი', who: ['reader', 'deacon'], read: [R(FIX.come), R(FIX.ps103)] },
        { title: '„უფალო, ღაღად-ვყავ“', who: ['choir'], extras: some(text(FIX.lordICry, 'ფსალმუნები და მუხლები — ჟამნი')) },
        { title: 'შესვლა და „ნათელო მხიარულო“', who: ['priest', 'choir'], extras: some(text(FIX.gladLight)) },
        { title: 'საკითხავები', who: ['reader'], note: vespersText || 'გამოსვლათა 19:10–19 · იობ 38:1–23; 42:1–5 · ესაია 50:4–11' },
        { title: 'სამწმიდაო', who: ['choir'] },
        { title: 'სამოციქულო', who: ['reader'], note: apostle.map(r => `${r.name} ${r.ref}`).join(' · ') || undefined, extras: readsOf(apostle) },
        { title: 'სახარება', who: ['deacon', 'priest'], note: gospel.map(r => `${r.name} ${r.ref}`).join(' · ') || undefined, extras: readsOf(gospel) },
        { title: '„ვახშამსა შენსა საიდუმლოსა“', who: ['choir'], note: 'ქერუბიმთა გალობის, ზიარების მუხლისა და „აღივსენ პირნი ჩვენნი“-ს ნაცვლად' },
        { title: '„ღმრთის მეუფებისა სტუმართმოყვარებასა“', who: ['choir'], note: '„ღირს არსის“ ნაცვლად — კანონის მე-9 გალობის ძლისპირი' },
        { title: 'ზიარება და განტევება', who: ['choir', 'priest'], extras: [{ kind: 'prayer', id: 'ziarebis-tsin', label: 'ზიარების წინა ლოცვები' }] },
      ] },
    );
    return services;
  }
  if (e === -2) {
    // Holy Friday: the twelve Gospels on Thursday evening, the Royal Hours, no liturgy, the vespers of the Shroud
    services.push(
      { id: 'vespers', title: 'მწუხრი — გარდამოხსნის გამოსვენება', when: 'დიდ პარასკევს, შუადღის შემდეგ', note: khareba, steps: [
        { title: 'დიდი პარასკევის მწუხრი', who: ['priest', 'choir', 'reader'], note: 'მწუხრის ბოლოს — გარდამოხსნის გამოსვენება შუა ტაძარში', read: [{ src: { coll: 'x', n: 25, part: 4, from: /^დიდი პარასკევის მწუხრი/, label: 'დიდი პარასკევი · მწუხრი' } }] },
        { title: 'მცირე სერობა — ღვთისმშობლის გოდების კანონი', who: ['reader', 'choir'], note: 'საღამოს', extras: [x25(1, 'მცირე სერობის ჟამნი')] },
      ] },
      { id: 'matins', title: 'ცისკარი — 12 ვნების სახარება', when: 'დიდ ხუთშაბათს საღამოს', steps: [
        { title: 'ვნების თორმეტი სახარება', who: ['priest', 'choir', 'reader'], note: PASSION_GOSPELS.map((g, i) => `${i + 1}. ${g}`).join(' · '), hint: 'ყოველი სახარების წინ: „დიდება ვნებათა შენთა, უფალო“ — ყველას ანთებული სანთელი უჭირავს', read: [{ src: { coll: 'x', n: 25, part: 3, to: ROYAL, label: 'დიდი პარასკევი · ცისკარი' } }] },
      ] },
      { id: 'hours', title: 'სამეუფო ჟამები', when: 'დიდ პარასკევს, დილით', steps: [
        { title: 'პირველი, მესამე, მეექვსე და მეცხრე სამეუფო ჟამი', who: ['reader', 'priest'], note: 'ყოველ ჟამზე — წინასწარმეტყველება, სამოციქულო და სახარება', read: [{ src: { coll: 'x', n: 25, part: 3, from: ROYAL, label: 'სამეუფო ჟამები' } }] },
        { title: 'სადილის ჟამი', who: ['reader'], read: [{ src: { coll: 'x', n: 25, part: 4, to: /^დიდი პარასკევის მწუხრი/, label: 'სადილის ჟამი' } }] },
      ] },
      { id: 'liturgy', title: 'წირვა', when: 'დიდი პარასკევი', steps: [
        { title: 'დიდ პარასკევს წირვა არ აღესრულება', who: ['reader'], note: 'დღის მსახურებანი — სამეუფო ჟამები და მწუხრი გარდამოხსნის გამოსვენებით' },
      ] },
    );
    return services;
  }
  // Holy Saturday: matins with the lamentations on Friday evening, St Basil's liturgy with vespers, the midnight office
  services.push(
    { id: 'vespers', title: 'მწუხრი', when: 'წირვასთან ერთად', note: 'ბასილი დიდის ლიტურგიის ნაწილია — იხ. ჩანართი „წირვა“', steps: [{ title: 'მწუხრი ბასილი დიდის ლიტურგიასთან', who: ['reader', 'choir'], note: '15 საწინასწარმეტყველო საკითხავით — სრული რიგი ჩანართში „წირვა“', extras: some(tri) }] },
    { id: 'matins', title: 'ცისკარი — გოდება საფლავთან', when: 'დიდ პარასკევს საღამოს', steps: [
      P('„კურთხეულ არს ღმერთი ჩვენი“', [M.begin], { who: ['priest'] }),
      { title: 'ექვსფსალმუნება', who: ['reader'], read: [{ say: AMEN }, R(FIX.sixPsalms)] },
      { title: '„ღმერთი უფალი“ და ტროპარნი', who: ['choir'], note: '„კეთილმსახური იოსებ“ · „რაჟამს შთახვედ სიკვდილად“ · „მენელსაცხებლეთა“', read: [hymns('matins')], extras: some(tri) },
      { title: 'ფსალმუნი 118 — ქებანი (გოდება)', who: ['choir', 'reader'], note: 'სამ დასად, ქებებით — გარდამოხსნის წინ', hint: 'ბოლოს: „გუნდნი ანგელოზთანი“' },
      { title: 'კანონი — „ღელვითა ზღვისაითა“', who: ['choir', 'reader'], note: 'ბეჭდურ ტრიოდიონშია — აპში ჯერ არ არის' },
      { title: 'ქებანი, დიდი დიდებამაღალიანი და გარდამოხსნის ლიტანიობა', who: ['choir', 'priest'], note: 'ტაძრის გარშემო სამგზის', extras: [{ kind: 'text', src: FIX.greatDoxology, label: FIX.greatDoxology.label }] },
      { title: 'წინასწარმეტყველება, სამოციქულო და სახარება', who: ['reader', 'priest'], note: matinsGospel.map(r => `${r.name} ${r.ref}`).join(' · ') || 'ეზეკიელი 37:1–14 · 1 კორ. 5:6–8; გალ. 3:13–14 · მთ. 27:62–66', extras: readsOf(matinsGospel) },
      P('კვერექსები და განტევება', [M.dismissal], { who: ['priest', 'choir'] }),
    ] },
    { id: 'hours', title: 'ჟამები', when: 'წირვის წინ', steps: [{ title: 'მესამე, მეექვსე და მეცხრე ჟამი', who: ['reader'], read: [...hourRead(6, true), ...hourRead(7, false), ...hourRead(9, false)] }] },
    { id: 'liturgy', title: 'წირვა', when: 'ბასილი დიდისა, მწუხრთან ერთად', note: khareba, steps: [
      P('„კურთხეულ არს სუფევა“', [L.begin], { who: ['priest'] }),
      { title: 'ფსალმუნი 103 და დიდი კვერექსი', who: ['reader', 'deacon'], read: [R(FIX.come), R(FIX.ps103)] },
      { title: '„უფალო, ღაღად-ვყავ“', who: ['choir'], extras: some(text(FIX.lordICry, 'ფსალმუნები და მუხლები — ჟამნი')) },
      { title: 'შესვლა და „ნათელო მხიარულო“', who: ['priest', 'choir'], extras: some(text(FIX.gladLight)) },
      { title: '15 საწინასწარმეტყველო საკითხავი', who: ['reader', 'choir'], note: vespersText || 'დაბადებიდან დანიელამდე — მე-6 და მე-15 საკითხავზე გუნდი ჩასართავს გალობს', hint: 'მე-6-ის შემდეგ: „დიდებით იდიდა“ · მე-15-ის შემდეგ: „უფალსა უგალობდით“' },
      { title: '„რაოდენთა ქრისტეს მიერ ნათელ-იღეთ“', who: ['choir'], note: 'სამწმიდაოს ნაცვლად' },
      { title: 'სამოციქულო', who: ['reader'], note: apostle.map(r => `${r.name} ${r.ref}`).join(' · ') || 'რომ. 6:3–11', extras: readsOf(apostle) },
      { title: '„აღდეგ, ღმერთო, საჯე ქვეყანა“', who: ['choir'], note: '„ალილუიას“ ნაცვლად — ამ დროს მღვდელმსახურნი შავ შესამოსელს თეთრით იცვლიან' },
      { title: 'სახარება', who: ['deacon', 'priest'], note: gospel.map(r => `${r.name} ${r.ref}`).join(' · ') || 'მთ. 28:1–20', extras: readsOf(gospel) },
      { title: '„დადუმენ ყოველი ხორციელი“', who: ['choir'], note: 'ქერუბიმთა გალობის ნაცვლად' },
      { title: 'ზიარება და განტევება', who: ['choir', 'priest'], extras: [{ kind: 'prayer', id: 'ziarebis-tsin', label: 'ზიარების წინა ლოცვები' }] },
    ] },
  );
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
    { id: 'vespers', title: e === 0 ? 'სიყვარულის მწუხრი' : 'მწუხრი', when: e === 0 ? 'აღდგომის დღეს, შუადღის შემდეგ' : 'წინა საღამოს', note: `${e === 0 ? 'სახარება (ინ. 20:19–25) სხვადასხვა ენაზე იკითხება · ' : ''}ბრწყინვალე შვიდეული${greatFeastOf(inp.iso)?.id === 'khareba' ? ' · დღეს ხარებაც არის — მისი საგალობლები აღდგომისას ერთვის' : ''}${ownServicesOf(inp.iso).length ? ` · ${ownServicesOf(inp.iso).map(o => o.t).join(', ')} — საკუთარი განგება „დამატებით წიგნებშია“` : ''}`, steps: [
      { title: '„ქრისტე აღდგა“ — მუხლებით', who: ['priest', 'choir'], note: 'დავითნი არ იკითხება' },
      { title: '„უფალო ღაღად-ვყავ“ — აღდგომის დასდებელნი', who: ['choir'], extras: zt },
      { title: 'დიდი წარდგომა — „ვინ არს ღმერთი დიდ“', who: ['deacon', 'choir'] },
      { title: 'სტიხარონსა ზედა — „აღდგეს ღმერთი“', who: ['choir'] },
      { title: '„ქრისტე აღდგა“ და განტევება', who: ['choir', 'priest'] },
    ] },
    { id: 'matins', title: 'ცისკარი', when: e === 0 ? 'აღდგომის ღამეს' : 'დილით', steps: [
      ...(e === 0 ? [
        { title: 'შუაღამის ლოცვა — დიდი შაბათის კანონით', who: ['reader', 'choir', 'priest'] as Who[], note: 'შუაღამემდე; ბოლოს გარდამოხსნას საკურთხეველში შეასვენებენ' },
        { title: 'ლიტანიობა ტაძრის გარშემო', who: ['priest', 'choir'] as Who[], note: '„აღდგომასა შენსა, ქრისტე მაცხოვარ“ — ანთებული სანთლებით', hint: 'დაკეტილ კართან მღვდელი იწყებს: „დიდება წმიდასა…“ — „ქრისტე აღდგა“' },
      ] : []),
      { title: '„ქრისტე აღდგა“ — მუხლებით', who: ['priest', 'choir'], note: 'ექვსი ფსალმუნი არ იკითხება' },
      { title: 'აღდგომის კანონი — „აღდგომისა დღე არს“', who: ['choir'], extras: some(text({ coll: 'zatiki', n: 1, part: 0, from: /კანონი/, label: 'კანონი — ზატიკი' })) },
      { title: 'განმანათლებელი — „ხორციელად დაიძინე“', who: ['choir'] },
      { title: 'ქებანი და აღდგომის დასდებელნი', who: ['choir'], extras: zt },
      ...(e === 0 ? [{ title: 'იოანე ოქროპირის საკატეხიზმო სიტყვა', who: ['priest'] as Who[], note: 'მღვდელი კითხულობს; შემდეგ — ოქროპირის ტროპარი' }] : []),
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
