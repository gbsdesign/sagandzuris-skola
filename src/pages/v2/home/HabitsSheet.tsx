import React from 'react';
import { CalendarRange } from 'lucide-react';
import { useNavigation } from '../../../context';
import { Button, Card, SectionLabel } from '../../../components/ui2';
import { useHabitsModel } from '../../../components/habits/useHabits';
import { useAccess } from '../../../hooks/useAccess';
import { isDue } from '../../../utils/habitSchedule';
import { HABITS_ITEM, habitItem } from '../chvevebi/nav';
import { HabitLine, WorkLine } from '../chvevebi/DayParts';

// The home's „ჩვევები“ window (2026-11-21, the user: „ჩვევების ღილაკი რომელზე დაჭერისასაც ამოხტება ფანჯარა“): today's
// habits to tick right there, the same lines as the habits' day (pages/v2/chvevebi/Day); a habit's name opens its own page
// and „ყველა ჩვევა“ the whole habits' screen on page `gz`. Loaded only when the window opens (ShortcutShelf).

const List: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Card pad="none" className="flex flex-col divide-y divide-line">{children}</Card>
);

const HabitsSheet: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { navigateTo, openMapItem } = useNavigation();
  const access = useAccess();
  const toGz = (item: string) => { onClose(); navigateTo('gz'); openMapItem(item); };
  const { model, blessing } = useHabitsModel(id => toGz(habitItem(id)));
  const date = new Date();
  const due = new Set(model.dailyIds(date));
  const daily = model.daily.flatMap(g => g.items.filter(h => due.has(h.id)).map(h => ({ h, g })));
  const rare = model.rare.flatMap(g => g.items.filter(h => !h.schedule || isDue(h.schedule, date)).map(h => ({ h, g })));
  const work = model.signedIn && access.on('work');

  return (
    <div className="flex flex-col gap-4">
      {(daily.length > 0 || work) && (
        <section className="flex flex-col gap-2">
          <SectionLabel label="ყოველდღე" />
          <List>
            {work && <WorkLine onOpen={() => toGz(HABITS_ITEM)} />}
            {daily.map(({ h, g }) => (
              <HabitLine key={h.id} model={model} habit={h} group={g} date={date} onOpen={() => toGz(habitItem(h.id))} />
            ))}
          </List>
        </section>
      )}
      {rare.length > 0 && (
        <section className="flex flex-col gap-2">
          <SectionLabel label="კვირაში და თვეში" />
          <List>
            {rare.map(({ h, g }) => (
              <HabitLine key={h.id} model={model} habit={h} group={g} date={date} onOpen={() => toGz(habitItem(h.id))} />
            ))}
          </List>
        </section>
      )}
      <Button full kind="soft" icon={<CalendarRange />} onClick={() => toGz(HABITS_ITEM)}>ყველა ჩვევა</Button>
      {blessing}
    </div>
  );
};

export default HabitsSheet;
