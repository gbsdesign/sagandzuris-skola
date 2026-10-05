// Drawings from the hymnography books (ჰიმნო 1 and ჰიმნო 4): every picture of Downloads\ჰიმნოს ნახატები,
// both folders (cNN = ფერადი/NN…, bwNN = შავ-თეთრი/NN…), trimmed and with the paper made transparent, in public/hymn/.
// Long low bands go above a chant's first page, the larger drawings under its last page; never at the sides.
import { SERVICE_LISTS } from './chantLookup';

export interface HymnOrnament { src: string; w: number; h: number; bw?: boolean }

type Row = [key: string, w: number, h: number, bw?: boolean];
const make = (kind: 'top' | 'bottom', rows: Row[]): HymnOrnament[] =>
  rows.map(([key, w, h, bw]) => ({ src: `/hymn/${kind}-${key}.webp`, w, h, bw }));

export const HYMN_TOP = make('top', [
  ['c02', 900, 116],
  ['c03', 877, 140],
  ['c04', 765, 140],
  ['c07', 900, 130],
  ['c10', 516, 140],
  ['c12', 900, 128],
  ['c13', 900, 106],
  ['c14', 587, 140],
  ['c15', 900, 130],
  ['c16', 900, 83],
  ['c17', 716, 140],
  ['c18', 617, 140],
  ['c19', 900, 111],
  ['c20', 900, 134],
  ['c21', 702, 140],
  ['c22', 900, 92],
  ['c23', 900, 109],
  ['c26', 900, 136],
  ['c30', 900, 114],
  ['c32', 900, 39],
  ['c35', 900, 97],
  ['c36', 818, 140],
  ['c37', 900, 52],
  ['c38', 711, 140],
  ['c42', 812, 140],
  ['c43', 505, 140],
  ['c44', 900, 114],
  ['c46', 792, 140],
  ['c47', 900, 78],
  ['c48', 698, 140],
  ['c49', 900, 118],
  ['c50', 900, 53],
  ['c51', 900, 121],
  ['c52', 604, 140],
  ['c53', 540, 140],
  ['c54', 900, 133],
  ['c55', 900, 132],
  ['c56', 720, 140],
  ['c57', 900, 74],
  ['c58', 900, 79],
  ['c59', 900, 119],
  ['c60', 900, 66],
  ['c61', 900, 107],
  ['c62', 900, 101],
  ['c63', 868, 140],
  ['c65', 900, 78],
  ['c66', 900, 79],
  ['c67', 900, 89],
  ['c68', 596, 111],
  ['c69', 900, 110],
  ['c70', 885, 140],
  ['c71', 438, 102],
  ['c72', 900, 103],
  ['c73', 900, 91],
  ['c74', 900, 61],
  ['c75', 900, 134],
  ['c76', 900, 137],
  ['c77', 900, 97],
  ['bw03', 759, 140, true],
  ['bw06', 900, 82, true],
  ['bw07', 843, 140, true],
]);

export const HYMN_BOTTOM = make('bottom', [
  ['c01', 720, 364],
  ['c05', 626, 520],
  ['c06', 720, 355],
  ['c08', 720, 469],
  ['c09', 684, 520],
  ['c11', 720, 290],
  ['c24', 530, 520],
  ['c25', 720, 377],
  ['c27', 581, 520],
  ['c28', 348, 520],
  ['c29', 720, 359],
  ['c31', 720, 320],
  ['c40', 720, 389],
  ['c41', 720, 437],
  ['c45', 567, 520],
  ['c64', 522, 520],
  ['bw01', 720, 464, true],
  ['bw02', 720, 466, true],
  ['bw04', 720, 223, true],
  ['bw05', 720, 258, true],
]);

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

// chants in service order: each takes the next drawing, so every drawing is used and neighbours never repeat
let order: Map<string, number> | null = null;
const chantIndex = (chantId: string) => {
  order ??= new Map(SERVICE_LISTS.flatMap(([, list]) => list).map((c, i) => [c.id, i] as [string, number]));
  return order.get(chantId) ?? hash(chantId);
};

export const hymnPair = (chantId: string) => {
  const i = chantIndex(chantId);
  return {
    top: HYMN_TOP[i % HYMN_TOP.length],
    bottom: HYMN_BOTTOM[(i + 7) % HYMN_BOTTOM.length],
  };
};

/** Width as a fraction of the page: the small band stays low, the large drawing gets more room. */
export const hymnWidth = (o: HymnOrnament, place: 'top' | 'bottom') => {
  const ar = o.h / o.w;
  return place === 'top' ? Math.min(0.56, 0.065 / ar) : Math.min(0.5, 0.26 / ar);
};
