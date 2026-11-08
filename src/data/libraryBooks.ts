import type { Book } from '../pages/library/BookTab';

// The library's books (the shelf's „სასულიერო წიგნები“; „საღმრთო ისტორია“ is `dzveli`). Kept here, apart from the pages,
// so „საგანძურის გზა“'s library ring counts them without loading the library: a book added here counts by itself.

export interface Entry { id: string; title: string; author: string; chapters: number; load: () => Promise<Book> }

export const BOOKS: Entry[] = [
  {
    id: 'ati', title: 'ათი მცნების განმარტება', author: 'წმიდა ნიკოლოზ სერბი', chapters: 11,
    load: () => import('./library/atiMcneba.json').then(m => m.default as unknown as Book),
  },
];

/** every whole book of the library by its reader's `place` (BookTab): the Sacred History first */
export const LIBRARY_BOOK_IDS = ['dzveli', ...BOOKS.map(b => b.id)];
