import React, { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { ClipboardList } from 'lucide-react';
import { db } from '../../firebase';
import { useAuth } from '../../context';
import type { SchoolClass } from '../../hooks/useClasses';
import { Assignment, daysUntil, useAssignments } from '../../hooks/useTeaching';
import { useConfirmations } from '../../hooks/useConfirmations';
import { useAllLearning } from '../../hooks/useLearning';
import { useDrillDone } from '../../utils/drillTakes';
import { triggerHaptic } from '../../utils/haptics';
import { WorkItems, currentWork, workDone } from '../teacher/MyClassWork';
import { AssignmentsFold } from '../teacher/AssignmentsPanel';

// The class's assignments (2026-11-05, the user: „დავალება მინდა რომ პროგრამის მარცხნივ იყოს მრგვალი სიმბოლო და მასზე
// დაჭერისას ხდებოდეს ჩამოშლა და ნახვა, ასევე თუ დავალება მოსულია აინთოს ინდიკატორი“): one round 📋 button left of the
// page's „პროგრამა · ჩათი“ tabs (WorkButton) and the list it drops down under them (WorkPanel) — every assignment, the
// chants' and songs' and the exercises of „ოსტატობა“ alike, in one place. A member's button lights up red while an
// assignment came that they have not opened yet (students/{uid}.workSeenAt, the same mark as the path's „ნასწავლი“); opening
// the list puts it out, and the number of those still to do stays on it. A teacher manages them in the list
// (AssignmentsFold: „ახალი დავალება“ asks chant or exercise, „ისწავლა N/M“, the older ones under „ძველი“).

export interface ClassWorkState {
  /** the current assignments (due no more than three days ago), chants and exercises together */
  all: Assignment[];
  /** the older ones, newest first (teachers only) */
  past: Assignment[];
  /** a member's: how many are still to do, and how many came since they last opened the list */
  toDo: number;
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

export const useClassWork = (cls: SchoolClass, canEdit: boolean): ClassWorkState => {
  const { user } = useAuth();
  const assignments = useAssignments(cls.id);
  const confirmed = useConfirmations(user?.uid);
  const drillDone = useDrillDone(user?.uid);
  const mine = useAllLearning(user?.uid);
  const [seenAt, setSeenAt] = useSeenAt(canEdit ? undefined : user?.uid);
  const forMe = canEdit ? assignments : assignments.filter(a => !a.studentIds.length || (!!user && a.studentIds.includes(user.uid)));
  const all = currentWork(forMe);
  const past = canEdit ? assignments.filter(a => daysUntil(a.due) < 0 && !all.includes(a)).reverse() : [];
  const open = canEdit ? [] : all.filter(a => daysUntil(a.due) >= 0 && !workDone(a, confirmed, drillDone, mine));
  // (an old assignment without a time never counts as new; nothing is new before the record answers)
  const fresh = seenAt === null ? [] : open.filter(a => (a.createdAt || '') > seenAt);
  const markSeen = () => {
    if (!user || !fresh.length) return;
    // the newest one's own time, so the teacher's and the member's clocks never meet
    const last = fresh.reduce((m, a) => (a.createdAt && a.createdAt > m ? a.createdAt : m), seenAt || '');
    setSeenAt(last);
    setDoc(doc(db, 'students', user.uid), { workSeenAt: last }, { mergeFields: ['workSeenAt'] }).catch(() => {});
  };
  return { all, past, toDo: open.length, fresh: fresh.length, markSeen };
};

/** The round 📋 left of the tabs, as tall as they are. Its badge: red and pulsing while a new assignment waits unseen,
 *  wine with the number still to do after that; a teacher's shows how many are current. Since 2026-11-05 (the user: „თითქოს
 *  არ ჩანს“) it is wine-tinted with a bigger mark, so it reads as a button beside the white tabs; open = solid wine. */
export const WorkButton: React.FC<{ state: ClassWorkState; canEdit: boolean; open: boolean; onToggle: () => void }> = ({ state, canEdit, open, onToggle }) => {
  const n = canEdit ? state.all.length : state.toDo;
  const lit = !canEdit && state.fresh > 0;
  const label = lit
    ? `დავალებები — ახალი: ${state.fresh}`
    : canEdit ? `დავალებები${n ? ` · ${n}` : ''}` : n ? `დავალებები — შესასრულებელი: ${n}` : 'დავალებები';
  return (
    <button
      type="button"
      onClick={() => { triggerHaptic(10); onToggle(); }}
      aria-expanded={open}
      aria-label={label}
      title={label}
      className={`relative shrink-0 w-[54px] h-[54px] rounded-full flex items-center justify-center cursor-pointer transition active:scale-95 ${
        open
          ? 'bg-[#7a2028] text-[#fbf6ec] shadow-[0_6px_16px_-8px_rgba(122,32,40,0.8)]'
          : 'bg-[#f2e1de] ring-[1.5px] ring-[#7a2028]/35 text-[#7a2028] shadow-[0_4px_12px_-8px_rgba(122,32,40,0.6)] hover:bg-[#ecd5d1]'
      }`}
    >
      <ClipboardList className="w-[26px] h-[26px]" strokeWidth={2.2} />
      {n > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex">
          {lit && <span aria-hidden className="absolute inset-0 rounded-full bg-red-500/70 motion-safe:animate-ping" />}
          <span className={`relative min-w-6 h-6 px-1.5 rounded-full ring-2 ring-[#fbf6ec] text-[13px] font-bold leading-6 tabular-nums text-center shadow-sm ${
            lit ? 'bg-red-600 text-white' : open ? 'bg-[#fbf6ec] text-[#7a2028]' : 'bg-[#7a2028] text-white'
          }`}>{n}</span>
        </span>
      )}
    </button>
  );
};

/** The list the button drops down, under the tabs. */
export const WorkPanel: React.FC<{ cls: SchoolClass; canEdit: boolean; state: ClassWorkState }> = ({ cls, canEdit, state }) => (
  <section className="sg-in bg-white/80 rounded-3xl ring-1 ring-[#e8dcc8] px-4 min-[400px]:px-5 sm:px-6 pt-1 pb-4" aria-label="დავალებები">
    <h2 className="min-h-12 flex items-center gap-2">
      <ClipboardList className="w-5 h-5 shrink-0 text-[#7a2028]" />
      <span className="font-serif-ge text-lg font-bold text-[#4a3426] truncate">დავალებები</span>
      {state.all.length > 0 && <span className="text-sm font-bold text-[#a4927c] tabular-nums">{state.all.length}</span>}
    </h2>
    {canEdit ? (
      <AssignmentsFold cls={cls} list={state.all} past={state.past} />
    ) : state.all.length ? (
      <WorkItems list={state.all} />
    ) : (
      <p className="pb-1 text-[14px] text-[#8a7a6a]">ახლა დავალება არ გაქვს. ახალი რომ მოვა, ეს ღილაკი აინთება.</p>
    )}
  </section>
);
