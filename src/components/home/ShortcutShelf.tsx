import React, { Suspense, lazy, useMemo, useRef, useState } from 'react';
import {
  BookMarked, BookOpen, CalendarDays, Check, Clock, Compass, Feather, GraduationCap, Library, Moon, Music, Music2, Music4, Pencil,
  Plus, ScrollText, Sparkles, Star, Sun, Users, X, Pin, PinOff, Guitar, Church, NotebookPen, HandHeart, Flame, Heart,
  MessageCircle, UserPlus, ListMusic, Disc3, LayoutGrid, BarChart3, School, ClipboardList, ClipboardCheck, CalendarClock, Settings2,
} from 'lucide-react';
import { useAuth, useChants, useNavigation } from '../../context';
import { useNotes } from '../../context/NotesContext';
import { dayKey } from '../../utils/habitsWeek';
import { openChurchCalendar, todayIso } from '../../data/churchCalendar';
import { openSaintLife } from '../../data/saintLives';
import { MORNING_EVENING } from '../../data/prayers';
import { HabitMenu } from '../../data/habitsAndManera';
import { HabitPrayerMenu } from '../views/ChvevebiPanel';
import { useMyHabits } from '../../hooks/useMyHabits';
import { requestOpen } from '../../utils/searchOpen';
import { ServiceType } from '../../context/NavigationContext';
import { SectionId } from '../../data/sections';
import { useMyClasses } from '../../hooks/useClasses';
import { useMyPsalterGroups } from '../../hooks/usePsalter';
import { useAccess } from '../../hooks/useAccess';
import { cycleOf, georgiaToday, kathismasOf, ownersIn } from '../../utils/psalter';
import {
  MAX_SHORTCUTS, coreOf, habitOfShortcut, kindOf, markShortcutDone, refOf, roleAllows, saveShortcuts, sectionOfShortcut,
  shortcutLabel, useMyShortcuts,
} from '../../utils/shortcuts';
import { triggerHaptic } from '../../utils/haptics';
import { openPathPanel } from '../views/IndependentWorkCard';
import { askSignIn } from '../access/SignInPrompt';
import { IconBtn, Sheet } from '../ui/kit';
import { KathismaTiles } from '../psalter/KathismaTile';

const SECTION_ICON: Record<SectionId, React.ReactNode> = {
  galoba: <Music2 />, simghera: <Music />, mtkmeli: <Feather />, sakravebi: <Guitar />, medavitneoba: <BookOpen />, medavitneobaTopic: <BookOpen />,
  chvevebi: <Sparkles />, tamashebi: <Star />, tsinaprebi: <Users />, gza: <Compass />, biblioteka: <Library />,
};
const SPECIAL_ICON: Record<string, React.ReactNode> = {
  kathisma: <BookMarked />, liturgy: <Music4 />, commemoration: <ScrollText />, calendar: <CalendarDays />, class: <GraduationCap />, teacher: <GraduationCap />,
};
const HABIT_ICON: Record<string, React.ReactNode> = {
  habit_2: <BookOpen />, habit_3: <BookOpen />, habit_5: <Heart />, habit_4: <Library />, habit_14: <NotebookPen />,
  habit_11: <Church />, habit_12: <Church />, habit_8: <Flame />, habit_9: <HandHeart />, habit_10: <Sparkles />,
};
const TAB_ICON: Record<string, React.ReactNode> = {
  'teacher:students': <Users />, 'teacher:assignments': <ClipboardList />, 'teacher:attendance': <ClipboardCheck />,
  'teacher:schedule': <CalendarClock />, 'teacher:class': <Settings2 />, 'teacher:groups': <BookOpen />,
  'admin:users': <Users />, 'admin:classes': <GraduationCap />, 'admin:recordings': <Disc3 />, 'admin:sections': <LayoutGrid />,
  'admin:stats': <BarChart3 />, 'admin:school': <School />, 'admin:requests': <UserPlus />,
  'library:book': <BookOpen />, 'library:feasts': <CalendarDays />, 'library:lives': <Feather />, 'library:prayers': <ScrollText />,
  'library:sasuliero': <BookMarked />,
  'page:abituri': <GraduationCap />, 'page:messages': <MessageCircle />,
};
export const shortcutIcon = (id: string): React.ReactNode => {
  const ref = refOf(id);
  if (TAB_ICON[coreOf(id)]) return TAB_ICON[coreOf(id)];
  switch (kindOf(id)) {
    // a chapter, a month of lives: its book's icon
    case 'library': return TAB_ICON[`library:${ref.split(':')[0]}`] || <Library />;
    case 'chantof': return <Music2 />;
    case 'song': return <Music />;
    case 'ancestor': return <Users />;
    case 'feast': return <CalendarDays />;
    case 'life': return <Feather />;
    case 'habit': return HABIT_ICON[ref] || <Sparkles />;
    case 'service': return <ListMusic />;
    case 'section': return SECTION_ICON[ref as SectionId] || <Star />;
    case 'special': return SPECIAL_ICON[ref] || <Star />;
    case 'chant': return <Music2 />;
    case 'prayer':
      if (ref.startsWith('kathisma') || ref === 'psalter-rule') return <BookOpen />;
      if (ref.startsWith('hour-')) return <Clock />;
      if (ref.startsWith('akathist')) return <Star />;
      if (ref.startsWith('week-')) return ref.endsWith('dila') ? <Sun /> : <Moon />;
      return ref === MORNING_EVENING[0].id ? <Sun /> : <Moon />;
  }
  return <Star />;
};

/** Opens a shortcut (the guest's and kids' limits apply). */
export const useOpenShortcut = () => {
  const { user } = useAuth();
  const { navigateTo, openPrayer, openCommemoration, openClass, setSelectedService, setExpandedChantId, setChantSearch } = useNavigation();
  const { openNotes, openProgram } = useNotes();
  const classes = useMyClasses(user?.uid);
  const { groups } = useMyPsalterGroups(user?.uid);
  const access = useAccess();
  return (id: string) => {
    triggerHaptic(10);
    const ref = refOf(id);
    const sec = sectionOfShortcut(id);
    if (sec && access.section(sec) === 'locked') { askSignIn(shortcutLabel(id)?.label || ''); return; }
    switch (kindOf(id)) {
      case 'prayer': openPrayer(ref); return;
      case 'chant': openNotes(ref, 'bookmark'); return;
      case 'habit': openPathPanel('habits'); navigateTo('gz'); return;
      case 'service': navigateTo('galoba'); setSelectedService(ref as ServiceType); window.scrollTo({ top: 0 }); return;
      // a book, or a chapter of it ("book:12")
      case 'library': navigateTo('biblioteka'); requestOpen('biblioteka', ref); return;
      case 'chantof': {
        // the service's list, narrowed to this chant and unfolded
        const [service, chantId] = ref.split('/');
        navigateTo('galoba');
        setSelectedService(service as ServiceType);
        setExpandedChantId(chantId);
        setChantSearch(shortcutLabel(id)?.label || '');
        window.scrollTo({ top: 0 });
        return;
      }
      case 'song': requestOpen('simghera', ref); navigateTo('simghera'); return;
      case 'ancestor': requestOpen('tsinaprebi', ref); navigateTo('tsinaprebi'); return;
      case 'life': openSaintLife(ref); return;
      case 'feast': {
        // the feast's next day (this year or the next) in the church calendar
        const [gi, fi] = ref.split(':').map(Number);
        import('../../data/library/feasts').then(({ FEAST_GROUPS, feastDates }) => {
          const f = FEAST_GROUPS[gi]?.feasts[fi];
          const today = todayIso();
          const year = Number(today.slice(0, 4));
          const next = f && [...feastDates(f, year), ...feastDates(f, year + 1)].filter(d => d >= today).sort()[0];
          openChurchCalendar(next || undefined);
        }).catch(() => openChurchCalendar());
        return;
      }
      case 'page': navigateTo(ref as 'abituri' | 'messages'); return;
      // the panels open on the tab they remember
      case 'teacher': try { localStorage.setItem('sg-teacher-tab', ref); } catch { /* storage off */ } navigateTo('teacher'); return;
      case 'admin': try { localStorage.setItem('sg-admin-tab', ref === 'requests' ? 'users' : ref); } catch { /* storage off */ } navigateTo('admin'); return;
      case 'section':
        if (ref === 'chvevebi') { openPathPanel('habits'); navigateTo('gz'); return; }
        if (ref === 'medavitneoba') { navigateTo('psalter'); return; }
        navigateTo((ref === 'gza' ? 'gz' : ref) as Parameters<typeof navigateTo>[0]);
        return;
      case 'special':
        if (ref === 'liturgy') openProgram();
        else if (ref === 'commemoration') openCommemoration();
        else if (ref === 'calendar') openChurchCalendar();
        else if (ref === 'teacher') navigateTo('teacher');
        else if (ref === 'class') { if (classes[0]) openClass(classes[0].id); }
        else if (ref === 'kathisma') {
          // straight to this cycle's kathisma text, if I have one
          const g = groups.find(x => user && x.memberIds.includes(user.uid));
          if (g && user) {
            const c = cycleOf(georgiaToday(), g.cycleDays, g.shiftDays);
            const mine = kathismasOf(ownersIn(g.assignment, g.baseHalf, c.half), user.uid);
            if (mine.length) { openPrayer(`kathisma-${mine[0]}`); return; }
          }
          navigateTo('psalter');
        }
    }
  };
};

// "ჩემი ღილაკები" under the vine (and, in `profile`, on the profile page). Hidden while there is nothing on it.
export const ShortcutShelf: React.FC<{ variant?: 'home' | 'profile' }> = ({ variant = 'home' }) => {
  const { user, isTeacher, isAdmin, isSuperAdmin } = useAuth();
  const { openPrayer } = useNavigation();
  const [menu, setMenu] = useState<{ menu: HabitMenu; title: string } | null>(null);
  const { list, loaded, done } = useMyShortcuts(user?.uid);
  const { habitLog, toggleHabitToday } = useChants();
  const classes = useMyClasses(user?.uid);
  const access = useAccess();
  const open = useOpenShortcut();
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [drag, setDrag] = useState<{ from: number; to: number } | null>(null);
  const press = useRef<{ t: number; x: number; y: number; long: boolean; idx: number } | null>(null);

  const { groups } = useMyPsalterGroups(user?.uid);
  // my own habits too: a habit button ticks or opens the habit as I set it up
  const myHabits = useMyHabits(user?.uid).groups.flatMap(g => g.items);
  // on the home page a psalter-group member's kathisma leads the shelf as its own tile
  const readingIn = variant === 'home' && user ? groups.filter(g => g.memberIds.includes(user.uid)) : [];
  const classDefaults = classes.find(c => c.defaultShortcuts?.length)?.defaultShortcuts || [];
  const own = list !== null;
  const all = useMemo(
    () => (own ? list! : classDefaults).filter(id => {
      if (!shortcutLabel(id) || !roleAllows(id, { isTeacher, isAdmin, isSuperAdmin })) return false;
      // a habit taken off my list takes its button with it
      if (kindOf(id) === 'habit' && !myHabits.some(h => h.id === refOf(id))) return false;
      const sec = sectionOfShortcut(id);
      return !sec || access.section(sec) !== 'hidden';
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list, classDefaults.join(','), access, isTeacher, isAdmin, isSuperAdmin, myHabits.map(h => h.id).join(',')]
  );
  // the plain "ჩემი კანონი" button would repeat the tile, so it hides behind it (and stays saved)
  const keptKathisma = readingIn.length > 0 && all.includes('special:kathisma');
  const ids = keptKathisma ? all.filter(id => id !== 'special:kathisma') : all;

  if (!user || !loaded) return null;
  if (variant === 'home' && ids.length === 0 && readingIn.length === 0) return null;

  const save = (next: string[]) => saveShortcuts(user.uid, keptKathisma ? [...next, 'special:kathisma'] : next).catch(() => {});
  const remove = (id: string) => { triggerHaptic(12); save(ids.filter(x => x !== id)); };
  // "✓ წავიკითხე": today's mark on the button, and its habit ticked too (taking the mark back leaves the habit)
  const todayHabits = habitLog[dayKey(new Date())] || [];
  const markDone = (id: string, habit: string) => {
    triggerHaptic(15);
    // a habit button is the habit itself: its mark is today's tick, both ways
    if (kindOf(id) === 'habit') { toggleHabitToday(habit); return; }
    const on = !done.includes(id);
    markShortcutDone(user.uid, done, id, on).catch(() => {});
    if (on && !(habitLog[dayKey(new Date())] || []).includes(habit)) toggleHabitToday(habit);
  };
  const order = drag ? (() => { const a = [...ids]; const [m] = a.splice(drag.from, 1); a.splice(drag.to, 0, m); return a; })() : ids;

  const onDown = (i: number) => (e: React.PointerEvent) => {
    press.current = { t: window.setTimeout(() => {
      if (!press.current) return;
      press.current.long = true;
      triggerHaptic(25);
      setEditing(true);
    }, 480), x: e.clientX, y: e.clientY, long: false, idx: i };
    if (editing) {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setDrag({ from: i, to: i });
    }
  };
  const onMove = (e: React.PointerEvent) => {
    const p = press.current;
    if (p && !p.long && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8) window.clearTimeout(p.t);
    if (!drag) return;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-tile]') as HTMLElement | null;
    const to = el ? Number(el.dataset.tile) : drag.to;
    if (!Number.isNaN(to) && to !== drag.to && to < ids.length) setDrag({ ...drag, to });
  };
  const onUp = (id: string) => () => {
    const p = press.current;
    press.current = null;
    if (p) window.clearTimeout(p.t);
    if (drag) {
      if (drag.from !== drag.to) save(order);
      setDrag(null);
      return;
    }
    if (p && !p.long && !editing) {
      if (kindOf(id) !== 'habit') { open(id); return; }
      // a habit with books (Gospel, Apostle, Jesus prayer) opens them; the others are ticked by the tap
      const ref = refOf(id);
      const h = myHabits.find(x => x.id === ref);
      if (h?.menu) setMenu({ menu: h.menu, title: h.label });
      else markDone(id, ref);
    }
  };

  return (
    <section className={variant === 'home' ? 'relative mt-6 w-[calc(100%+2.5rem)] sm:w-full max-w-md text-left' : 'rounded-3xl bg-white/80 ring-1 ring-[#e8dcc8] p-4 sm:p-5'}>
      <div className="flex items-center gap-2 mb-2.5 px-0.5">
        <h2 className="flex-1 font-serif-ge text-[15px] font-bold text-[#4a3426]">ჩემი ღილაკები</h2>
        {!own && ids.length > 0 && <span className="text-[11px] text-[#8a7a6a]">მასწავლებლის შერჩეული</span>}
        {(ids.length > 0 || variant === 'profile') && (
          editing ? (
            <button type="button" onClick={() => setEditing(false)} className="h-9 px-3.5 rounded-full bg-[#7a2028] text-[#fbf6ec] text-[13px] font-bold inline-flex items-center gap-1.5 cursor-pointer">
              <Check className="w-4 h-4" /> მზადაა
            </button>
          ) : (
            <IconBtn label="ღილაკების შეცვლა" onClick={() => setEditing(true)}><Pencil /></IconBtn>
          )
        )}
      </div>
      {variant === 'profile' && (
        <p className="mb-3 px-0.5 text-[13px] text-[#8a7a6a] leading-snug">
          {MAX_SHORTCUTS}-მდე ღილაკი მთავარ გვერდზე, ვაზის ქვეშ. დიდხანს დააჭირე — გადაადგილება ან წაშლა. ყველა გვერდზე „📌“ ღილაკიც ამატებს.
        </p>
      )}

      <ul className={`grid grid-cols-3 min-[480px]:grid-cols-4 gap-2 select-none ${editing ? 'touch-none' : ''}`}>
        {readingIn.map(g => <KathismaTiles key={g.id} group={g} uid={user.uid} />)}
        {order.map((id, i) => {
          const l = shortcutLabel(id)!;
          const dragging = drag && order[drag.to] === id;
          // a prayer, akathist or kathisma gets a "✓ წავიკითხე" corner; the tile then lays out to the left
          const habit = variant === 'home' ? habitOfShortcut(id) : null;
          const isDone = !!habit && (kindOf(id) === 'habit' ? todayHabits.includes(habit) : done.includes(id));
          const longest = Math.max(...l.label.split(/\s+/).map(w => w.length));
          return (
            <li key={id} data-tile={i} className="relative">
              <button
                type="button"
                onPointerDown={onDown(i)}
                onPointerMove={onMove}
                onPointerUp={onUp(id)}
                onPointerCancel={() => { if (press.current) window.clearTimeout(press.current.t); press.current = null; setDrag(null); }}
                onContextMenu={e => e.preventDefault()}
                aria-label={l.label}
                className={`w-full h-[104px] rounded-2xl ring-1 flex flex-col cursor-pointer transition shadow-[0_2px_6px_-4px_rgba(74,52,38,0.4)] ${
                  habit ? 'justify-between p-2 pb-2.5 text-left' : 'items-center justify-center gap-1.5 px-1.5 text-center'
                } ${isDone ? 'bg-emerald-50 ring-emerald-200' : 'bg-white ring-[#e8dcc8]'} ${
                  editing ? 'animate-[sg-wiggle_0.35s_ease-in-out_infinite_alternate]' : 'hover:ring-[#7a2028]/40 active:scale-95'
                } ${dragging ? 'ring-2 !ring-[#7a2028] scale-105 z-10' : ''}`}
              >
                <span className="w-9 h-9 rounded-xl bg-[#7a2028]/[0.08] text-[#7a2028] flex items-center justify-center [&>svg]:w-[19px] [&>svg]:h-[19px]">{shortcutIcon(id)}</span>
                {/* a long single word gets a size smaller rather than being split (sooner beside a ✓, with three lines) */}
                <span className={`w-full leading-[1.2] font-bold text-[#4a3426] ${
                  habit
                    ? `line-clamp-3 break-words ${longest > 9 ? 'text-[11px] tracking-[-0.02em]' : 'text-[12px]'}`
                    : `line-clamp-2 ${longest > 11 ? 'text-[11px] tracking-[-0.01em]' : 'text-[12px]'}`
                }`}>{l.label}</span>
              </button>
              {habit && !editing && (
                <button type="button" onClick={() => markDone(id, habit)} aria-pressed={isDone}
                  aria-label={isDone ? `${l.label} — მონიშვნის მოხსნა` : `${l.label} — წავიკითხე`} title={isDone ? 'დღეს წაკითხულია' : 'წავიკითხე'}
                  className={`absolute top-2 right-2 w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition active:scale-90 ${
                    isDone ? 'bg-emerald-500 text-white shadow' : 'ring-1 ring-[#d9c8ac] text-[#b3a594] hover:text-[#7a2028] hover:ring-[#7a2028]/40'
                  }`}>
                  <Check className="w-[18px] h-[18px] stroke-[3]" />
                </button>
              )}
              {editing && (
                <button type="button" onClick={() => remove(id)} aria-label={`${l.label} — წაშლა`}
                  className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-[#4a3426] text-white flex items-center justify-center shadow cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </li>
          );
        })}
        {ids.length < MAX_SHORTCUTS && (editing || variant === 'profile' || ids.length < 4) && (
          <li>
            <button type="button" onClick={() => setAdding(true)} aria-label="ღილაკის დამატება"
              className="w-full h-[104px] rounded-2xl border-2 border-dashed border-[#d9c8ac] text-[#8a7a6a] hover:text-[#7a2028] hover:border-[#7a2028]/40 flex flex-col items-center justify-center gap-1 cursor-pointer transition">
              <Plus className="w-6 h-6" />
              <span className="text-[11px] font-bold">დამატება</span>
            </button>
          </li>
        )}
      </ul>
      {editing && <p className="mt-2 text-[11.5px] text-[#8a7a6a] px-0.5">გადაიტანე ღილაკი სხვა ადგილზე ან წაშალე ✕-ით.</p>}

      <ShortcutPicker open={adding} onClose={() => setAdding(false)} current={ids} onChange={save} />
      <Sheet open={!!menu} onClose={() => setMenu(null)} title={menu?.title || ''}>
        {menu && <HabitPrayerMenu menu={menu.menu} onOpen={pid => { setMenu(null); openPrayer(pid); }} />}
      </Sheet>
    </section>
  );
};

const SearchPanel = lazy(() => import('../search/SearchPanel').then(m => ({ default: m.SearchPanel })));

/** The "+": everything that can go on the home page — searched, or unfolded from the catalog down to a single
 *  prayer, chant, chapter or habit (search/CatalogTree). A second tap takes a button off again. */
export const ShortcutPicker: React.FC<{ open: boolean; onClose: () => void; current: string[]; onChange: (next: string[]) => void; max?: number }> = ({ open, onClose, current, onChange, max = MAX_SHORTCUTS }) => {
  if (!open) return null;
  const full = current.length >= max;
  const has = (id: string) => current.some(x => coreOf(x) === coreOf(id));
  return (
    <Suspense fallback={<div className="fixed inset-0 z-[88] bg-[#2a2017]/45" />}>
      <SearchPanel
        onClose={onClose}
        pick={{
          title: `ღილაკის დამატება · ${current.length}/${max}`,
          isOn: has,
          full,
          fullNote: `უკვე ${max} ღილაკია — ახლის დასამატებლად ჯერ რომელიმე მოხსენი.`,
          onPick: id => {
            triggerHaptic(10);
            if (has(id)) onChange(current.filter(x => coreOf(x) !== coreOf(id)));
            else if (!full) onChange([...current, id]);
          },
        }}
      />
    </Suspense>
  );
};

/** "📌 მთავარზე გატანა": puts this page, prayer or chant on the home page (or takes it off). */
export const PinButton: React.FC<{ id: string; className?: string }> = ({ id, className }) => {
  const { user } = useAuth();
  const { list, loaded } = useMyShortcuts(user?.uid);
  const [note, setNote] = useState('');
  if (!user || !loaded || !shortcutLabel(id)) return null;
  const current = list || [];
  const pinned = current.includes(id);
  const toggle = () => {
    triggerHaptic(15);
    if (pinned) { saveShortcuts(user.uid, current.filter(x => x !== id)).catch(() => {}); setNote('მოიხსნა მთავარიდან'); }
    else if (current.length >= MAX_SHORTCUTS) setNote(`მთავარზე უკვე ${MAX_SHORTCUTS} ღილაკია`);
    else { saveShortcuts(user.uid, [...current, id]).catch(() => {}); setNote('გავიდა მთავარ გვერდზე'); }
    window.setTimeout(() => setNote(''), 2200);
  };
  return (
    <span className={`relative inline-flex ${className || ''}`}>
      <button type="button" onClick={toggle} aria-pressed={pinned} title={pinned ? 'მთავარიდან მოხსნა' : 'მთავარზე გატანა'} aria-label={pinned ? 'მთავარიდან მოხსნა' : 'მთავარზე გატანა'}
        className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition active:scale-95 [&>svg]:w-[17px] [&>svg]:h-[17px] ${pinned ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white/85 ring-1 ring-[#e8dcc8] text-[#7a2028] hover:ring-[#7a2028]/40'}`}>
        {pinned ? <PinOff /> : <Pin />}
      </button>
      {note && <span role="status" className="absolute right-0 top-full mt-1.5 z-20 whitespace-nowrap px-2.5 py-1 rounded-lg bg-[#2a2017] text-white text-[11.5px] font-semibold shadow sg-in">{note}</span>}
    </span>
  );
};
