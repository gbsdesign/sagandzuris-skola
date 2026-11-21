import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useAuth, useNavigation } from '../../../context';
import { Avatar, Badge, FOCUS_IN, Press, Rows, SectionLabel, cx } from '../../../components/ui2';
import { useAllMyClasses } from '../../../components/classes/ClassPicker';
import { useManagedClasses, type SchoolClass } from '../../../hooks/useClasses';
import { classChatBase, isClassUnread, useChatSeen, useClassLasts } from '../../../hooks/useClassChat';
import { useUnreadCounts, type CountAsk } from '../../../hooks/useUnreadCounts';
import { useAccess } from '../../../hooks/useAccess';
import { nextLessonShort } from '../klasi/ClassesList';

// The home's classes (2026-11-21, the user: „მთავარ გვერდზე მოსწავლეს უჩანდეს თავისი კლასის ღილაკი და ავტომატური სასწავლო პროგრამა …
// ადმინებს და მასწავლებლებს მთავარ გვერდზე გამოუჩინე ლამაზად გახსნილი კლასების სია“; the path's „კლასი“ row is gone):
// a member — their class(es) and the AI teacher's day lesson; a teacher — the classes they lead; an admin — every class.

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

const StaffClasses: React.FC = () => {
  const { classes } = useManagedClasses();
  if (!classes.length) return null;
  return (
    <section className="flex w-full flex-col gap-2">
      <SectionLabel label={`კლასები · ${classes.length}`} />
      <Rows><ClassRows classes={classes} /></Rows>
    </section>
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
