import React, { useEffect, useMemo, useRef, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { Users, GraduationCap, Disc3, School, TriangleAlert } from 'lucide-react';
import { db } from '../firebase';
import { useAuth, useNavigation, SUPER_ADMIN_EMAIL } from '../context';
import { useAllClasses } from '../hooks/useClasses';
import { useAllPsalterGroups } from '../hooks/usePsalter';
import { Flash, PageTop, Tabs, useFlash } from '../components/ui/kit';
import { ClassesAdmin } from '../components/admin/ClassesAdmin';
import { UsersTab, UserRecord, StaffRecord, toUser } from '../components/admin/UsersTab';
import { GroupsAdmin } from '../components/admin/GroupsAdmin';
import { RecordingsTab } from '../components/admin/RecordingsTab';
import { SchoolTab } from '../components/admin/SchoolTab';
import { AccessRecord, DecisionRecord, toAccess } from '../components/admin/AccessRequests';
import { useDirectory, writeDirectory } from '../utils/directory';

type Tab = 'users' | 'classes' | 'recordings' | 'school';
const TAB_KEY = 'sg-admin-tab';
// the former „განყოფილებები“ is now in „სკოლა“; the former „სტატისტიკა“ numbers stand where they belong
const OLD_TAB: Record<string, Tab> = { sections: 'school', stats: 'users' };
const readTab = (): Tab => {
  try {
    const t = localStorage.getItem(TAB_KEY) || '';
    return OLD_TAB[t] || (['users', 'classes', 'recordings', 'school'].includes(t) ? (t as Tab) : 'users');
  } catch {
    return 'users';
  }
};

// "ადმინის პანელი": the whole school in four tabs — people (one list; each person in one window), classes and
// psalter groups (each in its own window), recordings, and the school's settings.
export const AdminPanelPage: React.FC<{ logoUrl: string }> = ({ logoUrl }) => {
  const { user, isAdmin, isOwner, isSuperAdmin } = useAuth();
  const { handleGoBack } = useNavigation();
  const msg = useFlash();
  const [tab, setTab] = useState<Tab>(readTab);
  useEffect(() => { try { localStorage.setItem(TAB_KEY, tab); } catch { /* storage blocked */ } }, [tab]);

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { classes, loading: loadingClasses } = useAllClasses(isAdmin);
  const { groups } = useAllPsalterGroups(isAdmin);

  useEffect(() => {
    if (!isAdmin) return;
    const off1 = onSnapshot(collection(db, 'students'),
      s => { setUsers(s.docs.map(d => toUser(d.id, d.data()))); setLoading(false); },
      () => setLoading(false));
    const off2 = onSnapshot(collection(db, 'admins'),
      s => setStaff(s.docs.map(d => {
        const x = d.data();
        const r = x.role === 'superadmin' || x.role === 'teacher' ? x.role : 'admin';
        return { email: (x.email || d.id).toLowerCase(), role: d.id === SUPER_ADMIN_EMAIL ? 'superadmin' : r, userId: x.userId, name: x.name, addedBy: x.addedBy, addedAt: x.addedAt } as StaffRecord;
      })),
      () => setStaff([]));
    return () => { off1(); off2(); };
  }, [isAdmin]);

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
  useEffect(() => {
    if (!isSuperAdmin) return;
    const off1 = onSnapshot(collection(db, 'memberAccess'),
      s => setAccess(Object.fromEntries(s.docs.map(d => [d.id, toAccess(d.data())]))),
      () => setAccess({}));
    const off2 = onSnapshot(collection(db, 'accessDecisions'),
      s => setDecisions(Object.fromEntries(s.docs.map(d => [d.id, d.data() as DecisionRecord]))),
      () => setDecisions({}));
    return () => { off1(); off2(); };
  }, [isSuperAdmin]);
  const staffEmails = new Set([SUPER_ADMIN_EMAIL, ...staff.map(s => s.email)]);
  const waiting = users.filter(u => access[u.userId]?.status === 'pending' && !staffEmails.has(u.email.toLowerCase())).length;

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

  const classStudents = useMemo(() => users.map(u => ({ userId: u.userId, name: u.name, email: u.email, photoURL: u.photoURL })), [users]);
  const teachersWithoutClass = leaders.filter(l => staff.find(s => s.userId === l.userId || s.email === l.email.toLowerCase())?.role === 'teacher' && !classes.some(c => c.teacherIds.includes(l.userId)) && !groups.some(g => g.teacherIds.includes(l.userId))).length;

  const TABS = [
    { id: 'users' as const, label: 'მომხმარებლები', Icon: Users, dot: waiting > 0 },
    { id: 'classes' as const, label: 'კლასები', Icon: GraduationCap, dot: teachersWithoutClass > 0 },
    { id: 'recordings' as const, label: 'ჩანაწერები', Icon: Disc3 },
    { id: 'school' as const, label: 'სკოლა', Icon: School },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-1 py-4 sm:py-6 space-y-5 pb-14 text-[#2a2017]">
      <PageTop
        title="ადმინის პანელი"
        subtitle={`${isOwner ? 'მფლობელი' : isSuperAdmin ? 'სუპერადმინი' : 'ადმინი'} · ${user?.email || ''}`}
        onBack={handleGoBack}
      />
      <Tabs cols={4} value={tab} onChange={setTab} items={TABS} />
      <Flash flash={msg.flash} onClose={msg.clear} />

      {tab === 'users' && (
        <UsersTab users={users} staff={staff} classes={classes} groups={groups} access={access} decisions={decisions} loading={loading} onMessage={msg.say} />
      )}
      {tab === 'classes' && (
        <div className="space-y-4">
          {teachersWithoutClass > 0 && (
            <p className="flex items-center gap-2 px-1 text-[13px] font-semibold text-[#9a6212]">
              <TriangleAlert className="w-4 h-4 shrink-0" /> {teachersWithoutClass} მასწავლებელს ჯერ კლასი ან ჯგუფი არ აქვს მიბმული.
            </p>
          )}
          <ClassesAdmin classes={classes} loading={loadingClasses} students={classStudents} staff={leaders} onMessage={msg.say} mode="admin" />
          <GroupsAdmin groups={groups} staff={leaders.map(l => ({ uid: l.userId, name: l.name, photoURL: l.photoURL, sub: l.email }))} onMessage={msg.say} />
        </div>
      )}
      {tab === 'recordings' && <RecordingsTab users={users} onMessage={msg.say} />}
      {tab === 'school' && <SchoolTab logoUrl={logoUrl} onMessage={msg.say} />}
    </div>
  );
};
