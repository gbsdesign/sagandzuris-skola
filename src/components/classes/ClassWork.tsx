import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context';
import type { SchoolClass } from '../../hooks/useClasses';
import { Assignment, daysUntil, toAssignment } from '../../hooks/useTeaching';
import { useConfirmations } from '../../hooks/useConfirmations';
import { useAllLearning } from '../../hooks/useLearning';
import { useDrillDone } from '../../utils/drillTakes';
import { currentWork, workDone } from '../teacher/MyClassWork';

// Every class's assignments in one place: the chants', songs' and „ოსტატობა“'s exercises of all my classes, a group a
// class. It fed the header's round 📋 (2026-11-06) until that went into „საგანძურის გზა“ → „ნასწავლი“ on 2026-11-08
// (MyClassWork). A member's „new“ ones are those created after students/{uid}.workSeenAt, one mark for all classes.

export interface WorkGroup {
  cls: SchoolClass;
  /** a teacher of the class or an admin: manages its assignments */
  canEdit: boolean;
  /** the current assignments (due no more than three days ago), chants and exercises together */
  all: Assignment[];
  /** the older ones, newest first (teachers only) */
  past: Assignment[];
  /** a member's: how many are still to do */
  toDo: number;
}

export interface ClassWorkState {
  groups: WorkGroup[];
  /** the button's number: a member's still to do, a teacher's current ones */
  count: number;
  /** a member's: how many came since they last opened the list */
  fresh: number;
  /** the list was opened: the fresh ones count as seen */
  markSeen: () => void;
}

/** students/{uid}.workSeenAt: the newest assignment's time the member has seen (null until the record answers). */
const useSeenAt = (uid?: string) => {
  const [seenAt, setSeenAt] = useState<string | null>(null);
  useEffect(() => {
    if (!uid) { setSeenAt(null); return; }
    return onSnapshot(doc(db, 'students', uid), snap => {
      const v = snap.data()?.workSeenAt;
      setSeenAt(typeof v === 'string' ? v : '');
    }, () => setSeenAt(''));
  }, [uid]);
  return [seenAt, setSeenAt] as const;
};

/** Each class's assignments (live), by class id. */
const useAssignmentsOf = (ids: string[]) => {
  const [byClass, setByClass] = useState<Record<string, Assignment[]>>({});
  const key = ids.join(',');
  useEffect(() => {
    const offs = ids.map(cid => onSnapshot(
      query(collection(db, 'classes', cid, 'assignments'), orderBy('due', 'asc')),
      s => setByClass(m => ({ ...m, [cid]: s.docs.map(d => toAssignment(cid, d.id, d.data())) })),
      () => setByClass(m => ({ ...m, [cid]: [] }))
    ));
    return () => offs.forEach(o => o());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return byClass;
};

export const useClassWork = (classes: SchoolClass[]): ClassWorkState => {
  const { user, isAdmin } = useAuth();
  const byClass = useAssignmentsOf(classes.map(c => c.id));
  // (the header holds this on every page: with no class nothing is listened to)
  const uid = classes.length ? user?.uid : undefined;
  const confirmed = useConfirmations(uid);
  const drillDone = useDrillDone(uid);
  const mine = useAllLearning(uid);
  const learnsSomewhere = classes.some(c => !(isAdmin || (!!user && c.teacherIds.includes(user.uid))));
  const [seenAt, setSeenAt] = useSeenAt(learnsSomewhere ? user?.uid : undefined);

  const { groups, open } = useMemo(() => {
    const open: Assignment[] = [];
    const groups = classes.map((cls): WorkGroup => {
      const canEdit = isAdmin || (!!user && cls.teacherIds.includes(user.uid));
      const list = byClass[cls.id] || [];
      const forMe = canEdit ? list : list.filter(a => !a.studentIds.length || (!!user && a.studentIds.includes(user.uid)));
      const all = currentWork(forMe);
      const past = canEdit ? list.filter(a => daysUntil(a.due) < 0 && !all.includes(a)).reverse() : [];
      const toDo = canEdit ? [] : all.filter(a => daysUntil(a.due) >= 0 && !workDone(a, confirmed, drillDone, mine));
      open.push(...toDo);
      return { cls, canEdit, all, past, toDo: toDo.length };
    });
    return { groups, open };
  }, [classes, byClass, isAdmin, user, confirmed, drillDone, mine]);

  // (an old assignment without a time never counts as new; nothing is new before the record answers)
  const fresh = seenAt === null ? [] : open.filter(a => (a.createdAt || '') > seenAt);
  const markSeen = () => {
    if (!user || !fresh.length) return;
    // the newest one's own time, so the teacher's and the member's clocks never meet
    const last = fresh.reduce((m, a) => (a.createdAt && a.createdAt > m ? a.createdAt : m), seenAt || '');
    setSeenAt(last);
    setDoc(doc(db, 'students', user.uid), { workSeenAt: last }, { mergeFields: ['workSeenAt'] }).catch(() => {});
  };
  const count = groups.reduce((n, g) => n + (g.canEdit ? g.all.length : g.toDo), 0);
  return { groups, count, fresh: fresh.length, markSeen };
};
