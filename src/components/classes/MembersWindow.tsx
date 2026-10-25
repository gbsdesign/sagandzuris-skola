import React, { useMemo } from 'react';
import { useAuth } from '../../context';
import { SchoolClass, useManagedClasses } from '../../hooks/useClasses';
import { useDirectory, shownName } from '../../utils/directory';
import { ClassesAdmin } from '../admin/ClassesAdmin';

/** The class's members window (add from the people list, take out), opened by ✎ on the class page's members card.
 *  It used to live in the teacher panel, which was removed in 2026-10 (the class page is the teacher's workplace). */
export const ClassSettings: React.FC<{
  cls: SchoolClass;
  classes: SchoolClass[];
  onMessage: (text: string, type: 'success' | 'error') => void;
  onClose: () => void;
}> = ({ cls, classes, onMessage, onClose }) => {
  const { isTeacher } = useAuth();
  const { people, loading } = useDirectory(isTeacher);
  const students = useMemo(() => people.map(p => ({ userId: p.uid, name: shownName(p), photoURL: p.photoURL })), [people]);
  return <ClassesAdmin mode="teacher" classes={classes} loading={loading} students={students} onMessage={onMessage} openId={cls.id} onClose={onClose} key={cls.id} />;
};

export const MembersWindow: React.FC<{ cls: SchoolClass; onMessage: (text: string, type: 'success' | 'error') => void; onClose: () => void }> = ({ cls, onMessage, onClose }) => {
  const { classes } = useManagedClasses();
  return <ClassSettings cls={cls} classes={classes.some(c => c.id === cls.id) ? classes : [cls, ...classes]} onMessage={onMessage} onClose={onClose} />;
};
