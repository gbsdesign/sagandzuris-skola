import React from 'react';
import { CalendarClock, ChevronRight, ClipboardList, Sparkles } from 'lucide-react';
import { useAuth, useChants, useNavigation } from '../../context';
import { useMyClasses } from '../../hooks/useClasses';
import { daysUntil, useMyAssignments } from '../../hooks/useTeaching';
import { useConfirmations } from '../../hooks/useConfirmations';
import { useMyHabits } from '../../hooks/useMyHabits';
import { dueDailyOf } from '../habits/useHabits';
import { dayState } from '../../utils/habitStats';
import { triggerHaptic } from '../../utils/haptics';
import { MONTHS_GE, WEEKDAYS_GE } from '../../utils/dateNames';
import { nextLesson } from '../teacher/Schedule';
import { currentWork, workDone } from '../teacher/MyClassWork';
import { openPathPanel } from './IndependentWorkCard';
import { PATH_CARD, PATH_LABEL } from './pathStyle';
import { findVersion } from '../../data/chantLookup';

const DAY_SHORT = ['კვ', 'ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ'];
const whenWord = (n: number) => (n === 0 ? 'დღეს' : n === 1 ? 'ხვალ' : `${n} დღეში`);
// the name alone, so one line holds it: a chant's own title (not „გ.ხ. I ტომი · …“), else the title without its
// closing book reference "… (145 ხუნდაძე, გვ. 205)"
const shortTitle = (t: string, variantId?: string) =>
  (variantId && findVersion(variantId)?.chant.title) || t.replace(/\s*\([^()]+\)\s*$/, '');

/** One tappable line of the card: an icon, what it is, and a badge at the right. */
const Line: React.FC<{ icon: React.ReactNode; title: string; sub: string; badge?: React.ReactNode; onClick: () => void }> = ({ icon, title, sub, badge, onClick }) => (
  <li>
    <button
      type="button"
      onClick={() => { triggerHaptic(8); onClick(); }}
      className="group w-full min-h-14 flex items-center gap-3 px-1 py-2 text-left rounded-xl cursor-pointer transition-colors hover:bg-[#fbf6ec]"
    >
      <span className="w-9 h-9 shrink-0 rounded-full bg-[#7a2028]/[0.07] text-[#7a2028] flex items-center justify-center">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-[12px] font-semibold leading-tight text-[#8a7a6a]">{sub}</span>
        <span className="block mt-0.5 truncate text-[14.5px] font-semibold leading-snug text-[#2a2017]">{title}</span>
      </span>
      {badge}
      <ChevronRight className="w-4 h-4 shrink-0 text-[#c4b49c] group-hover:text-[#7a2028]" />
    </button>
  </li>
);

const BADGE = 'shrink-0 h-7 px-2.5 rounded-full text-[12px] font-bold tabular-nums whitespace-nowrap inline-flex items-center';

// "დღეს", at the top of "საგანძურის გზა" (2026-10-27): what the member has to do now, in up to three lines — the next
// lesson (opens the class), the nearest assignment still to do (opens "ნასწავლი") and today's daily habits (scrolls to
// them). Shown only when there is a lesson or an assignment: the habits alone have their own card right below.
export const PathToday: React.FC = () => {
  const { user } = useAuth();
  const { openClass } = useNavigation();
  const { habitLog } = useChants();
  const classes = useMyClasses(user?.uid);
  const assignments = useMyAssignments(classes.map(c => c.id), user?.uid);
  const confirmed = useConfirmations(user?.uid);
  const habits = useMyHabits(user?.uid);
  if (!user) return null;

  // the nearest lesson of all one's classes
  const lesson = classes
    .flatMap(c => {
      const n = nextLesson(c.schedule);
      return n ? [{ ...n, cls: c }] : [];
    })
    .sort((a, b) => a.inDays - b.inDays || a.slot.start.localeCompare(b.slot.start))[0];

  // the nearest assignment not yet confirmed and not past its deadline
  const work = currentWork(assignments)
    .filter(a => daysUntil(a.due) >= 0 && !workDone(a, confirmed))
    .sort((a, b) => a.due.localeCompare(b.due));
  const next = work[0];

  if (!lesson && !next) return null;

  const now = new Date();
  const day = dayState(habitLog, dueDailyOf(habits.groups), now);

  return (
    <section className={`${PATH_CARD} !py-2.5`} aria-label="დღეს">
      <p className={`px-1 pt-1 pb-0.5 ${PATH_LABEL}`}>
        დღეს · {WEEKDAYS_GE[now.getDay()]}, {now.getDate()} {MONTHS_GE[now.getMonth()]}
      </p>
      <ul className="divide-y divide-[#f1e8d9]">
        {lesson && (
          <Line
            icon={<CalendarClock className="w-[18px] h-[18px]" />}
            sub={classes.length > 1 ? `შემდეგი გაკვეთილი · ${lesson.cls.name}` : 'შემდეგი გაკვეთილი'}
            title={`${DAY_SHORT[lesson.slot.day]} ${lesson.slot.start}${lesson.slot.end ? `–${lesson.slot.end}` : ''}${lesson.slot.note ? ` · ${lesson.slot.note}` : ''}`}
            badge={<span className={`${BADGE} ${lesson.inDays === 0 ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-[#7a2028]/[0.07] text-[#7a2028]'}`}>{whenWord(lesson.inDays)}</span>}
            onClick={() => openClass(lesson.cls.id)}
          />
        )}
        {next && (
          <Line
            icon={<ClipboardList className="w-[18px] h-[18px]" />}
            sub={work.length > 1 ? `დავალება · კიდევ ${work.length - 1}` : 'დავალება'}
            title={shortTitle(next.title, next.variantId)}
            badge={(() => {
              const n = daysUntil(next.due);
              return <span className={`${BADGE} ${n <= 1 ? 'bg-amber-500 text-white' : 'bg-[#7a2028]/[0.07] text-[#7a2028]'}`}>{whenWord(n)}</span>;
            })()}
            onClick={() => openPathPanel('learn')}
          />
        )}
        {day.total > 0 && (
          <Line
            icon={<Sparkles className="w-[18px] h-[18px]" />}
            sub="ჩვევები"
            title={day.done >= day.total ? 'დღეს ყველა შესრულდა 🙏' : `დარჩა ${day.total - day.done}`}
            badge={<span className={`${BADGE} ${day.counted ? 'bg-emerald-600 text-white' : 'bg-[#7a2028]/[0.07] text-[#7a2028]'}`}>{day.done}/{day.total}</span>}
            onClick={() => document.getElementById('path-habits')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          />
        )}
      </ul>
    </section>
  );
};
