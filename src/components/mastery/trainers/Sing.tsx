import React, { useEffect, useRef, useState } from 'react';
import { Mic, Play, Volume2 } from 'lucide-react';
import { Btn } from '../../ui/kit';
import { StillNotes, type NoteTone } from '../../../pages/games/mprinavi/Staff';
import type { TrainerSpec } from '../../../data/masteryDrills';
import {
  ROUNDS, centsOff, chordSingTask, echoTask, homeTask, intervalSingTask, judgeSinging, notesNeeded, readTask, type Frame, type SingTask,
} from '../../../utils/earTrainer';
import { Dots, LiveNote, MicNote, RangeSwitch, RunEnd, Verdict, noteLabel, playAndWait, stopSound, useFinish, useMic, useVoiceRange } from './shared';

// Singing checked by the microphone: a cue sounds (notes to sing back, a root for an interval, a chord, a chant's opening
// over its home note, „დო“ before a note on the staff), then the student sings and the app hears which notes were right —
// an octave off counts. Where the microphone cannot be used, the student judges themself.

type SingSpec = Extract<TrainerSpec, { kind: 'echo' | 'interval-sing' | 'home' | 'chord-sing' | 'read' }>;
type Task = SingTask & { shown?: number[]; ref?: number };

const makeTask = (spec: SingSpec, base: number): Task => {
  switch (spec.kind) {
    case 'echo': return echoTask(spec.notes, spec.from, base, Math.random);
    case 'interval-sing': return intervalSingTask(base, spec.set, !!spec.both, Math.random);
    case 'home': return homeTask(base, Math.random);
    case 'chord-sing': return chordSingTask(base, Math.random);
    case 'read': return readTask(spec.notes, base, Math.random);
  }
};

const listenSeconds = (spec: SingSpec, n: number) =>
  n === 1 ? 3.2 : spec.kind === 'echo' && spec.from === 'turn' ? 1.4 + n * 0.5 : 1.4 + n * 0.85;

type Phase = 'cue' | 'sing' | 'judged' | 'self';
interface Judged { ok: boolean; hits: boolean[]; sung: number[]; cents?: number | null; self?: boolean }

export const SingRun: React.FC<{ drillId: string; spec: SingSpec; intro: string }> = ({ drillId, spec, intro }) => {
  const { range, base, setRange } = useVoiceRange();
  const { best, finish } = useFinish(drillId);
  const mic = useMic();
  const [results, setResults] = useState<boolean[]>([]);
  const [task, setTask] = useState<Task | null>(null);
  const [phase, setPhase] = useState<Phase>('cue');
  const [now, setNow] = useState<number | null>(null);
  const [judged, setJudged] = useState<Judged | null>(null);
  const [ended, setEnded] = useState(false);
  const live = useRef(true);
  useEffect(() => () => { live.current = false; stopSound(); }, []);
  const strict = spec.kind === 'interval-sing' && !!spec.strict;

  const run = async (t: Task) => {
    setPhase('cue');
    setJudged(null);
    setNow(null);
    await playAndWait(t.cue, 0.1);
    if (!live.current) return;
    if (mic.error) { setPhase('self'); return; }
    setPhase('sing');
    const n = t.target.length;
    const took = await mic.take(listenSeconds(spec, n), {
      onFrame: f => setNow(f.midi),
      stopWhen: all => {
        const voiced = all.filter(f => f.midi !== null).length;
        if (n === 1) return voiced >= 28;
        const tail = all.slice(-16);
        return voiced >= n * 8 && tail.length === 16 && tail.every(f => f.midi === null);
      },
    });
    if (!live.current) return;
    if (!took) { setPhase('self'); return; }
    const frames: Frame[] = took.frames;
    let j: Judged;
    if (strict) {
      const cents = centsOff(t.target[0], frames);
      j = { ok: cents !== null && Math.abs(cents) <= 20, hits: [cents !== null && Math.abs(cents) <= 20], sung: [], cents };
    } else {
      const { hits, sung } = judgeSinging(t.target, frames);
      j = { ok: hits.filter(Boolean).length >= notesNeeded(n), hits, sung };
    }
    setJudged(j);
    setResults(r => [...r, j.ok]);
    setPhase('judged');
  };
  const ask = () => { const t = makeTask(spec, base); setTask(t); void run(t); };
  const self = (ok: boolean) => { setJudged({ ok, hits: task!.target.map(() => ok), sung: [], self: true }); setResults(r => [...r, ok]); setPhase('judged'); };
  const next = () => {
    if (results.length >= ROUNDS) {
      finish(Math.round((100 * results.filter(Boolean).length) / ROUNDS));
      setEnded(true);
      return;
    }
    ask();
  };

  if (ended) {
    return <RunEnd pct={Math.round((100 * results.filter(Boolean).length) / ROUNDS)} best={best} detail={<>{results.filter(Boolean).length} / {ROUNDS} სწორად</>} onAgain={() => { setEnded(false); setResults([]); setTask(null); }} />;
  }
  if (!task) {
    return (
      <div className="space-y-4 text-center sg-in">
        <p className="text-[15px] leading-relaxed text-[#2a2017]">{intro}</p>
        <RangeSwitch range={range} onChange={setRange} />
        <MicNote error={mic.error} />
        <Btn size="lg" full icon={<Play />} onClick={ask}>დაწყება · {ROUNDS} რაუნდი</Btn>
      </div>
    );
  }

  const n = task.target.length;
  const tones: NoteTone[] | undefined = task.shown && judged ? ['plain', ...judged.hits.map(h => (h ? 'right' as const : 'wrong' as const))] : undefined;
  return (
    <div className="space-y-4 sg-in">
      <Dots results={results} total={ROUNDS} />
      {task.label && <p className="text-center text-[17px] font-bold text-[#7a2028]">{task.label}</p>}
      {task.shown && task.ref !== undefined && (
        <div className="mx-auto max-w-[340px]">
          <StillNotes clef="treble" notes={[task.ref, ...task.shown]} tones={tones} labels={['დო', ...task.shown.map(() => null)]} width={300} />
        </div>
      )}
      <div className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3 text-center">
        {phase === 'cue' && <p className="text-[15px] font-bold text-[#4a3426] inline-flex items-center gap-2"><Volume2 className="w-5 h-5 text-[#7a2028]" /> მოუსმინე…</p>}
        {phase === 'sing' && (
          <>
            <p className="text-[15px] font-bold text-[#7a2028] inline-flex items-center gap-2"><Mic className="w-5 h-5" /> ახლა შენ — {n === 1 ? 'იმღერე' : `იმღერე ${n} ნოტი`}</p>
            <LiveNote midi={now} target={n === 1 ? task.target[0] : null} />
          </>
        )}
        {phase === 'self' && (
          <div className="space-y-2.5">
            <MicNote error={mic.error ?? 'off'} />
            <p className="text-[14px] text-[#4a3426]">იმღერე და შეაფასე:</p>
            <div className="grid grid-cols-2 gap-2">
              <Btn kind="ghost" onClick={() => self(false)}>ვერ</Btn>
              <Btn onClick={() => self(true)}>სწორად ვიმღერე</Btn>
            </div>
          </div>
        )}
        {phase === 'judged' && judged && !judged.self && (
          <p className="text-[14px] text-[#4a3426]">
            {strict && judged.cents != null
              ? <>შენ: <b>{judged.cents === 0 ? 'ზუსტად' : `${Math.abs(judged.cents)} ცენტით ${judged.cents > 0 ? 'მაღლა' : 'დაბლა'}`}</b></>
              : judged.sung.length ? <>შენ: <b>{judged.sung.slice(0, 8).map(noteLabel).join(' · ')}</b></> : 'ხმა არ გაისმა — უფრო ახლოს და ხმამაღლა.'}
          </p>
        )}
        {phase === 'judged' && judged?.self && <p className="text-[14px] text-[#8a7a6a]">თვითშეფასება</p>}
      </div>
      {phase === 'judged' && judged && (
        <>
          <Verdict ok={judged.ok}>
            {n === 1 ? <>ნოტი: <b>{noteLabel(task.target[0])}</b></> : <>{judged.hits.filter(Boolean).length} / {n} ნოტი · <b>{task.target.map(noteLabel).join(' · ')}</b></>}
            {task.from && <p className="text-[12.5px] opacity-80">საგალობლიდან: {task.from}</p>}
          </Verdict>
          <div className="grid grid-cols-2 gap-2">
            <Btn kind="ghost" icon={<Volume2 />} onClick={() => void playAndWait(task.cue)}>მოსმენა</Btn>
            <Btn onClick={next}>{results.length >= ROUNDS ? 'შედეგი' : 'შემდეგი'}</Btn>
          </div>
        </>
      )}
    </div>
  );
};
