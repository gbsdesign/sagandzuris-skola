import React, { useState } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import { CalSaint, dayMonthGe, oldDayMonthGe, openChurchCalendar, todayIso, useCalendarDay, weekdayGe } from '../../data/churchCalendar';
import { openSaintLife } from '../../data/saintLives';
import { useMembership } from '../../utils/memberAccess';
import { InlineLink } from '../saints/InlineLink';
import { MONTHS_SHORT_GE } from '../../utils/dateNames';

// Today's saints at the top of the home page: one thin line of the home's day card (HomePage, with the reviews due
// under it) — a small calendar leaf (month · day) and the day's first commemoration, so the vine stays on a phone's
// first screen. A tap unfolds the weekday, the old-style date, the day's commemorations as the calendar words them
// and „კალენდარი“; ✕ puts it away for the day. Since 2026-10-25 (it used to be a once-a-day dialog over the whole
// page); one line in the day card since 2026-10-31.

const SEEN_KEY = 'todaySaintsCardSeen';
const SHOWN_ITEMS = 6;

const alreadySeen = (iso: string) => {
  try { return localStorage.getItem(SEEN_KEY) === iso; } catch { return false; }
};

/** a tear-off calendar leaf: the month on a wine band, the day under it */
const CalendarLeaf: React.FC<{ iso: string }> = ({ iso }) => (
  <span className="w-9 h-9 shrink-0 rounded-[10px] overflow-hidden bg-white ring-1 ring-[#e8dcc8] flex flex-col text-center select-none" aria-hidden>
    <span className="h-[14px] bg-[#7a2028] text-[#fbf6ec] text-[11px] font-bold leading-[14px]">{MONTHS_SHORT_GE[+iso.slice(5, 7) - 1]}</span>
    <span className="flex-1 flex items-center justify-center text-[15px] font-extrabold leading-none text-[#7a2028]">{+iso.slice(8, 10)}</span>
  </span>
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

export const TodaySaintsCard: React.FC = () => {
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
    <section aria-label="დღის წმიდანები" className="text-left sg-in">
      {/* the folded line: the calendar leaf and the day's first commemoration; a tap unfolds the rest */}
      <div className="flex items-center gap-1 pl-2 pr-1">
        <button
          type="button"
          onClick={() => { triggerHaptic(8); setUnfolded(u => !u); }}
          aria-expanded={unfolded}
          aria-label={`${weekdayGe(iso)}, ${dayMonthGe(iso)} — ${first.n}`}
          className="group flex-1 min-w-0 min-h-12 flex items-center gap-2.5 py-1.5 text-left cursor-pointer"
        >
          <CalendarLeaf iso={iso} />
          <span className={`min-w-0 flex-1 truncate font-serif-ge text-[15px] leading-snug ${first.b ? 'font-bold text-[#7a2028]' : 'text-[#2a2017]'}`}>{first.n}</span>
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
          <p className="px-2 pt-2 text-xs font-semibold text-[#8a7a6a]">
            {weekdayGe(iso)}, {dayMonthGe(iso)} <span className="text-[#b3a594]">· ძველი სტილით {oldDayMonthGe(iso)}</span>
          </p>
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
