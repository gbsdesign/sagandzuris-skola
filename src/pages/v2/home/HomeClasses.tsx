import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Users } from 'lucide-react';
import { useAuth, useNavigation } from '../../../context';
import { Avatar, Badge, FOCUS_IN, Press, Rows, cx } from '../../../components/ui2';
import { useAllMyClasses } from '../../../components/classes/ClassPicker';
import { useManagedClasses, type SchoolClass } from '../../../hooks/useClasses';
import { classChatBase, isClassUnread, useChatSeen, useClassLasts } from '../../../hooks/useClassChat';
import { useUnreadCounts, type CountAsk } from '../../../hooks/useUnreadCounts';
import { useAccess } from '../../../hooks/useAccess';
import { nextLessonShort } from '../klasi/ClassesList';
import { BirthdaysSoon } from '../../../components/home/BirthdaysSoon';

// The home's classes (2026-11-21, the user: „მთავარ გვერდზე მოსწავლეს უჩანდეს თავისი კლასის ღილაკი და ავტომატური სასწავლო პროგრამა …
// ადმინებს და მასწავლებლებს მთავარ გვერდზე გამოუჩინე ლამაზად გახსნილი კლასების სია“; the path's „კლასი“ row is gone):
// a member — their class(es); a teacher — the classes they lead; an admin — every class.
// Since 2026-11-22 it stands under the quick buttons, and the staff's list is a fold, shut at first, with the coming birthdays
// inside it (the user: „სწრაფი ღილაკები ზევით აიტანე, კლასების ზემოთ, ხოლო კლასები ქვემოთ და ჩამოსაშლელი გახადე, შიგნით მოექცეს
// დაბადების დღეც“). A member's own class, and a teacher's only class, stay one tap away, not folded.

/** a teacher or an admin: the list shows the classes they manage */
export const useHomeIsStaff = () => {
  const { isTeacher, isAdmin } = useAuth();
  return isTeacher || isAdmin;
};

const ClassRows: React.FC<{ classes: SchoolClass[] }> = ({ classes }) => {
  const { user } = useAuth();
  const { openClass } = useNavigation();
  const ids = classes.map(c => c.id);
  const lasts = useClassLasts(ids);
  const seen = useChatSeen(user?.uid);
  const unread = classes.filter(c => !!user && isClassUnread(lasts[c.id], seen[c.id], user.uid));
  const asks: CountAsk[] = unread.map(c => ({ id: c.id, base: classChatBase(c.id), since: seen[c.id] || 0, upTo: lasts[c.id]?.at?.getTime() ?? 0 }));
  const counts = useUnreadCounts(asks);
  return (
    <>
      {classes.map(c => {
        const next = nextLessonShort(c.schedule);
        const n = counts[c.id] ?? (unread.some(u => u.id === c.id) ? 1 : 0);
        // compact (2026-11-21, the user: „კლასების ჩამონათვალი … კომპაქტური და დახვეწილი“): a small photo, the name on one
        // line, the members and the next lesson in one quiet line under it
        return (
          <Press
            key={c.id}
            onClick={() => openClass(c.id)}
            className={cx('flex min-h-[54px] w-full cursor-pointer items-center gap-3 py-1.5 pr-2.5 pl-3 text-left text-ink transition-colors active:bg-soft', FOCUS_IN)}
          >
            <Avatar name={c.name} photo={c.logo} size={32} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-body leading-tight font-semibold">{c.name}</span>
              <span className="truncate text-meta leading-tight text-mut">
                {c.members.length} წევრი{next && <> · <span className="text-wine">{next}</span></>}
              </span>
            </span>
            {n > 0 && <Badge n={n} />}
            <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-mut/70" strokeWidth={2} />
          </Press>
        );
      })}
    </>
  );
};

/** the staff's fold stays as left for the visit */
const OPEN_KEY = 'sg-home-classes-open';
const readOpen = () => { try { return sessionStorage.getItem(OPEN_KEY) === '1'; } catch { return false; } };

/** The fold's head: „კლასები · N“ with a chevron — one white row, the card's only one while shut. */
export const ClassesHead: React.FC<{ count: number; open: boolean; onToggle: () => void }> = ({ count, open, onToggle }) => (
  <Press
    onClick={onToggle}
    aria-expanded={open}
    className={cx('flex min-h-[54px] w-full cursor-pointer items-center gap-3 py-1.5 pr-3.5 pl-3 text-left text-ink transition-colors active:bg-soft', FOCUS_IN)}
  >
    <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-tint text-wine [&_svg]:size-4">
      <Users strokeWidth={2} />
    </span>
    <span className="flex min-w-0 flex-1 items-baseline gap-1.5 text-body leading-tight">
      <b className="font-bold">კლასები</b>
      <span className="text-meta text-mut">· {count}</span>
    </span>
    <ChevronDown aria-hidden="true" className={cx('size-[18px] shrink-0 text-mut transition-transform', open && 'rotate-180')} strokeWidth={2} />
  </Press>
);

const StaffClasses: React.FC = () => {
  const { classes } = useManagedClasses();
  const access = useAccess();
  const birthdays = access.on('birthdays');
  const [open, setOpen] = useState(readOpen);
  const flip = () => {
    const next = !open;
    setOpen(next);
    try { sessionStorage.setItem(OPEN_KEY, next ? '1' : '0'); } catch { /* private mode */ }
  };
  // no classes: the birthdays keep their small pill
  if (!classes.length) return birthdays ? <BirthdaysSoon compact /> : null;
  // one class: nothing to fold — its row one tap away, the birthdays over it as before
  if (classes.length === 1) return <Rows className="w-full">{birthdays && <BirthdaysSoon row />}<ClassRows classes={classes} /></Rows>;
  return (
    <Rows className="w-full">
      <ClassesHead count={classes.length} open={open} onToggle={flip} />
      {/* birthdays: the first row inside; shut, it draws nothing but keeps the staff's phone notices going */}
      {birthdays && <BirthdaysSoon row quiet={!open} />}
      {/* the rows (and their chats' listeners) only while open */}
      {open && <ClassRows classes={classes} />}
    </Rows>
  );
};

const MemberHome: React.FC = () => {
  const access = useAccess();
  const mine = useAllMyClasses();
  const classes = access.can('classes') ? mine : [];
  if (!classes.length) return null;
  return <Rows className="w-full"><ClassRows classes={classes} /></Rows>;
};

export const HomeClasses: React.FC = () => {
  const { user } = useAuth();
  const staff = useHomeIsStaff();
  if (!user) return null;
  return staff ? <StaffClasses /> : <MemberHome />;
};
