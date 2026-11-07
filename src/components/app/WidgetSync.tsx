import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context';
import { useMyHabits } from '../../hooks/useMyHabits';
import { useMyPsalterGroups } from '../../hooks/usePsalter';
import { useAllLearning } from '../../hooks/useLearning';
import { HABIT_TONES, COUNTER_TAP_STEP } from '../../data/habitLooks';
import { dueDailyOf } from '../habits/useHabits';
import { usePathStats } from '../views/PathSummary';
import { useMasteryPath } from '../mastery/useMasteryPath';
import { useIndependentWork } from '../views/IndependentWorkCard';
import { useSamosiSummary } from '../views/PathOrbs';
import { usePathPearls } from '../pearls/LearnChests';
import { SAMOSI_TOTAL } from '../../data/samosiData';
import { reviewsDue } from '../../utils/learn';
import { cycleOf, georgiaToday, kathismasOf, ownersIn } from '../../utils/psalter';
import { shortcutLabel, useMyShortcuts } from '../../utils/shortcuts';
import { onWidgetsChanged, sendWidgetSummary, widgetsLinked } from '../../utils/widgetLink';

// While the site is open (in the app or in Chrome on the same phone), it leaves for the app's home-screen widgets what
// they show: today's habits with their colours, icons and counters, the path's five percentages, the reviews due, my
// psalter kanon and my home buttons. Sent when it changes, a few seconds after the last change; the widgets read today's
// ticks live, so a tick made here or on the widget shows on both. Nothing is mounted until the widgets are linked.

const round = (n: number | null | undefined) => Math.max(0, Math.min(100, Math.round(n ?? 0)));

const Sync: React.FC<{ uid: string }> = ({ uid }) => {
  const mine = useMyHabits(uid);
  const path = usePathStats();
  // „ოსტატობა“'s ring: the current level's exercises passed (the path page's ring)
  const manera = useMasteryPath().summary;
  const work = useIndependentWork();
  // the widget's „მარგალიტები“ ring: the share of „ნასწავლი“'s pearls that shine (a teacher confirmed them)
  const pearls = usePathPearls();
  const pearlPct = pearls.total ? (100 * pearls.shining) / pearls.total : 0;
  const samosi = useSamosiSummary();
  const learning = useAllLearning(uid);
  const { groups } = useMyPsalterGroups(uid);
  const { list: shortcuts } = useMyShortcuts(uid);
  const today = georgiaToday();

  const summary = useMemo(() => {
    const due = new Set(dueDailyOf(mine.groups)(new Date()));
    const habits = mine.groups.flatMap(g => g.items.map(h => ({ h, daily: g.goal.per === 'day' })))
      .filter(({ h, daily }) => !daily || due.has(h.id))
      .map(({ h, daily }) => {
        const look = mine.looks[h.id];
        const counter = mine.counters[h.id];
        return {
          id: h.id,
          t: h.label,
          c: look ? HABIT_TONES[look.tone]?.c : undefined,
          i: look?.icon,
          ...(daily ? {} : { rare: 1 }),
          ...(counter ? { goal: counter.goal, unit: counter.unit, step: COUNTER_TAP_STEP[h.id] ?? 1 } : {}),
        };
      });
    const g = groups.find(x => x.memberIds.includes(uid));
    let kanon: { n: number[]; group: string } | null = null;
    if (g) {
      const c = cycleOf(today, g.cycleDays, g.shiftDays);
      kanon = { n: kathismasOf(ownersIn(g.assignment, g.baseHalf, c.half), uid), group: g.name };
    }
    return {
      v: 1,
      day: today,
      habits: habits.slice(0, 30),
      path: {
        learn: round(path.percent),
        manera: round(manera.pct),
        work: round(work.planned?.percent),
        pearls: round(pearlPct),
        samosi: round((100 * samosi.count) / SAMOSI_TOTAL),
      },
      due: reviewsDue(learning?.learning, today).length,
      kanon,
      buttons: (shortcuts ?? []).slice(0, 12).map(id => ({ id, t: shortcutLabel(id)?.label || '' })).filter(b => b.t),
    };
  }, [mine, path.percent, manera.pct, work.planned?.percent, pearlPct, samosi.count, learning, groups, shortcuts, uid, today]);

  const text = JSON.stringify(summary);
  useEffect(() => {
    const t = window.setTimeout(() => { sendWidgetSummary(summary).catch(() => { /* next change tries again */ }); }, 4000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  return null;
};

export const WidgetSync: React.FC = () => {
  const { user } = useAuth();
  const [linked, setLinked] = useState(widgetsLinked);
  useEffect(() => onWidgetsChanged(() => setLinked(widgetsLinked())), []);
  return user && linked ? <Sync uid={user.uid} /> : null;
};
