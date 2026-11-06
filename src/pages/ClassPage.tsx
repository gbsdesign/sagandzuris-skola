import React, { useEffect, useRef, useState } from 'react';
import {
  Users, MessageCircle, Loader2, Pencil, Music4, Search, X, CalendarClock, Plus, ChevronRight, ListChecks,
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
import { AddMemberSheet } from '../components/classes/MembersWindow';
import { ClassTeachersSheet } from '../components/classes/ClassTeachersSheet';
import { archiveClass } from '../components/admin/ClassesAdmin';
import { changed } from '../components/admin/changed';
import { ClassPsalter } from '../components/psalter/ClassPsalter';
import { ClassLessons } from '../components/mastery/ClassLessons';
import { Avatar } from '../components/classes/ChatPanel';
import { Btn, Flash, IconBtn, OneLine, PageBar, Sheet, Tabs, useFlash, useWide } from '../components/ui/kit';
import { openThread, Person } from '../hooks/useDirectChat';
import { isClassUnread, useChatSeen, useClassLasts } from '../hooks/useClassChat';
import { triggerHaptic } from '../utils/haptics';
import { errorText } from '../utils/errorText';
import type { ClassMember, SchoolClass } from '../hooks/useClasses';

// the teacher's windows opened from the class page: the one ✎'s list ('edit') and what it opens
type Panel = 'edit' | 'class' | 'teachers' | 'members' | 'schedule';
// a panel's card shown inside a window loses its own frame (no box in a box)
const FLAT = 'space-y-4 [&>section]:p-0 [&>section]:bg-transparent [&>section]:ring-0 [&>section]:shadow-none';
// the round buttons in the title bar
const BAR_BTN = 'bg-white/85 ring-1 ring-[#e8dcc8] !text-[#7a2028] hover:!bg-white';

// the page's tabs; the one open is kept for the tab's visit (a chant opened from it comes back to it). „წევრები“ is a tab
// on a phone only (2026-11-05, the user: „ჩათის გვერდით ღილაკად … ამომხტარი ფანჯრის გარეშე“); a computer keeps its column.
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

// A class's shared page and, since the teacher panel was removed (redesign stage 2, 2026-10-25), its teachers' only
// workplace. Simplified 2026-10-28 („ერთი რამ, ერთ ადგილას“): the title bar (the class's logo and name; 🎵 today's
// liturgy and one ✎ for its teachers — its list opens the class's details, the timetable, the program and adding a
// member —, 💬 to the teacher for a member), the timetable as one line of chips, then the assignments' round 📋 (2026-11-05:
// every assignment drops down from it under the tabs; it lights up red for a member's new one — classes/ClassWork.tsx) beside
// the tabs (2026-11-04): „პროგრამა“ (the program with „+ დამატება“, folded under it „ოსტატობა“ and the psalter group —
// `focus` = opened for it), „ჩათი“ (a dot while unread; on a phone it fills the screen, the newest message and the field in
// view) and on a phone „წევრები“ (since 2026-11-05 a tab, not a window; a computer has them in a column of their own;
// teachers get the roll with attendance). Nothing that manages shows to the members.
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
  const [tabState, setTabState] = useState<Tab>(() => (focus === 'psalter' ? 'program' : savedTab(cls.id) ?? 'program'));
  // a computer has the members in their column, so a phone's „წევრები“ opens the program there
  const tab: Tab = wide && tabState === 'people' ? 'program' : tabState;
  // the chat on a phone: shown whole when its tab is tapped (the page goes down to its field)
  const chatBox = useRef<HTMLDivElement>(null);
  const showChat = useRef(false);
  const [editingProgram, setEditingProgram] = useState(false);
  const msg = useFlash();

  // private chats: a member writes to the class's teachers, a teacher of the class to its members
  const iTeach = !!user && cls.teacherIds.includes(user.uid);
  const iAmMember = !!user && cls.memberIds.includes(user.uid);
  const canEdit = iTeach || isAdmin;
  const lasts = useClassLasts([cls.id]);
  const seen = useChatSeen(user?.uid);
  const unread = !!user && tab !== 'chat' && isClassUnread(lasts[cls.id], seen[cls.id], user.uid);

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
    <MembersList
      cls={cls}
      canEdit={canEdit}
      me={user?.uid}
      onWrite={iTeach ? m => writeTo(m, false) : undefined}
      onWriteTeacher={iAmMember ? t => writeTo(t, true) : undefined}
      writing={opening}
    />
  );
  const addMember = canEdit ? <AddBtn onClick={() => setPanel('members')} /> : null;

  return (
    <div className="w-full max-w-2xl lg:max-w-5xl mx-auto px-1 py-4 sm:py-6 space-y-4 text-[#2a2017]">
      <PageBar
        // one line, however long the name (2026-11-06, the user: „ლამაზად და ერთ ხაზზე ეწეროს“): it grows smaller instead
        title={<OneLine>{cls.name}</OneLine>}
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

      {dmErr && <p className="text-sm text-[#a02c2c]">{dmErr}</p>}
      {msg.flash && <Flash flash={msg.flash} onClose={msg.clear} />}

      <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-6 lg:items-start">
        {wide && (
          <ClassMembers cls={cls} title="კლასის წევრები" edit={addMember} sticky>
            {members}
          </ClassMembers>
        )}
        <div className="min-w-0 space-y-4">
          {/* the assignments moved up into the header's 📋 (2026-11-06, components/classes/ClassWork.tsx) */}
          <Tabs
            cols={wide ? 2 : 3}
            stack={!wide}
            value={tab}
            onChange={setTab}
            items={[
              { id: 'program', label: 'პროგრამა', Icon: ListChecks },
              { id: 'chat', label: 'ჩათი', Icon: MessageCircle, dot: unread },
              ...(wide ? [] : [{ id: 'people' as const, label: 'წევრები', Icon: Users }]),
            ]}
          />
          {tab === 'program' && (
            <>
              <ClassProgram cls={cls} canEdit={canEdit} editing={editingProgram} onEditing={setEditingProgram} />
              <ClassLessons cls={cls} canEdit={canEdit} fold />
              <ClassPsalter cls={cls} canLead={canEdit} focus={focus === 'psalter'} />
            </>
          )}
          {tab === 'chat' && (wide ? (
            <ClassChat cls={cls} timetable={false} compact />
          ) : (
            // a phone: the chat fills the screen under the tabs — its messages scroll inside, the newest at the bottom, the
            // field always in view; at the list's ends the page itself moves on (`chain`)
            <div ref={chatBox} className="h-[calc(100dvh-5.5rem)] min-h-[26rem] scroll-mb-3">
              <ClassChat cls={cls} timetable={false} fill chain />
            </div>
          ))}
          {tab === 'people' && (
            <ClassMembers cls={cls} title="წევრები" edit={addMember}>
              {members}
            </ClassMembers>
          )}
        </div>
      </div>

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

/** „კლასის წევრები“: on a computer a column of its own, always open and staying in view (`sticky`); on a phone the
 *  „წევრები“ tab. `edit`: the teachers' small „+ დამატება“ at the title's end. */
const ClassMembers: React.FC<{ cls: SchoolClass; title: string; edit: React.ReactNode; sticky?: boolean; children: React.ReactNode }> = ({ cls, title, edit, sticky, children }) => (
  <section aria-label="კლასის წევრები"
    className={`bg-white/80 rounded-3xl ring-1 ring-[#e8dcc8] overflow-hidden ${sticky ? 'lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:flex lg:flex-col' : 'sg-in'}`}>
    <div className="shrink-0 min-h-14 flex items-center gap-2 pl-4 min-[400px]:pl-5 pr-3 py-2">
      <Users className="w-5 h-5 shrink-0 text-[#7a2028]" />
      <h2 className="min-w-0 truncate font-serif-ge text-lg font-bold text-[#4a3426]">{title}</h2>
      <span className="text-sm font-bold text-[#a4927c] tabular-nums">{cls.members.length}</span>
      {edit && <span className="ml-auto shrink-0">{edit}</span>}
    </div>
    <div className={`${sticky ? 'lg:flex-1 lg:min-h-0 lg:overflow-y-auto overscroll-contain' : ''} px-3 min-[400px]:px-4 pt-1 pb-4`}>{children}</div>
  </section>
);

/** The teachers' small „+ დამატება“ beside the members' title (it was a big button over the list). */
const AddBtn: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button type="button" onClick={() => { triggerHaptic(8); onClick(); }} aria-label="წევრის დამატება" title="წევრის დამატება"
    className="h-9 pl-2.5 pr-3.5 max-[359px]:w-9 max-[359px]:p-0 rounded-full bg-[#7a2028]/[0.07] hover:bg-[#7a2028]/[0.12] text-[#7a2028] text-[13.5px] font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition">
    {/* the narrowest phones: only the icon, so the title keeps its room */}
    <UserPlus className="w-4 h-4" /> <span className="max-[359px]:sr-only">დამატება</span>
  </button>
);

/** The class's teachers on top of the members (2026-11-05; a phone named them only in the old members' line): a member
 *  writes to one by 💬. */
const TeachersRows: React.FC<{ cls: SchoolClass; me?: string; onWrite?: (t: ClassMember) => void; writing: string | null }> = ({ cls, me, onWrite, writing }) =>
  cls.teachers.length ? (
    <div className="mb-3">
      <p className="px-1.5 pb-1 text-[13px] font-bold text-[#8a7a6a]">{cls.teachers.length > 1 ? 'მასწავლებლები' : 'მასწავლებელი'}</p>
      <ul className="space-y-1">
        {cls.teachers.map(t => (
          <li key={t.uid} className="min-h-[52px] flex items-center gap-3 pl-1.5 pr-1 py-1 rounded-2xl bg-[#b08a4a]/[0.09]">
            <Avatar name={t.name} photoURL={t.photoURL} className="w-9 h-9 text-[15px] shrink-0" />
            <span className="flex-1 min-w-0 line-clamp-2 break-words text-[14.5px] leading-snug font-semibold text-[#2a2017]">
              {t.name}
              {t.uid === me && <span className="ml-1.5 text-[13px] font-normal text-[#8a7a6a]">(შენ)</span>}
            </span>
            {onWrite && t.uid !== me && (
              <button type="button" onClick={() => onWrite(t)} disabled={writing === t.uid}
                title={`მიწერა: ${t.name}`} aria-label={`მიწერა: ${t.name}`}
                className="w-9 h-9 shrink-0 rounded-full text-[#7a2028] hover:bg-[#7a2028]/[0.07] flex items-center justify-center cursor-pointer active:scale-95 transition disabled:opacity-60">
                {writing === t.uid ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : <MessageCircle className="w-[18px] h-[18px]" />}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  ) : null;

/** The members: the class's teachers on top, a search over the names once the class is big; the class's teachers get the
 *  roll (ClassRoll: the class's figures, attendance, 💬, each member's page), the members only the names. */
const MembersList: React.FC<{
  cls: SchoolClass;
  canEdit: boolean;
  me?: string;
  onWrite?: (m: ClassMember) => void;
  onWriteTeacher?: (t: ClassMember) => void;
  writing: string | null;
}> = ({ cls, canEdit, me, onWrite, onWriteTeacher, writing }) => {
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const found = needle ? cls.members.filter(m => (m.name || '').toLowerCase().includes(needle)) : cls.members;
  const teachers = <TeachersRows cls={cls} me={me} onWrite={onWriteTeacher} writing={writing} />;
  const search = cls.members.length > 8 && (
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
  );

  if (canEdit) return <ClassRoll cls={cls} shown={found} me={me} onWrite={onWrite} writing={writing} top={teachers} search={search} />;
  return (
    <>
      {teachers}
      <p className="px-1.5 pb-1 text-[13px] font-bold text-[#8a7a6a]">წევრები · {cls.members.length}</p>
      {search}
      <ul className="grid grid-cols-1 gap-y-0.5">
        {found.map(m => (
          <li key={m.uid} className={`min-h-[52px] flex items-center gap-3 px-1.5 py-1 rounded-2xl ${m.uid === me ? 'bg-[#7a2028]/[0.05]' : ''}`}>
            <Avatar name={m.name} photoURL={m.photoURL} className="w-9 h-9 text-[15px] shrink-0" />
            <span className="flex-1 min-w-0 line-clamp-2 break-words text-[14.5px] leading-snug font-semibold text-[#2a2017]">
              {m.name}
              {m.uid === me && <span className="ml-1.5 text-[13px] font-normal text-[#8a7a6a]">(შენ)</span>}
            </span>
          </li>
        ))}
      </ul>
      {found.length === 0 && <p className="px-2 py-3 text-sm text-[#8a7a6a]">ვერ მოიძებნა.</p>}
    </>
  );
};
