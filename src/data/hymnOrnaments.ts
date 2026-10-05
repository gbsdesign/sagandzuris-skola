// Drawings from the hymnography books (ჰიმნო 1 and ჰიმნო 4), in public/hymn/.
// Each chant gets one small band above its first page and one larger drawing under its last page;
// the pair is picked from the chant's id, so a chant always looks the same.
// The number in a file name is the drawing's number in Downloads\ჰიმნოს ნახატები\ფერადი.

export interface HymnOrnament { src: string; w: number; h: number }

const make = (kind: 'top' | 'bottom', list: [string, number, number][]): HymnOrnament[] =>
  list.map(([n, w, h]) => ({ src: `/hymn/${kind}-${n}.webp`, w, h }));

export const HYMN_TOP = make('top', [
  ['02', 900, 116], ['12', 900, 128], ['17', 716, 140], ['21', 703, 140], ['22', 900, 92], ['30', 900, 114], ['42', 810, 140],
  ['51', 900, 121], ['56', 721, 140], ['59', 900, 119], ['62', 900, 101], ['63', 869, 140], ['69', 900, 110], ['75', 900, 134],
]);

export const HYMN_BOTTOM = make('bottom', [
  ['01', 720, 364], ['05', 626, 520], ['06', 720, 355], ['08', 720, 469], ['09', 708, 520], ['11', 720, 290], ['24', 530, 520],
  ['25', 720, 377], ['27', 581, 520], ['29', 720, 359], ['43', 720, 200], ['45', 567, 520], ['52', 720, 167], ['64', 522, 520],
]);

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export const hymnPair = (chantId: string) => ({
  top: HYMN_TOP[hash(chantId + ':top') % HYMN_TOP.length],
  bottom: HYMN_BOTTOM[hash(chantId + ':bottom') % HYMN_BOTTOM.length],
});

/** Width as a fraction of the page: the small band stays low, the large drawing gets more room. */
export const hymnWidth = (o: HymnOrnament, place: 'top' | 'bottom') => {
  const ar = o.h / o.w;
  return place === 'top' ? Math.min(0.56, 0.065 / ar) : Math.min(0.5, 0.26 / ar);
};
