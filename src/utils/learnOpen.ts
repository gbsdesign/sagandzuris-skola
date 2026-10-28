import type { Voice } from './pathItems';

// „Open this piece straight in its learning mode“ (the home page's review line, a teacher's assignment): the notes page
// or the song page takes the request once the piece is on screen, with the voice to start on. One request at a time.

let pending: { piece: string; voice?: Voice } | null = null;

export const requestLearn = (piece: string, voice?: Voice) => { pending = { piece, voice }; };

/** The request, once, for the page showing the requested piece; null otherwise. */
export const takeLearn = (piece: string): { voice?: Voice } | null => {
  if (pending?.piece !== piece) return null;
  const { voice } = pending;
  pending = null;
  return { voice };
};
