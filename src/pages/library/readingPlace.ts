// Where the reader stopped in the Sacred History: the chapter, and its title for the shelf's "continue" card.

const LAST_KEY = 'libraryBook:dzveli';
const TITLE_KEY = 'libraryBook:dzveli:title';

export const lastChapter = (): { n: number; title: string } | null => {
  try {
    const n = Number(localStorage.getItem(LAST_KEY));
    return n > 0 ? { n, title: localStorage.getItem(TITLE_KEY) || '' } : null;
  } catch { return null; }
};

export const saveChapter = (n: number, title: string) => {
  try {
    localStorage.setItem(LAST_KEY, String(n));
    localStorage.setItem(TITLE_KEY, title);
  } catch { /* ignore */ }
};
