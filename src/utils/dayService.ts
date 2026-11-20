import type { CalendarDay } from '../data/churchCalendar';
import { FEAST_RULES, addDays, orthodoxEaster } from '../data/churchFeasts';
import { mainText, optionalReadingsOf, readingsOf, toneOf, type Reading } from './dayReadings';
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
const VIGIL_FIXED = new Set(['01-27', '05-06', '10-14', '11-23', '07-07', '07-12', '09-11', '12-19']);

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
  const m = re.exec(mainText(day));
  return m ? m[1].replace(/\s+/g, ' ').trim().replace(/[.;]\s*$/, '') : '';
};
/** the calendar's own word on the day's Liturgy — the first source, before any rule */
export type LiturgyNote = 'none' | 'presanctified' | 'basil' | 'chrysostom';
export const liturgyNoteOf = (day: CalendarDay | null | undefined): LiturgyNote | null => {
  if (!day) return null;
  const t = `\n${mainText(day)}`;
  if (/\n\s*ლიტურგია არ აღესრულება/.test(t)) return 'none';
  if (/\n\s*ლიტურგია პირველშეწირულისა/.test(t)) return 'presanctified';
  if (/ლიტურგია (?:წმ\. ?)?ბასილი დიდისა/.test(t)) return 'basil';
  if (/ლიტურგია (?:წმ\. ?)?იოანე [ოი]ქროპირისა/.test(t)) return 'chrysostom';
  return null;
};
/** the days whose vespers follows the hours — Lent's weekdays, Cheesefare's Wednesday and Friday, Holy Week: there the
 *  calendar's „მწუხრზე:“ names the day's own readings, not a feast's of the evening before */
const noonVespers = (iso: string) => {
  const e = easterOffset(iso), dow = dowOf(iso);
  return (e >= -48 && e <= -9 && dow >= 1 && dow <= 5) || e === -53 || e === -51 || (e >= -6 && e <= -1);
};
/** the calendar's vespers readings: `eve` — a feast's, read the evening before; `same` — the day's own, read after its hours */
export const vespersLinesOf = (iso: string, day: CalendarDay | null | undefined): { eve: string; same: string } => {
  const out = { eve: '', same: '' };
  if (!day) return out;
  const noon = noonVespers(iso);
  for (const line of mainText(day).split('\n')) {
    const m = /^\s*(ლიტ\.\s*)?მწუხ(?:რ(?:ზე|ად)?)?\.?\s*(რიგ\.?)?\s*:\s*(.+)$/.exec(line);
    if (!m) continue;
    const body = m[3].replace(/\s+/g, ' ').trim().replace(/[.;]\s*$/, '');
    if (/^(?:მთ|მკ|ლკ|ინ)\./.test(body)) continue; // a Gospel at vespers (Pascha's evening), not a prophecy
    // „მწუხრზე: წინამორბ.: 1) … 2) … 3) …“ — a saint's own readings even on such a day
    const feast = !m[1] && !m[2] && /^(?!დღის)[ა-ჰ0-9][ა-ჰ0-9 .]{1,24}:\s*1\)/.test(body);
    const key = noon && !feast ? 'same' : 'eve';
    out[key] = out[key] ? `${out[key]} · ${body}` : body;
  }
  return out;
};
export const vespersReadingsText = (iso: string, day: CalendarDay) => vespersLinesOf(iso, day).eve;
/** Lent's sixth hour: the prophecy the calendar names */
export const sixthHourReading = (day: CalendarDay | null | undefined) => (day ? lineOf(day, /(?:^|\n)[^\n]{0,8}VI ჟამზე\s*:\s*([^\n]+)/) : '');
/** Lent's weekdays know one festal rank below the Annunciation — the Forerunner's Head (24 February, old style) and the
 *  Forty Martyrs (9 March): matins with the polyeleos and its Gospel, the Presanctified with their Epistle and Gospel
 *  (the 2021 and 2026 calendars; „ჰიმნების ჩართვის წესი“ names the same two beside the temple's own day) */
export const lentPolyeleos = (iso: string) => ['02-24', '03-09'].includes(addDays(iso, -13).slice(5));

/** the rank the app guesses: a great feast, the temple's day, a Sunday, readings at vespers or a matins Gospel, a red saint */
export const guessRank = (iso: string, day: CalendarDay | null, patron: Patron | null): Rank => {
  if (greatFeastOf(iso)) return 'great';
  if (patron && patronDay(patron, iso) === iso) return 'vigil';
  if (VIGIL_FIXED.has(iso.slice(5))) return 'vigil';
  if (dowOf(iso) === 0) return 'vigil';
  if (!day) return 'simple';
  // Lent's weekday readings at vespers are the Triodion's, not a feast's
  const e = easterOffset(iso);
  const rs = readingsOf(day);
  const festal = !!vespersReadingsText(iso, day) || rs.some(r => r.label === 'ცისკ');
  // a Lent weekday: a red saint is still a weekday there (ჟამნი); only the Head, the Forty Martyrs — or what the calendar
  // gives a matins Gospel — are served with the polyeleos
  if (e >= -48 && e <= -9 && dowOf(iso) >= 1 && dowOf(iso) <= 5) return lentPolyeleos(iso) || festal ? 'polyeleos' : 'simple';
  if (festal) return 'polyeleos';
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
/** when a service is served against its church day: 'prev' — the day before in daytime (a Lent evening's vespers joined to
 *  that morning's hours or liturgy), 'eve' — the evening before, 'night' — at midnight (Pascha's matins), 'day' — the day's
 *  morning, 'late' — the day's afternoon (Great Friday's and Pascha's own vespers), 'with' — inside the day's liturgy (its
 *  tab only points there) */
export type ServiceSlot = 'prev' | 'eve' | 'night' | 'day' | 'late' | 'with';
export interface Service { id: ServiceId; slot: ServiceSlot; title: string; when: string; steps: Step[]; note?: string }

export interface DayInput {
  iso: string;
  day: CalendarDay | null;
  tone: number | null;
  rank: Rank;
  patron: Patron | null;
  order?: TempleOrder;
  /** the day before: its calendar entry names the readings of a Lent evening and whether a liturgy took its vespers */
  prev?: CalendarDay | null;
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
/** Theophany's tide by the date: the calendar's words skip a day now and then — its Saturday and Sunday before and after
 *  have names of their own (in Georgia the leave-taking is on the 13th, old style: the 14th is St Nino's) */
const THEOPHANY_TIDE: Record<string, Tide['kind']> = {
  '01-15': 'fore', '01-16': 'fore', '01-17': 'fore', '01-20': 'after', '01-21': 'after', '01-22': 'after', '01-23': 'after', '01-24': 'after', '01-25': 'after',
};
export const feastTideOf = (day: CalendarDay | null, iso?: string): Tide | null => {
  if (!day) return null;
  const read = (name: string): Tide | null => {
    const kind = /წარგზავნ/.test(name) ? 'leave' : /შემდგომი დღესასწაულ|დღესასწაულის შემდგომ/.test(name) ? 'after' : /წინადღესასწაულ/.test(name) ? 'fore' : null;
    if (!kind) return null;
    const f = TIDE_FEASTS.find(t => t.re.test(name));
    const md = f && Object.keys(GREAT_FIXED).find(k => GREAT_FIXED[k].id === f.id);
    return md ? { kind, feast: GREAT_FIXED[md], md: oldOf(md) } : null;
  };
  for (const x of day.s) {
    // a name may hold two sentences („ჯვრის ამაღლების წინა შაბათი. …ამაღლების წინადღესასწაული“): each is read by itself
    for (const part of x.n.split('.')) { const t = read(part); if (t) return t; }
  }
  // the computed year may keep the tide's words in the day's text alone, outside its list of names
  for (const part of mainText(day).split(/[.;\n]/)) { const t = read(part); if (t) return t; }
  const k = iso ? THEOPHANY_TIDE[iso.slice(5)] : undefined;
  return k ? { kind: k, feast: GREAT_FIXED['01-19'], md: oldOf('01-19') } : null;
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
  const tide = mv ? null : feastTideOf(inp.day, inp.iso);
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
const GLORY = 'დიდება მამასა და ძესა და წმიდასა სულსა, აწ და მარადის და უკუნითი უკუნისამდე, ამინ.';
const GLORY_ALLELUIA = `${GLORY} ალილუია, ალილუია, ალილუია, დიდება შენდა, ღმერთო (სამგზის).`;
const hourRead = (n: number, first: boolean, prev = false, kathisma?: number): Read[] => [
  ...(first ? [R(FIX.opening), R(FIX.twelve)] : [R(FIX.come)]),
  R(FIX.hourPsalms(n)),
  // the sixth and the ninth hour: the book writes this doxology into Lent's rubric, so it is said here
  ...(n === 7 || n === 9 ? [{ say: GLORY_ALLELUIA } as Read] : []),
  // Lent: the hour's kathisma after its psalms
  ...(kathisma ? [{ kathisma } as Read] : []),
  { hymns: 'hours', only: 'tr', prev },
  R(FIX.hourTheotokion(n)),
  R(FIX.trisagion),
  { hymns: 'hours', only: 'ko', prev },
  R(FIX.hourEnd(n)),
];
/** an hour on a Lent weekday (ჟამნი): the hour's own troparion with its verses and prostrations, Lent's verses for the kontakion */
const lentHourRead = (n: number, first: boolean, kathisma?: number, prophecy?: string): Read[] => [
  ...(first ? [R(FIX.opening), R(FIX.twelve)] : [R(FIX.come)]),
  R(FIX.hourPsalms(n)),
  ...(n === 7 || n === 9 ? [{ say: GLORY_ALLELUIA } as Read] : []),
  ...(kathisma ? [{ kathisma } as Read] : []),
  R(FIX.hourLentTroparion(n)),
  R(FIX.hourTheotokion(n)),
  ...(prophecy ? [{ say: `წინასწარმეტყველების ტროპარი და წარდგომა — მარხვანიდან · საკითხავი: ${prophecy} · მეორე წარდგომა` } as Read] : []),
  R(FIX.trisagion),
  R(FIX.hourLentVerses(n)),
  R(FIX.hourEnd(n)),
];
/** St Ephrem's prayer: with all sixteen prostrations on a plain Lent day, with three where a feast is kept */
const SIXTEEN = '16 მეტანიით — სამი დიდი, თორმეტი მცირე და ერთი დიდი';
const THREE = 'სამი დიდი მეტანიით';
const ephremStep = (note: string): Step => ({ title: 'ეფრემ ასურის ლოცვა', who: ['priest'], note, extras: some({ kind: 'prayer', id: 'efrem-asuri', label: 'ეფრემ ასურის ლოცვა' }, text(FIX.ephrem, 'მეტანიების რიგი — ჟამნი')) });
/** the Triodion's three-ode canons: the odes they are sung on, Monday … Friday („ჰიმნების ჩართვის წესი“) */
const TRIODES = ['', 'I, VIII და IX', 'II, VIII და IX', 'III, VIII და IX', 'IV, VIII და IX', 'V, VIII და IX'];

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
  const { iso, day, tone } = inp;
  const order = inp.order ?? DEFAULT_ORDER;
  const dow = dowOf(iso);
  const sunday = dow === 0;
  const great = greatFeastOf(iso);
  const season = seasonOf(iso);
  if (season.bright) return brightWeek(inp, season.e);
  if (season.holyWeek) return holyWeek(inp, season.e);
  /** the calendar's own word on the Liturgy goes before the rules */
  const litNote = liturgyNoteOf(day);
  /** Cheesefare's Wednesday and Friday: no Liturgy, the day goes in Lent's way (the calendar: „ლიტურგია არ აღესრულება“) —
   *  unless a feast with the polyeleos falls there */
  const cheese = (season.e === -53 || season.e === -51) && !great && !atLeast(inp.rank, 'polyeleos') && litNote !== 'chrysostom' && litNote !== 'basil';
  /** a Lent weekday kept as such, or a day served in its way */
  const lentDay = (season.lentWeekday && !great) || cheese;
  /** the Annunciation on a Lent weekday: the hours and the endings stay Lent's, the Liturgy is joined to vespers */
  const annunLent = season.lentWeekday && great?.id === 'khareba';
  // a Lent weekday has no rank of the great doxology: a red saint is served there as on a weekday (ჟამნი)
  const rank: Rank = lentDay && inp.rank === 'doxology' ? 'simple' : inp.rank;
  const vigilDay = atLeast(rank, 'vigil'); // Sunday, a vigil saint, a great feast
  const big = atLeast(rank, 'polyeleos');
  const dox = atLeast(rank, 'doxology');
  const festal = big || sunday; // the great vespers, with the entrance
  /** a plain Lent weekday — and one with a feast kept in it (the Head, the Forty Martyrs, the temple's day, the Annunciation) */
  const lentPlain = lentDay && !big;
  const lentFeast = (lentDay && big) || annunLent;
  /** vespers and matins served together in the evening (never in Lent: there vespers follows the hours) */
  // Christmas' and Theophany's vigil is Great Compline with matins whatever the temple's custom
  const joined = !lentDay && !annunLent && (iso.slice(5) === '01-07' || iso.slice(5) === '01-19' || (vigilDay ? order.sat !== 'apart' : order.weekday === 'joined'));
  /** matins follow the evening's service: vespers — or, at the Annunciation in Lent, Great Compline */
  const joinedM = joined || annunLent;
  const litya = vigilDay && order.sat === 'litya' && !annunLent;
  const readings = day ? readingsOf(day) : [];
  const lines = vespersLinesOf(iso, day);
  /** a feast's readings of the evening before · the day's own, read after its hours (Lent) · Lent's prophecy at the sixth hour */
  const vespersText = lines.eve, noonText = lines.same;
  const sixth = sixthHourReading(day);
  const ownGospel = readings.filter(r => r.label === 'ცისკ');
  // a saint the calendar leaves to the superior („თუ უპირატესი ინებებს…“): once the reader picks the polyeleos for the day,
  // the matins Gospel its note names is the one to read
  const matinsGospel = ownGospel.length || !big || !day ? ownGospel : optionalReadingsOf(day).filter(r => /ცისკ/.test(r.label)).slice(0, 1);
  const liturgy = readings.filter(r => r.label !== 'ცისკ' && r.label !== 'მწუხრ');
  const apostle = liturgy.filter(r => r.apostle);
  const gospel = liturgy.filter(r => !r.apostle);
  const toneTxt = tone ? `ხმა ${tone}` : 'კვირის ხმა';
  const eveDow = (dow + 6) % 7;
  const kind = great ? 0 : saintKindOfDay(day);
  const gospelNo = day ? gospelNumberOf(mainText(day).match(/ცისკ[^\n]*/)?.[0] ?? '') : null;
  const zatiki = season.paschal || (season.e >= 39 && season.e <= 56) ? pentecostarion(season.e) : null;
  const lentText = season.e >= -70 && season.e < 0 ? text({ coll: 'jamni', n: 25, part: 0, label: 'ჟამნი · მარხვანი' }, 'ტროპარ-კონდაკი — ჟამნი · მარხვანი') : null;
  const own = ownServicesOf(iso);
  const ownBooks = own.map(b => xbook(b.n, `საკუთარი განგება — ${b.t}`));
  /** the extra books for Lent's Saturdays (the school's PDFs, „დამატებითი წიგნები“) */
  const lentSat = [-36, -29, -22].includes(season.e) ? xbook(23, 'განგება — დიდი მარხვის შაბათები') : season.akathist ? xbook(24, 'განგება — დაუჯდომლის შაბათი') : null;
  const christIsRisen = season.paschal;
  /** the Cross is venerated at the first hour on the fourth week's Monday and Wednesday (the official calendar) */
  const crossAtFirstHour: Step[] = season.e === -27 || season.e === -25
    ? [{ title: 'ჯვრის თაყვანისცემა', who: ['priest', 'choir'], note: 'პირველი ჟამის ბოლოს', hint: '„ჯუარსა შენსა თაყუანის-ვსცემთ, მეუფეო“ — მუხლმოდრეკით' }] : [];
  const V = PRIEST.vespers, M = PRIEST.matins, L = PRIEST.liturgy;

  // ----- vespers -----
  const eveE = season.e - 1;
  /** the evening is a Lent weekday's: its vespers followed that day's hours */
  const eveLent = eveE >= -48 && eveE <= -9 && eveDow >= 1 && eveDow <= 5;
  /** Cheesefare from Tuesday evening: vespers already ends with Lent's prostrations (the Triodion) */
  const eveCheese = eveE >= -54 && eveE <= -51;
  /** the evening's vespers are the Triodion's and end in Lent's way */
  const lentEve = (!great || annunLent) && (eveLent || !!season.lentSundayEve || eveCheese);
  /** … and came straight after the hours and the typika, with no blessing of their own */
  const afterHours = eveLent || eveE === -53 || eveE === -51;
  const prevNote = liturgyNoteOf(inp.prev);
  /** … joined to a liturgy there (the Presanctified, the Annunciation's): nothing is served apart */
  const eveLiturgy = lentEve && eveLent && (inp.prev
    ? prevNote === 'presanctified' || prevNote === 'chrysostom' || (prevNote !== 'none' && (eveDow === 3 || eveDow === 5 || eveE === -17))
    : eveDow === 3 || eveDow === 5 || eveE === -17 || greatFeastOf(addDays(iso, -1))?.id === 'khareba');
  /** the readings of that evening: the calendar names them under the day before */
  const eveReadings = afterHours ? vespersLinesOf(addDays(iso, -1), inp.prev).same : '';
  const k = vespersKathisma(iso, rank);
  const psDay = lentPsalter(season.e);
  /** Lent's vespers (ჟამნი: the troparia with prostrations, St Ephrem's prayer; the stichera are in the printed Triodion) */
  const lentVespers = (): Step[] => {
    const s: Step[] = [];
    // Cheesefare's Friday evening: Saturday keeps all the venerable Fathers (the Triodion's own service, with „ღმერთი უფალი“)
    const fathers = eveE === -51 && !big;
    const feast = annunLent ? 'ხარებისა' : big ? 'წმიდანისა' : fathers ? 'ღირს მამათა' : '';
    const entrance = !!season.lentSundayEve || annunLent;
    const kLent = lentPsalter(eveE)?.v ?? (typeof k === 'number' && !eveLent && !season.lentSundayEve ? k : null);
    if (afterHours) s.push({ title: 'მწუხრი ჟამებს მოსდევს', who: ['reader'], note: 'სადილის ჟამის შემდეგ — მღვდლის ასამაღლებლის გარეშე, მაშინვე „მოვედით, თაყვანის-ვსცეთ“' });
    else {
      s.push(P('„კურთხეულ არს ღმერთი ჩვენი“', [V.begin], { who: ['priest'] }));
      s.push({ title: 'მეცხრე ჟამი', who: ['reader'], note: 'ტროპარი და კონდაკი — წინა დღისა', hint: 'მღვდლის „კურთხეულ არს“-ის შემდეგ იწყებ', read: hourRead(9, true, true), extras: [book(BOOK.hour9)] });
    }
    s.push({ title: '„მოვედით, თაყვანის-ვსცეთ“ და ფსალმუნი 103', who: ['reader'], note: 'იკითხება', read: [R(FIX.come), R(FIX.ps103), { say: GLORY_ALLELUIA }], chants: ['mw-2', 'mw-3'] });
    s.push(P('დიდი კვერექსი', [V.great], { hint: 'ამ დროს მღვდელი საიდუმლოდ კითხულობს სანთლის ლოცვებს', chants: ['mw-4'] }));
    if (kLent) {
      s.push({ title: `დავითნის კანონი ${kLent}`, who: ['reader'], read: [{ kathisma: kLent }] });
      s.push(P('მცირე კვერექსი', [V.small], { chants: ['mw-6'] }));
    } else if (k === 'first' && eveCheese) {
      // Cheesefare's week still has the ordinary Psalter: a saint with the polyeleos takes „ნეტარ არს კაცი“
      s.push({ title: '„ნეტარ არს კაცი“ — კანონი 1-ის პირველი დიდება', who: ['choir'], extras: [{ kind: 'kathisma', n: 1 }], chants: ['mw-5'] });
      s.push(P('მცირე კვერექსი', [V.small], { chants: ['mw-6'] }));
    }
    s.push({
      title: '„უფალო, ღაღად-ვყავ“ და დასდებელნი', who: ['choir'],
      note: fathers ? 'მარხვანისა — ღირს მამათა' : feast ? `მარხვანისა და ${feast}` : season.lentSundayEve ? `10 მუხლად: სინანულისანი (${toneTxt} · პარაკლიტონი), მარხვანისა და წმიდანისა` : '6 მუხლად: 3 მარხვანისა, 3 წმიდანისა',
      hint: annunLent ? '„დიდება… აწდა“ — ხარებისა' : 'მარხვანის დასდებელნი ბეჭდურ წიგნშია · „დიდება… აწდა“ — ღვთისმშობლისა',
      extras: some(text(FIX.lordICry, 'ფსალმუნები და მუხლები — ჟამნი'), ...ownBooks, lentText, !annunLent && text(menaion(kind, 'stichera'), 'დასდებელნი — წმიდანისა (საზიარო)')),
      chants: ['mw-7', 'mw-8', 'mw-9'], toned: true,
    });
    if (entrance) s.push(P('შესვლა საცეცხლურით — „სიბრძნით აღემართენით“', [V.entrance], { who: ['priest', 'deacon'] }));
    s.push(entrance
      ? { title: '„ნათელო მხიარულო“', who: ['choir'], extras: some(text(FIX.gladLight)), chants: ['mw-12'] }
      : { title: '„ნათელო მხიარულო“', who: ['reader'], note: 'იკითხება', read: [R(FIX.gladLight)], chants: ['mw-12'] });
    if (season.lentSundayEve) s.push({ title: 'დიდი წარდგომა', who: ['deacon', 'choir'], note: 'მარხვის კვირა საღამოს — დიდი წარდგომა, ხმა 8', hint: season.forgiveness ? 'მუხლებით · ამ საღამოდან მწუხრი მარხვის წესით მთავრდება' : 'მუხლებით · ორი დიდი წარდგომა კვირაობით ენაცვლება ერთმანეთს', pt: [V.prokeimenon], extras: some(text({ coll: 'jamni', n: 25, part: 0, after: ((season.e + 48) / 7) % 2 === 0 ? /^კვირიაკესა ყველიერისასა/ : /^პირველსა კვირიაკესა წმიდათა მარხვათასა/, find: /წარდგომა დიდი/, until: /^(ხოლო წარდგომანი|უწყებულ|პირველსა შაბათსა|კვირიაკესა მეორესა)/, label: 'დიდი წარდგომა — ჟამნი' })), chants: ['mw-13'] });
    else if (afterHours) s.push({
      title: 'წარდგომა და საკითხავები', who: ['deacon', 'choir', 'reader'],
      note: eveReadings || (eveLent ? 'დაბადებისა და იგავთა — წინა დღის კალენდრით' : 'წინასწარმეტყველებისა — წინა დღის კალენდრით'),
      hint: 'ორი წარდგომა მარხვანიდან: პირველის შემდეგ — პირველი საკითხავი, მეორის შემდეგ — მეორე', pt: [V.prokeimenon],
    });
    else s.push({ title: 'წარდგომა', who: ['deacon', 'choir'], note: season.kneeling ? 'დიდი წარდგომა — „ვინ არს ღმერთი დიდ“' : `${WEEKDAY_GEN[eveDow]} საღამოსი — ${VESPERS_PROKEIMENON[eveDow]}`, pt: [V.prokeimenon], extras: some(!season.kneeling && text(FIX.eveProkeimenon(eveDow), 'წარდგომა და მუხლები')), chants: ['mw-13'] });
    if (vespersText) s.push({ title: annunLent ? 'ხარების საკითხავები' : 'წმიდანის საკითხავები', who: ['reader'], note: vespersText, hint: season.lentSundayEve ? undefined : 'დღის საკითხავების შემდეგ', extras: some(text(menaion(kind, 'readings'), 'ტექსტი — საზიარო საკითხავები')) });
    s.push({ title: '„ღირს მყვენ ჩვენ, უფალო“', who: ['reader'], note: 'იკითხება', read: [R(FIX.vouchsafe)] });
    s.push(P('თხოვნითი კვერექსი', [V.supplication], { chants: ['mw-16'] }));
    s.push({
      title: 'სტიქარონსა ზედა დასდებელნი', who: ['choir'], note: fathers ? 'მარხვანისა' : feast ? `მარხვანისა · „დიდება… აწდა“ — ${feast}` : 'მარხვანისა',
      hint: 'ჩასართავი მუხლები — ჟამნიდან: „შენდამი აღვიხილენ“, „მიწყალენ ჩვენ, უფალო“', extras: some(text(FIX.eveVerses, 'ჩასართავი მუხლები — ჟამნი'), lentText),
    });
    s.push({ title: '„აწ განუტევე“ და სამწმიდაო', who: ['reader'], hint: '„მამაო ჩვენოს“ შემდეგ მღვდელი: „რამეთუ შენი არს სუფევა“ — შენ: „ამინ“', read: [R(FIX.nunc), R(FIX.trisagion)], chants: ['mw-19'] });
    if (feast) {
      // a feast kept in Lent: its troparion, the litany and three prostrations (the Typikon's Annunciation chapters)
      s.push({ title: 'ტროპარი', who: ['choir'], note: annunLent ? 'ხარებისა' : `${feast} · „დიდება… აწდა“ — ღვთისმშობლისა`, extras: [{ kind: 'troparia', at: 'vespers' }] });
      s.push(P('მრჩობლი კვერექსი', [V.augmented], { chants: ['mw-15'] }));
      s.push(ephremStep(THREE));
    } else {
      s.push({
        title: 'მარხვის ტროპარნი — „ღვთისმშობელო ქალწულო, გიხაროდენ“', who: ['choir', 'reader'], note: 'ყოველი ტროპარის შემდეგ — მეტანია',
        hint: 'შემდეგ — „უფალო, შეგვიწყალენ“ 40-გზის და „ზეცათა მეუფეო“', read: [R(FIX.lentEveTroparia)],
      });
      s.push(ephremStep(season.lentSundayEve ? THREE : eveCheese ? 'მეტანიებით' : SIXTEEN));
      if (eveLent) s.push({
        title: 'სამწმიდაო და „იყავნ სახელი უფლისა“', who: ['reader', 'choir'], note: '„უფალო, შეგვიწყალენ“ 12-გზის · „წმიდაო სამებაო“ · „იყავნ სახელი უფლისა“ სამგზის · ფსალმუნი 33',
        read: [R(FIX.trisagion), R(FIX.lentEveClose), R(FIX.typikaEnd)],
      });
    }
    s.push(P('განტევება', [M.dismissal], { who: ['priest', 'choir'], chants: ['mw-21'] }));
    if (season.forgiveness) s.push({ title: 'მიტევების წესი', who: ['priest', 'reader', 'choir'], note: 'მწუხრის შემდეგ ყველანი ერთმანეთს შენდობას სთხოვენ', hint: '„შემინდე მე, ცოდვილსა“ — „ღმერთმან შეგინდოს“ · ამ დროს იგალობება აღდგომის დასდებელნი' });
    return s;
  };
  const v: Step[] = [];
  if (eveLiturgy) v.push({
    title: 'მწუხრი გუშინდელ წირვასთან ერთად აღესრულა', who: ['reader'],
    note: prevNote === 'chrysostom' ? 'გუშინ ხარების წირვა მწუხრით დაიწყო — ცალკე მწუხრი არ სრულდება' : 'გუშინ წინასწარ კურთხეულთა წირვა იყო: მწუხრი მისი პირველი ნაწილია — ცალკე არ სრულდება',
    hint: 'რიგი — გუშინდელი დღის ჩანართში „წირვა“',
  });
  else if (lentEve) v.push(...lentVespers());
  else {
    v.push(P('„კურთხეულ არს ღმერთი ჩვენი“', [V.begin], { who: ['priest'], hint: vigilDay && joined ? 'ღამისთევაზე: „აღსდეგით!“ და „დიდება წმიდასა“ — „მოვედით, თაყვანის-ვსცეთ“' : undefined }));
    if (christIsRisen) v.push({ title: '„ქრისტე აღდგა“ — სამგზის', who: ['priest', 'choir'], note: 'აღდგომის წარგზავნამდე მსახურება ასე იწყება' });
    if (!(vigilDay && joined)) v.push({ title: 'მეცხრე ჟამი', who: ['reader'], note: 'ტროპარი და კონდაკი — წინა დღის წმიდანისა', hint: 'მღვდლის „კურთხეულ არს“-ის შემდეგ იწყებ', read: hourRead(9, true, true), extras: [book(BOOK.hour9)] });
    v.push(festal
      ? { title: '„მოვედით, თაყვანის-ვსცეთ“ და ფსალმუნი 103', who: ['choir'], note: 'დიდ მწუხრზე იგალობება', extras: some(text(FIX.ps103), book(sunday ? BOOK.sunVespers : BOOK.dayVespers)), chants: ['mw-2', 'mw-3'] }
      : { title: '„მოვედით, თაყვანის-ვსცეთ“ და ფსალმუნი 103', who: ['reader'], note: 'იკითხება', read: [R(FIX.come), R(FIX.ps103), { say: 'დიდება მამასა და ძესა და წმიდასა სულსა, აწ და მარადის და უკუნითი უკუნისამდე, ამინ. ალილუია, ალილუია, ალილუია, დიდება შენდა, ღმერთო (სამგზის).' }], chants: ['mw-2', 'mw-3'] });
    v.push(P('დიდი კვერექსი', [V.great], { hint: 'ამ დროს მღვდელი საიდუმლოდ კითხულობს სანთლის ლოცვებს', chants: ['mw-4'] }));
    if (k === 'first') v.push({ title: '„ნეტარ არს კაცი“ — კანონი 1-ის პირველი დიდება', who: ['choir'], note: 'დღესასწაულის წინა საღამოს — იგალობება', extras: [{ kind: 'kathisma', n: 1 }], chants: ['mw-5'] });
    else if (k === 1) v.push({ title: 'დავითნის კანონი 1 — „ნეტარ არს კაცი“', who: ['choir', 'reader'], note: 'შაბათ საღამოს — მთელი კანონი', read: [{ kathisma: 1 }], chants: ['mw-5'] });
    else if (k) v.push({ title: `დავითნის კანონი ${k}`, who: ['reader'], hint: 'თუ წინა დღეს ღამისთევა იყო, კანონი არ იკითხება', read: [{ kathisma: k }] });
    if (k) v.push(P('მცირე კვერექსი', [V.small], { chants: ['mw-6'] }));
    if (season.kneeling) v.push({ title: 'მუხლმოდრეკის ლოცვები', who: ['priest'], note: 'სულთმოფენობის საღამოს — სამი ლოცვა მუხლმოდრეკით' });
    v.push({
      title: '„უფალო, ღაღად-ვყავ“ და დასდებელნი', who: ['choir'],
      note: great ? 'დღესასწაულის დასდებელნი' : zatiki ? 'ზატიკის დასდებელნი' : sunday ? `${toneTxt} · 10 მუხლად: აღდგომისანი და წმიდანისა` : dox ? '6 მუხლად — წმიდანისა' : `${toneTxt} · 6 მუხლად: 3 პარაკლიტონისა, 3 წმიდანისა`,
      hint: sunday ? '„დიდება“ — წმიდანისა · „აწდა“ — კვირის ხმის დოგმატიკონი' : dox ? '„დიდება“ — წმიდანისა · „აწდა“ — დოგმატიკონი „დიდების“ ხმაზე' : '„დიდება“ — წმიდანისა · „აწდა“ — ღვთისმშობლისა, შვიდეულის დღისა („დიდების“ ხმაზე)',
      extras: some(
        text(FIX.lordICry, 'ფსალმუნები და მუხლები — ჟამნი'),
        ...ownBooks, lentSat,
        !great && text(zatiki, `ტექსტი — ${zatiki?.label}`),
        !great && !zatiki && (sunday || !dox) && text(octoechos(tone, eveDow, 'stichera'), `დასდებელნი — პარაკლიტონი`),
        !great && !zatiki && text(menaion(kind, 'stichera'), 'დასდებელნი — წმიდანისა (საზიარო)'),
      ),
      chants: ['mw-7', 'mw-8', ...(sunday ? ['mw-10'] : ['mw-9'])], toned: true,
    });
    if (festal) v.push(P('შესვლა საცეცხლურით — „სიბრძნით აღემართენით“', [V.entrance], { who: ['priest', 'deacon'] }));
    v.push(festal
      ? { title: '„ნათელო მხიარულო“', who: ['choir'], extras: some(text(FIX.gladLight)), chants: ['mw-12'] }
      : { title: '„ნათელო მხიარულო“', who: ['reader'], note: 'იკითხება', read: [R(FIX.gladLight)], chants: ['mw-12'] });
    v.push({ title: 'წარდგომა', who: ['deacon', 'choir'], note: season.kneeling ? 'დიდი წარდგომა — „ვინ არს ღმერთი დიდ“' : `${WEEKDAY_GEN[eveDow]} საღამოსი — ${VESPERS_PROKEIMENON[eveDow]}`, pt: [V.prokeimenon], extras: some(!season.kneeling && text(FIX.eveProkeimenon(eveDow), 'წარდგომა და მუხლები')), chants: ['mw-13'] });
    if (vespersText) v.push({ title: 'საწინასწარმეტყველო საკითხავები', who: ['reader'], note: vespersText, extras: some(big && text(menaion(kind, 'readings'), 'ტექსტი — საზიარო საკითხავები')) });
    if (festal) v.push(P('მრჩობლი კვერექსი', [V.augmented], { chants: ['mw-15'] }));
    v.push({ title: '„ღირს მყვენ ჩვენ, უფალო“', who: ['reader'], note: 'იკითხება', read: [R(FIX.vouchsafe)] });
    v.push(P('თხოვნითი კვერექსი', [V.supplication], { chants: ['mw-16'] }));
    if (litya) v.push({ title: 'ლიტია', who: ['choir', 'priest', 'deacon'], note: 'ტაძრის წმიდანისა და დღისა დასდებელნი', pt: [V.litya], extras: some(!sunday && text(menaion(kind, 'litya'), 'ტექსტი — ლიტიისა (საზიარო)')) });
    v.push({
      title: 'სტიქარონსა ზედა დასდებელნი', who: ['choir'],
      note: great ? 'დღესასწაულისანი' : sunday ? `${toneTxt} · აღდგომისანი` : dox ? 'წმიდანისანი — თავისი ჩასართავებით' : `${toneTxt} · პარაკლიტონისანი`,
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
    else v.push({ title: 'ტროპარნი', who: ['reader'], note: 'წმიდანის ტროპარი · „დიდება… აწდა“ — ღვთისმშობლისა', read: [{ hymns: 'vespers' }] });
    if (!festal) v.push(P('მრჩობლი კვერექსი', [M.augmented], { chants: ['mw-15'] }));
    if (litya) v.push(P('ხუთი პურის კურთხევა', [V.bread, V.blessing], { who: ['priest', 'choir'], hint: '„იყავნ სახელი უფლისა“ (სამგზის) და ფსალმუნი 33 — „ვაკურთხო უფალი“', extras: some(text(FIX.typikaEnd)) }));
    if (joined) v.push({ title: 'ცისკარი იწყება', who: ['reader'], note: 'განტევება არ ითქმის — მწუხრს ცისკარი მოსდევს, ექვსფსალმუნებიდან', hint: 'გადადი ჩანართზე „ცისკარი“' });
    else v.push(P('განტევება', [M.dismissal], { who: ['priest', 'choir'], hint: '„სიბრძნით“ — „გვაკურთხენ“ · „უპატიოსნესსა“ · „დიდება, აწდა. უფალო, შეგვიწყალენ (3). გვაკურთხენ“', chants: ['mw-21'] }));
  }
  if (season.departed) v.push({ title: 'პარასტასი — დიდი პანაშვიდი', who: ['priest', 'choir', 'reader'], note: 'მიცვალებულთა შაბათის წინა საღამოს, მწუხრის შემდეგ', extras: [book({ coll: 'kurtxevani', n: 16, label: 'კურთხევანი · დიდი პანაშვიდი' })] });

  // ----- matins -----
  const mk = matinsKathismas(iso, rank);
  /** a Lent weekday's matins as ჟამნი sets them: „ალილუია“, the Triodion's canon, no sung doxology — and no dismissal
   *  before the first hour */
  const lentMatins = (): Step[] => {
    const s: Step[] = [];
    s.push(P('„კურთხეულ არს ღმერთი ჩვენი“', [M.begin], { who: ['priest'] }));
    s.push({ title: 'ფსალმუნები 19 და 20', who: ['reader'], hint: 'ამ დროს მღვდელი ტაძარს აკმევს', read: [{ say: AMEN }, R(FIX.come), R(FIX.royal), { say: 'დიდება მამასა და ძესა და წმიდასა სულსა, აწ და მარადის და უკუნითი უკუნისამდე, ამინ.' }, R(FIX.trisagion), R(FIX.royalTroparia)], extras: [book(BOOK.dayMatins)] });
    s.push(P('მოკლე მრჩობლი კვერექსი', [M.short, M.glory], { hint: 'ბოლოს: „სახელითა უფლისათა გვაკურთხენ, მამაო“ — მღვდელი: „დიდება წმიდასა…“' }));
    s.push({ title: 'ექვსფსალმუნება', who: ['reader'], note: 'ფს. 3, 37, 62, 87, 102, 142', hint: 'კრძალვით, აუჩქარებლად — ტაძარში ჩუმად ისმენენ; მღვდელი ამ დროს ცისკრის ლოცვებს კითხულობს', read: [{ say: AMEN }, R(FIX.sixPsalms)] });
    s.push(P('დიდი კვერექსი', [M.great], { chants: ['ck-2'] }));
    s.push({
      title: '„ალილუია“ და სამების საგალობლები', who: ['choir', 'reader'], note: `„ღმერთი უფალის“ ნაცვლად · ${toneTxt}`,
      hint: 'ოთხი მუხლი, ყოველზე „ალილუია“ სამგზის · შემდეგ ხმის სამი საგალობელი — ბოლო სიტყვები დღის მიხედვით იცვლება',
      read: [R(FIX.alleluiaVerses), ...(tone ? [R(FIX.triadic(tone))] : []), R(FIX.triadicEnds)], extras: some(lentText),
    });
    mk.forEach((n, i) => {
      s.push({ title: `დავითნის კანონი ${n}`, who: ['reader'], read: [{ kathisma: n }] });
      s.push({
        title: `წარდგომა — კანონი ${n}-ის შემდეგ`, who: ['choir', 'reader'], note: i === 0 ? `${toneTxt} · პარაკლიტონიდან` : 'მარხვანისა — ბეჭდურ წიგნშია',
        extras: i === 0 ? some(text(octoechos(tone, eveDow, 'sedalens'), 'წარდგომანი — პარაკლიტონი')) : undefined,
      });
    });
    s.push({ title: 'ფსალმუნი 50', who: ['reader'], read: [R(FIX.ps50)] });
    s.push({
      title: 'კანონი', who: ['choir', 'reader'],
      note: season.greatCanon ? 'ანდრია კრიტელის დიდი კანონი — სრულად, მარიამ მეგვიპტელის ცხოვრების კითხვით' : `წმიდანისა და მარხვანის სამსაგალობელი — ${TRIODES[dow]} გალობაზე`,
      hint: season.greatCanon ? 'ყოველ ტროპარზე — „მიწყალე მე, ღმერთო, მიწყალე მე“ და მეტანია' : 'ბიბლიური გალობები („ჰიმნები“) იკითხება · სამსაგალობლის გალობებზე კატავასიად მისი ძლისპირი იგალობება · მე-3-ის შემდეგ — წარდგომა, მე-6-ის შემდეგ — კონდაკი ან სამოწამე',
      extras: some(
        ...ownBooks,
        ...(season.greatCanon ? [1, 2, 3, 4].map(n => text({ coll: 'kriteli', n, part: 0, label: 'ანდრია კრიტელი' }, `დიდი კანონი — ${['', 'ორშაბათისა', 'სამშაბათისა', 'ოთხშაბათისა', 'ხუთშაბათისა'][n]} ნაწილი`)) : []),
        lentText,
        text(menaion(kind, 'canon'), 'კანონი — წმიდანისა (საზიარო)'),
      ),
    });
    s.push({ title: '„ადიდებს სული ჩემი უფალსა“ — „უპატიოსნესსა“', who: ['choir'], note: 'მე-8 გალობის შემდეგ', extras: some(text(FIX.magnificat)), chants: ['ck-20', 'ck-21'] });
    s.push({ title: '„ღირს არს ჭეშმარიტად“', who: ['choir', 'reader'], note: 'მე-9 გალობის შემდეგ — მეტანიით' });
    s.push(P('მცირე კვერექსი', [M.afterNine]));
    s.push({ title: 'განმანათლებელი', who: ['choir', 'reader'], note: `მარხვისა — ${toneTxt} · სამგზის`, hint: 'ბოლო სიტყვები დღის მიხედვით იცვლება — როგორც სამების საგალობლებში', read: tone ? [R(FIX.lentPhotagogikon(tone))] : undefined, chants: ['ck-a16-131'] });
    s.push({ title: 'ქებანი — „აქებდით უფალსა ცათაგან“', who: ['reader'], note: 'იკითხება, დასდებლების გარეშე', read: [R(FIX.praises)] });
    s.push({ title: '„შენდა დიდება შვენის“ და დიდებამაღალიანი', who: ['reader'], note: 'ყოველდღიური — იკითხება', read: [{ say: GLORY }, R(FIX.dailyDoxology)] });
    s.push(P('თხოვნითი კვერექსი', [M.supplication], { chants: ['ck-27'] }));
    s.push({ title: '„აღვივსენით“-სა ზედა დასდებელნი', who: ['choir', 'reader'], note: 'მარხვანისა — ბეჭდურ წიგნშია', hint: 'ჩასართავი მუხლები — ჟამნიდან · „დიდება… აწდა“ — ღვთისმშობლისა', extras: some(text(FIX.mornVerses, 'ჩასართავი მუხლები — ჟამნი'), lentText) });
    s.push({ title: '„კეთილ არს აღსარებად უფლისა“ და სამწმიდაო', who: ['reader'], hint: '„მამაო ჩვენოს“ შემდეგ მღვდელი: „რამეთუ შენი არს სუფევა“ — შენ: „ამინ“', read: [R(FIX.goodToConfess), R(FIX.trisagion)] });
    s.push({
      title: '„ტაძარსა ამას დიდებისა შენისასა მდგომარენი“', who: ['reader'], note: 'შემდეგ — „უფალო, შეგვიწყალენ“ 40-გზის და „ზეცათა მეუფეო“',
      hint: 'მარხვაში მრჩობლი კვერექსი და განტევება აქ არ არის', read: [R(FIX.lentMatinsEnd)],
    });
    s.push(ephremStep(cheese ? 'მეტანიებით' : SIXTEEN));
    s.push({
      title: 'პირველი ჟამი', who: ['reader'], note: `მაშინვე მოსდევს · ჟამის ტროპარი — მუხლებით${psDay?.h[1] ? ` · დავითნის კანონი ${psDay.h[1]}` : ''}`,
      hint: 'ბოლოს მღვდელი: „ქრისტე, ნათელო ჭეშმარიტო“ და განტევება', read: lentHourRead(5, false, psDay?.h[1]), extras: [book(BOOK.hour1)],
    });
    s.push(...crossAtFirstHour);
    return s;
  };
  const m: Step[] = [];
  if (lentPlain) m.push(...lentMatins());
  else {
    if (!joinedM) {
      m.push(P('„კურთხეულ არს ღმერთი ჩვენი“', [M.begin], { who: ['priest'] }));
      m.push({ title: 'ფსალმუნები 19 და 20', who: ['reader'], hint: 'ამ დროს მღვდელი ტაძარს აკმევს', read: [{ say: AMEN }, R(FIX.come), R(FIX.royal), { say: GLORY }, R(FIX.trisagion), R(FIX.royalTroparia)], extras: [book(sunday ? BOOK.sunMatins : BOOK.dayMatins)] });
      m.push(P('მოკლე მრჩობლი კვერექსი', [M.short, M.glory], { hint: 'ბოლოს: „სახელითა უფლისათა გვაკურთხენ, მამაო“ — მღვდელი: „დიდება წმიდასა…“' }));
    }
    if (christIsRisen && !joinedM) m.push({ title: '„ქრისტე აღდგა“ — სამგზის', who: ['priest', 'choir'] });
    m.push({ title: 'ექვსფსალმუნება', who: ['reader'], note: 'ფს. 3, 37, 62, 87, 102, 142', hint: 'კრძალვით, აუჩქარებლად — ტაძარში ჩუმად ისმენენ; მღვდელი ამ დროს ცისკრის ლოცვებს კითხულობს', read: [{ say: AMEN }, R(FIX.sixPsalms)] });
    m.push(P('დიდი კვერექსი', [M.great], { chants: ['ck-2'] }));
    m.push({
      title: '„ღმერთი უფალი“ და ტროპარნი', who: ['choir'],
      note: great ? 'დღესასწაულის ტროპარი — სამგზის' : sunday ? `აღდგომის ტროპარი (${toneTxt}) ორგზის · „დიდება“ — წმიდანისა · „აწდა“ — ღვთისმშობლისა` : 'წმიდანის ტროპარი ორგზის · „დიდება… აწდა“ — ღვთისმშობლისა',
      hint: '„ღმერთი უფალი“ ტროპარის ხმაზე იგალობება', pt: [M.godIsLord], extras: [{ kind: 'troparia', at: 'matins' }], chants: sunday ? ['ck-3', 'ck-4', 'ck-v9-79'] : ['ck-3', 'ck-a10-133'], toned: sunday,
    });
    const mk = matinsKathismas(iso, rank);
    // the small litany after a kathisma: none on a plain day; with the great doxology — after the first two; on Saturday, Sunday and feasts — after each
    const litanyAfter = (i: number) => (big || sunday || dow === 6 ? true : dox ? i < 2 && i < mk.length - 1 : false);
    const sedalens = great || zatiki ? null : sunday ? text(octoechos(tone, 6, 'sedalens'), 'წარდგომანი — პარაკლიტონი') : text(octoechos(tone, eveDow, 'sedalens'), 'წარდგომანი — პარაკლიტონი');
    const saintSedalens = !great && !zatiki && dox && !sunday ? text(menaion(kind, 'sedalens'), 'წარდგომანი — წმიდანისა (საზიარო)') : null;
    mk.forEach((n, i) => {
      m.push({ title: `დავითნის კანონი ${n}`, who: ['reader'], read: [{ kathisma: n }] });
      if (litanyAfter(i)) m.push(P('მცირე კვერექსი', [M.small]));
      m.push({
        title: `წარდგომა — კანონი ${n}-ის შემდეგ`, who: ['choir', 'reader'],
        note: great ? 'დღესასწაულისა' : lentFeast ? 'წმიდანისა ან მარხვანისა — წიგნის მითითებით' : sunday ? `${toneTxt} · პარაკლიტონიდან` : dox && (big || i < 2) ? 'წმიდანისა' : `${toneTxt} · პარაკლიტონიდან`,
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
      note: season.repentance ? 'შემდეგ — „მსწრაფლ განუხვენ სინანულისა ბჭენი“ (მარხვანიდან)' : undefined,
      hint: big ? (sunday ? 'შემდეგ გუნდი: „დიდება“ — „მოციქულთა ვედრებითა“ · „აწდა“ — „მეოხებითა ღმრთისმშობელისათა“ · „აღდგა რა იესო“' : 'შემდეგ გუნდი: „დიდება“ — „მეოხებითა წმიდისა…“ · „აწდა“ — „მეოხებითა ღმრთისმშობელისათა“ და წმიდანის გერი') : undefined,
      read: [R(FIX.ps50)],
    });
    if (big) m.push(P('„აცხოვნე, ღმერთო, ერი შენი“', undefined, { who: ['deacon', 'choir'], hint: 'გუნდი: „უფალო, შეგვიწყალენ“ — 12-გზის' }));
    m.push({
      title: 'კანონი (9 გალობა)', who: ['choir', 'reader'],
      note: great ? (annunLent ? 'ხარების კანონი · მარხვანის სამსაგალობელი — თავის გალობებზე' : 'დღესასწაულის კანონი') : zatiki ? 'ზატიკის კანონი' : season.greatCanon ? 'ანდრია კრიტელის დიდი კანონი — სრულად, მარიამ მეგვიპტელის ცხოვრების კითხვით' : season.akathist ? 'ღვთისმშობლის დაუჯდომელი — ოთხ ნაწილად, კანონთან ერთად' : lentFeast ? 'წმიდანისა და მარხვანის სამსაგალობელი' : sunday ? `${toneTxt}: აღდგომისა (4), ჯვარაღდგომისა (3), ღვთისმშობლისა (3) და წმიდანისა (4)` : big ? 'ღვთისმშობლისა (6) და წმიდანისა (8)' : dox ? `პარაკლიტონის ორი კანონი (4 + 4) და წმიდანისა (6)` : `პარაკლიტონის ორი კანონი (6 + 4) და წმიდანისა (4)`,
      hint: `${lentFeast && dow >= 1 && dow <= 5 ? `მარხვანის სამსაგალობელი — ${TRIODES[dow]} გალობაზე: იქ კატავასია მისი მეორე კანონის ძლისპირია, სხვა გალობებზე — რიგითი` : dox || sunday ? 'კატავასია — „აღაღე პირი ჩემი“, ყოველი გალობის შემდეგ' : 'კატავასია — მხოლოდ მე-3, მე-6, მე-8 და მე-9 გალობის შემდეგ (ბოლო კანონის ძლისპირი)'} · მე-3-ის შემდეგ — მცირე კვერექსი და წარდგომა · მე-6-ის შემდეგ — მცირე კვერექსი, კონდაკი და იკოსი`,
      extras: great ? undefined : some(
        ...ownBooks, lentSat,
        ...(season.greatCanon ? [1, 2, 3, 4].map(n => text({ coll: 'kriteli', n, part: 0, label: 'ანდრია კრიტელი' }, `დიდი კანონი — ${['', 'ორშაბათისა', 'სამშაბათისა', 'ოთხშაბათისა', 'ხუთშაბათისა'][n]} ნაწილი`)) : []),
        text(zatiki, `ტექსტი — ${zatiki?.label}`),
        !zatiki && !lentDay && !(big && !sunday) && text(octoechos(tone, sunday ? 6 : eveDow, 'canon'), 'კანონი — პარაკლიტონი'),
        lentDay && lentText,
        !zatiki && text(menaion(kind, 'canon'), 'კანონი — წმიდანისა (საზიარო)'),
      ),
    });
    m.push({ title: '„ადიდებს სული ჩემი უფალსა“ — „უპატიოსნესსა“', who: ['choir'], note: great ? 'დიდ დღესასწაულზე — დღესასწაულის ჩასართავები' : season.paschal ? 'ზატიკში — „ანგელოზი ღაღადებს“' : 'მე-8 გალობის შემდეგ', extras: great || season.paschal ? undefined : some(text(FIX.magnificat)), chants: great || season.paschal ? undefined : ['ck-20', 'ck-21'] });
    if (!dox && !sunday) m.push({ title: '„ღირს არს ჭეშმარიტად“', who: ['choir', 'reader'], note: 'მე-9 გალობის შემდეგ — მხოლოდ სადაგ დღეს' });
    m.push(P('მცირე კვერექსი', [M.afterNine]));
    if (sunday) m.push({ title: '„წმიდა არს უფალი ღმერთი ჩვენი“', who: ['deacon', 'choir'], chants: ['ck-22'] });
    m.push({
      title: 'განმანათლებელი', who: ['choir', 'reader'],
      note: great ? 'დღესასწაულისა' : sunday ? `აღდგომისა — სახარების რიგით${gospelNo ? ` (${gospelNo})` : ''} · „დიდება“ — წმიდანისა · „აწდა“ — ღვთისმშობლისა` : dox ? 'წმიდანისა' : 'შვიდეულის დღისა · „დიდება“ — წმიდანისა · „აწდა“ — ღვთისმშობლისა',
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
      if (lentFeast) {
        m.push({ title: '„შენდა დიდება შვენის“ და დიდებამაღალიანი', who: ['reader'], note: 'მარხვის სადაგ დღეს არ იგალობება — იკითხება', read: [{ say: GLORY }, R(FIX.dailyDoxology)] });
        m.push(P('თხოვნითი კვერექსი', [M.supplication], { chants: ['ck-27'] }));
        m.push({ title: '„აღვივსენით“-სა ზედა დასდებელნი', who: ['choir', 'reader'], note: `მარხვანისა · „დიდება… აწდა“ — ${great ? 'დღესასწაულისა' : 'წმიდანისა'}`, hint: 'ჩასართავი მუხლები — ჟამნიდან', extras: some(text(FIX.mornVerses, 'ჩასართავი მუხლები — ჟამნი'), lentText) });
        m.push({ title: '„კეთილ არს აღსარებად უფლისა“ და სამწმიდაო', who: ['reader'], hint: '„მამაო ჩვენოს“ შემდეგ მღვდელი: „რამეთუ შენი არს სუფევა“ — შენ: „ამინ“', read: [R(FIX.goodToConfess), R(FIX.trisagion)] });
        m.push({ title: 'ტროპარნი', who: ['choir'], note: great ? 'დღესასწაულის ტროპარი' : 'წმიდანის ტროპარი · „დიდება… აწდა“ — ღვთისმშობლისა', extras: [{ kind: 'troparia', at: 'matins' }] });
        m.push(P('მრჩობლი კვერექსი', [M.augmented], { chants: ['ck-16'] }));
        m.push(ephremStep(THREE));
      } else {
        m.push({ title: 'დიდი დიდებამაღალიანი — „დიდება მაღალთა შინა ღმერთსა“', who: ['choir'], note: 'იგალობება', extras: some(text(FIX.greatDoxology)), chants: ['ck-24', 'ck-1'] });
        if (season.e === -28) m.push({ title: 'ჯვრის გამოსვენება და თაყვანისცემა', who: ['priest', 'choir'], note: 'დიდებამაღალიანის შემდეგ — ჯვარს შუა ტაძარში გამოასვენებენ', hint: '„ჯუარსა შენსა თაყუანის-ვსცემთ, მეუფეო“ — სამგზის, მუხლმოდრეკით' });
        if (great?.id === 'jvari') m.push({ title: 'ჯვრის ამაღლება', who: ['priest', 'choir'], note: 'დიდებამაღალიანის შემდეგ — ჯვარს შუა ტაძარში გამოასვენებენ და ხუთგზის აღამაღლებენ', hint: 'გუნდი ყოველ მხარეს: „უფალო, შეგვიწყალენ“ — 100-გზის · შემდეგ „ჯვარსა შენსა თაყვანის-ვსცემთ, მეუფეო“', extras: [book({ coll: 'kondaki', n: 8, label: 'კონდაკი · ჯვართამაღლების ცისკარი' })] });
        m.push(sunday
          ? { title: (tone ?? 1) % 2 ? 'ტროპარი — „დღეს ცხორება არს“' : 'ტროპარი — „აღსდეგ საფლავისაგან“', who: ['choir'], hint: 'კენტ ხმებში (1, 3, 5, 7) — „დღეს ცხორება“, ლუწში — „აღსდეგ საფლავისაგან“', chants: [(tone ?? 1) % 2 ? 'ck-25' : 'ck-26'] }
          : { title: 'ტროპარნი', who: ['choir'], note: great ? 'დღესასწაულის ტროპარი' : 'წმიდანის ტროპარი · „დიდება… აწდა“ — ღვთისმშობლისა', extras: [{ kind: 'troparia', at: 'matins' }] });
        m.push(P('მრჩობლი კვერექსი', [M.augmented], { chants: ['ck-16'] }));
        m.push(P('თხოვნითი კვერექსი', [M.supplication], { chants: ['ck-27'] }));
      }
    } else {
      m.push({ title: 'ქებანი — „აქებდით უფალსა ცათაგან“', who: ['reader'], note: 'იკითხება, დასდებლების გარეშე', read: [R(FIX.praises)] });
      m.push({ title: '„შენდა დიდება შვენის“ და დიდებამაღალიანი', who: ['reader'], note: 'ყოველდღიური — იკითხება', read: [{ say: GLORY }, R(FIX.dailyDoxology)] });
      m.push(P('თხოვნითი კვერექსი', [M.supplication], { chants: ['ck-27'] }));
      m.push({ title: '„აღვივსენით“-სა ზედა დასდებელნი', who: ['choir', 'reader'], note: `${toneTxt} · პარაკლიტონისანი`, hint: 'ჩასართავი მუხლები — ჟამნიდან · „დიდება… აწდა“ — ღვთისმშობლისა', extras: some(text(FIX.mornVerses, 'ჩასართავი მუხლები — ჟამნი'), !zatiki && text(octoechos(tone, eveDow, 'lauds'), 'დასდებელნი — პარაკლიტონი')) });
      m.push({ title: '„კეთილ არს აღსარებად უფლისა“ და სამწმიდაო', who: ['reader'], note: 'ერთგზის', hint: '„მამაო ჩვენოს“ შემდეგ მღვდელი: „რამეთუ შენი არს სუფევა“ — შენ: „ამინ“', read: [R(FIX.goodToConfess), R(FIX.trisagion)] });
      m.push({ title: 'ტროპარნი', who: ['reader'], note: 'წმიდანის ტროპარი · „დიდება… აწდა“ — ღვთისმშობლისა', read: [{ hymns: 'matins' }] });
      m.push(P('მრჩობლი კვერექსი', [M.augmented], { chants: ['ck-16'] }));
    }
    if (!lentFeast) m.push(P('განტევება', [M.dismissal], { who: ['priest', 'choir'], hint: dox || sunday ? undefined : 'განტევების ნაცვლად: „სიბრძნით“ — „გვაკურთხენ“ — „რომელი იგი არს კურთხეულ“ — „ამინ. დაამტკიცე, ღმერთო“ და მაშინვე პირველი ჟამი' }));
    m.push({ title: 'პირველი ჟამი', who: ['reader'], note: great ? 'ტროპარი და კონდაკი — დღესასწაულისა' : sunday ? 'ტროპარი — აღდგომისა, „დიდება“ — წმიდანისა · კონდაკი — აღდგომისა' : 'ტროპარი და კონდაკი — წმიდანისა', hint: 'ბოლოს მღვდელი: „ქრისტე, ნათელო ჭეშმარიტო“ · გუნდი: „ზეშთა მბრძოლისა“', read: hourRead(5, false, false, annunLent ? undefined : psDay?.h[1]), extras: [book(BOOK.hour1)], chants: ['ck-a17-112', 'ck-29'] });
    m.push(...crossAtFirstHour);
  }

  if (great?.id === 'bzoba') {
    const at = m.findIndex(st => st.title === 'ფსალმუნი 50');
    if (at > 0) m.splice(at, 0, { title: 'ბზის კურთხევა', who: ['priest'], note: 'სახარების შემდეგ — მღვდელი ბზას აკურთხებს და ასხურებს' });
  }

  // ----- hours -----
  const hourNote = sunday ? 'ტროპარი — აღდგომისა, „დიდება“ — წმიდანისა · კონდაკი — აღდგომისა' : great ? 'ტროპარი და კონდაკი — დღესასწაულისა' : 'ტროპარი და კონდაკი — წმიდანისა';
  /** the Liturgy of a day served in Lent's way: the Presanctified (Wednesday, Friday, the Great Canon's Thursday, a feast with
   *  the polyeleos), St John Chrysostom's at the Annunciation — or none */
  const lentLiturgy: 'none' | 'presanctified' | 'vesperal' | null = annunLent ? 'vesperal'
    : !lentDay ? null
      : litNote === 'none' || cheese ? 'none'
        : litNote === 'presanctified' || season.presanctified || season.e === -17 || big ? 'presanctified' : 'none';
  /** Lent's hours (ჟამნი): the third, sixth and ninth in a row with the typika; vespers — or the liturgy — follows at once */
  const lentHours = (): Step[] => {
    // the Annunciation has no kathisma at the hours
    const kOf = (n: 3 | 6 | 9) => (annunLent ? undefined : psDay?.h[n]);
    const rd = (n: number, first: boolean, kath?: number, prophecy?: string) => (lentPlain ? lentHourRead(n, first, kath, prophecy) : hourRead(n, first, false, kath));
    const own = lentPlain ? 'ჟამის ტროპარი — მუხლებით' : hourNote;
    const kn = (n?: number) => (n ? ` · დავითნის კანონი ${n}` : '');
    // ჟამნი: the third and the sixth hour end with all the prostrations, the ninth — the typika follow at once — with three
    const bows = lentPlain ? (cheese ? 'მეტანიებით' : '16 მეტანიით') : THREE;
    const nine = cheese ? bows : THREE;
    const EPH: Extra = { kind: 'prayer', id: 'efrem-asuri', label: 'ეფრემ ასურის ლოცვა' };
    return [
      P('„კურთხეულ არს ღმერთი ჩვენი“', [V.begin], { who: ['priest'] }),
      { title: 'მესამე ჟამი', who: ['reader'], note: own + kn(kOf(3)), hint: `ფს. 16, 24, 50 · ბოლოს — ეფრემ ასურის ლოცვა ${bows}`, read: rd(6, true, kOf(3)), extras: [book(BOOK.hour3), EPH] },
      {
        title: 'მეექვსე ჟამი', who: ['reader'], note: `წინასწარმეტყველება: ${sixth || 'კალენდრის მიხედვით'}${kn(kOf(6))}`,
        hint: `ფს. 53, 54, 90 · საკითხავის წინ და შემდეგ — წარდგომა მარხვანიდან${lentPlain ? '' : ` · ${hourNote}`} · ბოლოს — ეფრემ ასურის ლოცვა ${bows}`,
        read: rd(7, false, kOf(6), sixth || 'კალენდრის მიხედვით'), extras: [book(BOOK.hour6), EPH],
      },
      { title: 'მეცხრე ჟამი', who: ['reader'], note: own + kn(kOf(9)), hint: `ფს. 83, 84, 85 · ბოლოს — ეფრემ ასურის ლოცვა ${nine}`, read: rd(9, false, kOf(9)), extras: [book(BOOK.hour9), EPH] },
      { title: 'სადილის ჟამი', who: ['reader', 'choir'], note: '„სასუფეველსა შენსა“ — ნეტარებანი · „მრწამს“ · „მამაო ჩვენო“', hint: 'ბოლოს — „უფალო, შეგვიწყალენ“ 40-გზის · განტევება არ ითქმის', extras: [book(BOOK.typika)] },
      ephremStep(`სადილის ჟამის ბოლოს · ${lentPlain ? (cheese ? 'მეტანიებით' : SIXTEEN) : THREE}`),
      // the fourth week's Friday: the Cross is venerated once more and taken back into the altar (the official calendar)
      ...(season.e === -23 ? [{ title: 'ჯვრის თაყვანისცემა და შებრძანება', who: ['priest', 'choir'] as Who[], note: 'სადილის ჟამის ბოლოს — ჯვარს საკურთხეველში შეაბრძანებენ' }] : []),
      lentLiturgy === 'none'
        ? { title: 'შემდეგ — მწუხრი', who: ['reader'], note: 'წირვა არ არის: სადილის ჟამს მაშინვე მწუხრი მოსდევს', hint: 'მწუხრის რიგი — ხვალინდელი დღის ჩანართში „მწუხრი“' }
        : { title: 'შემდეგ — წირვა', who: ['reader'], note: 'სადილის ჟამს მაშინვე მოსდევს — იხ. ჩანართი „წირვა“' },
    ];
  };
  const h: Step[] = lentDay || annunLent ? lentHours() : [
    P('„კურთხეულ არს ღმერთი ჩვენი“', [V.begin], { who: ['priest'] }),
    { title: 'მესამე ჟამი', who: ['reader'], note: hourNote, hint: 'ფს. 16, 24, 50 · „მამაო ჩვენოს“ შემდეგ მღვდელი: „რამეთუ შენი არს სუფევა“ — შენ: „ამინ“', read: hourRead(6, true), extras: [book(BOOK.hour3)] },
    { title: 'მეექვსე ჟამი', who: ['reader'], note: hourNote, hint: 'ფს. 53, 54, 90 · ბოლოს მღვდელი განტევებას ამბობს', read: hourRead(7, false), extras: [book(BOOK.hour6)] },
  ];
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
      ? { id: 'vespers', slot: 'eve', title: 'დიდი სერობა — ღამისთევა', when: eveName, note: eveWeekday ? 'წინადღის მწუხრი დილით, ბასილის წირვასთან აღესრულა — იხ. წინა დღის „წირვა“' : 'წინადღის დიდი მწუხრი საკითხავებით — შუადღის შემდეგ, ცალკე', steps: [
        P('„კურთხეულ არს ღმერთი ჩვენი“', [V.begin], { who: ['priest'] }),
        { title: 'დიდი სერობა', who: ['reader', 'choir'], note: '„ჩვენ თანა არს ღმერთი“ — იგალობება დღესასწაულის მსგავსად · შემდეგ დღესასწაულის ტროპარი და კონდაკი', read: [{ src: { coll: 'jamni', n: 11, part: 0, label: 'ჟამნი · დიდი სერობა' } }] },
        { title: 'ლიტია', who: ['choir', 'priest', 'deacon'], note: 'დღესასწაულის დასდებელნი', pt: [V.litya] },
        P('ხუთი პურის კურთხევა', [V.bread, V.blessing], { who: ['priest', 'choir'] }),
        { title: 'ცისკარი იწყება', who: ['reader'], note: 'ექვსფსალმუნებიდან', hint: 'გადადი ჩანართზე „ცისკარი“' },
      ] }
      : eveLiturgy ? { id: 'vespers', slot: 'prev', title: 'მწუხრი', when: `${WEEKDAY_NOM[eveDow]} — წირვასთან ერთად`, steps: v, note: notes }
        : { id: 'vespers', slot: lentEve && afterHours ? 'prev' : 'eve', title: 'მწუხრი', when: lentEve && afterHours ? `${WEEKDAY_NOM[eveDow]} — ჟამების შემდეგ` : `${eveName}${vigilDay && joined ? ' · ღამისთევა' : ''}`, steps: v, note: notes },
    ...(annunLent ? [festalCompline(eveName)] : season.compline ? [complineService(season.e, eveDow)] : []),
    { id: 'matins', slot: annunLent || joined || season.greatCanon || season.akathist ? 'eve' : 'day', title: 'ცისკარი', when: annunLent ? `${eveName} — დიდ სერობას მოსდევს` : joined ? `${eveName} — მწუხრს მოსდევს` : season.greatCanon || season.akathist ? `${eveName} (სამრევლოში შეიძლება დილითაც)` : 'დილით', steps: m, note: notes },
    { id: 'hours', slot: 'day', title: 'ჟამები', when: lentDay || annunLent ? 'დილით — სადილის ჟამითურთ' : 'წირვის წინ', steps: h },
  ];
  if (lentLiturgy === 'none') {
    services.push({ id: 'liturgy', slot: 'day', title: 'წირვა', when: cheese ? 'ყველიერის დღე' : 'მარხვის დღე', steps: [
      { title: 'წირვა არ აღესრულება', who: ['reader'], note: cheese ? 'ყველიერის ოთხშაბათსა და პარასკევს წირვა არ არის — მსახურება მარხვის წესით მიდის' : 'მარხვის ორშაბათს, სამშაბათსა და ხუთშაბათს წირვა არ არის' },
      { title: 'ჟამებს მწუხრი მოსდევს', who: ['reader', 'choir'], note: noonText ? `მწუხრის საკითხავები: ${noonText}` : 'სადილის ჟამის შემდეგ — მარხვის წესით', hint: 'მწუხრის რიგი — ხვალინდელი დღის ჩანართში „მწუხრი“' },
    ] });
    return services;
  }
  if (lentLiturgy === 'presanctified') {
    // a saint with the polyeleos has his Epistle and Gospel at it; from Mid-Lent's Wednesday the litany of those to be baptized
    const steps = presanctifiedSteps({ vespersText: noonText, apostle: big ? apostle : [], gospel: big ? gospel : [], lentText, kathisma: psDay ? psDay.v : 18, illumination: season.e >= -25 });
    // the first Friday: St Theodore's canon and the blessing of the kolyva after the liturgy
    if (season.e === -44) steps.push({ title: 'თეოდორე ტირონის კანონი — კოლიოს კურთხევა', who: ['priest', 'choir'], note: 'წირვის შემდეგ', extras: [xbook(22, 'თეოდორე ტირონის პარაკლისი')] });
    services.push({ id: 'liturgy', slot: 'day', title: 'წირვა', when: 'წინასწარ კურთხეულთა', note: 'მწუხრთან ერთად — ჟამების შემდეგ', steps });
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
  // the Sunday of the Cross: „ჯუარსა შენსა“ in the Trisagion's place, as at the Exaltation
  const trisagion = great?.trisagion ?? (season.lazarus ? 'baptized' : season.e === -28 ? 'cross' : undefined);
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
    : season.paschal ? { title: '„ანგელოზი ღაღადებს“ — „განათლდი, განათლდი“', who: ['choir'], note: 'აღდგომის წარგზავნამდე — „ღირს არსის“ ნაცვლად', extras: [{ kind: 'prayer', id: 'ghirs-arsis-nacvlad', label: 'ღირს-არსის ნაცვლად საკითხავნი' }] }
    : { title: '„ღირს არს ჭეშმარიტად“', who: ['choir'], chants: ['chant-32'] });
  l.push(P('თხოვნითი კვერექსი „მამაო ჩვენოს“ წინ', [L.beforeOurFather], { chants: ['chant-34'] }));
  l.push({ title: '„მამაო ჩვენო“', who: ['choir'], chants: ['chant-35'] });
  l.push({ title: '„ერთ არს წმიდა“ და ზიარების მუხლი', who: ['choir'], note: great ? 'დღესასწაულისა' : season.paschal ? '„ხორცი ქრისტესი მოვიღოთ“' : sunday ? `${COMMUNION[0]}${dox ? ' · და წმიდანისა' : ''}` : vigilDay ? 'წმიდანისა' : `${COMMUNION[dow]} (${DAY_THEME[dow]}) · და წმიდანისა`, chants: ['chant-37', 'chant-41', 'chant-a3-376', 'chant-a3-382'] });
  l.push({ title: 'ზიარების წინა ლოცვები', who: ['reader'], note: 'სანამ სამღვდელოება ეზიარება — კითხულობ ხმამაღლა', extras: [{ kind: 'prayer', id: 'ziarebis-tsin', label: 'ზიარების წინა ლოცვები' }] });
  l.push({ title: 'ზიარება — „კურთხეულ არს მომავალი“, „ხორცი ქრისტესი“', who: ['choir'], pt: [L.communion], chants: ['chant-39', 'chant-40'] });
  l.push({ title: season.paschal ? '„ქრისტე აღდგა“ და „აღავსე პირი ჩემი“' : '„ნათელი ჭეშმარიტი ვიხილეთ“ და „აღავსე პირი ჩემი“', who: ['choir'], chants: season.paschal ? ['chant-43'] : ['chant-42', 'chant-43'] });
  l.push(P('სამადლობელი კვერექსი და ამბიონის ლოცვა', [L.thanks]));
  l.push({ title: '„იყავნ სახელი უფლისა“ და ფსალმუნი 33', who: ['choir', 'reader'], note: '„იყავნ სახელი უფლისა“ — სამგზის, შემდეგ ფსალმუნი 33', read: [R(FIX.typikaEnd)], chants: ['chant-45', 'chant-46'] });
  l.push(P('განტევება', undefined, { who: ['priest', 'choir'] }));
  l.push({ title: 'ზიარების შემდგომი ლოცვები', who: ['reader'], note: 'განტევების შემდეგ — ზიარებულთათვის', extras: [{ kind: 'prayer', id: 'ziarebis-shemdeg', label: 'ზიარების შემდგომი ლოცვები' }] });
  // the feasts' blessings: the Great Blessing of the Waters, the candles at the Meeting, the grapes at the Transfiguration
  const md = iso.slice(5);
  if (md === '01-18' || md === '01-19') l.push({ title: 'დიდი აიაზმა — წყლის კურთხევა', who: ['priest', 'choir', 'reader'], note: md === '01-18' ? 'ნათლისღების წინადღეს, წირვის შემდეგ' : 'ნათლისღებას, წირვის შემდეგ', hint: 'მედავითნე კითხულობს წინასწარმეტყველებას, სამოციქულოს; გუნდი — „ხმა უფლისა წყალთა ზედა“', extras: [book({ coll: 'kurtxevani', n: 25, label: 'კურთხევანი · დიდი აიაზმა' })] });
  if (md === '02-15') l.push({ title: 'სანთლის კურთხევა', who: ['priest', 'choir'], note: 'მიგებებას — სანთლები იკურთხება', extras: [xbook(26, 'სანთლის კურთხევა')] });
  if (md === '08-14') l.push({ title: 'მცირე აიაზმა — წყლის კურთხევა', who: ['priest', 'choir', 'reader'], note: 'ჯვრის გამოსვლის დღეს, წირვის შემდეგ' });
  if (season.e === 9) l.push({ title: 'მიცვალებულთა ხსენება', who: ['priest', 'choir'], note: 'თომას კვირის სამშაბათს — წირვის შემდეგ პანაშვიდი' });
  if (md === '08-19') l.push({ title: 'ყურძნისა და ხილის კურთხევა', who: ['priest', 'choir'], note: 'ფერისცვალებას, ამბიონის ლოცვის შემდეგ' });
  // the eve of Christmas or Theophany on a weekday: St Basil's liturgy begins with vespers and its readings
  if (season.paramony && dow >= 1 && dow <= 5) l.splice(0, l.length, ...vesperalBasil(iso, vespersText, apostle, gospel), ...l.filter(st => /აიაზმა/.test(st.title)));
  if (season.paramony && (dow === 0 || dow === 6)) l.unshift({ title: 'წინადღე შაბათს ან კვირას', who: ['reader'], note: 'სამეუფო ჟამები პარასკევს იკითხება, ბასილი დიდის წირვა — დღესასწაულის დღეს; დღეს — ოქროპირისა' });
  if (lentLiturgy === 'vesperal') {
    // the Annunciation on a Lent weekday: vespers with the readings takes the place of the antiphons; from the trisagion on —
    // St John Chrysostom's liturgy as ever
    const from = l.findIndex(st => st.title === 'ტროპარნი და კონდაკნი') + 1;
    services.push({ id: 'liturgy', slot: 'day', title: 'წირვა', when: 'იოანე ოქროპირისა, მწუხრთან ერთად', note: 'ჟამების შემდეგ', steps: [...vesperalHead(noonText, lentText), ...l.slice(from)] });
    return services;
  }
  services.push({ id: 'liturgy', slot: 'day', title: 'წირვა', when: season.basil ? (season.paramony ? 'ბასილი დიდისა, მწუხრთან ერთად' : 'ბასილი დიდისა') : 'დილით', steps: l });
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
    P('„კურთხეულ არს მეუფება“', [L.begin], { who: ['priest'] }),
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

/** vespers as the beginning of a full Liturgy — the Annunciation on a Lent weekday: up to the readings; the trisagion follows */
const vesperalHead = (vespersText: string, lentText: Extra | null): Step[] => {
  const L = PRIEST.liturgy, V = PRIEST.vespers;
  return [
    { title: 'წირვა ჟამებს მოსდევს', who: ['reader'], note: 'მეცხრე ჟამისა და სადილის ჟამის შემდეგ — იხ. ჩანართი „ჟამები“' },
    P('„კურთხეულ არს მეუფება“', [L.begin], { who: ['priest'], note: 'იოანე ოქროპირის ლიტურგია — მწუხრით იწყება', extras: [book(BOOK.priestLiturgy)] }),
    { title: '„მოვედით, თაყვანის-ვსცეთ“ და ფსალმუნი 103', who: ['reader'], read: [R(FIX.come), R(FIX.ps103), { say: GLORY_ALLELUIA }] },
    P('დიდი კვერექსი', [V.great]),
    { title: '„უფალო, ღაღად-ვყავ“ და დასდებელნი', who: ['choir'], note: 'მარხვანისა და ხარებისა', extras: some(text(FIX.lordICry, 'ფსალმუნები და მუხლები — ჟამნი'), lentText) },
    P('შესვლა სახარებით', [V.entrance], { who: ['priest', 'deacon'] }),
    { title: '„ნათელო მხიარულო“', who: ['choir'], extras: some(text(FIX.gladLight)), chants: ['mw-12'] },
    {
      title: 'წარდგომანი და საკითხავები', who: ['deacon', 'choir', 'reader'], note: vespersText || 'დღის ორი და ხარების ორი საკითხავი — კალენდრის მიხედვით',
      hint: 'ჯერ დღის ორი საკითხავი თავისი წარდგომებით (მარხვანიდან), შემდეგ — ხარებისა',
    },
    P('მცირე კვერექსი', [V.small]),
  ];
};

/** the Liturgy of the Presanctified Gifts, joined to vespers after the hours (Lent's Wednesdays and Fridays, the Great
 *  Canon's Thursday, a feast with the polyeleos, Holy Week's first three days). `kathisma`: null — the day's own by the
 *  Psalter's table; `illumination` — from Mid-Lent's Wednesday the litany of those preparing for baptism is added */
const presanctifiedSteps = (x: {
  vespersText: string; apostle: Reading[]; gospel: Reading[]; lentText: Extra | null; holy?: boolean; kathisma?: number | null; illumination?: boolean;
}): Step[] => {
  const V = PRIEST.vespers;
  const names = (rs: Reading[]) => rs.map(r => `${r.name} ${r.ref}`).join(' · ');
  const reads = (rs: Reading[]): Extra[] => [{ kind: 'readings', items: rs }];
  const k = x.kathisma === undefined ? 18 : x.kathisma;
  const steps: Step[] = [
    { title: 'წირვა ჟამებს მოსდევს', who: ['reader'], note: 'მეცხრე ჟამისა და სადილის ჟამის შემდეგ — იხ. ჩანართი „ჟამები“' },
    { title: '„კურთხეულ არს მეუფება“ და ფსალმუნი 103', who: ['priest', 'reader'], hint: 'მღვდლის ასამაღლებლის შემდეგ მაშინვე: „მოვედით, თაყვანის-ვსცეთ“', read: [R(FIX.come), R(FIX.ps103), { say: GLORY_ALLELUIA }] },
    P('დიდი კვერექსი', [V.great]),
    k
      ? { title: `დავითნის კანონი ${k}`, who: ['reader'], hint: 'სამ ნაწილად — ყოველი „დიდების“ შემდეგ მცირე კვერექსი', read: [{ kathisma: k }] }
      : { title: 'დავითნის კანონი', who: ['reader'], note: 'დღის რიგით — დავითნის ცხრილის მიხედვით', hint: 'სამ ნაწილად — ყოველი „დიდების“ შემდეგ მცირე კვერექსი' },
    {
      title: '„უფალო, ღაღად-ვყავ“ და დასდებელნი', who: ['choir'], note: x.holy ? '10 მუხლად — მარხვანისა' : '10 მუხლად — მარხვანისა და წმიდანისა',
      hint: 'მარხვანის დასდებელნი ბეჭდურ წიგნშია', extras: some(text(FIX.lordICry, 'ფსალმუნები და მუხლები — ჟამნი'), x.lentText),
    },
    { title: 'შესვლა და „ნათელო მხიარულო“', who: ['priest', 'deacon', 'choir'], note: x.gospel.length ? 'შესვლა — სახარებით' : 'შესვლა — საცეცხლურით', extras: some(text(FIX.gladLight)) },
    { title: 'პირველი წარდგომა და პირველი საკითხავი', who: ['deacon', 'choir', 'reader'], note: x.vespersText || 'საკითხავები — კალენდრის მიხედვით', hint: 'წარდგომანი — მარხვანიდან' },
    { title: 'მეორე წარდგომა — „ნათელი ქრისტესი განანათლებს ყოველთა“', who: ['choir', 'priest'], note: 'მღვდელი სანთლითა და საცეცხლურით აკურთხებს — ყველა მუხლს იდრეკს' },
    { title: 'მეორე საკითხავი', who: ['reader'], note: 'კალენდრის რიგით — იხ. ზემოთ', hint: 'თუ წმიდანის საკითხავებიც არის — აქვე, დღისის შემდეგ' },
    { title: '„წარემართენ ლოცვა ჩემი“', who: ['choir', 'reader'], note: 'ფსალმუნი 140-ის მუხლებით — მუხლმოდრეკით' },
    ephremStep(THREE),
  ];
  if (x.apostle.length) steps.push({ title: 'წარდგომა და სამოციქულო', who: ['reader', 'choir'], note: names(x.apostle), extras: reads(x.apostle) });
  if (x.gospel.length) steps.push({ title: 'სახარება', who: ['deacon', 'priest'], note: names(x.gospel), hint: 'წინ და შემდეგ გუნდი: „დიდება შენდა, უფალო, დიდება შენდა“', extras: reads(x.gospel) });
  steps.push(
    P('კვერექსები', undefined, {
      note: `მრჩობლი · კათაკმეველთა${x.illumination ? ' · ნათლისღებად განმზადებულთა' : ''} · მორწმუნეთა`,
      hint: x.illumination ? 'IV შვიდეულის ოთხშაბათიდან დიდ ოთხშაბათამდე ემატება: „რაოდენნი ნათლისღებად განმზადებულნი ხართ“' : undefined,
    }),
    { title: '„აწ ძალნი ცათანი“', who: ['choir'], note: 'ქერუბიმთა გალობის ნაცვლად — დიდი შესვლა', hint: 'წმიდა ძღვენის გადმობრძანებისას ყველა მუხლს იდრეკს' },
    ephremStep('დიდი შესვლის შემდეგ — სამი დიდი მეტანიით'),
    P('თხოვნითი კვერექსი'),
    { title: '„მამაო ჩვენო“', who: ['choir'], chants: ['chant-35'] },
    {
      title: 'ზიარების მუხლი — „განიცადეთ და იხილეთ, რამეთუ ტკბილ არს უფალი“', who: ['choir'], note: 'ფსალმუნი 33: 9',
      hint: 'ამ დროს მედავითნე კითხულობს ზიარების წინა ლოცვებს', extras: [{ kind: 'prayer', id: 'ziarebis-tsin', label: 'ზიარების წინა ლოცვები' }],
    },
    { title: 'ზიარება — „ვაკურთხო უფალი ყოველსა ჟამსა“', who: ['choir'], note: '„ნათელი ჭეშმარიტი ვიხილეთ“-ის ნაცვლად', hint: 'შემდეგ — „აღავსე პირი ჩემი“, სამადლობელი კვერექსი და ამბიონის ლოცვა' },
    { title: '„იყავნ სახელი უფლისა“, ფსალმუნი 33 და განტევება', who: ['choir', 'reader', 'priest'], note: '„იყავნ სახელი უფლისა“ — სამგზის', read: [R(FIX.typikaEnd)] },
  );
  return steps;
};

/** the vigil that begins with Great Compline: the Annunciation on a Lent weekday (Christmas and Theophany have theirs
 *  in the vespers' tab) */
const festalCompline = (when: string): Service => ({
  id: 'compline', slot: 'eve', title: 'დიდი სერობა', when, note: 'ხარების ღამისთევა დიდი სერობით იწყება — მას ცისკარი მოსდევს',
  steps: [
    P('„კურთხეულ არს ღმერთი ჩვენი“', [PRIEST.vespers.begin], { who: ['priest'] }),
    {
      title: 'დიდი სერობა', who: ['reader', 'choir'], note: '„ჩვენ თანა არს ღმერთი“ იგალობება · სამწმიდაოების შემდეგ — ხარების ტროპარი და კონდაკი',
      read: [{ src: COMPLINE }], extras: [book({ coll: 'jamni', n: 11, label: COMPLINE.label })],
    },
    { title: 'ლიტია', who: ['choir', 'priest', 'deacon'], note: 'დიდებამაღალიანის შემდეგ — ხარების დასდებელნი', pt: [PRIEST.vespers.litya] },
    { title: 'სტიქარონსა ზედა დასდებელნი და „აწ განუტევე“', who: ['choir', 'reader'], note: 'ხარებისა · სამწმიდაოს შემდეგ — ხარების ტროპარი', read: [R(FIX.nunc), R(FIX.trisagion)] },
    P('ხუთი პურის კურთხევა', [PRIEST.vespers.bread, PRIEST.vespers.blessing], { who: ['priest', 'choir'] }),
    { title: 'ცისკარი იწყება', who: ['reader'], note: 'ექვსფსალმუნებიდან', hint: 'გადადი ჩანართზე „ცისკარი“' },
  ],
});

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
  return { id: 'compline', slot: 'eve', title: 'დიდი სერობა', when: `${WEEKDAY_NOM[eveDow]} საღამოს`, note: part ? 'მწუხრის შემდეგ — ანდრია კრიტელის კანონით' : 'მწუხრის შემდეგ', steps };
};

/** Holy Week (stage 4): each day's own order — the Bridegroom's matins, the Presanctified, Thursday's and Saturday's
 *  liturgies of St Basil with vespers, Friday's twelve Gospels, Royal Hours and the vespers of the Shroud */
const holyWeek = (inp: DayInput, e: number): Service[] => {
  const readings = inp.day ? readingsOf(inp.day) : [];
  const matinsGospel = readings.filter(r => r.label === 'ცისკ');
  const liturgy = readings.filter(r => r.label !== 'ცისკ' && r.label !== 'მწუხრ');
  const apostle = liturgy.filter(r => r.apostle);
  const gospel = liturgy.filter(r => !r.apostle);
  const vespersText = vespersLinesOf(inp.iso, inp.day).same;
  const name = TRIODION[e].name;
  const tri = text(triodionSrc(e), `ტროპარ-კონდაკი — ჟამნი · ${name}`);
  const annun = greatFeastOf(inp.iso)?.id === 'khareba';
  const khareba = annun ? 'ამ დღეს ხარებაც არის — მისი საგალობლები ვნების შვიდეულისას ერთვის (მღვდელს ჰკითხე წესი)' : undefined;
  const names = (rs: Reading[]) => rs.map(r => `${r.name} ${r.ref}`).join(' · ') || undefined;
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
      { id: 'vespers', slot: 'with', title: 'მწუხრი', when: 'წირვასთან ერთად — დღის მეორე ნახევარში', note: 'ვნების შვიდეული · წინასწარ კურთხეულთა ლიტურგიის ნაწილია — იხ. ჩანართი „წირვა“', steps: [
        { title: 'მწუხრი წინასწარ კურთხეულთა ლიტურგიასთან', who: ['reader', 'choir'], note: 'სრული რიგი — ჩანართში „წირვა“', extras: some(tri) },
      ] },
      { id: 'matins', slot: 'eve', title: 'სიძის ცისკარი', when: 'წინა საღამოს', note: khareba, steps: [
        P('„კურთხეულ არს ღმერთი ჩვენი“', [M.begin], { who: ['priest'] }),
        { title: 'ექვსფსალმუნება', who: ['reader'], read: [{ say: AMEN }, R(FIX.sixPsalms)] },
        P('დიდი კვერექსი', [M.great], { chants: ['ck-2'] }),
        { title: '„ალილუია“ და „აჰა ესერა, სიძე მოვალს შუაღამესა“', who: ['choir'], note: 'ტროპარი სამგზის, ნელა', extras: some(tri), read: [hymns('matins')] },
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
      { id: 'hours', slot: 'day', title: 'ჟამები', when: 'დილით', note: 'დიდ ორშაბათს, სამშაბათს და ოთხშაბათს ჟამებზე ოთხთავი იკითხება', steps: [
        { title: 'პირველი, მესამე, მეექვსე და მეცხრე ჟამი', who: ['reader'], note: 'მარხვის წესით — დავითნის კანონებითა და სახარების კითხვით', read: [...hourRead(5, true, false, ps.h[1]), ...hourRead(6, false, false, ps.h[3]), ...hourRead(7, false, false, ps.h[6]), ...hourRead(9, false, false, ps.h[9])], extras: [book(BOOK.hour1)] },
        ephrem,
      ] },
      // the Annunciation on these days: St John Chrysostom's liturgy, begun with vespers (the official calendar, 2026)
      annun
        ? { id: 'liturgy', slot: 'day', title: 'წირვა', when: 'იოანე ოქროპირისა, მწუხრთან ერთად', note: 'ხარება — ჟამების შემდეგ', steps: [
          ...vesperalHead(vespersText, tri),
          { title: 'სამწმიდაო', who: ['choir'] },
          { title: 'წარდგომა და სამოციქულო', who: ['reader', 'choir'], note: names(apostle), extras: readsOf(apostle) },
          { title: 'სახარება', who: ['deacon', 'priest'], note: names(gospel), extras: readsOf(gospel) },
          { title: 'შემდეგ — იოანე ოქროპირის წირვა ჩვეული რიგით', who: ['choir', 'priest'], note: 'ქერუბიმთა გალობიდან · „ღირს არსის“ ნაცვლად — ხარების ძლისპირი', extras: [{ kind: 'prayer', id: 'ghirs-arsis-nacvlad', label: 'ღირს-არსის ნაცვლად საკითხავნი' }] },
          { title: '„იყავნ სახელი უფლისა“, ფსალმუნი 33 და განტევება', who: ['choir', 'reader', 'priest'], read: [R(FIX.typikaEnd)] },
        ] }
        : { id: 'liturgy', slot: 'day', title: 'წირვა', when: 'წინასწარ კურთხეულთა', note: 'მწუხრთან ერთად', steps: [
          ...presanctifiedSteps({ vespersText, apostle, gospel, lentText: tri, holy: true, illumination: true }),
          // Great Wednesday: the last prostrations until Pentecost's evening (the official calendar)
          ...(e === -4 ? [{ title: 'ეფრემ ასურის ლოცვა — უკანასკნელად', who: ['priest'] as Who[], note: '„იყავნ სახელი უფლისა“-ს შემდეგ — სამი დიდი მეტანიით', hint: 'ამის შემდეგ ტაძარში მეტანიები წყდება' }] : []),
        ] },
    );
    return services;
  }
  if (e === -3) {
    // Holy Thursday: matins the evening before, St Basil's liturgy with vespers
    services.push(
      { id: 'vespers', slot: 'with', title: 'მწუხრი', when: 'წირვასთან ერთად', note: 'ბასილი დიდის ლიტურგიის ნაწილია — იხ. ჩანართი „წირვა“', steps: [{ title: 'მწუხრი ბასილი დიდის ლიტურგიასთან', who: ['reader', 'choir'], note: 'სრული რიგი — ჩანართში „წირვა“', extras: some(tri) }] },
      { id: 'matins', slot: 'eve', title: 'ცისკარი', when: 'წინა საღამოს', note: khareba, steps: [
        P('„კურთხეულ არს ღმერთი ჩვენი“', [M.begin], { who: ['priest'] }),
        { title: 'ექვსფსალმუნება', who: ['reader'], read: [{ say: AMEN }, R(FIX.sixPsalms)] },
        { title: '„ალილუია“ და „რაჟამს დიდებულნი მოწაფენი“', who: ['choir'], note: 'ტროპარი სამგზის', read: [hymns('matins')] },
        { title: 'სახარება', who: ['priest'], note: matinsGospel.map(r => `${r.name} ${r.ref}`).join(' · ') || 'ლკ. 22:1–39', extras: readsOf(matinsGospel) },
        { title: 'ფსალმუნი 50', who: ['reader'], read: [R(FIX.ps50)] },
        { title: 'კანონი — „ზღვა მეწამული“', who: ['choir', 'reader'], note: 'ტრიოდიონის კანონი (ბეჭდურ ტრიოდიონშია — აპში ჯერ არ არის)' },
        { title: 'ქებანი, დიდებამაღალიანი', who: ['reader', 'choir'], read: [R(FIX.praises), R(FIX.dailyDoxology)] },
        { title: 'ტროპარი და განტევება', who: ['choir', 'priest'], read: [hymns('matins')] },
      ] },
      { id: 'hours', slot: 'day', title: 'ჟამები', when: 'წირვის წინ', steps: [{ title: 'მესამე, მეექვსე და მეცხრე ჟამი', who: ['reader'], read: [...hourRead(6, true), ...hourRead(7, false), ...hourRead(9, false)] }] },
      { id: 'liturgy', slot: 'day', title: 'წირვა', when: 'ბასილი დიდისა, მწუხრთან ერთად', note: khareba, steps: [
        P('„კურთხეულ არს მეუფება“', [L.begin], { who: ['priest'] }),
        { title: 'ფსალმუნი 103 და დიდი კვერექსი', who: ['reader', 'deacon'], read: [R(FIX.come), R(FIX.ps103)] },
        { title: '„უფალო, ღაღად-ვყავ“', who: ['choir'], extras: some(text(FIX.lordICry, 'ფსალმუნები და მუხლები — ჟამნი')) },
        { title: 'შესვლა და „ნათელო მხიარულო“', who: ['priest', 'choir'], extras: some(text(FIX.gladLight)) },
        { title: 'საკითხავები', who: ['reader'], note: vespersText || 'გამოსვლათა 19:10–19 · იობ 38:1–23; 42:1–5 · ესაია 50:4–11' },
        { title: 'სამწმიდაო', who: ['choir'] },
        { title: 'სამოციქულო', who: ['reader'], note: apostle.map(r => `${r.name} ${r.ref}`).join(' · ') || undefined, extras: readsOf(apostle) },
        { title: 'სახარება', who: ['deacon', 'priest'], note: gospel.map(r => `${r.name} ${r.ref}`).join(' · ') || undefined, extras: readsOf(gospel) },
        { title: '„სერობასა საიდუმლოსა შენისასა“', who: ['choir'], note: 'ქერუბიმთა გალობის, ზიარების მუხლისა და „აღავსე პირი ჩემი“-ს ნაცვლად' },
        { title: '„სტუმრობისა საღმრთოსა“', who: ['choir'], note: '„ღირს არსის“ ნაცვლად — კანონის მე-9 გალობის ძლისპირი' },
        { title: 'ზიარება და განტევება', who: ['choir', 'priest'], extras: [{ kind: 'prayer', id: 'ziarebis-tsin', label: 'ზიარების წინა ლოცვები' }] },
      ] },
    );
    return services;
  }
  if (e === -2) {
    // Holy Friday: the twelve Gospels on Thursday evening, the Royal Hours, no liturgy, the vespers of the Shroud
    services.push(
      { id: 'vespers', slot: 'late', title: 'მწუხრი — გარდამოხსნის გამოსვენება', when: 'დიდ პარასკევს, შუადღის შემდეგ', note: khareba, steps: [
        { title: 'დიდი პარასკევის მწუხრი', who: ['priest', 'choir', 'reader'], note: 'მწუხრის ბოლოს — გარდამოხსნის გამოსვენება შუა ტაძარში', read: [{ src: { coll: 'x', n: 25, part: 4, from: /^დიდი პარასკევის მწუხრი/, label: 'დიდი პარასკევი · მწუხრი' } }] },
        { title: 'მცირე სერობა — ღვთისმშობლის გოდების კანონი', who: ['reader', 'choir'], note: 'საღამოს', extras: [x25(1, 'მცირე სერობის ჟამნი')] },
      ] },
      { id: 'matins', slot: 'eve', title: 'ცისკარი — 12 ვნების სახარება', when: 'დიდ ხუთშაბათს საღამოს', steps: [
        { title: 'ვნების თორმეტი სახარება', who: ['priest', 'choir', 'reader'], note: PASSION_GOSPELS.map((g, i) => `${i + 1}. ${g}`).join(' · '), hint: 'ყოველი სახარების წინ: „დიდება ვნებათა შენთა, უფალო“ — ყველას ანთებული სანთელი უჭირავს', read: [{ src: { coll: 'x', n: 25, part: 3, to: ROYAL, label: 'დიდი პარასკევი · ცისკარი' } }] },
      ] },
      { id: 'hours', slot: 'day', title: 'სამეუფო ჟამები', when: 'დიდ პარასკევს, დილით', steps: [
        { title: 'პირველი, მესამე, მეექვსე და მეცხრე სამეუფო ჟამი', who: ['reader', 'priest'], note: 'ყოველ ჟამზე — წინასწარმეტყველება, სამოციქულო და სახარება', read: [{ src: { coll: 'x', n: 25, part: 3, from: ROYAL, label: 'სამეუფო ჟამები' } }] },
        { title: 'სადილის ჟამი', who: ['reader'], read: [{ src: { coll: 'x', n: 25, part: 4, to: /^დიდი პარასკევის მწუხრი/, label: 'სადილის ჟამი' } }] },
      ] },
      { id: 'liturgy', slot: 'day', title: 'წირვა', when: 'დიდი პარასკევი', steps: [
        annun
          ? { title: 'ხარება დიდ პარასკევს', who: ['priest', 'choir'], note: 'ჩვეულებრივ ამ დღეს წირვა არ არის — ხარების გამო კი იოანე ოქროპირის წირვა აღესრულება', hint: 'წესი მღვდელს ჰკითხე' }
          : { title: 'დიდ პარასკევს წირვა არ აღესრულება', who: ['reader'], note: 'დღის მსახურებანი — სამეუფო ჟამები და მწუხრი გარდამოხსნის გამოსვენებით' },
      ] },
    );
    return services;
  }
  // Holy Saturday: matins with the lamentations on Friday evening, St Basil's liturgy with vespers, the midnight office
  services.push(
    { id: 'vespers', slot: 'with', title: 'მწუხრი', when: 'წირვასთან ერთად', note: 'ბასილი დიდის ლიტურგიის ნაწილია — იხ. ჩანართი „წირვა“', steps: [{ title: 'მწუხრი ბასილი დიდის ლიტურგიასთან', who: ['reader', 'choir'], note: '15 საწინასწარმეტყველო საკითხავით — სრული რიგი ჩანართში „წირვა“', extras: some(tri) }] },
    { id: 'matins', slot: 'eve', title: 'ცისკარი — გოდება საფლავთან', when: 'დიდ პარასკევს საღამოს', steps: [
      P('„კურთხეულ არს ღმერთი ჩვენი“', [M.begin], { who: ['priest'] }),
      { title: 'ექვსფსალმუნება', who: ['reader'], read: [{ say: AMEN }, R(FIX.sixPsalms)] },
      { title: '„ღმერთი უფალი“ და ტროპარნი', who: ['choir'], note: '„შვენიერმან იოსებ“ · „რაჟამს შთახედ საფლავად“ · „მენელსაცხებლეთა დედათა“', read: [hymns('matins')], extras: some(tri) },
      { title: 'ფსალმუნი 118 — ქებანი (გოდება)', who: ['choir', 'reader'], note: 'სამ დასად, ქებებით — გარდამოხსნის წინ', hint: 'ბოლოს: „გუნდნი ანგელოზთანი“' },
      { title: 'დიდი შაბათის კანონი', who: ['choir', 'reader'], note: 'ბეჭდურ მარხვანშია — აპში ჯერ არ არის' },
      { title: 'ქებანი, დიდი დიდებამაღალიანი და გარდამოხსნის ლიტანიობა', who: ['choir', 'priest'], note: 'ტაძრის გარშემო სამგზის', extras: [{ kind: 'text', src: FIX.greatDoxology, label: FIX.greatDoxology.label }] },
      { title: 'წინასწარმეტყველება, სამოციქულო და სახარება', who: ['reader', 'priest'], note: matinsGospel.map(r => `${r.name} ${r.ref}`).join(' · ') || 'ეზეკიელი 37:1–14 · 1 კორ. 5:6–8; გალ. 3:13–14 · მთ. 27:62–66', extras: readsOf(matinsGospel) },
      P('კვერექსები და განტევება', [M.dismissal], { who: ['priest', 'choir'] }),
    ] },
    { id: 'hours', slot: 'day', title: 'ჟამები', when: 'წირვის წინ', steps: [{ title: 'მესამე, მეექვსე და მეცხრე ჟამი', who: ['reader'], read: [...hourRead(6, true), ...hourRead(7, false), ...hourRead(9, false)] }] },
    { id: 'liturgy', slot: 'day', title: 'წირვა', when: 'ბასილი დიდისა, მწუხრთან ერთად', note: khareba, steps: [
      P('„კურთხეულ არს მეუფება“', [L.begin], { who: ['priest'] }),
      { title: 'ფსალმუნი 103 და დიდი კვერექსი', who: ['reader', 'deacon'], read: [R(FIX.come), R(FIX.ps103)] },
      { title: '„უფალო, ღაღად-ვყავ“', who: ['choir'], extras: some(text(FIX.lordICry, 'ფსალმუნები და მუხლები — ჟამნი')) },
      { title: 'შესვლა და „ნათელო მხიარულო“', who: ['priest', 'choir'], extras: some(text(FIX.gladLight)) },
      { title: '15 საწინასწარმეტყველო საკითხავი', who: ['reader', 'choir'], note: vespersText || 'დაბადებიდან დანიელამდე — მე-6 და მე-15 საკითხავზე გუნდი ჩასართავს გალობს', hint: 'მე-6-ის შემდეგ: „უგალობდეთ უფალსა, რამეთუ დიდებით დიდებულ არს“ · მე-15-ის შემდეგ: „უფალსა უგალობდით და უფროსად ამაღლებდით მას უკუნისამდე“' },
      { title: '„რაოდენთა ქრისტეს მიერ ნათელ-იღეთ“', who: ['choir'], note: 'სამწმიდაოს ნაცვლად' },
      { title: 'სამოციქულო', who: ['reader'], note: apostle.map(r => `${r.name} ${r.ref}`).join(' · ') || 'რომ. 6:3–11', extras: readsOf(apostle) },
      { title: '„აღდეგ, ღმერთო, განსაჯე ქვეყანა“', who: ['choir'], note: '„ალილუიას“ ნაცვლად — ამ დროს მღვდელმსახურნი შავ შესამოსელს თეთრით იცვლიან' },
      { title: 'სახარება', who: ['deacon', 'priest'], note: gospel.map(r => `${r.name} ${r.ref}`).join(' · ') || 'მთ. 28:1–20', extras: readsOf(gospel) },
      { title: '„სდუმენინ ყოველი ხორცი კაცობრივი“', who: ['choir'], note: 'ქერუბიმთა გალობის ნაცვლად' },
      { title: '„ნუ მტირ მე, დედაო“', who: ['choir'], note: '„ღირს არსის“ ნაცვლად — კანონის მე-9 გალობის ძლისპირი' },
      { title: 'ზიარება და განტევება', who: ['choir', 'priest'], extras: [{ kind: 'prayer', id: 'ziarebis-tsin', label: 'ზიარების წინა ლოცვები' }] },
    ] },
  );
  return services;
};

/** the great prokeimena of Bright Week's evenings, as ზატიკი gives them: Pascha's, Monday's … Friday's */
const BRIGHT_PROKEIMENA = [
  'ვინ არს ღმერთი დიდ, ვითარ ღმერთი ჩვენი', 'ღმერთმან ჩვენმან ცათა შინა და ქვეყანასა ზედა', 'ხმითა ჩემითა უფლისა მიმართ ღაღად-ვყავ',
  'ყურად-იღე, ღმერთო, ლოცვისა ჩემისა', 'შეგიყვარო შენ, უფალო, ძალო ჩემო', 'ეც მკვიდრობა მოშიშთა სახელისა შენისათა, უფალო',
];
/** Bright Week: the Paschal services, every day the same (ზატიკი) */
const brightWeek = (inp: DayInput, e: number): Service[] => {
  const z = pentecostarion(e);
  const zt = some(text(z, `ტექსტი — ${z?.label}`));
  const readings = inp.day ? readingsOf(inp.day) : [];
  const apostle = readings.filter(r => r.apostle && r.label !== 'ცისკ');
  const gospel = readings.filter(r => !r.apostle && r.label !== 'ცისკ');
  const hours = [{ kind: 'prayer', id: 'paseqis-zhamni', label: 'პასექის ჟამნი' } as Extra];
  // a saint's matins Gospel the calendar gives in this week (St George, St Mark…): read after the canon's sixth ode
  const matinsGospel = readings.filter(r => r.label === 'ცისკ');
  // the great prokeimenon of each evening (ზატიკი): Pascha's own evening, then Monday's … Friday's
  const prok = BRIGHT_PROKEIMENA[Math.max(0, e - 1)];
  return [
    { id: 'vespers', slot: e === 0 ? 'late' : 'eve', title: e === 0 ? 'სიყვარულის მწუხრი' : 'მწუხრი', when: e === 0 ? 'აღდგომის დღეს, შუადღის შემდეგ' : 'წინა საღამოს', note: `${e === 0 ? 'სახარება (ინ. 20:19–25) სხვადასხვა ენაზე იკითხება · ' : ''}ბრწყინვალე შვიდეული${greatFeastOf(inp.iso)?.id === 'khareba' ? ' · დღეს ხარებაც არის — მისი საგალობლები აღდგომისას ერთვის' : ''}${ownServicesOf(inp.iso).length ? ` · ${ownServicesOf(inp.iso).map(o => o.t).join(', ')} — საკუთარი განგება „დამატებით წიგნებშია“` : ''}`, steps: [
      { title: '„ქრისტე აღდგა“ — მუხლებით', who: ['priest', 'choir'], note: 'დავითნი არ იკითხება' },
      { title: '„უფალო ღაღად-ვყავ“ — აღდგომის დასდებელნი', who: ['choir'], extras: zt },
      { title: e <= 1 ? 'შესვლა სახარებით და „ნათელო მხიარულო“' : 'შესვლა საცეცხლურით და „ნათელო მხიარულო“', who: ['priest', 'deacon', 'choir'] },
      { title: `დიდი წარდგომა — „${prok}“`, who: ['deacon', 'choir'], note: 'ყოველ საღამოს — თავისი დიდი წარდგომა' },
      ...(e <= 1 ? [{ title: 'სახარება', who: ['priest'] as Who[], note: 'იოანე 20: 19-25', hint: 'მღვდელი კითხულობს ერისკენ პირით' }] : []),
      { title: 'სტიქარონსა ზედა — „აღდეგინ ღმერთი“', who: ['choir'] },
      { title: '„ქრისტე აღდგა“ და განტევება', who: ['choir', 'priest'] },
    ] },
    { id: 'matins', slot: e === 0 ? 'night' : 'day', title: 'ცისკარი', when: e === 0 ? 'აღდგომის ღამეს' : 'დილით', steps: [
      ...(e === 0 ? [
        { title: 'შუაღამის ლოცვა — დიდი შაბათის კანონით', who: ['reader', 'choir', 'priest'] as Who[], note: 'შუაღამემდე; ბოლოს გარდამოხსნას საკურთხეველში შეასვენებენ' },
        { title: 'ლიტანიობა ტაძრის გარშემო', who: ['priest', 'choir'] as Who[], note: '„აღდგომასა შენსა, ქრისტე მაცხოვარ“ — ანთებული სანთლებით', hint: 'დაკეტილ კართან მღვდელი იწყებს: „დიდება წმიდასა…“ — „ქრისტე აღდგა“' },
      ] : []),
      { title: '„ქრისტე აღდგა“ — მუხლებით', who: ['priest', 'choir'], note: 'ექვსი ფსალმუნი არ იკითხება' },
      { title: 'აღდგომის კანონი — „აღდგომისა დღე არს“', who: ['choir'], extras: some(text({ coll: 'zatiki', n: 1, part: 0, from: /კანონი/, label: 'კანონი — ზატიკი' })) },
      ...(matinsGospel.length ? [{
        title: 'წარდგომა და სახარება — წმიდანისა', who: ['deacon', 'priest', 'choir'] as Who[], note: matinsGospel.map(r => `${r.name} ${r.ref}`).join(' · '),
        hint: 'კანონის მე-6 გალობის შემდეგ', extras: [{ kind: 'readings', items: matinsGospel } as Extra],
      }] : []),
      { title: 'განმანათლებელი — „ხორცითა მიიძინე“', who: ['choir'] },
      { title: 'ქებანი და აღდგომის დასდებელნი', who: ['choir'], extras: zt },
      ...(e === 0 ? [{ title: 'იოანე ოქროპირის საკატეხიზმო სიტყვა', who: ['priest'] as Who[], note: 'მღვდელი კითხულობს; შემდეგ — ოქროპირის ტროპარი' }] : []),
      { title: '„ქრისტე აღდგა“ და განტევება', who: ['choir', 'priest'] },
    ] },
    { id: 'hours', slot: 'day', title: 'ჟამები', when: 'წირვის წინ', steps: [
      { title: 'პასექის ჟამნი', who: ['reader', 'choir'], note: 'ბრწყინვალე შვიდეულში ჩვეულებრივი ჟამების ნაცვლად', extras: hours },
    ] },
    { id: 'liturgy', slot: 'day', title: 'წირვა', when: 'დილით', steps: [
      { title: '„ქრისტე აღდგა“ და აღდგომის ანტიფონები', who: ['priest', 'choir'] },
      { title: 'შესვლა — „ეკლესიათა შინა აკურთხევდით ღმერთსა“', who: ['deacon', 'choir'] },
      { title: 'ტროპარნი — „ქრისტე აღდგა“, იპაკოი, აღდგომის კონდაკი', who: ['choir'] },
      { title: '„რაოდენთა ქრისტეს მიერ ნათელ-იღეთ“', who: ['choir'], note: 'სამწმიდაოს ნაცვლად' },
      { title: 'სამოციქულო', who: ['reader'], note: apostle.map(r => `${r.name} ${r.ref}`).join(' · ') || undefined, extras: apostle.length ? [{ kind: 'readings', items: apostle }] : undefined },
      { title: 'სახარება', who: ['deacon', 'priest'], note: gospel.map(r => `${r.name} ${r.ref}`).join(' · ') || undefined },
      { title: '„ანგელოზი ღაღადებს“ — „განათლდი, განათლდი“', who: ['choir'], note: '„ღირს არსის“ ნაცვლად', extras: [{ kind: 'prayer', id: 'ghirs-arsis-nacvlad', label: 'ღირს-არსის ნაცვლად საკითხავნი' }] },
      { title: 'ზიარების მუხლი — „ხორცი ქრისტესი მოვიღოთ“', who: ['choir'], extras: [{ kind: 'prayer', id: 'ziarebis-tsin', label: 'ზიარების წინა ლოცვები' }] },
      ...(e === 0 ? [{ title: 'არტოსის კურთხევა', who: ['priest', 'choir'] as Who[], note: 'ამბიონის ლოცვის შემდეგ' }] : []),
      { title: '„ქრისტე აღდგა“ და განტევება', who: ['choir', 'priest'], extras: [{ kind: 'prayer', id: 'ziarebis-shemdeg', label: 'ზიარების შემდგომი ლოცვები' }] },
      ...(e === 6 ? [{ title: 'არტოსის განტეხა', who: ['priest'] as Who[], note: 'ბრწყინვალე შაბათს, წირვის შემდეგ — მრევლს ურიგდება' }] : []),
    ] },
  ];
};

// ---------- „ახლა“: what is served at this hour (the page opens on it) ----------
/** from two in the afternoon the evening's service is the next one: the church day begins at vespers */
export const EVENING_HOUR = 14;
/** Great Friday's and Pascha's own vespers are served in their afternoon: until five the page stays on them */
const LATE_UNTIL = 17;
/** Pascha's matins begins at midnight: it is „now“ until three */
const NIGHT_UNTIL = 3;
export type NowPart = 'eve' | 'day' | 'late';
/** the church day served at this hour of a calendar day, and the part of it: before two — the day's own morning; from two —
 *  the next day's evening */
export const nowPart = (today: string, hour: number): { iso: string; part: NowPart } => {
  if (hour < EVENING_HOUR) return { iso: today, part: 'day' };
  const e = easterOffset(today);
  if ((e === -2 || e === 0) && hour < LATE_UNTIL) return { iso: today, part: 'late' };
  return { iso: addDays(today, 1), part: 'eve' };
};
const SLOT_TIME: Record<ServiceSlot, number> = { prev: 0, eve: 1, night: 2, day: 3, late: 4, with: 5 };
const TAB_ORDER: ServiceId[] = ['vespers', 'compline', 'matins', 'hours', 'liturgy'];
/** a day's services in the order they are served (one that is only a part of the liturgy is left out) */
export const inTime = (services: Service[]): Service[] =>
  services.filter(s => s.slot !== 'with')
    .sort((a, b) => SLOT_TIME[a.slot] - SLOT_TIME[b.slot] || TAB_ORDER.indexOf(a.id) - TAB_ORDER.indexOf(b.id));
/** the service served after this one */
export const serviceAfter = (services: Service[], id: ServiceId): Service | null => {
  const list = inTime(services);
  const i = list.findIndex(s => s.id === id);
  return i >= 0 && i < list.length - 1 ? list[i + 1] : null;
};
/** the service the page opens on: the first one of this part of the day — or the last of them the reader has marked a place
 *  in (`marked`), so a page opened again goes on where the reader was */
export const serviceNow = (services: Service[], part: NowPart, hour: number, marked: (id: ServiceId) => boolean = () => false): ServiceId => {
  const list = inTime(services);
  const fits = (s: Service) =>
    part === 'eve' ? s.slot === 'eve' || s.slot === 'night'
      : part === 'late' ? s.slot === 'late'
        : s.slot === 'day' || (s.slot === 'night' && hour < NIGHT_UNTIL);
  const now = list.filter(fits);
  // an evening with nothing of its own (the vespers was joined to the morning's service): the next morning's first service
  const pool = now.length ? now : list.filter(s => s.slot === 'day');
  const kept = [...pool].reverse().find(s => marked(s.id));
  return (kept ?? pool[0] ?? list[0] ?? services[0]).id;
};
/** „დღეს საღამოს“ — when the service of „now“ is served, in words (an evening with no service of its own shows the next
 *  morning's) */
export const nowWord = (part: NowPart, slot: ServiceSlot): string =>
  slot === 'night' ? 'ამ ღამით'
    : part === 'late' ? 'დღეს, შუადღის შემდეგ'
      : part === 'day' ? 'დღეს დილით'
        : slot === 'eve' ? 'დღეს საღამოს' : 'ხვალ დილით';
