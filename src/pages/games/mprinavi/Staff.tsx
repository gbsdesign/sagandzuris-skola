import React from 'react';
import { staffPos, type Clef } from '../../../utils/mprinavi';
import { F_CLEF, G_CLEF, HEAD, HEAD_W, LINE_SPACE } from './glyphs';

// „მფრინავი ნოტები“'s staff: five lines, the clef (abcjs's own signs, glyphs.ts) and notes as heads with stems, a ledger line
// where a note goes under or over the staff. In px of the SVG's own box (it scales to the screen's width); a note's place is
// utils/mprinavi.ts `staffPos` (0 = the bottom line … 8 = the top one).

/** a line space */
export const SP = 14;
const K = SP / LINE_SPACE;
/** room over the staff (two ledger lines and a stem) and under it */
export const TOP = SP * 3.5;
const BOTTOM = SP * 3.5;
export const STAFF_H = TOP + SP * 4 + BOTTOM;
/** where the clef ends: the first note may stand from here */
export const CLEF_END = 46;
const HEAD_PX = HEAD_W * K;

/** a place's height: 0 = the bottom line */
export const yOf = (pos: number) => TOP + (8 - pos) * (SP / 2);

export type NoteTone = 'plain' | 'now' | 'right' | 'wrong';
const FILL: Record<NoteTone, string> = { plain: '#3b2a1f', now: '#7a2028', right: '#2f7d4f', wrong: '#c2410c' };

/** one note at x (its head's left edge), its ledger lines and its stem, coloured by `tone` */
export const NoteMark: React.FC<{ midi: number; clef: Clef; x: number; tone?: NoteTone }> = ({ midi, clef, x, tone = 'plain' }) => {
  const p = staffPos(midi, clef);
  const y = yOf(p);
  const ledgers: number[] = [];
  for (let l = -2; l >= p; l -= 2) ledgers.push(l);
  for (let l = 10; l <= p; l += 2) ledgers.push(l);
  const up = p < 4;
  const fill = FILL[tone];
  return (
    <g>
      {ledgers.map(l => <line key={l} x1={x - 6} x2={x + HEAD_PX + 6} y1={yOf(l)} y2={yOf(l)} stroke="#3b2a1f" strokeWidth={1.4} />)}
      <path d={HEAD} transform={`translate(${x} ${y}) scale(${K})`} fill={fill} />
      <line
        x1={up ? x + HEAD_PX - 0.9 : x + 0.9}
        x2={up ? x + HEAD_PX - 0.9 : x + 0.9}
        y1={up ? y - 1.5 : y + 1.5}
        y2={up ? y - SP * 3.4 : y + SP * 3.4}
        stroke={fill}
        strokeWidth={1.5}
      />
    </g>
  );
};

/** the staff over `width`, its clef at the left; the notes are its children */
export const Staff: React.FC<{ clef: Clef; width: number; children?: React.ReactNode; label?: string }> = ({ clef, width, children, label }) => (
  <svg viewBox={`0 0 ${width} ${STAFF_H}`} className="block w-full h-auto" role="img" aria-label={label ?? (clef === 'treble' ? 'სოლის გასაღები' : 'ფას გასაღები')}>
    {[0, 2, 4, 6, 8].map(p => <line key={p} x1={2} x2={width - 2} y1={yOf(p)} y2={yOf(p)} stroke="#3b2a1f" strokeWidth={1.2} />)}
    {clef === 'treble'
      ? <path d={G_CLEF} transform={`translate(8 ${yOf(2)}) scale(${K})`} fill="#3b2a1f" />
      : <path d={F_CLEF} transform={`translate(8 ${yOf(6)}) scale(${K})`} fill="#3b2a1f" />}
    {children}
  </svg>
);

/** notes standing still, evenly after the clef (the room's four); each its own tone */
export const StillNotes: React.FC<{ clef: Clef; notes: readonly number[]; tones?: readonly NoteTone[]; labels?: readonly (string | null)[]; width?: number }> = ({
  clef, notes, tones = [], labels = [], width = 320,
}) => {
  const gap = (width - CLEF_END - 18) / notes.length;
  const xs = notes.map((_, i) => CLEF_END + 6 + gap * i + (gap - HEAD_PX) / 2);
  return (
    <div>
      <Staff clef={clef} width={width}>
        {notes.map((m, i) => <NoteMark key={i} midi={m} clef={clef} x={xs[i]} tone={tones[i] ?? 'plain'} />)}
      </Staff>
      {labels.length > 0 && (
        <div className="relative h-9" style={{ marginTop: -SP * 0.6 }}>
          {notes.map((_, i) => (
            <span
              key={i}
              className={`absolute top-0 -translate-x-1/2 min-w-9 h-9 px-1.5 rounded-xl flex items-center justify-center font-serif-ge text-[14px] font-bold ${labels[i] ? (tones[i] === 'wrong' ? 'bg-[#c2410c]/10 text-[#9a3412]' : tones[i] === 'right' ? 'bg-[#2f7d4f]/12 text-[#1e4d31]' : 'bg-[#7a2028]/[0.08] text-[#7a2028]') : 'border border-dashed border-[#cdb998]'}`}
              style={{ left: `${((xs[i] + HEAD_PX / 2) / width) * 100}%` }}
            >
              {labels[i] ?? ''}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
