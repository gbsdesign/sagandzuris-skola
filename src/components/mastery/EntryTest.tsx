import React, { useEffect, useRef, useState } from 'react';
import { Mic, Play, Sparkles, Volume2 } from 'lucide-react';
import { useAuth } from '../../context';
import { Btn, Sheet } from '../ui/kit';
import { MASTERY_LEVELS } from '../../data/masteryPath';
import { echoTask, higherQuiz, intervalQuiz, judgeSinging, steadyScore, type Frame, type Quiz, type SingTask } from '../../utils/earTrainer';
import { placement, type EntryResult } from '../../utils/masteryPath';
import { LiveNote, MicNote, RangeSwitch, playAndWait, stopSound, useMic, useVoiceRange, saveRange, type Range } from './trainers/shared';
import { saveStart } from './useMasteryPath';

// „საწყისი ტესტი“ (5 minutes): where the student starts on the path. The voice's range (lowest and highest comfortable
// note → the low or high voice of every exercise), a note held five seconds, four „higher or lower“, one and three notes
// sung back, three intervals — then utils/masteryPath.ts `placement` names the level (0, 1 or 2). The student may still
// start from 0.

type Step = 'intro' | 'range' | 'hold' | 'higher' | 'echo1' | 'echo3' | 'intervals' | 'result';
const ORDER: Step[] = ['range', 'hold', 'higher', 'echo1', 'echo3', 'intervals'];

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

export const EntryTest: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => (
  <Sheet open={open} onClose={onClose} title="საწყისი ტესტი">
    {open && <TestBody onClose={onClose} />}
  </Sheet>
);

const TestBody: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user } = useAuth();
  const { range, base, setRange } = useVoiceRange();
  const [step, setStep] = useState<Step>('intro');
  const [score, setScore] = useState<Partial<EntryResult>>({});
  useEffect(() => () => stopSound(), []);
  const done = (key: keyof EntryResult, share: number, next: Step) => { setScore(s => ({ ...s, [key]: share })); setStep(next); };
  const at = ORDER.indexOf(step);

  if (step === 'intro') {
    return (
      <div className="space-y-4 text-center sg-in">
        <Sparkles className="mx-auto w-9 h-9 text-[#7a2028]" />
        <p className="text-[15px] leading-relaxed text-[#2a2017]">ხუთი მოკლე ნაბიჯი — დაახლოებით 5 წუთი. აპი მოგისმენს და გეტყვის, რომელი დონიდან დაიწყო. იმღერე მშვიდად, წყნარ ოთახში.</p>
        <Btn size="lg" full icon={<Play />} onClick={() => setStep('range')}>დაწყება</Btn>
      </div>
    );
  }
  if (step === 'result') {
    const s: EntryResult = { hold: 0, higher: 0, echo1: 0, echo3: 0, intervals: 0, ...score };
    const lvl = placement(s);
    const lines: [string, number][] = [['ნოტის დაჭერა', s.hold], ['მაღლა თუ დაბლა', s.higher], ['ერთი ნოტის გამეორება', s.echo1], ['სამი ნოტის გამეორება', s.echo3], ['ინტერვალები', s.intervals]];
    return (
      <div className="space-y-4 sg-in">
        <div className="text-center">
          <p className="text-[13px] font-bold text-[#8a7a6a]">გირჩევთ</p>
          <p className="font-serif-ge text-[22px] font-bold text-[#4a3426]">დონე {lvl} · {MASTERY_LEVELS[lvl].name}</p>
          <p className="mt-1 text-[13.5px] text-[#4a3426]">{MASTERY_LEVELS[lvl].goal}</p>
        </div>
        <ul className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] divide-y divide-[#f1e8d9]">
          {lines.map(([name, v]) => (
            <li key={name} className="flex items-center gap-3 px-4 py-2.5">
              <span className="flex-1 text-[14px] text-[#2a2017]">{name}</span>
              <span className={`text-[14px] font-black tabular-nums ${v >= 0.75 ? 'text-emerald-700' : v >= 0.5 ? 'text-amber-700' : 'text-rose-700'}`}>{Math.round(v * 100)}%</span>
            </li>
          ))}
        </ul>
        <Btn full size="lg" onClick={() => { saveStart(lvl, range, user?.uid); onClose(); }}>დონე {lvl}-დან დაწყება</Btn>
        {lvl > 0 && <Btn full kind="ghost" onClick={() => { saveStart(0, range, user?.uid); onClose(); }}>მაინც 0-დან დავიწყებ</Btn>}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5" aria-label={`ნაბიჯი ${at + 1} / ${ORDER.length}`}>
        {ORDER.map((s, i) => <span key={s} className={`h-1.5 flex-1 rounded-full ${i < at ? 'bg-emerald-600' : i === at ? 'bg-[#7a2028]' : 'bg-[#e8dcc8]'}`} />)}
      </div>
      {step === 'range' && <RangeStep range={range} setRange={setRange} onDone={() => setStep('hold')} />}
      {step === 'hold' && <HoldStep base={base} onDone={v => done('hold', v, 'higher')} />}
      {step === 'higher' && <QuizStep key="h" title="მაღლა თუ დაბლა?" n={4} make={() => higherQuiz(base, Math.random)} onDone={v => done('higher', v, 'echo1')} />}
      {step === 'echo1' && <EchoStep key="e1" title="გაიგონე და გაიმეორე — ერთი ნოტი" n={3} make={() => echoTask(1, 'scale', base, Math.random)} onDone={v => done('echo1', v, 'echo3')} />}
      {step === 'echo3' && <EchoStep key="e3" title="სამი ნოტი — გაიმეორე „ლა“-ზე" n={2} make={() => echoTask(3, 'scale', base, Math.random)} onDone={v => done('echo3', v, 'intervals')} />}
      {step === 'intervals' && <QuizStep key="i" title="ოქტავა, კვინტა თუ კვარტა?" n={3} make={() => intervalQuiz(base, [5, 7, 12], Math.random)} onDone={v => done('intervals', v, 'result')} />}
    </div>
  );
};

/** the voice's range: the lowest and the highest comfortable note → the low or the high voice */
const RangeStep: React.FC<{ range: Range; setRange: (r: Range) => void; onDone: () => void }> = ({ range, setRange, onDone }) => {
  const mic = useMic();
  const [which, setWhich] = useState<'low' | 'high' | 'done'>('low');
  const [now, setNow] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const found = useRef<{ low?: number; high?: number }>({});
  const listen = async () => {
    setBusy(true);
    const took = await mic.take(4, { onFrame: f => setNow(f.midi) });
    setBusy(false);
    setNow(null);
    const v = took?.frames.map(f => f.midi).filter((x): x is number => x !== null) ?? [];
    if (v.length < 10) return;
    found.current[which === 'low' ? 'low' : 'high'] = median(v);
    if (which === 'low') { setWhich('high'); return; }
    const mid = ((found.current.low ?? 50) + (found.current.high ?? 62)) / 2;
    const r: Range = mid >= 61 ? 'high' : 'low';
    setRange(r);
    saveRange(r);
    setWhich('done');
  };
  return (
    <div className="space-y-3 text-center sg-in">
      <p className="text-[16px] font-bold text-[#4a3426]">შენი ხმა</p>
      {which !== 'done' ? (
        <>
          <p className="text-[14px] leading-relaxed text-[#4a3426]">
            {which === 'low' ? 'იმღერე „ა“ ყველაზე დაბალ ნოტზე, რომელიც თავისუფლად გამოგდის — 3 წამი.' : 'ახლა ყველაზე მაღალი, რომელიც ყვირილის გარეშე გამოგდის.'}
          </p>
          {busy && <LiveNote midi={now} />}
          <MicNote error={mic.error} />
          {mic.error ? (
            <>
              <p className="text-[13px] text-[#8a7a6a]">აირჩიე თვითონ:</p>
              <RangeSwitch range={range} onChange={setRange} />
              <Btn full onClick={onDone}>შემდეგი</Btn>
            </>
          ) : <Btn full size="lg" icon={<Mic />} disabled={busy} onClick={() => void listen()}>{busy ? 'გისმენ…' : 'ვიმღერებ'}</Btn>}
        </>
      ) : (
        <>
          <p className="text-[14px] text-[#4a3426]">სავარჯიშოები შენს ხმაზე იჟღერებს — შეცვლა შეგიძლია:</p>
          <RangeSwitch range={range} onChange={setRange} />
          <Btn full onClick={onDone}>შემდეგი</Btn>
        </>
      )}
    </div>
  );
};

/** a note held five seconds in its band */
const HoldStep: React.FC<{ base: number; onDone: (share: number) => void }> = ({ base, onDone }) => {
  const mic = useMic();
  const note = base + 4;
  const [phase, setPhase] = useState<'ready' | 'cue' | 'sing'>('ready');
  const [now, setNow] = useState<number | null>(null);
  const go = async () => {
    setPhase('cue');
    await playAndWait([[0, 1.6, note]], 0.05);
    if (mic.error) { onDone(0.6); return; }
    setPhase('sing');
    const took = await mic.take(5, { onFrame: f => setNow(f.midi) });
    onDone(took ? steadyScore(took.frames as Frame[], note, 5) / 100 : 0.6);
  };
  return (
    <div className="space-y-3 text-center sg-in">
      <p className="text-[16px] font-bold text-[#4a3426]">ნოტის დაჭერა</p>
      <p className="text-[14px] leading-relaxed text-[#4a3426]">ნოტი ჟღერს — შეუერთდი „ა“-ზე და დაიჭირე 5 წამი.</p>
      {phase === 'sing' && <LiveNote midi={now} target={note} />}
      {phase === 'cue' && <p className="inline-flex items-center gap-2 text-[14px] font-bold text-[#4a3426]"><Volume2 className="w-4 h-4" /> მოუსმინე…</p>}
      <MicNote error={mic.error} />
      {phase === 'ready' && <Btn full size="lg" icon={<Play />} onClick={() => void go()}>დაწყება</Btn>}
    </div>
  );
};

/** n questions by ear, the share right */
const QuizStep: React.FC<{ title: string; n: number; make: () => Quiz; onDone: (share: number) => void }> = ({ title, n, make, onDone }) => {
  const [q, setQ] = useState<Quiz | null>(null);
  const [right, setRight] = useState(0);
  const [asked, setAsked] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const ask = () => { const next = make(); setQ(next); setPicked(null); void playAndWait(next.play); };
  const answer = (i: number) => {
    if (!q || picked !== null) return;
    setPicked(i);
    const r = right + (i === q.right ? 1 : 0);
    setRight(r);
    window.setTimeout(() => {
      const a = asked + 1;
      setAsked(a);
      if (a >= n) onDone(r / n); else ask();
    }, 900);
  };
  return (
    <div className="space-y-3 text-center sg-in">
      <p className="text-[16px] font-bold text-[#4a3426]">{title}</p>
      {!q ? <Btn full size="lg" icon={<Play />} onClick={ask}>მოსმენა</Btn> : (
        <>
          <p className="text-[13px] text-[#8a7a6a] tabular-nums">{Math.min(asked + 1, n)} / {n}</p>
          <Btn kind="soft" size="sm" icon={<Volume2 />} onClick={() => void playAndWait(q.play)}>კიდევ</Btn>
          <div className={`grid gap-2 ${q.options.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {q.options.map((o, i) => (
              <button key={i} type="button" disabled={picked !== null} onClick={() => answer(i)}
                className={`min-h-12 px-2 rounded-2xl text-[14px] font-bold ring-1 transition cursor-pointer ${picked === null ? 'bg-white ring-[#e8dcc8]' : i === q.right ? 'bg-emerald-600 text-white ring-emerald-600' : picked === i ? 'bg-rose-500 text-white ring-rose-500' : 'bg-white ring-[#e8dcc8] opacity-60'}`}>
                {o}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/** n rounds of singing back, the share right (all notes of a round) */
const EchoStep: React.FC<{ title: string; n: number; make: () => SingTask; onDone: (share: number) => void }> = ({ title, n, make, onDone }) => {
  const mic = useMic();
  const [phase, setPhase] = useState<'ready' | 'cue' | 'sing' | 'self'>('ready');
  const [now, setNow] = useState<number | null>(null);
  const right = useRef(0);
  const asked = useRef(0);
  const [round, setRound] = useState(0);
  const after = (ok: boolean) => {
    if (ok) right.current++;
    asked.current++;
    setRound(asked.current);
    if (asked.current >= n) onDone(right.current / n); else void go();
  };
  const go = async () => {
    const t = make();
    setPhase('cue');
    await playAndWait(t.cue, 0.1);
    if (mic.error) { setPhase('self'); return; }
    setPhase('sing');
    const k = t.target.length;
    const took = await mic.take(k === 1 ? 3.2 : 1.4 + k * 0.85, {
      onFrame: f => setNow(f.midi),
      stopWhen: all => {
        const voiced = all.filter(f => f.midi !== null).length;
        if (k === 1) return voiced >= 28;
        const tail = all.slice(-16);
        return voiced >= k * 8 && tail.length === 16 && tail.every(f => f.midi === null);
      },
    });
    if (!took) { setPhase('self'); return; }
    const { hits } = judgeSinging(t.target, took.frames);
    after(hits.every(Boolean));
  };
  return (
    <div className="space-y-3 text-center sg-in">
      <p className="text-[16px] font-bold text-[#4a3426]">{title}</p>
      {phase !== 'ready' && <p className="text-[13px] text-[#8a7a6a] tabular-nums">{Math.min(round + 1, n)} / {n}</p>}
      {phase === 'ready' && <Btn full size="lg" icon={<Play />} onClick={() => void go()}>დაწყება</Btn>}
      {phase === 'cue' && <p className="inline-flex items-center gap-2 text-[14px] font-bold text-[#4a3426]"><Volume2 className="w-4 h-4" /> მოუსმინე…</p>}
      {phase === 'sing' && <><p className="text-[14px] font-bold text-[#7a2028]">ახლა შენ</p><LiveNote midi={now} /></>}
      {phase === 'self' && (
        <>
          <MicNote error={mic.error ?? 'off'} />
          <div className="grid grid-cols-2 gap-2">
            <Btn kind="ghost" onClick={() => after(false)}>ვერ</Btn>
            <Btn onClick={() => after(true)}>სწორად ვიმღერე</Btn>
          </div>
        </>
      )}
    </div>
  );
};

