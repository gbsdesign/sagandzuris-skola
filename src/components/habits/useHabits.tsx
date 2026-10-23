import React, { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { HabitGroupType } from '../../data/habitsAndManera';
import { HabitCounter, HabitLook } from '../../data/habitLooks';
import { useAuth, useChants } from '../../context';
import { useMyHabits } from '../../hooks/useMyHabits';
import { MyHabit, MyHabitGroup } from '../../utils/myHabits';
import { DayIds, HabitCounts, HabitLog, dayKey, idsOn } from '../../utils/habitsWeek';
import { isDue } from '../../utils/habitSchedule';
import { historyStart } from '../../utils/habitStats';
import { triggerHaptic } from '../../utils/haptics';

// Everything the habits' views share (components/habits): the member's list, its colours and counters, the log,
// and the actions. A new view takes this one model — nothing else needs to change to add it.

export const dailyOf = <G extends HabitGroupType>(groups: G[]) => groups.filter(g => g.goal.per === 'day');
export const rareOf = <G extends HabitGroupType>(groups: G[]) => groups.filter(g => g.goal.per !== 'day');
export const dailyIdsOf = (groups: HabitGroupType[]) => dailyOf(groups).flatMap(g => g.items.map(h => h.id));
/** the daily habits due on a day: all of them, but one with „მორგებული“ days only on those */
export const dueDailyOf = (groups: MyHabitGroup[]) => {
  const items = dailyOf(groups).flatMap(g => g.items);
  return (date: Date) => items.filter(h => !h.schedule || isDue(h.schedule, date)).map(h => h.id);
};

const celebrate = () => {
  try {
    const colors = ['#7a2028', '#f3c969', '#10b981', '#fbf6ec'];
    confetti({ particleCount: 90, spread: 70, startVelocity: 45, origin: { y: 0.7 }, colors });
    confetti({ particleCount: 50, spread: 110, decay: 0.92, scalar: 0.9, origin: { y: 0.7 }, colors });
  } catch {
    /* confetti is decoration only */
  }
};

const Blessing: React.FC = () => (
  <div className="fixed inset-x-0 bottom-8 z-[90] flex justify-center px-4 pointer-events-none safe-bottom">
    <div className="px-6 py-3.5 rounded-full bg-[#7a2028] text-[#fbf6ec] font-serif-ge text-lg font-bold shadow-[0_12px_32px_-10px_rgba(122,32,40,0.6)] animate-in fade-in slide-in-from-bottom-4 zoom-in-95 duration-300">
      ღმერთს ებარებოდე! 🙏
    </div>
  </div>
);

/** Ticks or unticks a habit for a day (today unless given). The tick that completes all of today's habits sets off
 *  fireworks and a blessing — render `blessing` on the page. `dailyIds`: the daily habits, when the caller has them. */
export const useHabitToggle = (dailyIds?: DayIds) => {
  const { habitLog, toggleHabit } = useChants();
  const { user } = useAuth();
  const own = useMyHabits(dailyIds ? null : user?.uid).groups;
  const DAILY_IDS = idsOn(dailyIds ?? dueDailyOf(own), new Date());
  const [blessing, setBlessing] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const toggle = (id: string, date: Date = new Date()) => {
    if (!toggleHabit(id, date)) return false;
    triggerHaptic(12);
    const day = dayKey(date);
    if (day !== dayKey(new Date())) return true;
    const today = new Set([...(habitLog[day] || []), id]);
    if (DAILY_IDS.includes(id) && DAILY_IDS.every(h => today.has(h))) {
      celebrate();
      setBlessing(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setBlessing(false), 2800);
    }
    return true;
  };
  return { toggle, blessing: blessing ? <Blessing /> : null };
};

export interface HabitsModel {
  /** the member's groups: daily ones, then weekly and monthly ones */
  daily: MyHabitGroup[];
  rare: MyHabitGroup[];
  /** every habit with its group, in the list's order */
  all: { habit: MyHabit; group: MyHabitGroup }[];
  /** the daily habits due on a day */
  dailyIds: (date: Date) => string[];
  looks: Record<string, HabitLook>;
  counters: Record<string, HabitCounter>;
  log: HabitLog;
  counts: HabitCounts;
  /** the first ticked day: nothing before it counts as missed */
  first: string | null;
  signedIn: boolean;
  isOn: (id: string, date: Date) => boolean;
  countOn: (id: string, date: Date) => number;
  toggle: (id: string, date: Date) => void;
  /** sets a counted habit's number; reaching the goal ticks the day */
  setCount: (id: string, n: number, date: Date) => void;
  /** opens a habit's own page */
  openHabit: (id: string) => void;
}

export const useHabitsModel = (openHabit: (id: string) => void): { model: HabitsModel; blessing: React.ReactNode } => {
  const { habitLog, habitCounts, setHabitCount } = useChants();
  const { user } = useAuth();
  const mine = useMyHabits(user?.uid);
  const dailyIds = useMemo(() => dueDailyOf(mine.groups), [mine.groups]);
  const { toggle, blessing } = useHabitToggle(dailyIds);
  const first = useMemo(() => historyStart(habitLog), [habitLog]);

  const isOn = (id: string, date: Date) => (habitLog[dayKey(date)] || []).includes(id);
  const model: HabitsModel = {
    daily: dailyOf(mine.groups),
    rare: rareOf(mine.groups),
    all: mine.groups.flatMap(group => group.items.map(habit => ({ habit, group }))),
    dailyIds,
    looks: mine.looks,
    counters: mine.counters,
    log: habitLog,
    counts: habitCounts,
    first,
    signedIn: !!user,
    isOn,
    countOn: (id, date) => habitCounts[dayKey(date)]?.[id] ?? 0,
    toggle: (id, date) => { toggle(id, date); },
    setCount: (id, n, date) => {
      const before = habitCounts[dayKey(date)]?.[id] ?? 0;
      setHabitCount(id, n, date);
      const goal = mine.counters[id]?.goal;
      if (!goal) return;
      // a typed number back under the goal (a mistake put right) unticks the day its count had ticked
      if (n >= goal ? !isOn(id, date) : before >= goal && isOn(id, date)) toggle(id, date);
    },
    openHabit,
  };
  return { model, blessing };
};
