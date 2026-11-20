import React from 'react';
import { Button, Check as Tick, Num, Row, Rows, TopBar } from '../ui2';
import { Bottom, TeacherSays } from './parts';
import { PlayMark } from './Plan';

// „პირველი შვიდი დღე“ (board ai-shvidi): a beginner's first week, one small step a day — the days done ticked, today's
// numbered in wine with „დღეს“ at its end, the ones to come quiet — and one button for today's lesson. A pure view: the
// lead's wrapper says which step is where (utils/aiPlan's FIRST_WEEK, weekStepNow, dayWord).

export interface FirstWeekStep { title: string; sub: string; state: 'done' | 'today' | 'later' }

export const FirstWeekView: React.FC<{
  /** under the title, e.g. „დონე 0 · საფუძველი“ */
  sub: string;
  steps: FirstWeekStep[];
  /** the teacher's words over the list, only when there is something to say */
  say?: string;
  button: string;
  buttonOff?: boolean;
  onBack: () => void;
  onStart: () => void;
}> = ({ sub, steps, say, button, buttonOff, onBack, onStart }) => (
  <>
    <TopBar className="px-4" title="პირველი შვიდი დღე" sub={sub} onBack={onBack} />
    <div className="flex flex-col gap-3 px-4 pt-0.5 pb-4">
      {say && <TeacherSays text={say}>{say}</TeacherSays>}
      <Rows aria-label="შვიდი დღე">
        {steps.map((s, i) => (
          <Row key={i} title={s.title} sub={s.sub} wrap aria-current={s.state === 'today' ? 'step' : undefined}
            lead={s.state === 'done' ? <Tick on size={26} /> : <Num n={i + 1} on={s.state === 'today'} />}
            right={s.state === 'today' ? <span className="shrink-0 text-meta font-bold whitespace-nowrap text-wine">დღეს</span> : null} />
        ))}
      </Rows>
    </div>
    <Bottom>
      <Button full className="min-h-[52px]" icon={<PlayMark filled />} disabled={buttonOff} onClick={onStart}>{button}</Button>
    </Bottom>
  </>
);
