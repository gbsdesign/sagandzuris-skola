import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../context';
import { useAccess } from '../../../hooks/useAccess';

// Opening „ავტომატური პროგრამა“ (the school's assistant, „AI დამხმარე“ until plan 2.0) from anywhere (the class page's ✦, the admin panel): it lies over the whole app with a history
// step of its own (`sgAssistant`), so the phone's „back“ closes it — as the AI exam does (gamocda/open.ts). Kept tiny: the
// panel itself loads only when opened.

export interface AssistantRequest {
  /** the class page it was opened from: the AI is told which class is open */
  classId?: string;
  /** the page it was opened on (a PageType): the program is told where the person is — the floating cog gives it */
  page?: string;
  /** a small window over the page (the superadmins' floating cog) instead of the whole screen */
  mini?: boolean;
}

const EVENT = 'sg-assistant';
let wanted: AssistantRequest | null = null;

export const openAssistant = (req: AssistantRequest = {}) => {
  wanted = req;
  window.dispatchEvent(new Event(EVENT));
};

/** Who may use it: teachers and admins, while the school's „AI მასწავლებელი“ switch is open for them. */
export const useAssistantAllowed = () => {
  const { user, isTeacher } = useAuth();
  const { on } = useAccess();
  return !!user && isTeacher && on('aiTeacher');
};

/** App's side: the open panel (or null) and how to close it. */
export const useAssistantOpen = () => {
  const [req, setReq] = useState<AssistantRequest | null>(null);
  // what to do once the panel's history step is gone (open a class it made)
  const after = useRef<(() => void) | null>(null);
  useEffect(() => {
    const show = () => {
      if (!wanted) return;
      const r = wanted;
      wanted = null;
      try { window.history.pushState({ ...(window.history.state || {}), sgAssistant: 1 }, ''); } catch { /* opens anyway */ }
      setReq(r);
    };
    const onPop = (e: PopStateEvent) => {
      if (e.state?.sgAssistant) return;
      setReq(null);
      const then = after.current;
      after.current = null;
      then?.();
    };
    show();
    window.addEventListener(EVENT, show);
    window.addEventListener('popstate', onPop);
    return () => { window.removeEventListener(EVENT, show); window.removeEventListener('popstate', onPop); };
  }, []);
  const close = (then?: () => void) => {
    if (window.history.state?.sgAssistant) { after.current = then ?? null; window.history.back(); }
    else { setReq(null); then?.(); }
  };
  return { assistant: req, close };
};
