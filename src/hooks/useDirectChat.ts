import { useEffect, useState } from 'react';
import { collection, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '../firebase';
import { sendCallMessage, ChatAuthor } from './useClassChat';
import type { SchoolClass } from './useClasses';

// A teacher's private chat with one student of their class: dms/{teacherUid}_{studentUid}, readable only by the
// two of them and the superadmin (firestore.rules). Only a teacher and a student talk privately — never two
// students. The document keeps the class that links them (classId), both names and photos, the newest message's
// time and preview for the lists, when each of them last opened it (read.{uid}), the private call's room key and
// the last call. Its messages and voice parts live under it, like a class chat's (hooks/useClassChat.ts).
// Each teacher keeps their name and photo in teachers/{uid} on signing in, so students see them fresh.

export interface Person { uid: string; name: string; photoURL: string }

export interface DirectThread {
  id: string;
  teacherUid: string;
  studentUid: string;
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
export const dmBase = (id: string) => `dms/${id}`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toDate = (v: any): Date | null => (v?.toDate ? v.toDate() : null);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toThread = (id: string, d: any): DirectThread => ({
  id,
  teacherUid: d.teacherUid || '',
  studentUid: d.studentUid || '',
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
});

/** the other person of a thread, seen from uid */
export const otherOf = (t: DirectThread, uid: string): Person => {
  const o = t.teacherUid === uid ? t.studentUid : t.teacherUid;
  return { uid: o, name: t.names[o] || '', photoURL: t.photos[o] || '' };
};

/** the other person wrote after uid last opened the chat */
export const isUnread = (t: DirectThread, uid: string) => {
  const seen = t.read[uid];
  return !!t.lastAt && t.lastBy !== uid && (!seen || seen < t.lastAt);
};

const newest = (t: DirectThread) => (t.lastAt || t.createdAt)?.getTime() ?? 0;

/** The signed-in person's private chats, newest first (live). Firestore shares one listener between callers. */
export const useDirectThreads = (uid?: string | null) => {
  const [threads, setThreads] = useState<DirectThread[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!uid) { setThreads([]); setLoading(false); return; }
    setLoading(true);
    // no orderBy: that would need a composite index; the list is small and sorted here
    const q = query(collection(db, 'dms'), where('members', 'array-contains', uid));
    return onSnapshot(
      q,
      snap => {
        setThreads(snap.docs.map(d => toThread(d.id, d.data({ serverTimestamps: 'estimate' }))).sort((a, b) => newest(b) - newest(a)));
        setLoading(false);
      },
      err => { console.warn('dms: ', err?.code || err); setThreads([]); setLoading(false); }
    );
  }, [uid]);
  return { threads, loading };
};

const byName = (a: Person, b: Person) => a.name.localeCompare(b.name, 'ka');

/** Someone one may write to privately, and the class that links the two of them. */
export interface Contact extends Person {
  classId: string;
  className: string;
  /** the viewer teaches this person (otherwise this person is the viewer's teacher) */
  iTeach: boolean;
}

/**
 * Whom uid may write to privately: the teachers of the classes uid is in, and the members of the classes uid
 * teaches (an admin too, when the class names them a teacher). One entry per person, sorted by name.
 */
export const contactsOf = (classes: SchoolClass[], uid: string): Contact[] => {
  const seen = new Map<string, Contact>();
  for (const c of classes) {
    const people = c.teacherIds.includes(uid) ? c.members.map(p => ({ p, iTeach: true }))
      : c.memberIds.includes(uid) ? c.teachers.map(p => ({ p, iTeach: false }))
      : [];
    for (const { p, iTeach } of people) {
      if (p.uid === uid || seen.has(p.uid)) continue;
      seen.set(p.uid, { uid: p.uid, name: p.name || '', photoURL: p.photoURL || '', classId: c.id, className: c.name, iTeach });
    }
  }
  return [...seen.values()].sort(byName);
};

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

/** Every private chat in the school, newest first: the superadmin's overview (live). */
export const useAllThreads = (enabled: boolean) => {
  const [threads, setThreads] = useState<DirectThread[]>([]);
  const [loading, setLoading] = useState(enabled);
  useEffect(() => {
    if (!enabled) { setThreads([]); setLoading(false); return; }
    setLoading(true);
    return onSnapshot(
      collection(db, 'dms'),
      snap => {
        setThreads(snap.docs.map(d => toThread(d.id, d.data({ serverTimestamps: 'estimate' }))).sort((a, b) => newest(b) - newest(a)));
        setLoading(false);
      },
      err => { console.warn('dms: ', err?.code || err); setThreads([]); setLoading(false); }
    );
  }, [enabled]);
  return { threads, loading };
};

/** A teacher or admin signing in: listed as a teacher students can write to (name and photo only, kept fresh). */
export const registerTeacher = (user: User) =>
  setDoc(
    doc(db, 'teachers', user.uid),
    { name: user.displayName || 'მასწავლებელი', photoURL: user.photoURL || '', updatedAt: new Date().toISOString() },
    { merge: true }
  );

const roomKey = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join('');

/**
 * The teacher's and student's chat, made the first time either of them opens it; resolves to its id.
 * classId is a class that links the two (firestore.rules checks it); an older chat moves to it when its
 * class no longer does.
 */
export const openThread = async (teacher: Person, student: Person, classId: string): Promise<string> => {
  const id = dmId(teacher.uid, student.uid);
  const ref = doc(db, 'dms', id);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    if (snap.get('classId') !== classId) await updateDoc(ref, { classId }).catch(e => console.warn('dms: ', e?.code || e));
  } else {
    await setDoc(ref, {
      members: [teacher.uid, student.uid],
      teacherUid: teacher.uid,
      studentUid: student.uid,
      classId,
      room: roomKey(),
      names: { [teacher.uid]: teacher.name, [student.uid]: student.name },
      photos: { [teacher.uid]: teacher.photoURL, [student.uid]: student.photoURL },
      createdAt: serverTimestamp(),
      lastAt: null,
      lastBy: '',
      lastText: '',
      read: {},
      callAt: null,
      callBy: '',
    });
  }
  return id;
};

/** After sending: the lists show this message first, with its preview. */
export const noteSent = (id: string, uid: string, preview: string) =>
  updateDoc(doc(db, 'dms', id), {
    lastAt: serverTimestamp(), lastBy: uid, lastText: preview.slice(0, 140), [`read.${uid}`]: serverTimestamp(),
  });

/** The chat was opened (or a message came in while it is open). */
export const markRead = (id: string, uid: string) =>
  updateDoc(doc(db, 'dms', id), { [`read.${uid}`]: serverTimestamp() });

export const CALL_PREVIEW = '📹 ზარი';

/** The teacher's "ზარი": a call card in the chat; an open app on the student's side shows "გირეკავთ". */
export const notePrivateCall = async (id: string, author: ChatAuthor) => {
  await sendCallMessage(dmBase(id), author);
  await updateDoc(doc(db, 'dms', id), {
    callAt: serverTimestamp(), callBy: author.uid,
    lastAt: serverTimestamp(), lastBy: author.uid, lastText: CALL_PREVIEW, [`read.${author.uid}`]: serverTimestamp(),
  });
};
