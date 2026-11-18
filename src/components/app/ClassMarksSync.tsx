import { useClassMarksSync } from '../../hooks/useClassMarks';

// The member's marks on their classes' programs (hooks/useClassMarks) as a part of its own, so App loads it — and the chant
// catalogue it needs — a moment after the first screen (redesign stage 3 „სიჩქარე“).
export const ClassMarksSync = () => {
  useClassMarksSync();
  return null;
};
