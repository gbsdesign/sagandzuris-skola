// The day's changing texts for „დღის მსახურება“ (stage 2 of the plan „დღის მსახურების გეგმა“, the user 2026-11-09):
// where in the liturgical books (public/wignebi, see data/wignebi.ts) a hymn of the day stands. A source = a book item's part
// and the run of its sections from the first heading matching `from` up to (not with) the first later one matching `to`.
// The books are printed copies with their own spellings („სქიქარონსა“, „ლიტურღიასა“), so the patterns take every form
// seen; tests/serviceTexts.test.ts checks every source against the files.

export type Section = [string, string[]];
export interface TextSrc {
  coll: string;
  n: number;
  part: number;
  /** the search for `from` begins after the first heading matching this */
  after?: RegExp;
  from?: RegExp;
  to?: RegExp;
  /** a short name for the chip: „პარაკლიტონი, ხმა 6“ */
  label: string;
}

/** the sections a source names; [] when its start is not found */
export const sliceOf = (sections: Section[], src: Pick<TextSrc, 'after' | 'from' | 'to'>): Section[] => {
  const base = src.after ? sections.findIndex(([h]) => src.after!.test(h)) : 0;
  if (base < 0) return [];
  const rel = src.from ? sections.slice(base).findIndex(([h]) => src.from!.test(h)) : 0;
  if (rel < 0) return [];
  const start = base + rel;
  let end = sections.length;
  if (src.to) for (let i = start + 1; i < sections.length; i++) if (src.to.test(sections[i][0])) { end = i; break; }
  return sections.slice(start, end);
};

const APOSTICHA = /სტიქარონ|სტიხარონ|სქიქარონ|სტქარონ/;
const MATINS = /ცისკ?რად|სტიხოლო|სქიხოლო/;
const BEATITUDES = /მომი[ჴხ]სენენი/;
const GREAT_VESPERS = /დიდს?ა? მწუ[ხჴ]რ|დიდი მწუხრ/;

// ---------- the Octoechos (პარაკლიტონი): item = the tone, part = the evening's weekday (0 = Sunday evening … 6 = Saturday's) ----------
export type OctoSeg = 'stichera' | 'aposticha' | 'sedalens' | 'canon' | 'lauds' | 'beatitudes' | 'troparion' | 'antiphons' | 'prokeimenon';
type Seg = { after?: RegExp; from?: RegExp; to: RegExp };
const NEVER = /$^/;
const WEEKDAY_SEG: Partial<Record<OctoSeg, Seg>> = {
  stichera: { to: /^წარდგომა|სტიქარონ|სტიხარონ|სქიქარონ|სტქარონ/ },
  aposticha: { from: APOSTICHA, to: MATINS },
  sedalens: { from: MATINS, to: /კანონი/ },
  canon: { from: /კანონი/, to: /აღჳვსენით|აღივსენით|მომი[ჴხ]სენენი|^განმანათლებელი/ },
  lauds: { from: /აღჳვსენით|აღივსენით/, to: BEATITUDES },
  beatitudes: { from: BEATITUDES, to: NEVER },
};
// Saturday evening = the Sunday's resurrection service (the small vespers before it is left out)
const SUNDAY_MATINS = /ცისკრად/;
const SUNDAY_SEG: Partial<Record<OctoSeg, Seg>> = {
  stichera: { from: GREAT_VESPERS, to: /სტიქარონ|სტიხარონ|ალფა|^შესულა|^შესლვა/ },
  aposticha: { after: GREAT_VESPERS, from: /სტიქარონ|სტიხარონ|ალფა/, to: /^ტროპარი|^განსატევებელ|შუა-?ღამე|შოჳაღამე/ },
  troparion: { after: GREAT_VESPERS, from: /^ტროპარი|^განსატევებელ/, to: /შუა-?ღამე|შოჳაღამე|^ესევე/ },
  sedalens: { from: SUNDAY_MATINS, to: /ნეტარ-?არიან|^ანტიფონი|აღსავალ/ },
  antiphons: { after: SUNDAY_MATINS, from: /ნეტარ-?არიან|აღსავალ|^ანტიფონი/, to: /^წარდგომა/ },
  prokeimenon: { after: /აღსავალ|^ანტიფონი/, from: /^წარდგომა/, to: /სახარება|კანონი/ },
  canon: { after: SUNDAY_MATINS, from: /სახარება|კანონი აღდგომისა/, to: /აქებდით|^განმანათლებელი/ },
  lauds: { after: SUNDAY_MATINS, from: /აქებდით/, to: BEATITUDES },
  beatitudes: { from: BEATITUDES, to: NEVER },
};
const WEEKDAY_DAT = ['კვირიაკე', 'ორშაბათი', 'სამშაბათი', 'ოთხშაბათი', 'ხუთშაბათი', 'პარასკევი', 'შაბათი'];

/** the Octoechos' text for the day whose evening is `eve` (0–6) in `tone`, or null when that part has no such piece */
export const octoechos = (tone: number | null, eve: number, seg: OctoSeg): TextSrc | null => {
  if (!tone) return null;
  const s = (eve === 6 ? SUNDAY_SEG : WEEKDAY_SEG)[seg];
  if (!s) return null;
  return { coll: 'paraklitoni', n: tone, part: eve, ...s, label: `პარაკლიტონი, ხმა ${tone}${eve === 6 ? '' : ` · ${WEEKDAY_DAT[eve]} საღამო`}` };
};

// ---------- the common services (საზიარო თვენი), by the saint's kind ----------
export const SAINT_KINDS = [
  'წინასწარმეტყველისა', 'მოციქულისა', 'მოციქულთა', 'მღვდელმთავრისა', 'მოწამისა', 'მოწამეთა', 'მღვდელმოწამისა',
  'ღირსმოწამისა', 'ღირსთა მოწამეთა', 'აღმსარებლისა', 'ქალწულმოწამისა', 'ღირსისა მამისა', 'ღირსთა მამათა', 'ღირსისა დედისა', 'მეფისა',
] as const;
/** the kind of a saint by the calendar's words, as the 15 common services: 1-based, or 0 when it cannot be told */
export const saintKindOf = (name: string): number => {
  const n = name.replace(/\s+/g, ' ');
  const at = (re: RegExp) => re.test(n);
  if (at(/ღირს(?:თა)? ?მოწამეთა/)) return 9;
  if (at(/ღირსმოწამ|ღირს\. ?მოწ/)) return 8;
  if (at(/მღვდელმოწამ|მღვდმოწ|მღვდელმოწ/)) return 7;
  if (at(/ქალწულმოწამ/)) return 11;
  if (at(/მოწამეთა/)) return 6;
  if (at(/მოწამ|მოწ\./)) return 5;
  if (at(/მოციქულთა/)) return 3;
  if (at(/მოციქულ|მოც\./)) return 2;
  if (at(/წინასწარმეტყველ|წინასწარმეტყუელ/)) return 1;
  if (at(/აღმსარებ/)) return 10;
  if (at(/ეპისკოპოს|მთავარეპ|მღვდელმთავ|პატრიარქ|კათალიკოს|ეპ\./)) return 4;
  if (at(/ღირსთა მამათა|ღირ\. მამათა/)) return 13;
  if (at(/ღირსისა დედისა|ღირსი? (?:დედ|ქალ)/)) return 14;
  if (at(/ღირს|ღირ\./)) return 12;
  if (at(/მეფ/)) return 15;
  return 0;
};

export type MenaionSeg = 'stichera' | 'readings' | 'litya' | 'aposticha' | 'sedalens' | 'canon' | 'exapostilarion' | 'lauds';
const MENAION_SEG: Record<MenaionSeg, Seg> = {
  stichera: { from: GREAT_VESPERS, to: /^შესლვ|წარდგომა დღისა|ლიტიასა|ლიტანიასა/ },
  readings: { after: GREAT_VESPERS, from: /^შესლვ|საკითხავი/, to: /ლიტიასა|ლიტანიასა|სტიქარონ|სტიხარონ/ },
  litya: { from: /ლიტიასა|ლიტანიასა/, to: APOSTICHA },
  aposticha: { after: GREAT_VESPERS, from: /^სტიქარონ|^სტიხარონ|^სქიქარონ/, to: /^ცისკარ|შემდგომად (?:პირველისა|ა) ფსალმ/ },
  sedalens: { after: GREAT_VESPERS, from: /^ცისკარ|შემდგომად (?:პირველისა|ა) ფსალმ/, to: /^გალობაჲ? ა|^გალობან|^კანონი/ },
  canon: { after: GREAT_VESPERS, from: /^გალობაჲ? ა|^გალობან|^კანონი/, to: /გამოავლინე|განმანათლებ|აქებდით/ },
  exapostilarion: { from: /გამოავლინე|განმანათლებ/, to: /აქებდით/ },
  lauds: { from: /აქებდით|^აქებ/, to: NEVER },
};
export const menaion = (kind: number, seg: MenaionSeg): TextSrc | null =>
  kind ? { coll: 'tveni', n: kind, part: 0, ...MENAION_SEG[seg], label: `საზიარო განგება — ${SAINT_KINDS[kind - 1]}` } : null;

// ---------- the rest ----------
const NUM = ['', 'ა', 'ბ', 'გ', 'დ', 'ე', 'ვ', 'ზ', '[ჱწ]', 'თ', 'ი', 'ია'];
/** a Sunday's exapostilarion and its gospel sticheron, by the matins Gospel's number (1–11) */
export const sundayExapost = (gospel: number): TextSrc | null =>
  gospel >= 1 && gospel <= 11
    ? { coll: 'paraklitoni', n: 9, part: 0, from: new RegExp(`^განმანათლებელი ${NUM[gospel]}\\.`), to: /^განმანათლებელი/, label: `განმანათლებელი ${gospel}` }
    : null;
const WEEKDAY_LOC = ['', 'ორშაბათსა', 'სამშაბათსა', 'ოთხშაბათსა', 'ხუთშაბათსა', 'პარასკევსა', 'შაბათსა'];
/** a weekday's exapostilarion (Monday–Saturday) */
export const weekdayExapost = (dow: number): TextSrc | null =>
  dow >= 1 && dow <= 6
    ? { coll: 'paraklitoni', n: 9, part: 2, from: new RegExp(`^${WEEKDAY_LOC[dow]}`), to: new RegExp(`^(?:${WEEKDAY_LOC.slice(1).join('|')})`), label: 'განმანათლებელი' }
    : null;
/** the Sunday matins prokeimenon of a tone */
export const sundayProkeimenon = (tone: number | null): TextSrc | null =>
  tone ? { coll: 'wardgoma', n: 2, part: tone - 1, label: `საცისკრო წარდგომა, ხმა ${tone}` } : null;
/** a saint's matins Gospel prokeimenon (the common services' order; the 16th = the angels) */
export const saintProkeimenon = (kind: number): TextSrc | null =>
  kind ? { coll: 'wardgoma', n: 1, part: kind - 1, label: `წარდგომა — ${SAINT_KINDS[kind - 1]}` } : null;
/** the matins Gospel number of a Sunday from the calendar's line „ცისკ.: სახ. მე-2, მკ. …“ */
export const gospelNumberOf = (text: string): number | null => {
  const m = /სახ\.\s*მე-?(\d{1,2})/.exec(text);
  return m ? Number(m[1]) : null;
};
/** ზატიკი: the week after Easter (0 = Bright Week … 7 = Pentecost's) and the day's part */
export const pentecostarion = (easterOffset: number): TextSrc | null => {
  if (easterOffset === 0) return { coll: 'zatiki', n: 1, part: 0, label: 'ზატიკი · აღდგომა' };
  if (easterOffset < 0 || easterOffset > 56) return null;
  const week = Math.floor(easterOffset / 7);
  const dow = easterOffset % 7;
  if (week === 0) return { coll: 'zatiki', n: 2, part: dow - 1, label: 'ზატიკი · ბრწყინვალე შვიდეული' };
  if (easterOffset === 56) return { coll: 'zatiki', n: 10, part: 0, label: 'ზატიკი · ყოველთა წმიდათა კვირა' };
  return { coll: 'zatiki', n: week + 2, part: dow, label: `ზატიკი · ${['', 'თომას', 'მენელსაცხებლეთა', 'განრღვეულის', 'სამარიტელის', 'ბრმის', 'მამათა', 'სულთმოფენობის'][week]} შვიდეული` };
};
