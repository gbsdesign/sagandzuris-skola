import React from 'react';
import { COLOR } from '../../design/tokens';
import { offPitch } from '../../utils/aiLesson';
import { cx } from '../ui2';
import type { VoicePoint } from './useTake';

// The phrase as bars (the prototype's roll4): each note of my voice a bar by its time and height. Marks: `hit` sung
// right (wine), `now` the bit that sounds or is asked now (gold), `miss` sung off (the place dashed, my note in gold
// beside it — the named one with „დაბლა იყო“ / „მაღლა იყო“), `wait` still to come (outlined). While singing, my voice
// runs over it as a gold line („ცოცხალი ხაზი“).

export interface RollNote { t0: number; len: number; midi: number }
export type RollMark = 'hit' | 'now' | 'miss' | 'wait';

const H = 128;
const BAR = 12;
const PAD = 14;

export const LiveRoll: React.FC<{
  notes: RollNote[];
  marks?: RollMark[];
  /** semitones off, for the missed notes (+ = high) */
  devs?: (number | null)[];
  /** the note named in the teacher's sentence */
  focus?: number;
  trace?: VoicePoint[];
  offset?: number | null;
  /** seconds from the phrase's start, while it sounds */
  playhead?: number | null;
  /** the stretch the voice line is laid over (seconds from the phrase's start); the whole phrase by default */
  traceSpan?: [number, number];
  height?: number;
  className?: string;
}> = ({ notes, marks, devs, focus = -1, trace, offset, playhead, traceSpan, height = H, className }) => {
  if (!notes.length) return null;
  const total = Math.max(0.5, ...notes.map(n => n.t0 + n.len));
  const lo = Math.min(...notes.map(n => n.midi)) - 1.5;
  const hi = Math.max(...notes.map(n => n.midi)) + 1.5;
  const span = Math.max(4, hi - lo);
  const yOf = (m: number) => PAD + ((hi - m) / span) * (height - 2 * PAD - BAR);
  const xOf = (sec: number) => 2 + (sec / total) * 96; // % of the width
  const wOf = (sec: number) => Math.max(3.2, (sec / total) * 96 - 1.4);

  // my voice: placed by my own pace (stretched over the phrase), folded into the phrase's octave
  let path = '';
  if (trace?.length) {
    const voiced = trace.filter(p => p.m != null);
    if (voiced.length) {
      const t0 = voiced[0].t;
      const t1 = Math.max(voiced[voiced.length - 1].t, t0 + 1);
      const [a, b] = traceSpan ?? [0, total];
      const len = Math.max((b - a) * 1000, t1 - t0);
      const mid = (lo + hi) / 2;
      let pen = false;
      for (const p of trace) {
        if (p.t < t0 || p.m == null) { pen = false; continue; }
        const v = p.m - (offset ?? 0);
        const folded = mid + offPitch(v, mid);
        const x = xOf(a + ((p.t - t0) / len) * (b - a));
        const y = ((yOf(folded) + BAR / 2) / height) * 100;
        path += `${pen ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)} `;
        pen = true;
      }
    }
  }

  return (
    <div aria-hidden="true" className={cx('relative overflow-hidden rounded-field bg-page', className)} style={{ height }}>
      {[0.25, 0.5, 0.75].map(f => <span key={f} className="absolute inset-x-0 h-px bg-line" style={{ top: `${f * 100}%` }} />)}
      {notes.map((n, i) => {
        const mark = marks?.[i] ?? 'wait';
        const pos: React.CSSProperties = { left: `${xOf(n.t0)}%`, width: `${wOf(n.len)}%`, top: yOf(n.midi), height: BAR };
        if (mark === 'hit') return <span key={i} className="absolute rounded-full bg-wine" style={pos} />;
        if (mark === 'now') return <span key={i} className="absolute rounded-full bg-gold" style={pos} />;
        if (mark === 'miss') {
          const dev = devs?.[i] ?? null;
          const shift = dev == null ? null : Math.max(-3, Math.min(3, dev));
          return (
            <React.Fragment key={i}>
              <span className="absolute rounded-full border-2 border-dashed border-mut box-border" style={pos} />
              {shift != null && (
                <span className="absolute rounded-full bg-gold" style={{ ...pos, top: yOf(n.midi + shift) + (Math.abs(shift) < 0.8 ? (shift < 0 ? 6 : -6) : 0) }} />
              )}
              {i === focus && shift != null && (
                <span className="absolute text-cap font-bold text-gold-ink whitespace-nowrap"
                  style={{ left: `${xOf(n.t0)}%`, top: Math.min(height - 18, yOf(n.midi + shift) + BAR + 4) }}>
                  {shift < 0 ? 'დაბლა იყო' : 'მაღლა იყო'}
                </span>
              )}
            </React.Fragment>
          );
        }
        return <span key={i} className="absolute rounded-full border-2 border-dim box-border" style={pos} />;
      })}
      {playhead != null && (
        <span className="absolute top-2 bottom-2 w-0.5 rounded-full bg-gold" style={{ left: `${xOf(Math.min(total, Math.max(0, playhead)))}%` }} />
      )}
      {path && (
        <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none">
          <path d={path} stroke={COLOR.gold} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
      )}
    </div>
  );
};

/** My voice's notes of a stretch as bars: a repeated pitch is one bar (as the scoring counts it), lasting until the next. */
export const rollNotes = (timeline: [number, number, number][]): RollNote[] => {
  const out: RollNote[] = [];
  for (const [t0, len, midi] of timeline) {
    const last = out[out.length - 1];
    if (last && last.midi === midi) last.len = t0 + len - last.t0;
    else out.push({ t0, len, midi });
  }
  return out;
};
