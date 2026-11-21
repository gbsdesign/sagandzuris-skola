import React from 'react';
import { Counter, FOCUS, Press, cx } from '../../../components/ui2';
import { COLOR } from '../../../design/tokens';

// A word written into a grape bunch on the home vine, one letter a grape (2026-11-21, the user's idea: „სიტყვა მარცვლებში ჩაწერე
// ასო ასო და გააცოცხლე მტევანი … რამდენი მარცვალიც იქნება საჭირო იმდენი დაამატე“ — he insists on the letters in the grapes; a name
// tag under a plain bunch was refused). The grapes are painted after the photo he showed: a ripe amber-green bunch, soft light,
// dark letters. The same night he asked for the vine's other bunches the same way — „გალობა“, „სიმღერა“, „ლოცვანი“ — and for the
// first one („გაკვეთილი“, which still opens the letters) to shine a little (`shiny`). All the picture's own bunches were taken
// out of public/home/vine.png. A bunch sways, its grapes light up in turn; a count and a hop while letters wait.

const R = 16.5;

/** how many grapes a row: 3 · 2 · 1 for six letters, 3 · 3 · 1 for seven, 3 · 3 · 2 · 1 for nine */
const rowsOf = (n: number): number[] => {
  const rows: number[] = [];
  let left = n;
  while (left > 3) {
    // the last rows taper: … 2 · 1 when three are left over after the threes, otherwise the rest
    if (left === 6 || left === 5) { rows.push(3); left -= 3; continue; }
    if (left === 4) { rows.push(3); left -= 3; continue; }
    rows.push(3); left -= 3;
  }
  if (left === 3 && rows.length > 0) rows.push(2, 1);
  else if (left > 0) rows.push(left);
  return rows;
};

const XS: Record<number, number[]> = { 1: [50], 2: [35, 65], 3: [18, 50, 82] };

/** the grapes' centres in the drawing's units (100 wide; the stem's top at 0) */
const grapesOf = (n: number): [number, number][] =>
  rowsOf(n).flatMap((count, r) => XS[count].map((x, i): [number, number] => [x, 30 + r * 26.5 - (count === 3 && i === 1 ? 2 : 0)]));

export const LettersBunch: React.FC<{
  word: string;
  /** what a screen reader says (the first bunch opens the letters, whatever is written on it) */
  label?: string;
  /** a little more gloss on the grapes */
  shiny?: boolean;
  unread?: number;
  onOpen: () => void;
  className?: string;
  style?: React.CSSProperties;
}> = ({ word, label = word, shiny, unread = 0, onOpen, className, style }) => {
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
            {/* a real grape's skin (the colours are in index.css): light falls from the upper left, the rim goes darker */}
            <radialGradient id="sg-grape" cx="36%" cy="30%" r="78%">
              <stop offset="0%" className="sg-grape-lit" />
              <stop offset="42%" className="sg-grape-skin" />
              <stop offset="100%" className="sg-grape-rim" />
            </radialGradient>
            {/* the bloom: the dusty blush on a ripe grape, strongest below */}
            <linearGradient id="sg-grape-bloom" x1="0" y1="0" x2="0" y2="1">
              <stop offset="35%" className="sg-grape-dust" stopOpacity={0} />
              <stop offset="100%" className="sg-grape-dust" stopOpacity={0.3} />
            </linearGradient>
          </defs>
          {/* the stem from the branch, and a little curl of tendril */}
          <path d="M50 -6 C50 4 49 10 50 16" fill="none" stroke={COLOR.mut} strokeWidth={5} strokeLinecap="round" />
          <path d="M51 4 C60 0 66 6 61 11 C58 14 54 11 57 8" fill="none" stroke={COLOR.mut} strokeWidth={1.6} strokeLinecap="round" />
          {grapes.map(([x, y], i) => (
            <g key={i} className="sg-grape" style={{ animationDelay: `${i * 0.42}s` }}>
              <circle cx={x} cy={y} r={R} fill="url(#sg-grape)" className="sg-grape-edge" strokeWidth={0.8} />
              <circle cx={x} cy={y} r={R} fill="url(#sg-grape-bloom)" />
              <ellipse cx={x - 6.5} cy={y - 8} rx={shiny ? 4.6 : 3.4} ry={shiny ? 2.7 : 2} fill={COLOR.surf} opacity={shiny ? 0.9 : 0.55} transform={`rotate(-30 ${x - 6.5} ${y - 8})`} />
              {shiny && <circle cx={x + 7.5} cy={y + 8.5} r={1.5} fill={COLOR.surf} opacity={0.6} />}
              <text
                x={x} y={y + 0.5} textAnchor="middle" dominantBaseline="central"
                className="sg-grape-letter" fontSize={18} fontWeight={700}
              >{letters[i]}</text>
            </g>
          ))}
        </svg>
        {unread > 0 && <Counter n={unread} className="absolute top-[8%] -right-1.5" />}
      </Press>
    </div>
  );
};
