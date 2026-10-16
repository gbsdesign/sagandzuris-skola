import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { MONTHS_GE, WEEKDAYS_GE, WEEKDAYS_SHORT_GE } from '../../utils/dateNames';
import { canTickDay, dayKey } from '../../utils/habitsWeek';
import { dayState, daysShare, monthWeeks, parseDay } from '../../utils/habitStats';
import { triggerHaptic } from '../../utils/haptics';
import { HabitIcon, colorOf, tint } from './HabitIcon';
import { HabitsModel } from './useHabits';
import { DayDot, PeriodNav, Summary, dotState } from './parts';

// "თვე": the month as a calendar, each day's ring filled with its share of the daily habits. A tap on a day shows
// what was done that day; a day of the last seven opens in "დღე" to tick it.

export const MonthView: React.FC<{ model: HabitsModel; onPickDay: (d: Date) => void }> = ({ model, onPickDay }) => {
  const [offset, setOffset] = useState(0);
  const [picked, setPicked] = useState<string>(() => dayKey(new Date()));
  const now = new Date();
  const today = dayKey(now);
  const month = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const weeks = monthWeeks(month.getFullYear(), month.getMonth());
  const days = weeks.flat().filter((d): d is Date => !!d);
  const prevMonth = new Date(month.getFullYear(), month.getMonth() - 1, 1);
  const prevDays = monthWeeks(prevMonth.getFullYear(), prevMonth.getMonth()).flat().filter((d): d is Date => !!d);
  const share = daysShare(model.log, model.dailyIds, days, model.first);
  const before = daysShare(model.log, model.dailyIds, prevDays, model.first);
  const firstMonth = model.first ? parseDay(model.first) : now;
  const canPrev = month.getFullYear() * 12 + month.getMonth() > firstMonth.getFullYear() * 12 + firstMonth.getMonth();
  const chosen = days.find(d => dayKey(d) === picked) ?? null;

  return (
    <div className="mx-auto max-w-[32rem] space-y-4">
      <PeriodNav
        title={`${MONTHS_GE[month.getMonth()]} ${month.getFullYear()}`}
        sub={offset === 0 ? 'ეს თვე' : undefined}
        onPrev={canPrev ? () => setOffset(o => o - 1) : undefined}
        onNext={offset < 0 ? () => setOffset(o => o + 1) : undefined}
      />

      <Summary
        items={[
          { value: share ? `${share.percent}%` : '—', label: 'შესრულება', strong: true },
          { value: share ? share.countedDays : '—', label: 'დღე ჩაითვალა' },
          { value: before ? `${before.percent}%` : '—', label: 'წინა თვე' },
        ]}
      />

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS_SHORT_GE.map(w => (
          <span key={w} className="pb-1 text-[11px] font-bold text-[#a08a76]">{w}</span>
        ))}
        {weeks.flat().map((d, i) => {
          if (!d) return <span key={i} />;
          const key = dayKey(d);
          const future = key > today;
          const s = dayState(model.log, model.dailyIds, d);
          const dot = <DayDot day={d.getDate()} share={s.share} state={dotState(s.share, s.counted, future)} today={key === today} size={36} />;
          return future ? (
            <span key={i} className="mx-auto w-11 h-11 flex items-center justify-center">{dot}</span>
          ) : (
            <button
              key={i}
              type="button"
              aria-pressed={key === picked}
              aria-label={`${d.getDate()} ${MONTHS_GE[d.getMonth()]} — ${s.done} / ${s.total}`}
              onClick={() => { triggerHaptic(6); setPicked(key); }}
              className={`mx-auto w-11 h-11 flex items-center justify-center rounded-2xl cursor-pointer transition-colors ${
                key === picked ? 'bg-white ring-1 ring-[#e8dcc8] shadow-[0_3px_10px_-6px_rgba(74,52,38,0.35)]' : 'hover:bg-[#7a2028]/[0.05]'
              }`}
            >
              {dot}
            </button>
          );
        })}
      </div>

      {chosen && <DayDone model={model} date={chosen} onPickDay={onPickDay} />}
    </div>
  );
};

/** What was done on one day: those habits as chips in their colours, then the daily ones left undone in one line. */
const DayDone: React.FC<{ model: HabitsModel; date: Date; onPickDay: (d: Date) => void }> = ({ model, date, onPickDay }) => {
  const s = dayState(model.log, model.dailyIds, date);
  const done = model.all.filter(x => model.isOn(x.habit.id, date));
  const undone = model.all.filter(x => x.group.goal.per === 'day' && !model.isOn(x.habit.id, date));
  const open = canTickDay(date);
  return (
    <section className="rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] p-3 space-y-2.5 animate-in fade-in duration-200">
      <div className="flex items-center gap-2">
        <p className="flex-1 min-w-0 text-[14px] font-bold leading-snug text-[#2a2017]">
          {WEEKDAYS_GE[date.getDay()]}, {date.getDate()} {MONTHS_GE[date.getMonth()]}
          <span className="ml-1.5 font-semibold tabular-nums text-[#8a7a6a]">
            {s.done} / {s.total}
          </span>
        </p>
        {open && (
          <button
            type="button"
            onClick={() => onPickDay(date)}
            className="h-9 pl-3.5 pr-2 shrink-0 rounded-full inline-flex items-center gap-0.5 text-[13px] font-bold bg-[#7a2028]/[0.07] text-[#7a2028] hover:bg-[#7a2028]/[0.12] cursor-pointer transition-colors"
          >
            მონიშვნა
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
      {done.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {done.map(({ habit }) => {
            const look = model.looks[habit.id];
            const c = colorOf(look);
            return (
              <span
                key={habit.id}
                className="min-h-8 px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#2a2017]"
                style={{ background: tint(c, 0.14) }}
              >
                <span style={{ color: c }}>
                  <HabitIcon icon={look?.icon ?? 'sparkle'} className="w-3.5 h-3.5" />
                </span>
                {habit.label}
              </span>
            );
          })}
        </div>
      )}
      {!done.length ? (
        <p className="px-0.5 text-[12.5px] font-semibold text-[#8a7a6a]">ამ დღეს არაფერი მოინიშნა.</p>
      ) : (
        undone.length > 0 && (
          <p className="px-0.5 text-[12.5px] leading-relaxed text-[#8a7a6a]">
            <span className="font-bold">არ მოინიშნა:</span> {undone.map(x => x.habit.label).join(' · ')}
          </p>
        )
      )}
    </section>
  );
};
