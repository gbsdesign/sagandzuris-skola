import React from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context';
import { useMyClasses, useTeachingClasses, type SchoolClass } from '../../hooks/useClasses';
import { Sheet } from '../ui/kit';
import { ClassLogo } from './ClassLogo';

/** My classes — the ones I am in and, for a teacher, the ones I lead — once each (the header's old list, 2026-11-09). */
export const useAllMyClasses = (): SchoolClass[] => {
  const { user, isTeacher } = useAuth();
  const memberOf = useMyClasses(user?.uid);
  const { classes: teaching } = useTeachingClasses(isTeacher ? user?.uid : null);
  return [...memberOf, ...teaching.filter(t => !memberOf.some(m => m.id === t.id))];
};

/** The window of my classes (2026-11-09, the user: the path's „კლასი“ button and a tap on the class page's name — „ამოუხტეს
 *  ფანჯარა სადაც კლასების სიაა და გადართავს“): a row a class, the open one marked; a tap opens it. */
export const ClassPickerSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  classes: SchoolClass[];
  current?: string | null;
  onPick: (id: string) => void;
}> = ({ open, onClose, classes, current, onPick }) => (
  <Sheet open={open} onClose={onClose} title={`ჩემი კლასები · ${classes.length}`}>
    <ul className="space-y-2">
      {classes.map(c => {
        const here = c.id === current;
        return (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onPick(c.id)}
              aria-current={here ? 'page' : undefined}
              className={`w-full min-h-14 flex items-center gap-3 pl-2.5 pr-3 py-2 rounded-2xl text-left ring-1 transition-colors cursor-pointer active:scale-[0.99] ${
                here ? 'bg-[#7a2028]/[0.06] ring-[#7a2028]/30' : 'bg-white ring-[#e8dcc8] hover:ring-[#7a2028]/40'
              }`}
            >
              <ClassLogo name={c.name} logo={c.logo} className="w-10 h-10 shrink-0 text-sm" />
              <span className={`min-w-0 flex-1 text-[15px] font-bold leading-snug line-clamp-2 ${here ? 'text-[#7a2028]' : 'text-[#4a3426]'}`}>{c.name}</span>
              {here
                ? <Check className="w-5 h-5 shrink-0 text-[#7a2028]" strokeWidth={3} />
                : <ChevronRight className="w-5 h-5 shrink-0 text-[#b3a594]" />}
            </button>
          </li>
        );
      })}
    </ul>
  </Sheet>
);
