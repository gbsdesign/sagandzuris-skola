import React, { useMemo, useState } from 'react';
import { Check, Flame, RotateCcw } from 'lucide-react';
import { HabitCounter } from '../../data/habitLooks';
import { MONTHS_GE, MONTHS_SHORT_GE, WEEKDAYS_GE, WEEKDAYS_SHORT_GE } from '../../utils/dateNames';
import { canTickDay, dayKey } from '../../utils/habitsWeek';
import { HabitGoal, bestRun, currentRun, goalShare, lastPeriods, monthWeeks, parseDay, ticksBetween, ticksOf } from '../../utils/habitStats';
import { triggerHaptic } from '../../utils/haptics';
import { HabitBadge, colorOf, tint } from './HabitIcon';
import { HabitsModel } from './useHabits';
import { PeriodNav, ViewHeading } from './parts';
import { RICH_TEXT } from '../views/RichNoteEditor';
import { safeNoteHtml } from '../../utils/richNote';

// A habit's own page (a sheet over the habits): its counter, the run and the best run, how often its goal was met,
// the last weeks or months as bars, a month calendar (the last seven days tick from there too) and the year by months.

export const PER_WORD = { day: 'დღე', week: 'კვირა', month: 'თვე' } as const;
/** "77% — 249 დღიდან" */
export const FROM_WORD = { day: 'დღიდან', week: 'კვირიდან', month: 'თვიდან' } as const;

/** The sheet's title: the habit's icon and name. */
export const HabitPageTitle: React.FC<{ model: HabitsModel; id: string }> = ({ model, id }) => {
  const item = model.all.find(x => x.habit.id === id);
  return (
    <span className="flex items-center gap-2.5 min-w-0">
      <HabitBadge look={model.looks[id]} size="sm" />
      <span className="truncate">{item?.habit.label ?? ''}</span>
    </span>
  );
};

export const HabitPage: React.FC<{ model: HabitsModel; id: string; date: Date }> = ({ model, id, date }) => {
  const item = model.all.find(x => x.habit.id === id);
  const ticks = useMemo(() => ticksOf(model.log, id), [model.log, id]);
  if (!item) return null;
  const { habit, group } = item;
  const goal = group.goal;
  const c = colorOf(model.looks[id]);
  const counter = model.counters[id];
  const word = PER_WORD[goal.per];
  const run = currentRun(ticks, goal, model.first);
  const best = bestRun(ticks, goal, model.first);
  const share = goalShare(ticks, goal, model.first);

  return (
    <div className="space-y-6 text-[#2a2017]">
      {counter && <CounterPad model={model} id={id} date={date} color={c} counter={counter} />}
      {habit.hint && <p className="text-[13px] font-medium text-[#8a7a6a]">{habit.hint}</p>}
      {/* the member's own note (the list's rows have no ⓘ for it since 2026-10-28) */}
      {habit.richNote ? (
        <div
          className={`${RICH_TEXT} border-l-2 border-[#e3cfae] pl-2.5 text-[13.5px] leading-relaxed text-[#5a4636]`}
          // made safe twice: when saved and when read (utils/richNote)
          dangerouslySetInnerHTML={{ __html: safeNoteHtml(habit.richNote) }}
        />
      ) : (
        habit.note && (
          <p className="border-l-2 border-[#e3cfae] pl-2.5 font-serif-ge text-[13px] italic leading-relaxed text-[#7a6656] whitespace-pre-line break-words">{habit.note}</p>
        )
      )}

      <div className="grid grid-cols-2 gap-2">
        <Tile label="ახლა ზედიზედ" value={run} unit={word} flame={run > 1} />
        <Tile label="საუკეთესო სერია" value={best} unit={word} />
        <Tile
          label={goal.per === 'day' ? 'შესრულება' : 'მიზანი შესრულდა'}
          value={share.of ? `${share.percent}%` : '—'}
          unit={share.of ? `${share.of} ${FROM_WORD[goal.per]}` : ''}
        />
        <Tile label="სულ მოინიშნა" value={ticks.size} unit="დღე" />
      </div>

      <Bars ticks={ticks} goal={goal} color={c} />
      <HabitMonth model={model} id={id} ticks={ticks} color={c} />
      <HabitYear model={model} ticks={ticks} color={c} />
    </div>
  );
};

const Tile: React.FC<{ label: string; value: React.ReactNode; unit?: string; flame?: boolean }> = ({ label, value, unit, flame }) => (
  <div className="min-w-0 rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3.5 py-3">
    <p className="text-[12px] font-bold leading-tight text-[#8a7a6a]">{label}</p>
    <p className="mt-1 flex items-baseline gap-1 min-w-0">
      {flame && <Flame className="w-4 h-4 shrink-0 self-center text-[#b4441c]" />}
      <span className="text-[24px] font-black tabular-nums leading-none text-[#2a2017]">{value}</span>
      {unit && <span className="truncate text-[12.5px] font-bold text-[#8a7a6a]">{unit}</span>}
    </p>
  </div>
);

/** The day's count as a big round button (each tap +1, like a prayer rope), with quick steps under it. */
const CounterPad: React.FC<{ model: HabitsModel; id: string; date: Date; color: string; counter: HabitCounter }> = ({ model, id, date, color, counter }) => {
  const n = model.countOn(id, date);
  const done = n >= counter.goal;
  const r = 46;
  const length = 2 * Math.PI * r;
  const steps = counter.goal >= 50 ? [10, 33, 100] : counter.goal >= 10 ? [5, 10] : [1, 5];
  const add = (k: number) => {
    triggerHaptic(k === 1 ? 6 : 12);
    model.setCount(id, n + k, date);
  };
  const today = dayKey(date) === dayKey(new Date());
  const chip = 'h-10 min-w-12 px-3.5 rounded-full inline-flex items-center justify-center gap-1 text-[14px] font-bold tabular-nums cursor-pointer transition-transform active:scale-95 disabled:opacity-40 disabled:cursor-default';
  return (
    <section className="flex flex-col items-center gap-3 pt-1">
      <button
        type="button"
        onClick={() => add(1)}
        aria-label={`+1 — ${n} / ${counter.goal} ${counter.unit}`}
        className="relative w-44 h-44 rounded-full cursor-pointer select-none transition-transform active:scale-[0.97] touch-manipulation"
        style={{ background: tint(color, 0.07) }}
      >
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full -rotate-90" aria-hidden>
          <circle cx="50" cy="50" r={r} fill="none" stroke={tint(color, 0.18)} strokeWidth="5" />
          {n > 0 && (
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={color}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={length}
              strokeDashoffset={length * (1 - Math.min(1, n / counter.goal))}
              className="transition-[stroke-dashoffset] duration-300"
            />
          )}
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[46px] font-black tabular-nums leading-none" style={{ color }}>{n}</span>
          <span className="mt-1.5 text-[13px] font-bold text-[#8a7a6a]">
            / {counter.goal} {counter.unit}
          </span>
          {done && (
            <span className="mt-1.5 inline-flex items-center gap-1 text-[12.5px] font-bold text-emerald-700">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              შესრულდა
            </span>
          )}
        </span>
      </button>
      <p className="text-[12.5px] font-semibold text-[#8a7a6a]">
        {today ? 'დღეს' : `${WEEKDAYS_GE[date.getDay()]}, ${date.getDate()} ${MONTHS_GE[date.getMonth()]}`} · წრეს შეეხე — +1
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" className={chip} style={{ background: tint(color, 0.1), color }} disabled={n === 0} onClick={() => add(-1)} aria-label="−1">
          −1
        </button>
        {steps.map(k => (
          <button key={k} type="button" className={chip} style={{ background: tint(color, 0.1), color }} onClick={() => add(k)}>
            +{k}
          </button>
        ))}
        {n > 0 && (
          <button type="button" className={`${chip} text-[#8a7a6a] bg-white ring-1 ring-[#e8dcc8]`} onClick={() => { triggerHaptic(12); model.setCount(id, 0, date); }} aria-label="განულება" title="განულება">
            <RotateCcw className="w-4 h-4" />
            0
          </button>
        )}
      </div>
    </section>
  );
};

/** The last twelve weeks (a daily or weekly habit) or months (a monthly one) as bars; the goal as a dashed line. */
const Bars: React.FC<{ ticks: Set<string>; goal: HabitGoal; color: string }> = ({ ticks, goal, color }) => {
  const per = goal.per === 'month' ? 'month' : 'week';
  const series = lastPeriods(ticks, per, 12);
  const max = Math.max(per === 'week' && goal.per === 'day' ? 7 : goal.times + 1, ...series.map(s => s.times), 1);
  const line = goal.per === 'day' ? null : goal.times / max;
  return (
    <section>
      <ViewHeading right={<span className="text-[12px] font-semibold text-[#8a7a6a]">{goal.per === 'day' ? 'დღე კვირაში' : 'რამდენჯერ'}</span>}>
        {per === 'week' ? 'ბოლო 12 კვირა' : 'ბოლო 12 თვე'}
      </ViewHeading>
      <div className="relative h-28 flex items-end gap-1.5 px-1 border-b border-[#e8dcc8]">
        {line != null && (
          <span className="absolute inset-x-1 border-t border-dashed border-[#b8a68e] pointer-events-none" style={{ bottom: `${line * 100}%` }} aria-hidden />
        )}
        {series.map((s, i) => {
          const current = i === series.length - 1;
          const end = new Date(s.start);
          if (per === 'week') end.setDate(end.getDate() + 6);
          const title =
            per === 'week'
              ? `${s.start.getDate()} ${MONTHS_SHORT_GE[s.start.getMonth()]} – ${end.getDate()} ${MONTHS_SHORT_GE[end.getMonth()]}: ${s.times}`
              : `${MONTHS_GE[s.start.getMonth()]}: ${s.times}`;
          return (
            <div key={i} className="flex-1 h-full flex flex-col justify-end items-center" title={title}>
              {s.times > 0 && <span className="mb-0.5 text-[11px] font-bold tabular-nums text-[#8a7a6a]">{s.times}</span>}
              <span
                className="w-full max-w-7 rounded-t-md transition-[height] duration-500"
                style={{ height: `${(s.times / max) * 100}%`, minHeight: s.times ? 3 : 0, background: current ? color : tint(color, 0.45) }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1.5 px-1 pt-1 text-[11px] font-bold text-[#a08a76]">
        {per === 'month' ? (
          series.map((s, i) => (
            <span key={i} className="flex-1 text-center truncate">{MONTHS_SHORT_GE[s.start.getMonth()]}</span>
          ))
        ) : (
          <>
            <span className="flex-1">{series[0].start.getDate()} {MONTHS_SHORT_GE[series[0].start.getMonth()]}</span>
            <span>ეს კვირა</span>
          </>
        )}
      </div>
    </section>
  );
};

/** The habit's month: ticked days filled in its colour; a day of the last seven ticks or unticks from here. */
const HabitMonth: React.FC<{ model: HabitsModel; id: string; ticks: Set<string>; color: string }> = ({ model, id, ticks, color }) => {
  const [offset, setOffset] = useState(0);
  const now = new Date();
  const today = dayKey(now);
  const month = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const weeks = monthWeeks(month.getFullYear(), month.getMonth());
  const first = model.first ? parseDay(model.first) : now;
  const canPrev = month.getFullYear() * 12 + month.getMonth() > first.getFullYear() * 12 + first.getMonth();
  const times = ticksBetween(ticks, month, new Date(month.getFullYear(), month.getMonth() + 1, 0));
  const label = model.all.find(x => x.habit.id === id)?.habit.label ?? '';

  return (
    <section className="space-y-2">
      <PeriodNav
        title={`${MONTHS_GE[month.getMonth()]} ${month.getFullYear()}`}
        sub={`${times} დღე`}
        onPrev={canPrev ? () => setOffset(o => o - 1) : undefined}
        onNext={offset < 0 ? () => setOffset(o => o + 1) : undefined}
      />
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS_SHORT_GE.map(w => (
          <span key={w} className="pb-0.5 text-[11px] font-bold text-[#a08a76]">{w}</span>
        ))}
        {weeks.flat().map((d, i) => {
          if (!d) return <span key={i} />;
          const key = dayKey(d);
          const on = ticks.has(key);
          const open = canTickDay(d);
          const cls = `mx-auto w-9 h-9 rounded-full flex items-center justify-center text-[13px] tabular-nums transition-colors ${
            on ? 'font-black text-white' : key > today ? 'font-semibold text-[#cbbca6]' : 'font-semibold text-[#6a5646]'
          } ${key === today && !on ? 'ring-[1.5px] ring-inset ring-[#7a2028]/45' : ''}`;
          const style = on ? { background: color } : open ? { background: tint(color, 0.08) } : undefined;
          return open ? (
            <button
              key={i}
              type="button"
              aria-pressed={on}
              aria-label={`${label} — ${d.getDate()} ${MONTHS_GE[d.getMonth()]}`}
              onClick={() => model.toggle(id, d)}
              className={`${cls} cursor-pointer active:scale-95`}
              style={style}
            >
              {d.getDate()}
            </button>
          ) : (
            <span key={i} className={cls} style={style}>
              {d.getDate()}
            </span>
          );
        })}
      </div>
    </section>
  );
};

/** The year by months (rows) and days (columns), ticked days in the habit's colour. */
const HabitYear: React.FC<{ model: HabitsModel; ticks: Set<string>; color: string }> = ({ model, ticks, color }) => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const firstYear = model.first ? parseDay(model.first).getFullYear() : now.getFullYear();
  const today = dayKey(now);
  const times = ticksBetween(ticks, new Date(year, 0, 1), new Date(year, 11, 31));
  return (
    <section className="space-y-2">
      <PeriodNav
        title={String(year)}
        sub={`${times} დღე`}
        onPrev={year > firstYear ? () => setYear(y => y - 1) : undefined}
        onNext={year < now.getFullYear() ? () => setYear(y => y + 1) : undefined}
      />
      <div className="space-y-[3px]" aria-hidden>
        {MONTHS_SHORT_GE.map((name, m) => (
          <div key={m} className="flex items-center gap-1.5">
            <span className="w-7 shrink-0 text-[11px] font-bold text-[#a08a76]">{name}</span>
            <div className="flex-1 grid gap-[2px]" style={{ gridTemplateColumns: 'repeat(31, minmax(0, 1fr))' }}>
              {Array.from({ length: 31 }, (_, i) => {
                const d = new Date(year, m, i + 1);
                if (d.getMonth() !== m) return <span key={i} />;
                const key = dayKey(d);
                const ahead = key > today || !model.first || key < model.first;
                return (
                  <span
                    key={i}
                    className="aspect-square rounded-[2px]"
                    style={{ background: ticks.has(key) ? color : ahead ? '#f6f0e5' : '#ebe1cf' }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
