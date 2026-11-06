import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import { ClipboardList } from 'lucide-react';
import { db } from '../../firebase';
import { useAuth } from '../../context';
import type { SchoolClass } from '../../hooks/useClasses';
import { Assignment, daysUntil, toAssignment } from '../../hooks/useTeaching';
import { useConfirmations } from '../../hooks/useConfirmations';
import { useAllLearning } from '../../hooks/useLearning';
import { useDrillDone } from '../../utils/drillTakes';
import { triggerHaptic } from '../../utils/haptics';
import { WorkItems, currentWork, workDone } from '../teacher/MyClassWork';
import { AssignmentsFold } from '../teacher/AssignmentsPanel';
import { ClassLogo } from './ClassLogo';

// Every class's assignments in one place (2026-11-06, the user: „დავალების ღილაკიც მაღლა აიტანე საგანძურის ლოგოს მარჯვნივ“,
// answer „ყველა კლასის დავალება ერთად“): one round 📋 in the header right of the logo (WorkButton) and the list it drops
// down under the header (WorkPanel) — the chants', songs' and „ოსტატობა“'s exercises of all my classes; before that it sat
// left of the class page's tabs (2026-11-05). A member's button lights up red while an assignment came that they have not
// opened yet (students/{uid}.workSeenAt, one mark for all classes, the same as the path's „ნასწავლი“); opening the list puts
// it out, and the number still to do stays on it. A teacher manages each class's in its part of the list (AssignmentsFold:
// „ახალი დავალება“ asks chant or exercise, „ისწავლა N/M“, the older ones under „ძველი“).

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

/** The header's round 📋, as big as its neighbours. Its badge: red and pulsing while a new assignment waits unseen, wine
 *  with the number still to do after that (a teacher's: how many are current); open = solid wine. */
export const WorkButton: React.FC<{ state: ClassWorkState; open: boolean; onToggle: () => void }> = ({ state, open, onToggle }) => {
  const n = state.count;
  const lit = state.fresh > 0;
  const label = lit ? `დავალებები — ახალი: ${state.fresh}` : n ? `დავალებები · ${n}` : 'დავალებები';
  return (
    <button
      type="button"
      onClick={() => { triggerHaptic(10); onToggle(); }}
      aria-expanded={open}
      aria-label={label}
      title={label}
      className={`relative shrink-0 w-9 h-9 rounded-full ring-1 flex items-center justify-center cursor-pointer transition-all active:scale-95 ${
        open
          ? 'bg-[#7a2028] ring-[#7a2028] text-[#fbf6ec]'
          : 'bg-white/80 hover:bg-white ring-[#e8dcc8] hover:ring-[#7a2028]/40 text-[#7a2028]'
      }`}
    >
      <ClipboardList className="w-[18px] h-[18px]" />
      {n > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex">
          {lit && <span aria-hidden className="absolute inset-0 rounded-full bg-red-500/70 motion-safe:animate-ping" />}
          <span className={`relative min-w-5 h-5 px-1 rounded-full ring-2 ring-[#fbf6ec] text-[11px] font-black leading-5 tabular-nums text-center ${
            lit ? 'bg-[#c62828] text-white' : open ? 'bg-[#fbf6ec] text-[#7a2028]' : 'bg-[#7a2028] text-white'
          }`}>{n}</span>
        </span>
      )}
    </button>
  );
};

/** The list the button drops down: a part a class (with its name when there are several). */
export const WorkPanel: React.FC<{ state: ClassWorkState }> = ({ state }) => {
  const several = state.groups.length > 1;
  const total = state.groups.reduce((n, g) => n + g.all.length, 0);
  return (
    <section aria-label="დავალებები">
      <h2 className="min-h-12 flex items-center gap-2">
        <ClipboardList className="w-5 h-5 shrink-0 text-[#7a2028]" />
        <span className="font-serif-ge text-lg font-bold text-[#4a3426] truncate">დავალებები</span>
        {total > 0 && <span className="text-sm font-bold text-[#a4927c] tabular-nums">{total}</span>}
      </h2>
      <div className="space-y-4">
        {state.groups.map(g => (
          <div key={g.cls.id}>
            {several && (
              <p className="mb-1.5 flex items-center gap-2 text-[13px] font-bold text-[#8a7a6a]">
                <ClassLogo name={g.cls.name} logo={g.cls.logo} className="w-6 h-6 shrink-0 text-[10px]" />
                <span className="truncate">{g.cls.name}</span>
              </p>
            )}
            {g.canEdit ? (
              <AssignmentsFold cls={g.cls} list={g.all} past={g.past} />
            ) : g.all.length ? (
              <WorkItems list={g.all} />
            ) : (
              <p className="pb-1 text-[14px] text-[#8a7a6a]">ახლა დავალება არ გაქვს. ახალი რომ მოვა, ეს ღილაკი აინთება.</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};
