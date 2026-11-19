import React, { useState } from 'react';
import { ArrowRight, Check, ChevronDown, CircleCheck, Gauge, Mic, Pause, Play, RotateCcw, Sparkles, User, Users, Vibrate, Volume2, VolumeX } from 'lucide-react';
import {
  Button, Card, Choice, Dashes, Dot, Duo, FOCUS, Note, Num, Pill, Press, Row, Rows, SectionLabel, Sheet, Small, ToggleRow, Val, cx,
} from '../../../components/ui2';
import type { Drill } from '../../../data/vocalDrills';
import { singingSupported } from '../../../utils/singCapture';
import { stopLessonNotes } from '../../../utils/chantSynth';
import { PART_NAMES, canVibrate, useExercise } from '../../../components/mastery/useExercise';
import { useMicTake } from '../../../components/mastery/useMicTake';
import { AiScoreScreen } from './AiScore';
import { BottomBar, Ring, TunerV2, scoreTone } from './parts';
import { RunResultV2, ScoringCard, TakeCard, micLine } from './ExerciseParts';

// „სავარჯიშო“ of a drill (board x-ostatoba-savarjisho): one step on screen — the steps as short lines on top, the step's ring
// and its one sentence —, then the switches „ტიუნერი“ (the microphone: my note against the one to sing, and a take to send)
// and „AI მასწავლებლის შეფასება“ (the next start is a scored run: notes and rhythm scored in the browser, a tip's take heard
// by the AI teacher), the voice's kind, and two buttons at the bottom. All the steps are in „ნაბიჯი N / M ▾“. The logic is
// the old screen's (components/mastery/useExercise, useMicTake).

const RANGE_WORD = { low: 'კაცის', high: 'ქალის · ბავშვის' } as const;

export const ExerciseV2: React.FC<{ drill: Drill }> = ({ drill }) => {
  const ex = useExercise(drill);
  const mic = useMicTake(drill.id);
  const [scoreMode, setScoreMode] = useState(false);
  const [sheet, setSheet] = useState<'steps' | 'range' | 'part' | null>(null);
  const can = singingSupported();
  const { exercise, step, phase, idx, running, kind, user, result, scoringOn, best } = ex;
  const n = exercise.steps.length;
  const target = ex.target === null ? null : ex.base + ex.target;
  const breath = phase === 'breath';
  const minutes = Math.max(ex.total, exercise.minutes);

  // a scored run starts from the first step; the tuner's recording stops first (one microphone)
  const startScored = () => {
    if (mic.state.kind === 'on') void mic.stop();
    if (kind === 'ai' && user) ex.showAi({ kind: 'intro' });
    else { ex.restart(); void ex.beginScored(); }
  };
  const stopRun = () => { ex.stopScoring(); stopLessonNotes(); ex.setPhase('idle'); ex.setScoreNote('შეფასება შეწყდა.'); };

  const scoreSub = ex.scoreNote || (kind === 'ai' ? 'სავარჯიშოს ბოლოს მოგისმენს'
    : kind === 'rhythm' ? 'მეტრონომი ჩაგითვლის, აპი ტაშს მოისმენს — ბოლოს %' : 'აპი მოგისმენს — ბოლოს %');
  const showRows = can || ex.pitched || ex.choosesPart || ex.sounding;

  // the main button: what the step asks for now
  const main = running ? { label: 'პაუზა', icon: <Pause fill="currentColor" />, act: ex.pause }
    : phase === 'paused' ? { label: 'გაგრძელება', icon: <Play fill="currentColor" />, act: ex.resume }
    : scoreMode && can && idx === 0 && !scoringOn ? { label: 'დაწყება', icon: <Play />, act: startScored }
    : step?.secs ? { label: idx === 0 && !scoringOn ? 'დაწყება' : 'გაგრძელება', icon: <Play />, act: ex.begin }
    : { label: 'გავაკეთე', icon: <Check />, act: ex.begin };

  return (
    <>
      <SectionLabel label={exercise.title} right={<Small className="tabular-nums">~{minutes} წთ</Small>} />

      {phase === 'end' ? (
        <Card className="flex flex-col items-center gap-2 py-6 text-center">
          {result?.kind === 'ai' && user ? (
            <>
              <Dot icon={<Sparkles />} size={40} />
              <p className="text-head font-bold">სავარჯიშო ჩაიწერა</p>
              {ex.aiLast
                ? <Button size="md" icon={<Sparkles />} onClick={() => ex.setAiScreen(ex.aiLast)}>AI-ს შეფასება</Button>
                : result.mp3 && !result.busy
                  ? <Button size="md" icon={<Sparkles />} onClick={() => void ex.askNew(result.mp3!)}>AI-ს შეფასება</Button>
                  : <p className="text-meta text-mut">ჩანაწერი მზადდება…</p>}
            </>
          ) : result ? <RunResultV2 result={result} best={best} /> : (
            <>
              <Dot icon={<CircleCheck />} color="leaf" size={40} />
              <p className="text-head font-bold">სავარჯიშო დასრულდა</p>
            </>
          )}
          {ex.done && <p className="text-body font-bold text-leaf-ink">დღეს შესრულებულია ✓</p>}
          {can && (
            <Button kind="quiet" size="md" icon={<Gauge />} onClick={() => { ex.restart(); startScored(); }}>შეფასებით კიდევ</Button>
          )}
        </Card>
      ) : step && (
        <Card className="flex flex-col gap-3.5">
          <Dashes total={n} done={idx + 1} />
          <div className="-my-2 flex items-center justify-between gap-2">
            <Press onClick={() => setSheet('steps')} aria-haspopup="dialog"
              className={cx('flex h-tap min-w-0 cursor-pointer items-center gap-1 rounded-full text-meta font-semibold text-mut', FOCUS)}>
              <span className="truncate">ნაბიჯი {idx + 1} / {n}{step.secs && ex.reps > 1 ? ` · ${ex.round} / ${ex.reps}-ჯერ` : ''}</span>
              <ChevronDown aria-hidden="true" className="size-4 shrink-0" />
            </Press>
            {best !== undefined && <Small tone={scoreTone(best)} className="tabular-nums">საუკეთესო {best}%</Small>}
          </div>
          {step.parts && <Pill className="self-center">{step.listen ? 'ისმინე სამივე' : `შენ: ${PART_NAMES[ex.stepPart ?? 0]}`}</Pill>}
          {step.secs ? (
            <Ring frac={running || phase === 'paused' ? ex.frac : 1} breath={breath}
              seconds={Math.ceil(running || phase === 'paused' ? ex.left : step.secs)} />
          ) : null}
          <p className={cx('text-center text-lead leading-normal wrap-break-word', breath && 'text-mut')}>{step.text}</p>
          {mic.state.kind === 'on' && ex.pitched && <TunerV2 midi={mic.midi} target={target} className="mt-1" />}
        </Card>
      )}

      {scoringOn ? (
        <ScoringCard kind={kind} step={step} running={phase === 'run'} elapsed={step?.secs ? step.secs - ex.left : 0}
          scoring={ex.scoring.current} midi={ex.liveMidi} target={target} onStop={stopRun} />
      ) : showRows && (
        <Rows id="drill-tuner">
          {can && (
            <ToggleRow lead={<Dot icon={<Mic />} />} title={ex.pitched ? 'ტიუნერი' : 'ჩაწერა'} sub={micLine(mic, ex.pitched)}
              wrap on={mic.state.kind === 'on'}
              onChange={on => { if (on) void mic.start(); else void mic.stop(); }} />
          )}
          {can && (
            <ToggleRow lead={<Dot icon={<Sparkles />} />} title={kind === 'ai' ? 'AI მასწავლებლის შეფასება' : 'შეფასება'} sub={scoreSub}
              wrap on={scoreMode} disabled={running} onChange={setScoreMode} />
          )}
          {ex.pitched && (
            <Row lead={<Dot icon={<User />} />} title="ხმის ტიპი" right={<Val>{RANGE_WORD[ex.range]}</Val>} onClick={() => setSheet('range')} />
          )}
          {ex.choosesPart && (
            <Row lead={<Dot icon={<Users />} />} title="ჩემი ხმა" right={<Val>{PART_NAMES[ex.part]}</Val>} onClick={() => setSheet('part')} />
          )}
          {ex.sounding && (
            <ToggleRow lead={<Dot icon={ex.sound ? <Volume2 /> : <VolumeX />} />} title={ex.pitched ? 'ხმა' : 'მეტრონომი'}
              sub={ex.pitched ? 'სინთეზატორი ნოტებს უკრავს' : 'ტაქტის წკაპუნი'} on={ex.sound} onChange={ex.setSound} />
          )}
          {canVibrate && ex.clicking && (
            <ToggleRow lead={<Dot icon={<Vibrate />} />} title="ვიბრაცია" sub="ტაქტი ხელში — მიკროფონს ხელს არ უშლის" wrap
              on={ex.vibrate} onChange={ex.setVibrate} />
          )}
        </Rows>
      )}

      {!scoringOn && <TakeCard mic={mic} />}

      {ex.aiArrived ? (
        <Rows>
          <Row lead={<Dot icon={<Sparkles />} />} title="AI-ს პასუხი მოვიდა" right={<Small tone="wine">ნახვა</Small>} onClick={ex.openArrived} />
        </Rows>
      ) : ex.aiWaiting && (
        <Note>ჩანაწერი ინტერნეტს ელოდება — როცა დაბრუნდება, AI-ს შეფასებას გამოგიგზავნი.</Note>
      )}

      <BottomBar>
        {phase === 'end' ? (
          ex.done
            ? <Button full kind="ghost" icon={<RotateCcw />} onClick={ex.restart}>თავიდან</Button>
            : <Duo>
                <Button kind="ghost" icon={<RotateCcw />} onClick={ex.restart}>თავიდან</Button>
                <Button icon={<Check />} onClick={ex.finish}>შევასრულე</Button>
              </Duo>
        ) : (
          <Duo>
            <Button icon={main.icon} onClick={main.act}>{main.label}</Button>
            <Button kind="ghost" icon={<ArrowRight />} onClick={() => ex.goTo(idx + 1)}>შემდეგი</Button>
          </Duo>
        )}
      </BottomBar>

      {ex.aiScreen && (
        <AiScoreScreen open onClose={() => ex.setAiScreen(null)} title={drill.title} state={ex.aiScreen}
          onRecord={ex.recordForAi}
          onTuner={() => { ex.toTuner(); if (can && mic.state.kind !== 'on') void mic.start(); }}
          onRetry={result?.kind === 'ai' && result.mp3 ? () => void ex.askNew(result.mp3!) : undefined} />
      )}

      <Sheet open={sheet === 'steps'} title="ნაბიჯები" onClose={() => setSheet(null)}>
        <ol className="flex shrink-0 flex-col divide-y divide-line overflow-hidden rounded-tile bg-surf">
          {exercise.steps.map((s, i) => {
            const cur = i === idx && phase !== 'end';
            const past = phase === 'end' || i < idx;
            const reps = s.reps ?? 1;
            return (
              <li key={i}>
                <Press aria-current={cur ? 'step' : undefined} onClick={() => { setSheet(null); ex.goTo(i); }}
                  className="flex min-h-[52px] w-full cursor-pointer items-center gap-3 px-4 py-2 text-left transition-colors active:bg-soft">
                  {past ? <Dot icon={<Check strokeWidth={2.5} />} color="leaf" size={30} /> : <Num n={i + 1} on={cur} />}
                  <span className={cx('min-w-0 flex-1 text-body leading-snug wrap-break-word', cur ? 'font-bold' : past ? 'text-mut' : 'font-semibold')}>{s.text}</span>
                  {s.secs && <Small className="tabular-nums">{s.secs} წმ{reps > 1 ? ` ×${reps}` : ''}</Small>}
                </Press>
              </li>
            );
          })}
        </ol>
      </Sheet>
      <Sheet open={sheet === 'range'} title="ხმის ტიპი" onClose={() => setSheet(null)}>
        <Rows role="radiogroup" aria-label="ხმის ტიპი">
          <Choice title="კაცის ხმა" on={ex.range === 'low'} onClick={() => { ex.setRange('low'); setSheet(null); }} />
          <Choice title="ქალის · ბავშვის" on={ex.range === 'high'} onClick={() => { ex.setRange('high'); setSheet(null); }} />
        </Rows>
        <Note>ნოტები შენს ხმაზე ჟღერს — კაცისა ოქტავით დაბლა.</Note>
      </Sheet>
      <Sheet open={sheet === 'part'} title="ჩემი ხმა" onClose={() => setSheet(null)}>
        <Rows role="radiogroup" aria-label="ჩემი ხმა">
          {PART_NAMES.map((name, i) => (
            <Choice key={name} title={name} on={ex.part === i} onClick={() => { ex.setPart(i); setSheet(null); }} />
          ))}
        </Rows>
        <Note>შენი ხმა ჩუმდება — დანარჩენ ორს სინთეზატორი უკრავს.</Note>
      </Sheet>
    </>
  );
};
