import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, ChevronDown, Flame, Info, Pencil, Sparkles, X } from 'lucide-react';
import { useAuth, useModal, useNavigation } from '../../context';
import { useMyHabits } from '../../hooks/useMyHabits';
import { useAccess } from '../../hooks/useAccess';
import { HabitLink } from '../../utils/myHabits';
import { askSignIn } from '../access/SignInPrompt';
import { useOpenSearchTarget } from '../search/openSearchTarget';
import { triggerHaptic } from '../../utils/haptics';
import { Btn, IconBtn, Sheet } from '../ui/kit';
import { HabitPrayerMenu } from './HabitPrayerMenu';
import { setHabitReminders } from '../../utils/prayerReminders';
import { AddHabitPanel, HabitCardEditor, HabitsReorder } from './HabitsEditor';
import { PATH_ICON } from './IndependentWorkCard';
import { DayView, ListEdit } from '../habits/DayView';
import { WeekView } from '../habits/WeekView';
import { MonthView } from '../habits/MonthView';
import { YearView } from '../habits/YearView';
import { HabitPage, HabitPageTitle } from '../habits/HabitPage';
import { HabitsModel, dailyOf, rareOf, useHabitToggle, useHabitsModel } from '../habits/useHabits';
import { dayState } from '../../utils/habitStats';
import { dayKey, keptStreak } from '../../utils/habitsWeek';
import { MONTHS_GE } from '../../utils/dateNames';

// the home page buttons open the same menus; the prayer page ticks through the same toggle
export { HabitPrayerMenu, useHabitToggle };

// The sheet open over the habits (a habit's page or its settings, adding a habit, or 'info') lives in the history
// entry: the phone's back closes it, and coming back from a prayer opened in it shows it again.
const SHEET_KEY = 'sgHabit';
const sheetInHistory = (): string | null => {
  try {
    return window.history.state?.[SHEET_KEY] ?? null;
  } catch {
    return null;
  }
};
const useHabitSheet = () => {
  const [sheet, setSheet] = useState<string | null>(sheetInHistory);
  // a second close (a double tap on ✕) while the first "back" is on its way would leave the page
  const closing = useRef(false);
  useEffect(() => {
    const onPop = () => {
      closing.current = false;
      setSheet(sheetInHistory());
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const open = (id: string) => {
    try {
      window.history.pushState({ ...(window.history.state || {}), [SHEET_KEY]: id }, '');
    } catch { /* still opens */ }
    setSheet(id);
  };
  const close = () => {
    setSheet(null);
    if (closing.current || !sheetInHistory()) return;
    closing.current = true;
    window.history.back();
  };
  // another face of the same sheet (a habit's page ↔ its settings): no new history step, so back still closes it
  const swap = (id: string) => {
    try {
      window.history.replaceState({ ...(window.history.state || {}), [SHEET_KEY]: id }, '');
    } catch { /* still swaps */ }
    setSheet(id);
  };
  return { sheet, open, close, swap };
};

// "ⓘ": what the habits are for (how ticking works is plain from the list itself, 2026-10-28)
const HabitsInfo: React.FC = () => (
  <div className="space-y-2 text-[14px] leading-relaxed text-[#4a3426]">
    <p>ნიადაგი არის ის, რაშიც მყარად არის „ჩაფლული“ საძირკველი, ხოლო საძირკველზე დგას შენობა — ანუ მგალობლის შემოქმედება.</p>
    <p>
      სწორი ნიადაგის მომზადების გარეშე ვერ დამყარდება ვერც საძირკველი და ვერც მგალობლის შემოქმედება. ქვემოთ მოცემულია ჩვევები,
      რომლებიც საჭიროა სწორი სულიერი ნიადაგის მოსამზადებლად.
    </p>
  </div>
);

// The habits' views. A new view is one entry here: it gets the shared model (components/habits/useHabits) and the
// few page actions below.
type ViewId = 'day' | 'week' | 'month' | 'year';
interface ViewProps {
  model: HabitsModel;
  date: Date;
  onDate: (d: Date) => void;
  /** opens a day in "დღე" to tick it */
  onPickDay: (d: Date) => void;
  onOpenPrayer: (prayerId: string) => void;
  onLink: (l: HabitLink) => void;
  /** a member's own list (not for a guest) */
  edit?: ListEdit;
}
const VIEWS: { id: ViewId; label: string; render: (p: ViewProps) => React.ReactNode }[] = [
  { id: 'day', label: 'დღე', render: p => <DayView model={p.model} date={p.date} onDate={p.onDate} onOpenPrayer={p.onOpenPrayer} onLink={p.onLink} edit={p.edit} /> },
  { id: 'week', label: 'კვირა', render: p => <WeekView model={p.model} onPickDay={p.onPickDay} /> },
  { id: 'month', label: 'თვე', render: p => <MonthView model={p.model} onPickDay={p.onPickDay} /> },
  { id: 'year', label: 'წელი', render: p => <YearView model={p.model} /> },
];

// „დღე ▾“ in the card's head: one button with the view's name; a tap drops the views in a small list under it, and
// under them „განმარტება“ (what the habits are for — no ⓘ of its own beside it since 2026-10-28)
const ViewMenu: React.FC<{ value: ViewId; onChange: (v: ViewId) => void; onInfo: () => void }> = ({ value, onChange, onInfo }) => {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  const current = VIEWS.find(v => v.id === value)!;
  return (
    <span ref={box} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`ხედი: ${current.label}`}
        onClick={() => { triggerHaptic(8); setOpen(o => !o); }}
        className="h-9 pl-3 pr-2 rounded-full inline-flex items-center gap-1 text-[13.5px] font-bold text-[#7a2028] bg-white ring-1 ring-[#e8dcc8] shadow-[0_2px_8px_-5px_rgba(74,52,38,0.35)] cursor-pointer transition active:scale-95 hover:bg-[#fffdf9]"
      >
        {current.label}
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="ჩვევების ხედი"
          className="absolute right-0 top-full mt-1.5 z-30 w-40 p-1 rounded-2xl bg-white ring-1 ring-[#e8dcc8] shadow-[0_14px_32px_-12px_rgba(74,52,38,0.45)] origin-top-right animate-in fade-in zoom-in-95 duration-150"
        >
          {VIEWS.map(v => {
            const on = v.id === value;
            return (
              <button
                key={v.id}
                type="button"
                role="menuitemradio"
                aria-checked={on}
                onClick={() => {
                  setOpen(false);
                  if (!on) { triggerHaptic(8); onChange(v.id); }
                }}
                className={`w-full h-11 px-3 rounded-xl flex items-center gap-2 text-left text-[14px] font-bold cursor-pointer transition-colors ${
                  on ? 'bg-[#f3ebdd] text-[#7a2028]' : 'text-[#4a3426] hover:bg-[#7a2028]/[0.05]'
                }`}
              >
                <span className="flex-1">{v.label}</span>
                {on && <Check className="w-4 h-4 stroke-[2.5]" />}
              </button>
            );
          })}
          <div className="my-1 h-px bg-[#efe5d4]" />
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); onInfo(); }}
            className="w-full h-11 px-3 rounded-xl flex items-center gap-2 text-left text-[14px] font-bold text-[#4a3426] hover:bg-[#7a2028]/[0.05] cursor-pointer transition-colors"
          >
            <Info className="w-4 h-4 shrink-0 text-[#8a7a6a]" />
            <span className="flex-1">განმარტება</span>
          </button>
        </div>
      )}
    </span>
  );
};

// "ჩვევები" for students: the day (its ring, the last seven days, the habits), the week, the month and the year.
// A tap on a habit ticks the chosen day (teachers see the ticks in their panels); „›“ opens the habit's own page,
// where ✏️ changes it; adding and reordering sit at the end of each list (views/HabitsEditor).
// Finishing the whole of today sets off fireworks and a blessing.
export const ChvevebiContent: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { openPrayer } = useNavigation();
  const { activeModal, closeModal } = useModal();
  const { sheet, open, close, swap } = useHabitSheet();
  const { model, blessing } = useHabitsModel(id => open(`habit:${id}`));
  const { user } = useAuth();
  const mine = useMyHabits(user?.uid);
  // the habits with a time and reminders become this browser's reminders (and the push server's)
  useEffect(() => {
    if (!user) return;
    setHabitReminders(
      mine.groups
        .flatMap(g => g.items)
        .filter(h => h.time && h.alerts?.length)
        .map(h => ({ id: h.id, title: h.label, at: h.time!.from, alerts: h.alerts!, ...(h.schedule ? { plan: h.schedule } : {}) }))
    );
  }, [mine.groups, user]);
  const [view, setView] = useState<ViewId>('day');
  const [date, setDate] = useState(() => new Date());
  const access = useAccess();
  const openTarget = useOpenSearchTarget();

  const leaveFor = (go: () => void) => {
    if (activeModal) closeModal();
    go();
  };
  const openInfo = () => open('info');
  const onToday = dayKey(date) === dayKey(new Date());
  const day = dayState(model.log, model.dailyIds, date);
  const streak = keptStreak(model.log, model.dailyIds);

  // a habit's own button: what the search found opens in the app (a guest is asked to sign in first)
  const openLink = (l: HabitLink) => {
    if (l.kind !== 'find') return;
    const state = l.section ? access.section(l.section as Parameters<typeof access.section>[0]) : 'open';
    if (state === 'locked') { askSignIn(l.title); return; }
    if (state === 'hidden' || state === 'soon') return;
    leaveFor(() => openTarget(l.open));
  };

  // one window per habit: 'habit:<id>' is its page, 'edit:<id>' its settings ✏️
  const habitId = sheet?.startsWith('habit:') ? sheet.slice(6) : null;
  const editId = user && sheet?.startsWith('edit:') ? sheet.slice(5) : null;
  const windowId = habitId ?? editId;
  const addTo = user && sheet?.startsWith('add:') ? sheet.slice(4) : null;
  const edit: ListEdit | undefined = user
    ? {
        add: col => open(`add:${col === 0 ? 'daily' : 'weekly'}`),
        reorder: col => <HabitsReorder mine={mine} groups={col === 0 ? dailyOf(mine.groups) : rareOf(mine.groups)} />,
      }
    : undefined;

  const props: ViewProps = {
    model,
    date,
    onDate: setDate,
    onPickDay: d => { setDate(d); setView('day'); },
    onOpenPrayer: id => leaveFor(() => openPrayer(id)),
    onLink: openLink,
    edit,
  };

  return (
    <div className="space-y-4 text-[#2a2017]">
      {/* the title on the path page too, with the chosen day's count and the run of kept days under it, and the view
          menu at its right; only the window has ✕ */}
      <div className="flex items-center gap-3">
        <span className={PATH_ICON}>
          <Sparkles className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] sm:text-base font-black leading-tight text-[#2a2017]">ჩვევები</h3>
          {view === 'day' && day.total > 0 && (
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12.5px] font-semibold leading-snug text-[#8a7a6a] tabular-nums">
              <span>{onToday ? 'დღეს' : `${date.getDate()} ${MONTHS_GE[date.getMonth()]}`} {day.done} / {day.total}</span>
              {streak.days > 0 && (
                <span className="inline-flex items-center gap-0.5 font-bold text-[#b4441c]">
                  <Flame className="w-3.5 h-3.5 shrink-0" />
                  ზედიზედ {streak.days}
                  {streak.capped ? '+' : ''}
                </span>
              )}
            </p>
          )}
        </div>
        <ViewMenu value={view} onChange={setView} onInfo={openInfo} />
        {onClose && (
          <IconBtn label="დახურვა" onClick={onClose}>
            <X />
          </IconBtn>
        )}
      </div>

      <div key={view} className="animate-in fade-in duration-200">
        {VIEWS.find(v => v.id === view)!.render(props)}
      </div>

      <Sheet open={sheet === 'info'} onClose={close} title="განმარტება">
        <HabitsInfo />
      </Sheet>

      <Sheet
        open={!!windowId}
        onClose={close}
        wide
        title={
          !windowId ? '' : editId ? (
            <span className="flex items-center gap-1 min-w-0">
              <IconBtn label="უკან" className="-ml-2" onClick={() => swap(`habit:${editId}`)}>
                <ArrowLeft />
              </IconBtn>
              <HabitPageTitle model={model} id={editId} />
            </span>
          ) : (
            <span className="flex items-center gap-1 min-w-0">
              <span className="flex-1 min-w-0">
                <HabitPageTitle model={model} id={windowId} />
              </span>
              {user && (
                <IconBtn label="ჩვევის შეცვლა" onClick={() => swap(`edit:${windowId}`)}>
                  <Pencil />
                </IconBtn>
              )}
            </span>
          )
        }
        footer={editId ? <Btn full icon={<Check />} onClick={() => swap(`habit:${editId}`)}>მზადაა</Btn> : undefined}
      >
        {editId ? <HabitCardEditor mine={mine} id={editId} onRemoved={close} /> : habitId && <HabitPage model={model} id={habitId} date={date} />}
      </Sheet>

      <Sheet open={!!addTo} onClose={close} title="ახალი ჩვევა">
        {addTo && <AddHabitPanel mine={mine} group={addTo} onDone={close} />}
      </Sheet>

      {blessing}
    </div>
  );
};
