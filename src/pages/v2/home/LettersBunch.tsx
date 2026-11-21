import React from 'react';
import { Counter, FOCUS, Press, cx } from '../../../components/ui2';
import { COLOR } from '../../../design/tokens';

// „წერილები“ as a grape bunch on the home vine (2026-11-21, the user: „სიტყვა წერილები მარცვლებში ჩაწერე ასო ასო და გააცოცხლე
// მტევანი … რამდენი მარცვალიც იქნება საჭირო იმდენი დაამატე“; picks: only „წერილები“, it sways and the letters shine in turn).
// It hangs where the picture's own bunch hung (that bunch was taken out of public/home/vine.png): eight grapes 3 · 2 · 2 · 1,
// one letter each, read row by row. The grapes are painted as real ones (the user, the same night: „ნამდვილი მარცვლების ფერი და
// ეფექტი მიეცი, როგორც ყურძენია“): a dark ripe skin, soft light, a dusty bloom — not red glass balls. A tap = the bottom menu's old „წერილები“ (a student with one teacher — the teacher's chat,
// everyone else the list). New letters: the bunch hops now and then and a red number sits on it.

// The word on it is „გაკვეთილი“ since the same night (the user: „დააწერე გაკვეთილი, მარა გახსნით რაც იხსნება ის დატოვე“): nine grapes
// 3 · 3 · 2 · 1; the tap still opens the letters. The grapes are painted after the photo he showed — a ripe amber-green bunch.
const WORD = ['გ', 'ა', 'კ', 'ვ', 'ე', 'თ', 'ი', 'ლ', 'ი'];

/** the grapes' centres in the drawing's units (viewBox 100 × 124; the stem's top at 0) */
const GRAPES: [number, number][] = [
  [18, 30], [50, 28], [82, 30],
  [19, 57], [50, 56], [81, 57],
  [35, 83], [65, 83],
  [50, 108],
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
          {/* a real grape's skin (the colours are in index.css): light falls from the upper left, the rim goes dark */}
          <radialGradient id="sg-grape" cx="36%" cy="30%" r="78%">
            <stop offset="0%" className="sg-grape-lit" />
            <stop offset="42%" className="sg-grape-skin" />
            <stop offset="100%" className="sg-grape-rim" />
          </radialGradient>
          {/* the bloom: the pale dusty film on a ripe grape, strongest below */}
          <linearGradient id="sg-grape-bloom" x1="0" y1="0" x2="0" y2="1">
            <stop offset="35%" className="sg-grape-dust" stopOpacity={0} />
            <stop offset="100%" className="sg-grape-dust" stopOpacity={0.3} />
          </linearGradient>
        </defs>
        {/* the stem from the branch, and a little curl of tendril */}
        <path d="M50 -6 C50 4 49 10 50 16" fill="none" stroke={COLOR.mut} strokeWidth={5} strokeLinecap="round" />
        <path d="M51 4 C60 0 66 6 61 11 C58 14 54 11 57 8" fill="none" stroke={COLOR.mut} strokeWidth={1.6} strokeLinecap="round" />
        {GRAPES.map(([x, y], i) => (
          <g key={i} className="sg-grape" style={{ animationDelay: `${i * 0.42}s` }}>
            <circle cx={x} cy={y} r={R} fill="url(#sg-grape)" className="sg-grape-edge" strokeWidth={0.8} />
            <circle cx={x} cy={y} r={R} fill="url(#sg-grape-bloom)" />
            <ellipse cx={x - 6.5} cy={y - 8} rx={3.4} ry={2} fill={COLOR.surf} opacity={0.55} transform={`rotate(-30 ${x - 6.5} ${y - 8})`} />
            <text
              x={x} y={y + 0.5} textAnchor="middle" dominantBaseline="central"
              className="sg-grape-letter" fontSize={18} fontWeight={700}
            >{WORD[i]}</text>
          </g>
        ))}
      </svg>
      {unread > 0 && <Counter n={unread} className="absolute top-[8%] -right-1.5" />}
    </Press>
  </div>
);
