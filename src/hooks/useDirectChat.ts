import { useEffect, useState } from 'react';
import { collection, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '../firebase';
import { sendCallMessage, ChatAuthor } from './useClassChat';
import type { SchoolClass } from './useClasses';

// Private chats (dms/{id}, firestore.rules), three kinds:
//   teach  {teacherUid}_{studentUid} — a teacher and a member of their class (an old chat without a kind is one)
//   peer   p_{uidA}_{uidB}          — two members of one class (never a member in the kids' mode)
//   admin  a_{uid}                  — a member and the school's administration: any admin answers, the member
//          sees only „ადმინისტრაცია“. members holds the member alone; read.staff is the administration's reading.
// The document keeps the class that links them (classId), names and photos, the newest message's time and preview
// for the lists, when each side last opened it (read.{uid}), and the teacher's call room. Its messages and voice
// parts live under it, like a class chat's (hooks/useClassChat.ts). The superadmin may read every chat.
// Each teacher keeps their name and photo in teachers/{uid} on signing in, so students see them fresh.

export type ThreadKind = 'teach' | 'peer' | 'admin';

export interface Person { uid: string; name: string; photoURL: string }

export interface DirectThread {
  id: string;
  kind: ThreadKind;
  members: string[];
  /** teach only */
  teacherUid: string;
  studentUid: string;
  classId: string;
  room: string;
  names: Record<string, string>;
  photos: Record<string, string>;
  lastAt: Date | null;
  lastBy: string;
  lastText: string;
  read: Record<string, Date | null>;
  callAt: Date | null;
  callBy: string;
  createdAt: Date | null;
}

export const dmId = (teacherUid: string, studentUid: string) => `${teacherUid}_${studentUid}`;
export const peerId = (a: string, b: string) => `p_${[a, b].sort().join('_')}`;
export const adminId = (uid: string) => `a_${uid}`;
export const dmBase = (id: string) => `dms/${id}`;

/** the administration's name as members see it */
export const ADMIN_NAME = 'ადმინისტრაცია';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toDate = (v: any): Date | null => (v?.toDate ? v.toDate() : null);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toThread = (id: string, d: any): DirectThread => {
  const kind: ThreadKind = d.kind === 'peer' || d.kind === 'admin' ? d.kind : 'teach';
  return {
    id,
    kind,
    members: Array.isArray(d.members) ? d.members : [],
    teacherUid: d.teacherUid || '',
    studentUid: d.studentUid || '',
    classId: d.classId || '',
    room: d.room || '',
    names: d.names || {},
    photos: d.photos || {},
    lastAt: toDate(d.lastAt),
    lastBy: d.lastBy || '',
    lastText: d.lastText || '',
    read: Object.fromEntries(Object.entries(d.read || {}).map(([k, v]) => [k, toDate(v)])),
    callAt: toDate(d.callAt),
    callBy: d.callBy || '',
    createdAt: toDate(d.createdAt),
  };
};

/** uid answers this administration chat as an admin (not as its member) */
export const isStaffSide = (t: DirectThread, uid: string) => t.kind === 'admin' && !t.members.includes(uid);

/** the other side of a thread, seen from uid (the administration, for an administration chat's member) */
export const otherOf = (t: DirectThread, uid: string): Person => {
  if (t.kind === 'admin') {
    const m = t.members[0] || '';
    return m === uid ? { uid: 'admin', name: ADMIN_NAME, photoURL: '' } : { uid: m, name: t.names[m] || '', photoURL: t.photos[m] || '' };
  }
  const o = t.members.find(m => m !== uid) || (t.teacherUid === uid ? t.studentUid : t.teacherUid);
  return { uid: o, name: t.names[o] || '', photoURL: t.photos[o] || '' };
};

/** whose reading uid writes: the administration's shared one, or uid's own */
const readKey = (t: DirectThread, uid: string) => (isStaffSide(t, uid) ? 'staff' : uid);

/** when the other side last opened the chat ("ნანახია" under my message) */
export const seenByOther = (t: DirectThread, uid: string): Date | null =>
  t.kind === 'admin' ? (isStaffSide(t, uid) ? t.read[t.members[0]] : t.read.staff) ?? null : t.read[otherOf(t, uid).uid] ?? null;

/** the other side wrote after uid's side last opened the chat */
export const isUnread = (t: DirectThread, uid: string) => {
  if (!t.lastAt) return false;
  const staff = isStaffSide(t, uid);
  // in an administration chat, any admin's message is the administration's own
  if (staff ? t.lastBy !== t.members[0] : t.lastBy === uid) return false;
  const seen = t.read[readKey(t, uid)];
  return !seen || seen < t.lastAt;
};

export const newest = (t: DirectThread) => (t.lastAt || t.createdAt)?.getTime() ?? 0;

const useThreadQuery = (key: string | null, make: () => ReturnType<typeof query> | ReturnType<typeof collection>) => {
  const [threads, setThreads] = useState<DirectThread[]>([]);
  const [loading, setLoading] = useState(!!key);
  useEffect(() => {
    if (!key) { setThreads([]); setLoading(false); return; }
    setLoading(true);
    // no orderBy: that would need a composite index; the lists are small and sorted here
    return onSnapshot(
      make(),
      snap => {
        setThreads(snap.docs.map(d => toThread(d.id, d.data({ serverTimestamps: 'estimate' }))).sort((a, b) => newest(b) - newest(a)));
        setLoading(false);
      },
      err => { console.warn('dms: ', err?.code || err); setThreads([]); setLoading(false); }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { threads, loading };
};

/** The signed-in person's own chats, newest first (live). Firestore shares one listener between callers. */
export const useDirectThreads = (uid?: string | null) =>
  useThreadQuery(uid ? `mine:${uid}` : null, () => query(collection(db, 'dms'), where('members', 'array-contains', uid)));

/** Every administration chat: the admins' shared inbox (live). */
export const useAdminInbox = (enabled: boolean) =>
  useThreadQuery(enabled ? 'admin' : null, () => query(collection(db, 'dms'), where('kind', '==', 'admin')));

/** Every private chat in the school, newest first: the superadmin's overview (live). */
export const useAllThreads = (enabled: boolean) => useThreadQuery(enabled ? 'all' : null, () => collection(db, 'dms'));

/** One's own chats and, for an admin, the administration's: what the header counts and the list shows. */
export const useInbox = (uid: string | null | undefined, isAdmin: boolean) => {
  const mine = useDirectThreads(uid);
  const inbox = useAdminInbox(!!uid && isAdmin);
  const seen = new Set(mine.threads.map(t => t.id));
  const threads = [...mine.threads, ...inbox.threads.filter(t => !seen.has(t.id))].sort((a, b) => newest(b) - newest(a));
  return { threads, loading: mine.loading || inbox.loading };
};

/** One private chat (live); null while loading, or when it is missing or not readable. */
export const useThread = (id?: string | null) => {
  const [thread, setThread] = useState<DirectThread | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!id) { setThread(null); setLoading(false); return; }
    setLoading(true);
    return onSnapshot(
      doc(db, 'dms', id),
      snap => { setThread(snap.exists() ? toThread(snap.id, snap.data({ serverTimestamps: 'estimate' })) : null); setLoading(false); },
      err => { console.warn('dm: ', err?.code || err); setThread(null); setLoading(false); }
    );
  }, [id]);
  return { thread, loading };
};

// ---- whom one may write to ------------------------------------------------------------------------------

/** how the viewer is linked to a contact: their teacher, their student, a classmate, someone an admin writes to */
export type Relation = 'teacher' | 'student' | 'peer' | 'person';

/** Someone one may write to privately, and the class that links the two of them. */
export interface Contact extends Person {
  classId: string;
  className: string;
  rel: Relation;
}

const byName = (a: Person, b: Person) => a.name.localeCompare(b.name, 'ka');
const RANK: Record<Relation, number> = { teacher: 0, student: 0, peer: 1, person: 2 };

/**
 * Whom uid may write to, class by class: in a class uid teaches, its members; in a class uid is in, its teachers
 * and (unless one of the two is in the kids' mode) the other members; an admin, everyone in every other class
 * (through the administration). Teachers first, then by name.
 */
export const contactGroups = (
  classes: SchoolClass[], uid: string, opts: { isAdmin: boolean; kidsMe: boolean; kids: Set<string> },
): { cls: SchoolClass; contacts: Contact[] }[] =>
  classes.map(c => {
    const list: Contact[] = [];
    const add = (p: { uid: string; name?: string; photoURL?: string }, rel: Relation) => {
      if (p.uid !== uid && !list.some(x => x.uid === p.uid)) {
        list.push({ uid: p.uid, name: p.name || '', photoURL: p.photoURL || '', classId: c.id, className: c.name, rel });
      }
    };
    if (c.teacherIds.includes(uid)) c.members.forEach(p => add(p, 'student'));
    else if (c.memberIds.includes(uid)) {
      c.teachers.forEach(p => add(p, 'teacher'));
      if (!opts.kidsMe) c.members.filter(p => !opts.kids.has(p.uid)).forEach(p => add(p, 'peer'));
    } else if (opts.isAdmin) {
      c.teachers.forEach(p => add(p, 'person'));
      c.members.forEach(p => add(p, 'person'));
    }
    list.sort((a, b) => (a.rel === 'teacher') !== (b.rel === 'teacher') ? (a.rel === 'teacher' ? -1 : 1) : byName(a, b));
    return { cls: c, contacts: list };
  }).filter(g => g.contacts.length > 0);

/** the closest link to each person over all classes (a teacher's chat before a classmate's or the administration's) */
export const bestContacts = (groups: { contacts: Contact[] }[]) => {
  const best = new Map<string, Contact>();
  for (const g of groups) for (const c of g.contacts) {
    const had = best.get(c.uid);
    if (!had || RANK[c.rel] < RANK[had.rel]) best.set(c.uid, c);
  }
  return best;
};

/** the chat a contact leads to, seen from uid */
export const threadIdFor = (c: Contact, uid: string) =>
  c.rel === 'teacher' ? dmId(c.uid, uid) : c.rel === 'student' ? dmId(uid, c.uid) : c.rel === 'peer' ? peerId(uid, c.uid) : adminId(c.uid);

/** Teachers' own name and photo (teachers/{uid}), fresher than the copies kept in classes (live). */
export const useTeacherCards = (enabled: boolean) => {
  const [cards, setCards] = useState<Record<string, Person>>({});
  useEffect(() => {
    if (!enabled) return;
    return onSnapshot(
      collection(db, 'teachers'),
      s => setCards(Object.fromEntries(s.docs.map(d => [d.id, { uid: d.id, name: d.get('name') || '', photoURL: d.get('photoURL') || '' }]))),
      err => console.warn('teachers: ', err?.code || err)
    );
  }, [enabled]);
  return cards;
};

/** Members in the kids' mode (chatFlags), whom classmates' lists leave out (live). */
export const useKidsFlags = (enabled: boolean) => {
  const [kids, setKids] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!enabled) return;
    return onSnapshot(
      query(collection(db, 'chatFlags'), where('kids', '==', true)),
      s => setKids(new Set(s.docs.map(d => d.id))),
      err => console.warn('chatFlags: ', err?.code || err)
    );
  }, [enabled]);
  return kids;
};

/** Copies a member's kids' mode into chatFlags (the rules accept only the truth). */
export const syncKidsFlag = (uid: string, kids: boolean) =>
  setDoc(doc(db, 'chatFlags', uid), { kids }).catch(e => console.warn('chatFlags: ', e?.code || e));

/** A teacher or admin signing in: listed as a teacher students can write to (name and photo only, kept fresh). */
export const registerTeacher = (user: User) =>
  setDoc(
    doc(db, 'teachers', user.uid),
    { name: user.displayName || 'მასწავლებელი', photoURL: user.photoURL || '', updatedAt: new Date().toISOString() },
    { merge: true }
  );

const roomKey = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join('');

const EMPTY = { createdAt: serverTimestamp(), lastAt: null, lastBy: '', lastText: '', read: {} };

/** Makes the chat the first time; an existing teacher's or classmates' chat moves to the class that links them now. */
const openOrMake = async (id: string, classId: string | null, make: () => Record<string, unknown>) => {
  const ref = doc(db, 'dms', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) await setDoc(ref, make());
  else if (classId && snap.get('classId') !== classId) await updateDoc(ref, { classId }).catch(e => console.warn('dms: ', e?.code || e));
  return id;
};

/**
 * The teacher's and student's chat, made the first time either of them opens it; resolves to its id.
 * classId is a class that links the two (firestore.rules checks it).
 */
export const openThread = (teacher: Person, student: Person, classId: string): Promise<string> =>
  openOrMake(dmId(teacher.uid, student.uid), classId, () => ({
    kind: 'teach',
    members: [teacher.uid, student.uid],
    teacherUid: teacher.uid,
    studentUid: student.uid,
    classId,
    room: roomKey(),
    names: { [teacher.uid]: teacher.name, [student.uid]: student.name },
    photos: { [teacher.uid]: teacher.photoURL, [student.uid]: student.photoURL },
    ...EMPTY,
    callAt: null,
    callBy: '',
  }));

/** Two classmates' chat. */
export const openPeerThread = (me: Person, other: Person, classId: string): Promise<string> => {
  const members = [me.uid, other.uid].sort();
  return openOrMake(peerId(me.uid, other.uid), classId, () => ({
    kind: 'peer',
    members,
    classId,
    names: { [me.uid]: me.name, [other.uid]: other.name },
    photos: { [me.uid]: me.photoURL, [other.uid]: other.photoURL },
    ...EMPTY,
  }));
};

/** A member's chat with the administration (opened by the member, or by an admin writing to them). */
export const openAdminThread = (member: Person): Promise<string> =>
  openOrMake(adminId(member.uid), null, () => ({
    kind: 'admin',
    members: [member.uid],
    names: { [member.uid]: member.name },
    photos: { [member.uid]: member.photoURL },
    ...EMPTY,
  }));

/** After sending: the lists show this message first, with its preview. */
export const noteSent = (t: DirectThread, uid: string, preview: string) =>
  updateDoc(doc(db, 'dms', t.id), {
    lastAt: serverTimestamp(), lastBy: uid, lastText: preview.slice(0, 140), [`read.${readKey(t, uid)}`]: serverTimestamp(),
  });

/** The chat was opened (or a message came in while it is open). */
export const markRead = (t: DirectThread, uid: string) =>
  updateDoc(doc(db, 'dms', t.id), { [`read.${readKey(t, uid)}`]: serverTimestamp() });

export const CALL_PREVIEW = '📹 ზარი';

/** The teacher's "ზარი": a call card in the chat; an open app on the student's side shows "გირეკავთ". */
export const notePrivateCall = async (id: string, author: ChatAuthor) => {
  await sendCallMessage(dmBase(id), author);
  await updateDoc(doc(db, 'dms', id), {
    callAt: serverTimestamp(), callBy: author.uid,
    lastAt: serverTimestamp(), lastBy: author.uid, lastText: CALL_PREVIEW, [`read.${author.uid}`]: serverTimestamp(),
  });
};
