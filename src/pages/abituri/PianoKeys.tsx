import React, { useState } from 'react';
import type { KeysSpec } from '../../data/abituriLessons';
import { playLessonNotes } from '../../utils/chantSynth';
import { midi, note } from '../../utils/musicTheory';

// A small keyboard for the lessons: the marked keys are coloured, a tapped key sounds

const WHITE = [0, 2, 4, 5, 7, 9, 11];
const SYL = ['დო', 'რე', 'მი', 'ფა', 'სოლ', 'ლა', 'სი'];
const W = 44, H = 150, BW = 26, BH = 92;

export const PianoKeys: React.FC<KeysSpec> = ({ from = 'C4', to = 'C5', mark = [], cap }) => {
  const [down, setDown] = useState<number | null>(null);
  const lo = midi(note(from)), hi = midi(note(to));
  const marked = new Set(mark.map(m => midi(note(m))));
  const whites: number[] = [];
  for (let m = lo; m <= hi; m++) if (WHITE.includes(m % 12)) whites.push(m);
  const blacks = whites.slice(0, -1).flatMap((m, i) => (WHITE.includes((m + 1) % 12) ? [] : [{ m: m + 1, x: (i + 1) * W - BW / 2 }]));

  const press = (m: number) => {
    setDown(m);
    void playLessonNotes([[0, 0.9, m]]);
    window.setTimeout(() => setDown(d => (d === m ? null : d)), 260);
  };

  return (
    <figure className="my-4">
      <div className="rounded-2xl bg-[#fffdf8] ring-1 ring-[#e8dcc8] p-2.5 sm:p-3">
        <svg viewBox={`0 0 ${whites.length * W} ${H}`} className="block w-full max-w-[440px] mx-auto h-auto select-none" role="img" aria-label="კლავიატურა">
          {whites.map((m, i) => {
            const on = marked.has(m);
            return (
              <g key={m} onClick={() => press(m)} className="cursor-pointer">
                <rect
                  x={i * W + 1} y={1} width={W - 2} height={H - 2} rx={6}
                  fill={down === m ? '#efd9ae' : on ? '#f7e6c2' : '#ffffff'}
                  stroke={on ? '#c9a66b' : '#d8ccb8'} strokeWidth={on ? 2 : 1.2}
                />
                <text
                  x={i * W + W / 2} y={H - 16} textAnchor="middle" fontSize={13} fontWeight={700}
                  fill={on ? '#7a2028' : '#8a7a6a'} fontFamily='"Noto Sans Georgian", sans-serif'
                >
                  {SYL[WHITE.indexOf(m % 12)]}
                </text>
              </g>
            );
          })}
          {blacks.map(b => (
            <rect
              key={b.m} x={b.x} y={1} width={BW} height={BH} rx={4}
              fill={down === b.m ? '#5e1820' : marked.has(b.m) ? '#a3333d' : '#2a2017'}
              onClick={() => press(b.m)} className="cursor-pointer"
            />
          ))}
        </svg>
      </div>
      {cap && <figcaption className="mt-2 text-[13.5px] leading-snug text-[#6b5c4d]">{cap}</figcaption>}
    </figure>
  );
};
