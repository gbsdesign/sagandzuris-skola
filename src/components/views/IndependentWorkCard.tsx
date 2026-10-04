import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, ChevronDown, Check } from 'lucide-react';
import { useAuth, useChants, useNavigation } from '../../context';
import { triggerHaptic } from '../../utils/haptics';
import { filterValidVariants } from '../../utils/variantValidation';
import { useUpcomingSessions } from '../../hooks/useUpcomingSessions';
import { StudentBookmarkView } from './StudentBookmarkView';

export const MONTHS_SHORT_GE = ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'];

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

export const openPathPanel = (id: string) => {
  try { localStorage.setItem(PANEL_KEY(id), '1'); } catch { /* storage off: the event still opens it */ }
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
  /** sits inside another card: a soft tinted strip instead of a white tile */
  flat?: boolean;
  /** told when the panel folds open or shut (and once on mount), so a host card can re-lay itself */
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}> = ({ id, title, subtitle, icon, badge, extra, flat, onOpenChange, children }) => {
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(PANEL_KEY(id)) === '1'; } catch { return false; }
  });
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => { onOpenChange?.(open); }, [open, onOpenChange]);

  const setAndRemember = (v: boolean) => {
    setOpen(v);
    try { localStorage.setItem(PANEL_KEY(id), v ? '1' : '0'); } catch { /* ignore */ }
  };

  useEffect(() => {
    const onOpen = (e: Event) => {
      if ((e as CustomEvent).detail !== id) return;
      setOpen(true);
      setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    };
    window.addEventListener(PANEL_EVENT, onOpen);
    return () => window.removeEventListener(PANEL_EVENT, onOpen);
  }, [id]);

  return (
    <div
      ref={ref}
      className={flat
        ? `group w-full rounded-2xl bg-[#7a2028]/[0.04] overflow-hidden scroll-mt-4 ${open ? 'ring-1 ring-[#7a2028]/15' : ''}`
        : `${PATH_TILE} hover:-translate-y-0 overflow-hidden scroll-mt-4 ${open ? 'ring-[#7a2028]/20' : ''}`}
    >
      {flat ? (
        // compact: a small title in the corner, the quick actions under it, the fold arrow beside
        <div
          onClick={() => { triggerHaptic(10); setAndRemember(!open); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 sm:px-3.5 text-left cursor-pointer select-none"
        >
          <div className="flex-1 min-w-0 space-y-1.5">
            <p className="text-[11px] sm:text-xs font-bold tracking-wide text-[#8a7a6a] group-hover:text-[#7a2028] transition-colors">{title}</p>
            {extra ? (
              <div onClick={e => e.stopPropagation()} className="cursor-default">{extra}</div>
            ) : (
              subtitle && <p className="text-sm font-semibold text-[#2a2017]">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); triggerHaptic(10); setAndRemember(!open); }}
            aria-expanded={open}
            aria-label={open ? `${title} — დაკეცვა` : `${title} — გაშლა`}
            className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-all cursor-pointer ${open ? 'rotate-180 bg-[#7a2028] text-[#fbf6ec]' : 'bg-white text-[#7a2028] shadow-2xs'}`}
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      ) : (
      <div
        onClick={() => { triggerHaptic(10); setAndRemember(!open); }}
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
          onClick={e => { e.stopPropagation(); triggerHaptic(10); setAndRemember(!open); }}
          aria-expanded={open}
          aria-label={open ? `${title} — დაკეცვა` : `${title} — გაშლა`}
          className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-all cursor-pointer ${open ? 'rotate-180 bg-[#7a2028] text-[#fbf6ec]' : 'bg-[#7a2028]/[0.06] text-[#7a2028]'}`}
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>
      )}
      {open && (
        <div className="border-t border-[#efe5d4] bg-white px-3 sm:px-4 pt-4 pb-4 animate-in fade-in slide-in-from-top-1 duration-200">
          {children}
        </div>
      )}
    </div>
  );
};

// "დამოუკიდებელი სამუშაო": folds open into the month's calendar (its statistics are in the "შენი გზა" card).
export const IndependentWorkCard: React.FC<{ flat?: boolean; onOpenChange?: (open: boolean) => void }> = ({ flat, onOpenChange }) => {
  const { user } = useAuth();
  const { navigateTo } = useNavigation();
  const { sessions, toggle } = useUpcomingSessions(user?.uid, 7);

  // the nearest planned hours, tickable without unfolding; one row shows as many as fit
  const quick = sessions.length > 0 ? (
    <div className={`flex flex-wrap gap-1.5 h-9 overflow-hidden ${flat ? '' : 'md:justify-end'}`}>
      {sessions.map(s => (
        <button
          key={s.key}
          type="button"
          onClick={() => toggle(s.key)}
          aria-pressed={s.done}
          title={s.done ? 'შესრულებულია — დააჭირე გასაუქმებლად' : 'დააჭირე, როცა იმეცადინებ'}
          className={`h-9 px-3 rounded-full text-xs font-bold tabular-nums whitespace-nowrap inline-flex items-center gap-1 transition-colors cursor-pointer active:scale-95 ${
            s.done ? 'bg-emerald-600 text-white' : 'bg-[#7a2028]/[0.06] text-[#7a2028] hover:bg-[#7a2028]/[0.12]'
          }`}
        >
          {s.done && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          <span className="font-semibold opacity-80">{s.dayLabel}</span> {s.hour}
        </button>
      ))}
    </div>
  ) : undefined;

  return (
    <PathPanel
      id="work"
      flat={flat}
      onOpenChange={onOpenChange}
      extra={quick}
      title="დამოუკიდებელი სამუშაო"
      icon={<Bookmark className="w-5 h-5 fill-[#7a2028]/15" />}
      subtitle={sessions.length > 0 ? 'მონიშნე, როცა იმეცადინებ' : 'მეცადინეობის კალენდარი'}
    >
      <StudentBookmarkView onBack={() => {}} onGoToGaloba={() => navigateTo('galoba')} />
    </PathPanel>
  );
};
