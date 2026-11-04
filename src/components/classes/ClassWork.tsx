import React from 'react';
import { ClipboardList } from 'lucide-react';
import { useAuth } from '../../context';
import type { SchoolClass } from '../../hooks/useClasses';
import { Assignment, daysUntil, useAssignments } from '../../hooks/useTeaching';
import { useConfirmations } from '../../hooks/useConfirmations';
import { useAllLearning } from '../../hooks/useLearning';
import { useDrillDone } from '../../utils/drillTakes';
import { WorkItems, currentWork, workDone } from '../teacher/MyClassWork';
import { AssignmentsFold } from '../teacher/AssignmentsPanel';

// The class's assignments on the „პროგრამა“ tab (2026-11-04: the „დავალებები“ tab is gone — the user: „პროგრამა
// პროგრამაა“, the program's list stays as it is). Chants and songs in their own card over the program
// (ClassAssignments), the exercises of „ოსტატობა“ inside its card (DrillWork, ClassLessons' `work`). A teacher manages
// them (AssignmentsFold), a member sees those for the whole class or for them (WorkItems).

export interface ClassWorkState {
  /** current chants and songs (due no more than three days ago) */
  chants: Assignment[];
  /** current exercises of „ოსტატობა“ */
  drills: Assignment[];
  /** the older ones, newest first (teachers only) */
  pastChants: Assignment[];
  pastDrills: Assignment[];
  /** a member's assignment still to do — the program tab's dot; `drillDot` = the „ოსტატობა“ line's chip */
  dot: boolean;
  drillDot: boolean;
}

export const useClassWork = (cls: SchoolClass, canEdit: boolean): ClassWorkState => {
  const { user } = useAuth();
  const assignments = useAssignments(cls.id);
  const confirmed = useConfirmations(user?.uid);
  const drillDone = useDrillDone(user?.uid);
  const mine = useAllLearning(user?.uid);
  const forMe = canEdit ? assignments : assignments.filter(a => !a.studentIds.length || (!!user && a.studentIds.includes(user.uid)));
  const work = currentWork(forMe);
  const past = canEdit ? assignments.filter(a => daysUntil(a.due) < 0 && !work.includes(a)).reverse() : [];
  const toDo = (list: Assignment[]) => !canEdit && list.some(a => daysUntil(a.due) >= 0 && !workDone(a, confirmed, drillDone, mine));
  const drills = work.filter(a => a.exercise);
  return {
    chants: work.filter(a => !a.exercise),
    drills,
    pastChants: past.filter(a => !a.exercise),
    pastDrills: past.filter(a => a.exercise),
    dot: toDo(work),
    drillDot: toDo(drills),
  };
};

/** The chants' and songs' assignments: a card of their own over the program. A member sees it only while there is one;
 *  a teacher always (with „ახალი დავალება“; a program item's window also has „დავალებად მიცემა“). */
export const ClassAssignments: React.FC<{ cls: SchoolClass; canEdit: boolean; state: ClassWorkState }> = ({ cls, canEdit, state }) => {
  if (!canEdit && !state.chants.length) return null;
  return (
    <section className="bg-white/70 rounded-3xl ring-1 ring-[#e8dcc8] px-4 min-[400px]:px-5 sm:px-6 pt-1 pb-4" aria-label="დავალებები">
      <h2 className="min-h-14 flex items-center gap-2">
        <ClipboardList className="w-5 h-5 shrink-0 text-[#7a2028]" />
        <span className="font-serif-ge text-lg font-bold text-[#4a3426] truncate">დავალებები</span>
        {state.chants.length > 0 && <span className="text-sm font-bold text-[#a4927c] tabular-nums">{state.chants.length}</span>}
      </h2>
      {canEdit ? <AssignmentsFold cls={cls} list={state.chants} past={state.pastChants} only="chant" /> : <WorkItems list={state.chants} />}
    </section>
  );
};

/** The exercises given as assignments, at the top of the class's „ოსტატობა“ card; a teacher gives one from here. */
export const DrillWork: React.FC<{ cls: SchoolClass; canEdit: boolean; state: ClassWorkState }> = ({ cls, canEdit, state }) => {
  if (!canEdit && !state.drills.length) return null;
  return (
    <div className="mt-1 mb-2 rounded-2xl bg-[#fbf6ec] ring-1 ring-[#efe5d4] px-3 pt-2.5 pb-3">
      <p className="px-0.5 mb-2 text-[12.5px] font-bold text-[#a0703c]">
        დავალებები{state.drills.length > 0 ? ` · ${state.drills.length}` : ''}
      </p>
      {canEdit ? <AssignmentsFold cls={cls} list={state.drills} past={state.pastDrills} only="drill" /> : <WorkItems list={state.drills} />}
    </div>
  );
};
