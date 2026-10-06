import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, CalendarClock, ClipboardCheck, ClipboardList, GraduationCap, MessagesSquare, Music4, Plus, Settings2, Users, ChevronRight } from 'lucide-react';
import { useAuth, useNavigation, ROLE_LABEL } from '../context';
import { useNotes } from '../context/NotesContext';
import { SchoolClass, useManagedClasses } from '../hooks/useClasses';
import { useClassStudents } from '../hooks/useTeaching';
import { PsalterGroup, useAllPsalterGroups, useGroupNow, useMyPsalterGroups } from '../hooks/usePsalter';
import { useDirectory, shownName } from '../utils/directory';
import { readCount, KATHISMA_COUNT, formatRange } from '../utils/psalter';
import { Bar, Btn, Card, CardTitle, Empty, Flash, PageTop, Tabs, useFlash } from '../components/ui/kit';
import { ClassLogo } from '../components/classes/ClassLogo';
import { ClassesAdmin } from '../components/admin/ClassesAdmin';
import { StudentsOverview } from '../components/teacher/StudentsOverview';
import { AssignmentsPanel } from '../components/teacher/AssignmentsPanel';
import { AttendancePanel } from '../components/teacher/AttendancePanel';
import { SchedulePanel } from '../components/teacher/Schedule';
import { CreateGroupSheet, openPsalterGroup } from './PsalterPage';

type Tab = 'students' | 'assignments' | 'attendance' | 'schedule' | 'class' | 'groups';
const TAB_KEY = 'sg-teacher-tab';
const CLASS_KEY = 'sg-teacher-class';
const remember = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } };
const recall = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };

// "მასწავლებლის პანელი": a teacher's own classes (an admin's: every class) and psalter groups.
export const TeacherPage: React.FC = () => {
  const { user, role, isAdmin } = useAuth();
  const { handleGoBack, openClass } = useNavigation();
  const { openProgram } = useNotes();
  const { classes, loading } = useManagedClasses();
  const [classId, setClassId] = useState<string | null>(() => recall(CLASS_KEY));
  const [tab, setTab] = useState<Tab>(() => (recall(TAB_KEY) as Tab) || 'students');
  const cls = classes.find(c => c.id === classId) || classes[0] || null;
  const records = useClassStudents(cls);

  useEffect(() => { remember(TAB_KEY, tab); }, [tab]);
  const pickClass = (id: string) => { setClassId(id); remember(CLASS_KEY, id); };

  const tabs = [
    { id: 'students' as const, label: 'მოსწავლეები', Icon: Users },
    { id: 'assignments' as const, label: 'დავალებები', Icon: ClipboardList },
    { id: 'attendance' as const, label: 'დასწრება', Icon: ClipboardCheck },
    { id: 'schedule' as const, label: 'ცხრილი', Icon: CalendarClock },
    { id: 'class' as const, label: 'კლასი', Icon: Settings2 },
    { id: 'groups' as const, label: 'ფსალმუნი', Icon: BookOpen },
  ];
  const shownTab: Tab = !cls && tab !== 'groups' ? 'groups' : tab;

  return (
    <div className="w-full max-w-3xl mx-auto px-1 py-4 sm:py-6 space-y-5 pb-14 text-[#2a2017]">
      <PageTop title="მასწავლებლის პანელი" subtitle={`${ROLE_LABEL[role]} · ${user?.displayName || user?.email || ''}`} onBack={handleGoBack} />

      {/* the classes: pick one */}
      {loading ? null : classes.length === 0 ? (
        <Empty icon={<GraduationCap />} title="კლასი ჯერ არ გაქვს"
          text={isAdmin ? 'შექმენი კლასი ადმინის პანელში და მიაბი მასწავლებელი.' : 'ადმინი მიგაბამს კლასს — მერე აქ გამოჩნდება მოსწავლეები, დავალებები და დასწრება. ფსალმუნთა ჯგუფის შექმნა უკვე შეგიძლია.'} />
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-3 -mb-2 -mx-1 px-1 snap-x">
          {classes.map(c => {
            const on = c.id === cls?.id;
            return (
              <button key={c.id} type="button" onClick={() => pickClass(c.id)}
                className={`snap-start shrink-0 max-w-[85%] flex items-center gap-2.5 min-h-14 py-1.5 pl-1.5 pr-4 rounded-2xl cursor-pointer transition ${on ? 'bg-[#7a2028] text-[#fbf6ec] shadow-[0_6px_16px_-10px_rgba(122,32,40,0.9)]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] hover:ring-[#7a2028]/40'}`}>
                <ClassLogo name={c.name} logo={c.logo} className="w-11 h-11 text-base shrink-0" />
                <span className="text-left min-w-0">
                  <span className="block text-sm font-bold leading-tight line-clamp-2">{c.name}</span>
                  <span className={`block text-[11.5px] ${on ? 'text-[#fbf6ec]/75' : 'text-[#8a7a6a]'}`}>{c.members.length} მოსწავლე</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* quick doors */}
      {cls && (
        <div className="grid grid-cols-2 gap-2.5">
          <QuickDoor icon={<Music4 />} title="დღევანდელი წირვა" text="ვერსიები და გაგზავნა" onClick={openProgram} />
          <QuickDoor icon={<MessagesSquare />} title="კლასის ჩატი" text="შეტყობინება კლასს" onClick={() => openClass(cls.id)} />
        </div>
      )}

      <Tabs cols={3} value={shownTab} onChange={setTab} items={cls ? tabs : tabs.filter(t => t.id === 'groups')} />

      {cls && shownTab === 'students' && <StudentsOverview cls={cls} records={records} />}
      {cls && shownTab === 'assignments' && <AssignmentsPanel cls={cls} records={records} />}
      {cls && shownTab === 'attendance' && <AttendancePanel cls={cls} />}
      {cls && shownTab === 'schedule' && <SchedulePanel cls={cls} />}
      {cls && shownTab === 'class' && <ClassTab cls={cls} classes={classes} />}
      {shownTab === 'groups' && <GroupsTab />}
    </div>
  );
};

const QuickDoor: React.FC<{ icon: React.ReactNode; title: string; text: string; onClick: () => void }> = ({ icon, title, text, onClick }) => (
  <button type="button" onClick={onClick}
    className="relative flex flex-col items-start gap-2 p-3.5 rounded-2xl bg-white/85 ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40 text-left cursor-pointer transition active:scale-[0.98]">
    <span className="w-10 h-10 rounded-xl bg-[#7a2028]/[0.08] text-[#7a2028] flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5">{icon}</span>
    <ChevronRight className="absolute top-4 right-3 w-4 h-4 text-[#b3a594]" />
    <span>
      <span className="block text-[15px] font-bold text-[#4a3426] leading-tight">{title}</span>
      <span className="block mt-0.5 text-xs text-[#8a7a6a] leading-snug">{text}</span>
    </span>
  </button>
);

/** The class itself: name, logo, members (from the people list), program, class mode, members' paths. */
const ClassTab: React.FC<{ cls: SchoolClass; classes: SchoolClass[] }> = ({ cls, classes }) => {
  const { isTeacher } = useAuth();
  const { people, loading } = useDirectory(isTeacher);
  const msg = useFlash();
  const students = useMemo(() => people.map(p => ({ userId: p.uid, name: shownName(p), photoURL: p.photoURL })), [people]);
  return (
    <Card>
      <Flash flash={msg.flash} onClose={msg.clear} />
      <ClassesAdmin mode="teacher" classes={classes} loading={loading} students={students} onMessage={msg.say} openId={cls.id} key={cls.id} />
    </Card>
  );
};

/** The teacher's psalter groups (an admin sees every group). */
const GroupsTab: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const mine = useMyPsalterGroups(user?.uid);
  const all = useAllPsalterGroups(isAdmin);
  const groups = isAdmin ? all.groups : mine.groups.filter(g => user && g.teacherIds.includes(user.uid));
  const [creating, setCreating] = useState(false);
  return (
    <div className="space-y-3">
      <Card>
        <CardTitle icon={<BookOpen />} title="ფსალმუნთა ჯგუფები" hint="ჯგუფის შექმნა, 20 კანონის განაწილება, ისტორია და შეხსენებები"
          right={<Btn size="sm" icon={<Plus />} onClick={() => setCreating(true)}>ახალი</Btn>} />
        {groups.length === 0 ? (
          <p className="text-sm text-[#8a7a6a]">ჯგუფი ჯერ არ გაქვს.</p>
        ) : (
          <ul className="space-y-2.5">{groups.map(g => <GroupRow key={g.id} group={g} />)}</ul>
        )}
      </Card>
      <CreateGroupSheet open={creating} onClose={() => setCreating(false)} />
    </div>
  );
};

const GroupRow: React.FC<{ group: PsalterGroup }> = ({ group }) => {
  const { navigateTo } = useNavigation();
  const { cycle, slots } = useGroupNow(group, null);
  const read = readCount(slots);
  return (
    <li>
      <button type="button" onClick={() => { openPsalterGroup(group.id); navigateTo('psalter'); }}
        className="w-full text-left p-3.5 rounded-2xl bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40 cursor-pointer transition">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-xl bg-[#7a2028] text-[#fbf6ec] flex items-center justify-center shrink-0"><BookOpen className="w-5 h-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-[#2a2017] truncate">{group.name}</span>
            <span className="block text-xs text-[#8a7a6a]">{group.members.length} წევრი · ციკლი {cycle ? formatRange(cycle) : ''}</span>
          </span>
          <span className="text-sm font-bold tabular-nums text-[#7a2028]">{read}/{KATHISMA_COUNT}</span>
        </div>
        <div className="mt-2.5"><Bar value={read} max={KATHISMA_COUNT} tone={read === KATHISMA_COUNT ? 'green' : 'wine'} /></div>
      </button>
    </li>
  );
};
