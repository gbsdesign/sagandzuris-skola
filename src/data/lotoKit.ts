import type { LotoPiece } from '../utils/loto';

// „საგალობო ლოტო“'s printed kit (src/print/games/sagalobo-loto.js): twenty well-known chants — six of the
// Liturgy (vol. IX), six of vespers and eight of matins (vol. I), each with a melodic opening (none of PLAIN_OPENINGS) — and
// thirty cards over them (utils/loto.ts kitCards). The list is written out here, not drawn from the pearls, so the cards on
// paper and on the phone (the hybrid's „დაბეჭდილი ბარათები“) stay the same if the chests ever change. Never reorder it: a
// card names its chants by their place here.

export interface KitChant { id: string; title: string; book: string; num: number; service: string }

export const LOTO_KIT: readonly KitChant[] = [
  { id: 'v-5-x58', title: 'აკურთხევს სული ჩემი', book: 'v9', num: 58, service: 'წირვა' },
  { id: 'v-10-x61', title: 'მოვედით, თაყვანის-ვსცეთ', book: 'v9', num: 61, service: 'წირვა' },
  { id: 'v-12-x62', title: 'წმიდაო ღმერთო', book: 'v9', num: 62, service: 'წირვა' },
  { id: 'v-20-x64', title: 'რომელი ქერუბიმთა', book: 'v9', num: 64, service: 'წირვა' },
  { id: 'v-32-x69', title: 'ღირს არს ჭეშმარიტად', book: 'v9', num: 69, service: 'წირვა' },
  { id: 'v-33-x70', title: 'ყოველთა და ყოვლისათვის', book: 'v9', num: 70, service: 'წირვა' },
  { id: 'mw-v-5-1', title: 'ნეტარ არს კაცი', book: 'book', num: 11, service: 'მწუხრი' },
  { id: 'mw-v-7-1', title: 'უფალო, ღაღად-ვყავ', book: 'book', num: 15, service: 'მწუხრი' },
  { id: 'mw-v-12-1', title: 'ნათელო მხიარულო', book: 'book', num: 45, service: 'მწუხრი' },
  { id: 'mw-v-13-1', title: 'წარდგომაჲ მწუხრად', book: 'book', num: 49, service: 'მწუხრი' },
  { id: 'mw-v-19-1', title: 'აწ განუტევე მონაჲ შენი', book: 'book', num: 65, service: 'მწუხრი' },
  { id: 'mw-v-20-1', title: 'ღმრთისმშობელო ქალწულო', book: 'book', num: 73, service: 'მწუხრი' },
  { id: 'ck-v-1-1', title: 'დიდებაჲ მაღალთა შინა ღმერთსა', book: 'book', num: 77, service: 'ცისკარი' },
  { id: 'ck-v-3-1', title: 'ღმერთი უფალი', book: 'book', num: 84, service: 'ცისკარი' },
  { id: 'ck-v-9-1', title: 'გუნდნი ანგელოზთანი', book: 'book', num: 105, service: 'ცისკარი' },
  { id: 'ck-v-11-1', title: 'აღსავალი', book: 'book', num: 108, service: 'ცისკარი' },
  { id: 'ck-v-19-2', title: 'აღდგომაჲ ქრისტესი', book: 'book', num: 126, service: 'ცისკარი' },
  { id: 'ck-v-21-1', title: 'უპატიოსნესსა', book: 'book', num: 128, service: 'ცისკარი' },
  { id: 'ck-v-24-1', title: 'დიდება მაღალიანი', book: 'book', num: 132, service: 'ცისკარი' },
  { id: 'ck-v-15-2', title: 'ყოველი სული', book: 'book', num: 130, service: 'ცისკარი' },
];

/**
 * The pearls' known chants (data/chantGamePool.ts knownChants) whose opening is a reciting tone — every voice keeps its note
 * while the words go on (utils/loto.ts plainOpening) — so the sound alone cannot tell them: the game's chant deck leaves them
 * out. The test checks the list against the book notes.
 */
export const PLAIN_OPENINGS: ReadonlySet<string> = new Set([
  'v-7-x59', 'v-8-x60', 'v-21-x65', 'v-28-x66', 'v-29-x67', 'v-30-x68', 'v-35-x73', 'v-37-x74', 'v-39-x76', 'v-45-x77',
  'mw-v-21-1', 'mw-v-22-1', 'ck-v-5-1', 'ck-v-6-1', 'ck-v-20-1',
]);

export const kitNames = () => LOTO_KIT.map(c => c.title);
export const kitPieces = (): LotoPiece[] => LOTO_KIT.map(c => ({ id: c.id, book: c.book, num: c.num, service: c.service }));
