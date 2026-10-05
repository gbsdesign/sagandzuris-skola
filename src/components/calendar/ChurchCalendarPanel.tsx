import React, { useState } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import {
  MONTHS_GE, addDays, daysInMonth, fromIso, fromOldStyle, oldStyleOf, todayIso, useCalendarDay,
} from '../../data/churchCalendar';
import { CalendarDayView } from './CalendarDayView';

// The footer's calendar: orthodoxy.ge's day page with its controls — previous / next day around
// the month and day pickers (read in the old or the new style), back to today, and the style.

const STYLE_KEY = 'churchCalendarStyle';

// one height for the whole toolbar: a little taller on a phone for the thumb
const H = 'h-10 sm:h-9';
const STEP =
  `w-9 ${H} shrink-0 grid place-items-center text-[#7a2028] hover:bg-[#7a2028]/[0.06] cursor-pointer active:bg-[#7a2028]/[0.1] transition-colors select-none`;
const SELECT =
  `appearance-none ${H} w-full bg-transparent pl-3 pr-7 text-[13px] font-semibold text-[#2a2017] cursor-pointer outline-none hover:text-[#7a2028] focus-visible:bg-[#7a2028]/[0.05]`;
const SEP = <span className="w-px h-5 shrink-0 bg-[#e8dcc8]" aria-hidden />;

export const ChurchCalendarPanel: React.FC<{ iso: string; onChange: (iso: string) => void; onClose: () => void }> = ({ iso, onChange, onClose }) => {
  const day = useCalendarDay(iso);
  const [oldStyle, setOldStyle] = useState(() => {
    try { return localStorage.getItem(STYLE_KEY) !== 'new'; } catch { return true; }
  });
  const setStyle = (old: boolean) => {
    triggerHaptic(8);
    setOldStyle(old);
    try { localStorage.setItem(STYLE_KEY, old ? 'old' : 'new'); } catch { /* ignore */ }
  };

  // the picked day, read in the chosen style
  const nd = fromIso(iso);
  const od = oldStyleOf(iso);
  const shown = oldStyle ? od : { year: nd.getFullYear(), month: nd.getMonth() + 1, day: nd.getDate() };
  const pick = (month: number, dayOfMonth: number) => {
    const d = Math.min(dayOfMonth, daysInMonth(shown.year, month, oldStyle));
    const pad = (n: number) => String(n).padStart(2, '0');
    onChange(oldStyle ? fromOldStyle(shown.year, month, d) : `${shown.year}-${pad(month)}-${pad(d)}`);
  };
  const go = (n: number) => { triggerHaptic(8); onChange(addDays(iso, n)); };
  const today = todayIso();

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-6 pt-4 pb-5">
      <div className="flex items-center gap-2">
        <CalendarDays className="w-[18px] h-[18px] shrink-0 text-[#7a2028]" />
        <h2 className="flex-1 min-w-0 font-serif-ge text-base sm:text-[17px] font-bold text-[#7a2028]">საეკლესიო კალენდარი</h2>
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 shrink-0 rounded-full bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/35 text-[#7a2028] flex items-center justify-center cursor-pointer active:scale-95 transition-all"
          aria-label="კალენდრის დაკეცვა"
          title="დაკეცვა"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {/* ‹ month · day › — one control */}
        <div className="flex-1 sm:flex-none min-w-0 flex items-center rounded-full bg-white ring-1 ring-[#e8dcc8] overflow-hidden">
          <button type="button" onClick={() => go(-1)} className={STEP} aria-label="წინა დღე" title="წინა დღე">
            <ChevronLeft className="w-4 h-4" />
          </button>
          {SEP}
          <span className="relative flex-1 sm:flex-none min-w-0 sm:w-[8.5rem]">
            <select value={shown.month} onChange={e => pick(Number(e.target.value), shown.day)} className={SELECT} aria-label="თვე">
              {MONTHS_GE.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a39482]" />
          </span>
          {SEP}
          <span className="relative w-[3.9rem] shrink-0">
            <select value={shown.day} onChange={e => pick(shown.month, Number(e.target.value))} className={`${SELECT} tabular-nums`} aria-label="რიცხვი">
              {Array.from({ length: daysInMonth(shown.year, shown.month, oldStyle) }, (_, i) => (
                <option key={i} value={i + 1}>{i + 1}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a39482]" />
          </span>
          {SEP}
          <button type="button" onClick={() => go(1)} className={STEP} aria-label="შემდეგი დღე" title="შემდეგი დღე">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => { triggerHaptic(8); onChange(today); }}
          disabled={iso === today}
          className={`${H} shrink-0 px-3.5 rounded-full bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/35 text-[13px] font-bold text-[#4a3426] hover:text-[#7a2028] transition-all cursor-pointer active:scale-95 disabled:opacity-45 disabled:pointer-events-none select-none`}
        >
          დღეს
        </button>

        {/* the style the month and day are read in */}
        <div role="radiogroup" aria-label="სტილი" className="w-full sm:w-auto sm:ml-auto flex rounded-full bg-white ring-1 ring-[#e8dcc8] p-0.5">
          {[
            { old: true, label: 'ძველი სტილით' },
            { old: false, label: 'ახალი სტილით' },
          ].map(o => (
            <button
              key={o.label}
              type="button"
              role="radio"
              aria-checked={oldStyle === o.old}
              onClick={() => setStyle(o.old)}
              className={`flex-1 sm:flex-none h-9 sm:h-8 px-3 rounded-full text-[12.5px] font-bold whitespace-nowrap transition-colors cursor-pointer select-none ${
                oldStyle === o.old ? 'bg-[#7a2028] text-[#fbf6ec]' : 'text-[#4a3426] hover:text-[#7a2028]'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 rounded-2xl bg-white ring-1 ring-[#2a2017]/[0.07] shadow-[0_1px_2px_rgba(42,32,23,0.05),0_10px_26px_-20px_rgba(42,32,23,0.35)] p-2.5 sm:p-4">
        <CalendarDayView iso={iso} day={day} />
      </div>
    </div>
  );
};
