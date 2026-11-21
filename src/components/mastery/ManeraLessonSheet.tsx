import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Check, CheckCircle2, Clock, Dumbbell, Gauge, Headphones, Lightbulb, Mic, Pause, Play, RotateCcw, Send, SkipForward, Sparkles, Square, Trash2, Vibrate, VibrateOff, Volume2, VolumeX, Wind, X } from 'lucide-react';
import { BackBtn, Btn, IconBtn, Tabs, useScrolledAway } from '../ui/kit';
import type { ManeraStep } from '../../data/maneraLessons';
import { findDrill, type Drill } from '../../data/vocalDrills';
import { TrainerView } from './trainers/Trainer';
import { DoneButton } from './trainers/Open';
import { stopLessonNotes } from '../../utils/chantSynth';
import { MAX_TAKE_SECONDS } from '../../utils/drillTakes';
import { singingSupported } from '../../utils/singCapture';
import { countInBeats, onsetsOf, roundFrames, scoredStep, type ScoreKind } from '../../utils/drillScore';
import { useNewLook } from '../../design/newLook';
import { AiScoreScreen } from '../../pages/v2/ostatoba/AiScore';
import { DrillScreenV2 } from '../../pages/v2/ostatoba/DrillScreenV2';
import { noteName } from '../../utils/pearls';
import { triggerHaptic } from '../../utils/haptics';
import { PART_NAMES, canVibrate, useExercise, type RunResult, type Scoring } from './useExercise';
import { useMicTake } from './useMicTake';
import { useDrillHistory } from './useDrillHistory';

export type DrillTab = 'lesson' | 'exercise';
type Tab = DrillTab;
// One drill opened whole (a tip of „რჩევები“ or an exercise of the groups, data/vocalDrills.ts): „გაკვეთილი“ to read
// and „სავარჯიშო“ to do with a timer — the synth holds the step's notes (or the other two voices), a click keeps the
// beat, and the microphone shows how close the student is to the note and records the take for the teachers.
// Nothing sounds and the microphone stays off until the student presses.
// Since 2026-11-07 (the user: „არ მომწონს ამომხტარი ფანჯარა“) a drill opens on a screen of its own, not in a window
// over the page: a bar with the round „←“ (the name shows there once the big one scrolls away), the phone's back closes it.
export const DrillSheet: React.FC<{ drillId: string | null; label?: string; startTab?: Tab; onClose: () => void }> = ({ drillId, label, startTab = 'lesson', onClose }) => {
  const drill = findDrill(drillId);
  const nl = useNewLook();
  if (!drill) return null;
  // the new look (boards x-ostatoba-gakvetili, x-ostatoba-savarjisho): the same screen drawn of the design rules
  if (nl) return <DrillScreenV2 key={drill.id} drill={drill} label={label} startTab={startTab} onClose={onClose} />;
  return <DrillScreen key={drill.id} drill={drill} label={label} startTab={startTab} onClose={onClose} />;
};

const DrillScreen: React.FC<{ drill: Drill; label?: string; startTab: Tab; onClose: () => void }> = ({ drill, label, startTab, onClose }) => {
  const [tab, setTabState] = useState<Tab>(startTab);
  const scrollRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleAway = useScrolledAway(titleRef, scrollRef, drill.id);
  // its own history step; a trainer's `back(then)` opens the next page once the step is taken back
  const back = useDrillHistory(onClose);

  // a new tab starts at its top, not where the other one was scrolled to
  const setTab = (t: Tab) => { setTabState(t); scrollRef.current?.scrollTo({ top: 0 }); };

  return createPortal(
    <div ref={scrollRef} className="fixed inset-0 z-[80] overflow-y-auto overscroll-contain bg-[#faf6ef] sg-in" role="dialog" aria-modal="true" aria-label={drill.title}>
      <div className="sticky top-0 z-10 safe-top bg-[#faf6ef]/95 backdrop-blur border-b border-[#e4d8c4]">
        <div className="safe-x"><div className="max-w-2xl mx-auto h-14 px-3 flex items-center gap-2">
          <BackBtn onClick={() => { triggerHaptic(8); back(); }} />
          <span aria-hidden className={`min-w-0 flex-1 truncate text-[15px] font-bold text-[#2a2017] transition-opacity duration-200 ${titleAway ? 'opacity-100' : 'opacity-0'}`}>
            {drill.title}
          </span>
        </div></div>
      </div>

      <div className="safe-x safe-bottom"><div className="max-w-2xl mx-auto px-4 pt-4 pb-12 space-y-4 text-[#2a2017]">
        <header>
          {label && <p className="text-[12.5px] font-bold tabular-nums text-[#a0703c]">{label}</p>}
          <h1 ref={titleRef} className="font-serif-ge text-[24px] sm:text-[28px] font-bold leading-tight text-[#2a2017] break-words">{drill.title}</h1>
        </header>
        {drill.read ? (
          // a lesson only (data/masteryDrills.ts `read`): its tick in place of the exercise
          <LessonView drill={drill} onExercise={() => undefined} />
        ) : (
          <>
            <Tabs<Tab> cols={2} value={tab} onChange={setTab} items={[
              { id: 'lesson', label: 'გაკვეთილი', Icon: BookOpen },
              { id: 'exercise', label: 'სავარჯიშო', Icon: Dumbbell },
            ]} />
            {tab === 'lesson'
              ? <LessonView drill={drill} onExercise={() => setTab('exercise')} />
              : drill.trainer || drill.open
                ? <TrainerView drill={drill} onClose={back} />
                : <ExerciseView drill={drill} />}
          </>
        )}
      </div></div>
    </div>,
    document.body,
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

      {drill.read
        ? <DoneButton drillId={drill.id} label="წავიკითხე" />
        : <Btn full size="lg" icon={<Dumbbell />} onClick={onExercise}>სავარჯიშო · {exercise.minutes} წთ</Btn>}
    </div>
  );
};

const tone = (v: number) => (v >= 80 ? 'text-emerald-700' : v >= 50 ? 'text-amber-700' : 'text-rose-700');

const ExerciseView: React.FC<{ drill: Drill }> = ({ drill }) => {
  const {
    drillId, exercise, user, best, kind, nl,
    aiScreen, setAiScreen, aiLast, showAi, aiArrived, aiWaiting, openArrived,
    scoring, scoringOn, liveMidi, result, scoreNote, setScoreNote,
    range, setRange, part, setPart, sound, setSound, vibrate, setVibrate,
    idx, round, phase, setPhase, left, step, reps, done, base,
    goTo, pause, resume, begin, restart, stopScoring, beginScored, askAi, askNew, recordForAi, toTuner, finish,
    total, sounding, clicking, pitched, choosesPart, running, frac, target, stepPart,
  } = useExercise(drill);

  return (
    <div className="space-y-4 sg-in">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="flex-1 min-w-[160px] font-serif-ge text-[16px] font-bold text-[#4a3426]">{exercise.title}</p>
        <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#8a7a6a]"><Clock className="w-3.5 h-3.5" /> ~{Math.max(total, exercise.minutes)} წთ</span>
        {best !== undefined && (
          <span className="inline-flex items-center gap-1 text-[12.5px] font-bold text-[#8a7a6a]">
            <Gauge className="w-3.5 h-3.5" /> საუკეთესო <b className={`tabular-nums ${tone(best)}`}>{best}%</b>
          </span>
        )}
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
            {canVibrate && clicking && (
              <IconBtn label={vibrate ? 'ვიბრაცია ჩართულია' : 'ვიბრაცია გამორთულია'} onClick={() => setVibrate(!vibrate)}
                className={`ring-1 ${vibrate ? 'ring-[#7a2028]/30 bg-[#7a2028]/[0.07] text-[#7a2028]' : 'ring-[#e8dcc8] bg-white'}`}>
                {vibrate ? <Vibrate /> : <VibrateOff />}
              </IconBtn>
            )}
            {!pitched && <span className="text-[13px] font-semibold text-[#8a7a6a]">მეტრონომი {sound ? 'ჩართულია' : 'გამორთულია'}{vibrate && clicking ? ' · ვიბრაციით' : ''}</span>}
          </div>
          {choosesPart && (
            <Segmented label="ჩემი ხმა" value={String(part)} onChange={v => setPart(Number(v))} items={[['0', 'I'], ['1', 'II'], ['2', 'III']]} prefix="ჩემი ხმა:" />
          )}
        </div>
      )}

      {phase === 'end' ? (
        <div className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-5 py-6 text-center space-y-3">
          {nl && result?.kind === 'ai' && user ? (
            <>
              <Sparkles className="w-9 h-9 mx-auto text-[#7a2028]" />
              <p className="font-serif-ge text-[17px] font-bold text-[#4a3426]">სავარჯიშო ჩაიწერა</p>
              {aiLast
                ? <Btn size="lg" icon={<Sparkles />} onClick={() => setAiScreen(aiLast)}>AI-ს შეფასება</Btn>
                : result.mp3 && !result.busy && <Btn size="lg" icon={<Sparkles />} onClick={() => void askNew(result.mp3!)}>AI-ს შეფასება</Btn>}
            </>
          ) : result ? <RunResultView result={result} best={best} triesLeft={user ? Infinity : 0} signedIn={!!user} onAsk={askAi} /> : (
            <>
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-600" />
              <p className="font-serif-ge text-[17px] font-bold text-[#4a3426]">სავარჯიშო დასრულდა</p>
            </>
          )}
          {done
            ? <p className="text-[14px] font-semibold text-emerald-700">დღეს შესრულებულია ✓</p>
            : <Btn size="lg" icon={<Check />} onClick={finish}>შევასრულე</Btn>}
          <div className="flex flex-wrap justify-center gap-2">
            <Btn kind="ghost" size="sm" icon={<RotateCcw />} onClick={restart}>თავიდან</Btn>
            {singingSupported() && <Btn kind="soft" size="sm" icon={<Gauge />} onClick={() => { restart(); void beginScored(); }}>შეფასებით კიდევ</Btn>}
          </div>
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
              <Btn size="lg" icon={<Play />} onClick={begin}>{idx === 0 && !scoringOn ? 'დაწყება' : 'გაგრძელება'}</Btn>
            ) : (
              <Btn size="lg" icon={<Check />} onClick={begin}>გავაკეთე</Btn>
            )}
            <Btn kind="ghost" size="md" icon={<SkipForward />} onClick={() => goTo(idx + 1)} className="ml-auto">შემდეგი</Btn>
          </div>
        </div>
      )}

      {scoringOn ? (
        <ScoringPanel kind={kind} step={step} running={phase === 'run'} elapsed={step?.secs ? step.secs - left : 0}
          scoring={scoring.current} midi={liveMidi} target={target === null ? null : base + target} onStop={() => { stopScoring(); stopLessonNotes(); setPhase('idle'); setScoreNote('შეფასება შეწყდა.'); }} />
      ) : phase !== 'end' && !running && singingSupported() && (
        <div className="rounded-2xl bg-[#7a2028]/[0.04] ring-1 ring-[#e8dcc8] px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex-1 min-w-[180px]">
            <p className="text-[14px] font-bold text-[#4a3426]">შეფასება</p>
            <p className="text-[12.5px] leading-snug text-[#8a7a6a]">
              {scoreNote || (kind === 'pitch'
                ? 'გაიარე სავარჯიშო მიკროფონით — აპი მოგისმენს, რამდენად ზუსტად აიღე ნოტები, და ბოლოს % გამოჩნდება.'
                : kind === 'rhythm'
                  ? 'მეტრონომი ერთ ტაქტს ჩაგითვლის და ჩუმდება — შენ ინარჩუნებ ტემპს. აპი ტაშს მოისმენს და ბოლოს % გამოჩნდება.'
                  : 'გაიარე სავარჯიშო მიკროფონით — ბოლოს ავტომატური სასწავლო პროგრამა მოუსმენს და შეგაფასებს.')}
            </p>
          </div>
          <Btn icon={<Gauge />} onClick={() => (nl && kind === 'ai' && user ? showAi({ kind: 'intro' }) : (restart(), void beginScored()))}>შეფასებით</Btn>
        </div>
      )}

      {nl && (aiArrived || aiWaiting) && (
        aiArrived ? (
          <button type="button" onClick={openArrived}
            className="w-full rounded-2xl bg-[#7a2028]/[0.06] ring-1 ring-[#7a2028]/20 px-4 py-3 flex items-center gap-3 text-left cursor-pointer">
            <Sparkles className="w-5 h-5 shrink-0 text-[#7a2028]" />
            <span className="flex-1 min-w-0 text-[14px] font-bold text-[#4a3426]">AI-ს პასუხი მოვიდა</span>
            <span className="shrink-0 text-[13px] font-bold text-[#7a2028]">ნახვა</span>
          </button>
        ) : (
          <p className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3 text-[13px] leading-snug text-[#8a7a6a]">
            ჩანაწერი ინტერნეტს ელოდება — როცა დაბრუნდება, AI-ს შეფასებას გამოგიგზავნი.
          </p>
        )
      )}
      {aiScreen && (
        <AiScoreScreen open onClose={() => setAiScreen(null)} title={drill.title} state={aiScreen}
          onRecord={recordForAi} onTuner={toTuner}
          onRetry={result?.kind === 'ai' && result.mp3 ? () => void askNew(result.mp3!) : undefined} />
      )}

      {!scoringOn && <div id="drill-tuner"><MicPanel drillId={drillId} target={target === null ? null : base + target} pitched={pitched} /></div>}

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

const MicPanel: React.FC<{ drillId: string; target: number | null; pitched: boolean }> = ({ drillId, target, pitched }) => {
  const { user, state, setState, midi, secs, playing, sent, setSent, start, stop, play, send, stopAudio } = useMicTake(drillId);

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
    return (
      <div className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3.5 space-y-3">
        <div className="flex items-center gap-3">
          <RecDot />
          <span className="text-[13px] font-bold text-[#4a3426] tabular-nums">იწერება · {Math.floor(secs)} / {MAX_TAKE_SECONDS} წმ</span>
          <span className="ml-auto inline-flex items-center gap-1 text-[11.5px] text-[#8a7a6a]"><Headphones className="w-3.5 h-3.5" /> ყურსასმენით უკეთესია</span>
        </div>
        {pitched && <Tuner midi={midi} target={target} />}
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

const RecDot: React.FC = () => (
  <span className="relative flex w-2.5 h-2.5 shrink-0"><span className="absolute inset-0 rounded-full bg-[#b3261e] animate-ping opacity-60" /><span className="relative w-2.5 h-2.5 rounded-full bg-[#b3261e]" /></span>
);

/** my note against the one to sing, any octave: the names, „ზუსტად / ცოტა დაბლა / ცოტა მაღლა“ and a needle */
const Tuner: React.FC<{ midi: number | null; target: number | null }> = ({ midi, target }) => {
  const diff = midi !== null && target !== null ? (((midi - target + 6) % 12) + 12) % 12 - 6 : null;
  const tone = diff === null ? 'idle' : Math.abs(diff) < 0.25 ? 'ok' : Math.abs(diff) < 0.5 ? 'near' : 'off';
  const needle = diff === null ? 50 : 50 + Math.max(-1, Math.min(1, diff)) * 45;
  return (
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
  );
};

// A scored run in progress: notes → the tuner; rhythm → the count-in, then a beat light and the claps heard; a tip →
// the recording's time. „შეწყვეტა“ drops the run.
const ScoringPanel: React.FC<{
  kind: ScoreKind; step: ManeraStep | undefined; running: boolean; elapsed: number; scoring: Scoring | null;
  midi: number | null; target: number | null; onStop: () => void;
}> = ({ kind, step, running, elapsed, scoring, midi, target, onStop }) => {
  const rhythm = kind === 'rhythm' && running && step?.bpm && scoring && scoredStep(step, 'rhythm', 0);
  const beat = step?.bpm ? 60 / step.bpm : 1;
  const countIn = step ? countInBeats(step) : 0;
  const inCount = rhythm && elapsed < countIn * beat;
  const flash = rhythm && elapsed % beat < 0.12;
  const claps = rhythm && scoring && scoring.from !== null && !inCount
    ? onsetsOf(roundFrames(scoring.session.frames, scoring.from, scoring.from + elapsed * 1000)).filter(t => t >= countIn * beat - 0.15).length
    : 0;
  const recSecs = scoring ? Math.floor((performance.now() - scoring.session.t0) / 1000) : 0;
  return (
    <div className="rounded-2xl bg-white ring-2 ring-[#7a2028]/25 px-4 py-3.5 space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <RecDot />
        <span className="text-[13px] font-bold text-[#4a3426]">
          შეფასება მიმდინარეობს{kind === 'ai' ? <span className="tabular-nums"> · {Math.floor(recSecs / 60)}:{String(recSecs % 60).padStart(2, '0')}</span> : ''}
        </span>
        <span className="ml-auto inline-flex items-center gap-1 text-[11.5px] text-[#8a7a6a]"><Headphones className="w-3.5 h-3.5" /> ყურსასმენით უკეთესია</span>
      </div>
      {kind === 'pitch' && <Tuner midi={midi} target={running ? target : null} />}
      {kind === 'rhythm' && (
        <div className="flex items-center gap-3">
          <span className={`w-9 h-9 rounded-full shrink-0 transition-colors duration-75 ${flash ? 'bg-[#7a2028]' : 'bg-[#7a2028]/10'}`} aria-hidden />
          <p className="text-[14px] font-bold text-[#4a3426]" aria-live="polite">
            {!rhythm ? 'მოემზადე…' : inCount ? `ჩათვლა… ${Math.min(countIn, Math.floor(elapsed / beat) + 1)}` : <>ახლა შენ! <span className="font-semibold text-[#8a7a6a]">· გავიგე {claps}</span></>}
          </p>
        </div>
      )}
      {kind === 'ai' && <p className="text-[12.5px] leading-snug text-[#8a7a6a]">გაიარე ყველა ნაბიჯი — ბოლოს ავტომატური სასწავლო პროგრამა მოუსმენს ჩანაწერს.</p>}
      <Btn kind="ghost" size="sm" icon={<X />} onClick={onStop}>შეწყვეტა</Btn>
    </div>
  );
};

// The end of a scored run: the percent (and a new best), or the AI teacher's button, then its score and words.
const RunResultView: React.FC<{ result: RunResult; best: number | undefined; triesLeft: number; signedIn: boolean; onAsk: () => void }> = ({ result, best, triesLeft, signedIn, onAsk }) => {
  const pct = result.kind === 'pct' ? result.pct : result.score;
  if (pct === undefined) {
    const r = result as Extract<RunResult, { kind: 'ai' }>;
    return (
      <div className="space-y-3">
        <Sparkles className="w-9 h-9 mx-auto text-[#7a2028]" />
        <p className="font-serif-ge text-[17px] font-bold text-[#4a3426]">სავარჯიშო ჩაიწერა</p>
        {!signedIn ? (
          <p className="text-[13px] text-[#8a7a6a]">ავტომატური სასწავლო პროგრამა მხოლოდ შესულ წევრებს უსმენს.</p>
        ) : r.busy ? (
          <p className="text-[14px] font-semibold text-[#8a7a6a]">{r.mp3 ? 'ავტომატური სასწავლო პროგრამა უსმენს…' : 'ჩანაწერი მზადდება…'}</p>
        ) : r.mp3 ? (
          <>
            <Btn size="lg" icon={<Sparkles />} disabled={triesLeft <= 0} onClick={onAsk}>AI-ს შეფასება</Btn>
          </>
        ) : (
          <p className="text-[13px] text-[#8a7a6a]">ამ ბრაუზერში ჩანაწერი ვერ შეინახა.</p>
        )}
        {r.problem && <p className="text-[13px] text-red-700">{r.problem}</p>}
      </div>
    );
  }
  const record = result.record;
  return (
    <div className="space-y-2">
      <p className="text-[12px] font-bold uppercase tracking-wide text-[#8a7a6a]">{result.kind === 'ai' ? 'ავტომატური სასწავლო პროგრამის შეფასება' : 'შენი შედეგი'}</p>
      <p className={`text-[52px] leading-none font-black tabular-nums ${tone(pct)}`}>{pct}%</p>
      <p className="text-[13.5px] font-semibold text-[#4a3426]">
        {record ? (pct >= 80 ? 'ახალი საუკეთესო შედეგი! 🎉' : 'ახალი საუკეთესო შედეგი!') : best !== undefined ? `შენი საუკეთესო: ${best}%` : ''}
      </p>
      {result.kind === 'ai' && result.text && <p className="text-[14px] leading-relaxed text-[#2a2017] text-left whitespace-pre-line">{result.text}</p>}
      {result.kind === 'pct' && (
        <p className="text-[12.5px] leading-snug text-[#8a7a6a]">
          {pct >= 80 ? 'ძალიან კარგი! ხვალ კიდევ გაიმეორე, რომ მყარად დაგრჩეს.' : pct >= 50 ? 'კარგი დასაწყისია. ჯერ ჩვეულებრივად გაიარე და მერე ისევ შეფასებით.' : 'ჯერ შეფასების გარეშე, ნელა და ყურსასმენით ივარჯიშე — მერე ისევ სცადე.'}
        </p>
      )}
    </div>
  );
};
