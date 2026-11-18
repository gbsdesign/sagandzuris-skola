import React, { useEffect } from 'react';
import { useAuth, useNavigation, useViewing } from '../../../context';
import { useMyHabits } from '../../../hooks/useMyHabits';
import { useHabitsModel } from '../../../components/habits/useHabits';
import { setHabitReminders } from '../../../utils/prayerReminders';
import { habitItem, screenOf, useHabitsNav } from './nav';
import { DayScreen } from './Day';
import { PeriodScreen } from './Periods';
import { HabitScreen } from './Habit';
import { SettingsScreen } from './Settings';
import { EditScreen } from './Edit';
import { VaziScreen } from './Vazi';

// „ჩვევები“ in the new look (redesign stage 4b): page `gz`'s habits screens, one a history step (nav.ts). One model for
// all of them; finishing the whole of today sets off the fireworks and the blessing on any screen.

/** the habits with a time and reminders become this browser's reminders (and the push server's) — never on a teacher's
 *  look at a student */
const useHabitReminderSync = () => {
  const { user } = useAuth();
  const viewing = !!useViewing();
  const mine = useMyHabits(user?.uid);
  useEffect(() => {
    if (!user || viewing) return;
    setHabitReminders(
      mine.groups
        .flatMap(g => g.items)
        .filter(h => h.time && h.alerts?.length)
        .map(h => ({ id: h.id, title: h.label, at: h.time!.from, alerts: h.alerts!, ...(h.schedule ? { plan: h.schedule } : {}) })),
    );
  }, [mine.groups, user, viewing]);
};

export const ChvevebiPage: React.FC = () => {
  const { mapItem } = useNavigation();
  const { go } = useHabitsNav();
  const { model, blessing } = useHabitsModel(id => go(habitItem(id)));
  useHabitReminderSync();
  const screen = screenOf(mapItem) ?? { kind: 'view', view: 'day' as const };

  let body: React.ReactNode;
  switch (screen.kind) {
    case 'habit': body = <HabitScreen model={model} id={screen.id} />; break;
    case 'settings': body = <SettingsScreen model={model} id={screen.id} />; break;
    case 'edit': body = <EditScreen model={model} rare={screen.rare} />; break;
    case 'vazi': body = <VaziScreen />; break;
    default: body = screen.view === 'day' ? <DayScreen model={model} /> : <PeriodScreen model={model} view={screen.view} />;
  }
  return (
    <div className="flex w-full flex-col gap-3 pb-4">
      {body}
      {blessing}
    </div>
  );
};

export default ChvevebiPage;
