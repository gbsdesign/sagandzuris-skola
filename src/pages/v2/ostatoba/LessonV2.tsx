import React, { useState } from 'react';
import { Check, ChevronDown, CircleCheck, Lightbulb, Play, TriangleAlert } from 'lucide-react';
import { Button, Dot, FOCUS_IN, Num, Press, Rows, SectionLabel, cx } from '../../../components/ui2';
import type { Drill } from '../../../data/vocalDrills';
import { useFinish } from '../../../components/mastery/trainers/shared';
import { useManeraPractice } from '../../../utils/maneraPractice';
import { BottomBar, FoldRow } from './parts';

// „გაკვეთილი“ of a drill (board x-ostatoba-gakvetili): why, in one paragraph; the steps one short line each (a long one
// unfolds on a tap); „ხშირი შეცდომები“, „შეამოწმე თავი“ and the tip's „მოკლედ“ fold in place; the exercise starts from the
// one button at the bottom. A lesson only to read (`read`) ends in „წავიკითხე“.

// about two lines of a phone's row; a longer step is cut and opens on a tap
const LONG = 64;
/** a step's first part, before its „:“, „;“ or dash („ფეხები მხრების სიგანეზე; …“) — the one line shown until a tap */
const shortOf = (s: string): string | null => {
  const head = s.split(/\s*[;:]\s+|\s[—–]\s/)[0].replace(/[,.]$/, '').trim();
  return head.length >= 12 && head.length < s.length - 3 ? head : null;
};

/** „წავიკითხე“ of a lesson to read (the old DoneButton's work) */
const ReadDone: React.FC<{ drillId: string }> = ({ drillId }) => {
  const { finish } = useFinish(drillId);
  const { doneToday } = useManeraPractice();
  return doneToday(drillId)
    ? <p className="flex h-tap-lg items-center justify-center gap-1.5 text-body font-bold text-leaf-ink"><Check aria-hidden="true" className="size-[18px]" /> დღეს შესრულებულია</p>
    : <Button full icon={<Check />} onClick={() => finish(null)}>წავიკითხე</Button>;
};

export const LessonV2: React.FC<{ drill: Drill; onExercise: () => void }> = ({ drill, onExercise }) => {
  const { lesson, exercise, advice } = drill;
  const [step, setStep] = useState<number | null>(null);
  const [fold, setFold] = useState<'mistakes' | 'check' | 'advice' | null>(null);
  const toggle = (f: typeof fold) => setFold(o => (o === f ? null : f));
  return (
    <>
      <p className="px-1 text-lead leading-[1.75] wrap-break-word">{lesson.why}</p>

      <SectionLabel label="როგორ ვაკეთებთ" />
      <ol className="flex shrink-0 flex-col divide-y divide-line overflow-hidden rounded-tile bg-surf">
        {lesson.how.map((s, i) => {
          const short = shortOf(s);
          const long = !!short || s.length > LONG;
          const open = step === i;
          const body = (
            <>
              <Num n={i + 1} />
              <span className={cx('min-w-0 flex-1 text-body leading-snug font-semibold wrap-break-word', long && !open && !short && 'line-clamp-2')}>
                {open || !short ? s : short}
              </span>
              {long && <ChevronDown aria-hidden="true" className={cx('size-4 shrink-0 text-mut transition-transform', open && 'rotate-180')} strokeWidth={2} />}
            </>
          );
          return (
            <li key={i}>
              {long ? (
                <Press aria-expanded={open} onClick={() => setStep(open ? null : i)}
                  className={cx('flex min-h-[52px] w-full cursor-pointer items-center gap-3 px-4 py-2 text-left transition-colors active:bg-soft', FOCUS_IN)}>
                  {body}
                </Press>
              ) : (
                <div className="flex min-h-[52px] items-center gap-3 px-4 py-2">{body}</div>
              )}
            </li>
          );
        })}
      </ol>

      <Rows>
        <FoldRow icon={<Dot icon={<TriangleAlert />} />} title="ხშირი შეცდომები" count={lesson.mistakes.length}
          open={fold === 'mistakes'} onToggle={() => toggle('mistakes')}>
          <ul className="flex flex-col gap-2">
            {lesson.mistakes.map((m, i) => (
              <li key={i} className="flex gap-2.5 text-body leading-relaxed wrap-break-word">
                <span aria-hidden="true" className="mt-[9px] size-1.5 shrink-0 rounded-full bg-gold" />
                <span className="min-w-0">{m}</span>
              </li>
            ))}
          </ul>
        </FoldRow>
        <FoldRow icon={<Dot icon={<CircleCheck />} />} title="შეამოწმე თავი" sub={lesson.check}
          open={fold === 'check'} onToggle={() => toggle('check')}>
          <p className="text-body leading-relaxed wrap-break-word">{lesson.check}</p>
        </FoldRow>
        {advice && (
          <FoldRow icon={<Dot icon={<Lightbulb />} />} title="მოკლედ" sub={advice.split('\n')[0]}
            open={fold === 'advice'} onToggle={() => toggle('advice')}>
            <p className="text-body leading-relaxed whitespace-pre-line wrap-break-word">{advice}</p>
          </FoldRow>
        )}
      </Rows>

      <BottomBar>
        {drill.read
          ? <ReadDone drillId={drill.id} />
          : <Button full icon={<Play fill="currentColor" />} onClick={onExercise}>სავარჯიშოს დაწყება · {exercise.minutes} წთ</Button>}
      </BottomBar>
    </>
  );
};
