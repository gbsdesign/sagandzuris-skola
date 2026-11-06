import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useAuth, useNavigation } from '../../context';
import { useMyClasses } from '../../hooks/useClasses';
import type { LessonSlot, SchoolClass } from '../../hooks/useClasses';
import { ClassLogo } from '../classes/ClassLogo';
import { WEEKDAYS_GE } from '../../utils/dateNames';
import { triggerHaptic } from '../../utils/haptics';

// „ჩემი კლასი“ on the profile (2026-11-06, the user's pick): a row a class I am in — its logo, name, the teacher and the
// next lesson from the timetable — a tap opens the class page. Nothing shows while I am in no class.

/** The soonest lesson of the timetable from now: „დღეს 18:00“, „ხვალ 18:00“, „ოთხშაბათს 18:00“. */
export const nextLessonLine = (schedule: LessonSlot[], now = new Date()): string | null => {
  if (!schedule.length) return null;
  const day = now.getDay();
  const minutes = now.getHours() * 60 + now.getMinutes();
  let best: { inDays: number; slot: LessonSlot } | null = null;
  for (const s of schedule) {
    const [h, m] = s.start.split(':').map(Number);
    let inDays = (s.day - day + 7) % 7;
    // today's lesson already over (the end, or the start + 90 min) → the one next week
    const end = s.end ? s.end.split(':').map(Number) : [h + 1, m + 30];
    if (inDays === 0 && end[0] * 60 + end[1] <= minutes) inDays = 7;
    if (!best || inDays < best.inDays || (inDays === best.inDays && s.start < best.slot.start)) best = { inDays, slot: s };
  }
  if (!best) return null;
  // the weekday in the dative: ორშაბათი → ორშაბათს, კვირა → კვირას
  const when = best.inDays === 0 ? 'დღეს' : best.inDays === 1 ? 'ხვალ' : `${WEEKDAYS_GE[best.slot.day].replace(/ი$/, '')}ს`;
  return `${when} ${best.slot.start}`;
};

export const MyClassRow: React.FC<{ cls: SchoolClass; me: string }> = ({ cls, me }) => {
  const { openClass } = useNavigation();
  const teachers = cls.teachers.filter(t => t.uid !== me).map(t => t.name).filter(Boolean);
  const next = nextLessonLine(cls.schedule);
  const teaching = cls.teacherIds.includes(me);
  const sub = [
    teaching ? `${cls.members.length} წევრი` : teachers.length ? teachers.join(', ') : null,
    next ? `შემდეგი გაკვეთილი ${next}` : 'ცხრილი ჯერ არ არის',
  ].filter(Boolean).join(' · ');
  return (
    <button type="button" onClick={() => { triggerHaptic(10); openClass(cls.id); }}
      className="w-full rounded-2xl bg-white ring-1 ring-[#2a2017]/[0.07] shadow-[0_1px_2px_rgba(42,32,23,0.05),0_10px_28px_-18px_rgba(42,32,23,0.35)] px-4 py-3 flex items-center gap-3.5 text-left cursor-pointer transition hover:ring-[#7a2028]/25 active:scale-[0.99]">
      <ClassLogo name={cls.name} logo={cls.logo} className="w-11 h-11 text-sm shrink-0 rounded-2xl" />
      <span className="min-w-0 flex-1">
        <span className="block font-serif-ge text-[15px] font-bold text-[#4a3426] truncate">{cls.name}</span>
        <span className="block text-[13px] text-[#8a7a6a] leading-snug">{sub}</span>
      </span>
      <ChevronRight className="w-5 h-5 shrink-0 text-[#a08a76]" />
    </button>
  );
};

export const MyClassCard: React.FC = () => {
  const { user } = useAuth();
  const classes = useMyClasses(user?.uid);
  if (!user || !classes.length) return null;
  return <>{classes.map(c => <MyClassRow key={c.id} cls={c} me={user.uid} />)}</>;
};
