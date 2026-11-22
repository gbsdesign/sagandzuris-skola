import { useEffect, useMemo, useRef, useState } from 'react';
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth, SUPER_ADMIN_EMAIL } from '../../context';
import { useAllClasses } from '../../hooks/useClasses';
import { useAllPsalterGroups } from '../../hooks/usePsalter';
import { useLeftMembers } from '../../utils/leftMembers';
import { useDirectory, writeDirectory } from '../../utils/directory';
import { teachersDiffer, teachersOf } from '../../utils/classTeachers';
import { activeIn7 } from '../../utils/growth';
import { recordWeek, useGrowthWeeks } from '../../hooks/useGrowth';
import { AccessRecord, DecisionRecord, toAccess } from './AccessRequests';
import { filterTests, StaffRecord, toUser, UserRecord } from './UsersTab';
import { roleOf } from './PersonSheet';
import { kaName } from '../../utils/georgianName';

export type Leader = { userId: string; name: string; photoURL: string; email: string };

/** Everything the admin panel reads and keeps right, apart from its drawing (the old page, AdminPanelPage, and the new
 *  look's, pages/v2/admini): the members, the staff, the classes and groups, the newcomers' requests (superadmins), who
 *  left; and the quiet fixes it makes once per visit — the members' teacherIds, missing directory lines, this week's count. */
export const useAdminData = () => {
  const { isAdmin, isSuperAdmin } = useAuth();
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
        name: kaName(u.displayName) || u.name,
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
      .filter((x): x is Leader => !!x)
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

  // a member a superadmin deleted from the school lives only in „წაშლილები“ (utils/memberRemoval.ts)
  const kept = useMemo(() => users.filter(u => access[u.userId]?.status !== 'deleted'), [users, access]);
  return {
    users: kept, staff, loading, staffLoaded, failed, classes, archived, loadingClasses, classesFailed, groups, access, decisions,
    accessLoaded, left, test, waiting, leaders, classesWithoutTeacher, membersWithoutClass, teachersWithoutClass, ready, broken,
  };
};

export type AdminData = ReturnType<typeof useAdminData>;
