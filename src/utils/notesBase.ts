// „ქართული გალობის ანთოლოგია“ (books a1, a2 … a29) is kept in Cloudflare R2 behind the Worker worker/notes — the site
// itself may hold only 20 000 files (Cloudflare Pages, free plan); every other book is the site's own public/notes/<book>/
export const NOTES_CDN = 'https://sagandzuri-notes.mr-gabunia.workers.dev';

/** The folder of a book's notes: its JSON files, page pictures and i/ card pictures. */
export const notesBase = (book = 'book') => (/^a\d+$/.test(book) ? `${NOTES_CDN}/${book}/` : `/notes/${book}/`);
