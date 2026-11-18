import { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useManagedClasses } from '../../../hooks/useClasses';
import type { ClassMember, SchoolClass } from '../../../hooks/useClasses';
import { useClassStudents, useAttendanceState, localIso } from '../../../hooks/useTeaching';
import type { AttendanceDay } from '../../../hooks/useTeaching';
import { filterValidVariants } from '../../../utils/variantValidation';
import { voicesOf } from '../../../utils/pathItems';
import type { PathItem } from '../../../utils/pathItems';

// What the student's screens read: who it is, the class the viewer opened it from, the student's own record
// (students/{uid}, live — a teacher of the student reads it, firestore.rules) and the class's attendance.
// Behaviour as the old pages/StudentPage.tsx and StudentTools: the class is the one it was opened from, else one of the
// viewer's own that the student is in.

export const ROMAN: Record<string, string> = { '1': 'I', '2': 'II', '3': 'III' };

export interface StudentData {
  uid: string;
  classId: string;
  name: string;
  photoURL: string;
  cls: SchoolClass | null;
  member: ClassMember | undefined;
  /** students/{uid} — null while it loads */
  data: Record<string, any> | null;
  denied: boolean;
  attendance: AttendanceDay[];
}

export const useStudent = (uid: string, classId: string): StudentData => {
  const { classes } = useManagedClasses();
  const [data, setData] = useState<Record<string, any> | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!uid) return;
    setData(null);
    setDenied(false);
    return onSnapshot(doc(db, 'students', uid), s => setData(s.data() || {}), () => setDenied(true));
  }, [uid]);

  const cls = classes.find(c => c.id === classId && c.memberIds.includes(uid)) || classes.find(c => c.memberIds.includes(uid)) || null;
  // links the class's teachers to an older member (it does it as a side effect, as the old page's StudentTools did)
  useClassStudents(cls);
  const att = useAttendanceState(cls?.id);
  const member = cls?.members.find(m => m.uid === uid);
  const p = data?.profile || {};
  const name = `${p.firstName || ''} ${p.lastName || ''}`.trim() || data?.displayName || member?.name || 'მოსწავლე';
  const photoURL = data?.photoURL || member?.photoURL || '';
  return { uid, classId, name, photoURL, cls, member, data, denied, attendance: att.days };
};

/** The student's path items (the same filter the old editor used) and what is marked on them. */
export const pathItemsOf = (data: Record<string, any> | null): PathItem[] =>
  Object.values(filterValidVariants((data && data.selectedChantVariants) || {})) as PathItem[];

export const usePathItems = (data: Record<string, any> | null) =>
  useMemo(() => pathItemsOf(data), [data]);

export const markedCount = (items: PathItem[]) =>
  items.reduce((n, it) => n + voicesOf(it, it.variantId).length, 0);

/** „II ხმა“ / „I, II ხმა“ from profile.voices */
export const voiceLine = (data: Record<string, any> | null): string => {
  const v: string[] = Array.isArray(data?.profile?.voices) ? data!.profile.voices : [];
  const r = v.map(x => ROMAN[x]).filter(Boolean);
  return r.length ? `${r.join(', ')} ხმა` : '';
};

/** The class's lesson days of this month the student came to / of all marked this month. */
export const monthAttendance = (days: AttendanceDay[], uid: string) => {
  const m = localIso().slice(0, 7);
  const mine = days.filter(d => d.date.startsWith(m));
  return { came: mine.filter(d => d.present.includes(uid)).length, total: mine.length };
};
