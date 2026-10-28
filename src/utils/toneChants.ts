import { SERVICE_LISTS, hasBookNotes } from '../data/chantLookup';
import type { ChantItem, ChantVariant } from '../data/tsirvaChants';

// The Sunday chants of a tone, for the „ხმა“ on the reader's day card (pages/medavitneoba/ToneSheet.tsx): the books'
// chants that are sung in the tone of the week, by service, each with its versions that have notes. A version belongs
// to tone n when its label ends in „ჴმაჲ X“ / „ხმა X“ (X = ა…ჱ), as the books print it.

const LETTERS = ['ა', 'ბ', 'გ', 'დ', 'ე', 'ვ', 'ზ', 'ჱ'];

/** „ჴმაჲ დ“, „ხმა დ“, „ბრწყინვალე იგი, ხმა დ“ → 4; anything else → null */
export const versionTone = (version = ''): number | null => {
  const m = /(?:ჴმაჲ|ხმაჲ|ხმა)\s+([აბგდევზჱ])\s*$/.exec(version);
  return m ? LETTERS.indexOf(m[1]) + 1 : null;
};

type Row = { chantId: string; title: string };
// the reader's own part first: the prokeimenon before the Apostle and the alleluia after it
const GROUPS: { service: string; hint?: string; rows: Row[] }[] = [
  { service: 'ლიტურგიაზე', hint: 'სამოციქულოს წინ და შემდეგ', rows: [
    { chantId: 'chant-13', title: 'წარდგომა' },
    { chantId: 'chant-14', title: 'ალილუია' },
  ] },
  { service: 'ცისკარზე', rows: [
    { chantId: 'ck-3', title: 'ღმერთი უფალი' },
    { chantId: 'ck-4', title: 'აღდგომის ტროპარი' },
    { chantId: 'ck-v9-79', title: 'დიდება, აწ და — ღმრთისმშობლისა' },
  ] },
  { service: 'მწუხრზე', rows: [
    { chantId: 'mw-7', title: 'უფალო, ღაღადვყავ' },
    { chantId: 'mw-8', title: 'აღდგომის დასდებელი' },
    { chantId: 'mw-10', title: 'დოგმატიკი' },
  ] },
];

let chants: Map<string, ChantItem> | null = null;
const chantById = (id: string) =>
  (chants ??= new Map(SERVICE_LISTS.flatMap(([, list]) => list.map(c => [c.id, c] as const)))).get(id);

// a version's school, said short as choirs say it (the Gelati school book, vol. I, is the default)
const bookOf = (v: ChantVariant) =>
  v.book === 'kk' ? 'ქართლ-კახური' : v.book === 'v9' ? 'გელათური, IX ტ.' : v.book === 'v5' ? 'გელათური, V ტ.' : 'გელათური';

export interface ToneVersion { vid: string; book: string; num?: number }
export interface ToneRow { title: string; versions: ToneVersion[] }
export interface ToneGroup { service: string; hint?: string; rows: ToneRow[] }

/** the Sunday chants of tone n (1–8) that the books have notes for */
export const toneChants = (tone: number): ToneGroup[] =>
  GROUPS.map(g => ({
    service: g.service,
    hint: g.hint,
    rows: g.rows.map(r => ({
      title: r.title,
      versions: (chantById(r.chantId)?.variants ?? [])
        .filter(v => hasBookNotes(v) && versionTone(v.version) === tone)
        .map(v => ({ vid: v.id, book: bookOf(v), num: v.bookNums?.[0] })),
    })).filter(r => r.versions.length),
  })).filter(g => g.rows.length);
