// Where the reader stopped in a book (the Sacred History by default): the chapter, and its title for
// the shelf's "continue" card.

const keys = (book: string) => [`libraryBook:${book}`, `libraryBook:${book}:title`] as const;

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
  } catch { /* ignore */ }
};
