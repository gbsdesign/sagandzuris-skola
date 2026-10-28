import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { Pill } from '../ui/kit';

/** A member's work timetable: `profile.workSchedule` = { 'ორშ': '09:00, 10:00', … } */
export type WorkSchedule = { [dayId: string]: string };

export const WORK_DAYS = [
  { id: 'ორშ', short: 'ორშ', full: 'ორშაბათი', jsDay: 1 },
  { id: 'სამ', short: 'სამ', full: 'სამშაბათი', jsDay: 2 },
  { id: 'ოთხ', short: 'ოთხ', full: 'ოთხშაბათი', jsDay: 3 },
  { id: 'ხუთ', short: 'ხუთ', full: 'ხუთშაბათი', jsDay: 4 },
  { id: 'პარ', short: 'პარ', full: 'პარასკევი', jsDay: 5 },
  { id: 'შაბ', short: 'შაბ', full: 'შაბათი', jsDay: 6 },
  { id: 'კვი', short: 'კვი', full: 'კვირა', jsDay: 0 },
];

// every hour from 06:00 to 23:00
export const WORK_HOURS = Array.from({ length: 18 }, (_, i) => `${String(i + 6).padStart(2, '0')}:00`);

export const hoursOf = (schedule: WorkSchedule | undefined, dayId: string): string[] => {
  const raw = schedule?.[dayId];
  if (!raw || typeof raw !== 'string') return [];
  return raw.split(',').map(s => s.trim()).filter(s => WORK_HOURS.includes(s));
};

/** The days as seven tiles (hours chosen under each), then the chosen day's hours to tick; used by the profile and,
 *  in place, by the path's work card. */
export const WorkScheduleEditor: React.FC<{ schedule: WorkSchedule | undefined; onChange: (next: WorkSchedule) => void }> = ({ schedule, onChange }) => {
  const [activeDay, setActiveDay] = useState<string>(() => WORK_DAYS.find(d => d.jsDay === new Date().getDay())?.id ?? 'ორშ');
  const day = WORK_DAYS.find(d => d.id === activeDay) || WORK_DAYS[0];
  const picked = hoursOf(schedule, activeDay);
  const valid = WORK_DAYS.filter(d => hoursOf(schedule, d.id).length > 0).length >= 2;

  const toggle = (hour: string) => {
    const next = picked.includes(hour) ? picked.filter(h => h !== hour) : [...picked, hour].sort((a, b) => parseInt(a) - parseInt(b));
    const out = { ...(schedule || {}) };
    if (next.length) out[activeDay] = next.join(', ');
    else delete out[activeDay];
    onChange(out);
  };

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-7 gap-1.5">
        {WORK_DAYS.map(d => {
          const count = hoursOf(schedule, d.id).length;
          const on = activeDay === d.id;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => setActiveDay(d.id)}
              aria-pressed={on}
              className={`h-12 rounded-xl flex flex-col items-center justify-center transition-colors cursor-pointer select-none active:scale-95 ${
                on
                  ? 'bg-[#7a2028] text-[#fbf6ec]'
                  : count > 0
                    ? 'bg-[#7a2028]/10 text-[#7a2028] hover:bg-[#7a2028]/15'
                    : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] hover:ring-[#7a2028]/40'
              }`}
            >
              <span className="text-xs font-bold leading-tight">{d.short}</span>
              <span className={`text-[11px] font-semibold leading-none mt-1 ${on ? 'text-[#fbf6ec]/80' : 'opacity-70'}`}>
                {count > 0 ? `${count} სთ` : '—'}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 min-h-7">
        <span className="text-sm font-bold text-[#4a3426]">{day.full}</span>
        {valid ? <Pill tone="green"><Check /> 2 დღე ან მეტი</Pill> : <Pill tone="muted">მინიმუმ 2 დღე</Pill>}
      </div>

      <div className="grid grid-cols-6 gap-1.5">
        {WORK_HOURS.map(hour => {
          const on = picked.includes(hour);
          return (
            <button
              key={hour}
              type="button"
              onClick={() => toggle(hour)}
              aria-pressed={on}
              className={`h-10 rounded-lg text-xs font-semibold tabular-nums transition-colors cursor-pointer select-none active:scale-95 ${
                on ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] hover:ring-[#7a2028]/40'
              }`}
            >
              {hour}
            </button>
          );
        })}
      </div>
    </div>
  );
};
