import React, { useEffect, useRef, useState } from 'react';
import { Mic, Play, Square } from 'lucide-react';
import { Btn } from '../../ui/kit';
import type { TrainerSpec } from '../../../data/masteryDrills';
import { knownChants } from '../../../data/chantGamePool';
import { loadBookScore, playLessonNotes } from '../../../utils/chantSynth';
import { firstPitches, type Timed } from '../../../utils/chantClips';
import {
  alongLine, alongScore, breathScore, breathSeconds, droneLine, octaveShift, sirenScore, steadyScore, straightScore, swellScore,
  type Frame,
} from '../../../utils/earTrainer';
import { LiveNote, MicNote, RangeSwitch, RunEnd, Trace, noteLabel, playAndWait, stopSound, useFinish, useMic, useVoiceRange } from './shared';

// One take measured by the microphone: a note held (in its band, without wobble, louder and softer), a siren, a long
// „სსს“, the bass held under a moving melody, a melody sung along a fourth or a fifth under it (the old study voices)
// or with the chant's own free rhythm. The score is the take's; the best is kept.

type MeasureSpec = Extract<TrainerSpec, { kind: 'hold' | 'siren' | 'breath' | 'drone-hold' | 'along' }>;

interface Plan {
  /** sounds before the take */
  cue: Timed[];
  /** sounds while the student sings (from the take's start) */
  line?: Timed[];
  /** the note held, for the line drawn and the live name */
  target: number | null;
  seconds: number;
  say: string;
  from?: string;
  /** scores the take (frames' t in ms from when `line` began) */
  score: (frames: Frame[]) => { pct: number; detail: React.ReactNode };
}

const planOf = async (spec: MeasureSpec, base: number): Promise<Plan> => {
  const note = base + 4;
  switch (spec.kind) {
    case 'hold':
      if (spec.mode === 'steady') {
        return {
          cue: [[0, 1.6, note]], target: note, seconds: spec.seconds, say: `დაიჭირე „ა“ ${spec.seconds} წამი — ხაზი მწვანე ზოლში`,
          score: f => ({ pct: steadyScore(f, note, spec.seconds), detail: 'ზოლში დარჩენილი დრო' }),
        };
      }
      if (spec.mode === 'straight') {
        return {
          cue: [[0, 1.6, note]], target: note, seconds: spec.seconds, say: `სწორი, მშვიდი „ა“ — ${spec.seconds} წამი, რხევის გარეშე`,
          score: f => { const r = straightScore(f, spec.seconds); return { pct: r.score, detail: r.wobble === null ? 'ხმა ცოტა ისმოდა' : `რხევა: ${r.wobble} ცენტი (სწორი ხმა ≈ 10)` }; },
        };
      }
      return {
        cue: [[0, 1.6, note]], target: note, seconds: spec.seconds, say: 'ჩუმად → ძლიერად → ჩუმად, ნოტი ადგილზე',
        score: f => { const r = swellScore(f, spec.seconds); return { pct: r.score, detail: r.shape === 1 ? 'ზრდა-კლება ისმის ✓' : r.shape ? 'ზრდა-კლება ცოტაა — მეტი სხვაობა' : 'ზრდა-კლება არ ისმის' }; },
      };
    case 'siren':
      return {
        cue: [[0, 1.2, base]], target: null, seconds: 10, say: '„უ“ — დაბლიდან ზემოთ და უკან, უწყვეტად',
        score: f => { const r = sirenScore(f); return { pct: r.score, detail: `გაიარე ${r.range} ნახევარტონი${r.gaps ? ` · ${r.gaps} წყვეტა` : ' · უწყვეტად'}` }; },
      };
    case 'breath':
      return {
        cue: [], target: null, seconds: 40, say: 'ჩაისუნთქე და „სსს“ — თანაბრად, რაც შეიძლება დიდხანს',
        score: f => { const s = breathSeconds(f); return { pct: breathScore(s), detail: `${s} წამი (გასავლელად 15)` }; },
      };
    case 'drone-hold': {
      const d = droneLine(base, Math.random);
      const total = d.melody.reduce((m, [a, l]) => Math.max(m, a + l), 0);
      return {
        cue: [[0, 1.6, d.bass]], line: d.melody, target: d.bass, seconds: total + 0.6, say: `დაიჭირე ბანი (${noteLabel(d.bass)}) — ზედა ხმა იმოძრავებს`, from: d.from,
        score: f => ({ pct: alongScore(f.map(x => ({ t: x.t / 1000, midi: x.midi })), [[0, total, d.bass]], 0), detail: 'ბანზე დარჩენილი დრო' }),
      };
    }
    case 'along': {
      let line: Timed[] | null = null;
      let from = '';
      if (spec.timed) {
        // a known chant's first phrase in its own rhythm
        const pool = knownChants();
        for (let i = 0; i < 3 && !line; i++) {
          const c = pool[Math.floor(Math.random() * pool.length)];
          try {
            const notes = firstPitches(await loadBookScore(c.num, c.book), 0, 0).filter(([a]) => a < 18);
            if (notes.length >= 6) {
              const k = octaveShift(notes.map(n => n[2]), base + 5);
              const t0 = notes[0][0];
              line = notes.map(([a, l, m]) => [a - t0 + 0.4, l, m + k]);
              from = c.title;
            }
          } catch { /* another */ }
        }
      }
      if (!line) { const a = alongLine(base, spec.shift, Math.random); line = a.line.map(([t, l, m]) => [t - 0.5, l, m]); from = a.from; }
      const total = line.reduce((m, [a, l]) => Math.max(m, a + l), 0);
      const first = line[0][2];
      const say = spec.shift === 0 ? 'იმღერე მთქმელთან ერთად, მის რიტმში' : `იმღერე იგივე ${spec.shift === -5 ? 'კვარტით' : 'კვინტით'} დაბლა, ერთად`;
      const ln = line;
      return {
        cue: spec.shift ? [[0, 1.4, first], [0, 1.4, first + spec.shift], [1.5, 0.9, first + spec.shift]] : [[0, 1.2, first]],
        line: ln, target: first + spec.shift, seconds: total + 0.6, say, from,
        score: f => ({ pct: alongScore(f.map(x => ({ t: x.t / 1000, midi: x.midi })), ln, spec.shift), detail: 'სწორ ნოტზე ნამღერი დრო' }),
      };
    }
  }
};

export const MeasureRun: React.FC<{ drillId: string; spec: MeasureSpec; intro: string; earphones?: boolean }> = ({ drillId, spec, intro, earphones }) => {
  const { range, base, setRange } = useVoiceRange();
  const { best, finish } = useFinish(drillId);
  const mic = useMic();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [phase, setPhase] = useState<'intro' | 'cue' | 'take' | 'end'>('intro');
  const [frames, setFrames] = useState<Frame[]>([]);
  const [result, setResult] = useState<{ pct: number; detail: React.ReactNode } | null>(null);
  const [left, setLeft] = useState(0);
  const live = useRef(true);
  const lineAt = useRef(0);
  useEffect(() => () => { live.current = false; stopSound(); }, []);

  const start = async () => {
    const p = await planOf(spec, base);
    if (!live.current) return;
    setPlan(p);
    setFrames([]);
    setResult(null);
    setPhase('cue');
    if (p.cue.length) await playAndWait(p.cue, 0.05);
    if (!live.current) return;
    setPhase('take');
    const until = performance.now() + p.seconds * 1000;
    const clock = window.setInterval(() => setLeft(Math.max(0, Math.ceil((until - performance.now()) / 1000))), 200);
    let quietSince = 0;
    const took = await mic.take(p.seconds, {
      onStart: t0 => {
        lineAt.current = 0;
        if (p.line) { void playLessonNotes(p.line); lineAt.current = performance.now() + 60 - t0; }
      },
      onFrame: (_f, all) => { setFrames([...all]); },
      // the breath ends a second after it falls quiet
      stopWhen: spec.kind === 'breath'
        ? all => {
          if (all.length < 20) return false;
          const floor = all.slice(0, 8).map(f => f.rms).sort((a, b) => a - b)[4];
          const on = all[all.length - 1].rms >= Math.max(0.004, floor * 3);
          const heard = all.slice(8).some(f => f.rms >= Math.max(0.004, floor * 3));
          if (on) quietSince = 0; else if (!quietSince) quietSince = all[all.length - 1].t;
          return heard && !on && all[all.length - 1].t - quietSince > 1200;
        }
        : undefined,
    });
    window.clearInterval(clock);
    stopSound();
    if (!live.current) return;
    if (!took) { setPhase('intro'); return; }
    const shifted = took.frames.map(f => ({ ...f, t: f.t - lineAt.current }));
    const r = p.score(spec.kind === 'drone-hold' || spec.kind === 'along' ? shifted : took.frames);
    setResult(r);
    finish(r.pct);
    setPhase('end');
  };

  if (phase === 'end' && result) {
    return <RunEnd pct={result.pct} best={best} detail={<>{result.detail}{plan?.from ? <p className="text-[12.5px] text-[#8a7a6a] mt-1">საგალობლიდან: {plan.from}</p> : null}</>} onAgain={() => { setPhase('intro'); setResult(null); }} />;
  }
  if (phase === 'intro') {
    return (
      <div className="space-y-4 text-center sg-in">
        <p className="text-[15px] leading-relaxed text-[#2a2017]">{intro}</p>
        {spec.kind !== 'breath' && <RangeSwitch range={range} onChange={setRange} />}
        {earphones && <p className="text-[13px] text-[#8a7a6a]">ყურსასმენით უკეთ გამოვა: ტელეფონი შენს ხმას გაიგონებს და არა საკუთარს.</p>}
        <MicNote error={mic.error} />
        <Btn size="lg" full icon={<Play />} disabled={mic.error === 'off'} onClick={() => void start()}>დაწყება</Btn>
      </div>
    );
  }

  const last = frames.length ? frames[frames.length - 1] : null;
  const breath = spec.kind === 'breath' ? breathSeconds(frames) : 0;
  return (
    <div className="space-y-3 sg-in">
      <p className="text-center text-[15px] font-bold text-[#4a3426]">{plan?.say}</p>
      <div className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3 text-center">
        {phase === 'cue'
          ? <p className="text-[15px] font-bold text-[#4a3426]">მოუსმინე{plan?.target != null ? ` — ${noteLabel(plan.target)}` : ''}…</p>
          : spec.kind === 'breath'
            ? <p className="text-[40px] font-black tabular-nums text-[#7a2028]">{breath.toFixed(1)}<span className="text-[16px] text-[#8a7a6a]"> წმ</span></p>
            : (
              <>
                <p className="inline-flex items-center gap-2 text-[14px] font-bold text-[#7a2028]"><Mic className="w-4 h-4" /> ახლა შენ · {left} წმ</p>
                <LiveNote midi={last?.midi ?? null} target={plan?.target ?? null} />
              </>
            )}
      </div>
      {phase === 'take' && spec.kind !== 'breath' && spec.kind !== 'siren' && plan && <Trace frames={frames} target={plan.target} seconds={plan.seconds} />}
      {phase === 'take' && spec.kind === 'siren' && <SirenTrace frames={frames} base={base} />}
      {phase === 'take' && (
        <div className="flex justify-center">
          <Btn kind="ghost" size="sm" icon={<Square />} onClick={() => mic.stop()}>დასრულება</Btn>
        </div>
      )}
    </div>
  );
};

/** the siren's line by its real height (the student's range and an octave over it) */
const SirenTrace: React.FC<{ frames: Frame[]; base: number }> = ({ frames, base }) => {
  const W = 320;
  const H = 110;
  const lo = base - 7;
  const hi = base + 19;
  const t1 = Math.max(10000, frames.length ? frames[frames.length - 1].t : 0);
  let d = '';
  let gap = true;
  for (const f of frames) {
    if (f.midi === null) { gap = true; continue; }
    const y = H - 4 - ((Math.max(lo, Math.min(hi, f.midi)) - lo) / (hi - lo)) * (H - 8);
    d += `${gap ? 'M' : 'L'}${((f.t / t1) * W).toFixed(1)} ${y.toFixed(1)}`;
    gap = false;
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full h-28 rounded-2xl bg-white ring-1 ring-[#e8dcc8]" aria-hidden>
      {[0, 12].map(k => { const y = H - 4 - ((base + k - lo) / (hi - lo)) * (H - 8); return <line key={k} x1={0} x2={W} y1={y} y2={y} stroke="#e8dcc8" strokeDasharray="4 4" />; })}
      <path d={d} fill="none" stroke="#7a2028" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};
