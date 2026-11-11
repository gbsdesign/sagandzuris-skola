import type { CalendarDay } from '../data/churchCalendar';
import { FEAST_RULES, addDays, orthodoxEaster } from '../data/churchFeasts';
import { dayText, readingsOf, toneOf, type Reading } from './dayReadings';
import {
  FIX, PRIEST, gospelNumberOf, menaion, octoechos, pentecostarion, saintKindOf, saintProkeimenon, sundayExapost, weekdayExapost, type TextSrc,
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
export type ServiceId = 'vespers' | 'matins' | 'hours' | 'liturgy';
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
export interface Hymn { role: 'feast' | 'resurrection' | 'day' | 'temple' | 'saint' | 'protection' | 'departed' | 'theotokion'; label: string; glory?: 'glory' | 'now' }
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
const hourRead = (n: number, first: boolean, prev = false): Read[] => [
  ...(first ? [R(FIX.opening), R(FIX.twelve)] : [R(FIX.come)]),
  R(FIX.hourPsalms(n)),
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
  const order = inp.order ?? DEFAULT_ORDER;
  const dow = dowOf(iso);
  const sunday = dow === 0;
  const great = greatFeastOf(iso);
  const season = seasonOf(iso);
  if (season.bright) return brightWeek(inp, season.e);
  const vigilDay = atLeast(rank, 'vigil'); // Sunday, a vigil saint, a great feast
  const big = atLeast(rank, 'polyeleos');
  const dox = atLeast(rank, 'doxology');
  const festal = big || sunday; // the great vespers, with the entrance
  /** vespers and matins served together in the evening */
  const joined = vigilDay ? order.sat !== 'apart' : order.weekday === 'joined';
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
  const lentText = season.e >= -70 && season.e < 0 ? text({ coll: 'jamni', n: 25, part: 0, label: 'ჟამნი · მარხვანი' }) : null;
  const christIsRisen = season.paschal;
  const V = PRIEST.vespers, M = PRIEST.matins, L = PRIEST.liturgy;

  // ----- vespers -----
  const k = season.lentWeekday ? 18 : vespersKathisma(iso, rank);
  const v: Step[] = [];
  v.push(P('„კურთხეულ არს ღმერთი ჩვენი“', [V.begin], { who: ['priest'], hint: vigilDay && joined ? 'ღამისთევაზე: „აღსდეგით!“ და „დიდება წმიდასა“ — „მოვედით, თაყვანის-ვსცეთ“' : undefined }));
  if (christIsRisen) v.push({ title: '„ქრისტე აღდგა“ — სამგზის', who: ['priest', 'choir'], note: 'აღდგომის წარგზავნამდე მსახურება ასე იწყება' });
  if (!(vigilDay && joined)) v.push({ title: 'მეცხრე ჟამი', who: ['reader'], note: 'ტროპარი და კონდაკი — წინა დღის წმიდანისა', hint: 'მღვდლის „კურთხეულ არს“-ის შემდეგ იწყებ', read: hourRead(9, true, true), extras: [book(BOOK.hour9)] });
  v.push(festal
    ? { title: '„მოვედით, თაყვანის-ვსცეთ“ და ფსალმუნი 103', who: ['choir'], note: 'დიდ მწუხრზე იგალობება', extras: some(text(FIX.ps103), book(sunday ? BOOK.sunVespers : BOOK.dayVespers)), chants: ['mw-2', 'mw-3'] }
    : { title: '„მოვედით, თაყვანის-ვსცეთ“ და ფსალმუნი 103', who: ['reader'], note: 'იკითხება', read: [R(FIX.come), R(FIX.ps103), { say: 'დიდება მამასა და ძესა და წმიდასა სულსა, აწ და მარადის და უკუნითი უკუნისამდე, ამინ. ალილუია, ალილუია, ალილუია, დიდება შენდა, ღმერთო (სამგზის).' }], chants: ['mw-2', 'mw-3'] });
  v.push(P('დიდი კვერექსი', [V.great], { hint: 'ამ დროს მღვდელი საიდუმლოდ კითხულობს სანთლის ლოცვებს', chants: ['mw-4'] }));
  if (k === 'first') v.push({ title: '„ნეტარ არს კაცი“ — კანონი 1-ის პირველი დიდება', who: ['choir'], note: 'დღესასწაულის წინა საღამოს — იგალობება', extras: [{ kind: 'kathisma', n: 1 }], chants: ['mw-5'] });
  else if (k === 1) v.push({ title: 'დავითნის კანონი 1 — „ნეტარ არს კაცი“', who: ['choir', 'reader'], note: 'შაბათ საღამოს — მთელი კანონი', read: [{ kathisma: 1 }], chants: ['mw-5'] });
  else if (k) v.push({ title: `დავითნის კანონი ${k}`, who: ['reader'], note: season.lentWeekday ? 'მარხვის განრიგით' : undefined, hint: 'თუ წინა დღეს ღამისთევა იყო, კანონი არ იკითხება', read: [{ kathisma: k }] });
  if (k) v.push(P('მცირე კვერექსი', [V.small], { chants: ['mw-6'] }));
  if (season.kneeling) v.push({ title: 'მუხლმოდრეკის ლოცვები', who: ['priest'], note: 'სულთმოფენობის საღამოს — სამი ლოცვა მუხლმოდრეკით' });
  v.push({
    title: '„უფალო, ღაღად-ვყავ“ და დასდებელნი', who: ['choir'],
    note: great ? 'დღესასწაულის დასდებელნი' : zatiki ? 'ზატიკის დასდებელნი' : season.lentWeekday ? 'მარხვანისა და წმიდანისა' : sunday ? `${toneTxt} · 10 მუხლად: აღდგომისანი და წმიდანისა` : dox ? '6 მუხლად — წმიდანისა' : `${toneTxt} · 6 მუხლად: 3 პარაკლიტონისა, 3 წმიდანისა`,
    hint: sunday ? '„დიდება“ — წმიდანისა · „აწდა“ — კვირის ხმის დოგმატიკონი' : dox ? '„დიდება“ — წმიდანისა · „აწდა“ — დოგმატიკონი „დიდების“ ხმაზე' : '„დიდება“ — წმიდანისა · „აწდა“ — ღვთისმშობლისა, შვიდეულის დღისა („დიდების“ ხმაზე)',
    extras: some(
      text(FIX.lordICry, 'ფსალმუნები და მუხლები — ჟამნი'),
      !great && text(zatiki, `ტექსტი — ${zatiki?.label}`),
      !great && !zatiki && !season.lentWeekday && (sunday || !dox) && text(octoechos(tone, eveDow, 'stichera'), `დასდებელნი — პარაკლიტონი`),
      !great && season.lentWeekday && lentText,
      !great && !zatiki && text(menaion(kind, 'stichera'), 'დასდებელნი — წმიდანისა (საზიარო)'),
    ),
    chants: ['mw-7', 'mw-8', ...(sunday ? ['mw-10'] : ['mw-9'])], toned: true,
  });
  if (festal || season.presanctified) v.push(P('შესვლა საცეცხლურით — „სიბრძნით აღემართენით“', [V.entrance], { who: ['priest', 'deacon'] }));
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
    note: sunday ? `${toneTxt} · აღდგომისანი` : dox ? 'წმიდანისანი — თავისი ჩასართავებით' : season.lentWeekday ? 'მარხვანისა' : `${toneTxt} · პარაკლიტონისანი`,
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
  else v.push({ title: 'ტროპარნი', who: ['reader'], note: season.lentWeekday ? '„ღვთისმშობელო ქალწულო“ და სხვანი — მარხვის წესით' : 'წმიდანის ტროპარი · „დიდება… აწდა“ — ღვთისმშობლისა', read: [{ hymns: 'vespers' }] });
  if (season.lentWeekday) v.push({ title: 'ეფრემ ასურის ლოცვა', who: ['priest'], note: '„უფალო და მეუფეო ცხოვრებისა ჩემისაო“ — მეტანიებით', extras: [{ kind: 'prayer', id: 'efrem-asuri', label: 'ეფრემ ასურის ლოცვა' }] });
  if (!festal) v.push(P('მრჩობლი კვერექსი', [M.augmented], { chants: ['mw-15'] }));
  if (litya) v.push(P('ხუთი პურის კურთხევა', [V.bread, V.blessing], { who: ['priest', 'choir'], hint: '„იყავნ სახელი უფლისა“ (სამგზის) და ფსალმუნი 33 — „ვაკურთხო უფალი“', extras: some(text(FIX.typikaEnd)) }));
  if (joined) v.push({ title: 'ცისკარი იწყება', who: ['reader'], note: 'განტევება არ ითქმის — მწუხრს ცისკარი მოსდევს, ექვსფსალმუნებიდან', hint: 'გადადი ჩანართზე „ცისკარი“' });
  else v.push(P('განტევება', [M.dismissal], { who: ['priest', 'choir'], hint: '„სიბრძნით“ — „გვაკურთხენ“ · „უპატიოსნესსა“ · „დიდება, აწდა. უფალო, შეგვიწყალენ (3). გვაკურთხენ“', chants: ['mw-21'] }));

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
  if (season.lentWeekday) m.push({ title: '„ალილუია“ და სამების საგალობლები', who: ['choir', 'reader'], note: '„ღმერთი უფალის“ ნაცვლად — მარხვის დღეებში', extras: some(lentText) });
  else m.push({
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
      title: `წარდგომა ${i + 1} სტიქოლოგიის შემდეგ`, who: ['choir', 'reader'],
      note: great ? 'დღესასწაულისა' : sunday ? `${toneTxt} · პარაკლიტონიდან` : dox && (big || i < 2) ? 'წმიდანისა' : `${toneTxt} · პარაკლიტონიდან`,
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
    note: great ? 'დღესასწაულის კანონი' : zatiki ? 'ზატიკის კანონი' : season.lentWeekday ? 'ტრიოდისა და წმიდანისა' : sunday ? `${toneTxt}: აღდგომისა (4), ჯვარაღდგომისა (3), ღვთისმშობლისა (3) და წმიდანისა (4)` : big ? 'ღვთისმშობლისა (6) და წმიდანისა (8)' : dox ? `პარაკლიტონის ორი კანონი (4 + 4) და წმიდანისა (6)` : `პარაკლიტონის ორი კანონი (6 + 4) და წმიდანისა (4)`,
    hint: `${dox || sunday ? 'კატავასია — „აღაღე პირი ჩემი“, ყოველი გალობის შემდეგ' : 'კატავასია — მხოლოდ მე-3, მე-6, მე-8 და მე-9 გალობის შემდეგ (ბოლო კანონის ძლისპირი)'} · მე-3-ის შემდეგ — მცირე კვერექსი და წარდგომა · მე-6-ის შემდეგ — მცირე კვერექსი, კონდაკი და იკოსი`,
    extras: great ? undefined : some(
      text(zatiki, `ტექსტი — ${zatiki?.label}`),
      !zatiki && !season.lentWeekday && !(big && !sunday) && text(octoechos(tone, sunday ? 6 : eveDow, 'canon'), 'კანონი — პარაკლიტონი'),
      season.lentWeekday && lentText,
      !zatiki && text(menaion(kind, 'canon'), 'კანონი — წმიდანისა (საზიარო)'),
    ),
  });
  m.push({ title: '„ადიდებს სული ჩემი უფალსა“ — „უპატიოსნესსა“', who: ['choir'], note: great ? 'დიდ დღესასწაულზე — დღესასწაულის ჩასართავები' : season.paschal ? 'ზატიკში — „ანგელოზი ღაღადებდა“' : 'მე-8 გალობის შემდეგ', extras: great || season.paschal ? undefined : some(text(FIX.magnificat)), chants: great || season.paschal ? undefined : ['ck-20', 'ck-21'] });
  if (!dox && !sunday && !season.lentWeekday) m.push({ title: '„ღირს არს ჭეშმარიტად“', who: ['choir', 'reader'], note: 'მე-9 გალობის შემდეგ — მხოლოდ სადაგ დღეს' });
  m.push(P('მცირე კვერექსი', [M.afterNine]));
  if (sunday) m.push({ title: '„წმიდა არს უფალი ღმერთი ჩვენი“', who: ['deacon', 'choir'], chants: ['ck-22'] });
  m.push({
    title: 'განმანათლებელი', who: ['choir', 'reader'],
    note: sunday ? `აღდგომისა — სახარების რიგით${gospelNo ? ` (${gospelNo})` : ''} · „დიდება“ — წმიდანისა · „აწდა“ — ღვთისმშობლისა` : dox ? 'წმიდანისა' : 'შვიდეულის დღისა · „დიდება“ — წმიდანისა · „აწდა“ — ღვთისმშობლისა',
    extras: great || zatiki ? undefined : some(sunday ? text(sundayExapost(gospelNo ?? 0)) : dox ? text(menaion(kind, 'exapostilarion'), 'ტექსტი — წმიდანისა (საზიარო)') : text(weekdayExapost(dow))),
    chants: ['ck-a16-131'],
  });
  const praises = dox || sunday;
  if (praises) {
    m.push({
      title: '„ყოველი სული აქებდით უფალსა“ — ქებანი დასდებლებით', who: ['choir'], note: sunday ? `${toneTxt} · აღდგომისანი — 8 მუხლად` : 'წმიდანისა — 4 მუხლად',
      hint: sunday ? '„დიდება“ — სახარების გერი · „აწდა“ — „უმეტესად კურთხეულ ხარ“' : undefined,
      extras: great || zatiki ? undefined : some(sunday ? text(octoechos(tone, 6, 'lauds'), 'დასდებელნი — პარაკლიტონი') : text(menaion(kind, 'lauds'), 'დასდებელნი — წმიდანისა (საზიარო)')),
      chants: sunday ? ['ck-15', 'ck-a17-3'] : ['ck-15'], toned: sunday,
    });
    m.push({ title: 'დიდი დიდებამაღალიანი — „დიდება მაღალთა შინა ღმერთსა“', who: ['choir'], note: 'იგალობება', extras: some(text(FIX.greatDoxology)), chants: ['ck-24', 'ck-1'] });
    m.push(sunday
      ? { title: (tone ?? 1) % 2 ? 'ტროპარი — „დღეს ცხორება არს“' : 'ტროპარი — „აღსდეგ საფლავისაგან“', who: ['choir'], hint: 'კენტ ხმებში (1, 3, 5, 7) — „დღეს ცხორება“, ლუწში — „აღსდეგ საფლავისაგან“', chants: [(tone ?? 1) % 2 ? 'ck-25' : 'ck-26'] }
      : { title: 'ტროპარნი', who: ['choir'], note: great ? 'დღესასწაულის ტროპარი' : 'წმიდანის ტროპარი · „დიდება… აწდა“ — ღვთისმშობლისა', extras: [{ kind: 'troparia', at: 'matins' }] });
    m.push(P('მრჩობლი კვერექსი', [M.augmented], { chants: ['ck-16'] }));
    m.push(P('თხოვნითი კვერექსი', [M.supplication], { chants: ['ck-27'] }));
  } else {
    m.push({ title: 'ქებანი — „აქებდით უფალსა ცათაგან“', who: ['reader'], note: 'იკითხება, დასდებლების გარეშე', read: [R(FIX.praises)] });
    m.push({ title: '„შენდა დიდება შვენის“ და დიდებამაღალიანი', who: ['reader'], note: 'ყოველდღიური — იკითხება', read: [{ say: 'დიდება მამასა და ძესა და წმიდასა სულსა, აწ და მარადის და უკუნითი უკუნისამდე, ამინ.' }, R(FIX.dailyDoxology)] });
    m.push(P('თხოვნითი კვერექსი', [M.supplication], { chants: ['ck-27'] }));
    if (!season.lentWeekday) m.push({ title: '„აღვივსენით“-სა ზედა დასდებელნი', who: ['choir', 'reader'], note: `${toneTxt} · პარაკლიტონისანი`, hint: 'ჩასართავი მუხლები — ჟამნიდან · „დიდება… აწდა“ — ღვთისმშობლისა', extras: some(text(FIX.mornVerses, 'ჩასართავი მუხლები — ჟამნი'), !zatiki && text(octoechos(tone, eveDow, 'lauds'), 'დასდებელნი — პარაკლიტონი')) });
    m.push({ title: '„კეთილ არს აღსარებად უფლისა“ და სამწმიდაო', who: ['reader'], note: 'ერთგზის', hint: '„მამაო ჩვენოს“ შემდეგ მღვდელი: „რამეთუ შენი არს სუფევა“ — შენ: „ამინ“', read: [R(FIX.goodToConfess), R(FIX.trisagion)] });
    m.push({ title: 'ტროპარნი', who: ['reader'], note: 'წმიდანის ტროპარი · „დიდება… აწდა“ — ღვთისმშობლისა', read: [{ hymns: 'matins' }] });
    m.push(P('მრჩობლი კვერექსი', [M.augmented], { chants: ['ck-16'] }));
  }
  if (season.lentWeekday) m.push({ title: 'ეფრემ ასურის ლოცვა', who: ['priest'], note: 'მეტანიებით', extras: [{ kind: 'prayer', id: 'efrem-asuri', label: 'ეფრემ ასურის ლოცვა' }] });
  m.push(P('განტევება', [M.dismissal], { who: ['priest', 'choir'], hint: 'სადაგ დღეს განტევების ნაცვლად: „სიბრძნით“ — „გვაკურთხენ“ — „რომელი იგი არს კურთხეულ“ — „ამინ. დაამტკიცე, ღმერთო“ და მაშინვე პირველი ჟამი' }));
  m.push({ title: 'პირველი ჟამი', who: ['reader'], note: sunday ? 'ტროპარი — აღდგომისა, „დიდება“ — წმიდანისა · კონდაკი — აღდგომისა' : 'ტროპარი და კონდაკი — წმიდანისა', hint: 'ბოლოს მღვდელი: „ქრისტე, ნათელო ჭეშმარიტო“ · გუნდი: „ზეშთა მბრძოლისა“', read: hourRead(5, false), extras: [book(BOOK.hour1)], chants: ['ck-a17-112', 'ck-29'] });

  // ----- hours -----
  const hourNote = sunday ? 'ტროპარი — აღდგომისა, „დიდება“ — წმიდანისა · კონდაკი — აღდგომისა' : great ? 'ტროპარი და კონდაკი — დღესასწაულისა' : 'ტროპარი და კონდაკი — წმიდანისა';
  const h: Step[] = [
    P('„კურთხეულ არს ღმერთი ჩვენი“', [V.begin], { who: ['priest'] }),
    { title: 'მესამე ჟამი', who: ['reader'], note: season.lentWeekday ? 'მარხვაში — დავითნის კანონით და ჟამის ტროპარით' : hourNote, hint: 'ფს. 16, 24, 50 · „მამაო ჩვენოს“ შემდეგ მღვდელი: „რამეთუ შენი არს სუფევა“ — შენ: „ამინ“', read: hourRead(6, true), extras: [book(BOOK.hour3)] },
    { title: 'მეექვსე ჟამი', who: ['reader'], note: season.lentWeekday ? 'მარხვაში — წინასწარმეტყველების საკითხავით' : hourNote, hint: 'ფს. 53, 54, 90 · ბოლოს მღვდელი განტევებას ამბობს', read: hourRead(7, false), extras: [book(BOOK.hour6)] },
  ];
  if (season.lentWeekday) h.push({ title: 'ეფრემ ასურის ლოცვა', who: ['reader'], note: 'ყოველი ჟამის ბოლოს — მეტანიებით', extras: [{ kind: 'prayer', id: 'efrem-asuri', label: 'ეფრემ ასურის ლოცვა' }] });

  // ----- liturgy -----
  const eveName = `${WEEKDAY_NOM[eveDow]} საღამოს`;
  const services: Service[] = [
    { id: 'vespers', title: 'მწუხრი', when: `${eveName}${vigilDay && joined ? ' · ღამისთევა' : ''}`, steps: v },
    { id: 'matins', title: 'ცისკარი', when: joined ? `${eveName} — მწუხრს მოსდევს` : 'დილით', steps: m },
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
      { title: '„კურთხეულ არს სუფევა“ და ფს. 103', who: ['priest', 'reader'], read: [R(FIX.come), R(FIX.ps103)] },
      P('დიდი კვერექსი', [V.great]),
      { title: 'დავითნის კანონი 18', who: ['reader'], hint: 'ყოველი დიდების შემდეგ — მცირე კვერექსი', read: [{ kathisma: 18 }] },
      { title: '„უფალო, ღაღად-ვყავ“', who: ['choir'], extras: some(text(FIX.lordICry, 'ფსალმუნები და მუხლები — ჟამნი'), lentText) },
      { title: 'შესვლა და „ნათელო მხიარულო“', who: ['priest', 'choir'], extras: some(text(FIX.gladLight)) },
      { title: 'წარდგომა და საკითხავები', who: ['reader'], note: vespersText || 'დაბადებისა და იგავთა — კალენდრის მიხედვით' },
      { title: '„წარემართენ ლოცვაჲ ჩემი“', who: ['choir'], note: 'ფს. 140 — მუხლმოდრეკით' },
      { title: 'ეფრემ ასურის ლოცვა', who: ['priest'], extras: [{ kind: 'prayer', id: 'efrem-asuri', label: 'ეფრემ ასურის ლოცვა' }] },
      ...(apostle.length ? [{ title: 'სამოციქულო', who: ['reader'] as Who[], note: apostle.map(r => `${r.name} ${r.ref}`).join(' · '), extras: [{ kind: 'readings', items: apostle } as Extra] }] : []),
      P('კვერექსები'),
      { title: '„აწ ძალნი ზეცისანი“', who: ['choir'], note: 'ქერუბიმთა გალობის ნაცვლად' },
      { title: '„მამაო ჩვენო“', who: ['choir'], chants: ['chant-35'] },
      { title: 'ზიარების მუხლი — „იხილეთ და იგემეთ“', who: ['choir'], hint: 'ამ დროს მედავითნე კითხულობს ზიარების წინა ლოცვებს', extras: [{ kind: 'prayer', id: 'ziarebis-tsin', label: 'ზიარების წინა ლოცვები' }] },
      { title: '„ვაკურთხო უფალი“, ფს. 33 და განტევება', who: ['choir', 'reader', 'priest'], read: [R(FIX.typikaEnd)] },
    ] });
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
