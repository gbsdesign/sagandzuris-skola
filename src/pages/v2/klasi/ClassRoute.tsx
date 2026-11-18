import React from 'react';
import { useAuth, useNavigation } from '../../../context';
import { useAllClasses, useMyClasses, useTeachingClasses } from '../../../hooks/useClasses';
import { CLASS_ORDER } from './nav';
import { ClassScreen } from './ClassScreen';
import { ProgramOrderScreen } from './teacher/ProgramOrder';

// Page `class` in the new look (stage 4c): the class page, or its program's order (mapItem `order`, the class's teachers and
// admins only — anyone else gets the class page).
export const ClassRoute: React.FC = () => {
  const { mapItem, selectedClassId } = useNavigation();
  const { user, isAdmin, isTeacher } = useAuth();
  const mine = useMyClasses(user?.uid);
  const { classes: teaching } = useTeachingClasses(isTeacher ? user?.uid : null);
  const { classes: all } = useAllClasses(isAdmin);
  if (mapItem === CLASS_ORDER) {
    const cls = [...teaching, ...all].find(c => c.id === selectedClassId);
    if (cls && (isAdmin || cls.teacherIds?.includes(user?.uid ?? ''))) return <ProgramOrderScreen cls={cls} />;
  }
  return <ClassScreen />;
};

export default ClassRoute;
