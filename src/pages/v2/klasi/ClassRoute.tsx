import React from 'react';
import { useAuth, useNavigation } from '../../../context';
import { useAllClasses, useMyClasses, useTeachingClasses } from '../../../hooks/useClasses';
import { AI_NOTE, AI_PREP, AI_REPORT, CLASS_ORDER } from './nav';
import { useAccess } from '../../../hooks/useAccess';
import { ReportScreen } from '../aiklasi/ReportScreen';
import { InstructionScreen } from '../aiklasi/InstructionScreen';
import { PrepScreen } from '../aiklasi/prep/PrepScreen';
import { ClassScreen } from './ClassScreen';
import { ProgramOrderScreen } from './teacher/ProgramOrder';

// Page `class` in the new look (stage 4c): the class page, or — the class's teachers and admins only, anyone else gets the
// class page — its program's order (`order`), the week's summary (`ai-report`, x-idea-kvira — the AI teacher's lines in it only
// while it is on), the instruction to the AI (`ai-note`) and a lesson the AI prepared from a chant (`ai-prep/<variantId>`; these
// two only while the AI teacher is on).
export const ClassRoute: React.FC = () => {
  const { mapItem, selectedClassId } = useNavigation();
  const { user, isAdmin, isTeacher } = useAuth();
  const mine = useMyClasses(user?.uid);
  const aiOn = useAccess().on('aiTeacher');
  const { classes: teaching } = useTeachingClasses(isTeacher ? user?.uid : null);
  const { classes: all } = useAllClasses(isAdmin);
  if (mapItem === CLASS_ORDER) {
    const cls = [...teaching, ...all].find(c => c.id === selectedClassId);
    if (cls && (isAdmin || cls.teacherIds?.includes(user?.uid ?? ''))) return <ProgramOrderScreen cls={cls} />;
  }
  // the week's summary is every teacher's, with or without the AI teacher (its AI lines show only while it is on)
  if (mapItem === AI_REPORT || (mapItem === AI_NOTE && aiOn)) {
    const cls = [...teaching, ...all].find(c => c.id === selectedClassId);
    if (cls && (isAdmin || cls.teacherIds?.includes(user?.uid ?? ''))) return mapItem === AI_REPORT ? <ReportScreen cls={cls} /> : <InstructionScreen cls={cls} />;
  }
  if (mapItem?.startsWith(AI_PREP) && aiOn) {
    const cls = [...teaching, ...all].find(c => c.id === selectedClassId);
    const variantId = mapItem.slice(AI_PREP.length);
    if (cls && variantId && (isAdmin || cls.teacherIds?.includes(user?.uid ?? ''))) return <PrepScreen cls={cls} variantId={variantId} />;
  }
  return <ClassScreen />;
};

export default ClassRoute;
