import React from 'react';
import { bookImageUrl, type BookScore } from '../../utils/chantSynth';
import { spanAt } from '../../utils/learn';
import { PartPicture, cutOf } from '../learn/PartPicture';
import { cx } from '../ui2';

// The phrase's words and my notes, cut out of the book: only my voice's staff and the words under it (score.ny), each
// line in two halves (score.nx) — so on a phone the words read at a comfortable size. The bit asked now is lit gold, the
// rest of the phrase faded. A line whose staves were not read shows the book's whole line instead (PartPicture).

/** my voice's band of a line, 0–1 of its height: from a little above my staff to a little above the next one */
const bandOf = (score: BookScore, k: number, vi: number): [number, number] | null => {
  const staves = score.ny?.[k];
  if (!staves || staves.length !== score.voices.length || staves.some(s => !s)) return null;
  const above = (i: number) => Math.max(0, staves[i][0] - (staves[i][1] - staves[i][0]) * 0.3);
  return [vi === 0 ? 0 : above(vi), vi === staves.length - 1 ? 1 : above(vi + 1)];
};

export const VoiceLine: React.FC<{ score: BookScore; sys: number[]; vi: number; span: [number, number] | null }> = ({ score, sys, vi, span }) => {
  if (!sys.length) return null;
  if (sys.some(k => !bandOf(score, k, vi))) {
    return <PartPicture score={score} sys={sys} beat={null} voice={vi} focus split span={span} />;
  }
  return (
    <div className="flex flex-col gap-1.5">
      {sys.flatMap(k => {
        const [ii, x, y, w, h, t0, t1] = score.sys[k];
        const im = score.img[ii];
        const band = bandOf(score, k, vi);
        if (!im || !band) return [];
        const [b0, b1] = band;
        let lit: [number, number] | null = null;
        if (span) {
          const lo = Math.max(t0, span[0]), hi = Math.min(t1, span[1]);
          if (hi > lo + 1e-6) { const [a, b] = spanAt(score, k, lo, hi); lit = [a, Math.max(a + 0.04, b)]; }
        }
        const cut = cutOf(score.nx?.[k]);
        const halves: [number, number][] = cut ? [[0, cut], [cut, 1]] : [[0, 1]];
        const top = y + b0 * h, tall = (b1 - b0) * h;
        return halves.map(([a, b]) => {
          const wide = b - a;
          const clip = (p: number) => Math.max(0, Math.min(1, (p - a) / wide));
          const litHere = lit && lit[1] > a && lit[0] < b ? [clip(lit[0]), clip(lit[1])] : null;
          const dim = span && !litHere;
          return (
            <div key={`${k}-${a}`} className="relative w-full overflow-hidden rounded-chip bg-surf" style={{ aspectRatio: `${w * wide * im.w} / ${tall * im.h}` }}>
              <img src={bookImageUrl(score, im.src)} alt="" draggable={false}
                className={cx('absolute max-w-none select-none [filter:brightness(.8)_contrast(1.8)]', dim && 'opacity-35')}
                style={{ width: `${100 / (w * wide)}%`, height: `${100 / tall}%`, left: `${(-(x + a * w) / (w * wide)) * 100}%`, top: `${(-top / tall) * 100}%` }} />
              {litHere && (
                <>
                  {litHere[0] > 0 && <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 bg-surf/65" style={{ width: `${litHere[0] * 100}%` }} />}
                  <span aria-hidden className="pointer-events-none absolute inset-y-0 rounded-chip bg-gold/10 ring-1 ring-gold/50"
                    style={{ left: `${litHere[0] * 100}%`, width: `${(litHere[1] - litHere[0]) * 100}%` }} />
                  {litHere[1] < 1 && <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 bg-surf/65" style={{ width: `${(1 - litHere[1]) * 100}%` }} />}
                </>
              )}
            </div>
          );
        });
      })}
    </div>
  );
};
