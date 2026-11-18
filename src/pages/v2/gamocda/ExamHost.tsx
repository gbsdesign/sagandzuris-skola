import React from 'react';
import { ExamScreen } from './ExamScreen';
import type { ExamRequest } from './open';

/** Mounted in App next to the AI lesson: `{exam && <Suspense><ExamHost exam={exam} onClose={close} /></Suspense>}`. */
export const ExamHost: React.FC<{ exam: ExamRequest; onClose: () => void }> = ({ exam, onClose }) => (
  <ExamScreen variantId={exam.variantId} voice={exam.voice} fromLearning={exam.fromLearning} onClose={onClose} />
);
