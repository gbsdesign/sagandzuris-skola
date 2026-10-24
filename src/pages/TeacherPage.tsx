import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardList, GraduationCap, MessagesSquare, Music4, ChevronRight } from 'lucide-react';
import { useAuth, useNavigation, ROLE_LABEL } from '../context';
import { useNotes } from '../context/NotesContext';
import { SchoolClass, useManagedClasses } from '../hooks/useClasses';
import { useClassStudents } from '../hooks/useTeaching';
import { useDirectory, shownName } from '../utils/directory';
import { Empty, Flash, PageTop, Tabs, useFlash } from '../components/ui/kit';
import { ClassLogo } from '../components/classes/ClassLogo';
import { ClassesAdmin } from '../components/admin/ClassesAdmin';
import { StudentsOverview } from '../components/teacher/StudentsOverview';
import { ClassHeader } from '../components/teacher/ClassHeader';
import { AssignmentsPanel } from '../components/teacher/AssignmentsPanel';
import { ClassProgramPanel } from '../components/teacher/ClassProgramPanel';
import { OLD_TEACHER_TABS } from '../utils/shortcuts';

// „კლასი“ (id `students`): the class's name, mode, lessons, psalter group, members and attendance;
// „სასწავლო პროგრამა“ (id `assignments`): today's liturgy and the assignments
const TABS = [
  { id: 'students' as const, label: 'კლასი', Icon: GraduationCap },
  { id: 'assignments' as const, label: 'სასწავლო პროგრამა', Icon: ClipboardList },
];
type Tab = (typeof TABS)[number]['id'];
const TAB_KEY = 'sg-teacher-tab';
const CLASS_KEY = 'sg-teacher-class';
const remember = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } };
const recall = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const recallTab = (): Tab => {
  const t = recall(TAB_KEY) || '';
  const id = OLD_TEACHER_TABS[t] || t;
  return TABS.find(x => x.id === id)?.id || 'students';
};

// "მასწავლებლის პანელი": a teacher's own classes (an admin's: every class); the class's chat beside them.
export const TeacherPage: React.FC = () => {
  const { user, role, isAdmin } = useAuth();
  const { handleGoBack, openClass } = useNavigation();
  const { openProgram } = useNotes();
  const { classes, loading } = useManagedClasses();
  const [classId, setClassId] = useState<string | null>(() => recall(CLASS_KEY));
  const [tab, setTab] = useState<Tab>(recallTab);
  const [editing, setEditing] = useState(false);
  const msg = useFlash();
  const cls = classes.find(c => c.id === classId) || classes[0] || null;
  const records = useClassStudents(cls);

  useEffect(() => { remember(TAB_KEY, tab); }, [tab]);
  const pickClass = (id: string) => { setClassId(id); remember(CLASS_KEY, id); };

  return (
    <div className="w-full max-w-3xl mx-auto px-1 py-4 sm:py-6 space-y-5 pb-14 text-[#2a2017]">
      <PageTop title="მასწავლებლის პანელი" subtitle={`${ROLE_LABEL[role]} · ${user?.displayName || user?.email || ''}`} onBack={handleGoBack} />

      {/* the classes: pick one; the chosen class's chat on the right */}
      {loading ? null : classes.length === 0 ? (
        <Empty icon={<GraduationCap />} title="კლასი ჯერ არ გაქვს"
          text={isAdmin ? 'შექმენი კლასი ადმინის პანელში და მიაბი მასწავლებელი.' : 'ადმინი მიგაბამს კლასს — მერე აქ გამოჩნდება მოსწავლეები, დასწრება და სასწავლო პროგრამა.'} />
      ) : (
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0 flex gap-2 overflow-x-auto pb-3 -mb-2 -ml-1 pl-1 snap-x">
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
          {cls && (
            <button type="button" onClick={() => openClass(cls.id)} aria-label="კლასის ჩატი" title="კლასის ჩატი"
              className="shrink-0 mt-1.5 w-11 h-11 rounded-full bg-white ring-1 ring-[#e8dcc8] text-[#7a2028] shadow-[0_6px_14px_-10px_rgba(122,32,40,0.8)] hover:bg-[#7a2028] hover:text-[#fbf6ec] hover:ring-[#7a2028] flex items-center justify-center cursor-pointer transition active:scale-95">
              <MessagesSquare className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {cls && <Tabs cols={2} value={tab} onChange={setTab} items={TABS} />}

      <Flash flash={msg.flash} onClose={msg.clear} />
      {cls && tab === 'students' && <ClassHeader key={`h-${cls.id}`} cls={cls} />}
      {cls && tab === 'students' && <StudentsOverview key={cls.id} cls={cls} records={records} onEditClass={() => setEditing(true)} />}
      {cls && tab === 'assignments' && <LiturgyButton onClick={openProgram} />}
      {cls && tab === 'assignments' && <ClassProgramPanel key={`p-${cls.id}`} cls={cls} />}
      {cls && tab === 'assignments' && <AssignmentsPanel cls={cls} records={records} />}
      {cls && editing && <ClassSettings cls={cls} classes={classes} onMessage={msg.say} onClose={() => setEditing(false)} />}
    </div>
  );
};

/** „დღევანდელი მსახურება“: the regent's program — versions chosen and sent to the class. A small pill. */
const LiturgyButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <div>
    <button type="button" onClick={onClick} title="ვერსიების არჩევა და კლასისთვის გაგზავნა"
      className="inline-flex items-center gap-2.5 h-11 pl-1.5 pr-3.5 rounded-full bg-gradient-to-r from-[#7a2028] to-[#9a3a44] text-[#fbf6ec] text-sm font-bold shadow-[0_8px_18px_-10px_rgba(122,32,40,0.9)] cursor-pointer transition hover:brightness-110 active:scale-[0.97]">
      <span className="w-8 h-8 rounded-full bg-white/[0.18] ring-1 ring-white/25 flex items-center justify-center shrink-0"><Music4 className="w-4 h-4" /></span>
      დღევანდელი მსახურება
      <ChevronRight className="w-4 h-4 text-[#fbf6ec]/70 shrink-0" />
    </button>
  </div>
);

/** The class's window: members (from the people list), program, home buttons. */
export const ClassSettings: React.FC<{
  cls: SchoolClass;
  classes: SchoolClass[];
  onMessage: (text: string, type: 'success' | 'error') => void;
  onClose: () => void;
}> = ({ cls, classes, onMessage, onClose }) => {
  const { isTeacher } = useAuth();
  const { people, loading } = useDirectory(isTeacher);
  const students = useMemo(() => people.map(p => ({ userId: p.uid, name: shownName(p), photoURL: p.photoURL })), [people]);
  return <ClassesAdmin mode="teacher" classes={classes} loading={loading} students={students} onMessage={onMessage} openId={cls.id} onClose={onClose} key={cls.id} />;
};
