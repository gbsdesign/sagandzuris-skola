import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IconBtn } from '../ui/kit';

// Small pieces the habits' views share: the day's ring, a day's number in its ring, "‹ period ›" and the
// summary strip. One look everywhere: wine on warm paper, as the rest of the "გზა" page.

const WINE = '#7a2028';
const TRACK = '#e8dcc8';

/** The selected day as a ring: daily habits ticked of all. */
export const Ring: React.FC<{ value: number; max: number; caption: string; compact?: boolean }> = ({ value, max, caption, compact }) => {
  const r = 25;
  const length = 2 * Math.PI * r;
  return (
    <div className={`relative shrink-0 ${compact ? 'w-[52px] h-[52px]' : 'w-[60px] h-[60px]'}`} role="img" aria-label={`${caption} ${value} / ${max}`}>
      <svg viewBox="0 0 60 60" className="w-full h-full -rotate-90">
        <circle cx="30" cy="30" r={r} fill="none" stroke="#efe5d4" strokeWidth="6" />
        {value > 0 && (
          <circle
            cx="30"
            cy="30"
            r={r}
            fill="none"
            stroke={WINE}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={length}
            strokeDashoffset={length * (1 - Math.min(1, value / max))}
            className="transition-[stroke-dashoffset] duration-500"
          />
        )}
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className={`${compact ? 'text-[15px]' : 'text-[17px]'} font-black tabular-nums text-[#2a2017]`}>
          {value}
          <span className="text-[11px] font-bold text-[#a08a76]">/{max}</span>
        </span>
        <span className={`${compact ? 'mt-0.5' : 'mt-1'} text-[11px] font-bold text-[#8a7a6a]`}>{caption}</span>
      </span>
    </div>
  );
};

export type DotState = 'future' | 'none' | 'part' | 'counted' | 'all';

/** What a day looks like: nothing yet, some, counted (half of the daily habits), all — or still ahead. */
export const dotState = (share: number, counted: boolean, future: boolean): DotState =>
  future ? 'future' : share >= 1 ? 'all' : counted ? 'counted' : share > 0 ? 'part' : 'none';

/** A day's number in a ring that fills with its share of the daily habits; a day with all of them done is filled in. */
export const DayDot: React.FC<{ day: number; share: number; state: DotState; today?: boolean; size?: number }> = ({ day, share, state, today, size = 34 }) => {
  const r = size / 2 - 2;
  const length = 2 * Math.PI * r;
  const filled = state === 'all';
  return (
    <span className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90" aria-hidden>
        {filled ? (
          <circle cx={size / 2} cy={size / 2} r={size / 2} fill={WINE} />
        ) : (
          <>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={state === 'future' ? '#f1e9db' : TRACK} strokeWidth="2.5" />
            {share > 0 && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={WINE}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={length}
                strokeDashoffset={length * (1 - Math.min(1, share))}
                className="transition-[stroke-dashoffset] duration-500"
              />
            )}
          </>
        )}
      </svg>
      <span
        className={`relative text-[12.5px] tabular-nums leading-none ${
          filled
            ? 'font-black text-[#fbf6ec]'
            : state === 'counted'
              ? 'font-black text-[#7a2028]'
              : state === 'future'
                ? 'font-semibold text-[#cbbca6]'
                : today
                  ? 'font-black text-[#2a2017]'
                  : 'font-semibold text-[#6a5646]'
        }`}
      >
        {day}
      </span>
    </span>
  );
};

/** "‹ title ›": steps through weeks, months or years; a missing handler hides its arrow's action. */
export const PeriodNav: React.FC<{ title: string; sub?: string; onPrev?: () => void; onNext?: () => void }> = ({ title, sub, onPrev, onNext }) => (
  <div className="flex items-center gap-2">
    <IconBtn label="წინა" onClick={onPrev} disabled={!onPrev}>
      <ChevronLeft />
    </IconBtn>
    <div className="flex-1 min-w-0 text-center">
      <p className="font-serif-ge text-[16px] font-bold leading-tight text-[#2a2017]">{title}</p>
      {sub && <p className="mt-0.5 text-[12px] font-semibold text-[#8a7a6a]">{sub}</p>}
    </div>
    <IconBtn label="შემდეგი" onClick={onNext} disabled={!onNext}>
      <ChevronRight />
    </IconBtn>
  </div>
);

/** A row of two or three numbers with their captions, on the same warm panel as the day's card. */
export const Summary: React.FC<{ items: { value: React.ReactNode; label: string; strong?: boolean }[] }> = ({ items }) => (
  <div className="grid rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] divide-x divide-[#e8dcc8]" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
    {items.map((it, i) => (
      <div key={i} className="min-w-0 px-2 py-2.5 text-center">
        <p className={`text-[18px] font-black tabular-nums leading-tight ${it.strong ? 'text-[#7a2028]' : 'text-[#2a2017]'}`}>{it.value}</p>
        <p className="mt-0.5 text-[11.5px] font-semibold leading-tight text-[#8a7a6a]">{it.label}</p>
      </div>
    ))}
  </div>
);

/** The small serif heading over a part of a view: "ყოველდღე", "ბოლო 12 კვირა". */
export const ViewHeading: React.FC<{ children: React.ReactNode; right?: React.ReactNode }> = ({ children, right }) => (
  <div className="flex items-center gap-2 px-1 pb-1.5 min-h-8">
    <h4 className="flex-1 min-w-0 font-serif-ge text-[15px] font-bold text-[#7a2028]">{children}</h4>
    {right}
  </div>
);
