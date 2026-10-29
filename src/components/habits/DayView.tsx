import React, { useMemo, useState } from 'react';
import { ArrowUpDown, Check, ChevronDown, ChevronRight, Pencil, Plus } from 'lucide-react';
import { COUNTED_BY_READING, COUNTER_TAP_STEP, HabitCounter } from '../../data/habitLooks';
import { HabitGroupType } from '../../data/habitsAndManera';
import { HabitLink, MyHabit, MyHabitGroup } from '../../utils/myHabits';
import { isDue } from '../../utils/habitSchedule';
import { MONTHS_GE, WEEKDAYS_GE, WEEKDAYS_SHORT_GE } from '../../utils/dateNames';
import { TICK_DAYS, dayKey, dayNeeds, lastDays, periodStart } from '../../utils/habitsWeek';
import { dayState, ticksOf, timesIn } from '../../utils/habitStats';
import { triggerHaptic } from '../../utils/haptics';
import { HabitPrayerMenu, singlePrayerOf } from '../views/HabitPrayerMenu';
import { HabitLinkChip } from '../views/HabitLinks';
import { HabitIcon, colorOf, tint } from './HabitIcon';
import { HabitsModel } from './useHabits';
import { DayDot, ViewHeading, dotState } from './parts';

// "დღე": the last seven days to choose from (a forgotten tick may be set up to six days back) and the chosen day's
// status under them (its count is in the card's head, ChvevebiPanel), then the daily habits; the weekly and monthly ones
// fold under one line (2026-10-28: „ჩემი დღე“ — the daily list is what a day needs). A member changes each list at its end.

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

// A counted habit's count runs as a ring round its round button
const RING = 2 * Math.PI * 18.5;

// One habit, two things to do (2026-10-28): the round button marks the chosen day — the habit's icon until it is done;
// a counted habit's button adds its step (+1, the Jesus prayer +10) with the count as a ring round it, and ticks itself at
// the goal (the Gospel and the Apostle count by „წავიკითხე“, so their button ticks) — and the rest of the line opens:
// a tap on the name unfolds the habit's prayers and its own buttons, or opens its one prayer (one without either is
// ticked by its name too); „›“ opens the habit's page (its run, its days, the member's note), for a member and a guest
// alike. At the name's right only a number: a counted habit's count (a tap types it) or a weekly/monthly one's period.
const HabitRow: React.FC<{
  model: HabitsModel;
  habit: MyHabit;
  group: MyHabitGroup;
  date: Date;
  onOpenPrayer: (prayerId: string) => void;
  onLink: (l: HabitLink) => void;
}> = ({ model, habit, group, date, onOpenPrayer, onLink }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const look = model.looks[habit.id];
  const c = colorOf(look);
  const on = model.isOn(habit.id, date);
  const counter = model.counters[habit.id];
  const count = counter ? model.countOn(habit.id, date) : 0;
  const step = COUNTER_TAP_STEP[habit.id] ?? (habit.menu === 'jesus' ? 10 : 1);
  const ticks = useMemo(() => ticksOf(model.log, habit.id), [model.log, habit.id]);
  const ring = !!counter && !on;
  // the button adds the step while a counted habit is not done yet; once done, a tap takes the tick back as before
  const adds = !!counter && !on && !COUNTED_BY_READING.includes(habit.id);
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
        <span className="min-w-0 break-words">{habit.label}</span>
        {folds && <ChevronDown className={`w-4 h-4 shrink-0 text-[#b8a68e] transition-transform ${menuOpen ? 'rotate-180' : ''}`} />}
      </span>
    </button>
  );

  return (
    <li className="relative transition-[background] duration-300" style={{ background: on ? tint(c, 0.07) : undefined }}>
      <div className="flex items-center">
        <button
          type="button"
          role={adds ? undefined : 'checkbox'}
          aria-checked={adds ? undefined : on}
          aria-label={adds ? `${habit.label} — +${step} (${count} / ${counter!.goal} ${counter!.unit})` : habit.label}
          onClick={adds ? () => { triggerHaptic(6); model.setCount(habit.id, count + step, date); } : toggle}
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
        {/* the name (it wraps, never shrinks), then at its right a counted habit's number or a weekly/monthly
            habit's period; the run, the share and the days ticked live on the habit's own page */}
        <div className="flex-1 min-w-0 py-1.5 pr-1 flex items-center gap-x-2.5">
          <div className="min-w-0 flex-1">{name}</div>
          {rare ? (
            <span className="shrink-0"><PeriodNote count={timesIn(ticks, periodStart(group.goal.per, date), group.goal.per)} goal={group.goal} current={periodNow} /></span>
          ) : counter ? (
            <span className="shrink-0"><CountBar bare count={count} counter={counter} color={c} label={habit.label} onSet={n => model.setCount(habit.id, n, date)} /></span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => model.openHabit(habit.id)}
          aria-label={`${habit.label} — ჩვევის გვერდი`}
          title="ჩვევის გვერდი"
          className="h-11 min-w-10 shrink-0 mr-1 pl-1.5 pr-1 rounded-full flex items-center justify-end text-[#b8a68e] hover:bg-[#7a2028]/[0.06] cursor-pointer transition-colors"
        >
          <ChevronRight className="w-[18px] h-[18px] shrink-0" />
        </button>
      </div>
      {menuOpen && habit.menu && (
        <div className="px-3 pb-4 pt-1 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
          {habit.hint && <p className="px-0.5 text-[12.5px] font-medium text-[#8a7a6a]">{habit.hint}</p>}
          <HabitPrayerMenu menu={habit.menu} onOpen={onOpenPrayer} />
        </div>
      )}
      {menuOpen && links.length > 0 && (
        <div className="pl-[48px] pr-3 pb-3 -mt-1 flex flex-wrap gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
          {links.map((l, i) => (
            <HabitLinkChip key={i} link={l} onOpen={() => onLink(l)} />
          ))}
        </div>
      )}
    </li>
  );
};

// the weekly and monthly list's fold, kept open or shut on this device
const RARE_KEY = 'sg-habits-rare-open';
const rareWasOpen = () => {
  try { return localStorage.getItem(RARE_KEY) === '1'; } catch { return false; }
};

export const DayView: React.FC<{
  model: HabitsModel;
  date: Date;
  onDate: (d: Date) => void;
  onOpenPrayer: (prayerId: string) => void;
  onLink: (l: HabitLink) => void;
  edit?: ListEdit;
}> = ({ model, date, onDate, onOpenPrayer, onLink, edit }) => {
  const [sorting, setSorting] = useState<0 | 1 | null>(null);
  // „შეცვლა“: one ✏️ over the lists; the rows' ✏️, the order and „+“ show only then (2026-10-27)
  const [changing, setChanging] = useState(false);
  const [rareOpen, setRareOpen] = useState(rareWasOpen);
  const toggleRare = () => {
    triggerHaptic(8);
    setRareOpen(o => {
      try { localStorage.setItem(RARE_KEY, o ? '0' : '1'); } catch { /* private window: this visit only */ }
      return !o;
    });
  };
  const today = dayKey(date) === dayKey(new Date());
  const s = dayState(model.log, model.dailyIds, date);
  const total = Math.max(1, s.total);
  const need = dayNeeds(total);
  const status =
    s.done >= total ? (today ? 'დღეს ყველა შესრულდა 🙏' : 'ყველა შესრულდა 🙏') : s.done >= need ? 'დღე ჩაითვალა ✓' : `კიდევ ${need - s.done} — და დღე ჩაითვლება`;
  // the weekly and monthly habits whose goal the chosen day's week or month has met, for their folded line
  const rareItems = model.rare.flatMap(g => g.items.filter(h => !h.schedule || isDue(h.schedule, date)).map(h => ({ h, g })));
  const rareMet = rareItems.filter(({ h, g }) => timesIn(ticksOf(model.log, h.id), periodStart(g.goal.per, date), g.goal.per) >= g.goal.times).length;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] p-2 space-y-1">
        <DayStrip model={model} selected={date} onSelect={onDate} />
        <p className="px-1 pb-0.5 text-center text-[13px] font-bold leading-snug text-[#4a3426]">{status}</p>
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
            // the weekly and monthly habits: one line that unfolds them (open while the lists are being changed)
            const folded = col === 1 && has && !changing;
            if (folded) {
              return (
                <section key={i}>
                  <button
                    type="button"
                    onClick={toggleRare}
                    aria-expanded={rareOpen}
                    className="w-full min-h-12 px-3.5 py-2 rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] flex items-center gap-2 text-left cursor-pointer transition-colors hover:bg-[#f7efe1]"
                  >
                    <span className="flex-1 min-w-0 font-serif-ge text-[15px] font-bold text-[#7a2028]">კვირაში და თვეში</span>
                    <span className={`shrink-0 text-[12.5px] font-bold tabular-nums ${rareMet && rareMet >= rareItems.length ? 'text-emerald-700' : 'text-[#8a7a6a]'}`}>
                      {rareMet} / {rareItems.length}
                    </span>
                    <ChevronDown className={`w-5 h-5 shrink-0 text-[#b08a4a] transition-transform ${rareOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {rareOpen && (
                    <ul className="mt-2 rounded-2xl ring-1 ring-[#e8dcc8] bg-white divide-y divide-[#f1e8d9] overflow-hidden sg-in">
                      {rareItems.map(({ h, g }) => (
                        <HabitRow key={h.id} model={model} habit={h} group={g} date={date} onOpenPrayer={onOpenPrayer} onLink={onLink} />
                      ))}
                    </ul>
                  )}
                </section>
              );
            }
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
