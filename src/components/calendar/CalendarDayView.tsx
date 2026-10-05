import React from 'react';
import { Loader2 } from 'lucide-react';
import {
  CalendarDay, CalPara, RUN_BOLD, RUN_RED, RUN_SMALL,
  dayMonthGe, oldDayMonthGe, weekdayGe, todayIso,
} from '../../data/churchCalendar';

// One day of orthodoxy.ge's calendar as the site shows it: the band with both dates and the day's
// name, then the commemorations, readings and notes with the source's red, bold and small print.

const isSmallPara = (p: CalPara) => {
  let small = 0, all = 0;
  for (const [t, f = 0] of p) {
    const n = t.replace(/\s/g, '').length;
    all += n;
    if (f & RUN_SMALL) small += n;
  }
  return all > 0 && small / all > 0.5;
};

const Runs: React.FC<{ para: CalPara }> = ({ para }) => (
  <>
    {para.map(([text, f = 0], i) => {
      const lines = text.split('\n');
      const cls = `${f & RUN_BOLD ? 'font-bold' : ''} ${f & RUN_RED ? 'text-[#8a1f29]' : ''}`.trim();
      const body = lines.map((l, j) => (
        <React.Fragment key={j}>
          {j > 0 && <br />}
          {l}
        </React.Fragment>
      ));
      return cls ? <span key={i} className={cls}>{body}</span> : <React.Fragment key={i}>{body}</React.Fragment>;
    })}
  </>
);

export const CalendarDayView: React.FC<{ iso: string; day: CalendarDay | null | undefined }> = ({ iso, day }) => {
  const isToday = iso === todayIso();
  return (
    <article className="text-left">
      {/* the band: old style · the day · new style */}
      <header className="grid grid-cols-2 sm:grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 rounded-xl bg-[#f6ecda] ring-1 ring-[#e8dcc8] px-3 py-2 sm:px-3.5">
        <div className="min-w-0 whitespace-nowrap">
          <p className="font-serif-ge text-[14px] sm:text-[15px] font-bold text-[#7a2028] leading-tight">{oldDayMonthGe(iso)}</p>
          <p className="text-[10.5px] font-semibold text-[#8a6a52]">ძველი სტილით</p>
        </div>
        <div className="col-span-2 sm:col-span-1 order-last sm:order-none text-center min-w-0">
          {day === undefined ? (
            <span className="inline-block h-4 w-40 max-w-full rounded bg-[#e8dcc8]/70 animate-pulse" />
          ) : (
            <p className="font-serif-ge text-[14px] sm:text-[15px] font-bold text-[#7a2028] leading-snug text-balance">
              {day?.t || weekdayGe(iso)}
            </p>
          )}
        </div>
        <div className="min-w-0 text-right whitespace-nowrap">
          <p className="font-serif-ge text-[14px] sm:text-[15px] font-bold text-[#7a2028] leading-tight">{dayMonthGe(iso)}</p>
          <p className="text-[10.5px] font-semibold text-[#8a6a52]">
            {isToday && <span className="mr-1 inline-block px-1.5 rounded-full bg-[#7a2028] text-[#fbf6ec] text-[10px] font-bold leading-[15px]">დღეს</span>}
            ახალი სტილით
          </p>
        </div>
      </header>

      {day === undefined && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-[#8a7a6a]">
          <Loader2 className="w-4 h-4 animate-spin" /> იტვირთება…
        </div>
      )}

      {day === null && (
        <div className="py-6 px-2 text-center">
          <p className="font-serif-ge text-[14px] text-[#4a3426]">ამ დღის კალენდარი ჯერ არ დამატებულა.</p>
        </div>
      )}

      {day && (
        <div className="px-1 sm:px-1.5 pt-3 font-serif-ge text-[#2a2017]">
          {day.p.map((p, i) => {
            if (!p.length) return null;
            const afterGap = i > 0 && !day.p[i - 1].length;
            const small = isSmallPara(p);
            return (
              <p
                key={i}
                className={`${i === 0 ? '' : afterGap ? 'mt-4' : 'mt-2'} ${
                  small ? 'text-[12.5px] sm:text-[13px] leading-relaxed text-[#4a3426]' : 'text-[14.5px] sm:text-[15px] leading-[1.7]'
                }`}
              >
                <Runs para={p} />
              </p>
            );
          })}
        </div>
      )}
    </article>
  );
};
