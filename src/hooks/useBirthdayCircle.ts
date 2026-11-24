import { useMemo } from 'react';
import { useAuth } from '../context';
import { useMyAllClasses } from './useShellCounts';

/** Whose birthdays one sees (2026-11-24, the user: „მოსწავლეები … მხოლოდ საკუთარი კლასელების სიას უნდა ხედავდნენ … ვინც კლასს
 *  გარეთაა, იმას არაფერი არ უჩანს“): admins everyone (null), anyone else the people of their own classes (an empty set
 *  outside every class). */
export const useBirthdayCircle = (): Set<string> | null => {
  const { user, isAdmin } = useAuth();
  const classes = useMyAllClasses();
  return useMemo(() => {
    if (isAdmin) return null;
    const s = new Set<string>();
    for (const c of classes) {
      if (c.archived) continue;
      c.memberIds.forEach(u => s.add(u));
      c.teacherIds.forEach(u => s.add(u));
    }
    if (s.size && user) s.add(user.uid);
    return s;
  }, [isAdmin, classes, user]);
};
