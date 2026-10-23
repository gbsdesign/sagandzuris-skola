import React, { useState } from 'react';
import { ArrowLeft, Users, MessageCircle, Loader2, ChevronDown, Pencil, Music4, ClipboardCheck, ClipboardList, CalendarPlus } from 'lucide-react';
import { useAuth, useNavigation } from '../context';
import { useNotes } from '../context/NotesContext';
import { useMyClasses, useAllClasses, useTeachingClasses, useManagedClasses } from '../hooks/useClasses';
import { useClassStudents } from '../hooks/useTeaching';
import { LessonTable, ScheduleSheet } from '../components/teacher/Schedule';
import { ClassHeader } from '../components/teacher/ClassHeader';
import { ClassProgramPanel } from '../components/teacher/ClassProgramPanel';
import { StudentsOverview } from '../components/teacher/StudentsOverview';
import { AssignmentsPanel } from '../components/teacher/AssignmentsPanel';
import { ClassLogo } from '../components/classes/ClassLogo';
import { ClassChat } from '../components/classes/ClassChat';
import { ClassProgram } from '../components/classes/ClassProgram';
import { Avatar } from '../components/classes/ChatPanel';
import { Flash, IconBtn, Sheet, useFlash } from '../components/ui/kit';
import { ClassSettings } from './TeacherPage';
import { openThread, Person } from '../hooks/useDirectChat';
import type { ClassMember, SchoolClass } from '../hooks/useClasses';

// the teacher's windows opened from the class page (the teacher panel's parts)
type Panel = 'class' | 'program' | 'schedule' | 'members' | 'students' | 'assignments';
// a panel's card shown inside a window loses its own frame (no box in a box)
const FLAT = 'space-y-4 [&>section]:p-0 [&>section]:bg-transparent [&>section]:ring-0 [&>section]:shadow-none';

// A class's shared page: its program (at the top), chat and members. Members reach it from the class logo in the header.
// Its teachers and admins also see ✏️ on each card and the teacher panel's other parts as buttons under the title.
export const ClassPage: React.FC = () => {
  const { user, isAdmin, isTeacher } = useAuth();
  const { selectedClassId, handleGoBack, openDm } = useNavigation();
  const { openProgram } = useNotes();
  // a private chat being opened (the other person's uid), and why it could not be
  const [opening, setOpening] = useState<string | null>(null);
  const [dmErr, setDmErr] = useState('');
  const [showMembers, setShowMembers] = useState(false);
  const [panel, setPanel] = useState<Panel | null>(null);
  const msg = useFlash();
  const mine = useMyClasses(user?.uid);
  const { classes: all } = useAllClasses(isAdmin);
  const { classes: teaching } = useTeachingClasses(isTeacher ? user?.uid : null);
  const cls = [...mine, ...teaching, ...all].find(c => c.id === selectedClassId) || mine[0];

  if (!cls) {
    return (
      <div className="w-full max-w-2xl mx-auto py-16 text-center text-[#8a7a6a]">
        კლასი ვერ მოიძებნა.
        <div className="mt-4">
          <button type="button" onClick={handleGoBack} className="h-10 px-4 rounded-full ring-1 ring-[#e8dcc8] bg-white text-[#4a3426] font-semibold cursor-pointer">
            უკან
          </button>
        </div>
      </div>
    );
  }

  // private chats: a member writes to the class's teachers, a teacher of the class to its members
  const iTeach = !!user && cls.teacherIds.includes(user.uid);
  const iAmMember = !!user && cls.memberIds.includes(user.uid);
  const person = (p: ClassMember): Person => ({ uid: p.uid, name: p.name || '', photoURL: p.photoURL || '' });
  const meHere = (): Person => {
    const p = cls.members.find(m => m.uid === user?.uid) || cls.teachers.find(m => m.uid === user?.uid);
    return { uid: user!.uid, name: p?.name || user!.displayName || '', photoURL: p?.photoURL || user!.photoURL || '' };
  };
  const writeTo = async (other: ClassMember, otherIsTeacher: boolean) => {
    setDmErr('');
    setOpening(other.uid);
    try {
      const id = otherIsTeacher ? await openThread(person(other), meHere(), cls.id) : await openThread(meHere(), person(other), cls.id);
      openDm(id);
    } catch (e) {
      console.warn('dm: ', e);
      setDmErr('პირადი ჩათი ვერ გაიხსნა. სცადეთ მოგვიანებით.');
    } finally {
      setOpening(null);
    }
  };
  const myTeachers = iAmMember ? cls.teachers.filter(t => t.uid !== user?.uid) : [];
  const canEdit = iTeach || isAdmin;
  const pencil = (p: Panel, label: string) => canEdit && <IconBtn label={label} tone="wine" onClick={() => setPanel(p)}><Pencil /></IconBtn>;
  const close = () => setPanel(null);

  return (
    <div className="w-full max-w-2xl mx-auto px-1 py-4 sm:py-8 space-y-6 text-[#2a2017]">
      <button
        type="button"
        onClick={handleGoBack}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full ring-1 ring-[#e8dcc8] bg-white/80 hover:bg-white text-sm font-semibold text-[#4a3426] cursor-pointer active:scale-95"
      >
        <ArrowLeft className="w-4 h-4" /> უკან
      </button>

      <header className="flex flex-col items-center text-center gap-3">
        <ClassLogo name={cls.name} logo={cls.logo} className="w-24 h-24 text-4xl shadow-[0_0_0_4px_#fbf6ec,0_0_0_5px_#e8dcc8]" />
        <div className="flex items-center justify-center gap-1 max-w-full">
          <h1 className="min-w-0 font-serif-ge text-2xl sm:text-3xl font-bold text-[#4a3426]">{cls.name}</h1>
          {pencil('class', 'კლასის სახელი, ლოგო, რეჟიმი, ფსალმუნთა ჯგუფი')}
        </div>
        <p className="text-sm text-[#8a7a6a]">
          {cls.members.length} წევრი{cls.teachers.length > 0 && ` · მასწავლებელი: ${cls.teachers.map(t => t.name).join(', ')}`}
        </p>
        {myTeachers.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mt-1">
            {myTeachers.map(t => (
              <button
                key={t.uid}
                type="button"
                onClick={() => writeTo(t, true)}
                disabled={opening === t.uid}
                className="h-11 max-w-full pl-1.5 pr-4 rounded-full bg-white ring-1 ring-[#7a2028]/25 hover:ring-[#7a2028]/45 text-[#7a2028] text-sm font-bold inline-flex items-center gap-2 cursor-pointer active:scale-95 transition disabled:opacity-60"
              >
                <Avatar name={t.name} photoURL={t.photoURL} className="w-8 h-8 text-sm" />
                <span className="truncate">{myTeachers.length > 1 ? `მისწერეთ: ${t.name}` : 'მისწერეთ მასწავლებელს'}</span>
                {opening === t.uid ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" /> : <MessageCircle className="w-4 h-4 shrink-0" />}
              </button>
            ))}
          </div>
        )}
        {dmErr && <p className="text-sm text-[#a02c2c]">{dmErr}</p>}
        {/* the teacher panel's parts that have no card on this page */}
        {canEdit && (
          <div className="flex flex-wrap justify-center gap-2 mt-1">
            <TeacherBtn icon={<Music4 />} onClick={openProgram}>დღევანდელი მსახურება</TeacherBtn>
            <TeacherBtn icon={<ClipboardCheck />} onClick={() => setPanel('students')}>მოსწავლეები და დასწრება</TeacherBtn>
            <TeacherBtn icon={<ClipboardList />} onClick={() => setPanel('assignments')}>დავალებები</TeacherBtn>
            {cls.schedule.length === 0 && <TeacherBtn icon={<CalendarPlus />} onClick={() => setPanel('schedule')}>გაკვეთილების ცხრილი</TeacherBtn>}
          </div>
        )}
        {msg.flash && <div className="w-full text-left"><Flash flash={msg.flash} onClose={msg.clear} /></div>}
      </header>

      <ClassProgram cls={cls} action={pencil('program', 'პროგრამის რედაქტირება')} />

      {cls.schedule.length > 0 && <LessonTable slots={cls.schedule} title="გაკვეთილების ცხრილი" action={pencil('schedule', 'ცხრილის შეცვლა')} />}

      <ClassChat cls={cls} />

      {/* members: one folded line (count + a few faces); a tap shows the list */}
      <section className="bg-white/70 rounded-3xl ring-1 ring-[#e8dcc8] overflow-hidden">
        <div className="flex items-center">
        <button
          type="button"
          onClick={() => setShowMembers(o => !o)}
          aria-expanded={showMembers}
          className="flex-1 min-w-0 min-h-14 flex items-center gap-2 px-5 sm:px-6 py-3 text-left cursor-pointer transition-colors hover:bg-white/60"
        >
          <Users className="w-5 h-5 shrink-0 text-[#7a2028]" />
          <span className="font-serif-ge text-lg font-bold text-[#4a3426] truncate">კლასის წევრები</span>
          <span className="text-sm font-bold text-[#a4927c] tabular-nums">{cls.members.length}</span>
          <span className="flex-1" />
          {!showMembers && (
            <span aria-hidden className="flex -space-x-2">
              {cls.members.slice(0, 4).map((m, i) => (
                <span key={m.uid} className={`rounded-full ring-2 ring-[#fdfaf5] ${i === 3 ? 'hidden min-[400px]:block' : ''}`}>
                  <Avatar name={m.name} photoURL={m.photoURL} className="w-7 h-7 text-xs" />
                </span>
              ))}
            </span>
          )}
          <ChevronDown className={`w-5 h-5 shrink-0 text-[#a4927c] transition-transform ${showMembers ? 'rotate-180' : ''}`} />
        </button>
        {canEdit && <span className="shrink-0 pr-3">{pencil('members', 'წევრების დამატება და ამოღება')}</span>}
        </div>
        {showMembers && (
        <ul className="sg-in grid grid-cols-1 sm:grid-cols-2 gap-x-3 px-3 sm:px-4 pb-3">
          {cls.members.map(m => (
            <li key={m.uid} className={`min-h-12 flex items-center gap-2.5 px-2 py-1 rounded-xl ${m.uid === user?.uid ? 'bg-[#7a2028]/[0.05]' : ''}`}>
              <Avatar name={m.name} photoURL={m.photoURL} className="w-8 h-8 text-sm" />
              <span className="flex-1 min-w-0 text-[14px] font-semibold text-[#2a2017] truncate">
                {m.name}
                {m.uid === user?.uid && <span className="ml-1.5 text-xs font-normal text-[#8a7a6a]">(შენ)</span>}
              </span>
              {iTeach && m.uid !== user?.uid && (
                <button
                  type="button"
                  onClick={() => writeTo(m, false)}
                  disabled={opening === m.uid}
                  className="w-9 h-9 shrink-0 rounded-full text-[#7a2028] hover:bg-[#7a2028]/[0.07] flex items-center justify-center cursor-pointer active:scale-95 transition disabled:opacity-60"
                  title={`პირადი მიწერა: ${m.name}`}
                  aria-label={`პირადი მიწერა: ${m.name}`}
                >
                  {opening === m.uid ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                </button>
              )}
            </li>
          ))}
        </ul>
        )}
      </section>

      {canEdit && (
        <>
          <Sheet open={panel === 'class'} onClose={close} title="კლასის რედაქტირება">
            <div className={FLAT}><ClassHeader cls={cls} /></div>
          </Sheet>
          <Sheet open={panel === 'program'} onClose={close} title="პროგრამის რედაქტირება" wide>
            <div className={FLAT}><ClassProgramPanel cls={cls} /></div>
          </Sheet>
          <ScheduleSheet cls={cls} open={panel === 'schedule'} onClose={close} />
          {panel === 'members' && <MembersWindow cls={cls} onMessage={msg.say} onClose={close} />}
          {(panel === 'students' || panel === 'assignments') && (
            <RecordsWindow cls={cls} which={panel} onClose={close} onEditClass={() => setPanel('members')} />
          )}
        </>
      )}
    </div>
  );
};

const TeacherBtn: React.FC<{ icon: React.ReactNode; onClick: () => void; children: React.ReactNode }> = ({ icon, onClick, children }) => (
  <button type="button" onClick={onClick}
    className="h-11 max-w-full px-4 rounded-full bg-white ring-1 ring-[#7a2028]/25 hover:ring-[#7a2028]/45 text-[#7a2028] text-sm font-bold inline-flex items-center gap-2 cursor-pointer active:scale-95 transition [&>svg]:w-4 [&>svg]:h-4 [&>svg]:shrink-0">
    {icon}<span className="truncate">{children}</span>
  </button>
);

/** The class's members window from the teacher panel (add from the people list, take out). */
const MembersWindow: React.FC<{ cls: SchoolClass; onMessage: (text: string, type: 'success' | 'error') => void; onClose: () => void }> = ({ cls, onMessage, onClose }) => {
  const { classes } = useManagedClasses();
  return <ClassSettings cls={cls} classes={classes.some(c => c.id === cls.id) ? classes : [cls, ...classes]} onMessage={onMessage} onClose={onClose} />;
};

/** Students with attendance, or the assignments: both read the members' records, so only while open. */
const RecordsWindow: React.FC<{ cls: SchoolClass; which: 'students' | 'assignments'; onClose: () => void; onEditClass: () => void }> = ({ cls, which, onClose, onEditClass }) => {
  const records = useClassStudents(cls);
  return (
    <Sheet open onClose={onClose} title={which === 'students' ? 'მოსწავლეები და დასწრება' : 'დავალებები'} wide>
      <div className={FLAT}>
        {which === 'students' ? <StudentsOverview cls={cls} records={records} onEditClass={onEditClass} /> : <AssignmentsPanel cls={cls} records={records} />}
      </div>
    </Sheet>
  );
};
