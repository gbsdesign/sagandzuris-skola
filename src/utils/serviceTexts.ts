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
  /** the search for `from` / `find` begins after the first heading matching this */
  after?: RegExp;
  from?: RegExp;
  to?: RegExp;
  /** the start by a section's heading or its first paragraph (the fixed texts of ჟამნი and კონდაკი, 2026-11-11) */
  find?: RegExp;
  /** with `find`: how many sections (1 when nothing else ends it) */
  count?: number;
  /** with `find`: up to (not with) the first later section whose heading or first paragraph matches */
  until?: RegExp;
  /** with `find`: up to and with the n-th later „ამინ“ (a litany with its exclamation) */
  amens?: number;
  /** the first section's heading is a rubric — leave it out; and so many of its first paragraphs */
  noHead?: boolean;
  skipParas?: number;
  /** a short name for the chip: „პარაკლიტონი, ხმა 6“ */
  label: string;
}

const hit = (re: RegExp, [h, ps]: Section) => re.test(h) || (ps.length > 0 && re.test(ps[0]));

/** the sections a source names; [] when its start is not found */
export const sliceOf = (sections: Section[], src: Omit<TextSrc, 'coll' | 'n' | 'part' | 'label'>): Section[] => {
  const base = src.after ? sections.findIndex(x => (src.find ? hit(src.after!, x) : src.after!.test(x[0]))) : 0;
  if (base < 0) return [];
  if (src.find) {
    const rel = sections.slice(base).findIndex(x => hit(src.find!, x));
    if (rel < 0) return [];
    const start = base + rel;
    let end = start + (src.count ?? 1);
    if (src.until) { end = sections.length; for (let i = start + 1; i < sections.length; i++) if (hit(src.until, sections[i])) { end = i; break; } }
    if (src.amens) {
      let left = src.amens; end = -1;
      for (let i = start + 1; i < sections.length; i++) if (/^ამინ/.test(sections[i][1][0] ?? '') && --left === 0) { end = i + 1; break; }
      if (end < 0) return [];
    }
    const out = sections.slice(start, end);
    if (!out.length) return [];
    if (src.noHead || src.skipParas) out[0] = [src.noHead ? '' : out[0][0], out[0][1].slice(src.skipParas ?? 0)];
    return out;
  }
  const rel = src.from ? sections.slice(base).findIndex(([h]) => src.from!.test(h)) : 0;
  if (rel < 0) return [];
  const start = base + rel;
  let end = sections.length;
  if (src.to) for (let i = start + 1; i < sections.length; i++) if (src.to.test(sections[i][0])) { end = i; break; }
  return sections.slice(start, end);
};

// ---------- the fixed texts (2026-11-11): what the reader reads from ჟამნი, what the priest and deacon say from კონდაკი ----------
const J = (n: number, label: string, x: Omit<TextSrc, 'coll' | 'n' | 'part' | 'label'>): TextSrc => ({ coll: 'jamni', n, part: 0, label, ...x });
const K = (n: number, label: string, x: Omit<TextSrc, 'coll' | 'n' | 'part' | 'label'>): TextSrc => ({ coll: 'kondaki', n, part: 0, label, ...x });
const EVE_HEAD = [/^კვირიაკესა/, /^ორშაბათსა/, /^სამშაბათსა/, /^ოთხშაბათსა/, /^ხუთშაბათსა/, /^პარასკევსა/, /^შაბათსა/];

export const FIX = {
  /** „ამინ. დიდება შენდა… მეუფეო ზეცათაო… წმიდაო ღმერთო… მამაო ჩვენო“ — a service's own beginning */
  opening: J(6, 'დასაწყისი ლოცვები', { find: /კურთხეულ-არსისა/, count: 4, noHead: true }),
  /** „წმიდაო ღმერთო… ყოვლადწმიდაო სამებაო… მამაო ჩვენო“ */
  trisagion: J(6, 'სამწმიდაო — „მამაო ჩვენო“', { find: /კურთხეულ-არსისა/, count: 4, noHead: true, skipParas: 3 }),
  come: J(10, 'მოვედით, თაყვანის-ვსცეთ', { find: /მოვედით, თაყუანის-ვსცეთ მეუფესა/, count: 1, noHead: true }),
  twelve: J(6, 'უფალო, შეგვიწყალენ (12) · მოვედით', { find: /შეგვიწყალენ \(12/, count: 2 }),
  // vespers
  ps103: J(10, 'ფსალმუნი 103', { find: /^ფსალმუნი 103/, count: 1 }),
  lordICry: J(10, 'ფსალმუნები 140, 141, 129, 116', { find: /ღაღად-ვყავ/, until: /^დიდებაჲ, აწ და\.?$/ }),
  gladLight: J(10, 'ნათელო მხიარულო', { find: /ნათელო მხიარულო/, count: 1, noHead: true }),
  eveProkeimenon: (eve: number) => J(10, 'მწუხრის წარდგომა', { after: /ითქუმიან წარდგომანი/, find: EVE_HEAD[eve], until: eve === 6 ? /ღირს მყუენ/ : EVE_HEAD[eve + 1] }),
  vouchsafe: J(10, 'ღირს მყვენ ჩვენ, უფალო', { find: /^და ღირს მყუენ/, count: 1, noHead: true }),
  eveVerses: J(10, 'სტიქარონის მუხლები', { find: /^შენდამი აღვიხილენ/, count: 2 }),
  nunc: J(10, 'აწ განუტევე', { find: /^აწ განუტევე/, count: 1, noHead: true }),
  eveEnd: J(10, 'უპატიოსნესსა', { find: /^უპატიოსნესსა ქერუბიმთასა, და აღმატებით/, count: 1, noHead: true }),
  // matins
  royal: J(4, 'ფსალმუნები 19 და 20', { find: /^ფსალმუნი 19/, count: 2 }),
  royalTroparia: J(4, 'ტროპარნი', { find: /^აცხოვნე, უფალო, ერი შენი/, count: 3, noHead: true }),
  sixPsalms: J(4, 'ექვსფსალმუნება', { find: /ექუს-ფსალმუნი/, count: 5, noHead: true }),
  ps50: J(6, 'ფსალმუნი 50', { find: /^ფსალმუნი 50/, count: 1 }),
  magnificat: J(4, 'ადიდებს სული ჩემი უფალსა', { find: /^გალობა ღვთისმშობლისა/, count: 2 }),
  praises: J(4, 'ქებანი (ფს. 148–150)', { find: /უკეთუ სხუა დღე იყოს/, until: /უკეთუ კვირიაკე იყოს, შემდგომად დასდებელთა/, noHead: true }),
  dailyDoxology: J(4, 'შენდა დიდება შვენის · დიდება მაღალთა შინა', { find: /^შენდა დიდება შუენის/, count: 2, noHead: true }),
  greatDoxology: J(4, 'დიდება მაღალთა შინა ღმერთსა', { find: /^დიდება შენდა, რომელმან მოგვფინე/, count: 4 }),
  mornVerses: J(4, 'სტიქარონის მუხლები', { after: /აღუსრულოთ საცისკრო/, find: /^აღვივსენით/, count: 2 }),
  goodToConfess: J(4, 'კეთილ არს აღსარებაი უფლისა', { find: /^კეთილ არს აღსარებაი/, count: 1, noHead: true }),
  // the hours: n = the book's item (5 first, 6 third, 7 sixth, 9 ninth)
  hourPsalms: (n: number) => J(n, 'ფსალმუნები', { find: /^ფსალმუნი \d/, count: 4 }),
  hourTheotokion: (n: number) => J(n, 'ღვთისმშობლისა', { find: /ღმრთისმშობლისა\.?$/, count: 1 }),
  hourEnd: (n: number) => J(n, 'უფალო, შეგვიწყალენ (40) და ჟამის ლოცვა', { find: /^უფალო,? შეგ(?:ჳ|ვი)წყალენ 40/, until: /^შედეგი|^განსრულებაჲ/ }),
  typikaEnd: J(8, 'ფსალმუნი 33', { find: /ფსალმუნი 33/, count: 1 }),
};

/** the priest's and the deacon's words (კონდაკი: 1 მწუხრი, 2 ცისკარი, 4 ლიტურგია) — shown only with „მღვდლის ტექსტები“ on */
export const PRIEST = {
  vespers: {
    begin: J(10, 'მღვდელი', { find: /^კურთხეულ არს ღმერთი ჩუენი/, count: 1 }),
    lampPrayers: K(1, 'სანთლის ლოცვები (საიდუმლოდ)', { find: /^ლოცვა ა$/, count: 7 }),
    great: K(1, 'დიდი კვერექსი', { find: /^მშ(?:ჳ|ვი)დობით უფლისა მიმართ/, amens: 1 }),
    small: K(1, 'მცირე კვერექსი', { find: /^მერმე და მერმე/, amens: 1 }),
    entrance: K(1, 'შესვლა', { find: /^სიბრძნით აღემართენით/, count: 1 }),
    prokeimenon: K(1, 'წარდგომის წინ', { find: /^მოხედენ/, count: 4 }),
    augmented: K(1, 'მრჩობლი კვერექსი', { find: /^ვსთქვათ ყოველთა/, amens: 1 }),
    supplication: K(1, 'თხოვნითი კვერექსი და თავმოდრეკის ლოცვა', { find: /^აღუსრულოთ სამწუხრო/, amens: 2 }),
    litya: K(1, 'ლიტიის ვედრებანი', { find: /^აცხოვნე, ღმერთო, ერი შენი/, until: /სასულიერონი|წმიდაო ღმერთოს შემდეგ/ }),
    bread: K(1, 'პურის კურთხევა', { after: /ღვთისმშობელო ქალ/, find: /^უფლისა მიმართ ვილოცოთ/, count: 4 }),
    blessing: K(1, 'კურთხევა', { find: /^კურთხევა უფლისა/, count: 1 }),
    dismissal: J(10, 'განტევება', { find: /^რომელი იგი არს კურთხეულ/, count: 1 }),
  },
  matins: {
    begin: K(2, 'დასაწყისი', { find: /^კურთხეულ არს ღმერთი ჩუენი/, count: 2 }),
    short: K(2, 'მოკლე მრჩობლი კვერექსი', { find: /^შეგჳწყალენ ჩუენ ღმერთო/, amens: 1 }),
    glory: K(2, 'დიდება წმიდასა', { find: /^დიდება წმიდასა/, count: 1 }),
    prayers: K(2, 'ცისკრის ლოცვები (საიდუმლოდ)', { find: /^ლოცვა ა$/, count: 12 }),
    great: K(2, 'დიდი კვერექსი', { find: /^მშ(?:ჳ|ვი)დობით უფლისა მიმართ/, amens: 1 }),
    godIsLord: K(2, 'ღმერთი უფალი — მუხლები', { find: /^ღმერთი უფალი და გამოგ/, count: 5 }),
    small: K(2, 'მცირე კვერექსი', { find: /^მერმე და მერმე/, amens: 1 }),
    gospel: K(2, 'სახარების წინ', { after: /საცისკრო წარდგომები/, find: /^უფლისა მიმართ ვილოცოთ/, until: /კითხულობს სახარ/ }),
    afterNine: K(2, 'მცირე კვერექსი მე-9 გალობის შემდეგ', { after: /პირველი დიაკონი კვერექსი/, find: /^მერმე და მერმე/, amens: 1 }),
    augmented: K(2, 'მრჩობლი კვერექსი', { after: /II დიაკონი იტყვის კვერექს\./, find: /^შეგჳწყალენ ჩუენ ღმერთო/, amens: 1 }),
    supplication: K(2, 'თხოვნითი კვერექსი და თავმოდრეკის ლოცვა', { find: /^აღუსრულოთ საცისკრო/, amens: 2 }),
    dismissal: K(2, 'განტევება', { after: /^რამეთუ შენი არს მოწყალება/, find: /^სიბრძნით/, count: 6 }),
  },
  liturgy: {
    begin: K(4, 'დასაწყისი', { find: /^კურთხეულ არს მეუფება/, count: 1 }),
    great: K(4, 'დიდი კვერექსი', { find: /^მშ(?:ჳ|ვი)დობით უფლისა მიმართ/, amens: 1 }),
    small: K(4, 'მცირე კვერექსი', { find: /^მერმე და მერმე/, amens: 1 }),
    entrance: K(4, 'მცირე შესვლა', { find: /^სიბრძნით აღემართენით/, count: 1 }),
    trisagion: K(4, 'სამწმიდაოს წინ', { after: /^სიბრძნით აღემართენით/, find: /^უფლისა მიმართ ვილოცოთ/, amens: 1 }),
    apostle: K(4, 'სამოციქულოს წინ', { find: /^მოხედენ/, count: 4 }),
    augmented: K(4, 'მრჩობლი კვერექსი', { find: /^ვსთქვათ ყოველთა/, amens: 1 }),
    supplication: K(4, 'თხოვნითი კვერექსი', { find: /^აღუსრულოთ/, amens: 1 }),
    beforeOurFather: K(4, 'კვერექსი „მამაო ჩვენოს“ წინ', { find: /^ყოველთა წმიდათა/, amens: 1 }),
    communion: K(4, 'ზიარებაზე', { find: /^შიშითა ღ/, count: 2 }),
    thanks: K(4, 'სამადლობელი კვერექსი', { after: /^აცხოვნე/, find: /^აღემართენით|^მართლ|^უფლისა მიმართ ვილოცოთ/, amens: 1 }),
  },
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
