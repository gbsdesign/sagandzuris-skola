import React, { useMemo } from 'react';
import { BookOpenCheck, Check, ChevronRight } from 'lucide-react';
import { Button, Card, Dot, Press, Row, Small, Two, cx, FOCUS_IN } from '../../../components/ui2';
import { COUNTED_BY_READING, COUNTER_TAP_STEP } from '../../../data/habitLooks';
import { HabitsModel } from '../../../components/habits/useHabits';
import { MyHabit, MyHabitGroup } from '../../../utils/myHabits';
import { MONTHS_GE, WEEKDAYS_GE, WEEKDAYS_SHORT_GE } from '../../../utils/dateNames';
import { dayKey, periodStart } from '../../../utils/habitsWeek';
import { currentRun, dayState, ticksOf, timesIn } from '../../../utils/habitStats';
import { triggerHaptic } from '../../../utils/haptics';
import { useIndependentWork } from '../../../components/views/IndependentWorkCard';

const isToday = (d: Date) => dayKey(d) === dayKey(new Date());
export const dateWords = (d: Date) => `${d.getDate()} ${MONTHS_GE[d.getMonth()]}`;
/** „დღეს · 16 ნოემბერი“, or „ორშაბათი · 10 ნოემბერი“ on another day */
export const barSub = (d: Date) => `${isToday(d) ? 'დღეს' : WEEKDAYS_GE[d.getDay()]} · ${dateWords(d)}`;

/** the week of a day, Sunday first — as the habits' own week and the „კვირა“ / „თვე“ screens count it (the strip began on Monday
 *  while they began on Sunday; one week everywhere since 2026-11-20) */
const weekOf = (d: Date): Date[] => {
  const mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay());
  return Array.from({ length: 7 }, (_, i) => new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i));
};

const RING_R = 22;
const RING_LEN = 2 * Math.PI * RING_R;

/** the number done inside a ring */
const Ring: React.FC<{ done: number; total: number }> = ({ done, total }) => (
  <span aria-hidden="true" className="relative flex size-14 shrink-0 items-center justify-center">
    <svg viewBox="0 0 56 56" className="absolute inset-0 size-full -rotate-90">
      <circle cx="28" cy="28" r={RING_R} className="fill-none stroke-track" strokeWidth="5" />
      {done > 0 && total > 0 && (
        <circle cx="28" cy="28" r={RING_R} className="fill-none stroke-wine transition-[stroke-dashoffset] duration-500" strokeWidth="5"
          strokeLinecap="round" strokeDasharray={RING_LEN} strokeDashoffset={RING_LEN * (1 - Math.min(1, done / total))} />
      )}
    </svg>
    <span className="relative text-body font-bold tabular-nums text-wine">{done}</span>
  </span>
);

/** The top card: the ring, „N / M დღეს“, what is left, „ვაზი ›“, and the seven days of the picked day's week. */
export const DayCard: React.FC<{ model: HabitsModel; date: Date; onPick: (d: Date) => void; onVazi: () => void }> = ({ model, date, onPick, onVazi }) => {
  const s = dayState(model.log, model.dailyIds, date);
  const empty = model.first == null;
  const today = isToday(date);
  const left = s.total - s.done;
  const sub = empty
    ? 'მონიშნე პირველი — და ვაზზე პირველი ფოთოლი გამოვა.'
    : s.total === 0 ? 'ამ დღეს ჩვევა არ არის' : left > 0 ? `კიდევ ${left} დარჩა` : 'ყველა შესრულდა';
  const now = new Date();
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center gap-3.5">
        {!empty && <Ring done={s.done} total={s.total} />}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-head leading-tight font-bold tabular-nums">{s.done} / {s.total} {today ? 'დღეს' : dateWords(date)}</span>
          <span className="text-meta text-mut">{sub}</span>
        </span>
        <Button kind="soft" size="md" className="h-icon pr-3 pl-4 text-meta" onClick={onVazi}>
          <span className="flex items-center gap-1">ვაზი <ChevronRight aria-hidden="true" className="size-4" /></span>
        </Button>
      </div>
      <div role="radiogroup" aria-label="კვირის დღეები" className="grid grid-cols-7 gap-1">
        {weekOf(date).map(d => {
          const st = dayState(model.log, model.dailyIds, d);
          const future = dayKey(d) > dayKey(now);
          const on = dayKey(d) === dayKey(date);
          const all = st.total > 0 && st.done >= st.total;
          return (
            <button
              key={dayKey(d)}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={future}
              aria-label={`${WEEKDAYS_GE[d.getDay()]}, ${dateWords(d)} — ${st.done} / ${st.total}`}
              onClick={() => { triggerHaptic(8); onPick(d); }}
              className={cx('flex min-h-tap cursor-pointer flex-col items-center justify-center gap-1 rounded-field disabled:cursor-default', future && 'opacity-40')}
            >
              <span className={cx(
                'flex size-7 items-center justify-center rounded-full border-2',
                all ? 'border-wine bg-wine text-white' : st.done > 0 ? 'border-wine/40 bg-tint' : 'border-dim',
                on && 'ring-2 ring-wine/30 ring-offset-2 ring-offset-surf',
              )}>
                {all && <Check aria-hidden="true" className="size-4" strokeWidth={3} />}
              </span>
              <span className={cx('text-cap leading-none', on ? 'font-bold text-wine' : 'text-mut')}>{WEEKDAYS_SHORT_GE[d.getDay()]}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
};

const MARK_R = 14;
const MARK_LEN = 2 * Math.PI * MARK_R;

/** One habit: the round mark (ticks it, or adds a counted habit's step) and the line that opens its page. */
export const HabitLine: React.FC<{ model: HabitsModel; habit: MyHabit; group: MyHabitGroup; date: Date; onOpen: () => void }> = ({ model, habit, group, date, onOpen }) => {
  const on = model.isOn(habit.id, date);
  const counter = model.counters[habit.id];
  const count = counter ? model.countOn(habit.id, date) : 0;
  const step = COUNTER_TAP_STEP[habit.id] ?? (habit.menu === 'jesus' ? 10 : 1);
  const adds = !!counter && !on && !COUNTED_BY_READING.includes(habit.id);
  const rare = group.goal.per !== 'day';
  const ticks = useMemo(() => ticksOf(model.log, habit.id), [model.log, habit.id]);

  let sub: React.ReactNode = null;
  let right: React.ReactNode = null;
  if (rare) {
    const per = group.goal.per;
    const now = dayKey(periodStart(per, date)) === dayKey(periodStart(per, new Date()));
    const n = timesIn(ticks, periodStart(per, date), per);
    sub = per === 'week' ? (now ? 'ამ კვირას' : 'იმ კვირას') : now ? 'ამ თვეში' : 'იმ თვეში';
    right = <Small tone={n >= group.goal.times ? 'leaf' : 'mut'} className="tabular-nums">{n} / {group.goal.times}</Small>;
  } else {
    if (counter) sub = <span className="tabular-nums">{count} / {counter.goal}{counter.unit && counter.unit !== 'ჯერ' ? ` ${counter.unit}` : ''}</span>;
    else if (habit.time && !on) sub = `შემდეგი ${habit.time.from}-ზე`;
    const run = currentRun(ticks, group.goal, model.first);
    if (run > 0) right = <Small className="tabular-nums">{run} დღე</Small>;
  }

  const press = () => {
    triggerHaptic(8);
    if (adds) model.setCount(habit.id, count + step, date);
    else model.toggle(habit.id, date);
  };

  return (
    <div className="flex min-h-14 items-center">
      <button
        type="button"
        role={adds ? undefined : 'checkbox'}
        aria-checked={adds ? undefined : on}
        aria-label={adds ? `${habit.label} — +${step}` : habit.label}
        onClick={press}
        className={cx('flex size-tap-lg shrink-0 cursor-pointer items-center justify-center pl-2', FOCUS_IN)}
      >
        <span className={cx(
          'relative flex size-8 items-center justify-center rounded-full transition-colors duration-200',
          on ? 'bg-wine text-white' : 'border-2 border-dim',
        )}>
          {on && <Check aria-hidden="true" className="size-[18px]" strokeWidth={3} />}
          {adds && count > 0 && counter && (
            <svg aria-hidden="true" viewBox="0 0 32 32" className="absolute -inset-0.5 size-8 -rotate-90">
              <circle cx="16" cy="16" r={MARK_R} className="fill-none stroke-wine" strokeWidth="2.5" strokeLinecap="round"
                strokeDasharray={MARK_LEN} strokeDashoffset={MARK_LEN * (1 - Math.min(1, count / counter.goal))} />
            </svg>
          )}
        </span>
      </button>
      <Press
        onClick={onOpen}
        aria-label={`${habit.label} — ჩვევის გვერდი`}
        className={cx('flex min-h-14 min-w-0 flex-1 cursor-pointer items-center gap-2.5 py-2 pr-4 pl-1 text-left transition-colors active:bg-soft', FOCUS_IN)}
      >
        <Two title={habit.label} sub={sub} wrap />
        {right}
      </Press>
    </div>
  );
};

/** „დამოუკიდებელი სამუშაო“, the first line of the list: this month's hours and today's still to tick. */
export const WorkLine: React.FC<{ onOpen: () => void }> = ({ onOpen }) => {
  const work = useIndependentWork();
  const left = work.today.filter(s => !s.done).length;
  const sub = work.planned ? `${work.monthName} · ${work.planned.worked} / ${work.planned.planned} სთ` : 'საათები დაგეგმე კალენდარში';
  return (
    <Row
      lead={<Dot icon={<BookOpenCheck />} />}
      title="დამოუკიდებელი სამუშაო"
      sub={<span className="tabular-nums">{sub}</span>}
      right={left > 0 ? <Small tone="wine">დღეს {left}</Small> : undefined}
      onClick={onOpen}
    />
  );
};
