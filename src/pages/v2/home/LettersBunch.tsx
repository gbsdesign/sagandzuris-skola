import React from 'react';
import { Counter, FOCUS, Press, cx } from '../../../components/ui2';
import { COLOR } from '../../../design/tokens';

// A word written into a grape bunch on the home vine, one letter a grape (2026-11-21, the user's idea — he insists on the letters
// in the grapes; a name tag under a plain bunch was refused). The grapes are real ones (2026-11-22, the user: „ამოიღე მარცვლები
// ლამაზად და შენ თავად ააწყე მტევანი ამ მარცვლებით და შიგ ჩაწერე ეგ ასოები“): nine ripe dark grapes cut one by one out of the photo
// he sent (public/home/grapes/g1…g9.png), put together into a bunch here — big ones in front with a white letter each, small
// ones behind. Four bunches: „გაკვეთილი“ (still opens the letters), „გალობა“, „სიმღერა“, „ლოცვანი“. A bunch sways; a count and a
// hop while letters wait.

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

interface Grape { x: number; y: number; r: number; letter?: string }

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
        letter: letters[i],
      });
      i += 1;
    });
    // behind: a grape peeps out on each side where the next row is narrower, so the bunch narrows softly, not in steps
    const next = rows[row + 1] ?? 0;
    const edge = XS[count];
    if (count - next >= 1 && count > 1) {
      const dx = count - next >= 2 ? 15 : 9;
      back.push({ x: edge[0] + dx - 4, y: y + 17, r: R * 0.6 }, { x: edge[count - 1] - dx + 4, y: y + 17.5, r: R * 0.58 });
    }
  });
  // the shoulders by the stem, and one small grape at the very tip
  back.push({ x: 36, y: 17, r: R * 0.55 }, { x: 64, y: 16, r: R * 0.6 });
  const last = front[front.length - 1];
  back.push({ x: last.x + 3, y: last.y + last.r + 3, r: R * 0.5 });
  const h = last.y + last.r + 3 + R * 0.5 + 2;
  return { front, back, h };
};

/** how many grape pictures there are */
const PICS = 9;

const GrapeDraw: React.FC<{ g: Grape; n: number; dim?: boolean }> = ({ g, n, dim }) => (
  <>
    {/* its shadow on the grapes behind */}
    <circle cx={g.x + 0.8} cy={g.y + 1.8} r={g.r} className="sg-grape-shade" />
    <image
      href={`/home/grapes/g${(n % PICS) + 1}.png`} x={g.x - g.r} y={g.y - g.r} width={g.r * 2} height={g.r * 2}
      transform={`rotate(${(n * 47) % 360} ${g.x} ${g.y})`}
    />
    {dim && <circle cx={g.x} cy={g.y} r={g.r} className="sg-grape-shade" />}
  </>
);

export const LettersBunch: React.FC<{
  word: string;
  /** what a screen reader says (the first bunch opens the letters, whatever is written on it) */
  label?: string;
  unread?: number;
  onOpen: () => void;
  className?: string;
  style?: React.CSSProperties;
}> = ({ word, label = word, unread = 0, onOpen, className, style }) => {
  const { front, back, h } = bunchOf(word);
  return (
    <div className={cx('vine-sway sg-keep-text absolute -translate-x-1/2', className)} style={style}>
      <Press
        onClick={onOpen}
        aria-label={unread ? `${label}, ${unread} წაუკითხავი` : label}
        className={cx('relative block w-full cursor-pointer rounded-full transition active:scale-95', unread > 0 && 'sg-bunch-hop', FOCUS)}
      >
        <svg viewBox={`0 0 100 ${h}`} className="block w-full overflow-visible" aria-hidden="true">
          {/* the stalk from the branch, bent as it hangs, with its knot and a curl of tendril */}
          <path d="M50 -7 C47 0 54 7 50 17" fill="none" className="sg-bunch-stalk" strokeWidth={3.6} strokeLinecap="round" />
          <circle cx={50} cy={-6} r={2.6} className="sg-bunch-knot" />
          <path d="M51 3 C60 -1 66 5 61 10 C58 13 54 10 57 7" fill="none" className="sg-bunch-stalk" strokeWidth={1.3} strokeLinecap="round" />
          {back.map((g, i) => <GrapeDraw key={i} g={g} n={i + 5} dim />)}
          {front.map((g, i) => (
            <g key={i} className="sg-grape" style={{ animationDelay: `${i * 0.5}s` }}>
              <GrapeDraw g={g} n={i} />
            </g>
          ))}
          {/* the letters last, over every grape: a lower row never covers the letters above it */}
          {front.map((g, i) => (
            <text
              key={i} x={g.x} y={g.y + 0.6} textAnchor="middle" dominantBaseline="central"
              className="sg-grape-letter" fontSize={19} fontWeight={700} fill={COLOR.surf}
            >{g.letter}</text>
          ))}
        </svg>
        {unread > 0 && <Counter n={unread} className="absolute top-[8%] -right-1.5" />}
      </Press>
    </div>
  );
};
