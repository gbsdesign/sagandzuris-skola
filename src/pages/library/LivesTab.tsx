import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Search, X } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import { VineLeaf } from '../../components/home/PlateOrnaments';
import { LifeThumb } from '../../components/saints/LifeThumb';
import { dayMonthGe, daysInMonth, fromOldStyle, oldStyleOf, todayIso } from '../../data/churchCalendar';
import { LifeEntry, lifeNewIso, lifeOldDay, openSaintLife, splitTitle, useLivesIndex } from '../../data/saintLives';
import { MONTHS_GE, MONTHS_SHORT_GE } from '../../utils/dateNames';

// "წმიდანთა ცხოვრება" from orthodoxy.ge: by the month (old style, as the menaion reads them), the Georgian
// saints, the Theotokos' life in chapters and the movable days; or a search. A life opens over the page.

const VIEWS = [
  { id: 'months', label: 'თვეების მიხედვით' },
  { id: 'georgian', label: 'ქართველი წმიდანები' },
  { id: 'theotokos', label: 'ღვთისმშობლის ცხოვრება' },
  { id: 'movable', label: 'გარდამავალი' },
] as const;
type ViewId = typeof VIEWS[number]['id'];

const VIEW_KEY = 'libraryLivesView';

// searching: one spelling for წმიდა/წმინდა, ღვთის/ღმრთის, and no punctuation
const norm = (s: string) =>
  s.replace(/წმინდ/g, 'წმიდ').replace(/ღმრთ/g, 'ღვთ').replace(/[^ა-ჰ0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

const open = (l: LifeEntry) => { triggerHaptic(8); openSaintLife(l.id); };

const LifeRow: React.FC<{ life: LifeEntry; sub?: string }> = ({ life, sub }) => {
  const { name, note } = splitTitle(life.t);
  return (
    <li>
      <button
        type="button"
        onClick={() => open(life)}
        className="group w-full flex items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-[#7a2028]/[0.04] cursor-pointer active:scale-[0.99] transition-all"
      >
        <LifeThumb life={life} />
        <span className="flex-1 min-w-0">
          <span className="block font-serif-ge text-[14px] sm:text-[14.5px] leading-snug text-[#2a2017] group-hover:text-[#7a2028] transition-colors">
            {name}
            {note && <span className="font-sans text-[11.5px] text-[#8a7a6a]"> ({note})</span>}
          </span>
          {sub && <span className="mt-0.5 block text-[11.5px] font-semibold text-[#8a6a52]">{sub}</span>}
        </span>
        <ChevronRight className="w-4 h-4 shrink-0 text-[#cdbba3] group-hover:text-[#7a2028] transition-colors" />
      </button>
    </li>
  );
};

const CARD = 'rounded-2xl bg-white ring-1 ring-[#2a2017]/[0.07] shadow-[0_1px_2px_rgba(42,32,23,0.05),0_10px_26px_-22px_rgba(42,32,23,0.35)] p-1.5 sm:p-2';
const ROWS = '[&>li+li]:border-t [&>li+li]:border-[#2a2017]/[0.05]';

/** "23 სექტემბერი ძვ. სტ. · 6 ოქტომბერი" under a search result */
const whenOf = (l: LifeEntry) => {
  const iso = lifeNewIso(l);
  return l.m ? `${lifeOldDay(l)} ძვ. სტ.${iso ? ` · ${dayMonthGe(iso)}` : ''}` : l.h || '';
};

// one day of a month: its old-style date, this year's new-style date, its lives
const DayGroup: React.FC<{ month: number; day: number; lives: LifeEntry[]; today: boolean }> = ({ month, day, lives, today }) => {
  const iso = fromOldStyle(oldStyleOf(todayIso()).year, month, Math.min(day, daysInMonth(oldStyleOf(todayIso()).year, month, true)));
  return (
    <section className={`${CARD} ${today ? 'ring-[#7a2028]/30' : ''}`}>
      <header className="flex items-center gap-2.5 px-2 pt-1.5 pb-1">
        <span className={`w-11 shrink-0 rounded-xl flex flex-col items-center justify-center py-1 ring-1 ${
          today ? 'bg-[#7a2028] ring-[#7a2028] text-[#fbf6ec]' : 'bg-[#f6ecda] ring-[#ead9bd] text-[#7a2028]'
        }`}>
          <span className="font-serif-ge text-[17px] font-bold leading-none tabular-nums">{day}</span>
          <span className="mt-0.5 text-[10px] font-bold leading-none">{MONTHS_SHORT_GE[month - 1]}</span>
        </span>
        <span className="min-w-0">
          <span className="block font-serif-ge text-[14.5px] font-bold text-[#7a2028] leading-tight">
            {day} {MONTHS_GE[month - 1]}
            {today && <span className="ml-1.5 inline-block align-middle px-1.5 rounded-full bg-[#7a2028] text-[#fbf6ec] text-[10px] font-bold leading-[16px] font-sans">დღეს</span>}
          </span>
          <span className="block text-[11.5px] font-semibold text-[#8a6a52]">ახალი სტილით {dayMonthGe(iso)}</span>
        </span>
      </header>
      <ul className={ROWS}>{lives.map(l => <LifeRow key={l.id} life={l} />)}</ul>
    </section>
  );
};

const STEP_BTN =
  'w-9 h-9 rounded-full text-[#7a2028] hover:bg-[#7a2028]/[0.06] flex items-center justify-center cursor-pointer active:scale-95 transition-all';

export const LivesTab: React.FC = () => {
  const { lives, failed } = useLivesIndex();
  const old = oldStyleOf(todayIso());
  const [view, setView] = useState<ViewId>(() => {
    try {
      const v = localStorage.getItem(VIEW_KEY);
      return (VIEWS.some(x => x.id === v) ? v : 'months') as ViewId;
    } catch { return 'months'; }
  });
  const [month, setMonth] = useState(old.month);
  const [query, setQuery] = useState('');

  const listed = useMemo(() => (lives || []).filter(l => !l.x), [lives]);
  const todays = useMemo(() => listed.filter(l => l.m === old.month && l.d === old.day), [listed, old.month, old.day]);

  const pick = (v: ViewId) => {
    triggerHaptic(8);
    setView(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* ignore */ }
  };
  const step = (n: number) => { triggerHaptic(8); setMonth(m => ((m - 1 + n + 12) % 12) + 1); };

  const found = useMemo(() => {
    const q = norm(query);
    if (!q) return null;
    const words = q.split(' ');
    return listed.filter(l => { const t = norm(l.t); return words.every(w => t.includes(w)); }).slice(0, 120);
  }, [listed, query]);

  if (failed) return <p className="py-12 text-center text-sm text-[#8a7a6a]">სია ვერ ჩაიტვირთა. სცადეთ თავიდან.</p>;
  if (!lives) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#8a7a6a]">
        <Loader2 className="w-4 h-4 animate-spin" /> იტვირთება…
      </div>
    );
  }

  const byDay = (list: LifeEntry[]) => {
    const days = new Map<number, LifeEntry[]>();
    for (const l of list) {
      if (!days.has(l.d!)) days.set(l.d!, []);
      days.get(l.d!)!.push(l);
    }
    return [...days];
  };

  return (
    <div>
      {/* search */}
      <label className="relative block">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#b3a594] pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="წმიდანის სახელი…"
          className="w-full h-11 pl-10 pr-10 rounded-full bg-white ring-1 ring-[#e8dcc8] focus:ring-2 focus:ring-[#7a2028]/30 outline-none font-serif-ge text-[15px] text-[#2a2017] placeholder:text-[#b3a594] [&::-webkit-search-cancel-button]:hidden"
          aria-label="წმიდანის ძებნა"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full text-[#8a7a6a] hover:text-[#7a2028] hover:bg-[#7a2028]/[0.06] flex items-center justify-center cursor-pointer"
            aria-label="გასუფთავება"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </label>

      {found ? (
        <div className="mt-3">
          <p className="pl-1 text-[12px] font-semibold text-[#8a7a6a]">
            {found.length ? `ნაპოვნია ${found.length === 120 ? '120+' : found.length}` : 'ვერაფერი მოიძებნა'}
          </p>
          {found.length > 0 && (
            <ul className={`mt-2 ${CARD} ${ROWS}`}>
              {found.map(l => <LifeRow key={l.id} life={l} sub={whenOf(l)} />)}
            </ul>
          )}
        </div>
      ) : (
        <>
          {/* what to show */}
          {/* two by two on a phone, one row from sm up */}
          <div className="mt-3 grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap" role="tablist" aria-label="წმიდანთა ცხოვრება">
            {VIEWS.map(v => (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={view === v.id}
                onClick={() => pick(v.id)}
                className={`min-h-9 py-1.5 px-3 sm:px-3.5 rounded-full text-[12.5px] leading-tight text-center font-bold cursor-pointer select-none active:scale-[0.97] transition-all ${
                  view === v.id
                    ? 'bg-[#7a2028] text-[#fbf6ec] shadow-[0_6px_14px_-8px_rgba(122,32,40,0.7)]'
                    : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] hover:text-[#7a2028] hover:ring-[#7a2028]/30'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {view === 'months' && (
            <>
              {/* today */}
              {todays.length > 0 && (
                <section className="relative mt-3 overflow-hidden rounded-2xl bg-gradient-to-br from-[#7a2028] via-[#6b1a22] to-[#4a1218] text-[#fbf6ec] p-3 sm:p-3.5 shadow-[0_14px_30px_-20px_rgba(74,18,24,0.9)]">
                  <VineLeaf color="#fbf6ec" className="absolute -right-6 -top-7 w-28 h-28 opacity-[0.07] rotate-12" />
                  <p className="relative pl-1 text-[11px] font-bold text-[#f3d9a8]">
                    დღეს იხსენიებიან · {old.day} {MONTHS_GE[old.month - 1]} ძვ. სტ.
                  </p>
                  <ul className="relative mt-1.5 space-y-0.5">
                    {todays.map(l => {
                      const { name } = splitTitle(l.t);
                      return (
                        <li key={l.id}>
                          <button
                            type="button"
                            onClick={() => open(l)}
                            className="group w-full flex items-center gap-2.5 rounded-xl px-1 py-1.5 text-left hover:bg-[#fbf6ec]/[0.07] cursor-pointer active:scale-[0.99] transition-all"
                          >
                            <LifeThumb life={l} className="w-8 h-10 ring-[#fbf6ec]/25" />
                            <span className="flex-1 min-w-0 font-serif-ge text-[14px] sm:text-[15px] leading-snug font-semibold">{name}</span>
                            <ChevronRight className="w-4 h-4 shrink-0 text-[#fbf6ec]/50 group-hover:text-[#fbf6ec] group-hover:translate-x-0.5 transition-all" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {/* the month */}
              <div className="mt-3 flex items-center justify-between gap-3 pl-1">
                <p className="text-[12px] text-[#8a7a6a]">ძველი სტილით, როგორც თვენში</p>
                <div className="inline-flex items-center h-10 rounded-full bg-white ring-1 ring-[#e8dcc8] p-0.5">
                  <button type="button" onClick={() => step(-1)} className={STEP_BTN} aria-label="წინა თვე">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="min-w-[6.5rem] text-center font-serif-ge text-[14px] font-bold text-[#2a2017]">{MONTHS_GE[month - 1]}</span>
                  <button type="button" onClick={() => step(1)} className={STEP_BTN} aria-label="შემდეგი თვე">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3 space-y-3">
                {byDay(listed.filter(l => l.m === month)).map(([d, ls]) => (
                  <DayGroup key={d} month={month} day={d} lives={ls} today={month === old.month && d === old.day} />
                ))}
              </div>
            </>
          )}

          {view === 'georgian' && (
            <div className="mt-3 space-y-3">
              {MONTHS_GE.map((name, mi) => {
                const ls = listed.filter(l => l.g && l.m === mi + 1);
                if (!ls.length) return null;
                return (
                  <section key={mi} className={CARD}>
                    <h3 className="px-2 pt-1.5 pb-1 font-serif-ge text-[15px] sm:text-[16px] font-bold text-[#7a2028]">{name}</h3>
                    <ul className={ROWS}>{ls.map(l => <LifeRow key={l.id} life={l} sub={whenOf(l)} />)}</ul>
                  </section>
                );
              })}
            </div>
          )}

          {view === 'theotokos' && (
            <ul className={`mt-3 ${CARD} ${ROWS}`}>
              {listed
                .filter(l => l.id.startsWith('gvtismshobeli/'))
                .sort((a, b) => (parseInt(a.id.split('/')[1], 10) || 99) - (parseInt(b.id.split('/')[1], 10) || 99))
                .map(l => <LifeRow key={l.id} life={l} />)}
            </ul>
          )}

          {view === 'movable' && (
            <ul className={`mt-3 ${CARD} ${ROWS}`}>
              {listed.filter(l => l.id.startsWith('gardamavali/')).map(l => <LifeRow key={l.id} life={l} sub={l.h} />)}
            </ul>
          )}
        </>
      )}
    </div>
  );
};
