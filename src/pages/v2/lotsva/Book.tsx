import React, { useState } from 'react';
import {
  Bell, BookOpen, BookOpenText, ChevronDown, ChevronLeft, ChevronRight, Church, Clock, Cross, Feather, Flame, HandHeart, Heart, Moon, Play,
  Search, Sparkles, Star, Sun,
} from 'lucide-react';
import { HabitMenu } from '../../../data/habitsAndManera';
import {
  AKATHISTS, AKATHIST_GROUPS, ANDREW_CANON, APOSTLE, BibleBook, CONFESSION_PRAYERS, GOSPELS, KATHISMAS, MORNING_EVENING, PARAKLISES, PRAYER_HOURS,
  PSALTER_RULE, PrayerRef, VARIOUS_PRAYERS, bibleChapterId, hourClock,
} from '../../../data/prayers';
import { useAuth } from '../../../context';
import { useMyPsalterGroups } from '../../../hooks/usePsalter';
import { useReminders } from '../../../utils/prayerReminders';
import { continueReading } from '../../../utils/prayerHabits';
import { cycleOf, georgiaToday, kathismasOf, ownersIn } from '../../../utils/psalter';
import { BOOK_PART_KEY, PARTS, SHORT } from '../../../components/views/HabitPrayerMenu';
import { Dot, type DotColor, Press, Row, Rows, SectionLabel, Small } from '../../../components/ui2';
import { cx, FOCUS, FOCUS_IN } from '../../../components/ui2/cx';

/** ლოცვანი's book in the new look (board x-lotsvani): three groups under small names, each a white card of lines with a
 *  coloured round mark; ▾ unfolds a part's prayers in place, one part open at a time (the old PrayerBook's rules: the open
 *  part survives a trip to a prayer and back, a button's place — „psalms“, „gospel:mate“, „akathists:2“ — opens there). */

type Part = Exclude<HabitMenu, 'book' | 'morning' | 'evening'> | 'confession' | 'andrew' | 'various' | 'paraklisi';
type Group = { title: string; color: DotColor; parts: { menu: Part; title: string; icon: React.ReactNode }[] };

// the eleven coloured buttons became lines: the eye follows one column; one colour a group
const GROUPS: Group[] = [
  {
    title: 'ყოველდღიური',
    color: 'gold',
    parts: [
      { menu: 'morning-evening', title: 'დილის და საღამოს ლოცვები', icon: <Sun /> },
      { menu: 'hours', title: 'შვიდგზის ლოცვა', icon: <Clock /> },
      { menu: 'jesus', title: 'იესოს ლოცვა', icon: <Heart /> },
    ],
  },
  {
    title: 'წმინდა წერილი',
    color: 'wine',
    parts: [
      { menu: 'psalms', title: 'ფსალმუნები', icon: <BookOpen /> },
      { menu: 'gospel', title: 'სახარება', icon: <Star /> },
      { menu: 'apostle', title: 'სამოციქულო', icon: <Feather /> },
    ],
  },
  {
    title: 'განსაკუთრებული დღეებისთვის',
    color: 'plum',
    parts: [
      { menu: 'akathists', title: 'დაუჯდომლები', icon: <Sparkles /> },
      { menu: 'paraklisi', title: 'პარაკლისი', icon: <Cross /> },
      { menu: 'confession', title: 'აღსარების და ზიარების ლოცვები', icon: <Church /> },
      { menu: 'andrew', title: 'ანდრია კრიტელის კანონი', icon: <Flame /> },
      { menu: 'various', title: 'სხვადასხვა ლოცვები', icon: <HandHeart /> },
    ],
  },
];

// the book left open (gospel / apostle) and the akathists' group, so coming back from a prayer shows the same place
const openBook: Record<'gospel' | 'apostle', string | null> = { gospel: null, apostle: null };
let openGroup: string | null = null;

const savedPart = (): string | null => {
  try { return sessionStorage.getItem(BOOK_PART_KEY); } catch { return null; }
};
const unfoldAt = (at: string) => {
  const [part, sub] = at.split(':');
  const menu = part === 'week' ? 'morning-evening' : part;
  try { sessionStorage.setItem(BOOK_PART_KEY, menu); } catch { /* opens folded */ }
  if (!sub) return;
  if (part === 'gospel' || part === 'apostle') openBook[part] = sub;
  else if (part === 'akathists') openGroup = AKATHIST_GROUPS[Number(sub)]?.title ?? null;
};

export const Book: React.FC<{ onOpen: (id: string) => void; at?: string | null }> = ({ onOpen, at }) => {
  const [open, setOpen] = useState<string | null>(() => {
    if (at) unfoldAt(at);
    return savedPart();
  });
  const toggle = (menu: string) => {
    const next = open === menu ? null : menu;
    setOpen(next);
    try { next ? sessionStorage.setItem(BOOK_PART_KEY, next) : sessionStorage.removeItem(BOOK_PART_KEY); } catch { /* folded next time */ }
  };
  return (
    <>
      {GROUPS.map(g => (
        <section key={g.title} aria-label={g.title} className="flex flex-col gap-2">
          <SectionLabel label={g.title} className="mt-1" />
          <Rows>
            {g.parts.map(p => {
              const on = open === p.menu;
              return (
                <div key={p.menu} className="flex flex-col">
                  <Press
                    onClick={() => toggle(p.menu)}
                    aria-expanded={on}
                    className={cx('flex min-h-[54px] w-full cursor-pointer items-center gap-2.5 py-2 pr-3 pl-3 text-left transition-colors active:bg-soft', FOCUS_IN)}
                  >
                    <Dot icon={p.icon} color={g.color} />
                    <span className="min-w-0 flex-1 text-lead font-bold wrap-break-word">{p.title}</span>
                    <ChevronDown aria-hidden="true" className={cx('size-4 shrink-0 text-mut transition-transform duration-300', on && 'rotate-180')} />
                  </Press>
                  {on && (
                    <div className="sg-in px-3 pt-1 pb-3">
                      <PartBody menu={p.menu} onOpen={onOpen} />
                    </div>
                  )}
                </div>
              );
            })}
          </Rows>
        </section>
      ))}
    </>
  );
};

const PartBody: React.FC<{ menu: Part; onOpen: (id: string) => void }> = ({ menu, onOpen }) => {
  switch (menu) {
    case 'morning-evening': return <MorningEvening onOpen={onOpen} />;
    case 'hours': return <Hours onOpen={onOpen} />;
    case 'jesus': return <JesusPrayer />;
    case 'psalms': return <Psalms onOpen={onOpen} />;
    case 'gospel': return <Bible list="gospel" onOpen={onOpen} />;
    case 'apostle': return <Bible list="apostle" onOpen={onOpen} />;
    case 'akathists': return <Akathists onOpen={onOpen} />;
    default: return (
      <List
        items={menu === 'various' ? VARIOUS_PRAYERS : menu === 'andrew' ? ANDREW_CANON : menu === 'paraklisi' ? PARAKLISES : CONFESSION_PRAYERS}
        onOpen={onOpen}
      />
    );
  }
};

// a soft square on the white card: an hour, a chapter, a kanon. `on` = mine (wine), `mark` = where reading goes on,
// `next` = the hour to come
const cell = (tone: 'plain' | 'on' | 'mark' | 'next' = 'plain') => cx(
  'flex cursor-pointer items-center justify-center rounded-field text-body tabular-nums transition active:scale-95',
  tone === 'on' ? 'bg-wine font-bold text-white active:bg-wine-deep'
    : tone === 'mark' ? 'bg-tint font-bold text-wine ring-2 ring-wine/45'
    : tone === 'next' ? 'bg-page font-bold text-wine active:bg-soft'
    : 'bg-page font-semibold text-ink active:bg-soft',
  FOCUS,
);

/** Lines on the page's colour inside the white card (a list in a list). */
const Inner: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-col divide-y divide-line overflow-hidden rounded-tile bg-page">{children}</div>
);

/** Single prayers, a line each (titles are long, so they wrap). */
const List: React.FC<{ items: PrayerRef[]; onOpen: (id: string) => void }> = ({ items, onOpen }) => (
  <Inner>
    {items.map(p => <Row key={p.id} title={p.title} wrap onClick={() => onOpen(p.id)} />)}
  </Inner>
);

/** „გააგრძელე“: straight back to where reading stopped. */
const Continue: React.FC<{ to: { id: string; label: string }; onOpen: (id: string) => void }> = ({ to, onOpen }) => (
  <Press
    onClick={() => onOpen(to.id)}
    className={cx('flex min-h-tap-lg w-full cursor-pointer items-center gap-2.5 rounded-full bg-wine py-2 pr-3 pl-4 text-left text-white transition active:bg-wine-deep', FOCUS)}
  >
    <Play aria-hidden="true" className="size-4 shrink-0 fill-current" />
    <span className="min-w-0 flex-1 text-body leading-snug font-bold">
      <span className="font-semibold text-white/75">გააგრძელე · </span>{to.label}
    </span>
    <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-white/75" />
  </Press>
);

// the morning and the evening prayers; today's weekday prayer is folded at the end of each (PrayerText)
const MorningEvening: React.FC<{ onOpen: (id: string) => void }> = ({ onOpen }) => (
  <div className="grid grid-cols-2 gap-2">
    {MORNING_EVENING.map(p => (
      <Press key={p.id} onClick={() => onOpen(p.id)} className={cx(cell(), 'min-h-16 flex-col gap-1 px-2 py-2 text-center leading-tight')}>
        {p.id === 'dila' ? <Sun aria-hidden="true" className="size-5 text-gold" /> : <Moon aria-hidden="true" className="size-5 text-plum" />}
        {p.id === 'dila' ? 'დილის ლოცვები' : 'საღამოს ლოცვები'}
      </Press>
    ))}
  </div>
);

// the seven hours: the next one on top (past midnight back to 06:00), all seven as squares; 🔔 = a reminder is on
const Hours: React.FC<{ onOpen: (id: string) => void }> = ({ onOpen }) => {
  const reminders = useReminders();
  const now = new Date();
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const order = [...PRAYER_HOURS].sort((a, b) => a.hour - b.hour);
  const next = order.find(h => h.hour * 60 > minutesNow) ?? order[0];
  return (
    <div className="flex flex-col gap-2.5">
      <Press
        onClick={() => onOpen(next.id)}
        className={cx('flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-tile bg-tint px-4 py-2 text-left transition active:brightness-95', FOCUS)}
      >
        <span className="text-title font-bold text-wine tabular-nums">{hourClock(next)}</span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-cap font-semibold text-mut">შემდეგი ლოცვა</span>
          <span className="text-body leading-snug font-semibold">{next.label}</span>
        </span>
        <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-wine" />
      </Press>
      <div className="grid grid-cols-4 gap-1.5">
        {PRAYER_HOURS.map(h => (
          <Press key={h.id} title={h.label} onClick={() => onOpen(h.id)} className={cx(cell(h.id === next.id ? 'next' : 'plain'), 'relative h-tap')}>
            {hourClock(h)}
            {(reminders[h.id] || []).length > 0 && (
              <Bell aria-label="შეხსენება ჩართულია" className="absolute top-1 right-1 size-3 text-wine" />
            )}
          </Press>
        ))}
      </div>
    </div>
  );
};

const JesusPrayer: React.FC = () => (
  <div className="flex flex-col gap-2">
    <p className="rounded-tile bg-page px-4 py-3 text-center font-serif-ge text-lead leading-relaxed font-semibold text-wine">
      უფალო იესო ქრისტე, ძეო ღმრთისაო, შემიწყალე მე ცოდვილი.
    </p>
    <p className="px-1 text-meta leading-relaxed">
      <span className="font-bold text-wine">სხვისთვის ლოცვისას</span> ამბობენ: „უფალო იესო ქრისტე, ძეო ღმრთისაო, შეიწყალე{' '}
      <span className="text-mut italic">(სახელი)</span>“.
    </p>
    <p className="px-1 text-meta leading-relaxed text-mut">
      თქვი წყნარად და გაუჩქარებლად, ყურადღებით სიტყვებზე — სადაც უნდა იყო: გზაში, საქმის დროს, დასაძინებლად წოლისას.
    </p>
  </div>
);

// the 20 kanons with their psalms; my psalter group's kanon of this cycle in wine
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
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-5 gap-1.5">
        {KATHISMAS.map(k => {
          const isMine = mine.has(k.n);
          return (
            <Press
              key={k.id}
              title={`${isMine ? 'შენი კანონი · ' : ''}${k.title} · ფს. ${k.psalms}`}
              onClick={() => onOpen(k.id)}
              className={cx(cell(isMine ? 'on' : 'plain'), 'h-14 flex-col leading-none')}
            >
              <span className="text-head font-bold">{k.n}</span>
              <span className={cx('mt-1 text-cap font-normal', isMine ? 'text-white/80' : 'text-mut')}>{k.psalms}</span>
            </Press>
          );
        })}
      </div>
      <Inner>
        <Row
          lead={<BookOpenText aria-hidden="true" className="size-[18px] shrink-0 text-wine" />}
          title={PSALTER_RULE.title}
          sub="დასაწყისი და დასასრულის ლოცვები"
          wrap
          onClick={() => onOpen(PSALTER_RULE.id)}
        />
      </Inner>
    </div>
  );
};

// a book's chapters as numbers; the „გააგრძელე“ one is ringed
const Chapters: React.FC<{ book: BibleBook; resumeId?: string; onOpen: (id: string) => void }> = ({ book, resumeId, onOpen }) => (
  <div className="sg-in flex flex-col gap-1.5">
    <Small className="px-1">{book.title} · თავები</Small>
    <div className="grid grid-cols-6 gap-1.5">
      {Array.from({ length: book.chapters }, (_, i) => {
        const id = bibleChapterId(book.id, i + 1);
        return (
          <Press key={id} onClick={() => onOpen(id)} className={cx(cell(resumeId === id ? 'mark' : 'plain'), 'h-tap')}>
            {i + 1}
          </Press>
        );
      })}
    </div>
  </div>
);

// a pill for a book of the Bible
const bookChip = (on: boolean, pad = 'px-3.5') => cx(
  'flex h-tap cursor-pointer items-center justify-center rounded-full text-body font-semibold whitespace-nowrap transition active:scale-[0.97]',
  pad,
  on ? 'bg-wine text-white' : 'bg-page text-ink active:bg-soft',
  FOCUS,
);

// the Gospel or the Apostle: „გააგრძელე“, the books, the open book's chapters (the Apostle's 22 books step aside meanwhile)
const Bible: React.FC<{ list: 'gospel' | 'apostle'; onOpen: (id: string) => void }> = ({ list, onOpen }) => {
  const resume = continueReading(list);
  const [open, setOpen] = useState<string | null>(() => openBook[list] ?? (resume ? resume.id.split('-')[1] : null));
  const pick = (book: BibleBook) => {
    if (book.chapters === 1) { onOpen(bibleChapterId(book.id, 1)); return; }
    const next = open === book.id ? null : book.id;
    openBook[list] = next;
    setOpen(next);
  };
  const book = (list === 'gospel' ? GOSPELS : APOSTLE).find(b => b.id === open);
  if (list === 'apostle' && book) {
    return (
      <div className="flex flex-col gap-2.5">
        {resume && <Continue to={resume} onOpen={onOpen} />}
        <Press onClick={() => pick(book)} className={cx(bookChip(false, 'pr-4 pl-2.5'), 'gap-1 self-start [&_svg]:size-4')}>
          <ChevronLeft aria-hidden="true" />ყველა წიგნი
        </Press>
        <Chapters book={book} resumeId={resume?.id} onOpen={onOpen} />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {resume && <Continue to={resume} onOpen={onOpen} />}
      {PARTS[list].map(part => (
        <div key={part.title || list} className="flex flex-col gap-1.5">
          {part.title && <Small className="px-1">{part.title}</Small>}
          <div className={list === 'gospel' ? 'grid grid-cols-2 gap-1.5 min-[400px]:grid-cols-4' : 'flex flex-wrap gap-1.5'}>
            {part.books.map(b => (
              <Press key={b.id} aria-expanded={b.chapters > 1 ? open === b.id : undefined} onClick={() => pick(b)} className={bookChip(open === b.id)}>
                {SHORT[b.id] || b.title}
              </Press>
            ))}
          </div>
        </div>
      ))}
      {book && <Chapters book={book} resumeId={resume?.id} onOpen={onOpen} />}
    </div>
  );
};

// the 73 akathists: „გააგრძელე“, a search line, the groups folded with their counts
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
    <div className="flex flex-col gap-2.5">
      {resume && !q && <Continue to={resume} onOpen={onOpen} />}
      <label className="flex h-tap items-center gap-2 rounded-full bg-page px-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-wine/60">
        <Search aria-hidden="true" className="size-4 shrink-0 text-mut" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={`ძებნა · ${AKATHISTS.length} დაუჯდომელი`}
          aria-label="დაუჯდომლის ძებნა"
          className="h-full min-w-0 flex-1 bg-transparent text-lead text-ink outline-none placeholder:text-body placeholder:text-faint"
        />
      </label>
      {groups.length ? (
        <Inner>
          {groups.map(g => {
            const expanded = Boolean(q) || open === g.title;
            return (
              <div key={g.title} className="flex flex-col">
                <Press
                  aria-expanded={expanded}
                  onClick={() => !q && toggle(g.title)}
                  className={cx('flex min-h-tap-lg w-full cursor-pointer items-center gap-2 py-2 pr-3 pl-4 text-left transition-colors active:bg-soft', FOCUS_IN)}
                >
                  <span className={cx('min-w-0 flex-1 text-body font-bold', expanded && 'text-wine')}>{g.title}</span>
                  <Small>{g.items.length}</Small>
                  {!q && <ChevronDown aria-hidden="true" className={cx('size-4 shrink-0 text-mut transition-transform', expanded && 'rotate-180 text-wine')} />}
                </Press>
                {expanded && (
                  <ul className="sg-in pb-1.5">
                    {g.items.map(p => (
                      <li key={p.id}>
                        <Press
                          onClick={() => onOpen(p.id)}
                          className={cx(
                            'flex min-h-tap w-full cursor-pointer items-center py-2 pr-4 pl-6 text-left text-body leading-snug transition-colors active:bg-soft',
                            resume?.id === p.id ? 'font-bold text-wine' : 'text-ink',
                            FOCUS_IN,
                          )}
                        >
                          {p.title}
                        </Press>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </Inner>
      ) : (
        <p className="px-1 text-meta text-mut">ვერაფერი მოიძებნა.</p>
      )}
    </div>
  );
};
