import React, { useState } from 'react';
import { Card, Stats, cx } from '../../../components/ui2';
import { HabitsModel } from '../../../components/habits/useHabits';
import { MONTHS_GE, MONTHS_SHORT_GE, WEEKDAYS_GE, WEEKDAYS_SHORT_GE } from '../../../utils/dateNames';
import { canTickDay, dayKey, periodStart } from '../../../utils/habitsWeek';
import { dayState, daysShare, parseDay, periodDays, shiftPeriod } from '../../../utils/habitStats';
import { setHabitsDate, useHabitsNav } from './nav';
import { PeriodNav } from './PeriodNav';

// „კვირა“ (x-chvevebi-kvira): the daily habits down, the week's days across (Sunday first, as the habits' week).

const weekTitle = (from: Date, to: Date) =>
  from.getMonth() === to.getMonth()
    ? `${from.getDate()}–${to.getDate()} ${MONTHS_GE[from.getMonth()]}`
    : `${from.getDate()} ${MONTHS_SHORT_GE[from.getMonth()]} – ${to.getDate()} ${MONTHS_SHORT_GE[to.getMonth()]}`;

const COLS = 'grid grid-cols-[minmax(0,1fr)_repeat(7,1.5rem)] items-center gap-x-0.5';

export const WeekView: React.FC<{ model: HabitsModel }> = ({ model }) => {
  const { back } = useHabitsNav();
  const [offset, setOffset] = useState(0);
  const now = new Date();
  const today = dayKey(now);
  const start = shiftPeriod(periodStart('week', now), 'week', offset);
  const days = periodDays(start, 'week');
  const firstWeek = dayKey(periodStart('week', model.first ? parseDay(model.first) : now));
  const share = daysShare(model.log, model.dailyIds, days, model.first);
  const before = daysShare(model.log, model.dailyIds, periodDays(shiftPeriod(start, 'week', -1), 'week'), model.first);
  const rows = model.all.filter(x => x.group.goal.per === 'day');

  // „N / M“: the daily ticks of the days that have come, of all that were due then
  let done = 0;
  let of = 0;
  for (const d of days) {
    if (dayKey(d) > today) continue;
    const s = dayState(model.log, model.dailyIds, d);
    done += s.done;
    of += s.total;
  }

  const pick = (d: Date) => { setHabitsDate(d); back(); };

  return (
    <>
      <PeriodNav
        title={weekTitle(days[0], days[6])}
        sub={offset === 0 ? 'ეს კვირა' : offset === -1 ? 'წინა კვირა' : String(days[6].getFullYear())}
        onPrev={dayKey(start) > firstWeek ? () => setOffset(o => o - 1) : undefined}
        onNext={offset < 0 ? () => setOffset(o => o + 1) : undefined}
      />

      <Card pad="none">
        <div className={cx(COLS, 'px-4 pt-1')}>
          <span />
          {days.map(d => {
            const key = dayKey(d);
            return (
              <button
                key={key}
                type="button"
                disabled={!canTickDay(d)}
                onClick={() => pick(d)}
                aria-label={`${WEEKDAYS_GE[d.getDay()]}, ${d.getDate()} ${MONTHS_GE[d.getMonth()]}`}
                className={cx(
                  'min-h-10 text-center text-cap font-semibold enabled:cursor-pointer',
                  key === today ? 'text-wine' : 'text-mut',
                )}
              >
                {WEEKDAYS_SHORT_GE[d.getDay()]}
              </button>
            );
          })}
        </div>
        {rows.length === 0 && <p className="border-t border-line px-4 py-4 text-meta text-mut">ყოველდღიური ჩვევები ჯერ არ არის.</p>}
        {rows.map(({ habit }) => (
          <div key={habit.id} className={cx(COLS, 'min-h-11 border-t border-line px-4 py-2')}>
            <span className="min-w-0 pr-1 text-body leading-tight font-semibold wrap-break-word">{habit.label}</span>
            {days.map(d => {
              const key = dayKey(d);
              const on = model.isOn(habit.id, d);
              const due = model.dailyIds(d).includes(habit.id);
              return (
                <span key={key} aria-hidden="true" className="flex h-5 items-center justify-center">
                  {on ? <span className="size-5 rounded-full bg-wine" />
                    : key > today || !due ? <span className="size-1.5 rounded-full bg-dim" />
                    : <span className="size-5 rounded-full border border-dim" />}
                </span>
              );
            })}
          </div>
        ))}
      </Card>

      <Stats
        items={[
          { value: of ? `${done} / ${of}` : '—', label: offset === 0 ? 'ამ კვირას' : 'ამ კვირაში' },
          { value: share ? share.countedDays : '—', label: 'დღე ჩაითვალა' },
          { value: before ? `${before.percent}%` : '—', label: 'წინა კვირა' },
        ]}
      />
    </>
  );
};
