import { arrayRemove, arrayUnion, collection, deleteField, doc, getDoc, getDocs, query, setDoc, where, writeBatch } from 'firebase/firestore';
import { auth, db } from '../firebase';
import type { SchoolClass } from '../hooks/useClasses';
import { addClassMember, removeClassMember } from '../components/admin/ClassesAdmin';
import type { FeatureId, MemberStatus } from './memberAccess';

// A superadmin's hand on one member (2026-11-22, the user: „წაშლა სკოლიდან … შეჩერება დროებით … 404 … წაშლილებში … აღდგენა ან სამუდამოდ
// წაშლა … კლასიდან კლასში გადაყვანა ან კლასის გარეშე“; superadmins only):
// • memberAccess/{uid}.status 'suspended' — the member's app shows a „404“ as if broken and signs them out (MembershipGate);
//   'deleted' — „თქვენი ანგარიში წაშლილია“ and signed out; the old status and features wait in `before` for a restore.
// • a deleted member leaves every class (their ids kept in `removed.classes` for a restore) and their uid goes into
//   settings/removedMembers.uids, so every chat list hides them; the admin panel's „წაშლილები“ lists them.
// • for good: the reminders Worker's /delete-member (the same wipe as one's own „ანგარიშის წაშლა“; chat messages stay).

const SERVER = 'https://sagandzuri-reminders.mr-gabunia.workers.dev';
const accessRef = (uid: string) => doc(db, 'memberAccess', uid);
const removedRef = () => doc(db, 'settings', 'removedMembers');

type Before = { status: MemberStatus; features: 'all' | FeatureId[] } | null;
export interface MemberState { status: MemberStatus | 'legacy'; before: Before; removed?: { at: string; by: string; classes: string[] } }

export const readMemberState = async (uid: string): Promise<MemberState> => {
  const snap = await getDoc(accessRef(uid));
  if (!snap.exists()) return { status: 'legacy', before: null };
  const d = snap.data();
  return { status: d.status || 'pending', before: d.before ?? null, removed: d.removed };
};

/** the state to come back to: the one before a suspension or deletion (none = an old member — everything) */
const beforeOf = async (uid: string): Promise<Before> => {
  const snap = await getDoc(accessRef(uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  if (d.status === 'suspended' || d.status === 'deleted') return d.before ?? null;
  return { status: d.status || 'pending', features: d.features === 'all' ? 'all' : Array.isArray(d.features) ? d.features : [] };
};

const decided = (b: ReturnType<typeof writeBatch>, uid: string, by: string, status: string) =>
  b.set(doc(db, 'accessDecisions', uid), { by, at: new Date().toISOString(), status, features: [] }, { merge: true });

export const suspendMember = async (uid: string, by: string) => {
  const before = await beforeOf(uid);
  const b = writeBatch(db);
  b.set(accessRef(uid), { status: 'suspended', before, decidedAt: new Date().toISOString() }, { merge: true });
  decided(b, uid, by, 'suspended');
  await b.commit();
};

/** back to what it was before (a suspension or a deletion) */
const comeBack = async (uid: string, by: string) => {
  const snap = await getDoc(accessRef(uid));
  const before: Before = snap.exists() ? snap.data().before ?? null : null;
  const b = writeBatch(db);
  b.set(accessRef(uid), {
    status: before?.status ?? 'approved', features: before?.features ?? 'all',
    before: deleteField(), removed: deleteField(), decidedAt: new Date().toISOString(),
  }, { merge: true });
  decided(b, uid, by, before?.status ?? 'approved');
  await b.commit();
};

export const resumeMember = comeBack;

/** Moves a member: out of every class they are in, into `to` (none = no class, only their chats). */
export const moveMember = async (p: { uid: string; name: string; photoURL?: string }, all: SchoolClass[], to: SchoolClass | null) => {
  for (const c of all) if (c.memberIds.includes(p.uid) && c.id !== to?.id) await removeClassMember(c, p.uid);
  if (to && !to.memberIds.includes(p.uid)) await addClassMember(to, p);
};

export const deleteMember = async (uid: string, by: string, all: SchoolClass[]) => {
  const before = await beforeOf(uid);
  const classes = all.filter(c => c.memberIds.includes(uid)).map(c => c.id);
  for (const c of all) if (c.memberIds.includes(uid)) await removeClassMember(c, uid);
  const b = writeBatch(db);
  b.set(accessRef(uid), { status: 'deleted', before, removed: { at: new Date().toISOString(), by, classes }, decidedAt: new Date().toISOString() }, { merge: true });
  decided(b, uid, by, 'deleted');
  b.set(removedRef(), { uids: arrayUnion(uid) }, { merge: true });
  await b.commit();
};

export const restoreMember = async (uid: string, by: string, all: SchoolClass[]) => {
  const snap = await getDoc(accessRef(uid));
  const classes: string[] = snap.exists() ? snap.data().removed?.classes ?? [] : [];
  await comeBack(uid, by);
  await setDoc(removedRef(), { uids: arrayRemove(uid) }, { merge: true });
  const dir = await getDoc(doc(db, 'directory', uid));
  const p = { uid, name: (dir.data()?.name as string) || '', photoURL: (dir.data()?.photoURL as string) || '' };
  for (const c of all) if (classes.includes(c.id)) await addClassMember(c, p).catch(() => 0);
};

/** For good, through the server. Returns '' when done, else why not. */
export const wipeMember = async (uid: string): Promise<string> => {
  const user = auth.currentUser;
  if (!user) return 'ჯერ შედი ანგარიშში.';
  try {
    const res = await fetch(`${SERVER}/delete-member`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: await user.getIdToken(true), uid }),
    });
    if (!res.ok) return res.status === 403 ? 'ამის უფლება მხოლოდ სუპერადმინს აქვს.' : 'ვერ წაიშალა — სცადე მოგვიანებით.';
    await setDoc(removedRef(), { uids: arrayRemove(uid) }, { merge: true });
    return '';
  } catch {
    return 'სერვერთან კავშირი ვერ მოხერხდა.';
  }
};

/** The deleted members (superadmins read memberAccess), newest first, with their name and photo. */
export const listDeleted = async () => {
  const snap = await getDocs(query(collection(db, 'memberAccess'), where('status', '==', 'deleted')));
  const rows = await Promise.all(snap.docs.map(async d => {
    const dir = await getDoc(doc(db, 'directory', d.id)).catch(() => null);
    return { uid: d.id, at: (d.data().removed?.at as string) || '', name: (dir?.data()?.name as string) || 'უსახელო', photoURL: (dir?.data()?.photoURL as string) || '' };
  }));
  return rows.sort((a, b) => b.at.localeCompare(a.at));
};
