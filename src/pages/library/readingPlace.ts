// Where the reader stopped in a book (the Sacred History by default): the chapter, and its title for
// the shelf's "continue" card; `libraryBook:last` names the book read most recently.

const keys = (book: string) => [`libraryBook:${book}`, `libraryBook:${book}:title`] as const;
const LAST_BOOK = 'libraryBook:last';

export const lastChapter = (book = 'dzveli'): { n: number; title: string } | null => {
  const [last, title] = keys(book);
  try {
    const n = Number(localStorage.getItem(last));
    return n > 0 ? { n, title: localStorage.getItem(title) || '' } : null;
  } catch { return null; }
};

export const saveChapter = (n: number, title: string, book = 'dzveli') => {
  const [last, titleKey] = keys(book);
  try {
    localStorage.setItem(last, String(n));
    localStorage.setItem(titleKey, title);
    localStorage.setItem(LAST_BOOK, book);
  } catch { /* ignore */ }
};

/** The book read most recently, with its shelf ('book' = the Sacred History, else a „სასულიერო წიგნები“ book) and the
 *  steps that open its contents and then the chapter. */
export const lastReading = (): { shelf: 'book' | 'sasuliero'; n: number; title: string; steps: [string, string] } | null => {
  let book = 'dzveli';
  try { book = localStorage.getItem(LAST_BOOK) || 'dzveli'; } catch { /* the Sacred History */ }
  const own = book !== 'dzveli' ? lastChapter(book) : null;
  if (own) return { shelf: 'sasuliero', ...own, steps: ['sasuliero', `sasuliero:${book}:${own.n}`] };
  const at = lastChapter();
  return at ? { shelf: 'book', ...at, steps: ['book', `book:${at.n}`] } : null;
};
