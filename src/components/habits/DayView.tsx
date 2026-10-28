import React, { useMemo, useState } from 'react';
import { ArrowUpDown, Check, ChevronDown, ChevronRight, Flame, Info, Pencil, Plus } from 'lucide-react';
import { COUNTED_BY_READING, COUNTER_TAP_STEP, HabitCounter } from '../../data/habitLooks';
import { HabitGroupType } from '../../data/habitsAndManera';
import { HabitLink, MyHabit, MyHabitGroup } from '../../utils/myHabits';
import { isDue, planRun } from '../../utils/habitSchedule';
import { MONTHS_GE, WEEKDAYS_GE, WEEKDAYS_SHORT_GE } from '../../utils/dateNames';
import { TICK_DAYS, dayKey, dayNeeds, keptStreak, lastDays, periodStart } from '../../utils/habitsWeek';
import { currentRun, dayState, ticksOf, timesIn } from '../../utils/habitStats';
import { triggerHaptic } from '../../utils/haptics';
import { HabitPrayerMenu, singlePrayerOf } from '../views/HabitPrayerMenu';
import { HabitLinkChip } from '../views/HabitLinks';
import { RICH_TEXT } from '../views/RichNoteEditor';
import { safeNoteHtml } from '../../utils/richNote';
import { HabitIcon, colorOf, tint } from './HabitIcon';
import { HabitsModel } from './useHabits';
import { DayDot, Ring, ViewHeading, dotState } from './parts';

// "დღე": the chosen day's ring and status, the last seven days to choose from (a forgotten tick may be set up to
// six days back), then the daily habits beside the weekly and monthly ones; a member changes each list at its end.

/** A member's own list: „+ ჩვევის დამატება“ and „⇅ რიგი“ at the end of each list (0 — daily, 1 — weekly and monthly);
 *  a habit itself is changed on its own page (its ✏️), the one editor. */
export interface ListEdit {
  add: (col: 0 | 1) => void;
  /** the list's habits with grips, drawn in its place while „რიგი“ is on */
  reorder: (col: 0 | 1) => React.ReactNode;
}

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
            className={`min-w-0 flex flex-col items-center gap-0.5 pt-1 pb-1.5 rounded-2xl cursor-pointer transition-colors ${
              on ? 'bg-white ring-1 ring-[#e8dcc8] shadow-[0_3px_10px_-6px_rgba(74,52,38,0.35)]' : 'hover:bg-white/60'
            }`}
          >
            <span className={`text-[11px] font-bold leading-none ${on ? 'text-[#7a2028]' : 'text-[#8a7a6a]'}`}>{today ? 'დღეს' : WEEKDAYS_SHORT_GE[d.getDay()]}</span>
            <DayDot day={d.getDate()} share={s.share} state={dotState(s.share, s.counted, false)} today={today} size={32} />
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

/** A counted habit's day under its name: the bar and „8 / 15 შეკვეთა“; a tap on the number types the exact one.
 *  `bare`: the number only (a card that shows the count as a ring round its button). */
const CountBar: React.FC<{ count: number; counter: HabitCounter; color: string; label: string; onSet: (n: number) => void; bare?: boolean }> = ({
  count,
  counter,
  color,
  label,
  onSet,
  bare,
}) => {
  const [typing, setTyping] = useState<string | null>(null);
  const cancelled = React.useRef(false);
  const commit = () => {
    const n = parseInt(typing ?? '', 10);
    setTyping(null);
    if (!cancelled.current && Number.isFinite(n) && n !== count) onSet(n);
    cancelled.current = false;
  };
  const of = (
    <>
      {typing === null && count} / {counter.goal} {counter.unit}
    </>
  );
  return (
    <div className={`${bare ? 'inline-flex gap-0' : 'flex gap-2.5'} items-center`}>
      {!bare && (
        <span
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={counter.goal}
          aria-valuenow={Math.min(count, counter.goal)}
          className="flex-1 min-w-0 h-2 rounded-full overflow-hidden"
          style={{ background: tint(color, 0.15) }}
        >
          <span className="block h-full rounded-full transition-[width] duration-300" style={{ width: `${Math.min(1, count / counter.goal) * 100}%`, background: color }} />
        </span>
      )}
      {typing === null ? (
        <button
          type="button"
          onClick={() => setTyping(String(count))}
          aria-label={`${label} — ${count} / ${counter.goal} ${counter.unit}, რიცხვის ჩაწერა`}
          title="რიცხვის ჩაწერა"
          className={`h-9 -my-1.5 ${bare ? '-ml-2 -mr-1.5' : '-mr-1'} px-2 shrink-0 rounded-full text-[12.5px] font-bold tabular-nums cursor-pointer hover:bg-black/[0.04] transition-colors`}
          style={{ color }}
        >
          {of}
        </button>
      ) : (
        <span className="-my-1.5 shrink-0 flex items-center gap-1.5 text-[12.5px] font-bold tabular-nums" style={{ color }}>
          <input
            autoFocus
            type="number"
            inputMode="numeric"
            min={0}
            value={typing}
            aria-label={`${label} — რამდენი`}
            onChange={e => setTyping(e.target.value)}
            onFocus={e => e.target.select()}
            onBlur={commit}
            onKeyDown={e => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') { cancelled.current = true; e.currentTarget.blur(); }
            }}
            className="w-[72px] h-9 rounded-xl bg-white text-center text-[16px] font-bold tabular-nums text-[#2a2017] outline-none"
            style={{ boxShadow: `inset 0 0 0 1.5px ${color}` }}
          />
          {of}
        </span>
      )}
    </div>
  );
};

// A card shows its own numbers: today's count as a ring round the round button, the last ten days as dots beside the name,
// „›“ opening its own page (the share, the days ticked, and its ✏️ — the one place a habit is changed).
const RING = 2 * Math.PI * 18.5;
// how many days the dots beside a card's name show
const DOTS = 10;

/** „🔥 6“: periods (days, for a daily habit) in a row that met the goal. */
const Run: React.FC<{ run: number; className?: string }> = ({ run, className = '' }) => (
  <span title={`ზედიზედ ${run}`} className={`inline-flex items-center gap-0.5 text-[12.5px] leading-none font-bold tabular-nums text-[#b4441c] ${className}`}>
    <Flame className="w-3.5 h-3.5 shrink-0" />
    {run}
  </span>
);

/** The habit's last ten days as dots beside its name, today's on the right; a done day is filled in its colour. */
const WeekDots: React.FC<{ ticks: Set<string>; color: string; className: string }> = ({ ticks, color, className }) => (
  <span className={`shrink-0 items-center gap-[3px] ${className}`} title={`ბოლო ${DOTS} დღე`}>
    {lastDays(DOTS).map((d, i) => {
      const on = ticks.has(dayKey(d));
      return (
        <span
          key={i}
          aria-label={`${longDate(d)}${on ? ' ✓' : ''}`}
          className={`rounded-full transition-colors ${i === DOTS - 1 ? 'w-2 h-2' : 'w-1.5 h-1.5'}`}
          style={{ background: on ? color : tint(color, 0.18) }}
        />
      );
    })}
  </span>
);

// One habit: the round button ticks the chosen day (the habit's icon until it is done; a counted habit's count runs
// round it as a ring); a tap on the name unfolds the habit's prayers and its own buttons, or opens its one prayer (one
// without either is ticked by its name too). One line: at the name's right the run and the last ten days; a weekly or
// monthly habit has its period („ამ კვირას 1 / 2“) there instead, a counted one its number. A counted habit
// has „+“ (not the Gospel and the Apostle: their chapters count by „წავიკითხე“); „›“ opens the habit's page, for a member
// and a guest alike; ⓘ unfolds the member's note.
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
  const step = COUNTER_TAP_STEP[habit.id] ?? (habit.menu === 'jesus' ? 10 : 1);
  const ticks = useMemo(() => ticksOf(model.log, habit.id), [model.log, habit.id]);
  const run = habit.schedule ? planRun(habit.schedule, ticks, model.first) : currentRun(ticks, group.goal, model.first);
  const ring = !!counter && !on;
  const links = habit.links || [];
  // the morning or evening prayers open straight away, unless the member added buttons of their own to unfold
  const single = links.length === 0 ? singlePrayerOf(habit.menu) : null;
  const folds = !single && (!!habit.menu || links.length > 0);
  const toggle = () => model.toggle(habit.id, date);

  const rare = group.goal.per !== 'day';
  const periodNow = dayKey(periodStart(group.goal.per, date)) === dayKey(periodStart(group.goal.per, new Date()));

  const name = (
    <button
      type="button"
      onClick={single ? () => onOpenPrayer(single) : folds ? () => setMenuOpen(o => !o) : toggle}
      aria-expanded={folds ? menuOpen : undefined}
      className="block w-full py-0.5 text-left cursor-pointer select-none"
    >
      <span className="flex items-center gap-1 text-[15px] font-medium leading-snug text-[#2a2017]">
        <span className="truncate">{habit.label}</span>
        {folds && <ChevronDown className={`w-4 h-4 shrink-0 text-[#b8a68e] transition-transform ${menuOpen ? 'rotate-180' : ''}`} />}
      </span>
    </button>
  );

  return (
    <li className="relative transition-[background] duration-300" style={{ background: on ? tint(c, 0.07) : undefined }}>
      <div className="flex items-center">
        <button
          type="button"
          role="checkbox"
          aria-checked={on}
          aria-label={habit.label}
          onClick={toggle}
          className="w-[48px] self-stretch min-h-[52px] shrink-0 flex items-center justify-center cursor-pointer select-none"
        >
          <span
            className="relative w-8 h-8 shrink-0 rounded-full flex items-center justify-center transition-[background,box-shadow] duration-200"
            style={
              on
                ? { background: c, color: '#fff', boxShadow: `0 3px 8px -4px ${c}` }
                : { background: tint(c, 0.12), color: c, boxShadow: ring ? undefined : `inset 0 0 0 1.5px ${tint(c, 0.3)}` }
            }
          >
            {ring && counter && (
              // today's count as a ring round the button
              <svg viewBox="0 0 40 40" className="absolute -inset-1 w-10 h-10 -rotate-90 pointer-events-none" aria-hidden>
                <circle cx="20" cy="20" r="18.5" fill="none" stroke={tint(c, 0.2)} strokeWidth="2.5" />
                {count > 0 && (
                  <circle
                    cx="20"
                    cy="20"
                    r="18.5"
                    fill="none"
                    stroke={c}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray={RING}
                    strokeDashoffset={RING * (1 - Math.min(1, count / counter.goal))}
                    className="transition-[stroke-dashoffset] duration-300"
                  />
                )}
              </svg>
            )}
            {on ? <Check className="w-[18px] h-[18px] stroke-[3] animate-in zoom-in-50 duration-200" /> : <HabitIcon icon={look?.icon ?? 'sparkle'} className="w-4 h-4" />}
          </span>
        </button>
        {/* one line: the name (cut short when long), then at its right the run and the ten days — or a weekly/monthly
            habit's period, or a counted habit's number; the share and the days ticked live on the habit's own page */}
        <div className="flex-1 min-w-0 py-1.5 pr-1 flex items-center gap-x-2.5">
          <div className="min-w-0 flex-1">{name}</div>
          <span className="shrink-0 flex items-center gap-2.5">
            {run > 1 && <Run run={run} />}
            {rare ? (
              <PeriodNote count={timesIn(ticks, periodStart(group.goal.per, date), group.goal.per)} goal={group.goal} current={periodNow} />
            ) : counter ? (
              <CountBar bare count={count} counter={counter} color={c} label={habit.label} onSet={n => model.setCount(habit.id, n, date)} />
            ) : (
              ticks.size > 0 && <WeekDots ticks={ticks} color={c} className="hidden min-[360px]:flex" />
            )}
          </span>
        </div>
        {counter && !COUNTED_BY_READING.includes(habit.id) && (
          <button
            type="button"
            onClick={() => { triggerHaptic(6); model.setCount(habit.id, count + step, date); }}
            aria-label={`${habit.label} — +${step} (${count} / ${counter.goal})`}
            title={`+${step}`}
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
          className={`h-11 min-w-10 shrink-0 ${habit.note ? '' : 'mr-1'} pl-1.5 pr-1 rounded-full flex items-center justify-end text-[#b8a68e] hover:bg-[#7a2028]/[0.06] cursor-pointer transition-colors`}
        >
          <ChevronRight className="w-[18px] h-[18px] shrink-0" />
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
        <div className="pl-[48px] pr-3 pb-3 -mt-1 space-y-2">
          {noteOpen && habit.richNote ? (
            <div
              className={`${RICH_TEXT} border-l-2 border-[#e3cfae] pl-2.5 text-[13px] leading-relaxed text-[#5a4636] animate-in fade-in duration-200`}
              // made safe twice: when saved and when read (utils/richNote)
              dangerouslySetInnerHTML={{ __html: safeNoteHtml(habit.richNote) }}
            />
          ) : (
            noteOpen &&
            habit.note && (
              <p className="border-l-2 border-[#e3cfae] pl-2.5 font-serif-ge text-[12.5px] italic leading-relaxed text-[#7a6656] whitespace-pre-line break-words animate-in fade-in duration-200">
                {habit.note}
              </p>
            )
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
  /** „დღე ▾“ ⓘ at the right of the status line */
  actions?: React.ReactNode;
  onOpenPrayer: (prayerId: string) => void;
  onLink: (l: HabitLink) => void;
  edit?: ListEdit;
}> = ({ model, date, onDate, actions, onOpenPrayer, onLink, edit }) => {
  const [sorting, setSorting] = useState<0 | 1 | null>(null);
  // „შეცვლა“: one ✏️ over the lists; the rows' ✏️, the order and „+“ show only then (2026-10-27)
  const [changing, setChanging] = useState(false);
  const today = dayKey(date) === dayKey(new Date());
  const s = dayState(model.log, model.dailyIds, date);
  const total = Math.max(1, s.total);
  const need = dayNeeds(total);
  const streak = keptStreak(model.log, model.dailyIds);
  const status =
    s.done >= total ? (today ? 'დღეს ყველა შესრულდა 🙏' : 'ყველა შესრულდა 🙏') : s.done >= need ? 'დღე ჩაითვალა ✓' : `კიდევ ${need - s.done} — და დღე ჩაითვლება`;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] p-2.5 space-y-1.5">
        <div className="flex items-center gap-3">
          <Ring compact value={s.done} max={total} caption={today ? 'დღეს' : 'იმ დღეს'} />
          <div className="flex-1 min-w-0">
            {/* on a phone the buttons take their own line above the status (wrap-reverse), so the text keeps its width */}
            <div className="flex flex-wrap-reverse items-end gap-x-1 gap-y-1.5">
              <div className="flex-1 basis-40 min-w-0 pt-0.5">
                {!today && <p className="text-[12.5px] font-bold leading-snug text-[#7a2028]">{longDate(date)}</p>}
                <p className="text-[14px] font-bold leading-snug text-[#2a2017]">{status}</p>
              </div>
              {actions && <div className="-mt-1.5 -mr-1.5 ml-auto flex shrink-0">{actions}</div>}
            </div>
            {streak.days > 0 && (
              <p className="mt-0.5 flex items-center gap-1 text-[12.5px] font-bold text-[#b4441c]">
                <Flame className="w-3.5 h-3.5 shrink-0" />
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
        <div className="grid grid-cols-1 gap-3 @lg:grid-cols-2 items-start">
          {[model.daily, model.rare].map((groups, i) => {
            const col = i as 0 | 1;
            const has = groups.some(g => g.items.length);
            const sorted = has && sorting === col && changing;
            // an empty list keeps its place for a member, to add a habit to it
            if (!has && !edit) return null;
            return (
              <section key={i}>
                <ViewHeading
                  right={
                    edit && (
                      <span className="-my-1 -mr-1 flex items-center gap-0.5">
                        {changing && has && (
                          <button
                            type="button"
                            aria-pressed={sorted}
                            aria-label={sorted ? 'რიგი — მზადაა' : 'ჩვევების რიგი'}
                            title={sorted ? 'მზადაა' : 'რიგი'}
                            onClick={() => { triggerHaptic(8); setSorting(sorted ? null : col); }}
                            className={`h-9 rounded-full inline-flex items-center justify-center gap-1 cursor-pointer transition-colors active:scale-95 ${
                              sorted ? 'px-3 bg-[#7a2028] text-[#fbf6ec] text-[13px] font-bold' : 'w-9 text-[#8a7a6a] hover:text-[#7a2028] hover:bg-[#7a2028]/[0.06]'
                            }`}
                          >
                            {sorted ? <Check className="w-4 h-4" /> : <ArrowUpDown className="w-[18px] h-[18px]" />}
                            {sorted && 'მზადაა'}
                          </button>
                        )}
                        {(changing || !has) && (
                          <button
                            type="button"
                            aria-label="ჩვევის დამატება"
                            title="ჩვევის დამატება"
                            onClick={() => edit.add(col)}
                            className="w-9 h-9 rounded-full inline-flex items-center justify-center text-[#7a2028] hover:bg-[#7a2028]/[0.06] cursor-pointer transition-colors active:scale-95"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        )}
                        {/* the one ✏️, over the first list only */}
                        {i === 0 && (
                          <button
                            type="button"
                            aria-pressed={changing}
                            aria-label={changing ? 'შეცვლა — მზადაა' : 'ჩვევების შეცვლა'}
                            title={changing ? 'მზადაა' : 'შეცვლა'}
                            onClick={() => { triggerHaptic(8); setChanging(c => !c); setSorting(null); }}
                            className={`h-9 rounded-full inline-flex items-center justify-center gap-1 cursor-pointer transition-colors active:scale-95 ${
                              changing ? 'px-3 bg-[#7a2028] text-[#fbf6ec] text-[13px] font-bold' : 'w-9 text-[#8a7a6a] hover:text-[#7a2028] hover:bg-[#7a2028]/[0.06]'
                            }`}
                          >
                            {changing ? <Check className="w-4 h-4" /> : <Pencil className="w-[17px] h-[17px]" />}
                            {changing && 'მზადაა'}
                          </button>
                        )}
                      </span>
                    )
                  }
                >
                  {i === 0 ? 'ყოველდღე' : 'კვირაში და თვეში'}
                </ViewHeading>
                {sorted && edit ? (
                  edit.reorder(col)
                ) : has ? (
                  <ul className="rounded-2xl ring-1 ring-[#e8dcc8] bg-white divide-y divide-[#f1e8d9] overflow-hidden">
                    {groups.flatMap(g =>
                      g.items
                        // a habit with „მორგებული“ days shows on those days only
                        .filter(h => !h.schedule || isDue(h.schedule, date))
                        .map(h => (
                          <HabitRow
                            key={h.id}
                            model={model}
                            habit={h}
                            group={g}
                            date={date}
                            onOpenPrayer={onOpenPrayer}
                            onLink={onLink}
                          />
                        ))
                    )}
                  </ul>
                ) : null}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
};
