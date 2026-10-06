import { useEffect, useMemo, useRef, useState } from 'react';
import { addDoc, arrayUnion, collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { SchoolClass } from './useClasses';
import { MONTHS_SHORT_GE, WEEKDAYS_GE, WEEKDAYS_SHORT_GE } from '../utils/dateNames';

// The teacher's side of a class: the members' records, assignments and attendance.
//   classes/{id}/assignments/{a}  { title, variantId, code, voices, due, note, studentIds, createdAt, createdBy }
//   classes/{id}/attendance/{day} { date, present: uid[], by, at }

export interface StudentRecord {
  uid: string;
  denied?: boolean;
  data?: Record<string, any>;
}

/** A teacher who adds a student to their class gets access to the student's path (firestore.rules). */
export const linkTeachers = (uid: string, cls: Pick<SchoolClass, 'id' | 'teacherIds'>) =>
  cls.teacherIds.length
    ? setDoc(doc(db, 'students', uid), { teacherIds: arrayUnion(...cls.teacherIds), teacherVia: cls.id }, { merge: true })
    : Promise.resolve();

/** Every member's student record (live). Members not yet linked to this class's teachers are linked once. */
export const useClassStudents = (cls: SchoolClass | null | undefined) => {
  const { user, isAdmin } = useAuth();
  const [records, setRecords] = useState<Record<string, StudentRecord>>({});
  const tried = useRef(new Set<string>());
  const [linked, setLinked] = useState(0);
  const ids = cls?.memberIds.join(',') || '';

  useEffect(() => {
    if (!cls) { setRecords({}); return; }
    const offs = cls.memberIds.map(uid =>
      onSnapshot(
        doc(db, 'students', uid),
        snap => setRecords(r => ({ ...r, [uid]: { uid, data: snap.data() || {} } })),
        () => {
          setRecords(r => ({ ...r, [uid]: { uid, denied: true } }));
          // an older member: give this class's teachers access, then the listener is set up again
          const leads = !!user && (isAdmin || cls.teacherIds.includes(user.uid));
          if (leads && !tried.current.has(uid)) {
            tried.current.add(uid);
            linkTeachers(uid, cls).then(() => setLinked(n => n + 1)).catch(() => {});
          }
        }
      )
    );
    return () => offs.forEach(off => off());
    // the listeners follow the member list (and come back after a link)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cls?.id, ids, linked]);

  return records;
};

export interface Assignment {
  id: string;
  classId: string;
  title: string;
  variantId?: string;
  code?: string;
  voices: string[];   // '1' | '2' | '3'; empty for items without voices
  due: string;        // YYYY-MM-DD
  note?: string;
  studentIds: string[]; // empty = the whole class
  createdAt?: string;
}

const toAssignment = (classId: string, id: string, d: any): Assignment => ({
  id,
  classId,
  title: d.title || 'დავალება',
  variantId: d.variantId || undefined,
  code: d.code || '',
  voices: Array.isArray(d.voices) ? d.voices : [],
  due: d.due || '',
  note: d.note || '',
  studentIds: Array.isArray(d.studentIds) ? d.studentIds : [],
  createdAt: d.createdAt || '',
});

/** A class's assignments, the nearest deadline first (live). */
export const useAssignments = (classId?: string | null) => {
  const [list, setList] = useState<Assignment[]>([]);
  useEffect(() => {
    if (!classId) { setList([]); return; }
    return onSnapshot(
      query(collection(db, 'classes', classId, 'assignments'), orderBy('due', 'asc')),
      s => setList(s.docs.map(d => toAssignment(classId, d.id, d.data()))),
      () => setList([])
    );
  }, [classId]);
  return list;
};

/** My assignments across my classes (live). */
export const useMyAssignments = (classIds: string[], uid?: string | null) => {
  const [byClass, setByClass] = useState<Record<string, Assignment[]>>({});
  const key = classIds.join(',');
  useEffect(() => {
    if (!uid) { setByClass({}); return; }
    const offs = classIds.map(cid =>
      onSnapshot(
        collection(db, 'classes', cid, 'assignments'),
        s => setByClass(m => ({ ...m, [cid]: s.docs.map(d => toAssignment(cid, d.id, d.data())) })),
        () => setByClass(m => ({ ...m, [cid]: [] }))
      )
    );
    return () => offs.forEach(o => o());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, uid]);
  return useMemo(
    () => Object.values(byClass).flat().filter(a => !a.studentIds.length || (uid && a.studentIds.includes(uid))).sort((a, b) => a.due.localeCompare(b.due)),
    [byClass, uid]
  );
};

export const createAssignment = (classId: string, a: Omit<Assignment, 'id' | 'classId'>, by: string) =>
  addDoc(collection(db, 'classes', classId, 'assignments'), { ...a, createdAt: new Date().toISOString(), createdBy: by });

export const deleteAssignment = (classId: string, id: string) => deleteDoc(doc(db, 'classes', classId, 'assignments', id));

export interface AttendanceDay {
  date: string;
  present: string[];
}

/** The class's latest lessons' attendance, newest first (live). */
export const useAttendance = (classId?: string | null, count = 30) => {
  const [days, setDays] = useState<AttendanceDay[]>([]);
  useEffect(() => {
    if (!classId) { setDays([]); return; }
    return onSnapshot(
      query(collection(db, 'classes', classId, 'attendance'), orderBy('date', 'desc'), limit(count)),
      s => setDays(s.docs.map(d => ({ date: d.data().date || d.id, present: Array.isArray(d.data().present) ? d.data().present : [] }))),
      () => setDays([])
    );
  }, [classId, count]);
  return days;
};

export const saveAttendance = (classId: string, date: string, present: string[], by: string) =>
  setDoc(doc(db, 'classes', classId, 'attendance', date), { date, present, by, at: new Date().toISOString() });

export const localIso = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Whole days from today to an ISO date (negative when past). */
export const daysUntil = (iso: string, today: Date = new Date()) => {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((new Date(y, m - 1, d).getTime() - t.getTime()) / 86400_000);
};

export const dueLabel = (iso: string) => {
  const n = daysUntil(iso);
  if (n < 0) return n === -1 ? 'ვადა გუშინ გავიდა' : `ვადა ${-n} დღის წინ გავიდა`;
  if (n === 0) return 'ვადა დღეს';
  if (n === 1) return 'ვადა ხვალ';
  return `ვადამდე ${n} დღე`;
};

export const shortDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return y ? `${d} ${MONTHS_SHORT_GE[m - 1]}` : iso;
};
export const weekdayOf = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
};

/** "2 დღის წინ", "დღეს", "3 სთ-ის წინ". */
export const agoLabel = (iso?: string) => {
  if (!iso) return 'არასდროს';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 3600_000) return 'ახლახან';
  if (ms < 86400_000) return `${Math.floor(ms / 3600_000)} სთ-ის წინ`;
  const d = Math.floor(ms / 86400_000);
  return d === 1 ? 'გუშინ' : `${d} დღის წინ`;
};
