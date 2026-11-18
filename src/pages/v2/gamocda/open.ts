import { useEffect, useState } from 'react';
import type { Voice } from '../../../utils/pathItems';

// Opening the AI teacher's exam from anywhere (the learning mode's „გამოცდა“, a pearl's sheet on „საგანძური“): it lies over the
// whole app with a history step of its own (`sgExam`), so the phone's „back“ closes it — the same way as the AI lesson
// (components/aiLesson/open.ts). Kept tiny: the exam itself loads only when opened.

export interface ExamRequest {
  variantId: string;
  voice: Voice;
  /** opened from inside the learning mode of that chant: „ჯერ კიდევ ვივარჯიშებ“ only closes */
  fromLearning: boolean;
}

const EVENT = 'sg-exam';
let wanted: ExamRequest | null = null;

export const openExam = (variantId: string, voice: Voice, fromLearning = false) => {
  wanted = { variantId, voice, fromLearning };
  window.dispatchEvent(new Event(EVENT));
};

/** App's side: the open exam (or null) and how to close it. */
export const useExamOpen = () => {
  const [req, setReq] = useState<ExamRequest | null>(null);
  useEffect(() => {
    const show = () => {
      if (!wanted) return;
      const r = wanted;
      wanted = null;
      try { window.history.pushState({ ...(window.history.state || {}), sgExam: 1 }, ''); } catch { /* opens anyway */ }
      setReq(r);
    };
    const onPop = (e: PopStateEvent) => { if (!e.state?.sgExam) setReq(null); };
    show();
    window.addEventListener(EVENT, show);
    window.addEventListener('popstate', onPop);
    return () => { window.removeEventListener(EVENT, show); window.removeEventListener('popstate', onPop); };
  }, []);
  const close = () => { if (window.history.state?.sgExam) window.history.back(); else setReq(null); };
  return { exam: req, close };
};
