import React from 'react';
import { Counter, FOCUS, Press, cx } from '../../../components/ui2';
import { COLOR } from '../../../design/tokens';

// A word written into a grape bunch on the home vine, one letter a grape (2026-11-21, the user's idea: „სიტყვა მარცვლებში ჩაწერე
// ასო ასო და გააცოცხლე მტევანი … რამდენი მარცვალიც იქნება საჭირო იმდენი დაამატე“ — he insists on the letters in the grapes; a name
// tag under a plain bunch was refused). The grapes are painted after the photo he showed: a ripe amber-green bunch, soft light,
// dark letters. The same night he asked for the vine's other bunches the same way — „გალობა“, „სიმღერა“, „ლოცვანი“ — and for the
// first one („გაკვეთილი“, which still opens the letters) to shine a little (`shiny`). All the picture's own bunches were taken
// out of public/home/vine.png. A bunch sways, its grapes light up in turn; a count and a hop while letters wait.

const R = 16;

/** how many grapes a row: 3 · 2 · 1 for six letters, 3 · 3 · 1 for seven, 3 · 3 · 2 · 1 for nine */
const rowsOf = (n: number): number[] => {
  const rows: number[] = [];
  let left = n;
  while (left > 3) { rows.push(3); left -= 3; }
  if (left === 3 && rows.length > 0) rows.push(2, 1);
  else if (left > 0) rows.push(left);
  return rows;
};

const XS: Record<number, number[]> = { 1: [50], 2: [35, 65], 3: [19, 50, 81] };

/** a steady „chance“ for the i-th grape of a word (0…1): the same bunch is drawn the same way every time */
const chance = (seed: number, i: number, salt: number) => {
  const v = Math.sin(seed * 12.9898 + i * 78.233 + salt * 37.719) * 43758.5453;
  return v - Math.floor(v);
};

interface Grape { x: number; y: number; r: number; tone: number; letter?: string; speck?: boolean }

/** A bunch as it grows (the user: „არაბუნებრივად არის მტევნები … დახვეწე, გაალამაზე, მაოკოხტავე“): the lettered grapes row by row,
    none quite like its neighbour — a little off its place, a little bigger or smaller, smaller towards the tip, each of its own
    ripeness — and small plain grapes behind them that fill the shoulders, the sides and the tip. In the drawing's units (100 wide). */
const bunchOf = (word: string) => {
  const letters = [...word];
  const seed = letters.reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const rows = rowsOf(letters.length);
  const front: Grape[] = [];
  const back: Grape[] = [];
  let i = 0;
  rows.forEach((count, row) => {
    const y = 31 + row * 25.5;
    // towards the tip the grapes are a little smaller
    const size = R * (1 - row * 0.025);
    XS[count].forEach((x, col) => {
      front.push({
        x: x + (chance(seed, i, 1) - 0.5) * 3,
        y: y + (chance(seed, i, 2) - 0.5) * 3 - (count === 3 && col === 1 ? 2.5 : 0),
        r: size * (0.96 + chance(seed, i, 3) * 0.09),
        tone: Math.floor(chance(seed, i, 4) * 3),
        letter: letters[i],
        speck: chance(seed, i, 5) > 0.55,
      });
      i += 1;
    });
    // behind: a grape peeps out on each side where the next row is narrower, so the bunch narrows softly, not in steps
    const next = rows[row + 1] ?? 0;
    const edge = XS[count];
    if (count - next >= 1 && count > 1) {
      const dx = count - next >= 2 ? 15 : 9;
      back.push({ x: edge[0] + dx - 4, y: y + 17, r: R * 0.6, tone: (row + 1) % 3 }, { x: edge[count - 1] - dx + 4, y: y + 17.5, r: R * 0.58, tone: (row + 2) % 3 });
    }
  });
  // the shoulders by the stem, and one small grape at the very tip
  back.push({ x: 36, y: 17, r: R * 0.55, tone: 1 }, { x: 64, y: 16, r: R * 0.6, tone: 2 });
  const last = front[front.length - 1];
  back.push({ x: last.x + 3, y: last.y + last.r + 3, r: R * 0.5, tone: 0 });
  const h = last.y + last.r + 3 + R * 0.5 + 2;
  return { front, back, h };
};

const GrapeDraw: React.FC<{ g: Grape; shiny?: boolean; dim?: boolean }> = ({ g, shiny, dim }) => (
  <>
    {/* its shadow on the grapes behind */}
    <ellipse cx={g.x + 1} cy={g.y + 2} rx={g.r} ry={g.r} className="sg-grape-shade" />
    <circle cx={g.x} cy={g.y} r={g.r} fill={`url(#sg-grape-${g.tone})`} />
    <circle cx={g.x} cy={g.y} r={g.r} fill="url(#sg-grape-bloom)" />
    {dim && <circle cx={g.x} cy={g.y} r={g.r} className="sg-grape-shade" />}
    {g.speck && <circle cx={g.x + g.r * 0.6} cy={g.y - g.r * 0.6} r={0.8} className="sg-grape-speck" />}
    <ellipse
      cx={g.x - g.r * 0.5} cy={g.y - g.r * 0.62} rx={g.r * (shiny ? 0.26 : 0.2)} ry={g.r * (shiny ? 0.13 : 0.1)}
      fill={COLOR.surf} opacity={dim ? 0.3 : shiny ? 0.9 : 0.6} transform={`rotate(-38 ${g.x - g.r * 0.5} ${g.y - g.r * 0.62})`}
    />
    {shiny && !dim && <circle cx={g.x + g.r * 0.62} cy={g.y + g.r * 0.62} r={1.2} fill={COLOR.surf} opacity={0.55} />}
  </>
);

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
  const { front, back, h } = bunchOf(word);
  return (
    <div className={cx('vine-sway sg-keep-text absolute -translate-x-1/2', className)} style={style}>
      <Press
        onClick={onOpen}
        aria-label={unread ? `${label}, ${unread} წაუკითხავი` : label}
        className={cx('relative block w-full cursor-pointer rounded-full transition active:scale-95', unread > 0 && 'sg-bunch-hop', FOCUS)}
      >
        <svg viewBox={`0 0 100 ${h}`} className="block w-full overflow-visible" aria-hidden="true">
          <defs>
            {/* three ripenesses of a real grape's skin (the colours are in index.css): light from the upper left, a darker rim */}
            {[0, 1, 2].map(t => (
              <radialGradient key={t} id={`sg-grape-${t}`} cx="36%" cy="30%" r="80%">
                <stop offset="0%" className={`sg-grape-lit-${t}`} />
                <stop offset="45%" className={`sg-grape-skin-${t}`} />
                <stop offset="100%" className={`sg-grape-rim-${t}`} />
              </radialGradient>
            ))}
            {/* the bloom: the dusty blush on a ripe grape, strongest below */}
            <linearGradient id="sg-grape-bloom" x1="0" y1="0" x2="0" y2="1">
              <stop offset="40%" className="sg-grape-dust" stopOpacity={0} />
              <stop offset="100%" className="sg-grape-dust" stopOpacity={0.28} />
            </linearGradient>
          </defs>
          {/* the stalk from the branch, bent as it hangs, with its knot and a curl of tendril */}
          <path d="M50 -7 C47 0 54 7 50 17" fill="none" className="sg-bunch-stalk" strokeWidth={3.6} strokeLinecap="round" />
          <circle cx={50} cy={-6} r={2.6} className="sg-bunch-knot" />
          <path d="M51 3 C60 -1 66 5 61 10 C58 13 54 10 57 7" fill="none" className="sg-bunch-stalk" strokeWidth={1.3} strokeLinecap="round" />
          {back.map((g, i) => <GrapeDraw key={i} g={g} dim />)}
          {front.map((g, i) => (
            <g key={i} className="sg-grape" style={{ animationDelay: `${i * 0.42}s` }}>
              <GrapeDraw g={g} shiny={shiny} />
            </g>
          ))}
          {/* the letters last, over every grape: a lower row never covers the letters above it */}
          {front.map((g, i) => (
            <text
              key={i} x={g.x} y={g.y + 0.6} textAnchor="middle" dominantBaseline="central"
              className="sg-grape-letter" fontSize={19.5} fontWeight={700} style={{ animationDelay: `${i * 0.42}s` }}
            >{g.letter}</text>
          ))}
        </svg>
        {unread > 0 && <Counter n={unread} className="absolute top-[8%] -right-1.5" />}
      </Press>
    </div>
  );
};
