import React from 'react';
import { HabitsModel } from '../../../components/habits/useHabits';
import { TopBar } from '../../../components/ui2';
import { HabitsMore, ViewSwitch } from './More';
import { useHabitsNav } from './nav';
import { WeekView } from './Week';
import { MonthView } from './Month';
import { YearView } from './Year';

/** „კვირა · თვე · წელი“ of the habits (x-chvevebi-kvira / -tve / -tseli) */
export const PeriodScreen: React.FC<{ model: HabitsModel; view: 'week' | 'month' | 'year' }> = ({ model, view }) => {
  const { back } = useHabitsNav();
  return (
    <div className="flex flex-col gap-3 pb-6">
      <TopBar title="ჩვევები" onBack={back} right={<HabitsMore />} />
      <ViewSwitch value={view} />
      {view === 'week' ? <WeekView model={model} /> : view === 'month' ? <MonthView model={model} /> : <YearView model={model} />}
    </div>
  );
};
