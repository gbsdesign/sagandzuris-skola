// Some book pages set their lines of music side by side (litanies: two short lines in a row). On a phone they
// come out tiny, so such a chant is cut into pieces shown one under another, its lines up to twice as big.
// The cuts are found on the picture itself: between rows a white band across the page; inside a row the first
// white gap after the left line (staff lines leave no white column inside a line), so the next line's number
// stays with its line. Pieces are trimmed to their ink.
import type { BookScore } from './chantSynth';

/** a piece of a page: its box as fractions of the image */
export type Piece = [x0: number, y0: number, x1: number, y1: number];
/** pieces of every page; the width (image pixels) that fills the screen; the column of pieces, as a share of it */
export type Reflow = { pages: Piece[][]; unit: number; col: number };

type Box = { x: number; y: number; w: number; h: number }; // pixels
type Ink = { w: number; h: number; px: Uint8Array };

const MIN_GAIN = 1.15; // not worth reshaping a chant for less
const MAX_GAIN = 2; // nor magnifying the scan more than this
const PAD_X = 8, PAD_Y = 14;

const boxesOn = (score: BookScore, ii: number, w: number, h: number): Box[] =>
  score.sys
    .filter(s => s[0] === ii && s[3] > 0 && s[4] > 0)
    .map(s => ({ x: Math.max(0, s[1]) * w, y: Math.max(0, s[2]) * h, w: s[3] * w, h: s[4] * h }));

// lines whose heights overlap stand in one row; rows top to bottom, lines left to right
const rowsOf = (boxes: Box[]) => {
  const rows: Box[][] = [];
  for (const b of [...boxes].sort((p, q) => p.y - q.y)) {
    const row = rows[rows.length - 1];
    if (row && b.y < Math.max(...row.map(r => r.y + r.h)) - 0.3 * b.h) row.push(b);
    else rows.push([b]);
  }
  rows.forEach(r => r.sort((p, q) => p.x - q.x));
  return rows;
};

/** the chant has a page with lines side by side */
export const needsReflow = (score: BookScore) =>
  score.img.some((im, ii) => rowsOf(boxesOn(score, ii, im.w || 1, im.h || 1)).some(r => r.length > 1));

const loadInk = (src: string) =>
  new Promise<Ink>((resolve, reject) => {
    const im = new Image();
    im.onload = () => {
      const w = im.naturalWidth, h = im.naturalHeight;
      const cv = document.createElement('canvas');
      cv.width = w;
      cv.height = h;
      const cx = cv.getContext('2d', { willReadFrequently: true });
      if (!cx || !w || !h) return reject(new Error('no canvas'));
      cx.drawImage(im, 0, 0);
      const d = cx.getImageData(0, 0, w, h).data;
      const px = new Uint8Array(w * h);
      for (let i = 0, j = 0; j < px.length; i += 4, j++) px[j] = d[i + 3] > 128 && d[i] + d[i + 1] + d[i + 2] < 480 ? 1 : 0;
      resolve({ w, h, px });
    };
    im.onerror = () => reject(new Error(`image ${src}`));
    im.crossOrigin = 'anonymous'; // the anthology's pictures come from its own address (notesBase): read with its consent
    im.src = src;
  });

const cutPage = ({ w, h, px }: Ink, rows: Box[][]): Piece[] => {
  const rowInk = (y: number, x0: number, x1: number) => {
    let n = 0;
    for (let x = x0, o = y * w; x < x1; x++) n += px[o + x];
    return n;
  };
  const colInk = (x: number, y0: number, y1: number) => {
    let n = 0;
    for (let y = y0; y < y1; y++) n += px[y * w + x];
    return n;
  };
  const clampY = (y: number) => Math.max(0, Math.min(h, Math.round(y)));
  // the middle of the longest white band across the page between a and b
  const whiteRow = (a: number, b: number) => {
    let best = -1, bestLen = 0, run = 0;
    for (let y = clampY(a); y < clampY(b); y++) {
      run = rowInk(y, 0, w) ? 0 : run + 1;
      if (run > bestLen) { bestLen = run; best = y - Math.floor(run / 2); }
    }
    return best;
  };
  const top = (r: Box[]) => Math.min(...r.map(b => b.y));
  const bottom = (r: Box[]) => Math.max(...r.map(b => b.y + b.h));
  // the span of the ink along one axis (count[i] = ink across it); specks standing apart are left out
  const span = (count: Int32Array) => {
    const runs: [number, number, number][] = []; // start, end, ink
    for (let i = 0; i < count.length; i++) {
      if (!count[i]) continue;
      const r = runs[runs.length - 1];
      if (r && i - r[1] <= 24) { r[1] = i; r[2] += count[i]; } else runs.push([i, i, count[i]]);
    }
    const total = runs.reduce((n, r) => n + r[2], 0);
    const kept = runs.filter(r => r[2] >= Math.max(40, total * 0.01));
    return kept.length ? [kept[0][0], kept[kept.length - 1][1]] : null;
  };
  // the box of the ink inside a region, with a margin; null when empty
  const trim = (x0: number, y0: number, x1: number, y1: number): Piece | null => {
    const cols = new Int32Array(x1 - x0), rws = new Int32Array(y1 - y0);
    for (let y = y0; y < y1; y++) {
      for (let x = x0, o = y * w; x < x1; x++) {
        if (px[o + x]) { cols[x - x0]++; rws[y - y0]++; }
      }
    }
    const sx = span(cols), sy = span(rws);
    if (!sx || !sy) return null;
    return [Math.max(x0, x0 + sx[0] - PAD_X) / w, Math.max(y0, y0 + sy[0] - PAD_Y) / h, Math.min(x1, x0 + sx[1] + 1 + PAD_X) / w, Math.min(y1, y0 + sy[1] + 1 + PAD_Y) / h];
  };

  // horizontal cuts: a title above the first row, between rows, a note under the last row
  type Band = { y0: number; y1: number; row: Box[] | null };
  const bands: Band[] = [];
  let y = 0;
  rows.forEach((row, i) => {
    let cut = -1;
    if (i === 0) {
      const c = whiteRow(top(row) - 0.04 * h, top(row) + 0.01 * h);
      if (c > 0 && trim(0, 0, w, c)) cut = c;
    } else {
      const a = Math.min(bottom(rows[i - 1]), top(row)), b = Math.max(bottom(rows[i - 1]), top(row));
      cut = whiteRow(a - 0.02 * h, b + 0.01 * h);
      if (cut < 0) cut = clampY((bottom(rows[i - 1]) + top(row)) / 2);
    }
    if (cut > y) {
      bands.push({ y0: y, y1: cut, row: i === 0 ? null : rows[i - 1] });
      y = cut;
    }
  });
  const last = rows[rows.length - 1];
  const tail = whiteRow(bottom(last) - 0.01 * h, bottom(last) + 0.04 * h);
  if (tail > y && tail < h && trim(0, tail, w, h)) {
    bands.push({ y0: y, y1: tail, row: last }, { y0: tail, y1: h, row: null });
  } else bands.push({ y0: y, y1: h, row: last });

  // one line in a band: kept whole, together with its whole neighbours; lines side by side: one piece each
  const pieces: Piece[] = [];
  let run = null as Band | null;
  const flush = () => {
    const p = run && trim(0, run.y0, w, run.y1);
    if (p) pieces.push(p);
    run = null;
  };
  for (const band of bands) {
    if (!band.row || band.row.length < 2) {
      run = run ? { ...run, y1: band.y1 } : band;
      continue;
    }
    flush();
    const row = band.row;
    const ya = Math.max(band.y0, Math.round(top(row) - 0.02 * h)), yb = Math.min(band.y1, Math.round(bottom(row) + 0.02 * h));
    const xs = [0];
    for (let i = 0; i < row.length - 1; i++) {
      const A = row[i], B = row[i + 1];
      const from = Math.max(xs[xs.length - 1] + 1, Math.round(A.x + A.w * 0.5)), to = Math.min(w, Math.round(Math.max(B.x, A.x + A.w) + 0.03 * w));
      let split = -1;
      for (let x = from; x < to; x++) {
        if (colInk(x, ya, yb)) continue;
        let e = x;
        while (e + 1 < to && !colInk(e + 1, ya, yb)) e++;
        split = Math.round((x + e) / 2);
        break;
      }
      xs.push(split > 0 ? split : Math.round((A.x + A.w + B.x) / 2));
    }
    xs.push(w);
    for (let i = 0; i < row.length; i++) {
      const p = trim(xs[i], band.y0, xs[i + 1], band.y1);
      if (p) pieces.push(p);
    }
  }
  flush();
  return pieces;
};

const cache = new Map<string, Promise<Reflow | null>>();
/** the pieces of a chant whose lines stand side by side; null when it is shown as the book has it */
export const reflowScore = (score: BookScore, url: (src: string) => string): Promise<Reflow | null> => {
  if (!needsReflow(score)) return Promise.resolve(null);
  const key = score.base + score.nums[0];
  let p = cache.get(key);
  if (!p) {
    p = Promise.all(score.img.map(im => loadInk(url(im.src))))
      .then(inks => {
        const pages = inks.map((ink, ii) => cutPage(ink, rowsOf(boxesOn(score, ii, ink.w, ink.h))));
        const pageW = Math.max(...inks.map(i => i.w));
        // the widest piece with a line of music fills the screen; a wider title is shown smaller
        const holdsLine = (q: Piece, ii: number) => score.sys.some(s => s[0] === ii && s[3] > 0 && s[4] > 0 && q[0] <= s[1] + s[3] / 2 && s[1] + s[3] / 2 < q[2] && q[1] <= s[2] + s[4] / 2 && s[2] + s[4] / 2 < q[3]);
        const widest = Math.max(0, ...pages.flatMap((ps, ii) => ps.filter(q => holdsLine(q, ii)).map(q => (q[2] - q[0]) * inks[ii].w)));
        if (!widest || !pages.every(ps => ps.length) || pageW / widest < MIN_GAIN) return null;
        const unit = Math.max(widest, pageW / MAX_GAIN);
        const col = Math.min(1, Math.max(...pages.flatMap((ps, ii) => ps.map(q => (q[2] - q[0]) * inks[ii].w))) / unit);
        return { pages, unit, col };
      })
      .catch(() => null);
    cache.set(key, p);
  }
  return p;
};
