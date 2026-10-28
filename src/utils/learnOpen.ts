// „Open this piece straight in its learning mode“ (the home page's review line): the notes page or the song page takes
// the request once the piece is on screen. One request at a time.

let pending: string | null = null;

export const requestLearn = (piece: string) => { pending = piece; };

/** True once, for the page showing the requested piece. */
export const takeLearn = (piece: string) => {
  if (pending !== piece) return false;
  pending = null;
  return true;
};
