import React, { useState } from 'react';
import { useOpenLearning } from '../learn/openLearning';
import { saveAiNote, useAiNote } from './useAiNote';
import { MyVoice } from './MyVoice';
import { VoiceCheck } from './VoiceCheck';
import type { MyVoiceTab } from './open';

// „ჩემი ხმა“ as App opens it (open.ts `openMyVoice`): the page itself, the two-minute check again („თავიდან გავზომო“), and
// „ივარჯიშე ეს ფრაზა“ — which closes this page (and the lesson under it, if any) and opens the piece in its learning mode.

const EntryTest = React.lazy(() => import('../mastery/EntryTest').then(m => ({ default: m.EntryTest })));

export const MyVoiceHost: React.FC<{ tab: MyVoiceTab; onClose: () => void }> = ({ tab, onClose }) => {
  const ai = useAiNote();
  const openLearning = useOpenLearning();
  const [check, setCheck] = useState(false);
  const [full, setFull] = useState(false);
  const [shown, setShown] = useState<MyVoiceTab>(tab);

  const practice = (piece: string) => {
    // back out of this page and the lesson under it, then open the piece once the history has settled
    const depth = window.history.state?.sgAiLesson ? 2 : 1;
    try { window.history.go(-depth); } catch { onClose(); }
    window.setTimeout(() => openLearning(piece), 180);
  };

  if (check) {
    const done = (v?: Parameters<React.ComponentProps<typeof VoiceCheck>['onDone']>[0]) => {
      if (v && ai.uid) void saveAiNote(ai.uid, { voice: { ...v, at: ai.today }, skip: undefined });
      setShown('range');
    };
    return (
      <div className="fixed inset-0 z-[75] flex flex-col overflow-y-auto overscroll-contain bg-page pt-[env(safe-area-inset-top)] text-ink safe-x">
        <div className="mx-auto flex min-h-full w-full max-w-[560px] flex-col">
          <VoiceCheck onBack={() => setCheck(false)}
            onDone={v => { done(v); setCheck(false); }}
            onFull={v => { done(v); setFull(true); }}
            onSkip={() => setCheck(false)} />
        </div>
        {full && (
          <React.Suspense fallback={null}>
            <EntryTest open onClose={() => { setFull(false); setCheck(false); }} />
          </React.Suspense>
        )}
      </div>
    );
  }
  return <MyVoice key={shown} startTab={shown} onClose={onClose} onRemeasure={() => setCheck(true)} onPractice={piece => practice(piece)} />;
};
