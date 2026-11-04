import React from 'react';
import { CalendarClock, ChevronRight, ClipboardList, GraduationCap, RotateCcw } from 'lucide-react';
import { useAuth, useNavigation } from '../../context';
import { useMyClasses } from '../../hooks/useClasses';
import { daysUntil, dueUntil, useMyAssignments } from '../../hooks/useTeaching';
import { useConfirmations } from '../../hooks/useConfirmations';
import { triggerHaptic } from '../../utils/haptics';
import { assignedProgress, reviewsDue } from '../../utils/learn';
import { georgiaToday } from '../../utils/psalter';
import type { Voice } from '../../utils/pathItems';
import { MONTHS_GE, WEEKDAYS_GE } from '../../utils/dateNames';
import { nextLesson } from '../teacher/Schedule';
import { currentWork, workDone } from '../teacher/MyClassWork';
import { useAllLearning } from '../../hooks/useLearning';
import { openPathPanel } from './IndependentWorkCard';
import { PATH_CARD } from './pathStyle';
import { assignmentLines } from '../../utils/assignmentLines';
import { PartsBar } from '../learn/PartsBar';
import { pieceName } from '../learn/LearnReview';
import { learnPieceOf, useOpenLearning } from '../learn/openLearning';
import { Btn } from '../ui/kit';

// a lesson's day: only today and tomorrow get a word of their own (the date says the rest)
const soonWord = (n: number) => (n === 0 ? 'დღეს' : n === 1 ? 'ხვალ' : '');

/** One tappable line of the card: an icon, what it is (big) with when or how much under it (grey), and a badge at the
 *  right (or `tail`: a button of its own beside the line, with no „›“). The same order as an assignment's card. */
const Line: React.FC<{ icon: React.ReactNode; title: string; sub: string; subTone?: string; badge?: React.ReactNode; tail?: React.ReactNode; onClick: () => void }> = ({
  icon, title, sub, subTone = 'text-[#8a7a6a]', badge, tail, onClick,
}) => (
  <div className="flex items-center gap-2">
    <button
      type="button"
      onClick={() => { triggerHaptic(8); onClick(); }}
      className="group flex-1 min-w-0 min-h-14 flex items-center gap-3 px-1 py-2 text-left rounded-xl cursor-pointer transition-colors hover:bg-[#fbf6ec]"
    >
      <span className="w-9 h-9 shrink-0 rounded-full bg-[#7a2028]/[0.07] text-[#7a2028] flex items-center justify-center">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block truncate text-[15px] font-bold leading-snug text-[#2a2017]">{title}</span>
        <span className={`block mt-0.5 truncate text-[12.5px] font-semibold leading-tight ${subTone}`}>{sub}</span>
      </span>
      {badge}
      {!tail && <ChevronRight className="w-4 h-4 shrink-0 text-[#c4b49c] group-hover:text-[#7a2028]" />}
    </button>
    {tail}
  </div>
);

const BADGE = 'shrink-0 h-7 px-2.5 rounded-full text-[12px] font-bold tabular-nums whitespace-nowrap inline-flex items-center';

// "დღეს", at the top of "საგანძურის გზა" (2026-10-27; „ჩემი დღე“ since 2026-10-28): what the member has to do now, in
// up to three lines — the next lesson (opens the class), the nearest assignment still to do (opens "ნასწავლი"; a piece
// with a learning mode gets „სწავლა“ and the bar of its parts) and what the learning mode asks to review today (opens the
// first piece). The habits are no line here any more: their own card is right below. Nothing to show — no card.
export const PathToday: React.FC = () => {
  const { user } = useAuth();
  const { openClass } = useNavigation();
  const classes = useMyClasses(user?.uid);
  const assignments = useMyAssignments(classes.map(c => c.id), user?.uid);
  const confirmed = useConfirmations(user?.uid);
  const myLearning = useAllLearning(user?.uid);
  const openLearning = useOpenLearning();
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
    .filter(a => daysUntil(a.due) >= 0 && !workDone(a, confirmed, undefined, myLearning))
    .sort((a, b) => a.due.localeCompare(b.due));
  const next = work[0];

  const due = reviewsDue(myLearning?.learning, georgiaToday());
  if (!lesson && !next && !due.length) return null;

  const now = new Date();
  const dueParts = due.reduce((n, d) => n + d.parts.length, 0);
  const learnt = next?.variantId ? assignedProgress(next.variantId, myLearning?.learning, myLearning?.parts) : null;
  const piece = next?.variantId ? learnt?.piece ?? learnPieceOf(next.variantId) : null;

  return (
    <section className={`${PATH_CARD} !py-2.5`} aria-label="დღეს">
      <h2 className="px-1 pt-1 flex items-baseline gap-2">
        <span className="font-serif-ge text-[17px] font-bold text-[#4a3426]">დღეს</span>
        <span className="text-[13px] font-semibold text-[#8a7a6a]">{WEEKDAYS_GE[now.getDay()]}, {now.getDate()} {MONTHS_GE[now.getMonth()]}</span>
      </h2>
      <ul className="divide-y divide-[#f1e8d9]">
        {lesson && (() => {
          const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + lesson.inDays);
          const word = soonWord(lesson.inDays);
          const time = `${lesson.slot.start}${lesson.slot.end ? `–${lesson.slot.end}` : ''}`;
          return (
            <li><Line
              icon={<CalendarClock className="w-[18px] h-[18px]" />}
              title={`${WEEKDAYS_GE[lesson.slot.day]}, ${day.getDate()} ${MONTHS_GE[day.getMonth()]}`}
              sub={['გაკვეთილი', time, lesson.slot.note, classes.length > 1 && lesson.cls.name].filter(Boolean).join(' · ')}
              badge={word ? <span className={`${BADGE} ${lesson.inDays === 0 ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-[#7a2028]/[0.07] text-[#7a2028]'}`}>{word}</span> : undefined}
              onClick={() => openClass(lesson.cls.id)}
            /></li>
          );
        })()}
        {next && (() => {
          const soon = daysUntil(next.due) <= 1;
          const more = work.length > 1 ? ` · კიდევ ${work.length - 1}` : '';
          return (
            <li>
              <Line
                icon={<ClipboardList className="w-[18px] h-[18px]" />}
                title={assignmentLines(next.variantId, next.title).name}
                sub={`დავალება · ${dueUntil(next.due)}${more}`}
                subTone={soon ? 'text-amber-700' : undefined}
                tail={piece ? <Btn size="sm" icon={<GraduationCap />} onClick={() => openLearning(piece, next.voices[0] as Voice | undefined)}>სწავლა</Btn> : undefined}
                onClick={() => openPathPanel('learn')}
              />
              {/* how far the learning mode got: one cell per part, under the title */}
              {piece && learnt && (
                <div className="pl-[52px] pr-1 pb-2.5 -mt-1 flex items-center gap-2.5">
                  <PartsBar p={learnt} className="min-w-0 flex-1" />
                  <span className="shrink-0 text-[12px] font-bold tabular-nums text-[#8a7a6a]">{learnt.learned}/{learnt.total} ნაწილი</span>
                </div>
              )}
            </li>
          );
        })()}
        {due.length > 0 && (
          <li>
            <Line
              icon={<RotateCcw className="w-[18px] h-[18px]" />}
              title={due.length > 1 ? `${pieceName(due[0].piece)} და კიდევ ${due.length - 1}` : pieceName(due[0].piece)}
              sub={`დღეს გასამეორებელი · ${dueParts} ნაწილი`}
              onClick={() => openLearning(due[0].piece)}
            />
          </li>
        )}
      </ul>
    </section>
  );
};
