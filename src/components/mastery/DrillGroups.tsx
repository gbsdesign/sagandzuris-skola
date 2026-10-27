import React, { useState } from 'react';
import { Check, ChevronDown, ClipboardList, Drum, Ear, Music2, Play, Users } from 'lucide-react';
import { useAuth } from '../../context';
import { Btn } from '../ui/kit';
import { MANERA_ITEMS } from '../../data/habitsAndManera';
import { ALL_DRILLS, DRILL_GROUPS, findDrill } from '../../data/vocalDrills';
import { useManeraPractice } from '../../utils/maneraPractice';
import { useDrillDone } from '../../utils/drillTakes';
import { useManera } from '../views/ManeraPanel';
import { useMyClasses } from '../../hooks/useClasses';
import { daysUntil, useMyAssignments } from '../../hooks/useTeaching';
import { DrillSheet } from './ManeraLessonSheet';
import { triggerHaptic } from '../../utils/haptics';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = { ear: Ear, poly: Users, folk: Music2, rhythm: Drum };

/** An exercise a teacher assigned and the member hasn't done since. */
const useOpenDrillWork = () => {
  const { user } = useAuth();
  const classes = useMyClasses(user?.uid);
  const work = useMyAssignments(classes.map(c => c.id), user?.uid);
  const done = useDrillDone(user?.uid);
  return work.filter(a => a.exercise && daysUntil(a.due) >= -3 && !((done[a.exercise] || '') >= (a.createdAt || '').slice(0, 10)));
};

// „დღის სავარჯიშო“ at the top of ოსტატობა: a teacher's assigned exercise first, then the weakest marked tip not done
// today, otherwise the next drill by the day.
export const DailyDrill: React.FC = () => {
  const { marks } = useManera();
  const { doneToday, weekDays } = useManeraPractice();
  const assigned = useOpenDrillWork();
  const [open, setOpen] = useState<string | null>(null);

  const weak = MANERA_ITEMS.map((item, i) => ({ id: `tip-${item.num}`, v: marks[i]?.v }))
    .filter(x => x.v !== undefined && x.v < 80 && !doneToday(x.id))
    .sort((a, b) => a.v! - b.v!)[0];
  const todo = ALL_DRILLS.filter(d => !doneToday(d.id));
  const pick = assigned[0]?.exercise ?? weak?.id ?? todo[Math.floor(Date.now() / 86400000) % Math.max(1, todo.length)]?.id;
  const why = assigned[0] ? 'მასწავლებლის დავალება' : weak ? 'მასწავლებლის შეფასებით' : '';
  const drill = findDrill(pick);

  return (
    <div className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3.5 flex flex-wrap items-center gap-x-3 gap-y-2.5">
      {drill ? (
        <>
          <div className="flex-1 min-w-[170px]">
            <p className="flex items-center gap-1.5 text-[12px] font-bold text-[#8a7a6a]">
              {assigned[0] && <ClipboardList className="w-3.5 h-3.5 text-[#7a2028]" />}
              დღის სავარჯიშო · ~{drill.exercise.minutes} წთ{why ? ` · ${why}` : ''}
            </p>
            <p className="mt-0.5 text-[15px] font-bold leading-snug text-[#4a3426]">{drill.title}</p>
          </div>
          <Btn icon={<Play />} onClick={() => setOpen(drill.id)}>დაწყება</Btn>
        </>
      ) : (
        <p className="flex-1 text-[14px] font-bold text-emerald-700">დღეს ყველა სავარჯიშო შეასრულე ✓</p>
      )}
      {weekDays > 0 && (
        <p className="basis-full text-[12px] text-[#8a7a6a]">ბოლო 7 დღიდან ივარჯიშე <b className="text-[#4a3426] tabular-nums">{weekDays}</b> დღე</p>
      )}
      <DrillSheet drillId={open} startTab="exercise" onClose={() => setOpen(null)} />
    </div>
  );
};

// „სავარჯიშოები“: the four groups beside the tips, each folding open its drills; a tap opens the drill's lesson.
export const DrillGroups: React.FC = () => {
  const { doneToday } = useManeraPractice();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [sheet, setSheet] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {DRILL_GROUPS.map(g => {
        const Icon = ICONS[g.id] ?? Music2;
        const open = openGroup === g.id;
        const doneN = g.drills.filter(d => doneToday(d.id)).length;
        return (
          <div key={g.id} className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] overflow-hidden">
            <button
              type="button"
              onClick={() => { triggerHaptic(8); setOpenGroup(open ? null : g.id); }}
              aria-expanded={open}
              className="w-full min-h-14 flex items-center gap-3 px-3.5 py-3 text-left cursor-pointer hover:bg-[#fbf6ec]/70 transition-colors"
            >
              <span className="w-10 h-10 shrink-0 rounded-xl bg-[#7a2028]/[0.08] text-[#7a2028] flex items-center justify-center"><Icon className="w-5 h-5" /></span>
              <span className="flex-1 min-w-0">
                <span className={`block text-[15px] font-bold leading-snug ${open ? 'text-[#7a2028]' : 'text-[#4a3426]'}`}>{g.title}</span>
                <span className="block text-[12px] leading-snug text-[#8a7a6a]">{g.sub}</span>
              </span>
              {doneN > 0 && <span className="shrink-0 text-[12px] font-bold text-emerald-700 tabular-nums">✓ {doneN}/{g.drills.length}</span>}
              <ChevronDown className={`w-4 h-4 shrink-0 text-[#b3a594] transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
              <ul className="border-t border-[#f1e8d9] divide-y divide-[#f1e8d9] sg-in">
                {g.drills.map(d => {
                  const did = doneToday(d.id);
                  return (
                    <li key={d.id}>
                      <button
                        type="button"
                        onClick={() => setSheet(d.id)}
                        className="w-full min-h-12 flex items-center gap-3 px-3.5 py-2.5 text-left cursor-pointer hover:bg-[#fbf6ec]/70 transition-colors"
                      >
                        <span className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center ${did ? 'bg-emerald-600 text-white' : 'ring-1 ring-[#d9c8ac]'}`}>
                          {did && <Check className="w-3 h-3" aria-label="დღეს შესრულებულია" />}
                        </span>
                        <span className="flex-1 min-w-0 text-[14px] font-semibold leading-snug text-[#2a2017]">{d.title}</span>
                        <span className="shrink-0 text-[12px] font-semibold text-[#8a7a6a] tabular-nums">{d.exercise.minutes} წთ</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
      <DrillSheet drillId={sheet} onClose={() => setSheet(null)} />
    </div>
  );
};
