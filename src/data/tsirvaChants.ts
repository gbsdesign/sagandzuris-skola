import { BookNums, bookNumLabel, bookPage, bookSource, numsOf } from './gelatiBookIndex';
import { KK_BOOK, kkLiturgySection, kkPage } from './kartliKakhetiIndex';
import { V5_BOOK, v5Page, v5Source } from './liturgyVol5Index';
import { V9_BOOK, v9Page, v9Source } from './liturgyVol9Index';
import { withPataravaLiturgy } from './pataravaBookChants';

export interface ChantVariant {
  id: string;
  code: string;
  label: string;
  chantName: string;
  fullTitle: string;
  version?: string;    // book chants: version name (e.g. "ჴმაჲ ბ"; may be empty), listed instead of the school pair
  page?: number;       // book chants: page in the book
  bookNums?: number[]; // book chants: chant numbers in the book (sheet music + synthesizer)
  source?: string;     // book chants: manuscript (Gelati: ხუნდაძე / კერესელიძე / ქორიძე), liturgy section (ქართლ-კახური: სადა / გამშვენებული)
                       // or opening words (feasts, vol. II), kind of chant (Lent and Pascha, vol. IV)
  book?: string;       // book chants: sheet-music folder; unset = Gelati school book (vol. I), 'feast' = Gelati feasts (vol. II), 'kk' = Kartli-Kakheti (vol. III),
                       // 'triod' = Gelati Lent and Pascha (vol. IV), 'v5' = Gelati + Shemokmedi liturgy (vol. V),
                       // 'karb' = East Georgian school, Karbelashvili mode: feasts, Lent and Pascha (vol. VII),
                       // 'pat' = Shemokmedi school as handed down by Dimitri Patarava (2003),
                       // 'v9' = Gelati liturgy in the authentic mode, plain chants for children, Sunday troparia (vol. IX),
                       // 'momix' = troparia on the Beatitudes, Hymnographical collection I (Kereselidze's manuscripts)
}

// Books that print no chant numbers: their file numbers are not shown
export const UNNUMBERED_BOOKS = new Set(['momix']);

// Name of a book version everywhere in the app: book number + version, e.g. "145 ხუნდაძე"
export const variantName = (v: Pick<ChantVariant, 'bookNums' | 'version' | 'book'>) =>
  [!UNNUMBERED_BOOKS.has(v.book ?? '') && bookNumLabel(v.bookNums), v.version].filter(Boolean).join(' ');

// Short book names for the version buttons (Patarava's book is named in the school row above them)
const BOOK_SHORT: Record<string, string> = {
  book: 'I ტომი', feast: 'II ტომი', kk: 'III ტომი', triod: 'IV ტომი', v5: 'V ტომი', karb: 'VII ტომი', v9: 'IX ტომი',
};

// "I ტომი · გვ. 205" (+ the manuscript); the book and the manuscript are left out when the name already says them.
// The book's numeral is matched whole: "I ტომი" is also the end of "III ტომი".
export const variantSublabel = (v: ChantVariant) => {
  if (!v.page) return undefined;
  const book = BOOK_SHORT[v.book ?? 'book'];
  const namesBook = book && new RegExp(`(^|[^IVX])${book}`).test(v.version ?? '');
  const namesSource = v.source && v.version?.includes(v.source);
  return [!namesBook && book, `გვ. ${v.page}`, !namesSource && v.source].filter(Boolean).join(' · ');
};

// "გ.ს. ამინ (1, გვ. 3)" — used by bookmarks and search
export const bookFullTitle = (title: string, name: string, page?: number, school = 'გ.ს.') =>
  `${school} ${title} (${[name, page && `გვ. ${page}`].filter(Boolean).join(', ')})`;

// A version printed in the Kartli-Kakheti book (vol. III); an empty label is filled in from the source (liturgy section)
export const kkVariant = (id: string, code: string, title: string, label: string, nums: number[], source?: string): ChantVariant => {
  const version = label || source || '';
  const page = kkPage(nums[0]);
  return {
    id,
    code,
    label: 'ქართლ-კახური',
    chantName: title,
    fullTitle: bookFullTitle(title, variantName({ bookNums: nums, version }), page, 'ქ.კ.'),
    version,
    page,
    bookNums: nums,
    source,
    book: KK_BOOK,
  };
};

export interface ChantItem {
  id: string;
  index: number;
  title: string;
  model?: string; // the model melody a group of troparia is sung to (Beatitudes book), shown under the title
  variants: ChantVariant[];
}

const variantTemplates = [
  { code: 'გ.ს.', label: 'გელათის სკოლა' },
  { code: 'გ.ს. გამშვ', label: 'გელათის სკოლა (გამშვენებული)' },
  { code: 'ქ.კ.', label: 'ქართლ-კახური' },
  { code: 'ქ.კ. გამშვ', label: 'ქართლ-კახური (გამშვენებული)' },
  { code: 'შ.ს.', label: 'შემოქმედის სკოლა' },
  { code: 'შ.ს. გამშვ', label: 'შემოქმედის სკოლა (გამშვენებული)' },
];

const chantTitles: string[] = [
  'სამღვდელთმთავრო "ღირს არსი"',
  'ტონ დესპოტინ',
  'იხარებს სული შენი',
  'ამინ; დიდი კვერექსი;',
  'აკურთხევს სული ჩემი;',
  'მც. კვერექსი;',
  'მხოლოდ-შობილი',
  'სასუფეველსა შენსა;',
  'უფალო შეგვიწყალენ',
  'მოვედით, თაყვანის-ვსცეთ;',
  'უფალო, აცხოვნენ',
  'წმიდაო ღმერთო',
  'წარდგომანი აღდგომისანი, რვა ხმათა',
  'ალილუია შემდგომად სამოციქულოსა, რვა ხმათა;',
  'და სულისაცა; დიდება შენდა, უფალო',
  'მრჩობლი კვერექსი;',
  'მიცვალებულთა კვერექსი;',
  'კატაკუმეველთა კვერექსი;',
  'უფალო შეგვიწყალენ; ამინ',
  'რომელი ქერუბიმთა',
  'და ვითარცა მეუფესა;',
  'თხოვნითი კვერექსი',
  'და სულისაცა; მამასა და ძესა',
  'მრწამსი',
  'წყალობა, მშვიდობა;',
  'და სულისაცა;',
  'გუაქვს უფლისა მიმართ',
  'ღირს არს და მართალ',
  'წმიდა არს, წმიდა არს',
  'ამინ; შენ გიგალობთ',
  'შენდამი იხარებს',
  'ღირს არს ჭეშმარიტად;',
  'ყოველთა და ყოვლისათვის',
  'თხოვნითი კვერექსი;',
  'მამაო ჩუენო',
  'შენ, უფალო;',
  'ერთ არს;',
  'განიცადე კვირიაკესა',
  'კურთხეულ არს მომავალი;',
  'ხორცი ქრისტესი;',
  'ალილუია',
  'ნათელი ჭეშმარიტი;',
  'აღავსე პირი ჩემი',
  'მც. კვერექსი;',
  'სახელითა უფლისათა; დიდება აწცა',
  'მრავალჟამიერ;',
  'ისპოლა',
];

// Gelati school row = the versions printed in the book (chant numbers 145-255), in chantTitles order.
// [label, numbers, main]: "main" keeps the old გ.ს. id/code, so its Drive recording stays bound
// (default: the first version). An empty label is filled in from the manuscript name.
type BookVersion = [label: string, nums: BookNums, main?: true];
const MODES = ['ა', 'ბ', 'გ', 'დ', 'ე', 'ვ', 'ზ', 'ჱ'];
const eightModes = (first: number): BookVersion[] => MODES.map((m, i) => [`ჴმაჲ ${m}`, first + i]);

const TSIRVA_BOOK: BookVersion[][] = [
  [['', 145]],
  [['', 146]],
  [['', 147]],
  [['ამინ', 148], ['დიდი კუერექსი', [149, 152]]],
  [['', 153]],
  [['', [154, 156]]],
  [['', 157], ['', 158, true]],             // მხოლოდ-შობილი: the recording is №158 (user)
  [['', 159]],
  [['', [160, 161]]],
  [['', 162], ['', 163]],
  [['', 164]],
  [['', 165], ['', 166], ['', 167, true]], // წმიდაო ღმერთო: the recording is №167 (user)
  eightModes(168),
  [...eightModes(176), ['ალილუიაჲ', 184]],
  [['და სულისაცა', [185, 186]], ['დიდება შენდა, უფალო', [187, 188]]],
  [['', [189, 190]]],
  [['', [191, 193]]],
  [['', [194, 198]]],
  [['უფალო, შეგჳწყალენ', 199], ['ამინ', 200]],
  [['სადა', 201], ['გამშვენებული', 202]],
  [['', 203], ['', 204]],
  [['', [205, 207]]],
  [['და სულისაცა', [208, 209]], ['მამასა და ძესა', 210, true], ['მამასა და ძესა', 211]],
  [['', 212]],
  [['', [213, 214]]],
  [['', 215]],
  [['', 216], ['', 217]],
  [['', 218], ['', 219]],
  [['', 220], ['', 221]],
  [['ამინ, ამინ', 222], ['შენ გიგალობთ', 223, true], ['შენ გიგალობთ', 224]],
  [['ჴმაჲ ჱ', 225]],
  [['', 226], ['', 227]],
  [['', 228], ['', 229]],
  [['', [230, 232]]],
  [['', 233], ['', 234]],
  [['', 235]],
  [['', 236]],
  [['', 237]],
  [['', 238]],
  [['', 239], ['', 240]],
  [['', 241]],
  [['', 242]],
  [['', 243]],
  [['', [244, 246]]],
  [['სახელითა უფლისათა', 247], ['ამინ', 248], ['იყავნ სახელი უფლისა', 249, true], ['დიდებაჲ, აწ და', 250]],
  [['', 251], ['', 252], ['', 253]],
  [['', 254], ['', 255]],
];

// ქართლ-კახური row = the versions printed in the Kartli-Kakheti book (vol. III, chant numbers 140-240), in chantTitles order.
// The first ornate version (140-198) takes the old "ქ.კ. გამშვ" slot, the first plain one (199-240) the "ქ.კ." slot;
// chants with no version there keep the empty pair.
type KKVersion = [label: string, nums: BookNums];
const TSIRVA_KK: KKVersion[][] = [
  [['', 140]],
  [['', 141]],
  [['ხმა ჱ', 142]],
  [['ამინ', 145], ['დიდი კვერექსი', [146, 150]], ['', [199, 201]]],
  [['', 151], ['', [202, 203]]],
  [['', [204, 206]]],
  [['', [152, 153]], ['', [154, 155]], ['', [207, 208]]],
  [['ავაჯით', 156]],
  [['', [157, 158]], ['', 209]],
  [['', 159], ['', 210]],
  [['', [160, 161]], ['', [211, 212]]],
  [['', 162], ['ხმა ბ', 163], ['რაოდენთა ქრისტეს მიერ', 164], ['', 213]],
  [['', 165], ['', 214]],
  [['', 166], ['', 215]],
  [['და სულისაცა', 167], ['დიდება შენდა, უფალო', 168], ['და სულისაცა', 216], ['დიდება შენდა, უფალო', 217]],
  [['', 169], ['', 218]],
  [],
  [],
  [['გრძელი', 221], ['', 222]],
  [['', 170], ['', 219]],
  [['', [171, 172]], ['', 220]],
  [['', [223, 225]]],
  [['და სულისაცა', 173], ['მამასა და ძესა', 174], ['მამასა და ძესა', 226]],
  [['', 175], ['', 227]],
  [['', 176], ['', 228]],
  [['', 177], ['', 229]],
  [['', 178], ['', 230]],
  [['', 179], ['', 231]],
  [['', 180], ['', 232]],
  [['ამინ, ამინ', 181], ['შენ გიგალობთ', 182], ['შენ გიგალობთ', 233]],
  [['ხმა ჱ', 183]],
  [['', 184], ['', 234]],
  [['', 185], ['', 235]],
  [['', [186, 187]]],
  [['', 188], ['', 236]],
  [],
  [['', 189], ['', 237]],
  [['', 190], ['', 238]],
  [['', 191]],
  [['', 192]],
  [],
  [['', 193], ['', 239]],
  [['', 194], ['', 240]],
  [],
  [['სახელითა უფლისათა', 195], ['ამინ. იყავნ სახელი უფლისა', 196], ['დიდება, აწ და', 197]],
  [['', 198]],
  [['', 143], ['', 144]],
];

const kkVariants = (n: number, title: string): ChantVariant[] => {
  const taken = new Set<string>();
  return TSIRVA_KK[n - 1].map(([label, n0]) => {
    const nums = numsOf(n0);
    const section = kkLiturgySection(nums[0]);
    const slot = section === 'სადა' ? [`v-${n}-3`, 'ქ.კ.'] : [`v-${n}-4`, 'ქ.კ. გამშვ'];
    const [id, code] = taken.has(slot[0]) ? [`v-${n}-k${nums[0]}`, `ქ.კ. №${nums[0]}`] : slot;
    taken.add(id);
    return kkVariant(id, code, title, label, nums, section);
  });
};

// Liturgy book vol. V (გამშვენებული კილო), in chantTitles order: Gelati school (numbers 1-119, ქორიძის პარტიტურა)
// and Shemokmedi school (120-142). Gelati versions are added to the Gelati row next to vol. I; Shemokmedi versions
// replace the empty "შ.ს." pair (the first takes the "შ.ს. გამშვ" slot). An empty label is filled in from the source.
const TSIRVA_V5_GS: KKVersion[][] = [
  [['', 2]],
  [['', 3]],
  [['', 5]],
  [['ამინ', 7], ['ამინ', 8], ['დიდი კვერექსი', [9, 13]]],
  [['', 14]],
  [['', [15, 17]], ['', [19, 21]]],
  [['', 18]],
  [['', 22]],
  [['', 23]],
  [['', 24], ['', 25], ['', 27], ['', 28]],
  [['', 29]],
  [['სამღვდელთმთავრო', 34], ['', 35], ['', 36], ['', 39]],
  [['ხმა ვ', 37]],
  [['', 38], ['', 40]],
  [['და სულისაცა', 41], ['და სულისაცა', 42], ['დიდება შენდა, უფალო', 43], ['დიდება შენდა, უფალო', 44], ['დიდება შენდა, უფალო', 45]],
  [['', [47, 53]]],
  [['', [54, 56]]],
  [['', [57, 61]]],
  [],
  [['სამღვდელთმთავრო', 62], ['ჭრელი', 63], ['სამღვდელთმთავრო', 65], ['', 67], ['ხმა ჱ', 69]],
  [['', 64], ['', 66], ['', 68], ['ამინ. და ვითარცა', 70]],
  [['', [72, 76]]],
  [['და სულისაცა', 77], ['მამასა და ძესა', 78], ['და სულისაცა', 79], ['მამასა და ძესა', 80]],
  [['', 81]],
  [['', 82]],
  [['', 83]],
  [['', 84]],
  [['', 85], ['', 86]],
  [['', 87]],
  [['ამინ. ამინ', 88], ['შენ გიგალობთ', 89], ['შენ გიგალობთ', 90]],
  [],
  [['', 91]],
  [['', 92], ['', 93]],
  [],
  [['', 94], ['', 95]],
  [['', 96]],
  [['', 97]],
  [['', 98], ['', 100]],
  [['', 102]],
  [['', 103]],
  [['', 101], ['', 104]],
  [['', 105], ['ხმა ა', 106]],
  [['', 107], ['ხმა ა', 108]],
  [['', [109, 111]]],
  [['სახელითა უფლისათა', 112], ['იყავნ სახელი უფლისა', 113], ['იყავნ სახელი უფლისა', 114], ['დიდება, აწ და', 115]],
  [['', 30], ['', 31], ['', 32], ['ამინ', 33], ['უწმიდესი და უნეტარესი', 117], ['უწმიდესი და უნეტარესი', 118]],
  [['', 1], ['', 26], ['', 46], ['', 71], ['', 116]],
];
const TSIRVA_V5_SH: Record<number, KKVersion[]> = {
  7: [['', 120]],
  10: [['', 121]],
  12: [['', 122], ['', 123]],
  20: [['', 124]],
  21: [['', 125]],
  23: [['მამასა და ძესა', 126]],
  24: [['', 127]],
  25: [['', 128]],
  26: [['', 129]],
  27: [['', 130]],
  28: [['', 131]],
  29: [['', 132]],
  30: [['', 133]],
  32: [['', 134]],
  33: [['', 135]],
  35: [['', 136], ['', 137]],
  36: [['', 138], ['ამინ. ამინ', 139]],
  37: [['', 140]],
  40: [['', 141]],
  45: [['დიდება, აწ და', 142]],
};

const v5Variant = (id: string, code: string, title: string, label: string, n0: BookNums): ChantVariant => {
  const nums = numsOf(n0);
  const gelati = nums[0] <= 119;
  const source = gelati ? 'V ტომი' : v5Source(nums[0]);
  const version = label || source;
  const page = v5Page(nums[0]);
  return {
    id,
    code,
    label: gelati ? 'გელათის სკოლა' : 'შემოქმედის სკოლა',
    chantName: title,
    fullTitle: bookFullTitle(title, variantName({ bookNums: nums, version }), page, gelati ? 'გ.ს.' : 'შ.ს.'),
    version,
    page,
    bookNums: nums,
    source,
    book: V5_BOOK,
  };
};

const v5GelatiVariants = (n: number, title: string) =>
  TSIRVA_V5_GS[n - 1].map(([label, n0]) => {
    const first = numsOf(n0)[0];
    return v5Variant(`v-${n}-v${first}`, `გ.ს. V №${first}`, title, label, n0);
  });

const v5ShemokmediVariants = (n: number, title: string) =>
  (TSIRVA_V5_SH[n] || []).map(([label, n0], k) => {
    const first = numsOf(n0)[0];
    const [id, code] = k === 0 ? [`v-${n}-6`, 'შ.ს. გამშვ'] : [`v-${n}-s${first}`, `შ.ს. №${first}`];
    return v5Variant(id, code, title, label, n0);
  });

// Gelati school book vol. IX (2023), in chantTitles order: the liturgy in the authentic mode (numbers 1-57) and the
// plain chants for children (58-77). Added to the Gelati row after vol. V; an empty label is filled in from the section.
const TSIRVA_V9: KKVersion[][] = [
  [],
  [],
  [],
  [['ამინ', 1], ['დიდი კვერექსი', [2, 3]]],
  [['', 4], ['', 58]],
  [['', [5, 7]], ['', [9, 11]]],
  [['', 8], ['', 59]],
  [['', 12], ['', 60]],
  [['', 13]],
  [['', 14], ['', 61]],
  [['', 15]],
  [['ამინ', 16], ['', 17], ['', 62], ['', 63]],
  [],
  [['', 18]],
  [['და სულისაცა', 19], ['დიდება შენდა, უფალო', 20]],
  [['უფალო, შეგვიწყალენ', 21], ['', [22, 23]]],
  [['', [24, 26]]],
  [['', 27]],
  [['უფალო, შეგვიწყალენ', 28], ['ამინ', 29]],
  [['', 30], ['', 64]],
  [['', 31], ['', 65]],
  [],
  [['და სულისაცა', 32], ['მამასა და ძესა', 33]],
  [['', 34]],
  [['', 35]],
  [],
  [['', 36]],
  [['', 37], ['', 66]],
  [['', 38], ['', 67]],
  [['ამინ', 39], ['შენ გიგალობთ', 40], ['შენ გიგალობთ', 68]],
  [],
  [['', 41], ['', 69]],
  [['', 42], ['', 70]],
  [],
  [['', 43], ['', 73]],
  [['და სულისაცა', 71], ['შენ, უფალო', 72]],
  [['', 44], ['', 74]],
  [],
  [['', 46], ['', 76]],
  [],
  [['', 45], ['', 75]],
  [['', 47]],
  [['', 48]],
  [['', [49, 52]]],
  [['სახელითა უფლისათა', 53], ['უფალო, შეგვიწყალენ', 54], ['იყავნ სახელი უფლისა', 55], ['დიდება, აწ და', 56], ['იყავნ სახელი უფლისა', 77]],
  [],
  [['', 57]],
];

// A version printed in vol. IX (also used by the ცისკარი troparia of the eight modes)
export const v9Variant = (id: string, code: string, title: string, label: string, n0: BookNums): ChantVariant => {
  const nums = numsOf(n0);
  const source = v9Source(nums[0]);
  const version = label || source;
  const page = v9Page(nums[0]);
  return {
    id,
    code,
    label: 'გელათის სკოლა',
    chantName: title,
    fullTitle: bookFullTitle(title, variantName({ bookNums: nums, version }), page),
    version,
    page,
    bookNums: nums,
    source,
    book: V9_BOOK,
  };
};

const v9Variants = (n: number, title: string) =>
  TSIRVA_V9[n - 1].map(([label, n0]) => {
    const first = numsOf(n0)[0];
    return v9Variant(`v-${n}-x${first}`, `გ.ს. IX №${first}`, title, label, n0);
  });

// Chants printed only in vol. V (Gelati): own stable ids, inserted after the chant (chantTitles number) they follow
const V5_ONLY: { after: number; num: number; title: string }[] = [
  { after: 2, num: 4, title: 'ულხინე' },
  { after: 3, num: 6, title: 'მღვდელთა ხარ ბრწყინვალე' },
  { after: 38, num: 99, title: 'მზისა შემოქმედი (აღდგომის იკოსი)' },
  { after: 47, num: 119, title: 'პირისა შენისა მადლი (ოქროპირის ტროპარი)' },
];

// Chants whose "გ.ს. გამშვ" slot has its own recording that is not one of the book versions
const KEEP_ORNATE_SLOT = new Set([8]);

const gelatiVariants = (n: number, title: string): ChantVariant[] => {
  const versions = TSIRVA_BOOK[n - 1];
  const mainIdx = Math.max(0, versions.findIndex(v => v[2]));
  const list: ChantVariant[] = versions.map(([label, n0], k) => {
    const nums = numsOf(n0);
    const source = bookSource(nums);
    // unlabelled versions are named after their manuscript; the book number tells them apart
    const version = label || source || '';
    const page = bookPage(nums[0]);
    const ornate = label === 'გამშვენებული';
    const [id, code] = k === mainIdx ? [`v-${n}-1`, 'გ.ს.'] : ornate ? [`v-${n}-2`, 'გ.ს. გამშვ'] : [`v-${n}-g${k + 1}`, `გ.ს. №${nums[0]}`];
    return {
      id,
      code,
      label: 'გელათის სკოლა',
      chantName: title,
      fullTitle: bookFullTitle(title, variantName({ bookNums: nums, version }), page),
      version,
      page,
      bookNums: nums,
      source,
    };
  });
  if (KEEP_ORNATE_SLOT.has(n) && !list.some(v => v.id === `v-${n}-2`)) {
    list.push({ id: `v-${n}-2`, code: 'გ.ს. გამშვ', label: variantTemplates[1].label, chantName: title, fullTitle: `გ.ს. გამშვ ${title}`, version: 'გამშვენებული' });
  }
  return list;
};

const liturgyChants: ChantItem[] = chantTitles.map((title, i) => ({
  id: `chant-${i + 1}`,
  index: i + 1,
  title,
  variants: [
    ...gelatiVariants(i + 1, title),
    ...v5GelatiVariants(i + 1, title),
    ...v9Variants(i + 1, title),
    ...kkVariants(i + 1, title),
    ...v5ShemokmediVariants(i + 1, title),
    ...variantTemplates.slice(2).map((vt, k) => ({
      id: `v-${i + 1}-${k + 3}`,
      code: vt.code,
      label: vt.label,
      chantName: title,
      fullTitle: `${vt.code} ${title}`,
    })).filter(vt => !(vt.code.startsWith('ქ.კ.') && TSIRVA_KK[i].length) // book versions replace the empty pair
      && !(vt.code.startsWith('შ.ს.') && TSIRVA_V5_SH[i + 1])),
  ],
}));

// the Patarava book (Shemokmedi school, 2003) adds its litany and ისპოლა as the შ.ს. row
export const TSIRVA_CHANTS: ChantItem[] = withPataravaLiturgy(liturgyChants).flatMap(item => [
  item,
  ...V5_ONLY.filter(o => o.after === item.index).map(o => ({
    id: `chant-v5-${o.num}`,
    index: item.index,
    title: o.title,
    variants: [v5Variant(`v-v5-${o.num}`, `გ.ს. V №${o.num}`, o.title, '', o.num)],
  })),
]);
