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

// „ჩემი ხმა“ (the AI teacher's diary, range and notebook) opens the same way, one layer higher, from the lesson's start
// screen, from ოსტატობა and from the path.
const VOICE_EVENT = 'sg-my-voice';
export type MyVoiceTab = 'diary' | 'range' | 'notebook';
let voiceWanted: MyVoiceTab | null = null;

export const openMyVoice = (tab: MyVoiceTab = 'diary') => { voiceWanted = tab; window.dispatchEvent(new Event(VOICE_EVENT)); };

export const useMyVoiceOpen = () => {
  const [tab, setTab] = useState<MyVoiceTab | null>(null);
  useEffect(() => {
    const show = () => {
      if (!voiceWanted) return;
      const t = voiceWanted;
      voiceWanted = null;
      try { window.history.pushState({ ...(window.history.state || {}), sgMyVoice: 1 }, ''); } catch { /* opens anyway */ }
      setTab(t);
    };
    const onPop = (e: PopStateEvent) => { if (!e.state?.sgMyVoice) setTab(null); };
    show();
    window.addEventListener(VOICE_EVENT, show);
    window.addEventListener('popstate', onPop);
    return () => { window.removeEventListener(VOICE_EVENT, show); window.removeEventListener('popstate', onPop); };
  }, []);
  const close = () => { if (window.history.state?.sgMyVoice) window.history.back(); else setTab(null); };
  return { tab, close };
};
