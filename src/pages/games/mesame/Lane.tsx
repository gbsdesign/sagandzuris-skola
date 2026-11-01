import React from 'react';
import { noteName } from '../../../utils/pearls';
import { foldNear, inTune, pcOff, type TrioNote } from '../../../utils/trio';

// „მესამე ხმა“'s mirror while I sing (as a karaoke screen): my voice's notes run from the right to the line of „now“, my
// voice is drawn over them as a line — moved by octaves next to the note, so a child an octave up is on the bar. A note
// already passed turns green when it was sung, the coming ones carry their names. After the take the same lane shows the
// whole section in one view.

const W = 360;
/** seconds of the screen before and after „now“ */
const PAST = 2.2;
const AHEAD = 4.3;
const EDGE = 0.08;

export interface LaneFrame { t: number; midi: number | null }

/** the note sounding at a score second, else the one just before it (else the first) */
const noteAt = (notes: readonly TrioNote[], s: number) => {
  let k = 0;
  while (k + 1 < notes.length && notes[k + 1][0] <= s) k++;
  return notes[k];
};

/** whether a passed note was sung: most of its time in tune (as utils/trio.ts counts it) */
const sung = (n: TrioNote, frames: { at: number; midi: number | null }[]) => {
  const [s, len, m] = n;
  const edge = Math.min(EDGE, len * 0.2);
  let all = 0;
  let good = 0;
  for (const f of frames) {
    if (f.at < s + edge || f.at >= s + len - edge) continue;
    all++;
    if (f.midi != null && inTune(f.midi, m)) good++;
  }
  return all > 0 && good / all >= 0.3;
};

export const Lane: React.FC<{
  notes: readonly TrioNote[];
  /** the score second at the line of „now“; null: the whole section in one view (after the take) */
  now: number | null;
  speed: number;
  /** the take's frames (seconds since listening began) and where a moment lies on the score */
  frames: readonly LaneFrame[];
  place: (t: number) => number;
  /** after the take: each note's credit */
  credits?: readonly number[] | null;
  height?: number;
}> = ({ notes, now, speed, frames, place, credits, height = 180 }) => {
  if (!notes.length) return null;
  const H = height;
  const pitches = notes.map(n => n[2]);
  const lo = Math.min(...pitches);
  const hi = Math.max(...pitches);
  const span = Math.max(10, hi - lo + 5);
  const top = hi + (span - (hi - lo)) / 2;
  const y = (m: number) => Math.min(H - 8, Math.max(8, 10 + ((top - m) / span) * (H - 20)));
  const first = notes[0][0];
  const last = notes[notes.length - 1][0] + notes[notes.length - 1][1];
  const whole = now === null;
  const t0 = whole ? first : now - PAST * speed;
  const t1 = whole ? last : now + AHEAD * speed;
  const x = (s: number) => ((s - t0) / (t1 - t0)) * W;
  const nowX = whole ? null : x(now);

  // the frames on the score, the visible ones only
  const placed = frames.map(f => ({ at: place(f.t), midi: f.midi })).filter(f => f.at >= t0 - 0.5 && f.at <= (whole ? t1 : now + 0.05));
  let path = '';
  let pen = false;
  let prevAt = -Infinity;
  for (const f of placed) {
    if (f.midi == null || f.at < t0 || f.at - prevAt > 0.15) pen = false;
    prevAt = f.at;
    if (f.midi == null || f.at < t0) continue;
    const m = foldNear(f.midi, noteAt(notes, f.at)[2]);
    path += `${pen ? 'L' : 'M'}${x(f.at).toFixed(1)} ${y(m).toFixed(1)}`;
    pen = true;
  }
  const latest = !whole && placed.length ? placed[placed.length - 1] : null;
  const target = latest ? noteAt(notes, latest.at) : null;
  const latestOk = latest?.midi != null && target ? inTune(latest.midi, target[2]) : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full block" style={{ height: `${H}px` }} role="img"
      aria-label={whole ? 'შენი ხმის ნოტები და როგორ იმღერე' : 'შენი ხმის ნოტები და შენი ხმა'}>
      {[0.25, 0.5, 0.75].map(k => <line key={k} x1={0} x2={W} y1={H * k} y2={H * k} stroke="#e8dcc8" strokeWidth={1} />)}
      {notes.map((n, i) => {
        const [s, len, m] = n;
        if (s + len < t0 || s > t1) return null;
        const x0 = x(s) + 1;
        const w = Math.max(5, x(s + len) - x(s) - 2);
        const past = whole || (nowX !== null && x(s + len) < nowX);
        const current = !whole && now !== null && s <= now && now < s + len;
        const ok = credits ? credits[i] >= 0.5 : past ? sung(n, placed) : null;
        const fill = ok === true ? '#2f7d4f' : past ? '#b9a993' : '#7a2028';
        const opacity = ok === true ? 0.75 : past ? 0.4 : current ? 0.9 : 0.32;
        return (
          <g key={i}>
            <rect x={x0} y={y(m) - 7} width={w} height={14} rx={7} fill={fill} opacity={opacity}
              stroke={current ? '#c9962a' : 'none'} strokeWidth={current ? 2 : 0} />
            {!past && x0 + w - Math.max(x0, 2) >= 30 && (
              <text x={Math.max(x0, 2) + 7} y={y(m) + 4} fontSize={11} fontWeight={700} fill={current ? '#fbf6ec' : '#7a2028'}>{noteName(m)}</text>
            )}
          </g>
        );
      })}
      {nowX !== null && <line x1={nowX} x2={nowX} y1={0} y2={H} stroke="#c9962a" strokeWidth={2} strokeDasharray="5 4" />}
      {path && <path d={path} fill="none" stroke="#4a3426" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />}
      {latest?.midi != null && target && (
        <circle cx={x(latest.at)} cy={y(foldNear(latest.midi, target[2]))} r={6.5} fill={latestOk ? '#2f7d4f' : '#7a2028'} stroke="#fff" strokeWidth={2} />
      )}
    </svg>
  );
};

/** what to do now, from the latest frame: ✓, higher, lower — or nothing while silent */
export const hintOf = (notes: readonly TrioNote[], frames: readonly LaneFrame[], place: (t: number) => number): 'ok' | 'up' | 'down' | null => {
  const f = frames[frames.length - 1];
  if (!f || f.midi == null || !notes.length) return null;
  const n = noteAt(notes, place(f.t));
  const off = pcOff(f.midi, n[2]);
  return Math.abs(off) <= 0.75 ? 'ok' : off > 0 ? 'down' : 'up';
};
