import React from 'react';
import { useAuth } from '../../context';
import type { SchoolClass } from '../../hooks/useClasses';
import { Assignment, daysUntil, useAssignments } from '../../hooks/useTeaching';
import { useConfirmations } from '../../hooks/useConfirmations';
import { useAllLearning } from '../../hooks/useLearning';
import { useDrillDone } from '../../utils/drillTakes';
import { WorkItems, currentWork, workDone } from '../teacher/MyClassWork';
import { AssignmentsFold } from '../teacher/AssignmentsPanel';

// The class page's „დავალებები“ tab (2026-10-28; until then a fold beside the program's title). A teacher sees all the
// class's assignments to manage (AssignmentsFold), a member those for the whole class or for them (WorkItems).

export interface ClassWorkState {
  /** current: due no more than three days ago */
  work: Assignment[];
  /** the older ones, newest first (teachers only) */
  past: Assignment[];
  /** a member's assignment still to do — the tab's dot */
  dot: boolean;
}

export const useClassWork = (cls: SchoolClass, canEdit: boolean): ClassWorkState => {
  const { user } = useAuth();
  const assignments = useAssignments(cls.id);
  const confirmed = useConfirmations(user?.uid);
  const drillDone = useDrillDone(user?.uid);
  const mine = useAllLearning(user?.uid);
  const work = currentWork(canEdit ? assignments : assignments.filter(a => !a.studentIds.length || (!!user && a.studentIds.includes(user.uid))));
  const past = canEdit ? assignments.filter(a => daysUntil(a.due) < 0 && !work.includes(a)).reverse() : [];
  const dot = !canEdit && work.some(a => daysUntil(a.due) >= 0 && !workDone(a, confirmed, drillDone, mine));
  return { work, past, dot };
};

export const ClassWork: React.FC<{ cls: SchoolClass; canEdit: boolean; state: ClassWorkState }> = ({ cls, canEdit, state }) => (
  <section className="bg-white/70 rounded-3xl ring-1 ring-[#e8dcc8] px-4 min-[400px]:px-5 sm:px-6 py-4" aria-label="დავალებები">
    {canEdit ? (
      <AssignmentsFold cls={cls} list={state.work} past={state.past} />
    ) : state.work.length ? (
      <WorkItems list={state.work} />
    ) : (
      <p className="py-2 text-sm text-[#8a7a6a]">ახლა დავალება არ არის.</p>
    )}
  </section>
);
