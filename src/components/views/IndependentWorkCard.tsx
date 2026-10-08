import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, CalendarDays, ChevronDown, Check } from 'lucide-react';
import { useAuth, useChants, useNavigation } from '../../context';
import { triggerHaptic } from '../../utils/haptics';
import { filterValidVariants } from '../../utils/variantValidation';
import { StudyDay, useUpcomingSessions } from '../../hooks/useUpcomingSessions';
import { StreakDay, WeekStreak } from './WeekStreak';
import { StudentBookmarkView } from './StudentBookmarkView';
import { MONTHS_SHORT_GE } from '../../utils/dateNames';
import { CHIP_DONE, CHIP_SOFT, CHIP_STRONG, PATH_CHIP, PATH_LABEL, PATH_LABEL_ICON } from './pathStyle';


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

// Panels on the path page fold open in place (no popups). Other places (the header) can open one:
// openPathPanel('work') remembers the wish and tells a mounted panel to unfold and scroll into view.
const PANEL_KEY = (id: string) => `pathPanel:${id}`;
const PANEL_EVENT = 'open-path-panel';

// The path page's tabs (PathTabs), and the tab that holds each panel, so opening a panel shows its tab
export type PathTab = 'learn' | 'spirit' | 'samosi';
export const PATH_TAB_KEY = 'pathTab';
export const PATH_TAB_EVENT = 'path-tab';
const PANEL_TAB: Record<string, PathTab> = { work: 'learn', manera: 'learn', habits: 'spirit' };

export const openPathPanel = (id: string) => {
  const tab = PANEL_TAB[id];
  try {
    localStorage.setItem(PANEL_KEY(id), '1');
    if (tab) localStorage.setItem(PATH_TAB_KEY, tab);
  } catch { /* storage off: the events still open it */ }
  if (tab) window.dispatchEvent(new CustomEvent(PATH_TAB_EVENT, { detail: tab }));
  window.dispatchEvent(new CustomEvent(PANEL_EVENT, { detail: id }));
};

export const PathPanel: React.FC<{
  id: string;
  title: string;
  subtitle?: React.ReactNode;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  /** quick actions on the folded card: beside the title on wide screens, under it on phones */
  extra?: React.ReactNode;
  /** a part of another card: a small label with a "foldLabel ⌄" button, the quick actions under it */
  flat?: boolean;
  /** the flat panel's fold button: its icon, and its name for screen readers and the tooltip ("კალენდარი") */
  foldIcon?: React.ReactNode;
  foldLabel?: string;
  children: React.ReactNode;
}> = ({ id, title, subtitle, icon, badge, extra, flat, foldIcon, foldLabel = 'გაშლა', children }) => {
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(PANEL_KEY(id)) === '1'; } catch { return false; }
  });
  const ref = useRef<HTMLDivElement>(null);

  const setAndRemember = (v: boolean) => {
    setOpen(v);
    try { localStorage.setItem(PANEL_KEY(id), v ? '1' : '0'); } catch { /* ignore */ }
  };
  const toggle = () => { triggerHaptic(10); setAndRemember(!open); };

  useEffect(() => {
    const onOpen = (e: Event) => {
      if ((e as CustomEvent).detail !== id) return;
      setOpen(true);
      setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    };
    window.addEventListener(PANEL_EVENT, onOpen);
    return () => window.removeEventListener(PANEL_EVENT, onOpen);
  }, [id]);

  if (flat) {
    return (
      <div ref={ref} className="w-full scroll-mt-4">
        <div className="flex items-center gap-2">
          <p className={`flex-1 min-w-0 ${PATH_LABEL}`}>
            {icon}
            <span className="min-w-0">{title}</span>
          </p>
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-label={foldIcon ? foldLabel : undefined}
            title={foldIcon ? foldLabel : undefined}
            className={`${PATH_CHIP} ${open ? CHIP_STRONG : CHIP_SOFT} shrink-0 cursor-pointer active:scale-95`}
          >
            {foldIcon ?? foldLabel}
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
        {extra ? <div className="mt-2.5">{extra}</div> : subtitle && <p className="mt-1 text-[13px] text-[#8a7a6a]">{subtitle}</p>}
        {open && (
          <div className="mt-3.5 pt-4 border-t border-[#efe5d4] animate-in fade-in slide-in-from-top-1 duration-200">
            {children}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className={`${PATH_TILE} hover:-translate-y-0 overflow-hidden scroll-mt-4 ${open ? 'ring-[#7a2028]/20' : ''}`}>
      <div
        onClick={toggle}
        className="w-full flex flex-wrap md:flex-nowrap items-center gap-x-3.5 gap-y-3 p-3.5 sm:p-4 text-left text-[#2a2017] cursor-pointer select-none"
      >
        <span className={PATH_ICON}>{icon}</span>
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

// a study day on the streak strip: all planned hours done joins the chain; a day without a plan is a rest day
const studyMark = (d: StudyDay, isToday: boolean): StreakDay => {
  const note = d.planned ? `${d.done}/${d.planned} სთ${d.extra ? ` +${d.extra}` : ''}` : d.extra ? `${d.extra} სთ` : 'დაგეგმილი არ არის';
  if (d.planned ? d.done >= d.planned : d.extra > 0) return { date: d.date, mark: 'done', note };
  if (d.done > 0 || d.extra > 0) return { date: d.date, mark: 'partial', note };
  if (!d.planned) return { date: d.date, mark: 'rest', note };
  return { date: d.date, mark: isToday ? 'open' : 'missed', note };
};

// "დამოუკიდებელი სამუშაო": folds open into the month's calendar (its hours and percent are on the "შენი გზა" card).
export const IndependentWorkCard: React.FC<{ flat?: boolean }> = ({ flat }) => {
  const { user } = useAuth();
  const { navigateTo } = useNavigation();
  const { sessions, week, toggle } = useUpcomingSessions(user?.uid, 7);

  // the last 7 days as a strip; the strip itself shows how they went, so no percent beside it
  const planned = week.reduce((n, d) => n + d.planned, 0);
  const streak = planned > 0 ? <WeekStreak days={week.map((d, i) => studyMark(d, i === week.length - 1))} /> : null;

  // the nearest planned hours, tickable without unfolding. Each day's name is written once, before its first
  // hour ("დღეს 19:00 20:00  ხვალ 21:00"); one row shows as many as fit.
  const quick = sessions.length > 0 ? (
    <div className={`flex flex-wrap items-center gap-1.5 h-9 overflow-hidden ${flat ? '' : 'md:justify-end'}`}>
      {sessions.map((s, i) => {
        const firstOfDay = i === 0 || sessions[i - 1].dayLabel !== s.dayLabel;
        return (
          <span key={s.key} className={`inline-flex items-center gap-1.5 ${firstOfDay && i > 0 ? 'ml-2' : ''}`}>
            {firstOfDay && <span className="text-xs font-bold text-[#75685a]">{s.dayLabel}</span>}
            <button
              type="button"
              onClick={() => toggle(s.key)}
              aria-pressed={s.done}
              aria-label={`${s.dayLabel} ${s.hour}`}
              title={s.done ? 'შესრულებულია — დააჭირე გასაუქმებლად' : 'დააჭირე, როცა იმეცადინებ'}
              className={`${PATH_CHIP} ${s.done ? CHIP_DONE : CHIP_SOFT} cursor-pointer active:scale-95`}
            >
              {s.done && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              {s.hour}
            </button>
          </span>
        );
      })}
    </div>
  ) : undefined;

  return (
    <PathPanel
      id="work"
      flat={flat}
      foldIcon={<CalendarDays className="w-[18px] h-[18px]" />}
      foldLabel="კალენდარი"
      extra={streak || quick ? <div className="space-y-2.5">{streak}{quick}</div> : undefined}
      title="დამოუკიდებელი სამუშაო"
      icon={<Bookmark className={flat ? `${PATH_LABEL_ICON} fill-[#7a2028]/15` : 'w-5 h-5 fill-[#7a2028]/15'} />}
      subtitle={sessions.length > 0 ? 'მონიშნე, როცა იმეცადინებ' : 'საათები დაგეგმე კალენდარში'}
    >
      <StudentBookmarkView onBack={() => {}} onGoToGaloba={() => navigateTo('galoba')} />
    </PathPanel>
  );
};
