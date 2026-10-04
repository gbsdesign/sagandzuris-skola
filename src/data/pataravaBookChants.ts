// types only: tsirvaChants imports this file (no runtime cycle)
import type { ChantItem, ChantVariant } from './tsirvaChants';
import { bookNumLabel } from './gelatiBookIndex';

const variantName = (v: Pick<ChantVariant, 'bookNums' | 'version'>) =>
  [bookNumLabel(v.bookNums), v.version].filter(Boolean).join(' ');

// "ქართული საეკლესიო და სალხინო საგალობლები (გურული კილო)", handed down by Dimitri Patarava (Tbilisi, 2003):
// the Shemokmedi school tradition. Only the church chants that have a place in the app are imported; their sheet music
// lives in public/notes/pat (NNN.json + images, one file per chant number). Book page = PDF page - 18.
export const PAT_BOOK = 'pat';

// [name, chant number, kind of chant (from the book's table of contents)]
type PatChant = [label: string, num: number, note?: string];

// Index = chant number: the book page it starts on
const PAGES: Record<number, number> = { 1: 3, 2: 4, 3: 5, 4: 7, 5: 8, 6: 10, 8: 14, 9: 18, 11: 22, 14: 29, 17: 34 };

// Key = the item's place in its tab (sd-N feasts of vol. II, mx-N / zt-N occasions of vol. IV, chant-N of the liturgy)
const FEASTS: Record<number, PatChant[]> = {
  15: [['ვერ-შემძლებელ ვართ', 9, 'IX ძლისპირი']],
  22: [['დღეს საღმრთომან მადლმან, ხმა ვ', 14, 'დასდებელი']],
};
const LENT: Record<number, PatChant[]> = {
  3: [['რაჟამს მოხვიდე, ღმერთი, ხმა ა', 8, 'კონდაკი']],
  15: [['სიყვარულმან მოგიყვანა', 17, 'ცისკრის V გალობის დასდებელი']],
};
const PASCHA: Record<number, PatChant[]> = {
  1: [['აღდგომასა შენსა, ხმა ვ', 1, 'დასდებელი'], ['ქრისტე აღდგა', 3, 'ტროპარი; მეორე ვარიანტით']],
  2: [['მოვედით და ვსვათ', 6, 'III ძლისპირი']],
  3: [['ადიდებს სული ჩემი', 4, 'IX ძლისპირის I ჩასართავი'], ['ანგელოზი ღაღადებს', 5, 'IX ძლისპირის IV ჩასართავი']],
};
const LITURGY: Record<number, PatChant[]> = {
  6: [['კვერექსი', 2, 'მღვდლის სათქმელი და გუნდის მისაგებელი']],
  47: [['ისპოლა', 11, 'მღვდელმთავრის წირვაზე']],
};

const patVariant = (prefix: string, index: number, title: string, [version, num, note]: PatChant, many: boolean): ChantVariant => {
  const page = PAGES[num];
  const name = variantName({ bookNums: [num], version });
  return {
    id: `${prefix}-v-${index}-pt${num}`,
    code: many ? `შ.ს. №${num}` : 'შ.ს.',
    label: 'შემოქმედის სკოლა',
    chantName: title,
    fullTitle: `შ.ს. ${title.split(' — ')[0]} (${[name, note, `გვ. ${page}`, 'დ. პატარავა'].filter(Boolean).join(', ')})`,
    version,
    page,
    bookNums: [num],
    source: note,
    book: PAT_BOOK,
  };
};

// The book versions take the place of an empty "შ.ს." pair (no recordings were bound to it)
const withPatarava = (prefix: string, table: Record<number, PatChant[]>) => (items: ChantItem[]): ChantItem[] =>
  items.map(item => {
    const chants = table[item.index];
    if (!chants || item.id !== `${prefix}-${item.index}`) return item;
    const kept = item.variants.filter(v => !(v.version === undefined && v.code.startsWith('შ.ს.')));
    return { ...item, variants: [...kept, ...chants.map(c => patVariant(prefix, item.index, item.title, c, chants.length > 1))] };
  });

export const withPataravaFeasts = withPatarava('sd', FEASTS);
export const withPataravaLent = withPatarava('mx', LENT);
export const withPataravaPascha = withPatarava('zt', PASCHA);
export const withPataravaLiturgy = withPatarava('chant', LITURGY);
