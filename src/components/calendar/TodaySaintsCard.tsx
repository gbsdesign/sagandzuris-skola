import React, { useState } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import { CalSaint, dayMonthGe, oldDayMonthGe, openChurchCalendar, todayIso, useCalendarDay, weekdayGe } from '../../data/churchCalendar';
import { openSaintLife } from '../../data/saintLives';
import { useMembership } from '../../utils/memberAccess';
import { InlineLink } from '../saints/InlineLink';

// Today's saints at the top of the home page: one folded line in the flow (the date and the day's first
// commemoration), so the vine stays on a phone's first screen. A tap unfolds the day's commemorations as the
// calendar words them and „კალენდარი“; ✕ puts it away for the day. Since 2026-10-25 (it used to be a once-a-day
// dialog over the whole page).

const SEEN_KEY = 'todaySaintsCardSeen';
const SHOWN_ITEMS = 6;

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
      <span className={`flex-1 min-w-0 text-[15px] leading-relaxed ${s.b ? 'font-bold text-[#7a2028]' : 'text-[#2a2017]'}`}>
        {name}
        {s.d && (
          <>
            {' '}
            <span className={`font-sans font-normal text-xs text-[#8a7a6a] ${s.d.length <= 24 ? 'whitespace-nowrap' : ''}`}>({s.d})</span>
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

export const TodaySaintsCard: React.FC<{ className?: string }> = ({ className }) => {
  // the calendar is a feature a superadmin gives (utils/memberAccess); guests and waiting members don't get it
  const canCal = useMembership().can('calendar');
  const [iso] = useState(todayIso);
  const [hidden, setHidden] = useState(() => alreadySeen(iso));
  const [unfolded, setUnfolded] = useState(false);
  const day = useCalendarDay(canCal && !hidden ? iso : null);

  const close = () => {
    triggerHaptic(8);
    setHidden(true);
    try { localStorage.setItem(SEEN_KEY, iso); } catch { /* shows again next time */ }
  };

  if (!canCal || hidden || !day?.s.length) return null;
  const first = day.s[0];
  const items = day.s.slice(0, SHOWN_ITEMS);
  const more = day.s.length - items.length;

  return (
    <section
      aria-label="დღის წმიდანები"
      className={`w-full max-w-md text-left rounded-2xl bg-white/80 ring-1 ring-[#e8dcc8] shadow-[0_1px_2px_rgba(74,52,38,0.05)] sg-in ${className || ''}`}
    >
      {/* the folded line: the date and the day's first commemoration; a tap unfolds the rest */}
      <div className="flex items-center gap-1 pl-3 pr-1.5">
        <button
          type="button"
          onClick={() => { triggerHaptic(8); setUnfolded(u => !u); }}
          aria-expanded={unfolded}
          className="group flex-1 min-w-0 flex items-center gap-2.5 py-2 text-left cursor-pointer"
        >
          <NinoCross className="w-4 h-6 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-[#8a7a6a]">{weekdayGe(iso)}, {dayMonthGe(iso)}</span>
            <span className={`block truncate font-serif-ge text-[15px] leading-snug ${first.b ? 'font-bold text-[#7a2028]' : 'text-[#2a2017]'}`}>{first.n}</span>
          </span>
          <ChevronDown className={`w-[18px] h-[18px] shrink-0 text-[#b3a594] group-hover:text-[#7a2028] transition-transform ${unfolded ? 'rotate-180' : ''}`} aria-hidden />
        </button>
        <button
          type="button"
          onClick={close}
          className="w-9 h-9 shrink-0 rounded-full text-[#8a7a6a] hover:text-[#7a2028] hover:bg-[#7a2028]/[0.06] flex items-center justify-center cursor-pointer transition-colors"
          aria-label="დღეს აღარ მაჩვენო"
          title="დღეს აღარ მაჩვენო"
        >
          <X className="w-[18px] h-[18px]" />
        </button>
      </div>

      {unfolded && (
        <div className="px-2 pb-2 border-t border-[#f1e8d9] sg-in">
          <p className="px-2 pt-2 text-xs font-semibold text-[#b3a594]">ძველი სტილით {oldDayMonthGe(iso)}</p>
          {/* a saint with a life in the library opens it */}
          <ul className="mt-1 space-y-0.5 font-serif-ge">
            {items.map((s, i) => <SaintRow key={i} s={s} />)}
          </ul>
          <div className="mt-1 flex items-center justify-between gap-2 pl-2">
            <span className="text-[13px] font-semibold text-[#8a7a6a]">{more > 0 ? `და კიდევ ${more} ხსენება` : ''}</span>
            <button
              type="button"
              onClick={() => { triggerHaptic(8); openChurchCalendar(iso); }}
              className="inline-flex items-center gap-0.5 h-9 pl-3 pr-2 rounded-full text-[13px] font-bold text-[#7a2028] hover:bg-[#7a2028]/[0.06] cursor-pointer active:scale-95 transition"
            >
              კალენდარი <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
