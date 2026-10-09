import React, { useState } from 'react';
import { Bell, BookOpen, ChevronDown, ChevronLeft, ChevronRight, Moon, Play, Search, Sun } from 'lucide-react';
import { HabitMenu } from '../../data/habitsAndManera';
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
import { useAuth } from '../../context';
import { useMyPsalterGroups } from '../../hooks/usePsalter';
import { WEEKDAYS_SHORT_GE } from '../../utils/dateNames';
import { useReminders } from '../../utils/prayerReminders';
import { continueReading } from '../../utils/prayerHabits';
import { cycleOf, georgiaToday, kathismasOf, ownersIn } from '../../utils/psalter';

// The prayers a habit opens, laid out to fit a phone without long lists: chips, number grids and
// folded groups. Used in the habits' sheet and on the home page buttons.

const CHIP =
  'rounded-xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] text-[#4a3426] hover:ring-[#7a2028]/40 hover:text-[#7a2028] transition-colors cursor-pointer active:scale-[0.97]';
const CHIP_ON = '!bg-[#7a2028] !text-[#fbf6ec] !ring-[#7a2028]';
const CAPTION = 'px-0.5 pb-1.5 text-[12px] font-bold text-[#8a7a6a]';

export const HabitPrayerMenu: React.FC<{ menu: HabitMenu; onOpen: (prayerId: string) => void }> = ({ menu, onOpen }) => {
  switch (menu) {
    case 'morning-evening': return <MorningEvening onOpen={onOpen} />;
    case 'morning': return <MorningEvening onOpen={onOpen} part="dila" />;
    case 'evening': return <MorningEvening onOpen={onOpen} part="dzili" />;
    case 'hours': return <Hours onOpen={onOpen} />;
    case 'gospel': return <Bible list="gospel" onOpen={onOpen} />;
    case 'apostle': return <Bible list="apostle" onOpen={onOpen} />;
    case 'psalms': return <Psalms onOpen={onOpen} />;
    case 'jesus': return <JesusPrayer />;
    case 'book': return <PrayerBook onOpen={onOpen} />;
    default: return <Akathists onOpen={onOpen} />;
  }
};

const BOOK_PARTS: { menu: Exclude<HabitMenu, 'book'>; title: string }[] = [
  { menu: 'morning-evening', title: 'დილის და საღამოს ლოცვები' },
  { menu: 'hours', title: 'შვიდგზის ლოცვა' },
  { menu: 'psalms', title: 'ფსალმუნები' },
  { menu: 'gospel', title: 'სახარება' },
  { menu: 'apostle', title: 'სამოციქულო' },
  { menu: 'akathists', title: 'დაუჯდომლები' },
  { menu: 'jesus', title: 'იესოს ლოცვა' },
];
// the open part survives a trip to a prayer and back
const BOOK_PART_KEY = 'prayerBookPart';
const savedPart = (): string | null => {
  try { return sessionStorage.getItem(BOOK_PART_KEY); } catch { return null; }
};

/** The whole ლოცვანი: every habit's prayers as folded parts, one open at a time. In the library and
 *  behind a habit's book button. */
export const PrayerBook: React.FC<{ onOpen: (prayerId: string) => void }> = ({ onOpen }) => {
  const [open, setOpen] = useState<string | null>(savedPart);
  const toggle = (menu: string) => {
    const next = open === menu ? null : menu;
    setOpen(next);
    try { next ? sessionStorage.setItem(BOOK_PART_KEY, next) : sessionStorage.removeItem(BOOK_PART_KEY); } catch { /* opens folded next time */ }
  };
  return (
    <ul className="rounded-2xl ring-1 ring-[#e8dcc8] bg-white divide-y divide-[#f1e8d9] overflow-hidden">
      {BOOK_PARTS.map(p => {
        const on = open === p.menu;
        return (
          <li key={p.menu}>
            <button
              type="button"
              onClick={() => toggle(p.menu)}
              aria-expanded={on}
              className="w-full min-h-[52px] flex items-center gap-3 px-4 py-2 text-left cursor-pointer hover:bg-[#fbf6ec] transition-colors"
            >
              <BookOpen className="w-[18px] h-[18px] shrink-0 text-[#7a2028]" />
              <span className="flex-1 min-w-0 font-serif-ge text-[15px] font-bold text-[#2a2017]">{p.title}</span>
              <ChevronDown className={`w-5 h-5 shrink-0 text-[#a08a76] transition-transform ${on ? 'rotate-180' : ''}`} />
            </button>
            {on && (
              <div className="px-3 pb-4 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                <HabitPrayerMenu menu={p.menu} onOpen={onOpen} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
};

// "გააგრძელე": straight back to where reading stopped
const ContinueButton: React.FC<{ to: { id: string; label: string }; onOpen: (id: string) => void }> = ({ to, onOpen }) => (
  <button
    type="button"
    onClick={() => onOpen(to.id)}
    className="w-full min-h-12 px-3.5 py-2 rounded-xl bg-[#7a2028] text-[#fbf6ec] hover:bg-[#651a21] flex items-center gap-2.5 text-left cursor-pointer active:scale-[0.99] transition shadow-[0_6px_16px_-10px_rgba(122,32,40,0.8)]"
  >
    <Play className="w-4 h-4 shrink-0 fill-current" />
    <span className="flex-1 min-w-0 text-[14px] font-bold leading-snug">
      <span className="font-semibold text-[#fbf6ec]/70">გააგრძელე · </span>
      {to.label}
    </span>
    <ChevronRight className="w-4 h-4 shrink-0 opacity-70" />
  </button>
);

// Morning and evening prayers, then the weekday prayers: today's first, other days by their chip.
// `part`: only the morning (dila) or only the evening (dzili) prayers, for a habit of its own
const MorningEvening: React.FC<{ onOpen: (id: string) => void; part?: 'dila' | 'dzili' }> = ({ onOpen, part }) => {
  const today = new Date().getDay();
  const [day, setDay] = useState(today);
  return (
    <div className="space-y-4">
      <div className={`grid ${part ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
        {MORNING_EVENING.filter(p => !part || (p.id === 'dila') === (part === 'dila')).map(p => (
          <button key={p.id} type="button" onClick={() => onOpen(p.id)} className={`${CHIP} h-16 px-2 flex flex-col items-center justify-center gap-1 text-[14px] font-bold`}>
            {p.id === 'dila' ? <Sun className="w-5 h-5 shrink-0 text-[#c08a2a]" /> : <Moon className="w-5 h-5 shrink-0 text-[#6b5b8a]" />}
            {p.id === 'dila' ? 'დილის ლოცვები' : 'საღამოს ლოცვები'}
          </button>
        ))}
      </div>
      <div>
        <p className={CAPTION}>
          შვიდეულის ლოცვები · {WEEK_DAYS[day]}
          {day === today && <span className="text-[#7a2028]"> (დღეს)</span>}
        </p>
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS_SHORT_GE.map((name, i) => (
            <button
              key={name}
              type="button"
              aria-pressed={day === i}
              aria-label={WEEK_DAYS[i]}
              onClick={() => setDay(i)}
              className={`${CHIP} relative h-11 text-[13px] font-bold ${day === i ? CHIP_ON : ''}`}
            >
              {name}
              {i === today && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-current" />}
            </button>
          ))}
        </div>
        <div className={`mt-2 grid ${part ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
          {part !== 'dzili' && (
            <button type="button" onClick={() => onOpen(weekPrayerId(day, 'dila'))} className={`${CHIP} h-11 text-[14px] font-semibold`}>
              დილით
            </button>
          )}
          {part !== 'dila' && (
            <button type="button" onClick={() => onOpen(weekPrayerId(day, 'dzili'))} className={`${CHIP} h-11 text-[14px] font-semibold`}>
              დაწოლისას
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// The seven hours: the next one to come on top (wrapping past midnight to 06:00), all seven as chips.
const Hours: React.FC<{ onOpen: (id: string) => void }> = ({ onOpen }) => {
  const reminders = useReminders();
  const now = new Date();
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const order = [...PRAYER_HOURS].sort((a, b) => a.hour - b.hour);
  const next = order.find(h => h.hour * 60 > minutesNow) ?? order[0];
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => onOpen(next.id)}
        className={`${CHIP} w-full min-h-14 px-3.5 py-2 flex items-center gap-3 text-left !bg-[#7a2028]/[0.06] !ring-[#7a2028]/35`}
      >
        <span className="text-[19px] font-black tabular-nums text-[#7a2028]">{hourClock(next)}</span>
        <span className="flex-1 min-w-0">
          <span className="block text-[11.5px] font-bold text-[#8a7a6a]">შემდეგი ლოცვა</span>
          <span className="block text-[14px] font-semibold leading-snug">{next.label}</span>
        </span>
        <ChevronRight className="w-4 h-4 shrink-0 text-[#7a2028]" />
      </button>
      <div className="grid grid-cols-4 gap-1.5">
        {PRAYER_HOURS.map(h => (
          <button
            key={h.id}
            type="button"
            title={h.label}
            onClick={() => onOpen(h.id)}
            className={`${CHIP} relative h-11 text-[14px] font-bold tabular-nums ${h.id === next.id ? '!text-[#7a2028] !ring-[#7a2028]/40' : ''}`}
          >
            {hourClock(h)}
            {(reminders[h.id] || []).length > 0 && <Bell className="absolute top-1 right-1 w-3 h-3 text-[#7a2028]" aria-label="შეხსენება ჩართულია" />}
          </button>
        ))}
      </div>
    </div>
  );
};

// Short names of the Apostle's books for the chips
const SHORT: Record<string, string> = {
  iakobi: 'იაკობი', '1petre': 'I პეტრე', '2petre': 'II პეტრე', '1iovane': 'I იოანე', '2iovane': 'II იოანე', '3iovane': 'III იოანე',
  iuda: 'იუდა', romaelta: 'რომაელთა', '1korintelta': 'I კორინთელთა', '2korintelta': 'II კორინთელთა', galatelta: 'გალატელთა',
  efeselta: 'ეფესელთა', pilipelta: 'ფილიპელთა', kolaselta: 'კოლასელთა', '1tesalonikelta': 'I თესალონიკელთა',
  '2tesalonikelta': 'II თესალონიკელთა', '1timote': 'I ტიმოთე', '2timote': 'II ტიმოთე', tite: 'ტიტე', filimoni: 'ფილიმონი',
  ebraelta: 'ებრაელთა',
};
const PAUL = APOSTLE.findIndex(b => b.id === 'romaelta');
const PARTS: Record<'gospel' | 'apostle', { title: string; books: BibleBook[] }[]> = {
  gospel: [{ title: '', books: GOSPELS }],
  apostle: [
    { title: 'საქმე და კათოლიკე ეპისტოლენი', books: APOSTLE.slice(0, PAUL) },
    { title: 'პავლე მოციქულის ეპისტოლენი', books: APOSTLE.slice(PAUL) },
  ],
};

// the book left open, so coming back from a chapter shows its chapters again
const openBook: Record<'gospel' | 'apostle', string | null> = { gospel: null, apostle: null };

// One book's chapters as numbers; the "გააგრძელე" chapter is ringed.
const Chapters: React.FC<{ book: BibleBook; resumeId?: string; onOpen: (id: string) => void }> = ({ book, resumeId, onOpen }) => (
  <div className="rounded-xl bg-white ring-1 ring-[#e8dcc8] p-2 animate-in fade-in slide-in-from-top-1 duration-200">
    <p className="px-1 pb-1.5 text-[12px] font-bold text-[#8a7a6a]">{book.title} · თავები</p>
    <div className="grid grid-cols-7 gap-1">
      {Array.from({ length: book.chapters }, (_, i) => {
        const id = bibleChapterId(book.id, i + 1);
        return (
          <button
            key={id}
            type="button"
            onClick={() => onOpen(id)}
            className={`h-10 rounded-lg text-[14px] font-semibold tabular-nums cursor-pointer active:scale-95 transition-colors ${
              resumeId === id
                ? 'bg-[#7a2028]/10 text-[#7a2028] ring-2 ring-[#7a2028]/45'
                : 'bg-[#fbf6ec] ring-1 ring-[#e8dcc8] text-[#4a3426] hover:text-[#7a2028] hover:ring-[#7a2028]/40'
            }`}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  </div>
);

// The Gospel or the Apostle: "გააგრძელე", the books as chips, the open book's chapters as numbers.
// The Apostle's 22 books step aside while one book's chapters are shown.
const Bible: React.FC<{ list: 'gospel' | 'apostle'; onOpen: (id: string) => void }> = ({ list, onOpen }) => {
  const resume = continueReading(list);
  const [open, setOpen] = useState<string | null>(() => openBook[list] ?? (resume ? resume.id.split('-')[1] : null));
  const pick = (book: BibleBook) => {
    if (book.chapters === 1) {
      onOpen(bibleChapterId(book.id, 1));
      return;
    }
    const next = open === book.id ? null : book.id;
    openBook[list] = next;
    setOpen(next);
  };
  const book = (list === 'gospel' ? GOSPELS : APOSTLE).find(b => b.id === open);
  const resumeHere = resume && <ContinueButton to={resume} onOpen={onOpen} />;

  if (list === 'apostle' && book) {
    return (
      <div className="space-y-3">
        {resumeHere}
        <button type="button" onClick={() => pick(book)} className={`${CHIP} h-11 pl-2 pr-3.5 inline-flex items-center gap-1 text-[13.5px] font-semibold`}>
          <ChevronLeft className="w-4 h-4" />
          ყველა წიგნი
        </button>
        <Chapters book={book} resumeId={resume?.id} onOpen={onOpen} />
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {resumeHere}
      {PARTS[list].map(part => (
        <div key={part.title || list}>
          {part.title && <p className={CAPTION}>{part.title}</p>}
          <div className={list === 'gospel' ? 'grid grid-cols-4 gap-1.5' : 'flex flex-wrap gap-1.5'}>
            {part.books.map(b => (
              <button
                key={b.id}
                type="button"
                aria-expanded={b.chapters > 1 ? open === b.id : undefined}
                onClick={() => pick(b)}
                className={`${CHIP} h-11 px-3 text-[13.5px] font-semibold ${open === b.id ? CHIP_ON : ''}`}
              >
                {SHORT[b.id] || b.title}
              </button>
            ))}
          </div>
        </div>
      ))}
      {book && <Chapters book={book} resumeId={resume?.id} onOpen={onOpen} />}
    </div>
  );
};

// The 20 kathismas as a number grid with their psalms; the psalter group's kathisma of this cycle stands out.
const Psalms: React.FC<{ onOpen: (id: string) => void }> = ({ onOpen }) => {
  const { user } = useAuth();
  const { groups } = useMyPsalterGroups(user?.uid);
  const mine = new Set<number>();
  if (user) {
    for (const g of groups.filter(x => x.memberIds.includes(user.uid))) {
      const c = cycleOf(georgiaToday(), g.cycleDays, g.shiftDays);
      kathismasOf(ownersIn(g.assignment, g.baseHalf, c.half), user.uid).forEach(k => mine.add(k));
    }
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-1.5">
        {KATHISMAS.map(k => {
          const isMine = mine.has(k.n);
          return (
            <button
              key={k.id}
              type="button"
              title={`${k.title} · ფს. ${k.psalms}`}
              onClick={() => onOpen(k.id)}
              className={`${CHIP} h-14 flex flex-col items-center justify-center leading-none ${isMine ? CHIP_ON : ''}`}
            >
              <span className="text-[17px] font-black tabular-nums">{k.n}</span>
              <span className={`mt-1 text-[10.5px] tabular-nums ${isMine ? 'text-[#fbf6ec]/80' : 'text-[#8a7a6a]'}`}>{k.psalms}</span>
            </button>
          );
        })}
      </div>
      {mine.size > 0 && (
        <p className="flex items-center gap-1.5 px-0.5 text-[12px] text-[#8a7a6a]">
          <span className="w-2.5 h-2.5 rounded-[3px] bg-[#7a2028]" />
          შენი კანონი ფსალმუნის ჯგუფში
        </p>
      )}
      <button type="button" onClick={() => onOpen(PSALTER_RULE.id)} className={`${CHIP} w-full min-h-11 px-3.5 py-2 flex items-center gap-2.5 text-left`}>
        <BookOpen className="w-4 h-4 shrink-0 text-[#7a2028]" />
        <span className="flex-1 min-w-0 text-[13.5px] font-semibold leading-snug">
          {PSALTER_RULE.title}
          <span className="block text-[11.5px] font-normal text-[#8a7a6a]">დასაწყისი და დასასრულის ლოცვები</span>
        </span>
        <ChevronRight className="w-4 h-4 shrink-0 text-[#b5a48c]" />
      </button>
    </div>
  );
};

const JesusPrayer: React.FC = () => (
  <div className="space-y-2.5 text-[#2a2017]">
    <p className="rounded-xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] px-3 py-3 text-center font-serif-ge text-[16px] leading-relaxed text-[#7a2028] font-semibold">
      უფალო იესო ქრისტე, ძეო ღმრთისაო, შემიწყალე მე ცოდვილი.
    </p>
    <p className="px-0.5 text-[13px] leading-relaxed text-[#4a3426]">
      <span className="font-bold text-[#7a2028]">სხვისთვის ლოცვისას</span> ამბობენ: „უფალო იესო ქრისტე, ძეო ღმრთისაო, შეიწყალე{' '}
      <span className="italic text-[#8a7a6a]">(სახელი)</span>“.
    </p>
    <p className="px-0.5 text-[12px] leading-relaxed text-[#8a7a6a]">
      თქვი წყნარად და გაუჩქარებლად, ყურადღებით სიტყვებზე — სადაც უნდა იყო: გზაში, საქმის დროს, დასაძინებლად წოლისას.
    </p>
  </div>
);

// the group left open, so coming back from an akathist shows the same list
let openGroup: string | null = null;

// 73 akathists: "გააგრძელე", a search box, the groups folded with their counts.
const Akathists: React.FC<{ onOpen: (id: string) => void }> = ({ onOpen }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(openGroup);
  const resume = continueReading('akathists');
  const q = query.trim();
  const groups = AKATHIST_GROUPS.map(g => ({ ...g, items: q ? g.items.filter(p => p.title.includes(q)) : g.items })).filter(g => g.items.length);
  const toggle = (title: string) => {
    const next = open === title ? null : title;
    openGroup = next;
    setOpen(next);
  };
  return (
    <div className="space-y-3">
      {resume && !q && <ContinueButton to={resume} onOpen={onOpen} />}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#b5a48c]" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={`ძებნა · ${AKATHISTS.length} დაუჯდომელი`}
          className="w-full h-11 pl-9 pr-3 rounded-xl bg-white ring-1 ring-[#e8dcc8] focus:ring-2 focus:ring-[#7a2028]/35 outline-none text-[16px] text-[#2a2017] placeholder:text-[14px] placeholder:text-[#b5a48c]"
        />
      </div>
      {groups.length > 0 ? (
        <div className="rounded-xl bg-white ring-1 ring-[#e8dcc8] divide-y divide-[#f1e8d9] overflow-hidden">
          {groups.map(g => {
            const expanded = Boolean(q) || open === g.title;
            return (
              <div key={g.title}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => !q && toggle(g.title)}
                  className="w-full min-h-11 px-3.5 py-2 flex items-center gap-2 text-left cursor-pointer group"
                >
                  <span className={`flex-1 min-w-0 text-[14px] font-bold ${expanded ? 'text-[#7a2028]' : 'text-[#4a3426] group-hover:text-[#7a2028]'}`}>{g.title}</span>
                  <span className="text-[12px] font-semibold tabular-nums text-[#8a7a6a]">{g.items.length}</span>
                  {!q && <ChevronDown className={`w-4 h-4 shrink-0 text-[#b5a48c] transition-transform ${expanded ? 'rotate-180 text-[#7a2028]' : ''}`} />}
                </button>
                {expanded && (
                  <ul className="pb-1.5 animate-in fade-in duration-200">
                    {g.items.map(p => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => onOpen(p.id)}
                          className={`w-full min-h-10 pl-5 pr-3.5 py-2 text-left text-[14px] leading-snug cursor-pointer hover:bg-[#7a2028]/[0.04] hover:text-[#7a2028] ${
                            resume?.id === p.id ? 'font-semibold text-[#7a2028]' : 'text-[#2a2017]'
                          }`}
                        >
                          {p.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="px-1 text-[13px] text-[#8a7a6a]">ვერაფერი მოიძებნა.</p>
      )}
    </div>
  );
};
