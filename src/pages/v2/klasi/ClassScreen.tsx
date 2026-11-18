import React, { useEffect, useRef, useState } from 'react';
import { CalendarDays, Check, ChevronDown, ChevronRight, Ellipsis, Loader2, MessageCircle, TriangleAlert, Users } from 'lucide-react';
import { useAuth, useNavigation } from '../../../context';
import { Avatar, Button, Dot, Press, RoundButton, Row, Rows, Seg, Sheet, TopBar } from '../../../components/ui2';
import { useAllClasses, useMyClasses, useTeachingClasses, type SchoolClass } from '../../../hooks/useClasses';
import { useAllMyClasses } from '../../../components/classes/ClassPicker';
import { ClassChat, ClassCallButton } from '../../../components/classes/ClassChat';
import { useWide } from '../../../components/ui/kit';
import { classChatBase, isClassUnread, useChatSeen, useClassLasts } from '../../../hooks/useClassChat';
import { useUnreadCounts } from '../../../hooks/useUnreadCounts';
import { triggerHaptic } from '../../../utils/haptics';
import { nextLessonWords } from './ClassesList';
import { ProgramTab } from './ProgramTab';
import { MembersTab, useWriteTo } from './MembersTab';
import { EmptyClassScreen } from './EmptyClass';
import { ClassMoreSheet } from './teacher/More';
import { TimetableSheet } from './teacher/Timetable';

// the page's tabs; the one open is kept for the tab's visit (a chant opened from it comes back to it)
type Tab = 'program' | 'chat' | 'people';
const TAB_KEY = 'sg-class-tab:';
const savedTab = (id: string): Tab | null => {
  try {
    const t = sessionStorage.getItem(TAB_KEY + id);
    return t === 'program' || t === 'chat' || t === 'people' ? t : null;
  } catch {
    return null;
  }
};

/** Page `class` in the new look (boards x-klasi, x-tsevrebi, x-desk-klasi). A class nobody is in, or that is not found,
 *  shows x-carieli-klasi. (The program's order — mapItem `order` — is another screen; the router sends it there.) */
export const ClassScreen: React.FC = () => {
  const { user, isAdmin, isTeacher } = useAuth();
  const { selectedClassId } = useNavigation();
  const mine = useMyClasses(user?.uid);
  const all = useAllClasses(isAdmin);
  const teaching = useTeachingClasses(isTeacher ? user?.uid : null);
  const cls = [...mine, ...teaching.classes, ...all.classes].find(c => c.id === selectedClassId) || mine[0] || teaching.classes[0];

  // the lists come one after another: only after a moment, with nothing found, is it „not in a class“
  const [settled, setSettled] = useState(false);
  useEffect(() => { const t = window.setTimeout(() => setSettled(true), 1500); return () => window.clearTimeout(t); }, []);

  if (!cls) {
    if (!settled || teaching.loading || all.loading) {
      return <div className="flex w-full justify-center pt-24 text-mut" role="status" aria-label="იტვირთება"><Loader2 className="size-6 animate-spin" /></div>;
    }
    return <EmptyClassScreen />;
  }
  return <ClassView key={cls.id} cls={cls} />;
};

const ClassView: React.FC<{ cls: SchoolClass }> = ({ cls }) => {
  const { user, isAdmin } = useAuth();
  const { handleGoBack, openClass } = useNavigation();
  const wide = useWide();
  const myClasses = useAllMyClasses();
  const [picking, setPicking] = useState(false);
  const [more, setMore] = useState(false);
  const [timetable, setTimetable] = useState(false);
  const [tabState, setTabState] = useState<Tab>(() => savedTab(cls.id) ?? 'program');
  // a computer shows the chat in its own column: its left part is the program or the members
  const tab: Tab = wide && tabState === 'chat' ? 'program' : tabState;
  const chatBox = useRef<HTMLDivElement>(null);
  const showChat = useRef(false);
  const { writeTo, opening, error } = useWriteTo(cls);

  const iTeach = !!user && cls.teacherIds.includes(user.uid);
  const iAmMember = !!user && cls.memberIds.includes(user.uid);
  const canEdit = iTeach || isAdmin;
  const canSwitch = myClasses.length > 1;

  // the chat's unread dot as the old tabs showed it, with the count when it is known
  const lasts = useClassLasts([cls.id]);
  const seen = useChatSeen(user?.uid);
  const unread = !!user && tab !== 'chat' && isClassUnread(lasts[cls.id], seen[cls.id], user.uid);
  const counts = useUnreadCounts(unread ? [{ id: cls.id, base: classChatBase(cls.id), since: seen[cls.id] || 0, upTo: lasts[cls.id]?.at?.getTime() ?? 0 }] : []);
  const unreadN = unread ? counts[cls.id] ?? 1 : 0;

  const setTab = (t: Tab) => {
    if (t === 'chat' && !wide) showChat.current = true;
    setTabState(t);
    try { sessionStorage.setItem(TAB_KEY + cls.id, t); } catch { /* private window: this visit only */ }
  };
  useEffect(() => {
    if (tab !== 'chat' || !showChat.current) return;
    showChat.current = false;
    const id = requestAnimationFrame(() => chatBox.current?.scrollIntoView({ block: 'end', behavior: 'smooth' }));
    return () => cancelAnimationFrame(id);
  }, [tab]);

  const myTeachers = iAmMember ? cls.teachers.filter(t => t.uid !== user?.uid) : [];
  const next = nextLessonWords(cls.schedule, wide);
  const teacherNames = cls.teachers.map(t => t.name).filter(Boolean).join(', ');

  const title = canSwitch ? (
    <button type="button" onClick={() => { triggerHaptic(10); setPicking(true); }} aria-haspopup="dialog" title="სხვა კლასზე გადასვლა"
      className="flex max-w-full cursor-pointer items-center gap-1 text-left">
      <span className="min-w-0 truncate">{cls.name}</span>
      <ChevronDown aria-hidden="true" className="size-5 shrink-0 text-wine" />
    </button>
  ) : cls.name;

  const lesson = next || canEdit ? (
    <Press onClick={() => setTimetable(true)} aria-haspopup="dialog"
      className="flex min-h-row w-full cursor-pointer items-center gap-3 rounded-card bg-surf py-2 pr-4 pl-3.5 text-left text-ink transition active:bg-soft">
      <Dot icon={<CalendarDays />} size={40} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-meta text-mut">{next ? 'შემდეგი გაკვეთილი' : 'გაკვეთილები'}</span>
        <span className="truncate text-lead font-bold">{next ?? 'ცხრილი ჯერ არ არის'}</span>
      </span>
      <span className="flex shrink-0 items-center gap-0.5 text-meta font-bold text-wine">
        {next ? 'ცხრილი' : 'დამატება'}<ChevronRight aria-hidden="true" className="size-[18px]" strokeWidth={2} />
      </span>
    </Press>
  ) : null;

  const noTeacher = isAdmin && cls.teacherIds.length === 0 ? (
    <Press onClick={() => setMore(true)}
      className="flex min-h-14 w-full cursor-pointer items-center gap-2.5 rounded-card bg-gold-tint px-4 py-2 text-left text-body font-semibold text-gold-ink">
      <TriangleAlert aria-hidden="true" className="size-[18px] shrink-0" />
      <span className="min-w-0 flex-1">მასწავლებელი არ ჰყავს — დანიშვნა</span>
      <ChevronRight aria-hidden="true" className="size-[18px] shrink-0" />
    </Press>
  ) : null;

  const chat = wide ? (
    <ClassChat cls={cls} timetable={false} compact />
  ) : (
    // a phone: the chat fills the screen under the tabs — its messages scroll inside, the field always in view
    <div ref={chatBox} className="h-[calc(100dvh-5.5rem)] min-h-[26rem] scroll-mb-3">
      <ClassChat cls={cls} timetable={false} fill chain bare />
    </div>
  );

  const left = tab === 'people' ? <MembersTab cls={cls} canEdit={canEdit} /> : <ProgramTab cls={cls} canEdit={canEdit} />;

  return (
    <div className="flex w-full flex-col gap-2.5 pb-4">
      <TopBar
        title={title}
        sub={wide ? `${cls.members.length} წევრი${teacherNames ? ` · ${teacherNames}` : ''}` : undefined}
        onBack={handleGoBack}
        right={
          <>
            {wide && (
              <Button kind={tab === 'people' ? 'primary' : 'ghost'} size="md" icon={<Users />} onClick={() => setTab(tab === 'people' ? 'program' : 'people')}>წევრები</Button>
            )}
            {tab === 'chat' && !wide ? (
              <ClassCallButton cls={cls} />
            ) : (canEdit || myTeachers.length > 0) && (
              <RoundButton label="მეტი" onClick={() => setMore(true)}><Ellipsis /></RoundButton>
            )}
          </>
        }
      />
      {noTeacher}
      {error && <p role="alert" className="px-1.5 text-meta text-danger">{error}</p>}
      {lesson}

      {wide ? (
        <div className="grid grid-cols-[minmax(0,520px)_minmax(0,1fr)] items-start gap-6">
          <div className="flex min-w-0 flex-col gap-2.5">{left}</div>
          <div className="min-w-0 overflow-hidden rounded-card bg-surf">{chat}</div>
        </div>
      ) : (
        <>
          <Seg<Tab>
            label="კლასის ნაწილები"
            value={tab}
            onChange={setTab}
            items={[
              { id: 'program', label: 'პროგრამა' },
              { id: 'chat', label: 'ჩათი', badge: unreadN },
              { id: 'people', label: 'წევრები' },
            ]}
          />
          {tab === 'chat' ? chat : left}
        </>
      )}

      {/* my classes: a tap switches */}
      <Sheet open={picking} onClose={() => setPicking(false)} title={`ჩემი კლასები · ${myClasses.length}`}>
        <Rows>
          {myClasses.map(c => {
            const here = c.id === cls.id;
            return (
              <Row key={c.id} lead={<Avatar name={c.name} photo={c.logo} />} title={c.name}
                right={here ? <Check aria-hidden="true" className="size-5 shrink-0 text-wine" strokeWidth={3} /> : 'chev'}
                aria-current={here ? 'page' : undefined}
                onClick={() => { setPicking(false); if (!here) openClass(c.id); }} />
            );
          })}
        </Rows>
      </Sheet>

      {canEdit ? (
        <ClassMoreSheet cls={cls} open={more} onClose={() => setMore(false)} />
      ) : (
        // a member's „მეტი“: writing privately to each of the class's teachers (what the old bar's 💬 gave)
        <Sheet open={more} onClose={() => setMore(false)} title="მეტი">
          <Rows>
            {myTeachers.map(t => (
              <Row key={t.uid} lead={<Avatar name={t.name} photo={t.photoURL} />} title={`მისწერე: ${t.name}`} sub="პირადი შეტყობინება"
                right={opening === t.uid ? <Loader2 className="size-5 shrink-0 animate-spin text-mut" /> : <MessageCircle aria-hidden="true" className="size-5 shrink-0 text-wine" />}
                disabled={opening === t.uid}
                onClick={() => { setMore(false); void writeTo(t, true); }} />
            ))}
          </Rows>
        </Sheet>
      )}
      <TimetableSheet cls={cls} open={timetable} onClose={() => setTimetable(false)} edit={canEdit} />
    </div>
  );
};
