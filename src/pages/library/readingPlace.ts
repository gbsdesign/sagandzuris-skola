// Where the reader stopped in a book (the Sacred History by default): the chapter, and its title for
// the shelf's "continue" card; `libraryBook:last` names the book read most recently. The book's number of chapters is kept
// too (the new look's „თავი 3 / 36“), once the book was opened with it.

const keys = (book: string) => [`libraryBook:${book}`, `libraryBook:${book}:title`, `libraryBook:${book}:total`] as const;
const LAST_BOOK = 'libraryBook:last';

export const lastChapter = (book = 'dzveli'): { n: number; title: string; total?: number } | null => {
  const [last, title, total] = keys(book);
  try {
    const n = Number(localStorage.getItem(last));
    const all = Number(localStorage.getItem(total));
    return n > 0 ? { n, title: localStorage.getItem(title) || '', ...(all > 0 ? { total: all } : {}) } : null;
  } catch { return null; }
};

export const saveChapter = (n: number, title: string, book = 'dzveli', total?: number) => {
  const [last, titleKey, totalKey] = keys(book);
  try {
    localStorage.setItem(last, String(n));
    localStorage.setItem(titleKey, title);
    if (total) localStorage.setItem(totalKey, String(total));
    localStorage.setItem(LAST_BOOK, book);
  } catch { /* ignore */ }
};

/** The book read most recently, with its shelf ('book' = the Sacred History, else a „სასულიერო წიგნები“ book) and the
 *  steps that open its contents and then the chapter. */
export const lastReading = (): { shelf: 'book' | 'sasuliero'; book: string; n: number; title: string; total?: number; steps: [string, string] } | null => {
  let book = 'dzveli';
  try { book = localStorage.getItem(LAST_BOOK) || 'dzveli'; } catch { /* the Sacred History */ }
  const own = book !== 'dzveli' ? lastChapter(book) : null;
  if (own) return { shelf: 'sasuliero', book, ...own, steps: ['sasuliero', `sasuliero:${book}:${own.n}`] };
  const at = lastChapter();
  return at ? { shelf: 'book', book: 'dzveli', ...at, steps: ['book', `book:${at.n}`] } : null;
};
