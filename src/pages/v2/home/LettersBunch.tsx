import React from 'react';
import { Counter, FOCUS, Press, cx } from '../../../components/ui2';
import { COLOR } from '../../../design/tokens';

// „წერილები“ as a grape bunch on the home vine (2026-11-21, the user: „სიტყვა წერილები მარცვლებში ჩაწერე ასო ასო და გააცოცხლე
// მტევანი … რამდენი მარცვალიც იქნება საჭირო იმდენი დაამატე“; picks: only „წერილები“, it sways and the letters shine in turn).
// It hangs where the picture's own bunch hung (that bunch was taken out of public/home/vine.png): eight grapes 3 · 2 · 2 · 1,
// one letter each, read row by row. A tap = the bottom menu's old „წერილები“ (a student with one teacher — the teacher's chat,
// everyone else the list). New letters: the bunch hops now and then and a red number sits on it. Later that night, after many
// other tries, the user asked for this very bunch back, „ოდნავ სადა“: a touch less gloss and a gentler lighting-up — nothing else.

// Since 2026-11-22 the vine's four bunches are all this bunch (the user: „ზემოთ 4 მტევანი იყო … ისინიც ასე ქენი … გალობა სიმღერა
// ლოცვანი გაკვეთილი … პირველი მტევნიდან დაიწყე, მარცხნიდან“): any word, a grape a letter — 3 · 2 · 1 for six letters,
// 3 · 2 · 2 for seven, 3 · 2 · 2 · 1 for eight, 3 · 3 · 2 · 1 for nine. The right one says „გაკვეთილი“ and still opens the letters.

const ROWS: Record<number, number[]> = { 6: [3, 2, 1], 7: [3, 2, 2], 8: [3, 2, 2, 1], 9: [3, 3, 2, 1] };
const XS: Record<number, number[]> = { 1: [50], 2: [34, 66], 3: [18, 50, 82] };

/** the grapes' centres in the drawing's units (100 wide; the stem's top at 0) */
const grapesOf = (n: number): [number, number][] =>
  (ROWS[n] ?? ROWS[9]).flatMap((count, r) => XS[count].map((x, i): [number, number] => [x + (count === 2 && r % 2 === 0 ? 1 : 0), 30 + r * 26 - (count === 3 && i === 1 ? 2 : 0)]));

const R = 16.5;

export const LettersBunch: React.FC<{
  word: string;
  /** what a screen reader says (the right bunch opens the letters, whatever is written on it) */
  label?: string;
  unread?: number;
  onOpen: () => void;
  className?: string;
  style?: React.CSSProperties;
}> = ({ word, label = word, unread = 0, onOpen, className, style }) => {
  const letters = [...word];
  const grapes = grapesOf(letters.length);
  const h = grapes[grapes.length - 1][1] + R + 1;
  return (
  <div className={cx('vine-sway sg-keep-text absolute -translate-x-1/2', className)} style={style}>
    <Press
      onClick={onOpen}
      aria-label={unread ? `${label}, ${unread} წაუკითხავი` : label}
      className={cx('relative block w-full cursor-pointer rounded-full transition active:scale-95', unread > 0 && 'sg-bunch-hop', FOCUS)}
    >
      <svg viewBox={`0 0 100 ${h}`} className="block w-full overflow-visible" aria-hidden="true">
        <defs>
          <radialGradient id="sg-grape" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor={COLOR.blush} stopOpacity={0.7} />
            <stop offset="50%" stopColor={COLOR.wine} />
            <stop offset="100%" stopColor={COLOR.wineDeep} />
          </radialGradient>
        </defs>
        {/* the stem from the branch, and a little curl of tendril */}
        <path d="M50 -6 C50 4 49 10 50 16" fill="none" stroke={COLOR.mut} strokeWidth={5} strokeLinecap="round" />
        <path d="M51 4 C60 0 66 6 61 11 C58 14 54 11 57 8" fill="none" stroke={COLOR.mut} strokeWidth={1.6} strokeLinecap="round" />
        {grapes.map(([x, y], i) => (
          <g key={i} className="sg-grape" style={{ animationDelay: `${i * 0.42}s` }}>
            <circle cx={x} cy={y} r={R} fill="url(#sg-grape)" fillOpacity={0.88} stroke={COLOR.wineDeep} strokeWidth={1.1} />
            <ellipse cx={x - 6} cy={y - 7} rx={3.6} ry={2.2} fill={COLOR.surf} opacity={0.17} />
            <text
              x={x} y={y + 0.5} textAnchor="middle" dominantBaseline="central"
              className="sg-grape-letter" fontSize={18} fontWeight={700} fill={COLOR.surf}
            >{letters[i]}</text>
          </g>
        ))}
      </svg>
      {unread > 0 && <Counter n={unread} className="absolute top-[8%] -right-1.5" />}
    </Press>
  </div>
);
};
