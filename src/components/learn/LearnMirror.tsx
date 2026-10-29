import React, { useMemo } from 'react';

// The singing mirror of the learning mode (as in the pearls game): the part's notes as bars, my voice as a line over
// them, moved into the part's key from my first steady note. A recording's part has no notes: then only my voice is
// drawn, at its own height. After the try the notes I hit turn gold.

const W = 320;
const H = 120;
const PAD = 10;

export interface MirrorFrame { t: number; midi: number | null } // t in ms from the start of singing

export const LearnMirror: React.FC<{
  notes: [at: number, len: number, midi: number][];
  seconds: number;
  frames: MirrorFrame[];
  offset: number | null;       // my key minus the notes' key (semitones); null until known
  hits: boolean[] | null;      // per melody note (repeated pitches are one), after the try
  live: boolean;
}> = ({ notes, seconds, frames, offset, hits, live }) => {
  // which melody note each note belongs to (repeated pitches are one)
  const melodyIndex = useMemo(() => {
    let k = -1;
    return notes.map(([, , m], i, all) => (i === 0 || all[i - 1][2] !== m ? ++k : k));
  }, [notes]);

  const sung = frames.filter(f => f.midi != null).map(f => f.midi! - (offset ?? 0));
  const pitches = notes.length ? notes.map(n => n[2]) : sung;
  if (!pitches.length) return null;
  const lo = Math.min(...pitches), hi = Math.max(...pitches);
  const span = Math.max(6, hi - lo + 4);
  const top = hi + (span - (hi - lo)) / 2;
  const y = (m: number) => Math.min(H - 3, Math.max(3, PAD + ((top - m) / span) * (H - 2 * PAD)));
  const lastT = frames.length ? frames[frames.length - 1].t / 1000 : 0;
  const domain = Math.max(notes.length ? seconds * 1.1 : 4, lastT + 0.6);
  const x = (s: number) => (s / domain) * W;

  let line = '';
  if (offset != null || !notes.length) {
    let pen = false;
    for (const f of frames) {
      if (f.midi == null) { pen = false; continue; }
      line += `${pen ? 'L' : 'M'}${x(f.t / 1000).toFixed(1)} ${y(f.midi - (offset ?? 0)).toFixed(1)}`;
      pen = true;
    }
  }
  const now = live ? frames[frames.length - 1] : undefined;

  return (
    <div className="rounded-xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] px-2 py-1.5">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-28" role="img" aria-label={notes.length ? 'ფრაზის ნოტები და შენი ხმა' : 'შენი ხმა'}>
        {notes.map(([at, len, m], i) => {
          const hit = hits?.[melodyIndex[i]];
          return (
            <rect key={i} x={x(at) + 1} y={y(m) - 4} width={Math.max(4, x(len) - 2)} height={8} rx={4}
              fill={hits && hit ? '#c9962a' : '#7a2028'} opacity={hits ? (hit ? 0.9 : 0.25) : 0.22} />
          );
        })}
        {line && <path d={line} fill="none" stroke="#4a3426" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />}
        {now?.midi != null && (offset != null || !notes.length) && (
          <circle cx={x(now.t / 1000)} cy={y(now.midi - (offset ?? 0))} r={5} fill="#7a2028" />
        )}
      </svg>
    </div>
  );
};
