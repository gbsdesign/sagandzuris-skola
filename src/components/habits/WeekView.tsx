import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { MONTHS_GE, MONTHS_SHORT_GE, WEEKDAYS_GE, WEEKDAYS_SHORT_GE } from '../../utils/dateNames';
import { canTickDay, dayKey, periodStart } from '../../utils/habitsWeek';
import { daysShare, parseDay, periodDays, shiftPeriod } from '../../utils/habitStats';
import { HabitIcon, colorOf } from './HabitIcon';
import { HabitsModel } from './useHabits';
import { PeriodNav, Summary } from './parts';

// "კვირა": the habits down, the week's days across (Sunday first, as the habits' week). A cell of the last seven
// days ticks or unticks; a habit's name opens its page, a day's head opens that day.

const weekTitle = (from: Date, to: Date) =>
  from.getMonth() === to.getMonth()
    ? `${from.getDate()}–${to.getDate()} ${MONTHS_GE[from.getMonth()]}`
    : `${from.getDate()} ${MONTHS_SHORT_GE[from.getMonth()]} – ${to.getDate()} ${MONTHS_SHORT_GE[to.getMonth()]}`;

export const WeekView: React.FC<{ model: HabitsModel; onPickDay: (d: Date) => void }> = ({ model, onPickDay }) => {
  const [offset, setOffset] = useState(0);
  const now = new Date();
  const today = dayKey(now);
  const start = shiftPeriod(periodStart('week', now), 'week', offset);
  const days = periodDays(start, 'week');
  const firstWeek = dayKey(periodStart('week', model.first ? parseDay(model.first) : now));
  const share = daysShare(model.log, model.dailyIds, days, model.first);
  const before = daysShare(model.log, model.dailyIds, periodDays(shiftPeriod(start, 'week', -1), 'week'), model.first);
  const sections = [
    { title: 'ყოველდღე', items: model.all.filter(x => x.group.goal.per === 'day') },
    { title: 'კვირაში და თვეში', items: model.all.filter(x => x.group.goal.per !== 'day') },
  ].filter(s => s.items.length);

  return (
    <div className="mx-auto max-w-[40rem] space-y-4">
      <PeriodNav
        title={weekTitle(days[0], days[6])}
        sub={offset === 0 ? 'ეს კვირა' : offset === -1 ? 'წინა კვირა' : String(days[6].getFullYear())}
        onPrev={dayKey(start) > firstWeek ? () => setOffset(o => o - 1) : undefined}
        onNext={offset < 0 ? () => setOffset(o => o + 1) : undefined}
      />

      <Summary
        items={[
          { value: share ? `${share.percent}%` : '—', label: 'შესრულება', strong: true },
          { value: share ? `${share.countedDays} / 7` : '—', label: 'დღე ჩაითვალა' },
          { value: before ? `${before.percent}%` : '—', label: 'წინა კვირა' },
        ]}
      />

      {/* on a phone each habit's name stands over its seven cells (whole names, roomy cells); wider, at their left */}
      <div className="@container">
        <div className="grid items-center gap-x-1 gap-y-1 grid-cols-7 @md:grid-cols-[minmax(0,1fr)_repeat(7,2.25rem)] @md:gap-y-1.5">
          <span className="hidden @md:block" />
          {days.map(d => {
            const key = dayKey(d);
            const isToday = key === today;
            const open = canTickDay(d);
            return (
              <button
                key={key}
                type="button"
                disabled={!open}
                onClick={() => onPickDay(d)}
                aria-label={`${WEEKDAYS_GE[d.getDay()]}, ${d.getDate()} ${MONTHS_GE[d.getMonth()]}`}
                className={`flex flex-col items-center gap-0.5 py-1 rounded-xl leading-none enabled:cursor-pointer enabled:hover:bg-[#7a2028]/[0.05] ${
                  isToday ? 'text-[#7a2028]' : key > today ? 'text-[#cbbca6]' : 'text-[#8a7a6a]'
                }`}
              >
                <span className="text-[10.5px] font-bold">{WEEKDAYS_SHORT_GE[d.getDay()]}</span>
                <span className={`text-[12.5px] tabular-nums ${isToday ? 'font-black' : 'font-semibold'}`}>{d.getDate()}</span>
              </button>
            );
          })}

          {sections.map(sec => (
            <React.Fragment key={sec.title}>
              {sections.length > 1 && <p className="col-span-full pt-2 px-0.5 font-serif-ge text-[13.5px] font-bold text-[#7a2028]">{sec.title}</p>}
              {sec.items.map(({ habit }) => {
                const look = model.looks[habit.id];
                const c = colorOf(look);
                return (
                  <React.Fragment key={habit.id}>
                    <button
                      type="button"
                      onClick={() => model.openHabit(habit.id)}
                      className="col-span-full @md:col-span-1 min-w-0 flex items-center gap-1.5 pt-2 pb-0.5 @md:py-0 @md:min-h-9 pr-1 text-left cursor-pointer group"
                    >
                      <span style={{ color: c }} className="shrink-0">
                        <HabitIcon icon={look?.icon ?? 'sparkle'} className="w-4 h-4" />
                      </span>
                      <span className="min-w-0 truncate @md:whitespace-normal @md:line-clamp-2 text-[13px] @md:text-[12.5px] font-semibold leading-tight text-[#2a2017] group-hover:text-[#7a2028]">
                        {habit.label}
                      </span>
                    </button>
                    {days.map(d => {
                      const key = dayKey(d);
                      const on = model.isOn(habit.id, d);
                      const open = canTickDay(d);
                      const tone = on
                        ? ''
                        : key > today
                          ? 'border border-dashed border-[#e3d6c2]'
                          : !model.first || key < model.first
                            ? 'bg-[#f7f2e9]'
                            : 'bg-[#f1e8d9]';
                      const cell = `mx-auto w-full max-w-10 @md:w-9 aspect-square rounded-xl flex items-center justify-center transition-colors ${tone}`;
                      const mark = on && <Check className="w-4 h-4 stroke-[3] animate-in zoom-in-50 duration-200" />;
                      return open ? (
                        <button
                          key={key}
                          type="button"
                          aria-pressed={on}
                          aria-label={`${habit.label} — ${WEEKDAYS_GE[d.getDay()]}, ${d.getDate()}`}
                          onClick={() => model.toggle(habit.id, d)}
                          className={`${cell} cursor-pointer ${on ? '' : 'hover:bg-[#e9dcc6]'}`}
                          style={on ? { background: c, color: '#fff' } : undefined}
                        >
                          {mark}
                        </button>
                      ) : (
                        <span key={key} className={cell} style={on ? { background: c, color: '#fff' } : undefined} aria-hidden>
                          {mark}
                        </span>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {days.some(d => canTickDay(d)) && <p className="px-1 text-[12px] font-medium text-[#a08a76]">ბოლო 7 დღის უჯრას შეეხე — მოინიშნება ან მოიხსნება.</p>}
    </div>
  );
};
