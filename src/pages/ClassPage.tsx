import React, { useEffect, useState } from 'react';
import {
  Users, MessageCircle, Loader2, Pencil, Music4, Search, X, CalendarClock, Plus, ChevronRight, ClipboardList, ListChecks,
  UserPlus, Palette, GraduationCap, Archive, TriangleAlert,
} from 'lucide-react';
import { useAuth, useNavigation } from '../context';
import { useNotes } from '../context/NotesContext';
import { useMyClasses, useAllClasses, useTeachingClasses } from '../hooks/useClasses';
import { ClassHeader } from '../components/teacher/ClassHeader';
import { ClassRoll } from '../components/teacher/StudentsOverview';
import { LessonChips, ScheduleSheet } from '../components/teacher/Schedule';
import { ClassLogo } from '../components/classes/ClassLogo';
import { ClassChat } from '../components/classes/ClassChat';
import { ClassProgram } from '../components/classes/ClassProgram';
import { ClassWork, useClassWork } from '../components/classes/ClassWork';
import { AddMemberSheet } from '../components/classes/MembersWindow';
import { ClassTeachersSheet } from '../components/classes/ClassTeachersSheet';
import { archiveClass } from '../components/admin/ClassesAdmin';
import { changed } from '../components/admin/changed';
import { ClassPsalter } from '../components/psalter/ClassPsalter';
import { ClassLessons } from '../components/mastery/ClassLessons';
import { ClassPearls } from '../components/pearls/ClassPearls';
import { Avatar } from '../components/classes/ChatPanel';
import { Btn, Flash, IconBtn, PageBar, Sheet, Tabs, useFlash, useWide } from '../components/ui/kit';
import { openThread, Person } from '../hooks/useDirectChat';
import { isClassUnread, useChatSeen, useClassLasts } from '../hooks/useClassChat';
import { triggerHaptic } from '../utils/haptics';
import { errorText } from '../utils/errorText';
import type { ClassMember, SchoolClass } from '../hooks/useClasses';

// the teacher's windows opened from the class page: the one ✎'s list ('edit') and what it opens; 'people' is the members'
// window on a phone
type Panel = 'edit' | 'class' | 'teachers' | 'members' | 'schedule' | 'people';
// a panel's card shown inside a window loses its own frame (no box in a box)
const FLAT = 'space-y-4 [&>section]:p-0 [&>section]:bg-transparent [&>section]:ring-0 [&>section]:shadow-none';
// the round buttons in the title bar
const BAR_BTN = 'bg-white/85 ring-1 ring-[#e8dcc8] !text-[#7a2028] hover:!bg-white';

// the page's three tabs; the one open is kept for the tab's visit (a chant opened from it comes back to it)
type Tab = 'program' | 'work' | 'chat';
const TAB_KEY = 'sg-class-tab:';
const savedTab = (id: string): Tab | null => {
  try {
    const t = sessionStorage.getItem(TAB_KEY + id);
    return t === 'program' || t === 'work' || t === 'chat' ? t : null;
  } catch {
    return null;
  }
};

// A class's shared page and, since the teacher panel was removed (redesign stage 2, 2026-10-25), its teachers' only
// workplace. Simplified 2026-10-28 („ერთი რამ, ერთ ადგილას“): the title bar (the class's logo and name; 🎵 today's
// liturgy and one ✎ for its teachers — its list opens the class's details, the timetable, the program and adding a
// member —, 💬 to the teacher for a member), the timetable as one line of chips, the members (one line „N წევრი ›“ that
// opens their window on a phone, a column of their own on a computer; teachers get the roll with attendance), then
// three tabs: „პროგრამა“ (the program, and folded under it the class's lessons, the teachers' pearls and the psalter
// group — `focus` = opened for it), „დავალებები“ (a dot while a member has one to do) and „ჩათი“ (a dot while unread).
// Nothing that manages shows to the members.
export const ClassPage: React.FC<{ classId?: string; focus?: 'psalter' }> = ({ classId, focus }) => {
  const { user, isAdmin, isTeacher } = useAuth();
  const { selectedClassId, handleGoBack } = useNavigation();
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
  return <ClassView key={cls.id} cls={cls} focus={focus} inUse={all} />;
};

// `inUse`: every class in use (admins; for the teachers' and the archive's access bookkeeping)
const ClassView: React.FC<{ cls: SchoolClass; focus?: 'psalter'; inUse: SchoolClass[] }> = ({ cls, focus, inUse }) => {
  const { user, isAdmin } = useAuth();
  const { handleGoBack, openDm } = useNavigation();
  const { openProgram } = useNotes();
  const wide = useWide();
  // a private chat being opened (the other person's uid), and why it could not be
  const [opening, setOpening] = useState<string | null>(null);
  const [dmErr, setDmErr] = useState('');
  const [panel, setPanel] = useState<Panel | null>(null);
  const [tab, setTabState] = useState<Tab>(() => (focus === 'psalter' ? 'program' : savedTab(cls.id) ?? 'program'));
  const [editingProgram, setEditingProgram] = useState(false);
  const msg = useFlash();

  // private chats: a member writes to the class's teachers, a teacher of the class to its members
  const iTeach = !!user && cls.teacherIds.includes(user.uid);
  const iAmMember = !!user && cls.memberIds.includes(user.uid);
  const canEdit = iTeach || isAdmin;
  const work = useClassWork(cls, canEdit);
  const lasts = useClassLasts([cls.id]);
  const seen = useChatSeen(user?.uid);
  const unread = !!user && tab !== 'chat' && isClassUnread(lasts[cls.id], seen[cls.id], user.uid);

  const setTab = (t: Tab) => {
    setTabState(t);
    try { sessionStorage.setItem(TAB_KEY + cls.id, t); } catch { /* private window: this visit only */ }
  };
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
  const close = () => setPanel(null);
  // admins: „არქივში“ from the ✎ list — made at once (nothing is deleted), „გაუქმება“ brings it back; the page is left,
  // since an archived class shows nowhere
  const toArchive = async () => {
    close();
    try {
      // a member's record that could not be set is put right the next time the admin panel opens
      await archiveClass(cls, true, inUse);
      changed('archive', `კლასი „${cls.name}“ არქივში გადავიდა`, cls.id, () => archiveClass(cls, false, inUse));
      handleGoBack();
    } catch (e) {
      msg.fail('კლასი ვერ გადავიდა არქივში: ' + errorText(e));
    }
  };
  const teacherNames = cls.teachers.map(t => t.name).filter(Boolean).join(', ');
  const members = (
    <MembersList cls={cls} canEdit={canEdit} me={user?.uid} onWrite={iTeach ? m => writeTo(m, false) : undefined} writing={opening} />
  );

  return (
    <div className="w-full max-w-2xl lg:max-w-5xl mx-auto px-1 py-4 sm:py-6 space-y-4 text-[#2a2017]">
      <PageBar
        title={cls.name}
        // on a phone the members' line under the timetable says who is in the class
        subtitle={<span className="hidden lg:inline">{`${cls.members.length} წევრი${teacherNames ? ` · ${teacherNames}` : ''}`}</span>}
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
            {canEdit && <IconBtn label="რედაქტირება" className={BAR_BTN} onClick={() => setPanel('edit')}><Pencil /></IconBtn>}
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

      {/* admins: a class nobody leads says so, with the way to name its teacher */}
      {isAdmin && cls.teacherIds.length === 0 && (
        <button type="button" onClick={() => setPanel('teachers')}
          className="w-full min-h-12 px-4 py-2 rounded-2xl bg-amber-50 ring-1 ring-amber-200 text-amber-900 flex items-center gap-2.5 text-left text-[14px] font-semibold cursor-pointer hover:bg-amber-100/70 transition-colors">
          <TriangleAlert className="w-[18px] h-[18px] shrink-0 text-amber-600" />
          <span className="flex-1 min-w-0">მასწავლებელი არ ჰყავს — დანიშვნა</span>
          <ChevronRight className="w-5 h-5 shrink-0 text-amber-600" />
        </button>
      )}

      {/* the timetable: chips, the next lesson filled in (the teachers change it from ✎) */}
      {cls.schedule.length > 0 ? (
        <LessonChips slots={cls.schedule} lead={<CalendarClock className="w-[18px] h-[18px] shrink-0 text-[#7a2028] mr-0.5" aria-label="გაკვეთილები" />} />
      ) : canEdit ? (
        <Btn kind="soft" size="sm" icon={<Plus />} onClick={() => setPanel('schedule')}>გაკვეთილების ცხრილი</Btn>
      ) : null}

      {/* a phone: the members in one line that opens their window */}
      {!wide && (
        <button
          type="button"
          onClick={() => { triggerHaptic(8); setPanel('people'); }}
          className="w-full min-h-14 pl-2.5 pr-3 py-2 rounded-2xl bg-white/85 ring-1 ring-[#e8dcc8] flex items-center gap-3 text-left cursor-pointer transition-colors hover:bg-white"
        >
          {cls.members.length > 0 ? (
            <span aria-hidden className="flex -space-x-2.5 shrink-0">
              {cls.members.slice(0, 4).map(m => (
                <span key={m.uid} className="rounded-full ring-2 ring-white">
                  <Avatar name={m.name} photoURL={m.photoURL} className="w-8 h-8 text-sm" />
                </span>
              ))}
            </span>
          ) : (
            <span className="w-9 h-9 shrink-0 rounded-full bg-[#7a2028]/[0.07] text-[#7a2028] flex items-center justify-center"><Users className="w-[18px] h-[18px]" /></span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block text-[14.5px] font-bold text-[#2a2017]">{cls.members.length} წევრი</span>
            <span className="block truncate text-[12.5px] text-[#8a7a6a]">
              {canEdit ? 'დასწრება და მიწერა' : teacherNames ? `მასწავლებელი: ${teacherNames}` : 'ვინ არის კლასში'}
            </span>
          </span>
          <ChevronRight className="w-5 h-5 shrink-0 text-[#b08a4a]" />
        </button>
      )}

      {dmErr && <p className="text-sm text-[#a02c2c]">{dmErr}</p>}
      {msg.flash && <Flash flash={msg.flash} onClose={msg.clear} />}

      <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-6 lg:items-start">
        {wide && (
          <ClassMembers cls={cls} edit={canEdit && <IconBtn label="წევრის დამატება" onClick={() => setPanel('members')}><Plus /></IconBtn>}>
            {members}
          </ClassMembers>
        )}
        <div className="min-w-0 space-y-4">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { id: 'program', label: 'პროგრამა', Icon: ListChecks },
              { id: 'work', label: 'დავალებები', Icon: ClipboardList, dot: work.dot },
              { id: 'chat', label: 'ჩათი', Icon: MessageCircle, dot: unread },
            ]}
          />
          {tab === 'program' && (
            <>
              <ClassProgram cls={cls} canEdit={canEdit} editing={editingProgram} onEditing={setEditingProgram} />
              <ClassLessons cls={cls} canEdit={canEdit} fold />
              {/* the members' pearls, for the class's teachers: takes to hear and approve, one table by chest */}
              {canEdit && <ClassPearls cls={cls} />}
              <ClassPsalter cls={cls} canLead={canEdit} focus={focus === 'psalter'} />
            </>
          )}
          {tab === 'work' && <ClassWork cls={cls} canEdit={canEdit} state={work} />}
          {tab === 'chat' && <ClassChat cls={cls} timetable={false} compact />}
        </div>
      </div>

      {!wide && (
        <Sheet open={panel === 'people'} onClose={close} title={`კლასის წევრები · ${cls.members.length}`}>
          {canEdit && <Btn kind="soft" full icon={<UserPlus />} className="mb-3" onClick={() => setPanel('members')}>წევრის დამატება</Btn>}
          {members}
        </Sheet>
      )}

      {canEdit && (
        <>
          {/* the one ✎: what a teacher changes on the page */}
          <Sheet open={panel === 'edit'} onClose={close} title="რედაქტირება">
            <ul className="-mx-1 divide-y divide-[#efe5d4]">
              {[
                { Icon: Palette, label: 'სახელი, ლოგო და რეჟიმი', go: () => setPanel('class') },
                // what only admins set: who leads the class
                ...(isAdmin ? [{ Icon: GraduationCap, label: 'მასწავლებლები', go: () => setPanel('teachers') }] : []),
                { Icon: CalendarClock, label: 'გაკვეთილების ცხრილი', go: () => setPanel('schedule') },
                { Icon: ListChecks, label: 'სასწავლო პროგრამა', go: () => { close(); setTab('program'); setEditingProgram(true); } },
                { Icon: UserPlus, label: 'წევრის დამატება', go: () => setPanel('members') },
              ].map(({ Icon, label, go }) => (
                <li key={label}>
                  <button type="button" onClick={() => { triggerHaptic(8); go(); }}
                    className="group w-full min-h-14 px-1 py-2 flex items-center gap-3 text-left rounded-xl cursor-pointer transition-colors hover:bg-white/70">
                    <span className="w-10 h-10 shrink-0 rounded-full bg-[#7a2028]/[0.07] text-[#7a2028] flex items-center justify-center"><Icon className="w-[18px] h-[18px]" /></span>
                    <span className="flex-1 min-w-0 text-[15px] font-semibold text-[#2a2017]">{label}</span>
                    <ChevronRight className="w-5 h-5 shrink-0 text-[#c4b49c] group-hover:text-[#7a2028]" />
                  </button>
                </li>
              ))}
            </ul>
            {/* admins: the class put away (nothing is deleted; „გაუქმება“ for a few seconds, later the panel's „არქივი“) */}
            {isAdmin && (
              <div className="mt-3 pt-3 border-t border-[#efe5d4]">
                <Btn kind="ghost" full icon={<Archive />} onClick={toArchive}>არქივში გადატანა</Btn>
                <p className="mt-1.5 text-[12px] text-[#8a7a6a] leading-snug text-center">კლასი და მისი ფსალმუნთა ჯგუფი ყველას დაემალება — არაფერი წაიშლება.</p>
              </div>
            )}
          </Sheet>
          {isAdmin && <ClassTeachersSheet cls={cls} inUse={inUse} open={panel === 'teachers'} onClose={close} />}
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

/** „კლასის წევრები“ on a computer: a column of its own, always open and staying in view (a phone has one line that opens
 *  the same list in a window). */
const ClassMembers: React.FC<{ cls: SchoolClass; edit: React.ReactNode; children: React.ReactNode }> = ({ cls, edit, children }) => (
  <section className="bg-white/70 rounded-3xl ring-1 ring-[#e8dcc8] overflow-hidden lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:flex lg:flex-col">
    <div className="shrink-0 flex items-center">
      <h2 className="flex-1 min-w-0 min-h-14 flex items-center gap-2 px-5 py-3">
        <Users className="w-5 h-5 shrink-0 text-[#7a2028]" />
        <span className="font-serif-ge text-lg font-bold text-[#4a3426] truncate">კლასის წევრები</span>
        <span className="text-sm font-bold text-[#a4927c] tabular-nums">{cls.members.length}</span>
      </h2>
      {edit && <span className="shrink-0 pr-3">{edit}</span>}
    </div>
    <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto overscroll-contain px-3 sm:px-4 pt-1 pb-3">{children}</div>
  </section>
);

/** The members: a search over the names once the class is big; the class's teachers get the roll (ClassRoll:
 *  attendance, 💬, each member's window), the members only the names. */
const MembersList: React.FC<{
  cls: SchoolClass;
  canEdit: boolean;
  me?: string;
  onWrite?: (m: ClassMember) => void;
  writing: string | null;
}> = ({ cls, canEdit, me, onWrite, writing }) => {
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const found = needle ? cls.members.filter(m => (m.name || '').toLowerCase().includes(needle)) : cls.members;

  return (
    <>
      {cls.members.length > 8 && (
        <label className="relative block mb-2">
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
      {canEdit ? (
        <ClassRoll cls={cls} shown={found} me={me} onWrite={onWrite} writing={writing} />
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-x-3">
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
    </>
  );
};
