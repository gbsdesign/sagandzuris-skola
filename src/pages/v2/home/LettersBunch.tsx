import React from 'react';
import { Counter, FOCUS, Press, cx } from '../../../components/ui2';
import { COLOR } from '../../../design/tokens';

// „წერილები“ as a grape bunch on the home vine (2026-11-21, the user: „სიტყვა წერილები მარცვლებში ჩაწერე ასო ასო და გააცოცხლე
// მტევანი … რამდენი მარცვალიც იქნება საჭირო იმდენი დაამატე“; picks: only „წერილები“, it sways and the letters shine in turn).
// It hangs where the picture's own bunch hung (that bunch was taken out of public/home/vine.png): eight grapes 3 · 2 · 2 · 1,
// one letter each, read row by row. A tap = the bottom menu's old „წერილები“ (a student with one teacher — the teacher's chat,
// everyone else the list). New letters: the bunch hops now and then and a red number sits on it.

const WORD = ['წ', 'ე', 'რ', 'ი', 'ლ', 'ე', 'ბ', 'ი'];

/** the grapes' centres in the drawing's units (viewBox 100 × 124; the stem's top at 0) */
const GRAPES: [number, number][] = [
  [18, 30], [50, 28], [82, 30],
  [34, 56], [66, 56],
  [35, 82], [65, 82],
  [50, 107],
];

const R = 16.5;

export const LettersBunch: React.FC<{ unread: number; onOpen: () => void; className?: string; style?: React.CSSProperties }> = ({
  unread, onOpen, className, style,
}) => (
  <div className={cx('vine-sway sg-keep-text absolute -translate-x-1/2', className)} style={style}>
    <Press
      onClick={onOpen}
      aria-label={unread ? `წერილები, ${unread} წაუკითხავი` : 'წერილები'}
      className={cx('relative block w-full cursor-pointer rounded-full transition active:scale-95', unread > 0 && 'sg-bunch-hop', FOCUS)}
    >
      <svg viewBox="0 0 100 124" className="block w-full overflow-visible" aria-hidden="true">
        <defs>
          <radialGradient id="sg-grape" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor={COLOR.blush} />
            <stop offset="50%" stopColor={COLOR.wine} />
            <stop offset="100%" stopColor={COLOR.wineDeep} />
          </radialGradient>
        </defs>
        {/* the stem from the branch, and a little curl of tendril */}
        <path d="M50 -6 C50 4 49 10 50 16" fill="none" stroke={COLOR.mut} strokeWidth={5} strokeLinecap="round" />
        <path d="M51 4 C60 0 66 6 61 11 C58 14 54 11 57 8" fill="none" stroke={COLOR.mut} strokeWidth={1.6} strokeLinecap="round" />
        {GRAPES.map(([x, y], i) => (
          <g key={i} className="sg-grape" style={{ animationDelay: `${i * 0.42}s` }}>
            <circle cx={x} cy={y} r={R} fill="url(#sg-grape)" fillOpacity={0.88} stroke={COLOR.wineDeep} strokeWidth={1.1} />
            <ellipse cx={x - 6} cy={y - 7} rx={4.2} ry={2.6} fill={COLOR.surf} opacity={0.28} />
            <text
              x={x} y={y + 0.5} textAnchor="middle" dominantBaseline="central"
              className="sg-grape-letter" fontSize={18} fontWeight={700} fill={COLOR.surf}
            >{WORD[i]}</text>
          </g>
        ))}
      </svg>
      {unread > 0 && <Counter n={unread} className="absolute top-[8%] -right-1.5" />}
    </Press>
  </div>
);
