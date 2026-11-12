// types only: tsirvaChants imports this file (no runtime cycle)
import type { ChantItem, ChantVariant } from './tsirvaChants';

// Versions the user brought from outside the books (screenshots of a score), notes typed in by hand from the pictures:
// public/notes/gs/NNN.json + NNN-K.webp (+ i/NNN.webp), played by the synthesizer like any book version.
export const ADDED_BOOK = 'gs';

// Key = the chant's id: versions put in after its Gelati school ones
const ADDED: Record<string, Omit<ChantVariant, 'chantName' | 'fullTitle'>[]> = {
  // „ხორცი ქრისტესი“, ჭრელი, გელათის სკოლა — №125 of the user's score (2026-11-12)
  'chant-40': [{ id: 'v-40-gs125', code: 'გ.ს. №125', label: 'გელათის სკოლა', version: 'ჭრელი', bookNums: [125], book: ADDED_BOOK }],
};

export const withAddedChants = (items: ChantItem[]): ChantItem[] => items.map(item => {
  const extra = ADDED[item.id];
  if (!extra) return item;
  const title = item.title;
  const add = extra.map(v => ({ ...v, chantName: title, fullTitle: `გ.ს. ${title} (${v.bookNums?.[0]} ${v.version})` }));
  const at = item.variants.reduce((last, v, i) => (v.code.startsWith('გ.ს.') ? i + 1 : last), 0);
  return { ...item, variants: [...item.variants.slice(0, at), ...add, ...item.variants.slice(at)] };
});
