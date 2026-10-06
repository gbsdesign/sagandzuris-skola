import React from 'react';
import { MONTHS_SHORT_GE, WEEKDAYS_GE, WEEKDAYS_SHORT_GE } from '../../utils/dateNames';

// The last 7 days as a strip of day cells. Days done one after another join into a single bar —
// the streak — so a broken chain is visible at a glance. Used by the habits and the independent work.

export type DayMark = 'done' | 'partial' | 'missed' | 'open' | 'rest';

export interface StreakDay {
  date: Date;
  mark: DayMark;
  /** what the day's tooltip adds after the date, e.g. "შესრულდა" */
  note?: string;
}


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
  /** a small strip of 7 dots without the day letters (the habits' compact rows) */
  dots?: boolean;
  className?: string;
}> = ({ days, percent, percentTitle, dots, className = '' }) => {
  const todayKey = new Date().toDateString();
  const run = days.reduce((n, d) => (d.mark === 'done' ? n + 1 : 0), 0);
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        role="img"
        aria-label={`ბოლო 7 დღე: ${days.filter(d => d.mark === 'done').length} შესრულებული${run > 1 ? `, ზედიზედ ${run}` : ''}`}
        className={dots ? 'w-[98px] shrink-0 grid grid-cols-7' : 'flex-1 min-w-0 max-w-[17rem] grid grid-cols-7'}
      >
        {days.map((d, i) => {
          const joinPrev = d.mark === 'done' && days[i - 1]?.mark === 'done';
          const joinNext = d.mark === 'done' && days[i + 1]?.mark === 'done';
          const today = d.date.toDateString() === todayKey;
          return (
            <div
              key={i}
              className={dots ? 'relative h-2.5' : 'relative h-[22px]'}
              title={`${WEEKDAYS_GE[d.date.getDay()]}, ${d.date.getDate()} ${MONTHS_SHORT_GE[d.date.getMonth()]}${today ? ' (დღეს)' : ''}${d.note ? ` — ${d.note}` : ''}`}
            >
              <span
                className={`absolute inset-y-0 flex items-center justify-center text-[10px] font-bold leading-none select-none transition-colors ${
                  dots && d.mark === 'open' ? 'bg-[#ebe0ce]' : TONE[d.mark]
                } ${joinPrev ? 'left-0 rounded-l-none' : `left-[2px] ${dots ? 'rounded-l-full' : 'rounded-l-md'}`} ${
                  joinNext ? 'right-0 rounded-r-none' : `right-[2px] ${dots ? 'rounded-r-full' : 'rounded-r-md'}`
                } ${today && d.mark !== 'done' ? 'ring-[1.5px] ring-inset ring-[#7a2028]/45 !text-[#7a2028]' : ''}`}
              >
                {!dots && WEEKDAYS_SHORT_GE[d.date.getDay()]}
              </span>
            </div>
          );
        })}
      </div>
      {percent != null && (
        <span
          title={percentTitle}
          className={`shrink-0 text-right font-black tabular-nums leading-none ${dots ? 'w-9 text-xs' : 'ml-auto w-10 text-[13px]'} ${percentTone(percent)}`}
        >
          {percent}
          <span className="text-[10px] font-bold">%</span>
        </span>
      )}
    </div>
  );
};
