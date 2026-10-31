// „ქართული გალობის ანთოლოგია“ (29 volumes, galobani.ge): only the versions the site's books lack — a version whose
// notes match one of theirs is left out (e.g. vol. XIX №8 = IX №8, vol. XXVIII №77b = I №158, most of vol. I = vol. V;
// vol. II №282–285: alteration variants of one chant that match III №154).
// Notes in the R2 bucket „sagandzuri-notes“ (a<vol>/…, utils/notesBase.ts), read from the PDFs' music font by scripts/omr; a number with a letter (76a) gets its
// own file number (761; from vol. IV on ×100: 12b = 1202); a unit of several short numbers (a litany) is one file named after its first number.
// The East Georgian volumes (II–IV) are in anthologyEastChants.ts, the western ones from vol. V on in anthologyWestChants.ts.
// This file and that one import nothing but types and data, so every chant list can take its versions from here
// without an import cycle.
import type { ChantItem, ChantVariant } from './tsirvaChants';
import { EAST_ATTACH } from './anthologyEastChants';
import { WEST_ATTACH } from './anthologyWestChants';

export const ANTH_ROMAN: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X', 11: 'XI', 12: 'XII', 13: 'XIII', 14: 'XIV', 15: 'XV', 16: 'XVI', 17: 'XVII', 18: 'XVIII', 19: 'XIX', 20: 'XX', 21: 'XXI', 22: 'XXII', 23: 'XXIII', 28: 'XXVIII', 29: 'XXIX' };
// the East Georgian volumes: Kartli-Kakheti school (the school of the others is a guess from the volume)
const ANTH_EAST = new Set([2, 3, 4, 10, 11]);

/** One printed piece (or a unit of several): its number as printed, notes file, printed page, and how it is named. */
export interface AnthPiece {
  vol: number;
  num: string;       // as printed: "6", "76a", a unit "98–107"
  file: number;      // a<vol>/<file>.json in R2 (76a = 761, a unit = its first number)
  page: number;
  version: string;   // a chant's version: its source (ქორიძე, ხუნდაძე; may be empty); a group's chant: its own name
  source?: string;   // a chant's version: where in the book (ბასილი დიდის წირვა); a group's chant: its source
}

// vol. I: Philimon Koridze's printed liturgy (1895) and his collection of 1901 — Gelati school
const KORIDZE = 'ქორიძე';
const BASIL = 'ბასილი დიდის წირვა';
const v1 = (num: string, file: number, page: number, source?: string, version = KORIDZE): AnthPiece =>
  ({ vol: 1, num, file, page, version, source });
const v1g = (num: string, file: number, page: number, name: string): AnthPiece =>
  ({ vol: 1, num, file, page, version: name, source: KORIDZE });
/** Versions added to chants that are already on the site, by chant id. */
const ATTACH: Record<string, AnthPiece[]> = {
  // წირვა (vol. XXVIII–XXIX: Khundadze's manuscripts; the school is a guess from the volume)
  'chant-7': [
    { vol: 28, num: '76a', file: 761, page: 152, version: 'ხუნდაძე', source: 'ხუნდაძე' },
    { vol: 28, num: '76b', file: 762, page: 155, version: 'ხუნდაძე', source: 'ხუნდაძე' },
    { vol: 28, num: '76c', file: 763, page: 158, version: 'ხუნდაძე', source: 'ხუნდაძე' },
    { vol: 28, num: '77a', file: 771, page: 161, version: 'ხუნდაძე', source: 'ხუნდაძე' },
    { vol: 29, num: '43', file: 43, page: 74, version: 'ხელნაწერი Q676', source: 'ხელნაწერი Q676' },
  ],
  'chant-v5-6': [v1('6', 6, 59)],
  'chant-15': [v1('43', 43, 128)],
  'chant-20': [v1('62', 62, 135, 'მღვდელთმთავრისა')],
  'chant-21': [v1('66', 66, 155)],
  'chant-23': [v1('83a', 831, 179, 'გამოცემის ვარიანტი')],
  'chant-25': [v1('85', 85, 187)],
  'chant-29': [v1('159', 159, 341, BASIL)],
  'chant-30': [v1('160', 160, 345, `${BASIL}, დასასრული`)],
  'chant-31': [v1('157', 157, 332, BASIL)],
  'chant-34': [v1('98–107', 98, 212)],
  'chant-40': [v1('161', 161, 347, BASIL)],
  'chant-45': [v1('127a', 1271, 256), v1('129', 129, 259)],
  'chant-46': [v1('135', 135, 268), v1('136', 136, 274), v1('205', 205, 416, 'დამატება')],
  // მარხვანი
  'mx-5': [
    v1g('138', 138, 283, 'აწ და'),
    v1g('139–141', 139, 285, 'უფალო, რომელმან, ხმა ვ, III ჟამი'),
    v1g('142–145', 142, 290, 'რომელმან მეექვსესა დღესა, ხმა ვ, VI ჟამი'),
    v1g('146–149', 146, 295, 'რომელმან მეცხრესა ჟამსა, ხმა ვ, IX ჟამი'),
  ],
  'mx-8': [
    v1g('151', 151, 304, 'ნათელი მხიარული'),
    v1g('152', 152, 310, 'წარემართენ ლოცვა ჩემი'),
    v1g('206', 206, 420, 'დასდევ, უფალო, საცოპირსა ჩემსა'),
  ],
};

/** The pieces of a chant: the western volumes' above and the East Georgian ones. */
const piecesOf = (chantId: string): AnthPiece[] =>
  [...(ATTACH[chantId] ?? []), ...(WEST_ATTACH[chantId] ?? []), ...(EAST_ATTACH[chantId] ?? [])];

/** Chants the site has no place for in a list that exists: a new item right after the item `after` (or before `before`);
 *  its versions are its pieces here or, without them, its pieces above. */
const NEW_ITEMS: { after?: string; before?: string; id: string; title: string; pieces?: AnthPiece[] }[] = [
  { after: 'chant-31', id: 'chant-a1-158', title: 'ზეცით გამოჩინებულისა', pieces: [v1('158', 158, 338, BASIL)] },
  {
    after: 'sd-31', id: 'sd-a1-filimon', title: 'წმიდა ფილიმონ მგალობელი — 12 ივლისი',
    pieces: [
      v1g('207', 207, 421, 'ტროპარი, ხმა ჱ'),
      v1g('208', 208, 425, 'ტროპარი, ხმა ჱ, გამშვენებული'),
      v1g('209', 209, 428, 'კონდაკი, ხმა ჱ'),
    ],
  },
  // vol. II: the bishop's meeting (East Georgian order, vol. II pp. 22–24) — before the bishop's „ღირს არს“ …
  { before: 'chant-1', id: 'chant-a2-1', title: 'აღმოსავალო მზისაო (პატრიარქის დახვედრა)' },
  { before: 'chant-1', id: 'chant-a2-5', title: 'დღეს საღმრთომან მადლმან (ეპისკოპოსის დახვედრა)' },
  { before: 'chant-1', id: 'chant-a2-8', title: 'ნათელი მოხვედ (მღვდელთმთავრის დახვედრა)' },
  // … and after „ტონ დესპოტინ“
  { after: 'chant-2', id: 'chant-a2-35', title: 'ვერ შემძლებელ ვართ (მღვდელთმთავრის დახვედრა)' },
  { after: 'chant-2', id: 'chant-a2-42', title: 'მგალობელნი შენნი (მღვდელთმთავრის დახვედრა)' },
  { after: 'chant-6', id: 'chant-a2-276', title: 'აქებს სული ჩემი' },
  { after: 'chant-8', id: 'chant-a2-310', title: 'კეთილ არს აღსარება უფლისა (დღიური ა ანტიფონი)' },
  { after: 'chant-8', id: 'chant-a2-311', title: 'უფალი სუფევს (დღიური ბ ანტიფონი)' },
  { after: 'chant-8', id: 'chant-a2-312', title: 'მოვედით, უგალობდეთ უფალსა (დღიური გ ანტიფონი)' },
  { after: 'chant-11', id: 'chant-a2-377', title: 'დიპტიქი (ქებანი)' },
  // vol. III: the weekdays' prokeimena; hymns sung after „განიცადე“, while the clergy communes (vol. III p. 11–14)
  { after: 'chant-13', id: 'chant-a3-48', title: 'წარდგომანი დღიურნი' },
  { after: 'chant-v5-99', id: 'chant-a3-376', title: 'განმანათლებელი ჩვენი (ზიარებისას)' },
  { after: 'chant-v5-99', id: 'chant-a3-382', title: 'შენ ხარ ვენახი (ზიარებისას)' },
  { after: 'chant-v5-99', id: 'chant-a3-383', title: 'ღმრთისმშობელი და ყოვლად პატიოსანი (ზიარებისას)' },
  // the Karbelashvili brothers (6 September new style): vol. II's ოხითა and კონდაკი
  { after: 'sd-34', id: 'sd-a2-karbelashvili', title: 'წმიდა ძმანი კარბელაშვილნი — 24 აგვისტო' },
  // vol. IV: „ნეტარ არს კაცი“, sung while the clergy communes (vol. III p. 11)
  { after: 'chant-v5-99', id: 'chant-a4-95', title: 'ნეტარ არს კაცი (ზიარებისას)' },
  // vol. V №68–72: R. Khundadze's „შესხმანი“ of saints and feasts, sung at the feast's table (vol. V, introduction)
  { after: 'sd-35', id: 'sd-a5-68', title: 'შესხმანი — წმიდანთა და დღესასწაულთა' },
  // vols VI–VIII (the Heirmologion): irmoi the manuscripts give no tone, then the chants of other kinds that have no
  // place of their own on the site
  { after: 'dz-8', id: 'dz-a8-12', title: 'ხმა უცნობია' },
  { after: 'dz-8', id: 'dz-a6-1', title: 'სხვა საგალობლები — ძლისპირთა წიგნებიდან' },
  // vols X–XI (the Karbelashvilis' vigil): the opening of matins (from the midnight office), the weekdays' troparia,
  // the eight tones' sessional hymns and hypakoe, two saints' troparia and the common magnifications
  { before: 'ck-1', id: 'ck-a10-107', title: 'ცისკრის დასაწყისი (შუაღამისა ჟამნიდან)' },
  { after: 'ck-v9-79', id: 'ck-a10-133', title: 'კვირის დღეების ტროპარები' },
  { after: 'ck-v9-79', id: 'ck-a10-197', title: 'საცისკრო წარდგომანი რვა ხმისანი' },
  { after: 'ck-10', id: 'ck-a11-40', title: 'იბაკონი აღდგომისანი რვა ხმისანი' },
  { after: 'sd-16', id: 'sd-a10-93', title: 'წმიდა არჩილ მეფე — 15 იანვარი' },
  { after: 'sd-17', id: 'sd-a10-94', title: 'ღირსნი ქსენოფონტე, მარიამი, არკადი და იოანე — 26 იანვარი' },
  { after: 'sd-35', id: 'sd-a11-19', title: 'საზოგადო სადიდებლები — მოციქულთა, მღვდელთმთავართა, მოწამეთა, ღირსთა, მეფეთა' },  // vol. XII: the aposticha of Saturday's great vespers, eight tones
  { after: 'mw-16', id: 'mw-a12-160', title: 'სტიქარონის დასდებელნი აღდგომისანი რვა ხმისანი' },
  // vol. XIII: saints the site had no feast for, with the book's old-style date (the user's choice)
  { after: 'sd-4', id: 'sd-a13-10', title: 'წმიდა იოსებ ალავერდელი — 15 სექტემბერი' },
  { after: 'sd-4', id: 'sd-a13-11', title: 'წმიდანი ბიძინა, შალვა და ელიზბარ — 18 სექტემბერი' },
  { after: 'sd-6', id: 'sd-a13-15', title: 'წმიდანი დავით და კონსტანტინე — 2 ოქტომბერი' },
  { after: 'sd-6', id: 'sd-a13-16', title: 'წმიდა გრიგოლ ხანძთელი — 5 ოქტომბერი' },
  { after: 'sd-6', id: 'sd-a13-17', title: 'წმიდა დიდმოწამე დიმიტრი — 26 ოქტომბერი' },
  { after: 'sd-6', id: 'sd-a13-18', title: 'წმიდა ნეოფიტე ურბნელი — 28 ოქტომბერი' },
  { after: 'sd-8', id: 'sd-a13-21', title: 'წმიდა ილარიონ ქართველი — 19 ნოემბერი' },
  { after: 'sd-9', id: 'sd-a13-23', title: 'წმიდა აბიბოს ნეკრესელი — 29 ნოემბერი' },
  { after: 'sd-11', id: 'sd-a13-27', title: 'წმიდა საბა განწმედილი — 5 დეკემბერი' },
  { after: 'sd-16', id: 'sd-a13-33', title: 'წმიდა ანტონ მარტყოფელი — 19 იანვარი' },
  { after: 'sd-28', id: 'sd-a13-41', title: 'წმიდა მეფენი არჩილ და ლუარსაბ — 21 ივნისი' },
  { after: 'sd-31', id: 'sd-a13-46', title: 'წმიდანი იოანე და გაბრიელ ათონელნი — 12 ივლისი' },
  { after: 'sd-31', id: 'sd-a13-48', title: 'წმიდა ილია წინასწარმეტყველი — 20 ივლისი' },
  { after: 'sd-31', id: 'sd-a13-49', title: 'წმიდა დიდმოწამე პანტელეიმონ მკურნალი — 27 ივლისი' },
  { after: 'sd-31', id: 'sd-a13-50', title: 'წმიდა დიდმოწამე რაჟდენ — 3 აგვისტო' },
  { after: 'sd-34', id: 'sd-a13-54', title: 'წმიდა დედოფალი შუშანიკი — 28 აგვისტო' },
  // vols XIV–XVIII (Kereselidze's mss. Q673–Q674): the matins' exapostilaria and the praises' stichera, the first hour,
  // St George's spring feast (the site had only 10 November) and „აღმოსავალითგან მზისა“ of the bishop's meeting
  { after: 'ck-22', id: 'ck-a16-131', title: 'განმანათლებელნი — აღდგომისანი და შვიდეულისანი' },
  { after: 'ck-15', id: 'ck-a17-3', title: 'აქებდითსა ზედა დასდებელნი აღდგომისანი რვა ხმისანი' },
  { before: 'ck-29', id: 'ck-a17-112', title: 'პირველი ჟამის საგალობლები' },
  { after: 'sd-22', id: 'sd-a15-91', title: 'წმიდა დიდმოწამე გიორგი — 23 აპრილი' },
  { before: 'chant-1', id: 'chant-a18-1', title: 'აღმოსავალითგან მზისა (მღვდელთმთავრის დახვედრა)' },
  // vols XXII–XXIII: the whole service of the Nativity and of Holy Thursday, in parts (the user's choice „ნაწილებად“)
  { after: 'sd-13', id: 'sd-a22-1', title: 'ქრისტეშობა — სამეფო ჟამები' },
  { after: 'sd-13', id: 'sd-a22-38', title: 'ქრისტეშობა — დიდი მწუხრი' },
  { after: 'sd-13', id: 'sd-a22-80', title: 'ქრისტეშობა — ცისკარი' },
  { after: 'sd-13', id: 'sd-a22-96', title: 'ქრისტეშობა — ცისკრის კანონები' },
  { after: 'sd-13', id: 'sd-a22-210', title: 'ქრისტეშობა — წირვა' },
  { after: 'mx-18', id: 'mx-a23-1', title: 'დიდი ხუთშაბათი — სამსაგალობელი (ანდრია კრიტელისა)' },
  { after: 'mx-18', id: 'mx-a23-44', title: 'დიდი ხუთშაბათი — ცისკარი: ტროპარი და კანონი' },
  { after: 'mx-18', id: 'mx-a23-97', title: 'დიდი ხუთშაბათი — დასდებელნი' },
  { after: 'mx-18', id: 'mx-a23-114', title: 'დიდი ხუთშაბათი — ჟამი, მწუხრი და წირვა' },
  { after: 'mx-18', id: 'mx-a23-161', title: 'დიდი ხუთშაბათი — ფერხთბანა' },
];

// a group (feast, occasion of მარხვანი…) lists its own chants; a chant lists versions of itself
const isGroup = (chantId: string) => /^(sd|mx|zt|mm|dz|kt|ds|pr)-/.test(chantId);
// a chant's versions are named after it: chant-7 → v-7-…, mx-5 → mx-v-5-…, pn-3 → pn-v-3-…
const idPrefix = (chantId: string) => chantId.startsWith('chant-') ? `v-${chantId.slice(6)}` : chantId.replace(/^([a-z]+)-/, '$1-v-');

export const anthVariant = (chantId: string, title: string, a: AnthPiece): ChantVariant => {
  const east = ANTH_EAST.has(a.vol);
  const school = east ? 'ქ.კ.' : 'გ.ს.';
  const name = [a.num, a.version].filter(Boolean).join(' ');
  const extra = [name, a.source !== a.version && a.source, `გვ. ${a.page}`].filter(Boolean).join(', ');
  const fullTitle = `${school} ${isGroup(chantId) ? title.split(' — ')[0] : title} (${extra})`;
  return {
    id: `${idPrefix(chantId)}-a${a.vol}-${a.num.split('–')[0]}`,
    code: `${school} ანთ. ${ANTH_ROMAN[a.vol]} №${a.num}`,
    label: east ? 'ქართლ-კახური' : 'გელათის სკოლა',
    chantName: title,
    fullTitle,
    version: a.version,
    page: a.page,
    bookNums: [a.file],
    numLabel: a.num,
    source: a.source,
    book: `a${a.vol}`,
  };
};

/** The anthology's versions of a chant that is on the site; `east` picks only the East Georgian volumes' or only the others'. */
export const anthVariantsFor = (chantId: string, title: string, east?: boolean): ChantVariant[] =>
  piecesOf(chantId).filter(a => east === undefined || ANTH_EAST.has(a.vol) === east).map(a => anthVariant(chantId, title, a));

/** A list with the anthology's versions added to its chants and its new chants put in place. */
export const withAnthology = (items: ChantItem[], skipAttached = false): ChantItem[] => {
  const newItem = (n: (typeof NEW_ITEMS)[number], index: number): ChantItem => ({
    id: n.id,
    index,
    title: n.title,
    // its own pieces first, then any the volumes attach to it (vol. IV's and XIX's „ზეცით გამოჩინებულისა“, XI's ფილიმონ were hidden before)
    variants: [...(n.pieces ?? []), ...piecesOf(n.id)].map(a => anthVariant(n.id, n.title, a)),
  });
  return items.flatMap(item => [
    ...NEW_ITEMS.filter(n => n.before === item.id).map(n => newItem(n, item.index)),
    skipAttached || !piecesOf(item.id).length ? item : { ...item, variants: [...item.variants, ...anthVariantsFor(item.id, item.title)] },
    ...NEW_ITEMS.filter(n => n.after === item.id).map(n => newItem(n, item.index)),
  ]);
};
