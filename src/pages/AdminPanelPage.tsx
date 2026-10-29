import React, { useEffect, useMemo, useRef, useState } from 'react';
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { Users, GraduationCap, School, Activity, Hourglass, ChevronRight, CircleCheck, WifiOff, Settings, UserX, TriangleAlert } from 'lucide-react';
import { db } from '../firebase';
import { useAuth, useNavigation, SUPER_ADMIN_EMAIL } from '../context';
import { useAllClasses } from '../hooks/useClasses';
import { useAllPsalterGroups } from '../hooks/usePsalter';
import { Flash, PageBar, useFlash } from '../components/ui/kit';
import { AdminHero, HeroTile } from '../components/admin/AdminHero';
import { ClassesAdmin } from '../components/admin/ClassesAdmin';
import { useLeftMembers } from '../utils/leftMembers';
import { UsersTab, UserRecord, StaffRecord, Filter, filterTests, toUser } from '../components/admin/UsersTab';
import { SchoolSheet } from '../components/admin/SchoolTab';
import { AccessRecord, DecisionRecord, toAccess } from '../components/admin/AccessRequests';
import { useDirectory, writeDirectory } from '../utils/directory';
import { teachersDiffer, teachersOf } from '../utils/classTeachers';
import { useOpenRequest } from '../utils/searchOpen';
import { activeIn7 } from '../utils/growth';
import { recordWeek, useGrowthWeeks } from '../hooks/useGrowth';
import { roleOf } from '../components/admin/PersonSheet';

// the list the panel shows: the members or the classes (chosen by the big numbers); remembered on the device.
// A home button made for a former tab („სკოლა“, „ჩანაწერები“, „განყოფილებები“, „წევრების მიღება“…) writes its name here
// before opening the panel: „სკოლა“ and the old names of its parts open the ⚙ window once.
type View = 'users' | 'classes';
const TAB_KEY = 'sg-admin-tab';
const SCHOOL_TABS = ['school', 'sections', 'recordings'];
const readStored = () => {
  try { return localStorage.getItem(TAB_KEY) || ''; } catch { return ''; }
};

// "ადმინის პანელი" (2026-10-28, stage ② of the admin review): the one page bar of the app (←, the title, the signed-in
// role, ⚙ „სკოლა“ on the right), the school's main numbers — each opens its list — and under them the members (one list;
// each person in one window) or the classes (each class's page; its ✎ window). The school's settings are one window (⚙).
export const AdminPanelPage: React.FC = () => {
  const { isAdmin, isOwner, isSuperAdmin } = useAuth();
  const { handleGoBack } = useNavigation();
  const msg = useFlash();
  const [view, setView] = useState<View>(() => (readStored() === 'classes' ? 'classes' : 'users'));
  const [schoolOpen, setSchoolOpen] = useState(() => SCHOOL_TABS.includes(readStored()));
  const [filter, setFilter] = useState<Filter>('all');
  useEffect(() => { try { localStorage.setItem(TAB_KEY, view); } catch { /* storage blocked */ } }, [view]);
  // the person whose window is open; the search (🔍, admins only) opens one straight away
  const [openId, setOpenId] = useState<string | null>(null);
  useOpenRequest('admin', uid => { setView('users'); setOpenId(uid); });

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffLoaded, setStaffLoaded] = useState(false);
  // which lists did not come (no internet, no right): then the panel says so instead of „all is well“
  const [failed, setFailed] = useState({ users: false, staff: false, access: false });
  const fail = (k: keyof typeof failed, v: boolean) => setFailed(f => (f[k] === v ? f : { ...f, [k]: v }));
  const { classes, archived, loading: loadingClasses, failed: classesFailed, fresh: classesFresh } = useAllClasses(isAdmin);
  const { groups } = useAllPsalterGroups(isAdmin);

  useEffect(() => {
    if (!isAdmin) return;
    const off1 = onSnapshot(collection(db, 'students'),
      s => { setUsers(s.docs.map(d => toUser(d.id, d.data()))); fail('users', false); setLoading(false); },
      () => { fail('users', true); setLoading(false); });
    const off2 = onSnapshot(collection(db, 'admins'),
      s => {
        setStaff(s.docs.map(d => {
          const x = d.data();
          const r = x.role === 'superadmin' || x.role === 'teacher' ? x.role : 'admin';
          return { email: (x.email || d.id).toLowerCase(), role: d.id === SUPER_ADMIN_EMAIL ? 'superadmin' : r, userId: x.userId, name: x.name, addedBy: x.addedBy, addedAt: x.addedAt } as StaffRecord;
        }));
        fail('staff', false);
        setStaffLoaded(true);
      },
      () => { fail('staff', true); setStaffLoaded(true); });
    return () => { off1(); off2(); };
  }, [isAdmin]);

  // every member's teacherIds = the teachers of the classes they are in (only those may read the record,
  // firestore.rules teachesMe): puts right what older versions left behind (a teacher taken off a class kept the access)
  // and what a teacher's own page could not see. Only with the server's full class list, never a cached part of it;
  // each fix once per visit
  const fixed = useRef(new Set<string>());
  useEffect(() => {
    if (!isAdmin || loading || failed.users || !classesFresh || classesFailed) return;
    for (const u of users) {
      const should = teachersOf(u.userId, classes);
      const key = `${u.userId}:${should.join(',')}`;
      if (!teachersDiffer(u.teacherIds, should) || fixed.current.has(key)) continue;
      fixed.current.add(key);
      void updateDoc(doc(db, 'students', u.userId), { teacherIds: should }).catch(() => {});
    }
  }, [isAdmin, loading, failed.users, classesFresh, classesFailed, users, classes]);

  // members who have not opened the app since the directory began are missing from it, so teachers could not
  // add them to a class or group: write their name and photo there from their record (once per visit)
  const directory = useDirectory(isAdmin);
  const filled = useRef(new Set<string>());
  useEffect(() => {
    if (!isAdmin || loading || directory.loading) return;
    const known = new Set(directory.people.map(p => p.uid));
    for (const u of users) {
      if (known.has(u.userId) || filled.current.has(u.userId)) continue;
      filled.current.add(u.userId);
      void writeDirectory(u.userId, {
        name: u.displayName || u.name,
        ...(u.firstName ? { firstName: u.firstName } : {}),
        ...(u.lastName ? { lastName: u.lastName } : {}),
        ...(u.photoURL ? { photoURL: u.photoURL } : {}),
      });
    }
  }, [isAdmin, loading, directory.loading, directory.people, users]);

  // new members' requests and who decided them: superadmins only
  const [access, setAccess] = useState<Record<string, AccessRecord>>({});
  const [decisions, setDecisions] = useState<Record<string, DecisionRecord>>({});
  const [accessLoaded, setAccessLoaded] = useState(false);
  useEffect(() => {
    if (!isSuperAdmin) return;
    const off1 = onSnapshot(collection(db, 'memberAccess'),
      s => { setAccess(Object.fromEntries(s.docs.map(d => [d.id, toAccess(d.data())]))); fail('access', false); setAccessLoaded(true); },
      () => { setAccess({}); fail('access', true); setAccessLoaded(true); });
    const off2 = onSnapshot(collection(db, 'accessDecisions'),
      s => setDecisions(Object.fromEntries(s.docs.map(d => [d.id, d.data() as DecisionRecord]))),
      () => setDecisions({}));
    return () => { off1(); off2(); };
  }, [isSuperAdmin]);
  const left = useLeftMembers();
  const { test } = filterTests(staff, access, isSuperAdmin, classes, left.uids);
  const waiting = users.filter(test.pending).length;

  // people who may lead a class or group: teachers and admins
  const leaders = useMemo(() => {
    const byEmail = new Map(users.map(u => [u.email.toLowerCase(), u]));
    return staff
      .map(s => {
        const u = byEmail.get(s.email) || users.find(x => x.userId === s.userId);
        return u ? { userId: u.userId, name: u.name, photoURL: u.photoURL, email: u.email } : null;
      })
      .filter((x): x is { userId: string; name: string; photoURL: string; email: string } => !!x)
      .sort((a, b) => a.name.localeCompare(b.name, 'ka'));
  }, [staff, users]);

  const classesWithoutTeacher = classes.filter(c => !c.teacherIds.length).length;
  const membersWithoutClass = users.filter(test.noClass).length;
  const teachersWithoutClass = leaders.filter(l => staff.find(s => s.userId === l.userId || s.email === l.email.toLowerCase())?.role === 'teacher' && !classes.some(c => c.teacherIds.includes(l.userId)) && !groups.some(g => g.teacherIds.includes(l.userId))).length;

  // the attention lines wait for every list, so they never flash a wrong number; a list that did not come says so
  const ready = !loading && !loadingClasses && staffLoaded && (!isSuperAdmin || accessLoaded);
  const broken = failed.users || failed.staff || failed.access || classesFailed;

  // „სკოლის ზრდა“: this week's active members are kept once per visit (the week's largest count stays; utils/growth)
  const growth = useGrowthWeeks();
  const counted = useRef(false);
  useEffect(() => {
    if (!ready || broken || !growth.loaded || !left.loaded || counted.current) return;
    counted.current = true;
    const n = users.filter(u => roleOf(u, staff) === 'member' && !left.uids.has(u.userId) && activeIn7(u.lastActiveAt)).length;
    void recordWeek(growth.weeks, n).catch(() => {});
  }, [ready, broken, growth.loaded, growth.weeks, left, users, staff]);

  // the big numbers: three people filters (superadmins see who waits; other admins see the teachers) and the classes.
  // Each shows „—“ until its lists have come; „ელოდება“ turns amber while someone waits (and the row says it once more)
  const usersIn = !loading && !failed.users;
  const userTiles: Filter[] = ['all', 'week', isSuperAdmin ? 'pending' : 'teacher'];
  const TILES: HeroTile[] = [
    { id: 'all', label: 'ყველა', n: usersIn ? users.filter(test.all).length : null, Icon: Users },
    { id: 'week', label: 'აქტიური კვირაში', n: usersIn && staffLoaded && (!isSuperAdmin || accessLoaded) ? users.filter(test.week).length : null, Icon: Activity },
    isSuperAdmin
      ? { id: 'pending', label: 'ელოდება', n: usersIn && staffLoaded && accessLoaded && !failed.access ? waiting : null, Icon: Hourglass, alert: waiting > 0 }
      // a soft hyphen: the word breaks in two on a phone instead of running into the next number
      : { id: 'teacher', label: 'მასწავ\u00adლებლები', n: usersIn && staffLoaded && !failed.staff ? users.filter(test.teacher).length : null, Icon: GraduationCap },
    { id: 'classes', label: 'კლასები', n: loadingClasses || classesFailed ? null : classes.length, Icon: School },
  ];
  const activeTile = view === 'classes' ? 'classes' : userTiles.includes(filter) ? filter : null;
  const openTile = (id: string) => {
    if (id === 'classes') return setView('classes');
    setView('users');
    setFilter(id === filter && view === 'users' && id !== 'all' ? 'all' : (id as Filter));
  };

  const showFilter = (f: Filter) => { setView('users'); setFilter(f); };
  const todo = !ready || broken ? [] : [
    ...(teachersWithoutClass > 0 ? [{ id: 'teach', icon: <GraduationCap />, text: `${teachersWithoutClass} მასწავლებელს კლასი ან ჯგუფი არ აქვს`, go: () => setView('classes') }] : []),
    ...(classesWithoutTeacher > 0 ? [{ id: 'lead', icon: <TriangleAlert />, text: `${classesWithoutTeacher} კლასს მასწავლებელი არ ჰყავს`, go: () => setView('classes') }] : []),
    ...(membersWithoutClass > 0 ? [{ id: 'class', icon: <UserX />, text: `${membersWithoutClass} წევრი კლასის გარეშეა`, go: () => showFilter('noClass') }] : []),
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-1 py-4 sm:py-6 space-y-4 pb-14 text-[#2a2017]">
      <PageBar
        title="ადმინის პანელი"
        subtitle={isOwner ? 'მფლობელი' : isSuperAdmin ? 'სუპერადმინი' : 'ადმინი'}
        onBack={handleGoBack}
        right={
          <button type="button" onClick={() => setSchoolOpen(true)} aria-haspopup="dialog"
            title="სკოლის პარამეტრები: განყოფილებები, მოსმენები, უფლებები, სარეზერვო ასლი"
            className="h-9 px-3.5 shrink-0 rounded-full bg-white/80 ring-1 ring-[#e8dcc8] hover:bg-white hover:ring-[#7a2028]/30 text-[#7a2028] text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer active:scale-95 transition">
            {/* the ⚙ from 400px: on a narrower phone the word alone keeps the title on one line */}
            <Settings className="hidden min-[400px]:block w-4 h-4" /> სკოლა
          </button>
        }
      />
      <AdminHero tiles={TILES} activeId={activeTile} onTile={openTile} />
      {/* what waits for the admin, each with its way there; when nothing does, one calm line */}
      {todo.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {todo.map(t => (
            <button key={t.id} type="button" onClick={t.go}
              className="w-full min-h-[56px] rounded-3xl bg-amber-50 ring-1 ring-amber-200 hover:ring-amber-300 px-3.5 py-2.5 flex items-center gap-3 text-left cursor-pointer active:scale-[0.99] transition">
              <span className="w-9 h-9 shrink-0 rounded-xl bg-amber-100 text-[#9a6212] flex items-center justify-center [&>svg]:w-[18px] [&>svg]:h-[18px]">{t.icon}</span>
              <span className="flex-1 min-w-0 text-[14px] font-semibold text-[#4a3426] leading-snug">{t.text}</span>
              <ChevronRight className="w-4 h-4 shrink-0 text-[#9a6212]/70" />
            </button>
          ))}
        </div>
      ) : broken ? (
        <p role="alert" className="flex items-center gap-2 rounded-3xl bg-red-50 ring-1 ring-red-200 px-3.5 py-2.5 text-[13px] font-semibold text-red-800">
          <WifiOff className="w-4 h-4 shrink-0" /> ზოგი მონაცემი ვერ ჩაიტვირთა — შეამოწმე ინტერნეტი და გახსენი თავიდან.
        </p>
      ) : ready && (
        <p className="flex items-center gap-2 px-1 text-[13px] font-semibold text-emerald-800">
          <CircleCheck className="w-4 h-4 shrink-0" /> ყველაფერი რიგზეა — არაფერი გელოდება.
        </p>
      )}
      <Flash flash={msg.flash} onClose={msg.clear} />

      {view === 'users' && (
        <UsersTab users={users} staff={staff} classes={classes} access={access} decisions={decisions} loading={loading}
          filter={filter} onFilter={setFilter} tiles={userTiles} openId={openId} onOpen={setOpenId} onMessage={msg.say} left={left} />
      )}
      {view === 'classes' && (
        <div className="space-y-4">
          {/* a psalter group lives only inside its class (made from the class page); it shows on the class's row */}
          <ClassesAdmin classes={classes} archived={archived} loading={loadingClasses} failed={classesFailed} onMessage={msg.say} groups={groups} />
        </div>
      )}
      {schoolOpen && <SchoolSheet users={users} classes={classes} onClose={() => setSchoolOpen(false)} />}
    </div>
  );
};
