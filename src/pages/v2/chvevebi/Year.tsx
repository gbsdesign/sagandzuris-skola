import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Card, Row, Rows, Small, Stats, cx } from '../../../components/ui2';
import { HabitsModel } from '../../../components/habits/useHabits';
import { MONTHS_SHORT_GE } from '../../../utils/dateNames';
import { dayKey } from '../../../utils/habitsWeek';
import { addDays, dayState, parseDay, ticksBetween, ticksOf, yearWeeks } from '../../../utils/habitStats';
import { habitItem, useHabitsNav } from './nav';
import { PeriodNav } from './PeriodNav';

// „წელი“ (x-chvevebi-tseli): the year's numbers, one map of the whole year and a short list of the habits' days.

const SHOWN = 4;

/** a day's square: ahead / before the history, nothing, some, counted (half), all */
const square = (level: number) =>
  level < 0 ? 'bg-track' : level === 0 ? 'bg-wine/10' : level < 0.5 ? 'bg-wine/30' : level < 1 ? 'bg-wine/60' : 'bg-wine';

const YearMap: React.FC<{ year: number; model: HabitsModel }> = ({ year, model }) => {
  const weeks = useMemo(() => yearWeeks(year), [year]);
  const today = dayKey(new Date());
  return (
    <div aria-hidden="true">
      <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}>
        {weeks.map((w, i) => (
          <div key={i} className="grid gap-px">
            {w.map((d, j) => {
              if (!d) return <span key={j} className="aspect-square" />;
              const key = dayKey(d);
              const level = key > today || !model.first || key < model.first ? -1 : dayState(model.log, model.dailyIds, d).share;
              return <span key={j} className={cx('aspect-square', square(level))} />;
            })}
          </div>
        ))}
      </div>
      <div className="relative mt-1.5 h-4">
        {weeks.map((w, i) => {
          const first = w.find(d => d && d.getDate() === 1);
          return first ? (
            <span key={i} className={cx('absolute top-0 text-cap leading-none text-mut', first.getMonth() % 2 ? 'hidden min-[420px]:inline' : '')}
              style={{ left: `${(i / weeks.length) * 100}%` }}>
              {MONTHS_SHORT_GE[first.getMonth()]}
            </span>
          ) : null;
        })}
      </div>
    </div>
  );
};

export const YearView: React.FC<{ model: HabitsModel }> = ({ model }) => {
  const { go } = useHabitsNav();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [all, setAll] = useState(false);
  const firstYear = model.first ? parseDay(model.first).getFullYear() : now.getFullYear();

  // the days as a whole: the share of daily ticks, the counted days, the longest run (as the old year view)
  const whole = useMemo(() => {
    let counted = 0; let done = 0; let of = 0; let run = 0; let best = 0;
    const today = dayKey(new Date());
    for (let d = new Date(year, 0, 1); d.getFullYear() === year && dayKey(d) <= today; d = addDays(d, 1)) {
      if (!model.first || dayKey(d) < model.first) continue;
      const s = dayState(model.log, model.dailyIds, d);
      done += s.done; of += s.total;
      if (s.counted) { counted++; best = Math.max(best, ++run); } else if (dayKey(d) !== today) run = 0;
    }
    return { counted, percent: of ? Math.round((done / of) * 100) : null, best };
  }, [model.log, model.dailyIds, model.first, year]);

  const daysOf = useMemo(() => {
    const from = new Date(year, 0, 1);
    const to = new Date(year, 11, 31);
    return Object.fromEntries(model.all.map(({ habit }) => [habit.id, ticksBetween(ticksOf(model.log, habit.id), from, to)]));
  }, [model.all, model.log, year]);

  const list = all ? model.all : model.all.slice(0, SHOWN);
  const more = model.all.length - SHOWN;

  return (
    <>
      <PeriodNav
        title={String(year)}
        sub={year === now.getFullYear() ? 'ეს წელი' : undefined}
        onPrev={year > firstYear ? () => setYear(y => y - 1) : undefined}
        onNext={year < now.getFullYear() ? () => setYear(y => y + 1) : undefined}
      />
      <Stats
        items={[
          { value: whole.percent == null ? '—' : `${whole.percent}%`, label: 'შესრულება' },
          { value: whole.counted, label: 'დღე ჩაითვალა' },
          { value: whole.best, label: 'საუკეთესო სერია' },
        ]}
      />
      <Card pad="sm" className="flex flex-col gap-2.5">
        <h2 className="px-1 text-lead font-bold">მთელი წელი</h2>
        <YearMap year={year} model={model} />
      </Card>
      {model.all.length > 0 && (
        <Rows>
          {list.map(({ habit }) => (
            <Row
              key={habit.id}
              title={habit.label}
              right={<><Small>{daysOf[habit.id] ?? 0} დღე</Small><ChevronRight aria-hidden="true" className="size-[18px] shrink-0 text-mut" strokeWidth={2} /></>}
              onClick={() => go(habitItem(habit.id))}
            />
          ))}
          {more > 0 && (
            <Row
              title={<span className="text-wine">{all ? 'ნაკლების ჩვენება' : `კიდევ ${more} ჩვევა`}</span>}
              right={<ChevronDown aria-hidden="true" className={cx('size-[18px] shrink-0 text-wine', all && 'rotate-180')} strokeWidth={2} />}
              onClick={() => setAll(v => !v)}
            />
          )}
        </Rows>
      )}
    </>
  );
};
