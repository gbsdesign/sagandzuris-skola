import React, { useState } from 'react';
import { Bell, Clock, Minus, Plus, X } from 'lucide-react';
import { ALERT_CHOICES, HabitSchedule, HabitTime, MAX_ALERTS } from '../../utils/myHabits';
import { WEEKDAYS_GE, WEEKDAYS_SHORT_GE } from '../../utils/dateNames';
import { dayKey } from '../../utils/habitsWeek';
import { parseDay } from '../../utils/habitStats';
import { askNotificationPermission } from '../../utils/prayerReminders';

// The parts of a habit's card editor that plan it: „მორგებული“ days (every N days, weeks on chosen weekdays, or
// months; from a day; ending never, on a day or after N times), and its time of day with reminders before it.
// Compact: each part is one or two lines, a caption inside its own box instead of a label column.

const BOX = 'inline-flex max-w-full items-center rounded-xl bg-white ring-1 ring-[#e8dcc8] focus-within:ring-2 focus-within:ring-[#7a2028]/40 transition';
const STEP =
  'w-10 h-10 shrink-0 flex items-center justify-center text-[#7a2028] cursor-pointer disabled:opacity-30 disabled:cursor-default active:scale-90 transition-transform';
const INNER = 'h-10 bg-transparent text-[14px] font-semibold text-[#2a2017] outline-none';
const CAP = 'pl-2.5 text-[12px] font-bold text-[#8a7a6a] select-none';
const NUM = `${INNER} w-11 text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`;
// a time field without the desktop clock icon (a phone opens its own picker anyway), so two fit in a row
const TIME = `${INNER} w-[4.4rem] px-0.5 text-center tabular-nums [&::-webkit-calendar-picker-indicator]:hidden disabled:opacity-40`;

const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0];
const UNIT_WORD = { day: 'დღეში', week: 'კვირაში', month: 'თვეში' } as const;

/** a new „მორგებული“: every week, on today's weekday, from today */
export const newSchedule = (): HabitSchedule => {
  const today = new Date();
  return { every: 1, unit: 'week', days: [today.getDay()], start: dayKey(today) };
};

/** −/+ round a number one may type */
const Stepper: React.FC<{ value: number; min: number; max: number; label: string; onSet: (n: number) => void }> = ({ value, min, max, label, onSet }) => {
  const [typed, setTyped] = useState<string | null>(null);
  const set = (n: number) => {
    const v = Math.max(min, Math.min(max, Math.round(n) || value));
    if (v !== value) onSet(v);
  };
  return (
    <>
      <button type="button" aria-label={`${label} −1`} disabled={value <= min} onClick={() => set(value - 1)} className={STEP}>
        <Minus className="w-4 h-4 stroke-[2.5]" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        aria-label={label}
        value={typed ?? value}
        onChange={e => setTyped(e.target.value)}
        onBlur={() => { if (typed !== null) set(parseInt(typed, 10)); setTyped(null); }}
        onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
        className={NUM}
      />
      <button type="button" aria-label={`${label} +1`} disabled={value >= max} onClick={() => set(value + 1)} className={STEP}>
        <Plus className="w-4 h-4 stroke-[2.5]" />
      </button>
    </>
  );
};

/** „მორგებული“, unfolded under „რამდენჯერ“: „ყოველ 1 კვირაში“, the weekdays, then „დან [date]“ and „სრულდება [..]“ */
export const ScheduleRows: React.FC<{ schedule: HabitSchedule; onChange: (s: HabitSchedule) => void }> = ({ schedule: s, onChange }) => {
  const set = (p: Partial<HabitSchedule>) => onChange({ ...s, ...p });
  const start = parseDay(s.start);
  const days = s.days?.length ? s.days : [start.getDay()];
  const ends = s.until ? 'until' : s.count ? 'count' : 'never';
  const later = (n: number) => dayKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + n));

  return (
    <div className="pl-2.5 border-l-2 border-[#e8dcc8] space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="flex flex-wrap items-center gap-2">
        <span className={BOX}>
          <span className={`${CAP} max-[360px]:hidden`}>ყოველ</span>
          <Stepper value={s.every} min={1} max={99} label="რამდენ" onSet={every => set({ every })} />
          <span className="self-stretch w-px my-2 bg-[#e8dcc8]" aria-hidden />
          <select
            aria-label="დღე, კვირა თუ თვე"
            value={s.unit}
            onChange={e => {
              const unit = e.target.value as HabitSchedule['unit'];
              set({ unit, days: unit === 'week' ? days : undefined });
            }}
            className={`${INNER} min-w-0 flex-1 pl-2.5 pr-1 rounded-r-xl cursor-pointer`}
          >
            {(['day', 'week', 'month'] as const).map(u => (
              <option key={u} value={u}>{UNIT_WORD[u]}</option>
            ))}
          </select>
        </span>
        {s.unit === 'month' && <span className="text-[12.5px] font-semibold text-[#8a7a6a]">თვის {start.getDate()} რიცხვში</span>}
      </div>
      {s.unit === 'week' && (
        <div role="group" aria-label="კვირის დღეები" className="grid grid-cols-7 gap-1">
          {MONDAY_FIRST.map(d => {
            const on = days.includes(d);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                aria-label={WEEKDAYS_GE[d]}
                title={WEEKDAYS_GE[d]}
                // one day at least stays chosen
                onClick={() => !(on && days.length === 1) && set({ days: on ? days.filter(x => x !== d) : [...days, d] })}
                className={`h-9 rounded-xl text-[12.5px] font-bold cursor-pointer transition-colors active:scale-95 ${
                  on ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white text-[#6a5646] ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40'
                }`}
              >
                {WEEKDAYS_SHORT_GE[d]}
              </button>
            );
          })}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <label className={BOX}>
          <span className={CAP}>დან</span>
          <input
            type="date"
            value={s.start}
            onChange={e => e.target.value && set({ start: e.target.value })}
            className={`${INNER} w-[6.75rem] px-1.5 font-medium tabular-nums [&::-webkit-calendar-picker-indicator]:hidden`}
          />
        </label>
        <span className={BOX}>
          <select
            aria-label="როდის სრულდება"
            value={ends}
            onChange={e => {
              const v = e.target.value;
              set(v === 'until' ? { until: later(30), count: undefined } : v === 'count' ? { count: 10, until: undefined } : { until: undefined, count: undefined });
            }}
            className={`${INNER} pl-2.5 pr-1 rounded-xl cursor-pointer`}
          >
            <option value="never">უვადოდ</option>
            <option value="until">თარიღამდე</option>
            <option value="count">ჯერამდე</option>
          </select>
        </span>
        {ends === 'until' && (
          <input
            type="date"
            aria-label="ბოლო დღე"
            min={s.start}
            value={s.until}
            onChange={e => e.target.value && set({ until: e.target.value })}
            className={`${BOX} ${INNER} w-[7.75rem] px-2.5 font-medium tabular-nums [&::-webkit-calendar-picker-indicator]:hidden`}
          />
        )}
        {ends === 'count' && (
          <label className={BOX}>
            <input
              key={s.count}
              type="number"
              inputMode="numeric"
              min={1}
              max={999}
              aria-label="რამდენჯერ"
              defaultValue={s.count ?? 10}
              onBlur={e => {
                const n = Math.max(1, Math.min(999, parseInt(e.target.value, 10) || 0));
                if (n && n !== s.count) set({ count: n });
              }}
              onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
              className={`${NUM} w-12`}
            />
            <span className="pr-3 text-[13px] font-semibold text-[#8a7a6a]">-ჯერ</span>
          </label>
        )}
      </div>
    </div>
  );
};

export const alertWord = (m: number) => (m === 0 ? 'დაწყებისას' : m === 60 ? '1 სთ ადრე' : `${m} წთ ადრე`);
const alertShort = (m: number) => (m === 0 ? 'დროზე' : m === 60 ? '1 სთ' : `${m} წთ`);

/** „დრო“ in one row: [from] – [to] and, once a time is set, its reminders (up to three, minutes before) as chips
 *  and a „🔔 +“ to add one — the first one asks the browser's leave to notify. ✕ takes the time (and reminders) away. */
export const TimeAlertsRow: React.FC<{
  time: HabitTime | undefined;
  alerts: number[];
  onTime: (t: HabitTime | null) => void;
  onAlerts: (alerts: number[]) => void;
}> = ({ time, alerts, onTime, onAlerts }) => {
  const [blocked, setBlocked] = useState(false);
  const add = async (m: number) => {
    onAlerts([...alerts, m]);
    const leave = await askNotificationPermission();
    setBlocked(leave === 'denied' || leave === 'unsupported');
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <div className="contents">
        <span className={BOX}>
          <Clock className="ml-2.5 w-4 h-4 shrink-0 text-[#a08a76]" aria-hidden />
          <input
            type="time"
            aria-label="დაწყება"
            value={time?.from ?? ''}
            onChange={e => onTime(e.target.value ? { from: e.target.value, to: time?.to } : null)}
            className={TIME}
          />
          <span className="text-[#a08a76]" aria-hidden>–</span>
          <input
            type="time"
            aria-label="დასრულება"
            disabled={!time}
            value={time?.to ?? ''}
            onChange={e => time && onTime({ from: time.from, to: e.target.value || undefined })}
            className={TIME}
          />
          {time && (
            <button
              type="button"
              aria-label="დროის მოხსნა"
              onClick={() => onTime(null)}
              className="w-9 h-9 mr-0.5 shrink-0 rounded-full flex items-center justify-center text-[#a08a76] hover:text-[#7a2028] hover:bg-[#7a2028]/[0.06] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </span>
        {time &&
          alerts.map(m => (
            <span key={m} title={alertWord(m)} className={`${BOX} pl-2.5 gap-1 text-[13px] font-semibold text-[#4a3426]`}>
              <Bell className="w-4 h-4 text-[#7a2028]" />
              {alertShort(m)}
              <button
                type="button"
                aria-label={`${alertWord(m)} — მოხსნა`}
                onClick={() => onAlerts(alerts.filter(x => x !== m))}
                className="w-9 h-9 mr-0.5 rounded-full flex items-center justify-center text-[#a08a76] hover:text-red-700 hover:bg-red-50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </span>
          ))}
        {time && alerts.length < MAX_ALERTS && (
          <select
            aria-label="შეხსენების დამატება"
            value=""
            onChange={e => e.target.value !== '' && void add(Number(e.target.value))}
            className={`${BOX} ${INNER} w-[4.5rem] px-2.5 !text-[#7a2028] cursor-pointer`}
          >
            <option value="">🔔 +</option>
            {ALERT_CHOICES.filter(m => !alerts.includes(m)).map(m => (
              <option key={m} value={m}>{alertWord(m)}</option>
            ))}
          </select>
        )}
        {blocked && <p className="basis-full text-[12px] font-semibold text-[#b4441c]">შეტყობინებები ამ ბრაუზერში დაბლოკილია — ჩართე საიტის პარამეტრებში.</p>}
      </div>
    </div>
  );
};
