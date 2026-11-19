import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Seg, TopBar } from '../../../components/ui2';
import type { Drill } from '../../../data/vocalDrills';
import { TrainerView } from '../../../components/mastery/trainers/Trainer';
import { useDrillHistory } from '../../../components/mastery/useDrillHistory';
import { LessonV2 } from './LessonV2';
import { ExerciseV2 } from './ExerciseV2';
import { useLightLook } from './useLightLook';

// One drill on a screen of its own in the new look (boards x-ostatoba-gakvetili and x-ostatoba-savarjisho): the round „უკან“
// and the name, „გაკვეთილი · სავარჯიშო“, then the lesson (short steps, the folds, one button at the bottom) or the exercise
// (one step, two switches, two buttons). A path drill the phone runs itself (`trainer` / `open`) still shows its old trainer —
// in the light look while it is on screen. The logic is the old screen's (components/mastery: useDrillHistory, useExercise).

type Tab = 'lesson' | 'exercise';

export const DrillScreenV2: React.FC<{ drill: Drill; label?: string; startTab: Tab; onClose: () => void }> = ({ drill, label, startTab, onClose }) => {
  const [tab, setTabState] = useState<Tab>(drill.read ? 'lesson' : startTab);
  const scrollRef = useRef<HTMLDivElement>(null);
  const back = useDrillHistory(onClose);
  // a new tab starts at its top, not where the other one was scrolled to
  const setTab = (t: Tab) => { setTabState(t); scrollRef.current?.scrollTo({ top: 0 }); };
  const trainer = !drill.read && tab === 'exercise' && !!(drill.trainer || drill.open);
  useLightLook(trainer);

  return createPortal(
    <div ref={scrollRef} role="dialog" aria-modal="true" aria-label={drill.title}
      className="sg-in fixed inset-0 z-[80] overflow-y-auto overscroll-contain bg-page text-ink safe-x">
      <div className="mx-auto flex min-h-full w-full max-w-[560px] flex-col px-4">
        <div className="sticky top-0 z-10 -mx-4 bg-page px-4 pt-[env(safe-area-inset-top)]">
          <TopBar title={drill.title} sub={label} onBack={() => back()} />
        </div>
        <div className="flex flex-1 flex-col gap-3 pt-0.5">
          {!drill.read && (
            <Seg<Tab> label="გაკვეთილი თუ სავარჯიშო" value={tab} onChange={setTab} items={[
              { id: 'lesson', label: 'გაკვეთილი' },
              { id: 'exercise', label: 'სავარჯიშო' },
            ]} />
          )}
          {drill.read || tab === 'lesson'
            ? <LessonV2 drill={drill} onExercise={() => setTab('exercise')} />
            : trainer
              ? <div className="pb-[max(20px,env(safe-area-inset-bottom))]"><TrainerView drill={drill} onClose={back} /></div>
              : <ExerciseV2 drill={drill} />}
        </div>
      </div>
    </div>,
    document.body,
  );
};
