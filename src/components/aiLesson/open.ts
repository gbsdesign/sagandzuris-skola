import { useEffect, useState } from 'react';

// Opening the AI lesson from anywhere (the path's strip, ოსტატობა's card): it lies over the whole app with a history
// step of its own, so the phone's „back“ closes it. Kept tiny — the lesson itself loads only when opened.

const EVENT = 'sg-ai-lesson';
let wanted = false;

export const openAiLesson = () => { wanted = true; window.dispatchEvent(new Event(EVENT)); };

/** App's side: whether the lesson is open, and how to close it. */
export const useAiLessonOpen = () => {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = () => {
      if (!wanted) return;
      wanted = false;
      try { window.history.pushState({ ...(window.history.state || {}), sgAiLesson: 1 }, ''); } catch { /* opens anyway */ }
      setOpen(true);
    };
    const onPop = (e: PopStateEvent) => { if (!e.state?.sgAiLesson) setOpen(false); };
    show();
    window.addEventListener(EVENT, show);
    window.addEventListener('popstate', onPop);
    return () => { window.removeEventListener(EVENT, show); window.removeEventListener('popstate', onPop); };
  }, []);
  const close = () => { if (window.history.state?.sgAiLesson) window.history.back(); else setOpen(false); };
  return { open, close };
};
