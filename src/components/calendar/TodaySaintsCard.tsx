import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import { Sprig } from '../home/PlateOrnaments';
import { CalSaint, dayMonthGe, oldDayMonthGe, openChurchCalendar, todayIso, useCalendarDay, weekdayGe } from '../../data/churchCalendar';
import { openSaintLife } from '../../data/saintLives';
import { InlineLink } from '../saints/InlineLink';

// Once a day, on entering the site: "may today's saints intercede for you" with the day's
// commemorations as the calendar words them. "სრულად" goes down to the footer's calendar.

const SEEN_KEY = 'todaySaintsCardSeen';
const SHOWN_ITEMS = 8;
const LATE_MS = 10000;

// opened from a shared notes link or a reminder: don't cover what was asked for
const openedForSomethingElse = () => {
  const q = new URLSearchParams(window.location.search);
  return ['c', 'v', 'p', 'prayer', 'oobCode'].some(k => q.has(k)); // oobCode: back from the sign-in letter
};

const alreadySeen = (iso: string) => {
  try { return localStorage.getItem(SEEN_KEY) === iso; } catch { return false; }
};

// St Nino's grapevine cross: drooping arms, grape-berry finials
const NinoCross: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 60 84" className={className} fill="none" aria-hidden>
    <path d="M30 10V76" stroke="#7a2028" strokeWidth={5.5} strokeLinecap="round" />
    <path d="M30 29C22 29 15 32 9.5 39.5M30 29C38 29 45 32 50.5 39.5" stroke="#7a2028" strokeWidth={5} strokeLinecap="round" />
    <path d="M26 76.5c1.5-3.2 6.5-3.2 8 0" stroke="#7a2028" strokeWidth={4} strokeLinecap="round" />
    {[[30, 5.5], [6.5, 43], [53.5, 43]].map(([x, y]) => (
      <g key={`${x}`}>
        <circle cx={x} cy={y} r={3.6} fill="#7a2028" />
        <circle cx={x - 3.4} cy={y + (y < 10 ? 3 : -3.4)} r={2.3} fill="#9a3324" />
        <circle cx={x + 3.4} cy={y + (y < 10 ? 3 : -3.4)} r={2.3} fill="#9a3324" />
      </g>
    ))}
    <circle cx={30} cy={29} r={4.2} fill="#fbf6ec" stroke="#7a2028" strokeWidth={2.2} />
  </svg>
);

const open = (id: string) => { triggerHaptic(8); openSaintLife(id); };

const SaintRow: React.FC<{ s: CalSaint }> = ({ s }) => {
  // the whole line opens its life; a line holding a feast and a saint links each part on its own
  const whole = s.l ?? (s.ls?.length === 1 ? s.ls[0][2] : undefined);
  const parts = !whole && s.ls?.length ? s.ls : null;
  const name = parts ? (
    <>
      {parts.map(([from, to, id], k) => (
        <React.Fragment key={k}>
          {s.n.slice(k ? parts[k - 1][1] : 0, from)}
          <InlineLink onOpen={() => open(id)} className="hover:text-[#7a2028]">{s.n.slice(from, to)}</InlineLink>
        </React.Fragment>
      ))}
      {s.n.slice(parts[parts.length - 1][1])}
    </>
  ) : s.n;
  const body = (
    <>
      <span className={`mt-[0.6em] shrink-0 w-1.5 h-1.5 rounded-full ${s.b ? 'bg-[#c4262e]' : 'bg-[#d9c6a8]'}`} aria-hidden />
      <span className={`flex-1 min-w-0 line-clamp-4 text-[15px] leading-relaxed ${s.b ? 'font-bold text-[#7a2028]' : 'text-[#2a2017]'}`}>
        {name}
        {s.d && (
          <>
            {' '}
            <span className={`font-sans font-normal text-[12px] text-[#8a7a6a] ${s.d.length <= 24 ? 'whitespace-nowrap' : ''}`}>({s.d})</span>
          </>
        )}
      </span>
    </>
  );
  if (!whole) return <li className="flex gap-2.5 px-2 py-1">{body}</li>;
  return (
    <li>
      <button
        type="button"
        onClick={() => open(whole)}
        className="group w-full flex gap-2.5 rounded-xl px-2 py-1 text-left hover:bg-[#7a2028]/[0.05] cursor-pointer active:scale-[0.99] transition-all"
      >
        {body}
        <ChevronRight className="mt-[0.3em] w-4 h-4 shrink-0 text-[#cdbba3] group-hover:text-[#7a2028] transition-colors" aria-hidden />
      </button>
    </li>
  );
};

export const TodaySaintsCard: React.FC = () => {
  const [iso] = useState(todayIso);
  const [wanted] = useState(() => !alreadySeen(iso) && !openedForSomethingElse());
  const day = useCalendarDay(wanted ? iso : null);
  const [phase, setPhase] = useState<'hidden' | 'in' | 'shown' | 'out'>('hidden');
  const mountedAt = useRef(performance.now());

  // appear a moment after the page has settled — never long after, in the middle of reading
  useEffect(() => {
    if (!wanted || !day?.s.length || performance.now() - mountedAt.current > LATE_MS) return;
    const t = window.setTimeout(() => {
      setPhase('in');
      try { localStorage.setItem(SEEN_KEY, iso); } catch { /* shows again next time */ }
      requestAnimationFrame(() => requestAnimationFrame(() => setPhase('shown')));
    }, 700);
    return () => window.clearTimeout(t);
  }, [wanted, day, iso]);

  useEffect(() => {
    if (phase !== 'shown') return;
    // Escape over an opened life closes that life, not this card
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !window.history.state?.sgLife) close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const close = (then?: () => void) => {
    triggerHaptic(8);
    setPhase('out');
    window.setTimeout(() => { setPhase('hidden'); then?.(); }, 240);
  };

  if (phase === 'hidden' || !day) return null;
  const visible = phase === 'shown';
  const items = day.s.slice(0, SHOWN_ITEMS);
  const more = day.s.length - items.length;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] sm:p-6">
      <div
        className={`absolute inset-0 bg-[#2a2017]/35 backdrop-blur-[2px] transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={() => close()}
        aria-hidden
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="today-saints-title"
        className={`relative w-full max-w-md max-h-[calc(100dvh-1.5rem-env(safe-area-inset-bottom,0px))] flex flex-col rounded-[28px] bg-gradient-to-b from-[#fffdf8] via-[#fdf8ef] to-[#f8efdf] ring-1 ring-[#e8dcc8] shadow-[0_30px_60px_-25px_rgba(42,32,23,0.55)] transition-all ease-[cubic-bezier(0.22,1,0.36,1)] ${
          visible ? 'opacity-100 translate-y-0 scale-100 duration-500' : 'opacity-0 translate-y-6 scale-[0.98] duration-200'
        }`}
      >
        <button
          type="button"
          onClick={() => close()}
          className="absolute top-3 right-3 w-9 h-9 rounded-full text-[#8a7a6a] hover:text-[#7a2028] hover:bg-[#7a2028]/[0.06] flex items-center justify-center cursor-pointer transition-colors"
          aria-label="დახურვა"
        >
          <X className="w-4.5 h-4.5" />
        </button>

        {/* the cross between two vine sprigs */}
        <div className="pt-6 flex items-center justify-center gap-3" aria-hidden>
          <Sprig color="#d2a04a" className="w-10 h-10 -rotate-[65deg] opacity-80" />
          <NinoCross className="w-11 h-[60px]" />
          <Sprig color="#d2a04a" className="w-10 h-10 rotate-[65deg] opacity-80" />
        </div>

        <header className="px-6 pt-3 text-center">
          <p className="text-[12px] font-semibold text-[#8a7a6a]">
            {weekdayGe(iso)}, {dayMonthGe(iso)}
            <span className="text-[#b3a594]"> · ძვ. სტ. {oldDayMonthGe(iso)}</span>
          </p>
          <h2 id="today-saints-title" className="mt-1.5 font-serif-ge text-[21px] sm:text-[23px] leading-snug font-bold text-[#7a2028] text-balance">
            შეგეწიოთ დღევანდელი წმიდანების მეოხება
          </h2>
          <div className="mx-auto mt-3 flex items-center justify-center gap-2" aria-hidden>
            <span className="h-px w-12 bg-gradient-to-r from-transparent to-[#d9c6a8]" />
            <span className="w-1.5 h-1.5 rotate-45 bg-[#c4262e]/70" />
            <span className="h-px w-12 bg-gradient-to-l from-transparent to-[#d9c6a8]" />
          </div>
        </header>

        {/* a saint with a life in the library opens it (over this card, which waits underneath) */}
        <ul className="mt-3 px-4 overflow-y-auto overscroll-contain space-y-0.5 font-serif-ge">
          {items.map((s, i) => <SaintRow key={i} s={s} />)}
          {more > 0 && (
            <li className="pl-6 pt-1.5 text-[13px] font-sans font-semibold text-[#8a7a6a]">და კიდევ {more} ხსენება</li>
          )}
        </ul>

        <div className="px-5 pt-5 pb-5 flex flex-col-reverse sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => close()}
            className="h-11 sm:flex-1 rounded-full ring-1 ring-[#e8dcc8] bg-white/70 hover:bg-white text-[#4a3426] text-sm font-bold cursor-pointer active:scale-[0.98] transition-all"
          >
            დახურვა
          </button>
          <button
            type="button"
            onClick={() => close(() => openChurchCalendar(iso))}
            className="h-11 sm:flex-[1.4] inline-flex items-center justify-center gap-1.5 rounded-full bg-[#7a2028] hover:bg-[#5e1820] text-[#fbf6ec] text-sm font-bold shadow-[0_8px_18px_-8px_rgba(122,32,40,0.75)] cursor-pointer active:scale-[0.98] transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#7a2028]/25"
          >
            სრულად
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
};
