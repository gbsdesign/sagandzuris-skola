import React from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
import { useAuth, useNavigation, useViewing } from '../../../context';
import { Avatar, Badge, Dot, Row, Rows, SectionLabel } from '../../../components/ui2';
import { useAllMyClasses } from '../../../components/classes/ClassPicker';
import { openAiLesson } from '../../../components/aiLesson/open';
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

/** the member's AI line shows on the home (so the qvevri's „გააგრძელე“ need not say the same) */
export const useHomeAiShown = () => {
  const { user } = useAuth();
  const viewing = useViewing();
  const access = useAccess();
  return !useHomeIsStaff() && !!user && !viewing && access.on('aiTeacher');
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
        return (
          <Row
            key={c.id}
            lead={<Avatar name={c.name} photo={c.logo} />}
            title={c.name}
            sub={`${c.members.length} წევრი${next ? ` · ${next}` : ''}`}
            right={<span className="flex shrink-0 items-center gap-2">{n > 0 && <Badge n={n} />}<ChevronRight aria-hidden="true" className="size-[18px] shrink-0 text-mut" strokeWidth={2} /></span>}
            onClick={() => openClass(c.id)}
          />
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
  const ai = useHomeAiShown();
  if (!classes.length && !ai) return null;
  return (
    <Rows className="w-full">
      {classes.length > 0 && <ClassRows classes={classes} />}
      {ai && (
        <Row lead={<Dot icon={<Sparkles />} color="wine" size={40} />} title="ავტომატური სასწავლო პროგრამა" sub="დღის გაკვეთილი · 10 წუთი" onClick={openAiLesson} />
      )}
    </Rows>
  );
};

export const HomeClasses: React.FC = () => {
  const { user } = useAuth();
  const staff = useHomeIsStaff();
  if (!user) return null;
  return staff ? <StaffClasses /> : <MemberHome />;
};
