import React, { useMemo, useRef, useState } from 'react';
import {
  BookMarked, BookOpen, CalendarDays, Check, Clock, Compass, Feather, GraduationCap, Library, Moon, Music, Music2, Music4, Pencil,
  Plus, ScrollText, Sparkles, Star, Sun, Users, X, Pin, PinOff, Search, Guitar,
} from 'lucide-react';
import { useAuth, useNavigation } from '../../context';
import { useNotes } from '../../context/NotesContext';
import { openChurchCalendar } from '../../data/churchCalendar';
import { MORNING_EVENING } from '../../data/prayers';
import { SectionId } from '../../data/sections';
import { useMyClasses } from '../../hooks/useClasses';
import { useMyPsalterGroups } from '../../hooks/usePsalter';
import { useAccess } from '../../hooks/useAccess';
import { cycleOf, georgiaToday, kathismasOf, ownersIn } from '../../utils/psalter';
import { searchCatalog } from '../../utils/pathItems';
import {
  MAX_SHORTCUTS, SHORTCUT_GROUPS, kindOf, refOf, saveShortcuts, sectionOfShortcut, shortcutLabel, useMyShortcuts,
} from '../../utils/shortcuts';
import { triggerHaptic } from '../../utils/haptics';
import { openPathPanel } from '../views/IndependentWorkCard';
import { askSignIn } from '../access/SignInPrompt';
import { FIELD, IconBtn, Sheet } from '../ui/kit';

const SECTION_ICON: Record<SectionId, React.ReactNode> = {
  galoba: <Music2 />, simghera: <Music />, mtkmeli: <Feather />, sakravebi: <Guitar />, medavitneoba: <BookOpen />,
  chvevebi: <Sparkles />, tamashebi: <Star />, tsinaprebi: <Users />, gza: <Compass />, biblioteka: <Library />,
};
const SPECIAL_ICON: Record<string, React.ReactNode> = {
  kathisma: <BookMarked />, liturgy: <Music4 />, commemoration: <ScrollText />, calendar: <CalendarDays />, class: <GraduationCap />, teacher: <GraduationCap />,
};
export const shortcutIcon = (id: string): React.ReactNode => {
  const ref = refOf(id);
  switch (kindOf(id)) {
    case 'section': return SECTION_ICON[ref as SectionId] || <Star />;
    case 'special': return SPECIAL_ICON[ref] || <Star />;
    case 'chant': return <Music2 />;
    case 'prayer':
      if (ref.startsWith('kathisma') || ref === 'psalter-rule') return <BookOpen />;
      if (ref.startsWith('hour-')) return <Clock />;
      if (ref.startsWith('akathist')) return <Star />;
      return ref === MORNING_EVENING[0].id ? <Sun /> : <Moon />;
  }
  return <Star />;
};

/** Opens a shortcut (the guest's and kids' limits apply). */
export const useOpenShortcut = () => {
  const { user } = useAuth();
  const { navigateTo, openPrayer, openCommemoration, openClass } = useNavigation();
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
            const c = cycleOf(georgiaToday(), g.cycleDays);
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
  const { user } = useAuth();
  const { list, loaded } = useMyShortcuts(user?.uid);
  const classes = useMyClasses(user?.uid);
  const access = useAccess();
  const open = useOpenShortcut();
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [drag, setDrag] = useState<{ from: number; to: number } | null>(null);
  const press = useRef<{ t: number; x: number; y: number; long: boolean; idx: number } | null>(null);

  const classDefaults = classes.find(c => c.defaultShortcuts?.length)?.defaultShortcuts || [];
  const own = list !== null;
  const ids = useMemo(
    () => (own ? list! : classDefaults).filter(id => {
      if (!shortcutLabel(id)) return false;
      const sec = sectionOfShortcut(id);
      return !sec || access.section(sec) !== 'hidden';
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list, classDefaults.join(','), access]
  );

  if (!user || !loaded) return null;
  if (variant === 'home' && ids.length === 0) return null;

  const save = (next: string[]) => saveShortcuts(user.uid, next).catch(() => {});
  const remove = (id: string) => { triggerHaptic(12); save(ids.filter(x => x !== id)); };
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
    if (p && !p.long && !editing) open(id);
  };

  return (
    <section className={variant === 'home' ? 'relative mt-6 w-full max-w-md text-left' : 'rounded-3xl bg-white/80 ring-1 ring-[#e8dcc8] p-4 sm:p-5'}>
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
        {order.map((id, i) => {
          const l = shortcutLabel(id)!;
          const dragging = drag && order[drag.to] === id;
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
                className={`w-full h-[92px] rounded-2xl bg-white ring-1 ring-[#e8dcc8] flex flex-col items-center justify-center gap-1.5 px-1.5 text-center cursor-pointer transition shadow-[0_2px_6px_-4px_rgba(74,52,38,0.4)] ${
                  editing ? 'animate-[sg-wiggle_0.35s_ease-in-out_infinite_alternate]' : 'hover:ring-[#7a2028]/40 active:scale-95'
                } ${dragging ? 'ring-2 !ring-[#7a2028] scale-105 z-10' : ''}`}
              >
                <span className="w-9 h-9 rounded-xl bg-[#7a2028]/[0.08] text-[#7a2028] flex items-center justify-center [&>svg]:w-[19px] [&>svg]:h-[19px]">{shortcutIcon(id)}</span>
                {/* a long single word gets a size smaller rather than being split */}
                <span className={`w-full leading-[1.2] font-bold text-[#4a3426] line-clamp-2 ${Math.max(...l.label.split(/\s+/).map(w => w.length)) > 11 ? 'text-[11px] tracking-[-0.01em]' : 'text-[12px]'}`}>{l.label}</span>
              </button>
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
              className="w-full h-[92px] rounded-2xl border-2 border-dashed border-[#d9c8ac] text-[#8a7a6a] hover:text-[#7a2028] hover:border-[#7a2028]/40 flex flex-col items-center justify-center gap-1 cursor-pointer transition">
              <Plus className="w-6 h-6" />
              <span className="text-[11px] font-bold">დამატება</span>
            </button>
          </li>
        )}
      </ul>
      {editing && <p className="mt-2 text-[11.5px] text-[#8a7a6a] px-0.5">გადაიტანე ღილაკი სხვა ადგილზე ან წაშალე ✕-ით.</p>}

      <ShortcutPicker open={adding} onClose={() => setAdding(false)} current={ids} onChange={save} />
    </section>
  );
};

/** The "+" sheet: everything that can go on the home page, by section; a chant version by search. */
export const ShortcutPicker: React.FC<{ open: boolean; onClose: () => void; current: string[]; onChange: (next: string[]) => void; max?: number }> = ({ open, onClose, current, onChange, max = MAX_SHORTCUTS }) => {
  const { isTeacher } = useAuth();
  const access = useAccess();
  const [q, setQ] = useState('');
  const hits = useMemo(() => (q.trim() ? searchCatalog(q, 40).filter(e => e.category === 'galoba').slice(0, 12) : []), [q]);
  const full = current.length >= max;
  const toggle = (id: string) => {
    triggerHaptic(10);
    if (current.includes(id)) onChange(current.filter(x => x !== id));
    else if (!full) onChange([...current, id]);
  };
  const groups = SHORTCUT_GROUPS.map(g => ({
    ...g,
    ids: [...g.ids, ...(g.title === 'სწავლა' && isTeacher ? ['special:teacher'] : [])].filter(id => {
      const sec = sectionOfShortcut(id);
      return !sec || access.section(sec) !== 'hidden';
    }),
  }));
  const Chip: React.FC<{ id: string }> = ({ id }) => {
    const l = shortcutLabel(id);
    if (!l) return null;
    const on = current.includes(id);
    return (
      <button type="button" onClick={() => toggle(id)} disabled={!on && full} aria-pressed={on}
        className={`h-11 pl-1.5 pr-3.5 rounded-2xl inline-flex items-center gap-2 text-[13px] font-semibold cursor-pointer transition disabled:opacity-40 disabled:cursor-default ${on ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] hover:ring-[#7a2028]/40'}`}>
        <span className={`w-8 h-8 rounded-xl flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4 ${on ? 'bg-white/15' : 'bg-[#7a2028]/[0.08] text-[#7a2028]'}`}>{on ? <Check /> : shortcutIcon(id)}</span>
        <span className="text-left leading-tight">{l.label}{l.sub && <span className={`block text-[10.5px] font-normal ${on ? 'text-[#fbf6ec]/75' : 'text-[#8a7a6a]'}`}>{l.sub}</span>}</span>
      </button>
    );
  };
  return (
    <Sheet open={open} onClose={onClose} title={`ღილაკის დამატება · ${current.length}/${max}`} wide>
      <div className="space-y-5">
        {full && <p className="p-3 rounded-xl bg-amber-50 ring-1 ring-amber-200 text-[13px] text-amber-900">უკვე {max} ღილაკია — ახლის დასამატებლად ჯერ რომელიმე მოხსენი.</p>}
        {groups.map(g => (
          <div key={g.title}>
            <p className="text-xs font-bold uppercase tracking-wide text-[#8a7a6a] mb-2">{g.title}</p>
            <div className="flex flex-wrap gap-2">{g.ids.map(id => <Chip key={id} id={id} />)}</div>
            {g.title === 'გალობა' && (
              <div className="mt-3 space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-[#b3a594] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input value={q} onChange={e => setQ(e.target.value)} placeholder="ერთი კონკრეტული საგალობელი…" className={`${FIELD} pl-10`} />
                </div>
                {hits.length > 0 && <div className="flex flex-wrap gap-2">{hits.map(h => <Chip key={h.id} id={`chant:${h.id}`} />)}</div>}
              </div>
            )}
          </div>
        ))}
      </div>
    </Sheet>
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
