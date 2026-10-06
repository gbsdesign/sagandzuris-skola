import React, { useEffect, useRef, useState } from 'react';
import { Bell, Check, ChevronDown, ChevronRight, Moon, ScrollText, Search, Sun } from 'lucide-react';
import confetti from 'canvas-confetti';
import { HABIT_GROUPS, HabitGroupType, HabitMenu } from '../../data/habitsAndManera';
import {
  AKATHISTS,
  AKATHIST_GROUPS,
  APOSTLE,
  BibleBook,
  GOSPELS,
  KATHISMAS,
  MORNING_EVENING,
  PRAYER_HOURS,
  PSALTER_RULE,
  WEEK_DAYS,
  bibleChapterId,
  hourClock,
  weekPrayerId,
} from '../../data/prayers';
import { useCommemoration } from '../../utils/commemoration';
import { useChants, useModal, useNavigation } from '../../context';
import { HabitLog, dayKey, habitPercent, lastDays } from '../../utils/habitsWeek';
import { useReminders } from '../../utils/prayerReminders';
import { WeekStreak } from './WeekStreak';

// the habit menu left open, so coming back from a prayer shows the same list
let lastOpenMenu: string | null = null;

const CHIP =
  'rounded-lg bg-[#fbf6ec] ring-1 ring-[#e8dcc8] text-[#4a3426] hover:ring-[#7a2028]/40 hover:text-[#7a2028] transition-colors cursor-pointer active:scale-[0.98]';

// The prayers a habit opens: morning/evening (with the weekday prayers), the seven hours, the akathists.
const HabitPrayerMenu: React.FC<{ menu: HabitMenu; onOpen: (prayerId: string) => void }> = ({ menu, onOpen }) => {
  const reminders = useReminders();
  const now = new Date();
  const today = now.getDay();

  if (menu === 'morning-evening') {
    return (
      <div className="space-y-2.5">
        <div className="grid grid-cols-2 gap-1.5">
          {MORNING_EVENING.map(p => (
            <button key={p.id} type="button" onClick={() => onOpen(p.id)} className={`${CHIP} flex items-center justify-center gap-1.5 px-2 py-2.5 text-[13px] font-semibold`}>
              {p.id === 'dila' ? <Sun className="w-4 h-4 text-[#c08a2a]" /> : <Moon className="w-4 h-4 text-[#6b5b8a]" />}
              {p.id === 'dila' ? 'დილის' : 'საღამოს'}
            </button>
          ))}
        </div>
        <div>
          <p className="px-0.5 pb-1 text-[12px] font-bold text-[#8a7a6a]">შვიდეულის დღეთა ლოცვები</p>
          <div className="space-y-1">
            {WEEK_DAYS.map((day, i) => (
              <div key={day} className={`flex items-center gap-1.5 rounded-lg px-2 py-1 ${i === today ? 'bg-[#7a2028]/[0.07]' : ''}`}>
                <span className={`flex-1 min-w-0 text-[13px] ${i === today ? 'font-bold text-[#7a2028]' : 'text-[#4a3426]'}`}>
                  {day}
                  {i === today && <span className="ml-1 text-[11px] font-semibold">· დღეს</span>}
                </span>
                <button type="button" onClick={() => onOpen(weekPrayerId(i, 'dila'))} className={`${CHIP} px-2.5 py-1.5 text-[12px] font-semibold`}>
                  დილით
                </button>
                <button type="button" onClick={() => onOpen(weekPrayerId(i, 'dzili'))} className={`${CHIP} px-2.5 py-1.5 text-[12px] font-semibold`}>
                  დაწოლისას
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (menu === 'hours') {
    // the next hour to come is marked, wrapping past midnight to 06:00
    const minutesNow = now.getHours() * 60 + now.getMinutes();
    const order = [...PRAYER_HOURS].sort((a, b) => a.hour - b.hour);
    const next = order.find(h => h.hour * 60 > minutesNow) ?? order[0];
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {PRAYER_HOURS.map(h => {
          const isNext = h.id === next.id;
          const hasReminder = (reminders[h.id] || []).length > 0;
          return (
            <button
              key={h.id}
              type="button"
              onClick={() => onOpen(h.id)}
              className={`${CHIP} flex items-center gap-2 px-2.5 py-2 text-left ${isNext ? '!ring-[#7a2028]/45 !bg-[#7a2028]/[0.07]' : ''}`}
            >
              <span className={`w-12 shrink-0 font-bold tabular-nums text-[13px] ${isNext ? 'text-[#7a2028]' : 'text-[#4a3426]'}`}>{hourClock(h)}</span>
              <span className="flex-1 min-w-0 text-[13px]">{h.label}</span>
              {hasReminder && <Bell className="w-3.5 h-3.5 shrink-0 text-[#7a2028]" aria-label="შეხსენება ჩართულია" />}
            </button>
          );
        })}
      </div>
    );
  }

  if (menu === 'gospel') return <BibleBooks books={GOSPELS} onOpen={onOpen} />;
  if (menu === 'apostle') return <BibleBooks books={APOSTLE} onOpen={onOpen} />;

  if (menu === 'jesus') {
    return (
      <div className="space-y-2.5 text-[#2a2017]">
        <p className="rounded-lg bg-[#fbf6ec] ring-1 ring-[#e8dcc8] px-3 py-2.5 text-center font-serif-ge text-[16px] leading-relaxed text-[#7a2028] font-semibold">
          უფალო იესო ქრისტე, ძეო ღმრთისაო, შემიწყალე მე ცოდვილი.
        </p>
        <div className="px-0.5 space-y-1.5 text-[13px] leading-relaxed text-[#4a3426]">
          <p>
            <span className="font-bold text-[#7a2028]">სხვისთვის ლოცვისას</span> ამბობენ: „უფალო იესო ქრისტე, ძეო ღმრთისაო, შეიწყალე{' '}
            <span className="italic text-[#8a7a6a]">(სახელი)</span>“.
          </p>
          <p className="text-[12px] text-[#8a7a6a]">
            თქვი წყნარად და გაუჩქარებლად, ყურადღებით სიტყვებზე — სადაც უნდა იყო: გზაში, საქმის დროს, დასაძინებლად წოლისას.
          </p>
        </div>
      </div>
    );
  }

  if (menu === 'psalms') {
    return (
      <div className="space-y-2">
        <button type="button" onClick={() => onOpen(PSALTER_RULE.id)} className={`${CHIP} w-full px-3 py-2 text-left text-[13px] font-semibold`}>
          📖 {PSALTER_RULE.title} — დასაწყისი და დასასრულის ლოცვები
        </button>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {KATHISMAS.map(k => (
            <button key={k.id} type="button" onClick={() => onOpen(k.id)} className={`${CHIP} px-2 py-1.5 text-left`}>
              <span className="block text-[13px] font-bold">{k.title}</span>
              <span className="block text-[11px] text-[#8a7a6a]">ფს. {k.psalms}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return <AkathistMenu onOpen={onOpen} />;
};

// Books of the Gospel or the Apostle; a book unfolds its chapters.
let lastOpenBook: string | null = null;
const BibleBooks: React.FC<{ books: BibleBook[]; onOpen: (id: string) => void }> = ({ books, onOpen }) => {
  const [openBook, setOpenBook] = useState<string | null>(() => (books.some(b => b.id === lastOpenBook) ? lastOpenBook : null));
  const toggle = (id: string) => {
    const next = openBook === id ? null : id;
    lastOpenBook = next;
    setOpenBook(next);
  };
  return (
    <div className="space-y-1.5">
      {books.map(book => {
        const expanded = openBook === book.id;
        return (
          <div key={book.id} className={`rounded-lg ring-1 ${expanded ? 'ring-[#7a2028]/30 bg-[#fbf6ec]' : 'ring-[#e8dcc8] bg-[#fbf6ec]/70'}`}>
            <button
              type="button"
              onClick={() => (book.chapters === 1 ? onOpen(bibleChapterId(book.id, 1)) : toggle(book.id))}
              className="w-full flex items-center gap-2 px-3 py-2 text-left cursor-pointer group"
            >
              <span className="flex-1 min-w-0 text-[13px] font-semibold text-[#4a3426] group-hover:text-[#7a2028]">{book.title}</span>
              <span className="text-[11px] text-[#8a7a6a]">{book.chapters === 1 ? '1 თავი' : `${book.chapters} თავი`}</span>
              {book.chapters > 1 && <ChevronDown className={`w-4 h-4 text-[#b5a48c] transition-transform ${expanded ? 'rotate-180' : ''}`} />}
            </button>
            {expanded && (
              <div className="grid grid-cols-7 sm:grid-cols-10 gap-1 px-2 pb-2">
                {Array.from({ length: book.chapters }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onOpen(bibleChapterId(book.id, i + 1))}
                    className="h-9 rounded-md bg-white ring-1 ring-[#e8dcc8] text-[13px] font-semibold tabular-nums text-[#4a3426] hover:text-[#7a2028] hover:ring-[#7a2028]/40 cursor-pointer active:scale-95"
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// 73 akathists in groups, with a search box.
const AkathistMenu: React.FC<{ onOpen: (id: string) => void }> = ({ onOpen }) => {
  const [query, setQuery] = useState('');
  const q = query.trim();
  const groups = AKATHIST_GROUPS.map(g => ({ ...g, items: q ? g.items.filter(p => p.title.includes(q)) : g.items })).filter(g => g.items.length);
  return (
    <div className="space-y-2.5">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#b5a48c]" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={`ძებნა (${AKATHISTS.length} დაუჯდომელი)`}
          className="w-full h-10 pl-8 pr-3 rounded-lg bg-[#fbf6ec] ring-1 ring-[#e8dcc8] focus:ring-2 focus:ring-[#7a2028]/35 outline-none text-[13px] text-[#2a2017] placeholder:text-[#b5a48c]"
        />
      </div>
      {groups.map(g => (
        <div key={g.title}>
          <p className="px-0.5 pb-1 text-[12px] font-bold text-[#8a7a6a]">{g.title}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {g.items.map(p => (
              <button key={p.id} type="button" onClick={() => onOpen(p.id)} className={`${CHIP} px-2.5 py-2 text-left text-[13px] leading-snug`}>
                {p.title}
              </button>
            ))}
          </div>
        </div>
      ))}
      {!groups.length && <p className="px-1 text-[13px] text-[#8a7a6a]">ვერაფერი მოიძებნა.</p>}
    </div>
  );
};

const celebrate = () => {
  try {
    const colors = ['#7a2028', '#f3c969', '#10b981', '#fbf6ec'];
    confetti({ particleCount: 90, spread: 70, startVelocity: 45, origin: { y: 0.7 }, colors });
    confetti({ particleCount: 50, spread: 110, decay: 0.92, scalar: 0.9, origin: { y: 0.7 }, colors });
  } catch {
    /* confetti is decoration only */
  }
};

// "30 დღეში 2-ჯერ" — the goal behind a group's percent
const goalLabel = ({ times, days }: HabitGroupType['goal']) => (times === days ? `ბოლო ${days} დღე` : `${days} დღეში ${times}-ჯერ`);

// the explanation opens in full the first time; after that it waits folded
const INTRO_SEEN_KEY = 'habitsIntroSeen';
const introSeen = () => {
  try { return localStorage.getItem(INTRO_SEEN_KEY) === '1'; } catch { return false; }
};

// "ფსალმუნების კითხვა — სასურველია 1 კანონი…": the name, and the hint after the dash in smaller type
const splitLabel = (label: string) => {
  const i = label.indexOf(' — ');
  return i < 0 ? { name: label, hint: '' } : { name: label.slice(0, i), hint: label.slice(i + 3) };
};

// A habit's last 7 days and its percent against the group's goal
const HabitStreak: React.FC<{ log: HabitLog; id: string; goal: HabitGroupType['goal'] }> = ({ log, id, goal }) => {
  const { done, percent } = habitPercent(log, id, goal);
  const days = lastDays(7).map(date => {
    const ticked = !!log[dayKey(date)]?.includes(id);
    return { date, mark: ticked ? ('done' as const) : ('open' as const), note: ticked ? 'შესრულდა' : undefined };
  });
  return (
    <WeekStreak dots days={days} percent={percent} percentTitle={`${goal.days} დღეში ${done}-ჯერ — მიზანი ${goal.times}`} />
  );
};

// "ჩვევები" for students: the explanation and the habits to tick for today. Each habit shows its last
// 7 days (the streak) and a percent against its group's goal; teachers see the week's count in the admin panel.
// Ticking a habit sets off fireworks and a blessing.
export const ChvevebiContent: React.FC = () => {
  const { habitLog, toggleHabitToday } = useChants();
  const todayDone = habitLog[dayKey(new Date())] || [];
  const { openPrayer, openCommemoration } = useNavigation();
  const { activeModal, closeModal } = useModal();
  const { lists } = useCommemoration();
  const nameCount = lists.living.length + lists.deceased.length + lists.group.length;
  const [blessing, setBlessing] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(lastOpenMenu);
  const [introOpen, setIntroOpen] = useState(() => !introSeen());
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    try { localStorage.setItem(INTRO_SEEN_KEY, '1'); } catch { /* it just opens again next time */ }
  }, []);

  const setMenu = (id: string | null) => {
    lastOpenMenu = id;
    setOpenMenu(id);
  };

  const read = (prayerId: string) => {
    if (activeModal) closeModal();
    openPrayer(prayerId);
  };

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const toggle = (id: string) => {
    if (toggleHabitToday(id)) {
      celebrate();
      setBlessing(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setBlessing(false), 2800);
    }
  };

  return (
    <div className="space-y-5 text-[#2a2017]">
      <div className="rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] text-sm leading-relaxed text-[#4a3426]">
        <button
          type="button"
          aria-expanded={introOpen}
          onClick={() => setIntroOpen(o => !o)}
          className="w-full min-h-11 flex items-center justify-between gap-2 px-4 py-2.5 text-left cursor-pointer group"
        >
          <span className="font-serif-ge font-bold text-[#7a2028]">განმარტება</span>
          <ChevronDown className={`w-4 h-4 shrink-0 text-[#b5a48c] group-hover:text-[#7a2028] transition-transform ${introOpen ? 'rotate-180 text-[#7a2028]' : ''}`} />
        </button>
        {introOpen && (
          <div className="px-4 pb-4 -mt-1 space-y-2 animate-in fade-in duration-200">
            <p>ნიადაგი არის ის, რაშიც მყარად არის „ჩაფლული“ საძირკველი, ხოლო საძირკველზე დგას შენობა — ანუ მგალობლის შემოქმედება.</p>
            <p>
              სწორი ნიადაგის მომზადების გარეშე ვერ დამყარდება ვერც საძირკველი და ვერც მგალობლის შემოქმედება. ქვემოთ მოცემულია ჩვევები,
              რომლებიც საჭიროა სწორი სულიერი ნიადაგის მოსამზადებლად.
            </p>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          if (activeModal) closeModal();
          openCommemoration();
        }}
        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40 text-left cursor-pointer group active:scale-[0.99] transition-all"
      >
        <span className="w-9 h-9 rounded-lg bg-[#7a2028]/10 text-[#7a2028] flex items-center justify-center shrink-0">
          <ScrollText className="w-4.5 h-4.5" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold text-[#2a2017] group-hover:text-[#7a2028]">მოსახსენებელი</span>
          <span className="block text-[12px] text-[#8a7a6a]">
            {nameCount ? `${nameCount} სახელი — ლოცვებში მოიხსენიება` : 'ჩაწერე ცოცხალთა და გარდაცვლილთა სახელები'}
          </span>
        </span>
        <ChevronRight className="w-5 h-5 shrink-0 text-[#cbbca6] group-hover:text-[#7a2028]" />
      </button>

      {HABIT_GROUPS.map(group => (
        <section key={group.id} className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2 px-1">
            <h4 className="font-serif-ge text-[15px] font-bold text-[#7a2028]">{group.title}</h4>
            <span className="text-[11px] font-semibold text-[#a08a76]">% — {goalLabel(group.goal)}</span>
          </div>
          {/* one compact row per habit: the name, its last 7 days as dots with the percent, today's circle.
              Phones put the dots under the name, wider screens in their own column. */}
          <ul className="rounded-xl ring-1 ring-[#e8dcc8] bg-white divide-y divide-[#f1e8d9] overflow-hidden">
            {group.items.map(habit => {
              const on = todayDone.includes(habit.id);
              const { name, hint } = splitLabel(habit.label);
              const expanded = !!habit.menu && openMenu === habit.id;
              return (
                <li key={habit.id} className={`transition-colors ${on ? 'bg-[#7a2028]/[0.05]' : ''}`}>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-1.5 pl-3.5 pr-1.5 py-2">
                    <button
                      type="button"
                      aria-expanded={habit.menu ? expanded : undefined}
                      onClick={() => (habit.menu ? setMenu(expanded ? null : habit.id) : toggle(habit.id))}
                      className="col-start-1 row-start-1 min-w-0 text-left cursor-pointer select-none group"
                    >
                      <span className="flex items-center gap-1.5 text-sm font-medium leading-snug">
                        <span className="min-w-0">{name}</span>
                        {habit.menu && (
                          <ChevronDown className={`w-4 h-4 shrink-0 text-[#b5a48c] group-hover:text-[#7a2028] transition-transform ${expanded ? 'rotate-180 text-[#7a2028]' : ''}`} />
                        )}
                      </span>
                      {hint && <span className="block mt-0.5 text-xs leading-snug text-[#8a7a6a]">{hint}</span>}
                    </button>
                    <div className="col-start-1 row-start-2 sm:col-start-2 sm:row-start-1">
                      <HabitStreak log={habitLog} id={habit.id} goal={group.goal} />
                    </div>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      aria-label={`${habit.label} — დღეს`}
                      onClick={() => toggle(habit.id)}
                      className="col-start-2 row-start-1 row-span-2 sm:col-start-3 sm:row-span-1 p-1.5 rounded-full cursor-pointer active:scale-90 transition-transform"
                    >
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${on ? 'bg-[#7a2028] text-[#fbf6ec]' : 'ring-2 ring-[#d9c8ac] bg-white'}`}>
                        {on && <Check className="w-4 h-4 stroke-[3]" />}
                      </span>
                    </button>
                  </div>
                  {expanded && habit.menu && (
                    <div className="px-2.5 pb-2.5 pt-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                      <HabitPrayerMenu menu={habit.menu} onOpen={read} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <p className="px-2 text-center text-xs leading-relaxed text-[#8a7a6a]">
        წრით მონიშნე, რაც დღეს შეასრულე. 7 წერტილი ბოლო 7 დღეა (ბოლო — დღეს); ზედიზედ შესრულებული დღეები ერთ ზოლად ერთდება.
      </p>

      {blessing && (
        <div className="fixed inset-x-0 bottom-8 z-[60] flex justify-center px-4 pointer-events-none">
          <div className="px-6 py-3.5 rounded-full bg-[#7a2028] text-[#fbf6ec] font-serif-ge text-lg font-bold shadow-[0_12px_32px_-10px_rgba(122,32,40,0.6)] animate-in fade-in slide-in-from-bottom-4 zoom-in-95 duration-300">
            ღმერთს ებარებოდე! 🙏
          </div>
        </div>
      )}
    </div>
  );
};
