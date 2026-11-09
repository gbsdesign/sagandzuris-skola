import type { CalendarDay } from '../data/churchCalendar';
import { FEAST_RULES, addDays, orthodoxEaster } from '../data/churchFeasts';
import { readingsOf, toneOf, type Reading } from './dayReadings';

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
  | { kind: 'tone' };

export interface Step {
  title: string;
  who: Who[];
  /** what changes today, in a line (wine) */
  note?: string;
  /** a softer second line */
  hint?: string;
  extras?: Extra[];
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
const tonePart = (tone: number | null, dow: number): Extra | null =>
  tone ? { kind: 'book', coll: 'paraklitoni', n: tone, part: dow, label: `პარაკლიტონი · ხმა ${tone} · ${['კვირიაკე', 'ორშაბათი', 'სამშაბათი', 'ოთხშაბათი', 'ხუთშაბათი', 'პარასკევი', 'შაბათი'][dow]}` } : null;
const some = (...xs: (Extra | null | false | undefined)[]) => xs.filter(Boolean) as Extra[];

export const buildServices = (inp: DayInput): Service[] => {
  const { iso, day, tone, rank } = inp;
  const dow = dowOf(iso);
  const sunday = dow === 0;
  const great = greatFeastOf(iso);
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

  // ----- vespers -----
  const k = vespersKathisma(iso, rank);
  const v: Step[] = [];
  if (!vigil) v.push({ title: 'მეცხრე ჟამი', who: ['reader'], hint: 'ფს. 83, 84, 85 · დღის ტროპარი და კონდაკი', extras: [book(BOOK.hour9)] });
  v.push({ title: '„მოვედით თაყვანი-ვსცეთ“ და ფსალმუნი 103', who: vigil ? ['choir'] : ['reader'], note: vigil ? 'ღამისთევაზე ფს. 103-ს გუნდი გალობს' : undefined, extras: [book(sunday ? BOOK.sunVespers : BOOK.dayVespers)] });
  v.push({ title: 'დიდი კვერექსი', who: ['deacon', 'choir'] });
  if (k === 'first') v.push({ title: 'დავითნის კანონი 1 — პირველი დიდება', who: ['choir'], note: '„ნეტარ არს კაცი“ — დღესასწაულის წინა საღამოს', extras: [{ kind: 'kathisma', n: 1 }] });
  else if (k) v.push({ title: `დავითნის კანონი ${k}`, who: ['reader'], note: k === 1 && sunday ? '„ნეტარ არს კაცი“ — მთელი კანონი' : undefined, extras: [{ kind: 'kathisma', n: k }] });
  else v.push({ title: 'დავითნის კანონი', who: ['reader'], note: 'კვირა საღამოს კანონი არ იკითხება' });
  v.push({
    title: '„უფალო ღაღად-ვყავ“ და დასდებელნი', who: ['choir'],
    note: great ? 'დღესასწაულის დასდებელნი' : sunday ? `${toneTxt} · აღდგომისანი და წმიდანისა` : big ? 'წმიდანის დასდებელნი' : `${toneTxt} · 3 პარაკლიტონისა, 3 წმიდანისა`,
    hint: sunday ? '„დიდება… აწდა“ — დოგმატიკონი' : '„დიდება“ — წმიდანისა · „აწდა“ — ღვთისმშობლისა',
    extras: some(tonePart(tone, eveDow), { kind: 'tone' }),
  });
  if (big || sunday) v.push({ title: 'შესვლა საცეცხლურით', who: ['priest', 'deacon'] });
  v.push({ title: '„ნათელო მხიარულო“', who: big || sunday ? ['choir'] : ['reader'] });
  v.push({ title: 'წარდგომა', who: ['deacon', 'choir'], note: VESPERS_PROKEIMENON[eveDow] });
  if (vespersText) v.push({ title: 'საწინასწარმეტყველო საკითხავები', who: ['reader'], note: vespersText, extras: [{ kind: 'vespersReadings', text: vespersText }] });
  if (big || sunday) v.push({ title: 'ვრცელი კვერექსი', who: ['deacon', 'choir'] });
  v.push({ title: '„ღირს-მყავ, უფალო“', who: big || sunday ? ['choir'] : ['reader'], note: big || sunday ? 'იგალობება' : 'იკითხება' });
  v.push({ title: 'სავედრებელი კვერექსი', who: ['deacon', 'choir'] });
  if (vigil) v.push({ title: 'ლიტია', who: ['choir', 'priest', 'deacon'], note: 'ტაძრის წმიდანისა და დღისა დასდებელნი' });
  v.push({ title: 'სტიხარონსა ზედა დასდებელნი', who: ['choir'], note: sunday ? `${toneTxt} · აღდგომისანი` : big ? 'წმიდანისანი' : `${toneTxt} · პარაკლიტონისანი` });
  v.push({ title: '„აწ განუტევე“ და სამწმიდაო', who: ['reader'], extras: [{ kind: 'prayer', id: 'dila', label: 'სამწმიდაო — ლოცვანში' }] });
  if (vigil && sunday) v.push({ title: 'ტროპარი — „ღვთისმშობელო ქალწულო“', who: ['choir'], note: 'სამგზის' });
  else v.push({ title: 'ტროპარნი', who: vigil ? ['choir'] : ['reader'], note: vigil ? (great ? 'დღესასწაულის ტროპარი სამგზის' : 'წმიდანის ტროპარი ორგზის, „ღვთისმშობელო ქალწულო“ ერთგზის') : undefined, extras: vigil && !great ? undefined : [{ kind: 'troparia', at: 'vespers' }] });
  if (!big && !sunday) v.push({ title: 'ვრცელი კვერექსი', who: ['deacon', 'choir'] });
  if (vigil) v.push({ title: 'ხუთი პურის კურთხევა', who: ['priest', 'choir'], note: '„აკურთხევდე უფალსა“ (ფს. 33) — ცისკარი იწყება ექვსი ფსალმუნით' });
  else v.push({ title: 'განტევება', who: ['priest'] });

  // ----- matins -----
  const m: Step[] = [];
  if (!vigil) m.push({ title: 'მეფური ფსალმუნები (19, 20)', who: ['reader'], hint: 'ტროპარნი, მცირე კვერექსი', extras: [book(sunday ? BOOK.sunMatins : BOOK.dayMatins)] });
  m.push({ title: 'ექვსი ფსალმუნი', who: ['reader'], hint: 'ფს. 3, 37, 62, 87, 102, 142 — ტაძარში ჩუმად ისმენენ', extras: [book(BOOK.matins)] });
  m.push({ title: 'დიდი კვერექსი', who: ['deacon', 'choir'] });
  m.push({ title: '„ღმერთი უფალი“ და ტროპარნი', who: ['choir'], note: tone ? `${great ? 'დღესასწაულის' : sunday ? `აღდგომის, ხმა ${tone}` : 'დღის ტროპარის'} ხმით` : undefined, extras: [{ kind: 'troparia', at: 'matins' }] });
  const mk = matinsKathismas(iso, rank);
  m.push({ title: `დავითნის კანონები ${mk.join(', ')}`, who: ['reader'], hint: 'თითო კანონის შემდეგ — მცირე კვერექსი და წარდგომანი (ჯდომითნი)', extras: mk.map(n => ({ kind: 'kathisma', n }) as Extra) });
  if (big) {
    m.push({ title: 'პოლიელეოსი — „აქებდით სახელსა უფლისასა“', who: ['choir'], hint: 'ფს. 134, 135' });
    if (sunday) m.push({ title: '„ქებულ ხარ, უფალო“', who: ['choir'], hint: 'აღდგომის ტროპარნი, ხმა 5' });
    m.push({ title: 'საცისკრო წარდგომა და სახარება', who: ['deacon', 'priest'], note: matinsGospel.length ? matinsGospel.map(r => `${r.name} ${r.ref}`).join(' · ') : undefined, extras: matinsGospel.length ? [{ kind: 'readings', items: matinsGospel }] : undefined });
    if (sunday) m.push({ title: '„აღდგომა ქრისტესი ვიხილეთ“', who: ['choir'] });
  }
  m.push({ title: 'ფსალმუნი 50', who: ['reader'] });
  m.push({ title: 'კანონი (9 გალობა)', who: ['choir', 'reader'], note: great ? 'დღესასწაულის კანონი' : sunday ? `აღდგომისა, ${toneTxt}, და წმიდანისა` : big ? 'წმიდანისა' : `პარაკლიტონისა (${toneTxt}) და წმიდანისა`, hint: 'მე-3 გალობის შემდეგ — ჯდომითი · მე-6-ის შემდეგ — კონდაკი და იკოსი', extras: some(tonePart(tone, eveDow)) });
  m.push({ title: '„უპატიოსნესსა“ — მე-9 გალობაზე', who: ['choir'], note: great ? 'დიდ დღესასწაულზე — დღესასწაულის ძლისპირი' : undefined });
  m.push({ title: 'განმანათლებელი', who: sunday || big ? ['choir'] : ['reader'], note: sunday ? 'კვირისა — სახარების რიგით' : undefined, extras: [book(BOOK.exapost)] });
  m.push({ title: 'ქებანი (ფს. 148–150)', who: atLeast(rank, 'doxology') || sunday ? ['choir'] : ['reader'], note: atLeast(rank, 'doxology') || sunday ? 'დასდებელნით' : undefined });
  m.push(atLeast(rank, 'doxology') || sunday
    ? { title: 'დიდი დოქსოლოგია — „დიდება მაღალთა შინა ღმერთსა“', who: ['choir'], note: 'იგალობება' }
    : { title: 'ყოველდღიური დოქსოლოგია', who: ['reader'], note: 'იკითხება' });
  m.push({ title: 'ტროპარი, კვერექსები, განტევება', who: ['choir', 'deacon', 'priest'] });
  m.push({ title: 'პირველი ჟამი', who: ['reader'], hint: 'ფს. 5, 89, 100 · ტროპარი და კონდაკი', extras: [book(BOOK.hour1)] });

  // ----- hours -----
  const h: Step[] = [
    { title: 'მესამე ჟამი', who: ['reader'], hint: 'ფს. 16, 24, 50', extras: [book(BOOK.hour3)] },
    { title: 'მეექვსე ჟამი', who: ['reader'], hint: 'ფს. 53, 54, 90', extras: [book(BOOK.hour6)] },
    { title: 'ჟამების ტროპარნი და კონდაკნი', who: ['reader'], note: 'ორივე ჟამზე ერთნაირი', extras: [{ kind: 'troparia', at: 'hours' }] },
  ];

  // ----- liturgy -----
  const l: Step[] = [];
  l.push({ title: 'დიდი კვერექსი', who: ['deacon', 'choir'], extras: [book(sunday ? BOOK.sunLiturgy : BOOK.liturgy)] });
  l.push({
    title: 'ანტიფონები', who: ['choir'],
    note: great ? 'დღესასწაულის ანტიფონები' : sunday || atLeast(rank, 'doxology') ? 'სახვითნი: ფს. 102, 145, „მხოლოდ-შობილო“' : 'ყოველდღიური ანტიფონები (ან სახვითნი — ტაძრის წესით)',
  });
  if (!great) l.push({ title: 'ნეტარებანი', who: ['choir'], note: sunday ? `${toneTxt} · აღდგომისანი` : big ? 'წმიდანის კანონიდან' : undefined });
  l.push({ title: 'მცირე შესვლა — „მოვედით თაყვანი-ვსცეთ“', who: ['choir'], note: great ? 'დღესასწაულის შესავალი მუხლი' : sunday ? '„…რომელი აღსდეგ მკუდრეთით“' : '„…რომელი საკვირველ ხარ წმიდათა შორის“' });
  l.push({ title: 'ტროპარნი და კონდაკნი', who: ['choir'], extras: [{ kind: 'troparia', at: 'liturgy' }] });
  l.push({ title: great?.trisagion === 'baptized' ? '„რაოდენთა ქრისტეს მიერ ნათელ-იღეთ“' : great?.trisagion === 'cross' ? '„ჯუარსა შენსა თაყუანის-ვსცემთ“' : 'სამწმიდაო — „წმიდაო ღმერთო“', who: ['choir'], note: great?.trisagion ? 'სამწმიდაოს ნაცვლად' : undefined });
  l.push({ title: 'წარდგომა', who: ['reader'], note: sunday ? `${toneTxt} — აღდგომისა${big ? ' და წმიდანისა' : ''}` : great ? 'დღესასწაულისა' : big ? 'წმიდანისა' : `${WEEKDAY_GEN[dow]} (${DAY_THEME[dow]})`, extras: sunday ? [{ kind: 'tone' }] : undefined });
  l.push({ title: 'სამოციქულო', who: ['reader'], note: apostle.length ? apostle.map(r => `${r.name} ${r.ref}`).join(' · ') : 'კალენდარში ჩანაწერი არ არის', extras: apostle.length ? [{ kind: 'readings', items: apostle }] : undefined });
  l.push({ title: 'ალილუია', who: ['reader', 'choir'], note: sunday ? `${toneTxt}` : undefined });
  l.push({ title: 'სახარება', who: ['deacon', 'priest'], note: gospel.length ? gospel.map(r => `${r.name} ${r.ref}`).join(' · ') : undefined });
  l.push({ title: 'კვერექსები და ქერუბიმთა გალობა', who: ['deacon', 'choir'] });
  l.push({ title: 'სარწმუნოების სიმბოლო — „მრწამს“', who: ['choir'] });
  l.push({ title: great ? 'დღესასწაულის ძლისპირი (ღირს არსის ნაცვლად)' : '„ღირს არს“', who: ['choir'], extras: great ? [{ kind: 'prayer', id: 'ghirs-arsis-nacvlad', label: 'ღირს-არსის ნაცვლად საკითხავნი' }] : undefined });
  l.push({ title: '„მამაო ჩვენო“', who: ['choir'] });
  l.push({ title: 'ზიარების მუხლი', who: ['choir'], note: great ? 'დღესასწაულისა' : sunday ? COMMUNION[0] : big ? `${COMMUNION[dow]} · და წმიდანისა` : `${COMMUNION[dow]} (${DAY_THEME[dow]})`, hint: 'ამ დროს მედავითნე კითხულობს ზიარების წინა ლოცვებს', extras: [{ kind: 'prayer', id: 'ziarebis-tsin', label: 'ზიარების წინა ლოცვები' }] });
  l.push({ title: '„ვიხილეთ ნათელი ჭეშმარიტი“ და „იყავნ სახელი უფლისა“', who: ['choir'] });
  l.push({ title: 'ფსალმუნი 33 და განტევება', who: ['reader', 'priest'], extras: [{ kind: 'prayer', id: 'ziarebis-shemdeg', label: 'ზიარების შემდგომი ლოცვები' }] });

  return [
    { id: 'vespers', title: 'მწუხრი', when: `${WEEKDAY_NOM[eveDow]} საღამოს${vigil ? ' · ღამისთევა' : ''}`, steps: v },
    { id: 'matins', title: 'ცისკარი', when: vigil ? 'მწუხრს მიჰყვება' : 'დილით', steps: m },
    { id: 'hours', title: 'ჟამები', when: 'წირვის წინ', steps: h },
    { id: 'liturgy', title: 'წირვა', when: 'დილით', steps: l },
  ];
};
