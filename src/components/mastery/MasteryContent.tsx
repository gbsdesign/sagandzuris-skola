import React, { useState } from 'react';
import { useAuth } from '../../context';
import { useMyClasses } from '../../hooks/useClasses';
import { ClassLessons } from './ClassLessons';
import { DrillSheet } from './ManeraLessonSheet';
import { DayPlan, ExtraDrills, LessonLibrary, LevelCard, PathLevels } from './MasteryPath';
import { EntryTest } from './EntryTest';
import { useMasteryPath } from './useMasteryPath';

// „ოსტატობა“ on the path page = „ოსტატობის გზა“ since 2026-11-07 (plan https://claude.ai/artifact/BNanxAMNuUZMjHNuhx7oo5):
// my level, today's plan, the lessons of my classes step by step, the six levels with their exercises, the lessons to read
// (the eleven tips with my teachers' marks and the new ones) and the old groups' extra drills. One drill sheet for all.
export const MasteryContent: React.FC = () => {
  const { user } = useAuth();
  const classes = useMyClasses(user?.uid);
  const path = useMasteryPath();
  const [sheet, setSheet] = useState<{ id: string; tab: 'lesson' | 'exercise' } | null>(null);
  const [test, setTest] = useState(false);
  const open = (id: string, tab: 'lesson' | 'exercise' = 'lesson') => setSheet({ id, tab });
  const current = path.summary.level;
  return (
    <div className="space-y-4">
      <LevelCard record={path.record} state={path.levels[current]} tested={path.tested} onTest={() => setTest(true)} />
      <DayPlan plan={path.plan} doneToday={path.doneToday} onOpen={open} />
      {classes.map(c => <ClassLessons key={c.id} cls={c} canEdit={false} bare showClassName={classes.length > 1} />)}
      <PathLevels record={path.record} levels={path.levels} current={current} doneToday={path.doneToday} onOpen={open} />
      <LessonLibrary onOpen={open} />
      <ExtraDrills record={path.record} onOpen={open} />
      {path.tested && (
        <button type="button" onClick={() => setTest(true)} className="block mx-auto text-[12.5px] font-semibold text-[#8a7a6a] underline underline-offset-2 cursor-pointer">
          საწყისი ტესტის თავიდან გავლა
        </button>
      )}
      <DrillSheet drillId={sheet?.id ?? null} startTab={sheet?.tab} onClose={() => setSheet(null)} />
      <EntryTest open={test} onClose={() => setTest(false)} />
    </div>
  );
};
