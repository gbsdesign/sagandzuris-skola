import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import { Rosette } from '../../components/home/PlateOrnaments';
import { FEAST_GROUPS, Feast, feastDates, feastUrl } from '../../data/library/feasts';
import { daysBetween, fromIso, oldDayMonthGe, openChurchCalendar, todayIso, weekdayGe } from '../../data/churchCalendar';
import { MONTHS_GE, MONTHS_SHORT_GE } from '../../utils/dateNames';
import { BookHead } from './BookHead';
import { MiniCover } from './Shelf';

// orthodoxy.ge's feast list with this year's dates worked out: fixed feasts from their date,
// movable ones from Easter. Tapping a date opens that day in the footer's calendar.


const inDays = (n: number) => (n === 0 ? 'დღეს' : n === 1 ? 'ხვალ' : `${n} დღეში`);

const DateTile: React.FC<{ iso: string; past: boolean; today: boolean }> = ({ iso, past, today }) => {
  const d = fromIso(iso);
  return (
    <span
      className={`w-11 shrink-0 rounded-xl flex flex-col items-center justify-center py-1 ring-1 transition-colors ${
        today ? 'bg-[#7a2028] ring-[#7a2028] text-[#fbf6ec]' : past ? 'bg-[#f4efe7] ring-[#ebe3d6] text-[#a39482]' : 'bg-[#f6ecda] ring-[#ead9bd] text-[#7a2028]'
      }`}
    >
      <span className="font-serif-ge text-[17px] font-bold leading-none tabular-nums">{d.getDate()}</span>
      <span className="mt-0.5 text-[10px] font-bold leading-none">{MONTHS_SHORT_GE[d.getMonth()]}</span>
    </span>
  );
};

const FeastRow: React.FC<{ feast: Feast; year: number; today: string }> = ({ feast, year, today }) => {
  const dates = feastDates(feast, year);
  const main = dates.find(d => d >= today) ?? dates[0];
  const past = dates.every(d => d < today);
  const url = feastUrl(feast);
  return (
    <li className={`flex items-stretch gap-0.5 ${past ? 'opacity-70' : ''}`}>
      <button
        type="button"
        onClick={() => { triggerHaptic(8); openChurchCalendar(main); }}
        className="group flex-1 min-w-0 flex items-center gap-2.5 rounded-xl px-1.5 py-1.5 text-left hover:bg-[#7a2028]/[0.04] cursor-pointer active:scale-[0.99] transition-all"
        title="კალენდარში ნახვა"
      >
        <DateTile iso={main} past={past} today={main === today} />
        <span className="flex-1 min-w-0">
          <span className="block font-serif-ge text-[14px] sm:text-[14.5px] leading-snug text-[#2a2017] group-hover:text-[#7a2028] transition-colors">{feast.name}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11.5px] leading-snug text-[#8a7a6a]">
            <span className="font-semibold text-[#4a3426]">{weekdayGe(main)}</span>
            {feast.fixed && !feast.fromEaster ? (
              <span>ძვ. სტ. {oldDayMonthGe(main)}</span>
            ) : (
              feast.rule && <span>{feast.rule}</span>
            )}
            {main >= today && <span className="font-bold text-[#7a2028]">· {inDays(daysBetween(today, main))}</span>}
          </span>
          {/* feasts kept twice a year (St Nino, Mtskheta, Queen Tamar): the other day too */}
          {dates.length > 1 && (
            <span className="mt-1 flex flex-wrap gap-1">
              {dates.filter(d => d !== main).map(d => (
                <span
                  key={d}
                  role="link"
                  tabIndex={0}
                  onClick={e => { e.stopPropagation(); triggerHaptic(8); openChurchCalendar(d); }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); openChurchCalendar(d); } }}
                  className={`inline-flex items-center h-5 px-1.5 rounded-full text-[10.5px] font-bold ring-1 cursor-pointer ${
                    d < today ? 'bg-[#f4efe7] ring-[#ebe3d6] text-[#a39482]' : 'bg-[#f6ecda] ring-[#ead9bd] text-[#7a2028]'
                  }`}
                >
                  ასევე {fromIso(d).getDate()} {MONTHS_GE[fromIso(d).getMonth()]}
                </span>
              ))}
            </span>
          )}
        </span>
      </button>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-10 shrink-0 rounded-xl flex items-center justify-center text-[#cdbba3] hover:text-[#7a2028] hover:bg-[#7a2028]/[0.04] transition-colors"
          title="ვრცლად"
          aria-label={`${feast.name} — ვრცლად`}
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
    </li>
  );
};

const STEP_BTN =
  'w-10 h-10 rounded-full text-[#7a2028] hover:bg-[#7a2028]/[0.06] flex items-center justify-center cursor-pointer active:scale-95 transition-all';

export const FeastsTab: React.FC = () => {
  const today = todayIso();
  const thisYear = fromIso(today).getFullYear();
  const [year, setYear] = useState(thisYear);

  // the nearest feast from today (into next year once this year's are over)
  const next = useMemo(() => {
    let best: { feast: Feast; iso: string } | null = null;
    for (const y of [thisYear, thisYear + 1])
      for (const g of FEAST_GROUPS)
        for (const f of g.feasts)
          for (const d of feastDates(f, y))
            if (d >= today && (!best || d < best.iso)) best = { feast: f, iso: d };
    return best;
  }, [today, thisYear]);

  const step = (n: number) => { triggerHaptic(8); setYear(y => y + n); };

  return (
    <div>
      <BookHead
        cover={<MiniCover id="feasts" className="w-11 h-[60px]" />}
        title="დღესასწაულები"
        sub="წლის დღესასწაულები და მათი თარიღები"
      />

      {next && (
        <button
          type="button"
          onClick={() => { triggerHaptic(8); openChurchCalendar(next.iso); }}
          className="group relative mt-4 w-full overflow-hidden flex items-center gap-3 min-h-16 text-left rounded-2xl bg-[#fffdf8] ring-1 ring-[#d2a04a]/40 hover:ring-[#7a2028]/30 shadow-[0_1px_2px_rgba(42,32,23,0.04),0_10px_24px_-20px_rgba(42,32,23,0.45)] pl-3 pr-3.5 py-3 cursor-pointer active:scale-[0.99] transition-all"
        >
          <Rosette color="#d2a04a" className="absolute -right-5 -bottom-7 w-24 h-24 opacity-[0.12]" />
          <span className="w-12 shrink-0 self-start rounded-xl bg-[#7a2028] text-[#fbf6ec] flex flex-col items-center justify-center py-1.5">
            <span className="font-serif-ge text-[20px] font-bold leading-none tabular-nums">{fromIso(next.iso).getDate()}</span>
            <span className="mt-0.5 text-[10.5px] font-bold leading-none text-[#f3d9a8]">{MONTHS_SHORT_GE[fromIso(next.iso).getMonth()]}</span>
          </span>
          <span className="relative flex-1 min-w-0">
            <span className="block text-[12px] font-bold text-[#9a7438]">უახლოესი დღესასწაული · {inDays(daysBetween(today, next.iso))}</span>
            <span className="mt-0.5 block font-serif-ge text-[15.5px] sm:text-[16.5px] leading-snug font-bold text-[#2a2017] text-pretty">{next.feast.name}</span>
            <span className="mt-0.5 block text-[12px] text-[#8a7a6a]">
              {weekdayGe(next.iso)} · ძვ. სტ. {oldDayMonthGe(next.iso)}
            </span>
          </span>
          <ChevronRight className="relative w-5 h-5 shrink-0 text-[#cdbba3] group-hover:text-[#7a2028] group-hover:translate-x-0.5 transition-all" />
        </button>
      )}

      {/* the year the dates are worked out for */}
      <div className="mt-5 flex items-center justify-between gap-3 pl-1">
        <p className="text-[12px] text-[#8a7a6a]">ახალი სტილით</p>
        <div className="flex items-center gap-1.5">
          {year !== thisYear && (
            <button type="button" onClick={() => { triggerHaptic(8); setYear(thisYear); }} className="h-10 px-3 rounded-full text-[12.5px] font-bold text-[#7a2028] hover:bg-[#7a2028]/[0.06] cursor-pointer">
              ← {thisYear}
            </button>
          )}
          <div className="inline-flex items-center h-11 rounded-full bg-white ring-1 ring-[#e8dcc8] p-0.5">
            <button type="button" onClick={() => step(-1)} className={STEP_BTN} aria-label="წინა წელი">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="min-w-[5.5rem] text-center font-serif-ge text-[14px] font-bold text-[#2a2017] tabular-nums">{year} წელი</span>
            <button type="button" onClick={() => step(1)} className={STEP_BTN} aria-label="შემდეგი წელი">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {FEAST_GROUPS.map((g, gi) => (
          <section key={gi} className="rounded-2xl bg-white ring-1 ring-[#2a2017]/[0.07] shadow-[0_1px_2px_rgba(42,32,23,0.05),0_10px_26px_-22px_rgba(42,32,23,0.35)] p-1.5 sm:p-2">
            <header className="flex flex-wrap items-center gap-x-2 gap-y-1 px-2 pt-1.5 pb-1">
              <h3 className="font-serif-ge text-[15px] sm:text-[16px] font-bold text-[#7a2028]">{g.title}</h3>
              {g.subtitle && (
                <span className="inline-flex items-center h-5 px-2 rounded-full bg-[#f6ecda] text-[10.5px] font-bold text-[#8a5a2a]">{g.subtitle}</span>
              )}
            </header>
            <ul className="[&>li+li]:border-t [&>li+li]:border-[#2a2017]/[0.05]">
              {g.feasts.map(f => <FeastRow key={f.name} feast={f} year={year} today={today} />)}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
};
