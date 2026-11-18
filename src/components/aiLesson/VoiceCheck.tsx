import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronRight, CircleCheck, Clock, Headphones, Mic, MicOff, Play, Sparkles, Volume2 } from 'lucide-react';
import { MANERA_BASE } from '../../data/maneraLessons';
import { singingSupported } from '../../utils/singCapture';
import { echoTask, judgeSinging, steadyScore, type Frame, type SingTask } from '../../utils/earTrainer';
import type { Timed } from '../../utils/chantClips';
import { liveWord } from '../../utils/aiLesson';
import { noteName } from '../../utils/pearls';
import {
  LEVEL_NAMES, PART_NAMES, checkLine, earLine, levelOfCheck, partOfRange, rangeHeight, rangeLabel, type AiVoice,
} from '../../utils/aiPlan';
import { playAndWait, saveRange, stopSound, useMic, type Range } from '../mastery/trainers/shared';
import { Bar, Button, Card, Dot, Helper, Row, Rows, TopBar, cx } from '../ui2';
import { Bottom, CenterNote, TeacherSays } from './parts';

// „ხმის შემოწმება“ (the AI teacher's step 2; boards ai-testi for the result, idea-diapazoni-0 for the measuring screens):
// about two minutes, one task a screen — the lowest and the highest comfortable note (sung sliding, the member taps the
// note where they stop), a note held five seconds, one note sung back three times, three notes on „ლა“ twice. The
// measuring is the old entry test's (mastery/EntryTest: useMic, steadyScore, echoTask, judgeSinging); only the look is
// new. Then the result in words (utils/aiPlan.ts): the range, the part that suits it, the ear and the level to start at.
// Nothing is saved here — the caller keeps `onDone`'s value. A miss is never called bad: no red, no „wrong“.

export type CheckResult = Omit<AiVoice, 'at'>;
type StepId = 'low' | 'high' | 'hold' | 'echo1' | 'echo3';
type Phase = 'ready' | 'cue' | 'sing' | 'after' | 'quiet';

const STEPS: { id: StepId; head: string; task: string; line: string; rounds: number }[] = [
  { id: 'low', head: 'ხმის ზომა', task: 'იმღერე „ა“ — ნელა ჩამოდი ქვემოთ', line: 'გაჩერდი იმ ნოტზე, რომელიც ჯერ კიდევ არ გიჭირს.', rounds: 1 },
  { id: 'high', head: 'ხმის ზომა', task: 'ახლა ნელა ადი ზემოთ', line: 'გაჩერდი იმ ნოტზე, რომელიც ყვირილის გარეშე გამოგდის.', rounds: 1 },
  { id: 'hold', head: 'ნოტის დაჭერა', task: 'მოუსმინე და დაიჭირე ნოტი', line: 'ჯერ მოუსმინე. მერე იმღერე „ა“ და დაიჭირე ხუთი წამი.', rounds: 1 },
  { id: 'echo1', head: 'გამეორება', task: 'გაიმეორე ეს ნოტი', line: 'ჯერ მოუსმინე. მერე იმღერე „აა“ — სამი წამი.', rounds: 3 },
  { id: 'echo3', head: 'გამეორება', task: 'გაიმეორე სამი ნოტი', line: 'ჯერ მოუსმინე. მერე იმღერე „ლა-ლა-ლა“.', rounds: 2 },
];
export const CHECK_STEP_COUNT = STEPS.length;

const HOLD_SECONDS = 5;
/** a take with fewer voiced frames than this was not heard (≈ a third of a second) */
const HEARD_FRAMES = 8;
/** a range note is kept once this many voiced frames in a row (≈ a third of a second) stay within a semitone */
const STEADY_FRAMES = 8;
const PAUSE_MS = 1100;
const QUIET_LINE = 'ტელეფონი ახლოს მოიტანე ან უფრო წყნარი ადგილი მოძებნე.';

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const voicedOf = (frames: Frame[]) => frames.map(f => f.midi).filter((x): x is number => x !== null);

// ——— the views (everything by props) ———

const CheckHead: React.FC<{ title: string; sub: string; onBack: () => void }> = ({ title, sub, onBack }) => (
  <TopBar title={title} sub={sub} onBack={onBack} className="px-4" />
);

/** before the first step: what will happen, and a quiet „not now“ */
export const CheckStartView: React.FC<{ onBack: () => void; onStart: () => void; onSkip: () => void }> = ({ onBack, onStart, onSkip }) => {
  const say = 'ორ წუთში გავიგებ, როგორ ჟღერს შენი ხმა. უბრალოდ იმღერე, როგორც გამოგდის — აქ შეცდომა არ არსებობს.';
  return (
    <>
      <CheckHead title="ხმის შემოწმება" sub="2 წუთი" onBack={onBack} />
      <div className="flex flex-col gap-3 px-4 pt-0.5 pb-4">
        <TeacherSays text={say} sub="პროგრამა ვარ, არა ადამიანი">{say}</TeacherSays>
        <Rows>
          <Row lead={<Dot icon={<Clock />} />} title="2 წუთი" sub="ხუთი მოკლე ნაბიჯი" right={null} />
          <Row lead={<Dot icon={<Mic />} />} title="მიკროფონი" sub="აპი მოგისმენს" right={null} />
          <Row lead={<Dot icon={<Sparkles />} />} title="შედეგი" sub="რომელი ხმა გიხდება და საიდან დაიწყო" right={null} />
        </Rows>
        <Helper>იმღერე მშვიდად, წყნარ ოთახში.</Helper>
      </div>
      <Bottom>
        <Button full icon={<Play fill="currentColor" />} onClick={onStart}>დაწყება</Button>
        <Button full kind="quiet" onClick={onSkip}>ახლა არა</Button>
      </Bottom>
    </>
  );
};

/** the phone gave no microphone: one calm line and the way on */
export const NoMicView: React.FC<{ onBack: () => void; onSkip: () => void }> = ({ onBack, onSkip }) => (
  <>
    <CheckHead title="ხმის შემოწმება" sub="2 წუთი" onBack={onBack} />
    <CenterNote icon={<MicOff />} title="მიკროფონი არ ჩაირთო">
      ტელეფონმა მიკროფონი არ მოგვცა. ხმას სხვა დროს შევამოწმებთ — მანამდე თავიდან დავიწყებთ.
    </CenterNote>
    <Bottom>
      <Button full icon={<ChevronRight />} onClick={onSkip}>გამოტოვება</Button>
    </Bottom>
  </>
);

/** What one measuring screen shows — the wrapper works it out from the step and the phase. */
export interface StepLook {
  /** 0–4 */
  at: number;
  head: string;
  task: string;
  /** the teacher's short line */
  line: string;
  /** the big round mark: the microphone, the phone playing, a note done well */
  mark: 'mic' | 'listen' | 'good';
  /** the rings breathe while a voice is heard */
  live?: boolean;
  /** the live note, big; `faint` while nothing is heard yet */
  big?: { text: string; faint?: boolean } | null;
  caption?: { text: string; tone?: 'mut' | 'good' | 'near' } | null;
  /** the held note's time gone, 0–1 */
  bar?: number | null;
  rounds?: { done: number; total: number };
  primary: { label: string; icon: 'mic' | 'check'; disabled?: boolean; onClick: () => void };
  secondary?: { label: string; listen?: boolean; disabled?: boolean; onClick: () => void };
  onBack: () => void;
}

/** One measuring screen (board x-idea-diapazoni-0): the big round microphone with soft rings, the task, the teacher's
 *  line, the note heard now, the buttons. */
export const CheckStepView: React.FC<StepLook> = ({
  at, head, task, line, mark, live, big, caption, bar, rounds, primary, secondary, onBack,
}) => {
  const good = mark === 'good';
  return (
    <>
      <CheckHead title={head} sub={`${at + 1} / ${STEPS.length}`} onBack={onBack} />
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-[30px] pt-0.5 pb-28 text-center">
        <span aria-hidden="true" className="relative mb-[30px] flex size-28 shrink-0 items-center justify-center">
          <span className={cx('absolute -inset-[34px] rounded-full transition-colors', good ? 'bg-leaf/5' : 'bg-wine/5', live && 'animate-pulse')} />
          <span className={cx('absolute -inset-4 rounded-full transition-colors', good ? 'bg-leaf/10' : 'bg-wine/10')} />
          <span className={cx('relative flex size-28 items-center justify-center rounded-full text-white transition-colors [&_svg]:size-11',
            good ? 'bg-leaf' : 'bg-wine')}>
            {mark === 'listen' ? <Volume2 /> : good ? <Check strokeWidth={2.5} /> : <Mic />}
          </span>
        </span>
        <h2 className="text-title leading-snug font-bold wrap-break-word">{task}</h2>
        <p className="max-w-[300px] text-body leading-[1.55] text-mut wrap-break-word">{line}</p>
        <div aria-live="polite" className="flex min-h-[74px] flex-col items-center gap-3">
          {big && <div className={cx('mt-1.5 text-hero leading-[1.35] font-bold tabular-nums', big.faint ? 'text-faint' : 'text-wine')}>{big.text}</div>}
          {caption && (
            <div className={cx('text-meta', caption.tone === 'good' ? 'font-bold text-leaf-ink' : caption.tone === 'near' ? 'font-bold text-gold-ink' : 'text-mut')}>
              {caption.text}
            </div>
          )}
          {bar != null && <Bar value={bar} tone={caption?.tone === 'good' ? 'leaf' : 'wine'} h={5} className="-mt-1 w-40" label="რამდენი დრო გავიდა" />}
        </div>
        {rounds && rounds.total > 1 && (
          <div className="flex gap-2" role="img" aria-label={`${Math.min(rounds.done + 1, rounds.total)} / ${rounds.total}`}>
            {Array.from({ length: rounds.total }, (_, i) => (
              <span key={i} className={cx('size-2.5 rounded-full',
                i < rounds.done ? 'bg-wine' : i === rounds.done ? 'bg-surf ring-2 ring-wine' : 'bg-dim')} />
            ))}
          </div>
        )}
      </div>
      <Bottom>
        <Button full icon={primary.icon === 'check' ? <CircleCheck /> : <Mic />} disabled={primary.disabled} onClick={primary.onClick}>
          {primary.label}
        </Button>
        {secondary && (
          <Button full kind="ghost" icon={secondary.listen ? <Headphones /> : undefined} disabled={secondary.disabled} onClick={secondary.onClick}>
            {secondary.label}
          </Button>
        )}
      </Bottom>
    </>
  );
};

/** The check's end (board x-ai-testi): the teacher's words, four lines, the plan or the full test. */
export const VoiceResultView: React.FC<{ v: CheckResult; onPlan: () => void; onFull: () => void; onBack: () => void }> = ({ v, onPlan, onFull, onBack }) => {
  const say = checkLine(v);
  const rows: [string, string][] = [
    ['შენი ხმა', `${rangeLabel(v.low, v.high)} · ${rangeHeight(v.low, v.high)}`],
    ['შეგეფერება', PART_NAMES[v.part]],
    ['სმენა', earLine(v)],
    ['იწყებ', `დონე ${v.level} · ${LEVEL_NAMES[v.level] ?? ''}`],
  ];
  return (
    <>
      <CheckHead title="ხმის შემოწმება" sub="2 წუთი · დასრულდა" onBack={onBack} />
      <div className="flex flex-col gap-3 px-4 pt-0.5 pb-4">
        <TeacherSays text={say}>{say}</TeacherSays>
        <Card pad="none" className="px-[18px] py-1">
          <dl className="divide-y divide-line">
            {rows.map(([k, val]) => (
              <div key={k} className="flex items-baseline gap-2.5 py-[13px]">
                <dt className="w-[104px] shrink-0 text-meta font-semibold text-mut">{k}</dt>
                <dd className="min-w-0 flex-1 text-lead leading-snug font-semibold wrap-break-word">{val}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
      <Bottom>
        <Button full icon={<ChevronRight />} onClick={onPlan}>ვნახოთ ჩემი გეგმა</Button>
        <Button full kind="ghost" onClick={onFull}>სრული ტესტი მინდა · 5 წუთი</Button>
      </Bottom>
    </>
  );
};

// ——— the check itself ———

type Stage = 'start' | 'check' | 'result' | 'nomic';
type After = { word: string; good?: boolean };

export const VoiceCheck: React.FC<{
  onBack: () => void;
  onDone: (v: CheckResult) => void;
  /** the full five-minute test: with the measured value once the check is done, else with none */
  onFull: (v?: CheckResult) => void;
  onSkip: () => void;
}> = ({ onBack, onDone, onFull, onSkip }) => {
  const mic = useMic();
  const [stage, setStage] = useState<Stage>(() => (singingSupported() ? 'start' : 'nomic'));
  const [at, setAt] = useState(0);
  const [phase, setPhase] = useState<Phase>('ready');
  const [heard, setHeard] = useState<number | null>(null);
  const [kept, setKept] = useState<number | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [roundsDone, setRoundsDone] = useState(0);
  const [after, setAfter] = useState<After | undefined>();
  const [result, setResult] = useState<CheckResult | null>(null);

  const atRef = useRef(0);
  const busy = useRef(false);
  const res = useRef<{ low?: number; high?: number; hold?: number; echo1?: number; echo3?: number }>({});
  const base = useRef<number>(MANERA_BASE.low);
  const task = useRef<SingTask | null>(null);
  const right = useRef(0);
  const done = useRef(0);
  const silent = useRef(0);
  const alive = useRef(true);
  const timers = useRef<number[]>([]);
  // the range steps: the last steady note, the voiced frames in a row, the member's tap
  const steady = useRef<number | null>(null);
  const run = useRef<number[]>([]);
  const gap = useRef(0);
  const decided = useRef(false);
  const rangeFor = useRef(-1);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; timers.current.forEach(t => window.clearTimeout(t)); stopSound(); };
  }, []);
  const later = (fn: () => void, ms = PAUSE_MS) => { timers.current.push(window.setTimeout(() => { if (alive.current) fn(); }, ms)); };

  // the held note: the middle of the measured range
  const holdNote = () => Math.round(((res.current.low ?? base.current) + (res.current.high ?? base.current + 9)) / 2);
  const roundTask = () => {
    if (!task.current) task.current = echoTask(STEPS[atRef.current].id === 'echo3' ? 3 : 1, 'scale', base.current, Math.random);
    return task.current;
  };
  const cueOf = (): Timed[] => (STEPS[atRef.current].id === 'hold' ? [[0, 1.6, holdNote()]] : roundTask().cue);

  const nextStep = () => {
    const n = atRef.current + 1;
    task.current = null; right.current = 0; done.current = 0; silent.current = 0;
    setRoundsDone(0); setHeard(null); setKept(null); setProgress(null); setAfter(undefined);
    if (n >= STEPS.length) { finish(); return; }
    atRef.current = n;
    setAt(n);
    setPhase('ready');
  };

  const finish = () => {
    const r = res.current;
    const low = r.low ?? base.current;
    const high = r.high ?? low + 7;
    const ear = { hold: r.hold ?? 0, echo1: r.echo1 ?? 0, echo3: r.echo3 ?? 0 };
    setResult({ low, high, part: partOfRange(low, high), ...ear, level: levelOfCheck(ear) });
    setStage('result');
  };

  // ——— the range: the microphone listens until the member taps the note where they stopped ———

  const clearRange = () => { steady.current = null; run.current = []; gap.current = 0; setKept(null); };
  const track = (f: Frame) => {
    setHeard(f.midi);
    if (f.midi === null) {
      if (++gap.current > 3) run.current = [];
      return;
    }
    gap.current = 0;
    run.current = [...run.current, f.midi].slice(-STEADY_FRAMES);
    const r = run.current;
    if (r.length === STEADY_FRAMES && Math.max(...r) - Math.min(...r) <= 1) {
      const m = Math.round(median(r));
      if (m !== steady.current) { steady.current = m; setKept(m); }
    }
  };
  const listenRange = async () => {
    const myAt = atRef.current;
    decided.current = false;
    clearRange();
    setHeard(null);
    setPhase('sing');
    while (alive.current && atRef.current === myAt && !decided.current) {
      const took = await mic.take(120, { onFrame: track, stopWhen: () => decided.current || !alive.current });
      if (!alive.current) return;
      if (!took) { setStage('nomic'); return; }
    }
    if (!alive.current || !decided.current || steady.current === null) return;
    const m = steady.current;
    const id = STEPS[myAt].id as 'low' | 'high';
    res.current[id] = m;
    if (id === 'high') {
      // the two in order, then the exercises' voice follows the range (as the entry test's range step)
      const lo = Math.min(res.current.low ?? m, m);
      const hi = Math.max(res.current.low ?? m, m);
      res.current.low = lo; res.current.high = hi;
      const r: Range = (lo + hi) / 2 >= 61 ? 'high' : 'low';
      saveRange(r);
      base.current = MANERA_BASE[r];
    }
    nextStep();
  };
  useEffect(() => {
    if (stage !== 'check' || at > 1 || rangeFor.current === at) return;
    rangeFor.current = at;
    void listenRange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, at]);

  // ——— the held note and the echoes: the phone plays, then listens ———

  const listen = async () => {
    if (busy.current) return;
    busy.current = true;
    setPhase('cue');
    await playAndWait(cueOf(), 0.05);
    busy.current = false;
    if (alive.current) setPhase('ready');
  };

  const sing = async () => {
    if (busy.current) return;
    busy.current = true;
    const step = STEPS[atRef.current];
    setAfter(undefined); setHeard(null); setProgress(null);
    setPhase('cue');
    await playAndWait(cueOf(), step.id === 'hold' ? 0.05 : 0.1);
    if (!alive.current) return;
    setPhase('sing');
    const echo = step.id !== 'hold';
    const k = echo ? roundTask().target.length : 0;
    const seconds = echo ? (k === 1 ? 3.2 : 1.4 + k * 0.85) : HOLD_SECONDS;
    const took = await mic.take(seconds, {
      onFrame: f => { setHeard(f.midi); if (!echo) setProgress(Math.min(1, f.t / (seconds * 1000))); },
      // the echoes stop once the notes are sung (the old entry test's rule)
      stopWhen: echo ? all => {
        const voiced = all.filter(f => f.midi !== null).length;
        if (k === 1) return voiced >= 28;
        const tail = all.slice(-16);
        return voiced >= k * 8 && tail.length === 16 && tail.every(f => f.midi === null);
      } : undefined,
    });
    busy.current = false;
    if (!alive.current) return;
    if (!took) { setStage('nomic'); return; }
    judge(step.id, step.rounds, took.frames);
  };

  const judge = (id: StepId, rounds: number, frames: Frame[]) => {
    const voiced = voicedOf(frames);
    setProgress(null);
    // not heard: once more (a second silence counts as it is)
    if (voiced.length < HEARD_FRAMES && silent.current === 0) { silent.current = 1; setPhase('quiet'); return; }
    if (id === 'hold') {
      const share = steadyScore(frames, holdNote(), HOLD_SECONDS) / 100;
      res.current.hold = share;
      setAfter(share >= 0.6 ? { word: 'კარგად დაიჭირე!', good: true } : { word: 'ჩავინიშნე. გავაგრძელოთ.' });
      setPhase('after');
      later(nextStep);
      return;
    }
    const ok = voiced.length >= HEARD_FRAMES && judgeSinging(roundTask().target, frames).hits.every(Boolean);
    if (ok) right.current++;
    done.current++;
    silent.current = 0;
    setRoundsDone(done.current);
    setAfter(ok ? { word: 'ზუსტად!', good: true } : { word: 'გავაგრძელოთ.' });
    setPhase('after');
    if (done.current >= rounds) {
      if (id === 'echo1' || id === 'echo3') res.current[id] = right.current / rounds;
      later(nextStep);
    } else {
      later(() => { task.current = null; void sing(); });
    }
  };

  if (stage === 'nomic') return <NoMicView onBack={onBack} onSkip={onSkip} />;
  if (stage === 'start') return <CheckStartView onBack={onBack} onSkip={onSkip} onStart={() => { atRef.current = 0; setAt(0); setPhase('ready'); setStage('check'); }} />;
  if (stage === 'result' && result) {
    return <VoiceResultView v={result} onPlan={() => onDone(result)} onFull={() => onFull(result)} onBack={onBack} />;
  }

  const step = STEPS[at];
  const look = { at, head: step.head, task: step.task, line: step.line, onBack };
  if (step.id === 'low' || step.id === 'high') {
    const shown = kept ?? heard;
    return (
      <CheckStepView {...look} mark="mic" live={heard !== null}
        big={shown !== null ? { text: noteName(shown) } : { text: '…', faint: true }}
        caption={{ text: heard !== null ? 'ახლა გესმის' : kept !== null ? 'ბოლო ნოტი' : 'გისმენ…' }}
        primary={{ label: step.id === 'low' ? 'ეს არის ჩემი დაბალი ნოტი' : 'ეს არის ჩემი მაღალი ნოტი', icon: 'check',
          disabled: kept === null, onClick: () => { if (steady.current !== null) decided.current = true; } }}
        secondary={{ label: 'თავიდან', onClick: clearRange }} />
    );
  }
  const goal = step.id === 'hold' ? holdNote() : null;
  const word = phase === 'sing' && goal !== null ? liveWord(heard, goal, 0.5) : '';
  const busyNow = phase === 'cue' || phase === 'sing' || phase === 'after';
  return (
    <CheckStepView {...look}
      task={phase === 'quiet' ? 'ხმა ვერ გავიგონე' : step.task}
      line={phase === 'quiet' ? QUIET_LINE : phase === 'cue' ? 'მოუსმინე…' : phase === 'after' && after ? after.word : step.line}
      mark={phase === 'cue' ? 'listen' : phase === 'after' && after?.good ? 'good' : 'mic'}
      live={phase === 'sing' && heard !== null}
      big={phase === 'sing' ? (heard !== null ? { text: noteName(heard) } : { text: '…', faint: true }) : null}
      caption={phase === 'sing'
        ? word ? { text: `${word}${word === 'ოდნავ მაღლა' ? ' ↑' : word === 'ოდნავ დაბლა' ? ' ↓' : ''}`, tone: word === 'ზუსტად' ? 'good' : 'near' }
          : { text: heard !== null ? 'ახლა გესმის' : 'გისმენ…' }
        : null}
      bar={phase === 'sing' && step.id === 'hold' ? progress : null}
      rounds={{ done: roundsDone, total: step.rounds }}
      primary={{ label: phase === 'quiet' ? 'კიდევ ვცდი' : phase === 'sing' ? 'გისმენ…' : 'ვმღერი', icon: 'mic', disabled: busyNow, onClick: () => void sing() }}
      secondary={{ label: 'მოვუსმენ', listen: true, disabled: busyNow, onClick: () => void listen() }} />
  );
};
