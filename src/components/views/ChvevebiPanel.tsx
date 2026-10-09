import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Flame, Info, Pencil, Sparkles, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { HabitGroupType } from '../../data/habitsAndManera';
import { useAuth, useChants, useModal, useNavigation } from '../../context';
import { useMyHabits } from '../../hooks/useMyHabits';
import { useAccess } from '../../hooks/useAccess';
import { HabitLink, MyHabit, MyHabitGroup } from '../../utils/myHabits';
import { askSignIn } from '../access/SignInPrompt';
import { useOpenSearchTarget } from '../search/openSearchTarget';
import { HabitLinkChip } from './HabitLinks';
import { HabitLog, dayKey, dayNeeds, doneOn, keptStreak, lastDays, timesThisPeriod } from '../../utils/habitsWeek';
import { triggerHaptic } from '../../utils/haptics';
import { IconBtn, Sheet } from '../ui/kit';
import { HabitPrayerMenu } from './HabitPrayerMenu';
import { HabitsEditor } from './HabitsEditor';
import { PATH_ICON } from './IndependentWorkCard';
import { StreakDay, WeekStreak } from './WeekStreak';

// the home page buttons open the same menus
export { HabitPrayerMenu };

// each member's own list (utils/myHabits): the daily groups, and the weekly and monthly ones
const dailyOf = (groups: HabitGroupType[]) => groups.filter(g => g.goal.per === 'day');
const rareOf = (groups: HabitGroupType[]) => groups.filter(g => g.goal.per !== 'day');
const dailyIdsOf = (groups: HabitGroupType[]) => dailyOf(groups).flatMap(g => g.items.map(h => h.id));

const celebrate = () => {
  try {
    const colors = ['#7a2028', '#f3c969', '#10b981', '#fbf6ec'];
    confetti({ particleCount: 90, spread: 70, startVelocity: 45, origin: { y: 0.7 }, colors });
    confetti({ particleCount: 50, spread: 110, decay: 0.92, scalar: 0.9, origin: { y: 0.7 }, colors });
  } catch {
    /* confetti is decoration only */
  }
};

const Blessing: React.FC = () => (
  <div className="fixed inset-x-0 bottom-8 z-[90] flex justify-center px-4 pointer-events-none safe-bottom">
    <div className="px-6 py-3.5 rounded-full bg-[#7a2028] text-[#fbf6ec] font-serif-ge text-lg font-bold shadow-[0_12px_32px_-10px_rgba(122,32,40,0.6)] animate-in fade-in slide-in-from-bottom-4 zoom-in-95 duration-300">
      ღმერთს ებარებოდე! 🙏
    </div>
  </div>
);

/** Ticks or unticks a habit for today. The tick that completes all of the day's habits sets off fireworks
 *  and a blessing — render `blessing` on the page. */
export const useHabitToggle = () => {
  const { habitLog, toggleHabitToday } = useChants();
  const { user } = useAuth();
  const DAILY_IDS = dailyIdsOf(useMyHabits(user?.uid).groups);
  const [blessing, setBlessing] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const toggle = (id: string) => {
    if (!toggleHabitToday(id)) return false;
    triggerHaptic(12);
    const today = new Set([...(habitLog[dayKey(new Date())] || []), id]);
    if (DAILY_IDS.includes(id) && DAILY_IDS.every(h => today.has(h))) {
      celebrate();
      setBlessing(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setBlessing(false), 2800);
    }
    return true;
  };
  return { toggle, blessing: blessing ? <Blessing /> : null };
};

// The sheet open over the habits (a habit's prayers, or 'info') lives in the history entry: the phone's
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

// Today's habits as a ring: ticked of all daily ones
const Ring: React.FC<{ value: number; max: number }> = ({ value, max }) => {
  const r = 25;
  const length = 2 * Math.PI * r;
  return (
    <div className="relative w-[60px] h-[60px] shrink-0" role="img" aria-label={`დღეს ${value} / ${max}`}>
      <svg viewBox="0 0 60 60" className="w-full h-full -rotate-90">
        <circle cx="30" cy="30" r={r} fill="none" stroke="#efe5d4" strokeWidth="6" />
        {value > 0 && (
          <circle
            cx="30"
            cy="30"
            r={r}
            fill="none"
            stroke="#7a2028"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={length}
            strokeDashoffset={length * (1 - Math.min(1, value / max))}
            className="transition-[stroke-dashoffset] duration-500"
          />
        )}
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-[17px] font-black tabular-nums text-[#2a2017]">
          {value}
          <span className="text-[11px] font-bold text-[#a08a76]">/{max}</span>
        </span>
        <span className="mt-1 text-[9.5px] font-bold text-[#8a7a6a]">დღეს</span>
      </span>
    </div>
  );
};

// The day at a glance: the ring, what is left for the day to count, the last 7 days and the run of counted days.
// `actions` (✏️ ⓘ) stand at the right of the status line.
const TodayCard: React.FC<{ log: HabitLog; dailyIds: string[]; actions?: React.ReactNode }> = ({ log, dailyIds: DAILY_IDS, actions }) => {
  const total = Math.max(1, DAILY_IDS.length);
  const need = dayNeeds(total);
  const done = doneOn(log, DAILY_IDS, new Date());
  const streak = keptStreak(log, DAILY_IDS);
  const days: StreakDay[] = lastDays(7).map(date => {
    const n = doneOn(log, DAILY_IDS, date);
    return { date, mark: n >= need ? 'done' : n > 0 ? 'partial' : 'open', note: `${n} / ${total}` };
  });
  const status =
    done >= total ? 'დღეს ყველა შესრულდა 🙏' : done >= need ? 'დღე ჩაითვალა ✓' : `კიდევ ${need - done} — და დღე ჩაითვლება`;
  return (
    <div className="flex items-center gap-3.5 rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] p-3">
      <Ring value={done} max={total} />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-start gap-1">
          <p className="flex-1 min-w-0 pt-0.5 text-[14px] font-bold leading-snug text-[#2a2017]">{status}</p>
          {actions && <div className="-mt-1.5 -mr-1.5 flex shrink-0">{actions}</div>}
        </div>
        <WeekStreak days={days} />
        {streak.days > 0 && (
          <p className="flex items-center gap-1 text-[12.5px] font-bold text-[#b4441c]">
            <Flame className="w-4 h-4 shrink-0" />
            ზედიზედ {streak.days}{streak.capped ? '+' : ''} დღე
          </p>
        )}
      </div>
    </div>
  );
};

// "ამ თვეში 1 / 2" under a weekly or monthly habit; green once the goal is met
const PeriodNote: React.FC<{ count: number; goal: HabitGroupType['goal'] }> = ({ count, goal }) => {
  const label = goal.per === 'week' ? 'ამ კვირას' : 'ამ თვეში';
  return count >= goal.times ? (
    <span className="inline-flex items-center gap-1 text-[12px] font-bold text-emerald-700">
      <Check className="w-3.5 h-3.5 stroke-[3]" />
      {count > 1 ? `${label} ${count}-ჯერ` : label}
    </span>
  ) : (
    <span className="text-[12px] font-semibold tabular-nums text-[#8a7a6a]">
      {label} {count} / {goal.times}
    </span>
  );
};

// One habit: the circle ticks today; a tap on the name unfolds the habit's prayers and its own buttons under it
// (one without either is ticked by its name too); ⓘ unfolds the member's note. `week`: a daily habit's days of the last 7, in small type.
const HabitRow: React.FC<{
  habit: MyHabit;
  on: boolean;
  sub?: React.ReactNode;
  week?: number;
  onToggle: () => void;
  onOpenPrayer: (prayerId: string) => void;
  onLink: (l: HabitLink) => void;
}> = ({ habit, on, sub, week, onToggle, onOpenPrayer, onLink }) => {
  const [noteOpen, setNoteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const links = habit.links || [];
  const folds = !!habit.menu || links.length > 0;
  return (
    <li className={`transition-colors ${on ? 'bg-[#7a2028]/[0.045]' : ''}`}>
      <div className="flex items-center">
        <button
          type="button"
          role="checkbox"
          aria-checked={on}
          aria-label={`${habit.label} — დღეს`}
          onClick={onToggle}
          className="w-12 min-h-[52px] shrink-0 flex items-center justify-end pr-2 cursor-pointer select-none group"
        >
          <span
            className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center transition-colors ${
              on ? 'bg-[#7a2028] text-[#fbf6ec] shadow-[0_3px_8px_-4px_rgba(122,32,40,0.8)]' : 'ring-2 ring-[#d9c8ac] bg-white group-hover:ring-[#7a2028]/45'
            }`}
          >
            {on && <Check className="w-4 h-4 stroke-[3] animate-in zoom-in-50 duration-200" />}
          </span>
        </button>
        <button
          type="button"
          onClick={folds ? () => setMenuOpen(o => !o) : onToggle}
          aria-expanded={folds ? menuOpen : undefined}
          className="flex-1 min-w-0 min-h-[52px] py-2 pl-1 pr-2 text-left cursor-pointer select-none"
        >
          <span className="flex items-center gap-1 text-[15px] font-medium leading-snug text-[#2a2017]">
            {habit.label}
            {folds && <ChevronDown className={`w-4 h-4 shrink-0 text-[#b8a68e] transition-transform ${menuOpen ? "rotate-180" : ""}`} />}
          </span>
          {sub && <span className="block mt-0.5 leading-none">{sub}</span>}
        </button>
        {week !== undefined && (
          <span
            title="ბოლო 7 დღეში"
            className={`shrink-0 ${habit.note ? 'px-1' : 'pl-1 pr-3.5'} text-[11.5px] font-bold tabular-nums ${week === 7 ? 'text-emerald-700' : 'text-[#a4927c]'}`}
          >
            {week}/7
          </span>
        )}
        {habit.note && (
          <button
            type="button"
            onClick={() => setNoteOpen(o => !o)}
            aria-expanded={noteOpen}
            aria-label={`${habit.label} — ჩანაწერი`}
            title="ჩანაწერი"
            className={`w-10 h-10 mr-1.5 shrink-0 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
              noteOpen ? 'bg-[#7a2028]/[0.1] text-[#7a2028]' : 'text-[#a08a76] hover:text-[#7a2028] hover:bg-[#7a2028]/[0.06]'
            }`}
          >
            <Info className="w-[17px] h-[17px]" />
          </button>
        )}
      </div>
      {menuOpen && habit.menu && (
        <div className="px-3 pb-4 pt-1 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
          {habit.hint && <p className="px-0.5 text-[12.5px] font-medium text-[#8a7a6a]">{habit.hint}</p>}
          <HabitPrayerMenu menu={habit.menu} onOpen={onOpenPrayer} />
        </div>
      )}
      {(noteOpen || (menuOpen && links.length > 0)) && (
        <div className="pl-[52px] pr-3 pb-3 -mt-1 space-y-2">
          {noteOpen && habit.note && (
            <p className="border-l-2 border-[#e3cfae] pl-2.5 font-serif-ge text-[12.5px] italic leading-relaxed text-[#7a6656] whitespace-pre-line break-words animate-in fade-in duration-200">
              {habit.note}
            </p>
          )}
          {menuOpen && links.length > 0 && (
            <div className="flex flex-wrap gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
              {links.map((l, i) => (
                <HabitLinkChip key={i} link={l} onOpen={() => onLink(l)} />
              ))}
            </div>
          )}
        </div>
      )}
    </li>
  );
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
        <li>• წრეს შეეხე — ჩვევა მოინიშნება დღეს. ხელახლა შეხება მონიშვნას მოხსნის.</li>
        <li>
          • ჩვევის სახელს შეეხე — ქვემოთ ჩამოიშლება მისი ლოცვები და წასაკითხი. ლოცვის ბოლოს „წავიკითხე“ ჩვევასაც
          მონიშნავს.
        </li>
        <li>
          • <Pencil className="inline w-4 h-4 -mt-0.5 text-[#7a2028]" /> — შენი სია: რიგი, დამატება, წაშლა, ლოცვა, სხვა ღილაკები (ძებნით ან ლინკით) და ჩანაწერი.
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

// "ჩვევები" for students: today's ring and week, the daily habits, then the weekly and monthly ones.
// A tap on a habit ticks today (teachers see the ticks in their panels); the book button opens its prayers
// in a sheet. Finishing the whole day sets off fireworks and a blessing.
export const ChvevebiContent: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { habitLog } = useChants();
  const todayDone = habitLog[dayKey(new Date())] || [];
  const { toggle, blessing } = useHabitToggle();
  const { openPrayer } = useNavigation();
  const { activeModal, closeModal } = useModal();
  const { sheet, open, close } = useHabitSheet();
  const [seen, setSeen] = useState(introSeen);
  const { user } = useAuth();
  const mine = useMyHabits(user?.uid);
  const [editing, setEditing] = useState(false);
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

  const week = lastDays(7).map(d => habitLog[dayKey(d)] || []);
  const rows = (group: MyHabitGroup) =>
    group.items.map(h => (
      <HabitRow
        key={h.id}
        habit={h}
        on={todayDone.includes(h.id)}
        sub={group.goal.per === 'day' ? undefined : <PeriodNote count={timesThisPeriod(habitLog, h.id, group.goal.per)} goal={group.goal} />}
        week={group.goal.per === 'day' ? week.filter(ids => ids.includes(h.id)).length : undefined}
        onToggle={() => toggle(h.id)}
        onOpenPrayer={id => leaveFor(() => openPrayer(id))}
        onLink={openLink}
      />
    ));

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
          <TodayCard
            log={habitLog}
            dailyIds={dailyIdsOf(mine.groups)}
            actions={
              <>
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
            }
          />

          {/* the daily habits beside the weekly and monthly ones; one column on a phone */}
          <div className="@container">
            <div className="grid gap-4 @lg:grid-cols-2 items-start">
              {[dailyOf(mine.groups), rareOf(mine.groups)].map((groups, i) =>
                groups.some(g => g.items.length) ? (
                  <section key={i}>
                    <h4 className="px-1 pb-1.5 font-serif-ge text-[15px] font-bold text-[#7a2028]">{i === 0 ? 'ყოველდღე' : 'კვირაში და თვეში'}</h4>
                    <ul className="rounded-2xl ring-1 ring-[#e8dcc8] bg-white divide-y divide-[#f1e8d9] overflow-hidden">{groups.flatMap(rows)}</ul>
                  </section>
                ) : null
              )}
            </div>
          </div>
        </>
      )}

      <Sheet open={sheet === 'info'} onClose={close} title="განმარტება">
        <HabitsInfo groups={mine.groups} />
      </Sheet>

      {blessing}
    </div>
  );
};
