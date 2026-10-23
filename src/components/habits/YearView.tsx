import React, { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { MONTHS_SHORT_GE } from '../../utils/dateNames';
import { dayKey } from '../../utils/habitsWeek';
import { addDays, dayState, goalShare, parseDay, ticksBetween, ticksOf, yearWeeks } from '../../utils/habitStats';
import { planShare } from '../../utils/habitSchedule';
import type { HabitSchedule } from '../../utils/myHabits';
import { HabitBadge, colorOf, tint } from './HabitIcon';
import { HabitsModel } from './useHabits';
import { PeriodNav, Summary, ViewHeading } from './parts';

// "წელი": the whole year at a glance — the days as a whole in wine, then each habit's own map in its colour.
// A habit's map opens its page.

const AHEAD = '#f6f0e5'; // a day still to come, or before the member's history
const MISSED = '#ebe1cf';

/** A year as week columns (Sunday on top) of small squares; `level` 0–1 colours a day. `labels`: the months named
 *  above (on a phone only every third, so they don't run together). */
export const YearMap: React.FC<{ year: number; color: string; level: (day: string) => number; first: string | null; labels?: boolean }> = ({
  year,
  color,
  level,
  first,
  labels,
}) => {
  const weeks = useMemo(() => yearWeeks(year), [year]);
  const today = dayKey(new Date());
  const cols = { gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` };
  return (
    <div className="@container max-w-[44rem]" aria-hidden>
      {labels && (
        <div className="relative h-3.5 mb-0.5">
          {weeks.map((w, i) => {
            const firstOfMonth = w.find(d => d && d.getDate() === 1);
            return firstOfMonth ? (
              <span
                key={i}
                className={`absolute top-0 text-[9.5px] font-bold leading-none text-[#a08a76] ${firstOfMonth.getMonth() % 3 ? 'hidden @md:inline' : ''}`}
                style={{ left: `${(i / weeks.length) * 100}%` }}
              >
                {MONTHS_SHORT_GE[firstOfMonth.getMonth()]}
              </span>
            ) : null;
          })}
        </div>
      )}
      <div className="grid gap-[1.5px]" style={cols}>
        {weeks.map((w, i) => (
          <div key={i} className="grid gap-[1.5px]">
            {w.map((d, j) => {
              if (!d) return <span key={j} className="aspect-square" />;
              const key = dayKey(d);
              const lv = key > today || !first || key < first ? -1 : level(key);
              return (
                <span
                  key={j}
                  className="aspect-square rounded-[2px]"
                  style={{ background: lv < 0 ? AHEAD : lv <= 0 ? MISSED : tint(color, 0.3 + 0.7 * Math.min(1, lv)) }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export const YearView: React.FC<{ model: HabitsModel }> = ({ model }) => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const firstYear = model.first ? parseDay(model.first).getFullYear() : now.getFullYear();
  const from = new Date(year, 0, 1);
  const to = new Date(year, 11, 31);

  // the days as a whole: counted ones, the share of daily ticks, the longest run of counted days
  const whole = useMemo(() => {
    let counted = 0;
    let done = 0;
    let of = 0;
    let run = 0;
    let best = 0;
    const today = dayKey(new Date());
    for (let d = new Date(year, 0, 1); d.getFullYear() === year && dayKey(d) <= today; d = addDays(d, 1)) {
      if (!model.first || dayKey(d) < model.first) continue;
      const s = dayState(model.log, model.dailyIds, d);
      done += s.done;
      of += s.total;
      if (s.counted) {
        counted++;
        best = Math.max(best, ++run);
      } else if (dayKey(d) !== today) run = 0;
    }
    return { counted, percent: of ? Math.round((done / of) * 100) : null, best };
  }, [model.log, model.dailyIds, model.first, year]);

  return (
    <div className="space-y-4">
      <PeriodNav
        title={String(year)}
        sub={year === now.getFullYear() ? 'ეს წელი' : undefined}
        onPrev={year > firstYear ? () => setYear(y => y - 1) : undefined}
        onNext={year < now.getFullYear() ? () => setYear(y => y + 1) : undefined}
      />

      <Summary
        items={[
          { value: whole.percent == null ? '—' : `${whole.percent}%`, label: 'შესრულება', strong: true },
          { value: whole.counted, label: 'დღე ჩაითვალა' },
          { value: whole.best, label: 'საუკეთესო სერია' },
        ]}
      />

      <section>
        <ViewHeading>მთელი დღეები</ViewHeading>
        <div className="px-1">
          <YearMap
            year={year}
            color="#7a2028"
            first={model.first}
            labels
            level={day => {
              const s = dayState(model.log, model.dailyIds, parseDay(day));
              return s.share >= 1 ? 1 : s.counted ? 0.6 : s.share > 0 ? 0.15 : 0;
            }}
          />
        </div>
      </section>

      <section>
        <ViewHeading>ჩვევები</ViewHeading>
        <ul className="rounded-2xl ring-1 ring-[#e8dcc8] bg-white divide-y divide-[#f1e8d9] overflow-hidden">
          {model.all.map(({ habit, group }) => (
            <HabitYearRow key={habit.id} model={model} id={habit.id} label={habit.label} goal={group.goal} schedule={habit.schedule} year={year} from={from} to={to} />
          ))}
        </ul>
      </section>
      {!model.first && <p className="px-1 text-[12.5px] text-[#a08a76]">რუკები შეივსება, როცა ჩვევებს მონიშნავ.</p>}
    </div>
  );
};

const HabitYearRow: React.FC<{
  model: HabitsModel;
  id: string;
  label: string;
  goal: { times: number; per: 'day' | 'week' | 'month' };
  schedule?: HabitSchedule;
  year: number;
  from: Date;
  to: Date;
}> = ({ model, id, label, goal, schedule, year, from, to }) => {
  const ticks = useMemo(() => ticksOf(model.log, id), [model.log, id]);
  const look = model.looks[id];
  const share = schedule ? planShare(schedule, ticks, model.first, new Date(), from, to) : goalShare(ticks, goal, model.first, from, to);
  const days = ticksBetween(ticks, from, to);
  return (
    <li>
      <button
        type="button"
        onClick={() => model.openHabit(id)}
        aria-label={`${label}: ${year} — ${days} დღე, ${share.percent}%`}
        className="w-full px-3 pt-2.5 pb-3 text-left cursor-pointer hover:bg-[#7a2028]/[0.025] transition-colors"
      >
        <span className="flex items-center gap-2.5 mb-2">
          <HabitBadge look={look} size="sm" />
          <span className="flex-1 min-w-0 truncate text-[14px] font-bold text-[#2a2017]">{label}</span>
          <span className="shrink-0 text-[12px] font-bold tabular-nums text-[#8a7a6a]">
            {share.of ? `${share.percent}% · ` : ''}
            {days} დღე
          </span>
          <ChevronRight className="w-4 h-4 shrink-0 text-[#b8a68e]" />
        </span>
        <YearMap year={year} color={colorOf(look)} first={model.first} level={day => (ticks.has(day) ? 1 : 0)} />
      </button>
    </li>
  );
};
