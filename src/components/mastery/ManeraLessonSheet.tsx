import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, Check, CheckCircle2, Clock, Dumbbell, Lightbulb, Pause, Play, RotateCcw, SkipForward, Volume2, VolumeX, Wind } from 'lucide-react';
import { Btn, IconBtn, Sheet, Tabs } from '../ui/kit';
import type { ManeraItemType } from '../../data/habitsAndManera';
import { MANERA_BASE, MANERA_LESSONS, type ManeraExercise, type ManeraStep } from '../../data/maneraLessons';
import { playLessonNotes, stopLessonNotes } from '../../utils/chantSynth';
import { markManeraDone, useManeraPractice } from '../../utils/maneraPractice';
import { triggerHaptic } from '../../utils/haptics';

type Tab = 'lesson' | 'exercise';
type Voice = keyof typeof MANERA_BASE;
const VOICE_KEY = 'sg-manera-voice';
const SOUND_KEY = 'sg-manera-sound';
const BREATH = 3; // seconds to breathe between rounds

const load = (key: string, fallback: string) => { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } };
const save = (key: string, v: string) => { try { localStorage.setItem(key, v); } catch { /* storage off */ } };

// One tip opened whole: „გაკვეთილი“ to read and „სავარჯიშო“ to do with a timer and, where the step has notes,
// the synth holding them from the student's own base note. Nothing sounds until the student presses ▶.
export const ManeraLessonSheet: React.FC<{ item: ManeraItemType | null; position: number; startTab?: Tab; onClose: () => void }> = ({ item, position, startTab = 'lesson', onClose }) => {
  const [tab, setTabState] = useState<Tab>(startTab);
  const top = useRef<HTMLDivElement>(null);
  useEffect(() => { if (item) setTabState(startTab); }, [item, startTab]);
  // a new tab starts at its top, not where the other one was scrolled to
  const setTab = (t: Tab) => { setTabState(t); top.current?.scrollIntoView({ block: 'start' }); };
  const data = item ? MANERA_LESSONS[item.num] : undefined;
  return (
    <Sheet open={!!item && !!data} onClose={onClose} wide title={item ? <><span className="text-[#c4b49c] tabular-nums mr-1.5">{position}.</span>{item.title}</> : ''}>
      {item && data && (
        <div ref={top} className="space-y-4 text-[#2a2017] scroll-mt-4">
          <Tabs<Tab> cols={2} value={tab} onChange={setTab} items={[
            { id: 'lesson', label: 'გაკვეთილი', Icon: BookOpen },
            { id: 'exercise', label: 'სავარჯიშო', Icon: Dumbbell },
          ]} />
          {tab === 'lesson'
            ? <LessonView num={item.num} advice={item.advice} onExercise={() => setTab('exercise')} />
            : <ExerciseView key={item.num} num={item.num} exercise={data.exercise} />}
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

const LessonView: React.FC<{ num: string; advice: string; onExercise: () => void }> = ({ num, advice, onExercise }) => {
  const { lesson, exercise } = MANERA_LESSONS[num];
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

      <div className="border-l-2 border-[#7a2028]/35 pl-3">
        <p className="flex items-center gap-1 text-[12px] font-bold text-[#7a2028]"><Lightbulb className="w-3.5 h-3.5" /> მოკლედ</p>
        <p className="mt-0.5 text-[13.5px] leading-relaxed text-[#4a3426] whitespace-pre-line">{advice}</p>
      </div>

      <Btn full size="lg" icon={<Dumbbell />} onClick={onExercise}>სავარჯიშო · {exercise.minutes} წთ</Btn>
    </div>
  );
};

type Phase = 'idle' | 'run' | 'breath' | 'paused' | 'end';

const stepTime = (s: ManeraStep) => (s.secs ? s.secs * (s.reps ?? 1) + BREATH * ((s.reps ?? 1) - 1) : 0);

const ExerciseView: React.FC<{ num: string; exercise: ManeraExercise }> = ({ num, exercise }) => {
  const { doneToday } = useManeraPractice();
  const [voice, setVoiceState] = useState<Voice>(() => (load(VOICE_KEY, 'low') === 'high' ? 'high' : 'low'));
  const [sound, setSoundState] = useState(() => load(SOUND_KEY, '1') === '1');
  const [idx, setIdx] = useState(0);
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<Phase>('idle');
  const [left, setLeft] = useState(0); // seconds left in this round or breath
  const pausedFrom = useRef<'run' | 'breath'>('run');
  const endAt = useRef(0);
  const step = exercise.steps[idx];
  const reps = step?.reps ?? 1;
  const done = doneToday(num);

  const setVoice = (v: Voice) => { setVoiceState(v); save(VOICE_KEY, v); };
  const setSound = (on: boolean) => { setSoundState(on); save(SOUND_KEY, on ? '1' : '0'); if (!on) stopLessonNotes(); };

  // the step's notes from `elapsed` seconds into the round: one tone holds the round, several share it
  const sing = useCallback((s: ManeraStep, elapsed: number) => {
    if (!sound || !s.tones?.length || !s.secs) return;
    const d = s.secs / s.tones.length;
    const notes = s.tones
      .map((t, i): [number, number, number] => [i * d - elapsed, d, MANERA_BASE[voice] + t])
      .filter(([at, len]) => at + len > 0.05)
      .map(([at, len, m]): [number, number, number] => (at < 0 ? [0, len + at, m] : [at, len, m]));
    void playLessonNotes(notes);
  }, [sound, voice]);

  const startRound = useCallback((s: ManeraStep, elapsed = 0) => {
    endAt.current = Date.now() + (s.secs! - elapsed) * 1000;
    setLeft(Math.ceil(s.secs! - elapsed));
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
      if (ms > 0) { setLeft(Math.ceil(ms / 1000)); return; }
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
    }, 200);
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
  const finish = () => { triggerHaptic(20); markManeraDone(num); };

  const total = Math.round(exercise.steps.reduce((a, s) => a + stepTime(s), 0) / 60) || exercise.minutes;
  const hasTones = exercise.steps.some(s => s.tones?.length);
  const running = phase === 'run' || phase === 'breath';
  const showLeft = Math.ceil(left);
  const frac = phase === 'breath' ? left / BREATH : step?.secs ? left / step.secs : 0;

  return (
    <div className="space-y-4 sg-in">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="flex-1 min-w-[160px] font-serif-ge text-[16px] font-bold text-[#4a3426]">{exercise.title}</p>
        <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#8a7a6a]"><Clock className="w-3.5 h-3.5" /> ~{Math.max(total, exercise.minutes)} წთ</span>
      </div>

      {hasTones && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex p-1 rounded-full bg-white ring-1 ring-[#e8dcc8]" role="radiogroup" aria-label="ხმის სიმაღლე">
            {(['low', 'high'] as Voice[]).map(v => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={voice === v}
                onClick={() => { triggerHaptic(8); setVoice(v); }}
                className={`h-9 px-3.5 rounded-full text-[13px] font-bold cursor-pointer transition-colors ${voice === v ? 'bg-[#7a2028] text-[#fbf6ec]' : 'text-[#4a3426]'}`}
              >
                {v === 'low' ? 'დაბალი ხმა' : 'მაღალი ხმა'}
              </button>
            ))}
          </div>
          <IconBtn label={sound ? 'ნოტი ჩართულია' : 'ნოტი გამორთულია'} onClick={() => setSound(!sound)} className="ring-1 ring-[#e8dcc8] bg-white">
            {sound ? <Volume2 /> : <VolumeX />}
          </IconBtn>
          <span className="text-[12px] text-[#8a7a6a]">ნოტი გეხმარება ბგერის დაჭერაში</span>
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
          <div className="flex items-center justify-between gap-2 text-[12px] font-bold text-[#8a7a6a]">
            <span>ნაბიჯი {idx + 1} / {exercise.steps.length}</span>
            {step.secs && reps > 1 && <span className="tabular-nums">{round} / {reps}-ჯერ</span>}
          </div>
          <div className="mt-2 flex items-start gap-4">
            {step.secs ? <Ring frac={running || phase === 'paused' ? frac : 1} label={running || phase === 'paused' ? String(showLeft) : String(step.secs)} breath={phase === 'breath'} /> : null}
            <p className="flex-1 min-w-0 text-[15.5px] leading-relaxed font-medium">
              {phase === 'breath'
                ? <span className="inline-flex items-center gap-1.5 text-sky-700 font-bold"><Wind className="w-4 h-4" /> ჩაისუნთქე… </span>
                : null}
              {phase === 'breath' ? <span className="text-[#8a7a6a]">{step.text}</span> : step.text}
            </p>
          </div>
          <div className="mt-4 flex items-center gap-2">
            {running ? (
              <button type="button" onClick={pause} aria-label="პაუზა" className="w-12 h-12 shrink-0 rounded-full bg-[#7a2028] text-[#fbf6ec] flex items-center justify-center cursor-pointer active:scale-95 transition"><Pause className="w-5 h-5" /></button>
            ) : phase === 'paused' ? (
              <button type="button" onClick={resume} aria-label="გაგრძელება" className="w-12 h-12 shrink-0 rounded-full bg-[#7a2028] text-[#fbf6ec] flex items-center justify-center cursor-pointer active:scale-95 transition"><Play className="w-5 h-5 ml-0.5" /></button>
            ) : step.secs ? (
              <Btn size="lg" icon={<Play />} onClick={begin}>{idx === 0 ? 'დაწყება' : 'გაგრძელება'}</Btn>
            ) : (
              <Btn size="lg" icon={<Check />} onClick={begin}>გავაკეთე</Btn>
            )}
            <Btn kind="ghost" size="md" icon={<SkipForward />} onClick={() => goTo(idx + 1)} className="ml-auto">შემდეგი</Btn>
          </div>
        </div>
      )}

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

const Ring: React.FC<{ frac: number; label: string; breath: boolean }> = ({ frac, label, breath }) => {
  const r = 26, c = 2 * Math.PI * r;
  return (
    <div className="relative w-16 h-16 shrink-0" aria-hidden>
      <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#f1e8d9" strokeWidth="6" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={breath ? '#0284c7' : '#7a2028'} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, frac)))} style={{ transition: 'stroke-dashoffset 0.2s linear' }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[18px] font-black tabular-nums text-[#4a3426]">{label}</span>
    </div>
  );
};
