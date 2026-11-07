import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Mic, RotateCcw, X } from 'lucide-react';
import { useAuth } from '../../../context';
import { useViewing } from '../../../context/AuthContext';
import { MANERA_BASE } from '../../../data/maneraLessons';
import { playLessonNotes, stopLessonNotes } from '../../../utils/chantSynth';
import type { Timed } from '../../../utils/chantClips';
import { saveDrillScore, useDrillScores } from '../../../utils/drillScores';
import { markDrillDone } from '../../../utils/maneraPractice';
import { noteName } from '../../../utils/pearls';
import { singingSupported, startSinging, type SingSession } from '../../../utils/singCapture';
import type { Frame } from '../../../utils/earTrainer';
import { PASS } from '../../../utils/masteryPath';
import { triggerHaptic } from '../../../utils/haptics';
import { Btn } from '../../ui/kit';

// The pieces every trainer of „ოსტატობის გზა“ shares: the student's voice (low / high, the same choice as the timed
// exercises'), the sound, the microphone, the round dots and the end card that keeps the best score.

const RANGE_KEY = 'sg-manera-voice';
export type Range = keyof typeof MANERA_BASE;
const readRange = (): Range => { try { return localStorage.getItem(RANGE_KEY) === 'high' ? 'high' : 'low'; } catch { return 'low'; } };

/** the student's voice: its base note and the switch; the exercises' sheets share it */
export const useVoiceRange = () => {
  const [range, setState] = useState<Range>(readRange);
  const setRange = (r: Range) => { setState(r); try { localStorage.setItem(RANGE_KEY, r); } catch { /* storage off */ } };
  return { range, base: MANERA_BASE[range], setRange };
};
export const saveRange = (r: Range) => { try { localStorage.setItem(RANGE_KEY, r); } catch { /* storage off */ } };

export const RangeSwitch: React.FC<{ range: Range; onChange: (r: Range) => void }> = ({ range, onChange }) => (
  <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white ring-1 ring-[#e8dcc8]" role="radiogroup" aria-label="ხმის სიმაღლე">
    {([['low', 'კაცის ხმა'], ['high', 'ქალის · ბავშვის']] as [Range, string][]).map(([v, text]) => (
      <button
        key={v}
        type="button"
        role="radio"
        aria-checked={range === v}
        onClick={() => { triggerHaptic(8); onChange(v); }}
        className={`h-9 px-3.5 rounded-full text-[13px] font-bold cursor-pointer transition-colors ${range === v ? 'bg-[#7a2028] text-[#fbf6ec]' : 'text-[#4a3426]'}`}
      >
        {text}
      </button>
    ))}
  </div>
);

/** plays notes; resolves when they are over */
export const playAndWait = async (notes: Timed[], tail = 0.15) => {
  await playLessonNotes(notes);
  const end = notes.reduce((m, [a, l]) => Math.max(m, a + l), 0);
  await new Promise(r => window.setTimeout(r, (end + tail) * 1000));
};
export const stopSound = () => stopLessonNotes();

export type MicError = 'off' | 'denied';

/**
 * The microphone for one take at a time: `take(seconds, { onFrame, stopWhen, onStart })` resolves with the frames (t in ms
 * from the take's start, `t0` = that start on performance.now()), cut short when `stopWhen` says so; `onStart` runs once
 * the microphone listens (a line to sing along starts there). Never records an MP3 (`cancel`). Off on a teacher's look at
 * a student's page and where the browser has no microphone.
 */
export interface TakeOptions {
  onFrame?: (f: Frame, all: Frame[]) => void;
  stopWhen?: (all: Frame[]) => boolean;
  onStart?: (t0: number) => void;
}
export const useMic = () => {
  const session = useRef<SingSession | null>(null);
  const [error, setError] = useState<MicError | null>(() => (singingSupported() ? null : 'off'));
  const stop = useCallback(() => { session.current?.cancel(); session.current = null; }, []);
  useEffect(() => stop, [stop]);
  const take = useCallback(async (seconds: number, o: TakeOptions = {}): Promise<{ frames: Frame[]; t0: number } | null> => {
    if (!singingSupported()) { setError('off'); return null; }
    let s: SingSession | undefined;
    try {
      s = await startSinging(() => {
        const all = s?.frames as Frame[] | undefined;
        if (all?.length) o.onFrame?.(all[all.length - 1], all);
      });
    } catch { setError('denied'); return null; }
    const own = s;
    session.current = own;
    setError(null);
    o.onStart?.(own.t0);
    const frames = own.frames as Frame[];
    await new Promise<void>(resolve => {
      const until = performance.now() + seconds * 1000;
      const tick = window.setInterval(() => {
        if (session.current !== own || performance.now() >= until || (o.stopWhen && o.stopWhen(frames))) { window.clearInterval(tick); resolve(); }
      }, 80);
    });
    const out = { frames: [...frames], t0: own.t0 };
    if (session.current === own) stop();
    return out;
  }, [stop]);
  return { take, stop, error };
};

export const MicNote: React.FC<{ error: MicError | null }> = ({ error }) => (error ? (
  <p className="flex items-start gap-2 rounded-xl bg-amber-50 ring-1 ring-amber-200 px-3 py-2 text-[13px] leading-snug text-amber-900">
    <Mic className="w-4 h-4 shrink-0 mt-0.5" />
    {error === 'denied'
      ? 'მიკროფონი არ ჩაირთო — ნება დართე ბრაუზერის პარამეტრებში. მანამდე თვითონ შეაფასე.'
      : 'აქ მიკროფონი არ მუშაობს — თვითონ შეაფასე, სწორად იმღერე თუ არა.'}
  </p>
) : null);

export const noteLabel = (midi: number) => noteName(midi);

/** the rounds as dots: right green, wrong rose, the current one ringed */
export const Dots: React.FC<{ results: boolean[]; total: number }> = ({ results, total }) => (
  <div className="flex items-center justify-center gap-1.5" aria-label={`${results.length + 1} / ${total}`}>
    {Array.from({ length: total }, (_, i) => (
      <span
        key={i}
        className={`w-2.5 h-2.5 rounded-full ${i < results.length ? (results[i] ? 'bg-emerald-600' : 'bg-rose-500') : i === results.length ? 'ring-2 ring-[#7a2028] bg-white' : 'bg-[#e8dcc8]'}`}
      />
    ))}
  </div>
);

/** right / wrong under an answer, with what was right */
export const Verdict: React.FC<{ ok: boolean; children?: React.ReactNode }> = ({ ok, children }) => (
  <div className={`flex items-start gap-2.5 rounded-2xl px-3.5 py-2.5 ring-1 sg-in ${ok ? 'bg-emerald-50 ring-emerald-200 text-emerald-900' : 'bg-rose-50 ring-rose-200 text-rose-900'}`}>
    <span className={`mt-0.5 w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-white ${ok ? 'bg-emerald-600' : 'bg-rose-500'}`}>
      {ok ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
    </span>
    <div className="min-w-0 text-[14px] leading-snug">
      <p className="font-bold">{ok ? 'სწორია!' : 'ვერა.'}</p>
      {children && <div className="mt-0.5">{children}</div>}
    </div>
  </div>
);

/** keeps a run's score: the best (for a member also in the record) and today as done; nothing on a teacher's look */
export const useFinish = (drillId: string) => {
  const { user } = useAuth();
  const viewing = useViewing();
  const scores = useDrillScores(user?.uid);
  const best = scores[drillId];
  const finish = useCallback((pct: number | null) => {
    if (viewing) return;
    if (pct !== null) void saveDrillScore(drillId, pct, user?.uid, best ?? 0);
    markDrillDone(drillId, user?.uid);
  }, [drillId, user?.uid, best, viewing]);
  return { best, finish };
};

/** the end of a run: the share right, the best so far, passed or not, and again */
export const RunEnd: React.FC<{ pct: number; best?: number; detail?: React.ReactNode; onAgain: () => void }> = ({ pct, best, detail, onAgain }) => {
  const passed = pct >= PASS;
  return (
    <div className="space-y-4 text-center sg-in">
      <div className={`mx-auto w-28 h-28 rounded-full flex flex-col items-center justify-center ring-[6px] ${passed ? 'ring-emerald-500 bg-emerald-50' : pct >= 50 ? 'ring-amber-400 bg-amber-50' : 'ring-rose-400 bg-rose-50'}`}>
        <span className="text-[32px] font-black tabular-nums text-[#2a2017] leading-none">{pct}%</span>
      </div>
      {detail && <div className="text-[14px] text-[#4a3426]">{detail}</div>}
      <p className={`text-[15px] font-bold ${passed ? 'text-emerald-700' : 'text-[#4a3426]'}`}>
        {passed ? 'გავლილია ✓' : `გასავლელად ${PASS}% უნდა — სცადე ისევ.`}
      </p>
      {best !== undefined && best > 0 && <p className="text-[13px] text-[#8a7a6a]">საუკეთესო: <b className="tabular-nums text-[#4a3426]">{Math.max(best, pct)}%</b></p>}
      <Btn kind="soft" icon={<RotateCcw />} onClick={onAgain}>თავიდან</Btn>
    </div>
  );
};

/** a line drawn from the frames: the voice's place against the target's band (± 0.5 semitone shaded), newest at the right */
export const Trace: React.FC<{ frames: Frame[]; target: number | null; seconds: number; band?: number }> = ({ frames, target, seconds, band = 0.5 }) => {
  const W = 320;
  const H = 96;
  const span = 2.5; // semitones each way
  const t1 = Math.max(seconds * 1000, frames.length ? frames[frames.length - 1].t : 0);
  const y = (d: number) => H / 2 - (Math.max(-span, Math.min(span, d)) / span) * (H / 2 - 4);
  const ref = target ?? (() => { const v = frames.map(f => f.midi).filter((x): x is number => x !== null); return v.length ? v[Math.floor(v.length / 2)] : null; })();
  let path = '';
  let gap = true;
  for (const f of frames) {
    if (f.midi === null || ref === null) { gap = true; continue; }
    const d = ((((f.midi - ref + 6) % 12) + 12) % 12) - 6;
    const x = (f.t / t1) * W;
    path += `${gap ? 'M' : 'L'}${x.toFixed(1)} ${y(d).toFixed(1)}`;
    gap = false;
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full h-24 rounded-2xl bg-white ring-1 ring-[#e8dcc8]" aria-hidden>
      <rect x={0} y={y(band)} width={W} height={y(-band) - y(band)} fill="#059669" opacity={0.1} />
      <line x1={0} x2={W} y1={H / 2} y2={H / 2} stroke="#059669" strokeOpacity={0.45} strokeDasharray="4 4" />
      <path d={path} fill="none" stroke="#7a2028" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

/** the voice heard now: its note's name, or a quiet dash */
export const LiveNote: React.FC<{ midi: number | null; target?: number | null }> = ({ midi, target }) => {
  const off = midi !== null && target != null ? ((((midi - target + 6) % 12) + 12) % 12) - 6 : null;
  const near = off !== null && Math.abs(off) <= 0.5;
  return (
    <div className="flex items-center justify-center gap-2 h-10" aria-live="polite">
      <span className={`w-2.5 h-2.5 rounded-full ${midi !== null ? 'bg-rose-500 animate-pulse' : 'bg-[#e8dcc8]'}`} />
      <span className={`text-[22px] font-black tabular-nums ${midi === null ? 'text-[#cbbca6]' : near ? 'text-emerald-700' : 'text-[#4a3426]'}`}>
        {midi === null ? '…' : noteName(midi)}
      </span>
      {off !== null && !near && <span className="text-[13px] font-bold text-[#8a7a6a]">{off > 0 ? 'მაღლაა ↓' : 'დაბლაა ↑'}</span>}
    </div>
  );
};
