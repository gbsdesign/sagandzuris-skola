import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, Check, CheckCircle2, Clock, Dumbbell, Headphones, Lightbulb, Mic, Pause, Play, RotateCcw, Send, SkipForward, Square, Trash2, Volume2, VolumeX, Wind } from 'lucide-react';
import { useAuth } from '../../context';
import { Btn, IconBtn, Sheet, Tabs } from '../ui/kit';
import { MANERA_BASE, type ManeraExercise, type ManeraStep } from '../../data/maneraLessons';
import { findDrill, type Drill } from '../../data/vocalDrills';
import { playLessonNotes, stopLessonNotes } from '../../utils/chantSynth';
import { markDrillDone, useManeraPractice } from '../../utils/maneraPractice';
import { MAX_TAKE_SECONDS, saveDrillTake } from '../../utils/drillTakes';
import { singingSupported, startSinging, type SingSession } from '../../utils/singCapture';
import { noteName } from '../../utils/pearls';
import { triggerHaptic } from '../../utils/haptics';

type Tab = 'lesson' | 'exercise';
type Range = keyof typeof MANERA_BASE;
const RANGE_KEY = 'sg-manera-voice';
const PART_KEY = 'sg-drill-part';
const SOUND_KEY = 'sg-manera-sound';
const BREATH = 3; // seconds to breathe between rounds
const PART_NAMES = ['I ხმა', 'II ხმა', 'III ხმა (ბანი)'];

const load = (key: string, fallback: string) => { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } };
const save = (key: string, v: string) => { try { localStorage.setItem(key, v); } catch { /* storage off */ } };

// One drill opened whole (a tip of „რჩევები“ or an exercise of the groups, data/vocalDrills.ts): „გაკვეთილი“ to read
// and „სავარჯიშო“ to do with a timer — the synth holds the step's notes (or the other two voices), a click keeps the
// beat, and the microphone shows how close the student is to the note and records the take for the teachers.
// Nothing sounds and the microphone stays off until the student presses.
export const DrillSheet: React.FC<{ drillId: string | null; label?: string; startTab?: Tab; onClose: () => void }> = ({ drillId, label, startTab = 'lesson', onClose }) => {
  const [tab, setTabState] = useState<Tab>(startTab);
  const top = useRef<HTMLDivElement>(null);
  useEffect(() => { if (drillId) setTabState(startTab); }, [drillId, startTab]);
  // a new tab starts at its top, not where the other one was scrolled to
  const setTab = (t: Tab) => { setTabState(t); top.current?.scrollIntoView({ block: 'start' }); };
  const drill = findDrill(drillId);
  return (
    <Sheet open={!!drill} onClose={onClose} wide title={drill ? <>{label && <span className="text-[#c4b49c] tabular-nums mr-1.5">{label}</span>}{drill.title}</> : ''}>
      {drill && (
        <div ref={top} className="space-y-4 text-[#2a2017] scroll-mt-4">
          <Tabs<Tab> cols={2} value={tab} onChange={setTab} items={[
            { id: 'lesson', label: 'გაკვეთილი', Icon: BookOpen },
            { id: 'exercise', label: 'სავარჯიშო', Icon: Dumbbell },
          ]} />
          {tab === 'lesson'
            ? <LessonView drill={drill} onExercise={() => setTab('exercise')} />
            : <ExerciseView key={drill.id} drillId={drill.id} exercise={drill.exercise} />}
        </div>
      )}
    </Sheet>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section>
    <h4 className="mb-1.5 text-[12px] font-bold uppercase tracking-wide text-[#8a7a6a]">{title}</h4>
    {children}
  </section>
);

const LessonView: React.FC<{ drill: Drill; onExercise: () => void }> = ({ drill, onExercise }) => {
  const { lesson, exercise, advice } = drill;
  return (
    <div className="space-y-5 sg-in">
      <p className="text-[15px] leading-relaxed">{lesson.why}</p>

      <Section title="როგორ ვაკეთებთ">
        <ol className="space-y-2.5">
          {lesson.how.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-6 h-6 shrink-0 rounded-full bg-[#7a2028] text-[#fbf6ec] text-[12px] font-bold flex items-center justify-center tabular-nums">{i + 1}</span>
              <span className="text-[14px] leading-relaxed pt-0.5">{s}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="ხშირი შეცდომები">
        <ul className="space-y-1.5">
          {lesson.mistakes.map((s, i) => (
            <li key={i} className="flex gap-2.5 text-[14px] leading-relaxed">
              <span className="mt-[9px] w-1.5 h-1.5 shrink-0 rounded-full bg-rose-500" aria-hidden />
              {s}
            </li>
          ))}
        </ul>
      </Section>

      <div className="rounded-2xl bg-emerald-50 ring-1 ring-emerald-200 px-4 py-3">
        <p className="flex items-center gap-1.5 text-[13px] font-bold text-emerald-800"><CheckCircle2 className="w-4 h-4" /> შეამოწმე თავი</p>
        <p className="mt-1 text-[14px] leading-relaxed text-[#2a2017]">{lesson.check}</p>
      </div>

      {advice && (
        <div className="border-l-2 border-[#7a2028]/35 pl-3">
          <p className="flex items-center gap-1 text-[12px] font-bold text-[#7a2028]"><Lightbulb className="w-3.5 h-3.5" /> მოკლედ</p>
          <p className="mt-0.5 text-[13.5px] leading-relaxed text-[#4a3426] whitespace-pre-line">{advice}</p>
        </div>
      )}

      <Btn full size="lg" icon={<Dumbbell />} onClick={onExercise}>სავარჯიშო · {exercise.minutes} წთ</Btn>
    </div>
  );
};

type Phase = 'idle' | 'run' | 'breath' | 'paused' | 'end';

const stepTime = (s: ManeraStep) => (s.secs ? s.secs * (s.reps ?? 1) + BREATH * ((s.reps ?? 1) - 1) : 0);
/** the voice this step's synth leaves to the student (null: all sound, or the step has no voices) */
const myPart = (s: ManeraStep, chosen: number) => (!s.parts || s.listen ? null : s.voice ?? Math.min(chosen, s.parts.length - 1));
/** the step's line the student sings at `t` seconds into the round: `sing`, else their voice, else the tones */
const targetAt = (s: ManeraStep, chosen: number, t: number): number | null => {
  const mine = myPart(s, chosen);
  const line = s.sing ?? (mine !== null ? s.parts![mine] : s.tones);
  if (!line?.length) return null;
  if (!s.secs) return line.length === 1 ? line[0] : null;
  return line[Math.min(line.length - 1, Math.max(0, Math.floor(t / (s.secs / line.length))))];
};

const ExerciseView: React.FC<{ drillId: string; exercise: ManeraExercise }> = ({ drillId, exercise }) => {
  const { user } = useAuth();
  const { doneToday } = useManeraPractice();
  const [range, setRangeState] = useState<Range>(() => (load(RANGE_KEY, 'low') === 'high' ? 'high' : 'low'));
  const [part, setPartState] = useState(() => Math.min(2, Math.max(0, Number(load(PART_KEY, '0')) || 0)));
  const [sound, setSoundState] = useState(() => load(SOUND_KEY, '1') === '1');
  const [idx, setIdx] = useState(0);
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<Phase>('idle');
  const [left, setLeft] = useState(0); // seconds left in this round or breath
  const pausedFrom = useRef<'run' | 'breath'>('run');
  const endAt = useRef(0);
  const step = exercise.steps[idx];
  const reps = step?.reps ?? 1;
  const done = doneToday(drillId);
  const base = MANERA_BASE[range];

  const setRange = (v: Range) => { setRangeState(v); save(RANGE_KEY, v); };
  const setPart = (v: number) => { setPartState(v); save(PART_KEY, String(v)); };
  const setSound = (on: boolean) => { setSoundState(on); save(SOUND_KEY, on ? '1' : '0'); if (!on) stopLessonNotes(); };

  // the step's sound from `elapsed` seconds into the round: its tones, the other voices, the click
  const sing = useCallback((s: ManeraStep, elapsed: number) => {
    if (!sound || !s.secs) return;
    const secs = s.secs;
    const notes: [number, number, number][] = [];
    const line = (tones: number[]) => {
      const d = secs / tones.length;
      tones.forEach((t, i) => notes.push([i * d, d, base + t]));
    };
    if (s.tones?.length) line(s.tones);
    const mine = myPart(s, part);
    s.parts?.forEach((p, v) => { if (v !== mine) line(p); });
    if (s.bpm) {
      const beat = 60 / s.bpm;
      const accents = s.accents ?? [0];
      for (let i = 0; i * beat < secs - 0.05; i++) notes.push([i * beat, 0.05, accents.includes(i % (s.bar ?? 1)) ? 96 : 88]);
    }
    const now = notes
      .filter(([at, len]) => at + len > elapsed + 0.03)
      .map(([at, len, m]): [number, number, number] => (at < elapsed ? [0, len - (elapsed - at), m] : [at - elapsed, len, m]));
    if (now.length) void playLessonNotes(now);
  }, [sound, base, part]);

  const startRound = useCallback((s: ManeraStep, elapsed = 0) => {
    endAt.current = Date.now() + (s.secs! - elapsed) * 1000;
    setLeft(s.secs! - elapsed);
    setPhase('run');
    sing(s, elapsed);
  }, [sing]);

  const goTo = useCallback((i: number) => {
    stopLessonNotes();
    setRound(1);
    if (i >= exercise.steps.length) { setPhase('end'); return; }
    setIdx(i);
    const s = exercise.steps[i];
    if (s.secs) startRound(s); else setPhase('idle');
  }, [exercise.steps, startRound]);

  // the clock: a round ends → a breath → the next round, or the next step
  useEffect(() => {
    if (phase !== 'run' && phase !== 'breath') return;
    const t = window.setInterval(() => {
      const ms = endAt.current - Date.now();
      if (ms > 0) { setLeft(ms / 1000); return; }
      window.clearInterval(t);
      triggerHaptic(12);
      if (phase === 'run' && round < reps) {
        endAt.current = Date.now() + BREATH * 1000;
        setLeft(BREATH);
        setPhase('breath');
      } else if (phase === 'breath') {
        setRound(r => r + 1);
        startRound(step);
      } else {
        goTo(idx + 1);
      }
    }, 100);
    return () => window.clearInterval(t);
  }, [phase, round, reps, step, idx, startRound, goTo]);

  useEffect(() => () => stopLessonNotes(), []);

  const pause = () => {
    pausedFrom.current = phase === 'breath' ? 'breath' : 'run';
    setLeft(Math.max(0, (endAt.current - Date.now()) / 1000));
    stopLessonNotes();
    setPhase('paused');
  };
  const resume = () => {
    if (pausedFrom.current === 'breath') {
      endAt.current = Date.now() + left * 1000;
      setPhase('breath');
    } else startRound(step, step.secs! - left);
  };
  const begin = () => (step.secs ? startRound(step) : goTo(idx + 1));
  const restart = () => { stopLessonNotes(); setIdx(0); setRound(1); setPhase('idle'); };
  const finish = () => { triggerHaptic(20); markDrillDone(drillId, user?.uid); };

  const total = Math.round(exercise.steps.reduce((a, s) => a + stepTime(s), 0) / 60) || exercise.minutes;
  const sounding = exercise.steps.some(s => s.tones?.length || s.parts?.length || s.bpm);
  const pitched = exercise.steps.some(s => s.tones?.length || s.parts?.length || s.sing?.length);
  const choosesPart = exercise.steps.some(s => s.parts && !s.listen && s.voice === undefined);
  const running = phase === 'run' || phase === 'breath';
  const frac = phase === 'breath' ? left / BREATH : step?.secs ? left / step.secs : 0;
  // the note the tuner aims at, now
  const target = step && phase !== 'breath' && phase !== 'end'
    ? targetAt(step, part, running || phase === 'paused' ? (step.secs ?? 0) - left : 0)
    : null;
  const stepPart = step ? myPart(step, part) : null;

  return (
    <div className="space-y-4 sg-in">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="flex-1 min-w-[160px] font-serif-ge text-[16px] font-bold text-[#4a3426]">{exercise.title}</p>
        <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#8a7a6a]"><Clock className="w-3.5 h-3.5" /> ~{Math.max(total, exercise.minutes)} წთ</span>
      </div>

      {(pitched || sounding) && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {pitched && (
              <Segmented label="ხმის სიმაღლე" value={range} onChange={setRange} items={[['low', 'კაცის ხმა'], ['high', 'ქალის · ბავშვის']]} />
            )}
            <IconBtn label={sound ? 'ხმა ჩართულია' : 'ხმა გამორთულია'} onClick={() => setSound(!sound)} className="ring-1 ring-[#e8dcc8] bg-white">
              {sound ? <Volume2 /> : <VolumeX />}
            </IconBtn>
            {!pitched && <span className="text-[13px] font-semibold text-[#8a7a6a]">მეტრონომი {sound ? 'ჩართულია' : 'გამორთულია'}</span>}
          </div>
          {choosesPart && (
            <Segmented label="ჩემი ხმა" value={String(part)} onChange={v => setPart(Number(v))} items={[['0', 'I'], ['1', 'II'], ['2', 'III']]} prefix="ჩემი ხმა:" />
          )}
        </div>
      )}

      {phase === 'end' ? (
        <div className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-5 py-6 text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-600" />
          <p className="font-serif-ge text-[17px] font-bold text-[#4a3426]">სავარჯიშო დასრულდა</p>
          {done
            ? <p className="text-[14px] font-semibold text-emerald-700">დღეს შესრულებულია ✓</p>
            : <Btn size="lg" icon={<Check />} onClick={finish}>შევასრულე</Btn>}
          <div><Btn kind="ghost" size="sm" icon={<RotateCcw />} onClick={restart}>თავიდან</Btn></div>
        </div>
      ) : (
        <div className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] font-bold text-[#8a7a6a]">
            <span>ნაბიჯი {idx + 1} / {exercise.steps.length}</span>
            <span className="flex items-center gap-2">
              {step.parts && <span className="text-[#7a2028]">{step.listen ? 'ისმინე სამივე' : `შენ: ${PART_NAMES[stepPart ?? 0]}`}</span>}
              {step.secs && reps > 1 && <span className="tabular-nums">{round} / {reps}-ჯერ</span>}
            </span>
          </div>
          <div className="mt-2 flex items-start gap-4">
            {step.secs ? <Ring frac={running || phase === 'paused' ? frac : 1} label={String(Math.ceil(running || phase === 'paused' ? left : step.secs))} breath={phase === 'breath'} /> : null}
            <p className="flex-1 min-w-0 text-[15.5px] leading-relaxed font-medium">
              {phase === 'breath' && <span className="inline-flex items-center gap-1.5 text-sky-700 font-bold"><Wind className="w-4 h-4" /> ჩაისუნთქე… </span>}
              {phase === 'breath' ? <span className="text-[#8a7a6a]">{step.text}</span> : step.text}
            </p>
          </div>
          <div className="mt-4 flex items-center gap-2">
            {running ? (
              <RoundBtn label="პაუზა" onClick={pause}><Pause className="w-5 h-5" /></RoundBtn>
            ) : phase === 'paused' ? (
              <RoundBtn label="გაგრძელება" onClick={resume}><Play className="w-5 h-5 ml-0.5" /></RoundBtn>
            ) : step.secs ? (
              <Btn size="lg" icon={<Play />} onClick={begin}>{idx === 0 ? 'დაწყება' : 'გაგრძელება'}</Btn>
            ) : (
              <Btn size="lg" icon={<Check />} onClick={begin}>გავაკეთე</Btn>
            )}
            <Btn kind="ghost" size="md" icon={<SkipForward />} onClick={() => goTo(idx + 1)} className="ml-auto">შემდეგი</Btn>
          </div>
        </div>
      )}

      <MicPanel drillId={drillId} target={target === null ? null : base + target} pitched={pitched} />

      <ol className="space-y-1">
        {exercise.steps.map((s, i) => {
          const cur = i === idx && phase !== 'end';
          const past = phase === 'end' || i < idx;
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => goTo(i)}
                className={`w-full flex items-start gap-2.5 rounded-xl px-2.5 py-2 text-left cursor-pointer transition-colors ${cur ? 'bg-[#7a2028]/[0.06]' : 'hover:bg-[#7a2028]/[0.03]'}`}
              >
                <span className={`mt-0.5 w-5 h-5 shrink-0 rounded-full text-[11px] font-bold flex items-center justify-center tabular-nums ${past ? 'bg-emerald-600 text-white' : cur ? 'bg-[#7a2028] text-[#fbf6ec]' : 'ring-1 ring-[#d9c8ac] text-[#8a7a6a]'}`}>
                  {past ? <Check className="w-3 h-3" /> : i + 1}
                </span>
                <span className={`flex-1 min-w-0 text-[13px] leading-snug ${cur ? 'text-[#2a2017] font-semibold' : past ? 'text-[#8a7a6a]' : 'text-[#4a3426]'}`}>{s.text}</span>
                {s.secs && <span className="shrink-0 text-[11.5px] font-semibold text-[#b3a594] tabular-nums">{s.secs}წ{(s.reps ?? 1) > 1 ? ` ×${s.reps}` : ''}</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

const RoundBtn: React.FC<{ label: string; onClick: () => void; children: React.ReactNode; tone?: 'wine' | 'red' }> = ({ label, onClick, children, tone = 'wine' }) => (
  <button
    type="button"
    onClick={() => { triggerHaptic(10); onClick(); }}
    aria-label={label}
    className={`w-12 h-12 shrink-0 rounded-full text-[#fbf6ec] flex items-center justify-center cursor-pointer active:scale-95 transition ${tone === 'red' ? 'bg-[#b3261e]' : 'bg-[#7a2028]'}`}
  >
    {children}
  </button>
);

function Segmented<T extends string>({ label, value, onChange, items, prefix }: { label: string; value: T; onChange: (v: T) => void; items: [T, string][]; prefix?: string }) {
  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white ring-1 ring-[#e8dcc8]" role="radiogroup" aria-label={label}>
      {prefix && <span className="pl-2.5 pr-1 text-[12.5px] font-bold text-[#8a7a6a]">{prefix}</span>}
      {items.map(([v, text]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => { triggerHaptic(8); onChange(v); }}
          className={`h-9 min-w-9 px-3.5 rounded-full text-[13px] font-bold cursor-pointer transition-colors ${value === v ? 'bg-[#7a2028] text-[#fbf6ec]' : 'text-[#4a3426]'}`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

const Ring: React.FC<{ frac: number; label: string; breath: boolean }> = ({ frac, label, breath }) => {
  const r = 26, c = 2 * Math.PI * r;
  return (
    <div className="relative w-16 h-16 shrink-0" aria-hidden>
      <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#f1e8d9" strokeWidth="6" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={breath ? '#0284c7' : '#7a2028'} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, frac)))} style={{ transition: 'stroke-dashoffset 0.1s linear' }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[18px] font-black tabular-nums text-[#4a3426]">{label}</span>
    </div>
  );
};

type MicState = { kind: 'off' } | { kind: 'on'; started: number } | { kind: 'take'; mp3: Blob | null; seconds: number } | { kind: 'error'; text: string };

// The microphone under the exercise: a tuner (my note against the one to sing, any octave) and a recording of the
// whole try, up to 90 s, to hear back and send to the teachers. Headphones keep the synth out of the tuner.
const MicPanel: React.FC<{ drillId: string; target: number | null; pitched: boolean }> = ({ drillId, target, pitched }) => {
  const { user } = useAuth();
  const [state, setState] = useState<MicState>({ kind: 'off' });
  const [midi, setMidi] = useState<number | null>(null);
  const [secs, setSecs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [sent, setSent] = useState<'no' | 'busy' | 'yes' | 'fail'>('no');
  const session = useRef<SingSession | null>(null);
  const audio = useRef<{ a: HTMLAudioElement; url: string } | null>(null);
  const smooth = useRef<number | null>(null);

  const stopAudio = () => {
    if (audio.current) { audio.current.a.pause(); URL.revokeObjectURL(audio.current.url); audio.current = null; }
    setPlaying(false);
  };
  useEffect(() => () => { session.current?.cancel(); stopAudio(); }, []);

  const start = async () => {
    stopAudio();
    setSent('no');
    try {
      smooth.current = null;
      session.current = await startSinging(m => {
        // a light smoothing so the needle doesn't shiver; a gap in the voice clears it
        smooth.current = m === null ? null : smooth.current === null || Math.abs(m - smooth.current) > 1 ? m : smooth.current * 0.6 + m * 0.4;
        setMidi(smooth.current);
      });
      setState({ kind: 'on', started: Date.now() });
    } catch {
      setState({ kind: 'error', text: 'მიკროფონი ვერ ჩაირთო. ნება მიეცი ბრაუზერს და სცადე თავიდან.' });
    }
  };
  const stop = useCallback(async () => {
    const s = session.current;
    session.current = null;
    setMidi(null);
    if (!s) return;
    const take = await s.stop();
    setState({ kind: 'take', mp3: take.mp3, seconds: take.seconds });
  }, []);

  useEffect(() => {
    if (state.kind !== 'on') return;
    const t = window.setInterval(() => {
      const s = (Date.now() - state.started) / 1000;
      setSecs(s);
      if (s >= MAX_TAKE_SECONDS) void stop();
    }, 250);
    return () => window.clearInterval(t);
  }, [state, stop]);

  const play = () => {
    if (state.kind !== 'take' || !state.mp3) return;
    if (playing) { stopAudio(); return; }
    const url = URL.createObjectURL(state.mp3);
    const a = new Audio(url);
    a.onended = stopAudio;
    audio.current = { a, url };
    setPlaying(true);
    a.play().catch(stopAudio);
  };
  const send = async () => {
    if (state.kind !== 'take' || !state.mp3 || !user) return;
    setSent('busy');
    try { await saveDrillTake(user.uid, drillId, state.mp3, state.seconds); setSent('yes'); } catch { setSent('fail'); }
  };

  if (!singingSupported()) return null;

  if (state.kind === 'off' || state.kind === 'error') {
    return (
      <div className="rounded-2xl bg-[#7a2028]/[0.04] ring-1 ring-[#e8dcc8] px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex-1 min-w-[180px]">
          <p className="text-[14px] font-bold text-[#4a3426]">{pitched ? 'ტიუნერი და ჩაწერა' : 'ჩაწერა'}</p>
          <p className="text-[12.5px] leading-snug text-[#8a7a6a]">
            {state.kind === 'error' ? state.text : pitched ? 'მიკროფონი გაჩვენებს, ზუსტად ხარ თუ არა ნოტზე, და ჩაიწერს შენს ცდას.' : 'ჩაიწერე შენი ცდა, მოუსმინე და გაუგზავნე მასწავლებელს.'}
          </p>
        </div>
        <Btn kind="soft" icon={<Mic />} onClick={start}>ჩართვა</Btn>
      </div>
    );
  }

  if (state.kind === 'on') {
    const diff = midi !== null && target !== null ? (((midi - target + 6) % 12) + 12) % 12 - 6 : null;
    const tone = diff === null ? 'idle' : Math.abs(diff) < 0.25 ? 'ok' : Math.abs(diff) < 0.5 ? 'near' : 'off';
    const needle = diff === null ? 50 : 50 + Math.max(-1, Math.min(1, diff)) * 45;
    return (
      <div className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3.5 space-y-3">
        <div className="flex items-center gap-3">
          <span className="relative flex w-2.5 h-2.5 shrink-0"><span className="absolute inset-0 rounded-full bg-[#b3261e] animate-ping opacity-60" /><span className="relative w-2.5 h-2.5 rounded-full bg-[#b3261e]" /></span>
          <span className="text-[13px] font-bold text-[#4a3426] tabular-nums">იწერება · {Math.floor(secs)} / {MAX_TAKE_SECONDS} წმ</span>
          <span className="ml-auto inline-flex items-center gap-1 text-[11.5px] text-[#8a7a6a]"><Headphones className="w-3.5 h-3.5" /> ყურსასმენით უკეთესია</span>
        </div>
        {pitched && (
          <div>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[11.5px] font-bold text-[#8a7a6a]">შენ</p>
                <p className={`text-[26px] leading-none font-black ${tone === 'ok' ? 'text-emerald-600' : tone === 'near' ? 'text-amber-600' : tone === 'off' ? 'text-rose-600' : 'text-[#cbbca6]'}`}>
                  {midi === null ? '—' : noteName(midi)}
                </p>
              </div>
              <p className={`pb-0.5 text-[13px] font-bold ${tone === 'ok' ? 'text-emerald-700' : tone === 'near' ? 'text-amber-700' : 'text-rose-700'}`} aria-live="polite">
                {diff === null ? '' : tone === 'ok' ? 'ზუსტად' : diff < 0 ? 'ცოტა დაბლა' : 'ცოტა მაღლა'}
              </p>
              <div className="text-right">
                <p className="text-[11.5px] font-bold text-[#8a7a6a]">ნოტი</p>
                <p className="text-[26px] leading-none font-black text-[#4a3426]">{target === null ? '—' : noteName(target)}</p>
              </div>
            </div>
            <div className="relative mt-2.5 h-3 rounded-full bg-gradient-to-r from-rose-200 via-emerald-200 to-rose-200" aria-hidden>
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-4 bg-emerald-700/50" />
              {diff !== null && (
                <span className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full ring-2 ring-white shadow transition-[left] duration-100"
                  style={{ left: `${needle}%`, background: tone === 'ok' ? '#059669' : tone === 'near' ? '#d97706' : '#e11d48' }} />
              )}
            </div>
          </div>
        )}
        <Btn kind="danger" icon={<Square />} onClick={() => void stop()}>გაჩერება</Btn>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3.5 space-y-3">
      <p className="text-[14px] font-bold text-[#4a3426]">შენი ჩანაწერი · {Math.round(state.seconds)} წმ</p>
      {state.mp3 ? (
        <div className="flex flex-wrap items-center gap-2">
          <RoundBtn label={playing ? 'გაჩერება' : 'მოსმენა'} onClick={play}>{playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}</RoundBtn>
          {user && (
            sent === 'yes'
              ? <span className="inline-flex items-center gap-1 text-[13px] font-bold text-emerald-700"><Check className="w-4 h-4" /> მასწავლებელს გაეგზავნა</span>
              : <Btn icon={<Send />} disabled={sent === 'busy'} onClick={send}>{sent === 'busy' ? 'იგზავნება…' : 'მასწავლებელს გაგზავნა'}</Btn>
          )}
          <IconBtn label="ახალი ჩანაწერი" tone="danger" onClick={() => { stopAudio(); setState({ kind: 'off' }); setSent('no'); }} className="ml-auto"><Trash2 /></IconBtn>
        </div>
      ) : (
        <p className="text-[13px] text-[#8a7a6a]">ამ ბრაუზერში ჩანაწერი ვერ შეინახა.</p>
      )}
      {sent === 'fail' && <p className="text-[13px] text-red-700">ვერ გაიგზავნა. სცადე თავიდან.</p>}
      {state.mp3 && sent !== 'yes' && user && <p className="text-[12px] text-[#8a7a6a]">მასწავლებელი ხედავს ამ სავარჯიშოს მხოლოდ ბოლო გაგზავნილ ჩანაწერს.</p>}
      <Btn kind="ghost" size="sm" icon={<Mic />} onClick={start}>თავიდან ჩაწერა</Btn>
    </div>
  );
};
