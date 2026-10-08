import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Search, X } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import { LifeThumb } from '../../components/saints/LifeThumb';
import { dayMonthGe, daysInMonth, fromOldStyle, oldStyleOf, todayIso } from '../../data/churchCalendar';
import { LifeEntry, lifeNewIso, lifeOldDay, openSaintLife, splitTitle, useLivesIndex } from '../../data/saintLives';
import { MONTHS_GE, MONTHS_SHORT_GE } from '../../utils/dateNames';
import { BookHead, BookNav, SectionTitle, ToContents } from './BookHead';
import { MiniCover } from './Shelf';

// "წმიდანთა ცხოვრება" from orthodoxy.ge, read like a menaion: the contents (today's saints, the twelve
// months in old style, the Georgian saints, the Theotokos' life in chapters, the movable days), each part
// a step of its own ("lives:m9", "lives:georgian"…); the search hides behind 🔍. A life opens over the page.

const PARTS = [
  { id: 'georgian', label: 'ქართველი წმიდანები' },
  { id: 'theotokos', label: 'ღვთისმშობლის ცხოვრება' },
  { id: 'movable', label: 'გარდამავალი დღესასწაულები' },
] as const;

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
        className="group w-full flex items-center gap-3 min-h-12 rounded-xl px-2 py-2 text-left hover:bg-[#7a2028]/[0.04] cursor-pointer active:scale-[0.99] transition-all"
      >
        <LifeThumb life={life} />
        <span className="flex-1 min-w-0">
          <span className="block font-serif-ge text-[14.5px] leading-snug text-[#2a2017] group-hover:text-[#7a2028] transition-colors">
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
  const year = oldStyleOf(todayIso()).year;
  const iso = fromOldStyle(year, month, Math.min(day, daysInMonth(year, month, true)));
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
  'w-10 h-10 rounded-full text-[#7a2028] hover:bg-[#7a2028]/[0.06] flex items-center justify-center cursor-pointer active:scale-95 transition-all';

const byDay = (list: LifeEntry[]) => {
  const days = new Map<number, LifeEntry[]>();
  for (const l of list) {
    if (!days.has(l.d!)) days.set(l.d!, []);
    days.get(l.d!)!.push(l);
  }
  return [...days];
};

export const LivesTab: React.FC<{ nav: BookNav }> = ({ nav }) => {
  const { lives, failed } = useLivesIndex();
  const old = oldStyleOf(todayIso());
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');

  const listed = useMemo(() => (lives || []).filter(l => !l.x), [lives]);
  const todays = useMemo(() => listed.filter(l => l.m === old.month && l.d === old.day), [listed, old.month, old.day]);
  const perMonth = useMemo(() => {
    const n = Array(12).fill(0) as number[];
    for (const l of listed) if (l.m) n[l.m - 1]++;
    return n;
  }, [listed]);
  const georgian = useMemo(() => listed.filter(l => l.g), [listed]);
  const theotokos = useMemo(
    () => listed
      .filter(l => l.id.startsWith('gvtismshobeli/'))
      .sort((a, b) => (parseInt(a.id.split('/')[1], 10) || 99) - (parseInt(b.id.split('/')[1], 10) || 99)),
    [listed],
  );
  const movable = useMemo(() => listed.filter(l => l.id.startsWith('gardamavali/')), [listed]);

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

  const part = nav.part;
  const month = part?.startsWith('m') ? Number(part.slice(1)) : 0;

  // a month, as the menaion has it; the arrows turn its pages in place
  if (month >= 1 && month <= 12) {
    const step = (n: number) => { triggerHaptic(8); nav.go(`m${((month - 1 + n + 12) % 12) + 1}`, true); };
    return (
      <div>
        <div className="flex items-center justify-between gap-3">
          <ToContents onClick={nav.up} />
          <div className="inline-flex items-center h-11 rounded-full bg-white ring-1 ring-[#e8dcc8] p-0.5">
            <button type="button" onClick={() => step(-1)} className={STEP_BTN} aria-label="წინა თვე">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="min-w-[6.5rem] text-center font-serif-ge text-[15px] font-bold text-[#2a2017]">{MONTHS_GE[month - 1]}</span>
            <button type="button" onClick={() => step(1)} className={STEP_BTN} aria-label="შემდეგი თვე">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p className="mt-3 pl-1 text-[12px] text-[#8a7a6a]">თარიღები ძველი სტილით, როგორც თვენში; ქვემოთ — ახალი სტილით</p>
        <div className="mt-2.5 space-y-3">
          {byDay(listed.filter(l => l.m === month)).map(([d, ls]) => (
            <DayGroup key={d} month={month} day={d} lives={ls} today={month === old.month && d === old.day} />
          ))}
        </div>
      </div>
    );
  }

  const partInfo = PARTS.find(p => p.id === part);
  if (partInfo) {
    return (
      <div>
        <ToContents onClick={nav.up} />
        <h2 className="mt-4 px-1 font-serif-ge text-[19px] font-bold text-[#2a2017]">{partInfo.label}</h2>
        {part === 'georgian' ? (
          <div className="mt-3 space-y-3">
            {MONTHS_GE.map((name, mi) => {
              const ls = georgian.filter(l => l.m === mi + 1);
              if (!ls.length) return null;
              return (
                <section key={mi} className={CARD}>
                  <h3 className="px-2 pt-1.5 pb-1 font-serif-ge text-[15px] sm:text-[16px] font-bold text-[#7a2028]">{name}</h3>
                  <ul className={ROWS}>{ls.map(l => <LifeRow key={l.id} life={l} sub={whenOf(l)} />)}</ul>
                </section>
              );
            })}
          </div>
        ) : (
          <ul className={`mt-3 ${CARD} ${ROWS}`}>
            {(part === 'theotokos' ? theotokos : movable).map(l => <LifeRow key={l.id} life={l} sub={part === 'movable' ? l.h : undefined} />)}
          </ul>
        )}
      </div>
    );
  }

  // the contents
  const closeSearch = () => { setQuery(''); setSearching(false); };
  return (
    <div>
      <BookHead
        cover={<MiniCover id="lives" className="w-11 h-[60px]" />}
        title="წმიდანთა ცხოვრება"
        sub={<>{listed.length} ცხოვრება · თვენის რიგით</>}
        action={
          <button
            type="button"
            onClick={() => { triggerHaptic(8); if (searching) closeSearch(); else setSearching(true); }}
            className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center ring-1 cursor-pointer active:scale-95 transition-all ${
              searching ? 'bg-[#7a2028] ring-[#7a2028] text-[#fbf6ec]' : 'bg-white ring-[#e8dcc8] text-[#7a2028] hover:ring-[#7a2028]/35'
            }`}
            aria-label={searching ? 'ძებნის დახურვა' : 'წმიდანის ძებნა'}
            aria-expanded={searching}
          >
            {searching ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
          </button>
        }
      />

      {searching && (
        <label className="relative mt-4 block animate-[galoba-unfold_0.2s_ease_both]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#b3a594] pointer-events-none" />
          <input
            type="search"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') closeSearch(); }}
            placeholder="წმიდანის სახელი…"
            className="w-full h-12 pl-10 pr-4 rounded-full bg-white ring-1 ring-[#e8dcc8] focus:ring-2 focus:ring-[#7a2028]/30 outline-none font-serif-ge text-[16px] text-[#2a2017] placeholder:text-[#b3a594] [&::-webkit-search-cancel-button]:hidden"
            aria-label="წმიდანის ძებნა"
          />
        </label>
      )}

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
          {/* today */}
          {todays.length > 0 && (
            <section className="mt-4 rounded-2xl bg-[#fffdf8] ring-1 ring-[#d2a04a]/40 shadow-[0_1px_2px_rgba(42,32,23,0.04),0_10px_24px_-20px_rgba(42,32,23,0.45)] p-1.5 sm:p-2">
              <p className="px-2 pt-1.5 pb-1 flex flex-wrap items-baseline gap-x-2">
                <span className="font-serif-ge text-[15px] font-bold text-[#7a2028]">დღეს იხსენიებიან</span>
                <span className="text-[12px] font-semibold text-[#8a6a52]">{old.day} {MONTHS_GE[old.month - 1]} ძვ. სტ.</span>
              </p>
              <ul className={ROWS}>{todays.map(l => <LifeRow key={l.id} life={l} />)}</ul>
            </section>
          )}

          {/* the twelve months */}
          <SectionTitle className="mt-6">თვეები</SectionTitle>
          <div className="mt-2.5 grid grid-cols-3 sm:grid-cols-4 gap-2">
            {MONTHS_GE.map((name, mi) => {
              const now = mi + 1 === old.month;
              return (
                <button
                  key={mi}
                  type="button"
                  onClick={() => nav.go(`m${mi + 1}`)}
                  className={`min-h-[60px] rounded-2xl px-2 py-2 text-center cursor-pointer active:scale-[0.97] transition-all ${
                    now ? 'bg-[#7a2028]/[0.06] ring-2 ring-[#7a2028]/35' : 'bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/30'
                  }`}
                >
                  <span className="block font-serif-ge text-[14.5px] font-bold leading-tight text-[#2a2017]">{name}</span>
                  <span className={`mt-0.5 block text-[11.5px] font-semibold tabular-nums ${now ? 'text-[#7a2028]' : 'text-[#8a7a6a]'}`}>
                    {now ? 'ახლა · ' : ''}{perMonth[mi]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* the other parts */}
          <SectionTitle className="mt-6">ასევე</SectionTitle>
          <ul className={`mt-2.5 ${CARD} ${ROWS}`}>
            {PARTS.map(p => {
              const n = p.id === 'georgian' ? georgian.length : p.id === 'theotokos' ? theotokos.length : movable.length;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => nav.go(p.id)}
                    className="group w-full flex items-center gap-3 min-h-14 rounded-xl px-3 py-2 text-left hover:bg-[#7a2028]/[0.04] cursor-pointer active:scale-[0.99] transition-all"
                  >
                    <span className="flex-1 min-w-0 font-serif-ge text-[15px] font-semibold leading-snug text-[#2a2017] group-hover:text-[#7a2028] transition-colors">{p.label}</span>
                    <span className="shrink-0 text-[12px] font-bold tabular-nums text-[#8a7a6a]">{n}</span>
                    <ChevronRight className="w-4 h-4 shrink-0 text-[#cdbba3] group-hover:text-[#7a2028] transition-colors" />
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
};
