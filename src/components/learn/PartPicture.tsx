import React from 'react';
import { bookImageUrl, type BookScore } from '../../utils/chantSynth';
import { markerAt } from '../../utils/learn';

/** The part's lines cut out of the book's page, one under another; while it sounds a mark runs over the notes (its place
 *  on the line is estimated — the page has no note positions — so it is a soft band, not a hairline). */
export const PartPicture: React.FC<{ score: BookScore; sys: number[]; beat: number | null }> = ({ score, sys, beat }) => {
  if (!sys.length) return null;
  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-[#fffdf8] ring-1 ring-[#e8dcc8] p-1.5">
      {sys.map(k => {
        const [ii, x, y, w, h, t0, t1] = score.sys[k];
        const im = score.img[ii];
        if (!im) return null;
        const here = beat != null && beat >= t0 && beat < t1;
        return (
          <div key={k} className="relative w-full overflow-hidden rounded-md" style={{ aspectRatio: `${w * im.w} / ${h * im.h}` }}>
            <img src={bookImageUrl(score, im.src)} alt="" draggable={false}
              className="absolute max-w-none select-none [filter:brightness(.8)_contrast(1.8)]"
              style={{ width: `${100 / w}%`, height: `${100 / h}%`, left: `${(-x / w) * 100}%`, top: `${(-y / h) * 100}%` }} />
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
