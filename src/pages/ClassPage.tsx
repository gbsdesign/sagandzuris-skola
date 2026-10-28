import React, { useEffect, useState } from 'react';
import { Users, MessageCircle, Loader2, ChevronDown, Pencil, Music4, Search, X, CalendarClock, Plus } from 'lucide-react';
import { useAuth, useNavigation } from '../context';
import { useNotes } from '../context/NotesContext';
import { useMyClasses, useAllClasses, useTeachingClasses } from '../hooks/useClasses';
import { ClassHeader } from '../components/teacher/ClassHeader';
import { ClassRoll } from '../components/teacher/StudentsOverview';
import { LessonChips, ScheduleSheet } from '../components/teacher/Schedule';
import { ClassLogo } from '../components/classes/ClassLogo';
import { ClassChat } from '../components/classes/ClassChat';
import { ClassProgram } from '../components/classes/ClassProgram';
import { AddMemberSheet } from '../components/classes/MembersWindow';
import { ClassPsalter } from '../components/psalter/ClassPsalter';
import { ClassLessons } from '../components/mastery/ClassLessons';
import { Avatar } from '../components/classes/ChatPanel';
import { Btn, Flash, IconBtn, PageBar, Sheet, useFlash } from '../components/ui/kit';
import { openThread, Person } from '../hooks/useDirectChat';
import type { ClassMember, SchoolClass } from '../hooks/useClasses';

// the teacher's windows opened from the class page
type Panel = 'class' | 'members' | 'schedule';
// a panel's card shown inside a window loses its own frame (no box in a box)
const FLAT = 'space-y-4 [&>section]:p-0 [&>section]:bg-transparent [&>section]:ring-0 [&>section]:shadow-none';
// the round buttons in the title bar that do something (not ✎)
const BAR_BTN = 'bg-white/85 ring-1 ring-[#e8dcc8] !text-[#7a2028] hover:!bg-white';

// A class's shared page and, since the teacher panel was removed (redesign stage 2, 2026-10-25), its teachers' only
// workplace. The title bar: the class's logo and name, its members and teachers; 🎵 today's liturgy and ✎ (name,
// logo, mode) for its teachers, 💬 to the teacher for a member. Under it the timetable as chips (✎ edits it). Then the
// members (a column of their own on a computer, a folded line on a phone; teachers get the roll with attendance),
// the program with the assignments, the class's psalter group (`focus` = opened for it) and the chat. Nothing that
// manages shows to the members.
export const ClassPage: React.FC<{ classId?: string; focus?: 'psalter' }> = ({ classId, focus }) => {
  const { user, isAdmin, isTeacher } = useAuth();
  const { selectedClassId, handleGoBack, openDm } = useNavigation();
  const { openProgram } = useNotes();
  // a private chat being opened (the other person's uid), and why it could not be
  const [opening, setOpening] = useState<string | null>(null);
  const [dmErr, setDmErr] = useState('');
  const [panel, setPanel] = useState<Panel | null>(null);
  const msg = useFlash();
  const mine = useMyClasses(user?.uid);
  const { classes: all } = useAllClasses(isAdmin);
  const { classes: teaching } = useTeachingClasses(isTeacher ? user?.uid : null);
  const id = classId ?? selectedClassId;
  // no class asked for (an old „teacher panel“ link): one's own class, else the first one taught
  const cls = [...mine, ...teaching, ...all].find(c => c.id === id) || mine[0] || teaching[0];

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
  const pencil = (p: Panel, label: string) => canEdit && <IconBtn label={label} onClick={() => setPanel(p)}><Pencil /></IconBtn>;
  const close = () => setPanel(null);
  const teacherNames = cls.teachers.map(t => t.name).filter(Boolean).join(', ');

  return (
    <div className="w-full max-w-2xl lg:max-w-5xl mx-auto px-1 py-4 sm:py-6 space-y-4 text-[#2a2017]">
      <PageBar
        title={cls.name}
        subtitle={`${cls.members.length} წევრი${teacherNames ? ` · ${teacherNames}` : ''}`}
        onBack={handleGoBack}
        // the logo beside the name where there is room (a phone has it in the header's „კლასი“ already)
        lead={<span className="hidden min-[480px]:block shrink-0"><ClassLogo name={cls.name} logo={cls.logo} className="w-11 h-11 text-lg" /></span>}
        right={
          <>
            {canEdit && <IconBtn label="დღევანდელი წირვა" className={BAR_BTN} onClick={openProgram}><Music4 /></IconBtn>}
            {myTeachers.length === 1 && (
              <IconBtn label="მისწერე მასწავლებელს" className={BAR_BTN} disabled={opening === myTeachers[0].uid} onClick={() => writeTo(myTeachers[0], true)}>
                {opening === myTeachers[0].uid ? <Loader2 className="animate-spin" /> : <MessageCircle />}
              </IconBtn>
            )}
            {pencil('class', 'კლასის სახელი, ლოგო და რეჟიმი')}
          </>
        }
      />

      {/* two or more teachers: one button each */}
      {myTeachers.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {myTeachers.map(t => (
            <button
              key={t.uid}
              type="button"
              onClick={() => writeTo(t, true)}
              disabled={opening === t.uid}
              className="h-11 max-w-full pl-1.5 pr-4 rounded-full bg-white ring-1 ring-[#7a2028]/25 hover:ring-[#7a2028]/45 text-[#7a2028] text-sm font-bold inline-flex items-center gap-2 cursor-pointer active:scale-95 transition disabled:opacity-60"
            >
              <Avatar name={t.name} photoURL={t.photoURL} className="w-8 h-8 text-sm" />
              <span className="truncate">{t.name}</span>
              {opening === t.uid ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" /> : <MessageCircle className="w-4 h-4 shrink-0" />}
            </button>
          ))}
        </div>
      )}

      {/* the timetable: chips, the next lesson filled in; ✎ for the teachers */}
      {cls.schedule.length > 0 ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <LessonChips slots={cls.schedule} lead={<CalendarClock className="w-[18px] h-[18px] shrink-0 text-[#7a2028] mr-0.5" aria-label="გაკვეთილები" />} />
          </div>
          {canEdit && <IconBtn label="ცხრილის შეცვლა" onClick={() => setPanel('schedule')}><Pencil /></IconBtn>}
        </div>
      ) : canEdit ? (
        <Btn kind="soft" size="sm" icon={<Plus />} onClick={() => setPanel('schedule')}>გაკვეთილების ცხრილი</Btn>
      ) : null}

      {dmErr && <p className="text-sm text-[#a02c2c]">{dmErr}</p>}
      {msg.flash && <Flash flash={msg.flash} onClose={msg.clear} />}

      <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-6 lg:items-start">
        <ClassMembers
          cls={cls}
          canEdit={canEdit}
          me={user?.uid}
          edit={canEdit && <IconBtn label="წევრის დამატება" onClick={() => setPanel('members')}><Plus /></IconBtn>}
          onWrite={iTeach ? m => writeTo(m, false) : undefined}
          writing={opening}
        />
        <div className="min-w-0 space-y-4">
          <ClassProgram cls={cls} canEdit={canEdit} />
          <ClassLessons cls={cls} canEdit={canEdit} />
          <ClassPsalter cls={cls} canLead={canEdit} focus={focus === 'psalter'} />
          <ClassChat cls={cls} timetable={false} compact />
        </div>
      </div>

      {canEdit && (
        <>
          <Sheet open={panel === 'class'} onClose={close} title="კლასის რედაქტირება">
            <div className={FLAT}><ClassHeader cls={cls} /></div>
          </Sheet>
          <ScheduleSheet cls={cls} open={panel === 'schedule'} onClose={close} />
          {panel === 'members' && <AddMemberSheet cls={cls} onMessage={msg.say} onClose={close} />}
        </>
      )}
    </div>
  );
};

// the width at which the members get their own column (Tailwind's `lg`)
const WIDE = '(min-width: 1024px)';
const useWide = () => {
  const [wide, setWide] = useState(() => window.matchMedia(WIDE).matches);
  useEffect(() => {
    const mq = window.matchMedia(WIDE);
    const change = () => setWide(mq.matches);
    mq.addEventListener('change', change);
    return () => mq.removeEventListener('change', change);
  }, []);
  return wide;
};

/** „კლასის წევრები“: on a computer a column of its own, always open and staying in view; on a phone one folded line
 *  (count + a few faces) that a tap opens. A search over the names once the class is big. The class's teachers get the
 *  roll (ClassRoll: attendance, 💬, each member's window); the members only the names. */
const ClassMembers: React.FC<{
  cls: SchoolClass;
  canEdit: boolean;
  me?: string;
  edit: React.ReactNode;
  onWrite?: (m: ClassMember) => void;
  writing: string | null;
}> = ({ cls, canEdit, me, edit, onWrite, writing }) => {
  const wide = useWide();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const shown = wide || open;
  const needle = q.trim().toLowerCase();
  const found = needle ? cls.members.filter(m => (m.name || '').toLowerCase().includes(needle)) : cls.members;

  const title = (
    <>
      <Users className="w-5 h-5 shrink-0 text-[#7a2028]" />
      <span className="font-serif-ge text-lg font-bold text-[#4a3426] truncate">კლასის წევრები</span>
      <span className="text-sm font-bold text-[#a4927c] tabular-nums">{cls.members.length}</span>
    </>
  );

  return (
    <section className="bg-white/70 rounded-3xl ring-1 ring-[#e8dcc8] overflow-hidden lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:flex lg:flex-col">
      <div className="shrink-0 flex items-center">
        {wide ? (
          <h2 className="flex-1 min-w-0 min-h-14 flex items-center gap-2 px-5 py-3">{title}</h2>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
            className="flex-1 min-w-0 min-h-14 flex items-center gap-2 px-4 min-[400px]:px-5 sm:px-6 py-3 text-left cursor-pointer transition-colors hover:bg-white/60"
          >
            {title}
            <span className="flex-1" />
            {/* a few faces, where the title still has room beside them */}
            {!open && (
              <span aria-hidden className="hidden min-[430px]:flex -space-x-2">
                {cls.members.slice(0, 4).map((m, i) => (
                  <span key={m.uid} className={`rounded-full ring-2 ring-[#fdfaf5] ${i === 3 ? 'hidden min-[400px]:block' : ''}`}>
                    <Avatar name={m.name} photoURL={m.photoURL} className="w-7 h-7 text-xs" />
                  </span>
                ))}
              </span>
            )}
            <ChevronDown className={`w-5 h-5 shrink-0 text-[#a4927c] transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        )}
        {edit && <span className="shrink-0 pr-3">{edit}</span>}
      </div>

      {shown && cls.members.length > 8 && (
        <label className="shrink-0 relative block mx-3 sm:mx-4 mb-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a89886] pointer-events-none" />
          <input
            type="search"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="ძებნა სახელით…"
            aria-label="ძებნა"
            className="w-full h-11 rounded-full bg-[#fbf6ec] ring-1 ring-[#e8dcc8] pl-10 pr-10 text-base text-[#2a2017] placeholder:text-[#b3a594] focus:outline-none focus:ring-2 focus:ring-[#7a2028]/35 [&::-webkit-search-cancel-button]:hidden"
          />
          {q && (
            <button type="button" onClick={() => setQ('')} aria-label="გასუფთავება" className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-[#a89886] hover:text-[#4a3426] cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          )}
        </label>
      )}

      {shown && (
        <div className="sg-in lg:flex-1 lg:min-h-0 lg:overflow-y-auto overscroll-contain px-3 sm:px-4 pt-1 pb-3">
          {canEdit ? (
            <ClassRoll cls={cls} shown={found} me={me} onWrite={onWrite} writing={writing} />
          ) : (
            <>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-x-3">
                {found.map(m => (
                  <li key={m.uid} className={`min-h-12 flex items-center gap-2.5 px-2 py-1 rounded-xl ${m.uid === me ? 'bg-[#7a2028]/[0.05]' : ''}`}>
                    <Avatar name={m.name} photoURL={m.photoURL} className="w-8 h-8 text-sm" />
                    <span className="flex-1 min-w-0 text-[14px] font-semibold text-[#2a2017] truncate">
                      {m.name}
                      {m.uid === me && <span className="ml-1.5 text-xs font-normal text-[#8a7a6a]">(შენ)</span>}
                    </span>
                  </li>
                ))}
              </ul>
              {found.length === 0 && <p className="px-2 py-3 text-sm text-[#8a7a6a]">ვერ მოიძებნა.</p>}
            </>
          )}
        </div>
      )}
    </section>
  );
};
