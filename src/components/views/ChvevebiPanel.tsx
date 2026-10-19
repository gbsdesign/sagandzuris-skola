import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Flame, Info, Pencil, Plus, Sparkles, X } from 'lucide-react';
import { useAuth, useModal, useNavigation } from '../../context';
import { useMyHabits } from '../../hooks/useMyHabits';
import { useAccess } from '../../hooks/useAccess';
import { HabitLink, MyHabitGroup } from '../../utils/myHabits';
import { askSignIn } from '../access/SignInPrompt';
import { useOpenSearchTarget } from '../search/openSearchTarget';
import { dayNeeds } from '../../utils/habitsWeek';
import { triggerHaptic } from '../../utils/haptics';
import { IconBtn, Sheet } from '../ui/kit';
import { HabitPrayerMenu } from './HabitPrayerMenu';
import { HabitsEditor } from './HabitsEditor';
import { PATH_ICON } from './IndependentWorkCard';
import { DayView } from '../habits/DayView';
import { WeekView } from '../habits/WeekView';
import { MonthView } from '../habits/MonthView';
import { YearView } from '../habits/YearView';
import { HabitPage, HabitPageTitle } from '../habits/HabitPage';
import { HabitsModel, dailyIdsOf, rareOf, useHabitToggle, useHabitsModel } from '../habits/useHabits';

// the home page buttons open the same menus; the prayer page ticks through the same toggle
export { HabitPrayerMenu, useHabitToggle };

// The sheet open over the habits (a habit's page, its prayers, or 'info') lives in the history entry: the phone's
// back closes it, and coming back from a prayer opened in it shows it again.
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
  return { sheet, open, close };
};

const INFO_TITLE = 'mb-1.5 font-serif-ge text-[15px] font-bold text-[#7a2028]';

// "ⓘ": what the habits are for, how ticking works, and each habit's measure
const HabitsInfo: React.FC<{ groups: MyHabitGroup[] }> = ({ groups }) => {
  const DAILY_IDS = dailyIdsOf(groups);
  return (
  <div className="space-y-5 text-[14px] leading-relaxed text-[#4a3426]">
    <div className="space-y-2">
      <p>ნიადაგი არის ის, რაშიც მყარად არის „ჩაფლული“ საძირკველი, ხოლო საძირკველზე დგას შენობა — ანუ მგალობლის შემოქმედება.</p>
      <p>
        სწორი ნიადაგის მომზადების გარეშე ვერ დამყარდება ვერც საძირკველი და ვერც მგალობლის შემოქმედება. ქვემოთ მოცემულია ჩვევები,
        რომლებიც საჭიროა სწორი სულიერი ნიადაგის მოსამზადებლად.
      </p>
    </div>
    <div>
      <h4 className={INFO_TITLE}>როგორ მოვნიშნო</h4>
      <ul className="space-y-1.5">
        <li>• წრეს შეეხე — ჩვევა მოინიშნება. ხელახლა შეხება მონიშვნას მოხსნის.</li>
        <li>
          • დაგავიწყდა? ზედა ზოლში აირჩიე წინა დღე (ბოლო 7 დღე) და მონიშნე. უფრო ძველი დღეები აღარ იცვლება.
        </li>
        <li>
          • ჩვევის სახელს შეეხე — ქვემოთ ჩამოიშლება მისი ლოცვები და წასაკითხი. ლოცვის ბოლოს „წავიკითხე“ ჩვევასაც
          მონიშნავ.
        </li>
        <li>
          • <ChevronRight className="inline w-4 h-4 -mt-0.5 text-[#7a2028]" /> — ჩვევის გვერდი: ზედიზედ დღეები, საუკეთესო სერია,
          კალენდარი და წელი. <Plus className="inline w-4 h-4 -mt-0.5 text-[#7a2028]" /> — მთვლელი (მაგ. იესოს ლოცვა): მიზანს რომ
          მიაღწევ, ჩვევა თავად მოინიშნება; ზოლის გვერდით რიცხვზე დაჭერით ზუსტ რაოდენობას ჩაწერ.
        </li>
        <li>• „დღე ▾“ — აქ აირჩევ კვირას, თვეს ან წელს: ყველა ჩვევა ერთად — კვირის ბადე, თვის კალენდარი და წლის რუკა.</li>
        <li>
          • <Pencil className="inline w-4 h-4 -mt-0.5 text-[#7a2028]" /> — შენი სია: რიგი, დამატება, წაშლა, ფერი და ხატულა, მთვლელი,
          ლოცვა, სხვა ღილაკები (ძებნით ან ლინკით) და ჩანაწერი.
        </li>
        <li>
          • დღე ჩაითვლება, როცა დღის ჩვევების ნახევარი მაინც შესრულდება ({dayNeeds(DAILY_IDS.length)} / {DAILY_IDS.length}).{' '}
          <Flame className="inline w-4 h-4 -mt-0.5 text-[#b4441c]" /> — ზედიზედ ჩათვლილი დღეები.
        </li>
        <li>• კვირის ჩვევები ითვლება კვირა დღიდან, თვისა — თვის პირველი რიცხვიდან.</li>
      </ul>
    </div>
    <div>
      <h4 className={INFO_TITLE}>ზომა</h4>
      <ul className="space-y-1.5">
        {groups.flatMap(g => g.items).filter(h => h.hint).map(h => (
          <li key={h.id}>
            • <b className="font-semibold text-[#2a2017]">{h.label}</b> — {h.hint}
          </li>
        ))}
        {/* the sacraments have no measure of their own here */}
        {rareOf(groups).filter(g => g.id !== 'sacraments' && g.items.length).map(g => (
          <li key={g.id}>
            • <b className="font-semibold text-[#2a2017]">{g.title}</b> — {g.items.map(h => h.label).join(', ')}
          </li>
        ))}
      </ul>
    </div>
  </div>
  );
};

// the explanation's button carries a dot until it has been opened once
const INTRO_SEEN_KEY = 'habitsIntroSeen';
const introSeen = () => {
  try {
    return localStorage.getItem(INTRO_SEEN_KEY) === '1';
  } catch {
    return false;
  }
};

// The habits' views. A new view is one entry here: it gets the shared model (components/habits/useHabits) and the
// few page actions below.
type ViewId = 'day' | 'week' | 'month' | 'year';
interface ViewProps {
  model: HabitsModel;
  date: Date;
  onDate: (d: Date) => void;
  /** opens a day in "დღე" to tick it */
  onPickDay: (d: Date) => void;
  actions: React.ReactNode;
  onOpenPrayer: (prayerId: string) => void;
  onLink: (l: HabitLink) => void;
}
const VIEWS: { id: ViewId; label: string; render: (p: ViewProps) => React.ReactNode }[] = [
  { id: 'day', label: 'დღე', render: p => <DayView model={p.model} date={p.date} onDate={p.onDate} actions={p.actions} onOpenPrayer={p.onOpenPrayer} onLink={p.onLink} /> },
  { id: 'week', label: 'კვირა', render: p => <WeekView model={p.model} onPickDay={p.onPickDay} /> },
  { id: 'month', label: 'თვე', render: p => <MonthView model={p.model} onPickDay={p.onPickDay} /> },
  { id: 'year', label: 'წელი', render: p => <YearView model={p.model} /> },
];

// „დღე ▾“ before ✏️: one button with the view's name; a tap drops the views in a small list under it
const ViewMenu: React.FC<{ value: ViewId; onChange: (v: ViewId) => void }> = ({ value, onChange }) => {
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
    <span ref={box} className="relative mr-1">
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
        </div>
      )}
    </span>
  );
};

// "ჩვევები" for students: the day (its ring, the last seven days, the habits), the week, the month and the year.
// A tap on a habit ticks the chosen day (teachers see the ticks in their panels); „›“ opens the habit's own page.
// Finishing the whole of today sets off fireworks and a blessing.
export const ChvevebiContent: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { openPrayer } = useNavigation();
  const { activeModal, closeModal } = useModal();
  const { sheet, open, close } = useHabitSheet();
  const { model, blessing } = useHabitsModel(id => open(`habit:${id}`));
  const [seen, setSeen] = useState(introSeen);
  const { user } = useAuth();
  const mine = useMyHabits(user?.uid);
  const [editing, setEditing] = useState(false);
  const [view, setView] = useState<ViewId>('day');
  const [date, setDate] = useState(() => new Date());
  const access = useAccess();
  const openTarget = useOpenSearchTarget();

  const leaveFor = (go: () => void) => {
    if (activeModal) closeModal();
    go();
  };
  const openInfo = () => {
    setSeen(true);
    try { localStorage.setItem(INTRO_SEEN_KEY, '1'); } catch { /* it shows its name again next time */ }
    open('info');
  };

  // a habit's own button: what the search found opens in the app (a guest is asked to sign in first)
  const openLink = (l: HabitLink) => {
    if (l.kind !== 'find') return;
    const state = l.section ? access.section(l.section as Parameters<typeof access.section>[0]) : 'open';
    if (state === 'locked') { askSignIn(l.title); return; }
    if (state === 'hidden' || state === 'soon') return;
    leaveFor(() => openTarget(l.open));
  };

  const habitId = sheet?.startsWith('habit:') ? sheet.slice(6) : null;
  const actions = (
    <>
      <ViewMenu value={view} onChange={setView} />
      {user && (
        <IconBtn label="ჩვევების შეცვლა" onClick={() => setEditing(true)}>
          <Pencil />
        </IconBtn>
      )}
      <span className="relative">
        <IconBtn label="განმარტება" onClick={openInfo}>
          <Info />
        </IconBtn>
        {!seen && <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#7a2028] ring-2 ring-[#fbf6ec] pointer-events-none" aria-hidden />}
      </span>
    </>
  );
  const props: ViewProps = {
    model,
    date,
    onDate: setDate,
    onPickDay: d => { setDate(d); setView('day'); },
    actions,
    onOpenPrayer: id => leaveFor(() => openPrayer(id)),
    onLink: openLink,
  };

  return (
    <div className="space-y-4 text-[#2a2017]">
      {/* on the path page the tab already says "ჩვევები"; the window keeps its own title and ✕ */}
      {onClose && (
        <div className="flex items-center gap-3">
          <span className={PATH_ICON}>
            <Sparkles className="w-5 h-5" />
          </span>
          <h3 className="flex-1 min-w-0 text-[15px] sm:text-base font-black leading-tight text-[#2a2017]">ჩვევები</h3>
          <IconBtn label="დახურვა" onClick={onClose}>
            <X />
          </IconBtn>
        </div>
      )}

      {editing ? (
        <HabitsEditor mine={mine} sheet={sheet} openSheet={open} closeSheet={close} onDone={() => setEditing(false)} />
      ) : (
        <>
          {/* the day keeps its buttons in its card; the other views get them at the top right */}
          {view !== 'day' && <div className="flex items-center justify-end mb-2">{actions}</div>}
          <div key={view} className="animate-in fade-in duration-200">
            {VIEWS.find(v => v.id === view)!.render(props)}
          </div>
        </>
      )}

      <Sheet open={sheet === 'info'} onClose={close} title="განმარტება">
        <HabitsInfo groups={mine.groups} />
      </Sheet>

      <Sheet open={!!habitId} onClose={close} title={habitId ? <HabitPageTitle model={model} id={habitId} /> : ''} wide>
        {habitId && <HabitPage model={model} id={habitId} date={date} />}
      </Sheet>

      {blessing}
    </div>
  );
};
