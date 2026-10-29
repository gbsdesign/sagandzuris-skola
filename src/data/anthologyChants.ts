// „ქართული გალობის ანთოლოგია“ (29 volumes, galobani.ge): only the versions the site's books lack — a version whose
// notes match one of theirs is left out (e.g. vol. XIX №8 = IX №8, vol. XXVIII №77b = I №158, most of vol. I = vol. V;
// vol. II №282–285: alteration variants of one chant that match III №154).
// Notes in public/notes/a<vol>/, read from the PDFs' music font by scripts/omr; a number with a letter (76a) gets its
// own file number (761); a unit of several short numbers (a litany) is one file named after its first number.
// This file holds no imports but types, so every chant list can take its versions from here without an import cycle.
import type { ChantItem, ChantVariant } from './tsirvaChants';

export const ANTH_ROMAN: Record<number, string> = { 1: 'I', 2: 'II', 4: 'IV', 28: 'XXVIII', 29: 'XXIX' };
// the East Georgian volumes: Kartli-Kakheti school (the school of the others is a guess from the volume)
const ANTH_EAST = new Set([2, 3, 4, 10, 11]);

/** One printed piece (or a unit of several): its number as printed, notes file, printed page, and how it is named. */
export interface AnthPiece {
  vol: number;
  num: string;       // as printed: "6", "76a", a unit "98–107"
  file: number;      // public/notes/a<vol>/<file>.json (76a = 761, a unit = its first number)
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
// vols II and IV name a version by its source only where the book does
const eastV = (vol: number, n: number, page: number, source?: string): AnthPiece =>
  ({ vol, num: String(n), file: n, page, version: source ?? '', source });

/** Versions added to chants that are already on the site, by chant id. */
const ATTACH: Record<string, AnthPiece[]> = {
  // წირვა (vol. XXVIII–XXIX: Khundadze's manuscripts; the school is a guess from the volume)
  'chant-7': [
    { vol: 28, num: '76a', file: 761, page: 152, version: 'ხუნდაძე', source: 'ხუნდაძე' },
    { vol: 28, num: '76b', file: 762, page: 155, version: 'ხუნდაძე', source: 'ხუნდაძე' },
    { vol: 28, num: '76c', file: 763, page: 158, version: 'ხუნდაძე', source: 'ხუნდაძე' },
    { vol: 28, num: '77a', file: 771, page: 161, version: 'ხუნდაძე', source: 'ხუნდაძე' },
    { vol: 29, num: '43', file: 43, page: 74, version: 'ხელნაწერი Q676', source: 'ხელნაწერი Q676' },
    // ქართლ-კახური (vols II, IV)
    eastV(2, 277, 268), eastV(2, 278, 270, 'კარბელაშვილი, 1899'), eastV(2, 279, 271),
    eastV(2, 280, 274, 'მოლოდინაშვილის ხელნაწერი'), eastV(2, 281, 276), eastV(2, 286, 290), eastV(2, 287, 293),
    eastV(4, 39, 54), eastV(4, 67, 83),
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

/** Chants the site has no place for in a list that exists: a new item right after the item `after`. */
const NEW_ITEMS: { after: string; id: string; title: string; pieces: AnthPiece[] }[] = [
  { after: 'chant-31', id: 'chant-a1-158', title: 'ზეცით გამოჩინებულისა', pieces: [v1('158', 158, 338, BASIL)] },
  {
    after: 'sd-31', id: 'sd-a1-filimon', title: 'წმიდა ფილიმონ მგალობელი — 12 ივლისი',
    pieces: [
      v1g('207', 207, 421, 'ტროპარი, ხმა ჱ'),
      v1g('208', 208, 425, 'ტროპარი, ხმა ჱ, გამშვენებული'),
      v1g('209', 209, 428, 'კონდაკი, ხმა ჱ'),
    ],
  },
];

// a group (feast, occasion of მარხვანი…) lists its own chants; a chant lists versions of itself
const isGroup = (chantId: string) => /^(sd|mx|zt|mm|dz|kt|ds)-/.test(chantId);
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
  (ATTACH[chantId] ?? []).filter(a => east === undefined || ANTH_EAST.has(a.vol) === east).map(a => anthVariant(chantId, title, a));

/** A list with the anthology's versions added to its chants and its new chants put in place. */
export const withAnthology = (items: ChantItem[], skipAttached = false): ChantItem[] =>
  items.flatMap(item => [
    skipAttached || !ATTACH[item.id] ? item : { ...item, variants: [...item.variants, ...anthVariantsFor(item.id, item.title)] },
    ...NEW_ITEMS.filter(n => n.after === item.id).map(n => ({
      id: n.id,
      index: item.index,
      title: n.title,
      variants: n.pieces.map(a => anthVariant(n.id, n.title, a)),
    })),
  ]);
