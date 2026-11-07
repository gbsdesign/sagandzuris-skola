import React from 'react';
import { Maximize2 } from 'lucide-react';
import { bookImageUrl, type BookScore } from '../../utils/chantSynth';
import { markerAt, spanAt } from '../../utils/learn';

/** The other voices' bands of a line, 0–1 of its height, for `focus` (my voice, from 0): each voice's band runs from a little
 *  above its staff to a little above the next one's, so its words under the staff go with it. Null when the line's staves
 *  were not read (`score.ny`) or there is only one voice. */
export const otherBands = (score: BookScore, k: number, focus: number): [number, number][] | null => {
  const staves = score.ny?.[k];
  if (!staves || staves.length < 2 || staves.length !== score.voices.length || staves.some(s => !s)) return null;
  const above = (i: number) => Math.max(0, staves[i][0] - (staves[i][1] - staves[i][0]) * 0.3);
  return staves.flatMap((_, i): [number, number][] => (i === focus ? [] : [[i === 0 ? 0 : above(i), i === staves.length - 1 ? 1 : above(i + 1)]]));
};

/** Where to halve a line (0–1 of its width): between the two notes whose gap is nearest the middle. Null for a line whose
 *  note places were not read, or one too short to halve. */
export const cutOf = (xs: number[] | null | undefined): number | null => {
  if (!xs || xs.length < 4) return null;
  let best: number | null = null;
  for (let i = 0; i + 1 < xs.length; i++) {
    const mid = (xs[i] + xs[i + 1]) / 2;
    if (mid >= 0.3 && mid <= 0.7 && (best == null || Math.abs(mid - 0.5) < Math.abs(best - 0.5))) best = mid;
  }
  return best;
};

/** The part's lines cut out of the book's page, one under another; while it sounds a mark stands on the sounding note
 *  (its place read from the picture — `score.nx`; a line not read gets an estimate, so it is a soft band, not a hairline).
 *  `span` (beats): the bit being learned now (a small piece) stays clear and golden-tinted, the rest is veiled.
 *  `marks`: after singing, each of my voice's notes (`voice`, from 0) tinted on its staff — green sung right, red not;
 *  only on lines whose staves were read (`score.ny`).
 *  `focus`: my voice stays clear and the other voices' staves are softly veiled (2026-11-07, the user's pick „ოდნავ მკრთალად“).
 *  `onOpen`: a tap on the picture (or its ⤢) opens it big. */
export const PartPicture: React.FC<{
  score: BookScore; sys: number[]; beat: number | null; span?: [number, number] | null;
  marks?: { beat: number; ok: boolean }[] | null; voice?: number; focus?: boolean; onOpen?: () => void; split?: boolean;
}> = ({ score, sys, beat, span, marks, voice = 0, focus, onOpen, split }) => {
  if (!sys.length) return null;
  return (
    <div className={`relative flex flex-col gap-1.5 rounded-xl bg-[#fffdf8] ring-1 ring-[#e8dcc8] p-1.5 ${onOpen ? 'cursor-zoom-in' : ''}`}
      onClick={onOpen}>
      {sys.flatMap(k => {
        const [ii, x, y, w, h, t0, t1] = score.sys[k];
        const im = score.img[ii];
        if (!im) return [];
        const here = beat != null && beat >= t0 && beat < t1 ? markerAt(score, k, beat) : null;
        // the piece's stretch of this line, 0–1 of its width (a little room around the notes)
        let lit: [number, number] | null = null;
        if (span) {
          const lo = Math.max(t0, span[0]), hi = Math.min(t1, span[1]);
          if (hi > lo + 1e-6) {
            const [a, b] = spanAt(score, k, lo, hi);
            lit = [a, Math.max(a + 0.04, b)];
          }
        }
        const others = focus ? otherBands(score, k, voice) : null;
        const mine = marks && score.ny?.[k]?.[voice]
          ? marks.filter(m => m.beat >= t0 - 1e-6 && m.beat < t1 - 1e-6).map(m => ({ ...m, at: markerAt(score, k, m.beat) }))
          : [];
        // `split`: the line in two halves under each other, cut between two notes near its middle — twice as big on a narrow screen
        const cut = split ? cutOf(score.nx?.[k]) : null;
        const pieces: [number, number][] = cut ? [[0, cut], [cut, 1]] : [[0, 1]];
        return pieces.map(([a, b]) => {
          const wide = b - a;
          // a place on the line (0–1 of its width) → on this piece, or null when it is not on it
          const on = (p: number) => (p >= a - 1e-6 && p < b + (b === 1 ? 1e-6 : -1e-6) ? (p - a) / wide : null);
          const clip = (p: number) => Math.max(0, Math.min(1, (p - a) / wide));
          const litHere = lit && lit[1] > a && lit[0] < b ? [clip(lit[0]), clip(lit[1])] : null;
          const mark = here != null ? on(here) : null;
          return (
            <div key={`${k}-${a}`} className="relative w-full overflow-hidden rounded-md" style={{ aspectRatio: `${w * wide * im.w} / ${h * im.h}` }}>
              <img src={bookImageUrl(score, im.src)} alt="" draggable={false}
                className="absolute max-w-none select-none [filter:brightness(.8)_contrast(1.8)]"
                style={{ width: `${100 / (w * wide)}%`, height: `${100 / h}%`, left: `${(-(x + a * w) / (w * wide)) * 100}%`, top: `${(-y / h) * 100}%` }} />
              {others?.map(([top, bot]) => (
                <span key={top} aria-hidden className="absolute inset-x-0 bg-[#fffdf8]/55 pointer-events-none"
                  style={{ top: `${top * 100}%`, height: `${(bot - top) * 100}%` }} />
              ))}
              {span && (
                litHere ? (
                  <>
                    {litHere[0] > 0 && <span aria-hidden className="absolute inset-y-0 left-0 bg-[#fffdf8]/65 pointer-events-none" style={{ width: `${litHere[0] * 100}%` }} />}
                    <span aria-hidden className="absolute inset-y-0 rounded-md bg-[#c9962a]/12 ring-1 ring-[#c9962a]/45 pointer-events-none"
                      style={{ left: `${litHere[0] * 100}%`, width: `${(litHere[1] - litHere[0]) * 100}%` }} />
                    {litHere[1] < 1 && <span aria-hidden className="absolute inset-y-0 right-0 bg-[#fffdf8]/65 pointer-events-none" style={{ width: `${(1 - litHere[1]) * 100}%` }} />}
                  </>
                ) : <span aria-hidden className="absolute inset-0 bg-[#fffdf8]/65 pointer-events-none" />
              )}
              {mine.map(m => {
                const left = on(m.at);
                if (left == null) return null;
                const [top, bot] = score.ny![k]![voice];
                const pad = (bot - top) * 0.25;
                return (
                  <span key={m.beat} aria-hidden className={`absolute w-2.5 -ml-[5px] rounded-full pointer-events-none ${
                    m.ok ? 'bg-[#2f8a4f]/25 ring-1 ring-[#2f8a4f]/75' : 'bg-[#c0392b]/25 ring-1 ring-[#c0392b]/80'}`}
                    style={{ left: `${left * 100}%`, top: `${(top - pad) * 100}%`, height: `${(bot - top + 2 * pad) * 100}%` }} />
                );
              })}
              {mark != null && (
                <span aria-hidden className="absolute top-0 bottom-0 w-[14px] -ml-[7px] rounded-full bg-[#7a2028]/15 ring-1 ring-[#7a2028]/30 pointer-events-none transition-[left] duration-150 ease-linear"
                  style={{ left: `${mark * 100}%` }} />
              )}
            </div>
          );
        });
      })}
      {onOpen && (
        <button type="button" onClick={e => { e.stopPropagation(); onOpen(); }} aria-label="ნოტები დიდად" title="ნოტები დიდად"
          className="absolute -top-2 -right-2 w-9 h-9 rounded-full bg-white ring-1 ring-[#e8dcc8] shadow-sm grid place-items-center text-[#574739] hover:ring-[#7a2028]/40 cursor-pointer">
          <Maximize2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
