import React, { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { Button, Card, H2, Helper, Para, SectionLabel, Sheet, TopBar } from '../../../components/ui2';
import { HabitsModel } from '../../../components/habits/useHabits';
import { WorkPanel } from '../../../components/views/IndependentWorkCard';
import { useAccess } from '../../../hooks/useAccess';
import { isDue } from '../../../utils/habitSchedule';
import { HabitsMore } from './More';
import { VAZI_ITEM, habitItem, useHabitsDate, useHabitsNav } from './nav';
import { DayCard, HabitLine, WorkLine, barSub } from './DayParts';
import { HelpButton } from '../mkitkhe/HelpButton';

// „ჩვევები“ — the day (boards x-chvevebi and x-carieli-chvevebi): the top card with the ring and the week, then one line a
// habit. The round mark ticks the picked day, the rest of the line opens the habit's page; the other views, the change of
// the list and the note are in the bar's „⋯“.

// `help`: the ready answers of „მკითხე“ that speak of it (pages/v2/mkitkhe/light.ts lights it)
const List: React.FC<{ children: React.ReactNode; help?: string }> = ({ children, help }) => (
  <Card pad="none" data-help={help} className="flex flex-col divide-y divide-line">{children}</Card>
);

export const DayScreen: React.FC<{ model: HabitsModel }> = ({ model }) => {
  const { go, back } = useHabitsNav();
  const [date, setDate] = useHabitsDate();
  const access = useAccess();
  const [sheet, setSheet] = useState<'work' | 'plan' | null>(null);
  const due = new Set(model.dailyIds(date));
  const daily = model.daily.flatMap(g => g.items.filter(h => due.has(h.id)).map(h => ({ h, g })));
  const rare = model.rare.flatMap(g => g.items.filter(h => !h.schedule || isDue(h.schedule, date)).map(h => ({ h, g })));
  const work = model.signedIn && access.on('work');

  return (
    <div className="flex flex-col gap-4 pb-6">
      <TopBar title="ჩვევები" sub={barSub(date)} onBack={back} right={(
        <>
          <span data-help="26" className="flex rounded-full"><HabitsMore views /></span>
          {/* „?“ — three ready answers about this page (x-idea-adgilze), always last */}
          <HelpButton page="habits" />
        </>
      )} />
      <DayCard model={model} date={date} onPick={setDate} onVazi={() => go(VAZI_ITEM)} />

      {(daily.length > 0 || work) && (
        <section className="flex flex-col gap-2">
          <SectionLabel label="ყოველდღე" />
          <List help="25">
            {work && <WorkLine onOpen={() => setSheet('work')} />}
            {daily.map(({ h, g }) => (
              <HabitLine key={h.id} model={model} habit={h} group={g} date={date} onOpen={() => go(habitItem(h.id))} />
            ))}
          </List>
        </section>
      )}

      {rare.length > 0 && (
        <section className="flex flex-col gap-2">
          <SectionLabel label="კვირაში და თვეში" />
          <List>
            {rare.map(({ h, g }) => (
              <HabitLine key={h.id} model={model} habit={h} group={g} date={date} onOpen={() => go(habitItem(h.id))} />
            ))}
          </List>
        </section>
      )}

      <Sheet open={sheet === 'work'} title="დამოუკიდებელი სამუშაო" onClose={() => setSheet(null)}>
        <div className="flex flex-col gap-3">
          <Para sans>აირჩიე, რომელ დღეს და საათზე მეცადინეობ მარტო — მინიმუმ ორი დღე კვირაში.</Para>
          <Helper icon={<CalendarDays />}>არჩეული საათები კალენდარში გამოჩნდება.</Helper>
          <Button full icon={<CalendarDays />} onClick={() => setSheet('plan')}>განრიგის დაყენება</Button>
        </div>
      </Sheet>
      <Sheet open={sheet === 'plan'} title="დამოუკიდებელი სამუშაო" onClose={() => setSheet(null)}>
        <WorkPanel />
      </Sheet>
    </div>
  );
};
