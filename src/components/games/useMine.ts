import { useMemo } from 'react';
import { useAuth } from '../../context';
import { useMyClasses, useTeachingClasses } from '../../hooks/useClasses';

/** my classes (as a member or their teacher), by name, and the chants of their programs (version ids, once each) */
export const useMine = () => {
  const { user } = useAuth();
  const uid = user?.uid || '';
  const member = useMyClasses(uid);
  const { classes: teaching } = useTeachingClasses(uid || null);
  const classes = useMemo(
    () => [...member, ...teaching.filter(t => !member.some(m => m.id === t.id))].sort((a, b) => a.name.localeCompare(b.name, 'ka')),
    [member, teaching],
  );
  const program = useMemo(() => [...new Set(classes.flatMap(c => c.program.map(p => p.id ?? '').filter(Boolean)))], [classes]);
  return { classes, program };
};
