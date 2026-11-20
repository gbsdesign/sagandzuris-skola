// The order of „წიგნები მედავითნისთვის“ on the reader's front page (pages/v2/medavitne/Books.tsx ShelfRows): the books a
// reader holds at a service come first, in the order they are used; every other shelf of the „საღვთისმსახურო წიგნები“ menu
// (data/wignebi.ts — generated, its own order is the app's) folds under „სხვა წიგნები“.
import { WIGNEBI_COLLECTIONS, WIGNEBI_SHELVES } from '../data/wignebi';

/** a shelf's id — or a book inside a shelf (the Apostle stands in the Bible's shelf) */
export const READER_BOOKS = ['jamni', 'davitni', 'samociqulo', 'wardgoma', 'paraklitoni', 'tveni', 'zatiki'];
/** what a book that is not a shelf says under its name */
const BOOK_SUB: Record<string, string> = { samociqulo: 'მოციქულთა საქმე და ეპისტოლენი' };

export interface BookEntry { id: string; title: string; sub: string; /** the page's place: „w:c:<collection>“ or „w:s:<shelf>“ */ to: string }

export const bookEntry = (id: string): BookEntry | null => {
  const shelf = WIGNEBI_SHELVES.find(s => s.id === id);
  if (shelf) return {
    id, title: shelf.title.replace(/­/g, ''), sub: shelf.sub,
    to: shelf.collections.length === 1 ? `w:c:${shelf.collections[0]}` : `w:s:${id}`,
  };
  const c = WIGNEBI_COLLECTIONS[id];
  return c ? { id, title: c.title, sub: BOOK_SUB[id] ?? `${c.items.length} წიგნი`, to: `w:c:${id}` } : null;
};

const entries = (ids: string[]) => ids.map(bookEntry).filter((b): b is BookEntry => !!b);
/** the reader's own books, in the order of use */
export const readerBooks = (): BookEntry[] => entries(READER_BOOKS);
/** every other shelf, in the menu's order */
export const otherBooks = (): BookEntry[] => entries(WIGNEBI_SHELVES.filter(s => !READER_BOOKS.includes(s.id)).map(s => s.id));
