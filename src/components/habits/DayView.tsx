import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Flame, Info, Plus } from 'lucide-react';
import { HabitGroupType } from '../../data/habitsAndManera';
import { HabitLink, MyHabit, MyHabitGroup } from '../../utils/myHabits';
import { MONTHS_GE, WEEKDAYS_GE, WEEKDAYS_SHORT_GE } from '../../utils/dateNames';
import { TICK_DAYS, dayKey, dayNeeds, keptStreak, lastDays, periodStart } from '../../utils/habitsWeek';
import { currentRun, dayState, ticksOf, timesIn } from '../../utils/habitStats';
import { triggerHaptic } from '../../utils/haptics';
import { HabitPrayerMenu } from '../views/HabitPrayerMenu';
import { HabitLinkChip } from '../views/HabitLinks';
import { HabitIcon, colorOf, tint } from './HabitIcon';
import { HabitsModel } from './useHabits';
import { DayDot, Ring, ViewHeading, dotState } from './parts';

// "დღე": the chosen day's ring and status, the last seven days to choose from (a forgotten tick may be set up to
// six days back), then the daily habits beside the weekly and monthly ones.

const longDate = (d: Date) => `${WEEKDAYS_GE[d.getDay()]}, ${d.getDate()} ${MONTHS_GE[d.getMonth()]}`;

/** The last seven days: each one's share of the daily habits in its ring; a tap chooses the day to tick. */
const DayStrip: React.FC<{ model: HabitsModel; selected: Date; onSelect: (d: Date) => void }> = ({ model, selected, onSelect }) => {
  const days = lastDays(TICK_DAYS);
  const chosen = dayKey(selected);
  return (
    <div role="radiogroup" aria-label="ბოლო 7 დღე — აირჩიე, რომელი დღე მოინიშნოს" className="grid grid-cols-7 gap-0.5">
      {days.map((d, i) => {
        const on = dayKey(d) === chosen;
        const today = i === days.length - 1;
        const s = dayState(model.log, model.dailyIds, d);
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={`${today ? 'დღეს, ' : ''}${longDate(d)} — ${s.done} / ${s.total}`}
            onClick={() => { triggerHaptic(8); onSelect(d); }}
            className={`min-w-0 flex flex-col items-center gap-1 pt-1.5 pb-2 rounded-2xl cursor-pointer transition-colors ${
              on ? 'bg-white ring-1 ring-[#e8dcc8] shadow-[0_3px_10px_-6px_rgba(74,52,38,0.35)]' : 'hover:bg-white/60'
            }`}
          >
            <span className={`text-[11px] font-bold leading-none ${on ? 'text-[#7a2028]' : 'text-[#8a7a6a]'}`}>{today ? 'დღეს' : WEEKDAYS_SHORT_GE[d.getDay()]}</span>
            <DayDot day={d.getDate()} share={s.share} state={dotState(s.share, s.counted, false)} today={today} />
          </button>
        );
      })}
    </div>
  );
};

// "ამ თვეში 1 / 2" under a weekly or monthly habit, for the chosen day's week or month; green once the goal is met
const PeriodNote: React.FC<{ count: number; goal: HabitGroupType['goal']; current: boolean }> = ({ count, goal, current }) => {
  const label = goal.per === 'week' ? (current ? 'ამ კვირას' : 'იმ კვირას') : current ? 'ამ თვეში' : 'იმ თვეში';
  return count >= goal.times ? (
    <span className="inline-flex items-center gap-1 text-[12px] font-bold text-emerald-700">
      <Check className="w-3.5 h-3.5 stroke-[3]" />
      {count > 1 ? `${label} ${count}-ჯერ` : label}
    </span>
  ) : (
    <span className="text-[12px] font-semibold tabular-nums text-[#8a7a6a]">
      {label} {count} / {goal.times}
    </span>
  );
};

// One habit: the round button ticks the chosen day (the habit's icon until it is done); a tap on the name unfolds the
// habit's prayers and its own buttons (one without either is ticked by its name too). A counted habit fills its row
// and has „+“; „🔥 ›“ opens the habit's page; ⓘ unfolds the member's note.
const HabitRow: React.FC<{
  model: HabitsModel;
  habit: MyHabit;
  group: MyHabitGroup;
  date: Date;
  onOpenPrayer: (prayerId: string) => void;
  onLink: (l: HabitLink) => void;
}> = ({ model, habit, group, date, onOpenPrayer, onLink }) => {
  const [noteOpen, setNoteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const look = model.looks[habit.id];
  const c = colorOf(look);
  const on = model.isOn(habit.id, date);
  const counter = model.counters[habit.id];
  const count = counter ? model.countOn(habit.id, date) : 0;
  const ticks = useMemo(() => ticksOf(model.log, habit.id), [model.log, habit.id]);
  const run = currentRun(ticks, group.goal, model.first);
  const links = habit.links || [];
  const folds = !!habit.menu || links.length > 0;
  const toggle = () => model.toggle(habit.id, date);

  // the row fills with the day's progress: whole once ticked, part of the way while a counter runs
  const progress = on ? 1 : counter ? Math.min(1, count / counter.goal) : 0;
  const fill =
    progress >= 1 ? tint(c, 0.07) : progress > 0 ? `linear-gradient(90deg, ${tint(c, 0.1)} ${progress * 100}%, transparent ${progress * 100}%)` : undefined;

  const rare = group.goal.per !== 'day';
  const periodNow = dayKey(periodStart(group.goal.per, date)) === dayKey(periodStart(group.goal.per, new Date()));
  const sub = (
    <>
      {counter && (
        <span className="text-[12px] font-bold tabular-nums" style={{ color: c }}>
          {count} / {counter.goal} {counter.unit}
        </span>
      )}
      {counter && rare && <span className="text-[#c9b9a2]"> · </span>}
      {rare && <PeriodNote count={timesIn(ticks, periodStart(group.goal.per, date), group.goal.per)} goal={group.goal} current={periodNow} />}
    </>
  );

  return (
    <li className="relative transition-[background] duration-300" style={{ background: fill }}>
      {/* a counter on its way: a thin line along the bottom shows how far */}
      {!on && progress > 0 && (
        <span
          aria-hidden
          className="absolute left-0 bottom-0 h-[3px] rounded-r-full transition-[width] duration-300"
          style={{ width: `${progress * 100}%`, background: tint(c, 0.6) }}
        />
      )}
      <div className="flex items-center">
        <button
          type="button"
          role="checkbox"
          aria-checked={on}
          aria-label={habit.label}
          onClick={toggle}
          className="w-[52px] min-h-[56px] shrink-0 flex items-center justify-center cursor-pointer select-none"
        >
          <span
            className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center transition-[background,box-shadow] duration-200"
            style={
              on
                ? { background: c, color: '#fff', boxShadow: `0 3px 8px -4px ${c}` }
                : { background: tint(c, 0.12), color: c, boxShadow: `inset 0 0 0 1.5px ${tint(c, 0.3)}` }
            }
          >
            {on ? <Check className="w-[18px] h-[18px] stroke-[3] animate-in zoom-in-50 duration-200" /> : <HabitIcon icon={look?.icon ?? 'sparkle'} className="w-4 h-4" />}
          </span>
        </button>
        <button
          type="button"
          onClick={folds ? () => setMenuOpen(o => !o) : toggle}
          aria-expanded={folds ? menuOpen : undefined}
          className="flex-1 min-w-0 min-h-[56px] py-2 pr-1 text-left cursor-pointer select-none"
        >
          <span className="flex items-center gap-1 text-[15px] font-medium leading-snug text-[#2a2017]">
            {habit.label}
            {folds && <ChevronDown className={`w-4 h-4 shrink-0 text-[#b8a68e] transition-transform ${menuOpen ? 'rotate-180' : ''}`} />}
          </span>
          {(counter || rare) && <span className="block mt-0.5 leading-none">{sub}</span>}
        </button>
        {counter && (
          <button
            type="button"
            onClick={() => { triggerHaptic(6); model.setCount(habit.id, count + 1, date); }}
            aria-label={`${habit.label} — +1 (${count} / ${counter.goal})`}
            title="+1"
            className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center cursor-pointer transition-transform active:scale-90"
            style={{ background: tint(c, 0.13), color: c }}
          >
            <Plus className="w-[18px] h-[18px] stroke-[2.5]" />
          </button>
        )}
        <button
          type="button"
          onClick={() => model.openHabit(habit.id)}
          aria-label={`${habit.label} — ჩვევის გვერდი${run > 1 ? `, ზედიზედ ${run}` : ''}`}
          title="ჩვევის გვერდი"
          className={`h-11 min-w-10 shrink-0 ${habit.note ? '' : 'mr-1'} pl-1.5 pr-1 rounded-full flex items-center justify-end gap-0.5 text-[12.5px] font-bold tabular-nums text-[#b4441c] hover:bg-[#7a2028]/[0.06] cursor-pointer transition-colors`}
        >
          {run > 1 && (
            <>
              <Flame className="w-3.5 h-3.5 shrink-0" />
              {run}
            </>
          )}
          <ChevronRight className="w-[18px] h-[18px] shrink-0 text-[#b8a68e]" />
        </button>
        {habit.note && (
          <button
            type="button"
            onClick={() => setNoteOpen(o => !o)}
            aria-expanded={noteOpen}
            aria-label={`${habit.label} — ჩანაწერი`}
            title="ჩანაწერი"
            className={`w-9 h-9 mr-1 shrink-0 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
              noteOpen ? 'bg-[#7a2028]/[0.1] text-[#7a2028]' : 'text-[#a08a76] hover:text-[#7a2028] hover:bg-[#7a2028]/[0.06]'
            }`}
          >
            <Info className="w-[17px] h-[17px]" />
          </button>
        )}
      </div>
      {menuOpen && habit.menu && (
        <div className="px-3 pb-4 pt-1 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
          {habit.hint && <p className="px-0.5 text-[12.5px] font-medium text-[#8a7a6a]">{habit.hint}</p>}
          <HabitPrayerMenu menu={habit.menu} onOpen={onOpenPrayer} />
        </div>
      )}
      {(noteOpen || (menuOpen && links.length > 0)) && (
        <div className="pl-[52px] pr-3 pb-3 -mt-1 space-y-2">
          {noteOpen && habit.note && (
            <p className="border-l-2 border-[#e3cfae] pl-2.5 font-serif-ge text-[12.5px] italic leading-relaxed text-[#7a6656] whitespace-pre-line break-words animate-in fade-in duration-200">
              {habit.note}
            </p>
          )}
          {menuOpen && links.length > 0 && (
            <div className="flex flex-wrap gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
              {links.map((l, i) => (
                <HabitLinkChip key={i} link={l} onOpen={() => onLink(l)} />
              ))}
            </div>
          )}
        </div>
      )}
    </li>
  );
};

export const DayView: React.FC<{
  model: HabitsModel;
  date: Date;
  onDate: (d: Date) => void;
  /** ✏️ ⓘ at the right of the status line */
  actions?: React.ReactNode;
  onOpenPrayer: (prayerId: string) => void;
  onLink: (l: HabitLink) => void;
}> = ({ model, date, onDate, actions, onOpenPrayer, onLink }) => {
  const today = dayKey(date) === dayKey(new Date());
  const s = dayState(model.log, model.dailyIds, date);
  const total = Math.max(1, s.total);
  const need = dayNeeds(total);
  const streak = keptStreak(model.log, model.dailyIds);
  const status =
    s.done >= total ? (today ? 'დღეს ყველა შესრულდა 🙏' : 'ყველა შესრულდა 🙏') : s.done >= need ? 'დღე ჩაითვალა ✓' : `კიდევ ${need - s.done} — და დღე ჩაითვლება`;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] p-3 space-y-3">
        <div className="flex items-center gap-3.5">
          <Ring value={s.done} max={total} caption={today ? 'დღეს' : 'იმ დღეს'} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-1">
              <div className="flex-1 min-w-0 pt-0.5">
                {!today && <p className="text-[12.5px] font-bold leading-snug text-[#7a2028]">{longDate(date)}</p>}
                <p className="text-[14px] font-bold leading-snug text-[#2a2017]">{status}</p>
              </div>
              {actions && <div className="-mt-1.5 -mr-1.5 flex shrink-0">{actions}</div>}
            </div>
            {streak.days > 0 && (
              <p className="mt-1.5 flex items-center gap-1 text-[12.5px] font-bold text-[#b4441c]">
                <Flame className="w-4 h-4 shrink-0" />
                ზედიზედ {streak.days}
                {streak.capped ? '+' : ''} დღე
              </p>
            )}
          </div>
        </div>
        <DayStrip model={model} selected={date} onSelect={onDate} />
      </div>

      {/* the daily habits beside the weekly and monthly ones; one column on a phone */}
      <div className="@container">
        <div className="grid gap-4 @lg:grid-cols-2 items-start">
          {[model.daily, model.rare].map((groups, i) =>
            groups.some(g => g.items.length) ? (
              <section key={i}>
                <ViewHeading>{i === 0 ? 'ყოველდღე' : 'კვირაში და თვეში'}</ViewHeading>
                <ul className="rounded-2xl ring-1 ring-[#e8dcc8] bg-white divide-y divide-[#f1e8d9] overflow-hidden">
                  {groups.flatMap(g =>
                    g.items.map(h => (
                      <HabitRow key={h.id} model={model} habit={h} group={g} date={date} onOpenPrayer={onOpenPrayer} onLink={onLink} />
                    ))
                  )}
                </ul>
              </section>
            ) : null
          )}
        </div>
      </div>
    </div>
  );
};
