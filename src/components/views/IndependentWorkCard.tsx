import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useAuth, useChants, useNavigation } from '../../context';
import { triggerHaptic } from '../../utils/haptics';
import { filterValidVariants } from '../../utils/variantValidation';
import { useUpcomingSessions } from '../../hooks/useUpcomingSessions';
import { useMonthlyStudyStats } from '../../hooks/useMonthlyStudyStats';
import { StudentBookmarkView } from './StudentBookmarkView';
import { MONTHS_GE, MONTHS_SHORT_GE } from '../../utils/dateNames';


// "დღეს" / "ხვალ" / "12 ოქტ" for the next planned lesson
export const nextLessonLabel = (next: { offset: number; date: Date }) =>
  next.offset === 0 ? 'დღეს' : next.offset === 1 ? 'ხვალ' : `${next.date.getDate()} ${MONTHS_SHORT_GE[next.date.getMonth()]}`;

export const useSelectedCount = () => {
  const { selectedChantVariants = {} } = useChants();
  return useMemo(() => Object.keys(filterValidVariants(selectedChantVariants)).length, [selectedChantVariants]);
};

// Look shared by the tiles of "საგანძურის გზა": white card, soft shadow, lifts a little on hover
export const PATH_TILE =
  'group w-full rounded-2xl bg-white ring-1 ring-[#2a2017]/[0.07] shadow-[0_1px_2px_rgba(42,32,23,0.05),0_10px_28px_-18px_rgba(42,32,23,0.35)] hover:ring-[#7a2028]/25 hover:shadow-[0_1px_2px_rgba(42,32,23,0.05),0_16px_32px_-18px_rgba(122,32,40,0.45)] hover:-translate-y-px transition-all duration-200';
export const PATH_ICON = 'w-11 h-11 shrink-0 rounded-xl bg-[#7a2028]/[0.07] text-[#7a2028] flex items-center justify-center';

// Panels on the path page fold open in place (no popups) and always start folded. Other places (the header,
// home buttons) can open one: openPathPanel('work') leaves a one-time wish and tells a mounted panel to
// unfold and scroll into view; the panel uses the wish up, so the next visit finds it folded again.
const PANEL_KEY = (id: string) => `pathPanel:${id}`;
const PANEL_EVENT = 'open-path-panel';

// "habits" is the page's own card, always shown, so it needs no wish
const ALWAYS_SHOWN = new Set(['habits']);

export const openPathPanel = (id: string) => {
  if (ALWAYS_SHOWN.has(id)) return;
  try {
    localStorage.setItem(PANEL_KEY(id), '1');
  } catch { /* storage off: the event still opens it */ }
  window.dispatchEvent(new CustomEvent(PANEL_EVENT, { detail: id }));
};

export const PathPanel: React.FC<{
  id: string;
  title: string;
  subtitle?: React.ReactNode;
  icon: React.ReactNode;
  /** shown instead of the square icon: a progress ring */
  lead?: React.ReactNode;
  badge?: React.ReactNode;
  /** quick actions on the folded card: beside the title on wide screens, under it on phones */
  extra?: React.ReactNode;
  children: React.ReactNode;
}> = ({ id, title, subtitle, icon, lead, badge, extra, children }) => {
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(PANEL_KEY(id)) === '1'; } catch { return false; }
  });
  const ref = useRef<HTMLDivElement>(null);
  const forgetWish = () => { try { localStorage.removeItem(PANEL_KEY(id)); } catch { /* ignore */ } };

  const toggle = () => { triggerHaptic(10); setOpen(!open); };

  useEffect(() => {
    forgetWish();
    const onOpen = (e: Event) => {
      if ((e as CustomEvent).detail !== id) return;
      forgetWish();
      setOpen(true);
      setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    };
    window.addEventListener(PANEL_EVENT, onOpen);
    return () => window.removeEventListener(PANEL_EVENT, onOpen);
  }, [id]);

  return (
    <div ref={ref} className={`${PATH_TILE} hover:-translate-y-0 overflow-hidden scroll-mt-4 ${open ? 'ring-[#7a2028]/20' : ''}`}>
      <div
        onClick={toggle}
        className="w-full flex flex-wrap md:flex-nowrap items-center gap-x-3.5 gap-y-3 p-3.5 sm:p-4 text-left text-[#2a2017] cursor-pointer select-none"
      >
        {lead ?? <span className={PATH_ICON}>{icon}</span>}
        <span className={`flex-1 min-w-0 flex flex-col gap-1 ${extra ? 'md:flex-none' : ''}`}>
          <span className="flex items-center gap-2">
            <span className="text-[15px] sm:text-base font-black leading-tight group-hover:text-[#7a2028] transition-colors">{title}</span>
            {badge}
          </span>
          {subtitle && <span className="text-xs font-semibold text-[#8a7a6a]">{subtitle}</span>}
        </span>
        {extra && (
          <div onClick={e => e.stopPropagation()} className="order-last md:order-none basis-full md:basis-0 md:flex-1 min-w-0 cursor-default">
            {extra}
          </div>
        )}
        <button
          type="button"
          onClick={e => { e.stopPropagation(); toggle(); }}
          aria-expanded={open}
          aria-label={open ? `${title} — დაკეცვა` : `${title} — გაშლა`}
          className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-all cursor-pointer ${open ? 'rotate-180 bg-[#7a2028] text-[#fbf6ec]' : 'bg-[#7a2028]/[0.06] text-[#7a2028]'}`}
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>
      {open && (
        <div className="border-t border-[#efe5d4] bg-white px-3 sm:px-4 pt-4 pb-4 animate-in fade-in slide-in-from-top-1 duration-200">
          {children}
        </div>
      )}
    </div>
  );
};

/** A panel above the tabs (the round buttons, PathOrbs) opening when asked from elsewhere with openPathPanel():
 *  the wish left before the page mounted, or the event while it is shown. */
export const usePanelWish = (ids: readonly string[], onOpen: (id: string) => void) => {
  const cb = useRef(onOpen);
  cb.current = onOpen;
  const key = ids.join(',');
  useEffect(() => {
    const list = key.split(',');
    for (const id of list) {
      let wished = false;
      try { wished = localStorage.getItem(PANEL_KEY(id)) === '1'; localStorage.removeItem(PANEL_KEY(id)); } catch { /* storage off */ }
      if (wished) cb.current(id);
    }
    const onEvent = (e: Event) => {
      const id = (e as CustomEvent).detail;
      if (!list.includes(id)) return;
      try { localStorage.removeItem(PANEL_KEY(id)); } catch { /* ignore */ }
      cb.current(id);
    };
    window.addEventListener(PANEL_EVENT, onEvent);
    return () => window.removeEventListener(PANEL_EVENT, onEvent);
  }, [key]);
};

// "დამოუკიდებელი სამუშაო" (a round button on the path page): this month's hours, and today's planned hours to tick
export const useIndependentWork = () => {
  const { user } = useAuth();
  const { sessions, toggle } = useUpcomingSessions(user?.uid, 7);
  const month = useMonthlyStudyStats(user?.uid);
  const planned = month && month.planned > 0 ? month : null;
  const monthName = MONTHS_GE[new Date().getMonth()];
  const today = sessions.filter(s => s.dayLabel === 'დღეს');
  const next = sessions.find(s => s.dayLabel !== 'დღეს');
  return { planned, monthName, today, next, toggle };
};

/** The month's line: "ოქტომბერი · 3 / 8 სთ", or a hint while nothing is planned. */
export const WorkMonthLine: React.FC<{ work: ReturnType<typeof useIndependentWork> }> = ({ work: { planned, monthName } }) =>
  planned ? (
    <span className="tabular-nums">
      {monthName} · <span className="text-[13px] font-black text-[#2a2017]">{planned.worked}</span> / {planned.planned} სთ
    </span>
  ) : <>საათები დაგეგმე კალენდარში</>;

/** The open panel: the month's calendar, opened on today (its hours are ticked there). */
export const WorkPanel: React.FC = () => {
  const { navigateTo } = useNavigation();
  return <StudentBookmarkView onBack={() => {}} onGoToGaloba={() => navigateTo('galoba')} />;
};

