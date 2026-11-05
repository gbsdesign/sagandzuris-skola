import React from 'react';
import { bookImageUrl, type BookScore } from '../../utils/chantSynth';
import { markerAt, spanAt } from '../../utils/learn';

/** The part's lines cut out of the book's page, one under another; while it sounds a mark stands on the sounding note
 *  (its place read from the picture — `score.nx`; a line not read gets an estimate, so it is a soft band, not a hairline).
 *  `span` (beats): the bit being learned now (a small piece) stays clear and golden-tinted, the rest is veiled.
 *  `marks`: after singing, each of my voice's notes (`voice`, from 0) tinted on its staff — green sung right, red not;
 *  only on lines whose staves were read (`score.ny`). */
export const PartPicture: React.FC<{
  score: BookScore; sys: number[]; beat: number | null; span?: [number, number] | null;
  marks?: { beat: number; ok: boolean }[] | null; voice?: number;
}> = ({ score, sys, beat, span, marks, voice = 0 }) => {
  if (!sys.length) return null;
  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-[#fffdf8] ring-1 ring-[#e8dcc8] p-1.5">
      {sys.map(k => {
        const [ii, x, y, w, h, t0, t1] = score.sys[k];
        const im = score.img[ii];
        if (!im) return null;
        const here = beat != null && beat >= t0 && beat < t1;
        // the piece's stretch of this line, 0–1 of its width (a little room around the notes)
        let lit: [number, number] | null = null;
        if (span) {
          const lo = Math.max(t0, span[0]), hi = Math.min(t1, span[1]);
          if (hi > lo + 1e-6) {
            const [a, b] = spanAt(score, k, lo, hi);
            lit = [a, Math.max(a + 0.04, b)];
          }
        }
        return (
          <div key={k} className="relative w-full overflow-hidden rounded-md" style={{ aspectRatio: `${w * im.w} / ${h * im.h}` }}>
            <img src={bookImageUrl(score, im.src)} alt="" draggable={false}
              className="absolute max-w-none select-none [filter:brightness(.8)_contrast(1.8)]"
              style={{ width: `${100 / w}%`, height: `${100 / h}%`, left: `${(-x / w) * 100}%`, top: `${(-y / h) * 100}%` }} />
            {span && (
              lit ? (
                <>
                  {lit[0] > 0 && <span aria-hidden className="absolute inset-y-0 left-0 bg-[#fffdf8]/65 pointer-events-none" style={{ width: `${lit[0] * 100}%` }} />}
                  <span aria-hidden className="absolute inset-y-0 rounded-md bg-[#c9962a]/12 ring-1 ring-[#c9962a]/45 pointer-events-none"
                    style={{ left: `${lit[0] * 100}%`, width: `${(lit[1] - lit[0]) * 100}%` }} />
                  {lit[1] < 1 && <span aria-hidden className="absolute inset-y-0 right-0 bg-[#fffdf8]/65 pointer-events-none" style={{ width: `${(1 - lit[1]) * 100}%` }} />}
                </>
              ) : <span aria-hidden className="absolute inset-0 bg-[#fffdf8]/65 pointer-events-none" />
            )}
            {marks && score.ny?.[k]?.[voice] && marks.filter(m => m.beat >= t0 - 1e-6 && m.beat < t1 - 1e-6).map(m => {
              const [top, bot] = score.ny![k]![voice];
              const pad = (bot - top) * 0.25;
              return (
                <span key={m.beat} aria-hidden className={`absolute w-2.5 -ml-[5px] rounded-full pointer-events-none ${
                  m.ok ? 'bg-[#2f8a4f]/25 ring-1 ring-[#2f8a4f]/75' : 'bg-[#c0392b]/25 ring-1 ring-[#c0392b]/80'}`}
                  style={{ left: `${markerAt(score, k, m.beat) * 100}%`, top: `${(top - pad) * 100}%`, height: `${(bot - top + 2 * pad) * 100}%` }} />
              );
            })}
            {here && (
              <span aria-hidden className="absolute top-0 bottom-0 w-[14px] -ml-[7px] rounded-full bg-[#7a2028]/15 ring-1 ring-[#7a2028]/30 pointer-events-none transition-[left] duration-150 ease-linear"
                style={{ left: `${markerAt(score, k, beat) * 100}%` }} />
            )}
          </div>
        );
      })}
    </div>
  );
};
