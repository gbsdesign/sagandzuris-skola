import React from 'react';

// The last 7 days as a strip of day cells. Days done one after another join into a single bar —
// the streak — so a broken chain is visible at a glance. Used by the habits and the independent work.

export type DayMark = 'done' | 'partial' | 'missed' | 'open' | 'rest';

export interface StreakDay {
  date: Date;
  mark: DayMark;
  /** what the day's tooltip adds after the date, e.g. "შესრულდა" */
  note?: string;
}

const DAY_SHORT = ['კვ', 'ორ', 'სა', 'ოთ', 'ხუ', 'პა', 'შა'];
const DAY_NAMES = ['კვირა', 'ორშაბათი', 'სამშაბათი', 'ოთხშაბათი', 'ხუთშაბათი', 'პარასკევი', 'შაბათი'];
const MONTHS_SHORT = ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'];

const TONE: Record<DayMark, string> = {
  done: 'bg-gradient-to-b from-[#8c2a32] to-[#6e1b23] text-[#fbf6ec] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]',
  partial: 'bg-[#7a2028]/25 text-[#7a2028]',
  missed: 'bg-[#fbeeee] text-[#c0545a] ring-1 ring-inset ring-[#efc9c6]',
  open: 'bg-[#f3ebdd] text-[#a89782]',
  rest: 'border border-dashed border-[#e3d6c2] text-[#cbbca6]',
};

const percentTone = (p: number) => (p >= 100 ? 'text-emerald-600' : p >= 50 ? 'text-[#7a2028]' : 'text-[#a08a76]');

export const WeekStreak: React.FC<{
  days: StreakDay[];
  /** shown at the strip's right end; left out when there is nothing to measure */
  percent?: number | null;
  percentTitle?: string;
  className?: string;
}> = ({ days, percent, percentTitle, className = '' }) => {
  const todayKey = new Date().toDateString();
  const run = days.reduce((n, d) => (d.mark === 'done' ? n + 1 : 0), 0);
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        role="img"
        aria-label={`ბოლო 7 დღე: ${days.filter(d => d.mark === 'done').length} შესრულებული${run > 1 ? `, ზედიზედ ${run}` : ''}`}
        className="flex-1 min-w-0 max-w-[17rem] grid grid-cols-7"
      >
        {days.map((d, i) => {
          const joinPrev = d.mark === 'done' && days[i - 1]?.mark === 'done';
          const joinNext = d.mark === 'done' && days[i + 1]?.mark === 'done';
          const today = d.date.toDateString() === todayKey;
          return (
            <div
              key={i}
              className="relative h-[22px]"
              title={`${DAY_NAMES[d.date.getDay()]}, ${d.date.getDate()} ${MONTHS_SHORT[d.date.getMonth()]}${today ? ' (დღეს)' : ''}${d.note ? ` — ${d.note}` : ''}`}
            >
              <span
                className={`absolute inset-y-0 flex items-center justify-center text-[10px] font-bold leading-none select-none transition-colors ${TONE[d.mark]} ${
                  joinPrev ? 'left-0 rounded-l-none' : 'left-[2px] rounded-l-md'
                } ${joinNext ? 'right-0 rounded-r-none' : 'right-[2px] rounded-r-md'} ${
                  today && d.mark !== 'done' ? 'ring-[1.5px] ring-inset ring-[#7a2028]/45 !text-[#7a2028]' : ''
                }`}
              >
                {DAY_SHORT[d.date.getDay()]}
              </span>
            </div>
          );
        })}
      </div>
      {percent != null && (
        <span title={percentTitle} className={`ml-auto w-10 shrink-0 text-right text-[13px] font-black tabular-nums leading-none ${percentTone(percent)}`}>
          {percent}
          <span className="text-[10px] font-bold">%</span>
        </span>
      )}
    </div>
  );
};
