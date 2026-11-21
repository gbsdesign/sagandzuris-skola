import React from 'react';
import { Counter, FOCUS, Press, cx } from '../../../components/ui2';
import { COLOR } from '../../../design/tokens';

// A word written into the grapes of a real bunch on the home vine (2026-11-22; the user sent a photo of a ripe dark bunch:
// „ეს ყურძენი ცადე მთლიანი და ზედ მარცვლებში ჩააწერე“). The bunch is that photo cut out whole (public/home/bunch.png, 360 × 476);
// each letter sits on one of its front grapes, white, row by row. He insists on the letters in the grapes — a name tag under a
// plain bunch was refused. The first bunch („გაკვეთილი“) still opens the letters. A bunch sways; a count and a hop while letters wait.

const W = 360;
const H = 476;

/** where the letters stand on the bunch's front grapes — straight rows, so the word reads at a glance (the picture's pixels) */
const ROW1: [number, number][] = [[105, 96], [195, 96], [285, 96]];
const ROW2: [number, number][] = [[128, 168], [205, 168], [282, 168]];
const SPOTS: Record<number, [number, number][]> = {
  6: [...ROW1, [165, 168], [250, 168], [212, 242]],
  7: [...ROW1, ...ROW2, [212, 242]],
  9: [...ROW1, ...ROW2, [172, 242], [252, 242], [218, 316]],
};

export const LettersBunch: React.FC<{
  word: string;
  /** what a screen reader says (the first bunch opens the letters, whatever is written on it) */
  label?: string;
  unread?: number;
  onOpen: () => void;
  className?: string;
  style?: React.CSSProperties;
}> = ({ word, label = word, unread = 0, onOpen, className, style }) => {
  const letters = [...word];
  const spots = SPOTS[letters.length] ?? SPOTS[9];
  return (
    <div className={cx('vine-sway sg-keep-text absolute -translate-x-1/2', className)} style={style}>
      <Press
        onClick={onOpen}
        aria-label={unread ? `${label}, ${unread} წაუკითხავი` : label}
        className={cx('relative block w-full cursor-pointer rounded-tile transition active:scale-95', unread > 0 && 'sg-bunch-hop', FOCUS)}
      >
        <svg viewBox={`0 -34 ${W} ${H + 34}`} className="block w-full overflow-visible" aria-hidden="true">
          {/* the stalk from the branch to the bunch's shoulder */}
          <path d="M196 -34 C186 -14 206 4 198 26" fill="none" className="sg-bunch-stalk" strokeWidth={11} strokeLinecap="round" />
          <image href="/home/bunch.png" x={0} y={0} width={W} height={H} />
          {letters.slice(0, spots.length).map((ch, i) => (
            <text
              key={i} x={spots[i][0]} y={spots[i][1] + 1} textAnchor="middle" dominantBaseline="central"
              className="sg-grape-letter" fontSize={60} fontWeight={700} fill={COLOR.surf}
            >{ch}</text>
          ))}
        </svg>
        {unread > 0 && <Counter n={unread} className="absolute top-[8%] -right-1.5" />}
      </Press>
    </div>
  );
};
