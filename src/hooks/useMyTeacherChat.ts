import { useMemo } from 'react';
import { useAuth } from '../context';
import { useMyClasses } from './useClasses';
import { dmId, openThread, type Person } from './useDirectChat';
import { kaName } from '../utils/georgianName';

// A student's „წერილები“ goes straight to their teacher's chat (2026-11-21, the user: „მოსწავლეს უჩანდეს მასწავლებელი ანუ
// მასწის ჩათი იხსნებოდეს პირდაპირ“; answer „ერთი მასწავლებელი — პირდაპირ, რამდენიმე — სია, მასწავლებლები თავში“).
// Only a plain member (not a teacher, not an admin) whose classes have exactly one teacher between them.

export interface TeacherChat {
  /** the chat's id (it may not exist yet — `open` makes it) */
  id: string;
  teacher: Person;
  open: () => Promise<string>;
}

export const useMyTeacherChat = (): TeacherChat | null => {
  const { user, isTeacher, isAdmin } = useAuth();
  const plain = !!user && !isTeacher && !isAdmin;
  const classes = useMyClasses(plain ? user?.uid : null);
  return useMemo(() => {
    if (!plain || !user) return null;
    const teachers = new Map<string, { teacher: Person; classId: string }>();
    for (const c of classes) {
      for (const t of c.teachers) {
        if (t.uid && t.uid !== user.uid && !teachers.has(t.uid)) {
          teachers.set(t.uid, { teacher: { uid: t.uid, name: t.name || '', photoURL: t.photoURL || '' }, classId: c.id });
        }
      }
    }
    if (teachers.size !== 1) return null;
    const [{ teacher, classId }] = [...teachers.values()];
    const cls = classes.find(c => c.id === classId);
    const m = cls?.members.find(x => x.uid === user.uid);
    const me: Person = { uid: user.uid, name: m?.name || kaName(user.displayName) || '', photoURL: m?.photoURL || user.photoURL || '' };
    return { id: dmId(teacher.uid, user.uid), teacher, open: () => openThread(teacher, me, classId) };
  }, [plain, user, classes]);
};
