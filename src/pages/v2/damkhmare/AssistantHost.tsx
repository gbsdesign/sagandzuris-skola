import React from 'react';
import { createPortal } from 'react-dom';
import { AssistantScreen } from './AssistantScreen';
import { useAssistantAllowed, type AssistantRequest } from './open';

/** Mounted in App: `{assistant && <Suspense><AssistantHost req={assistant} onClose={close} /></Suspense>}`. Over everything but
 *  the kit's sheets (z 80), so its own sheets open above it. Only teachers and admins while „AI მასწავლებელი“ is open. */
export const AssistantHost: React.FC<{ req: AssistantRequest; onClose: (then?: () => void) => void }> = ({ req, onClose }) => {
  const allowed = useAssistantAllowed();
  if (!allowed) return null;
  // the floating cog's small window: the page stays in sight above it, a tap there closes the window
  if (req.mini) {
    return createPortal(
      <div className="fixed inset-0 z-[76]">
        <button type="button" aria-label="დახურვა" onClick={() => onClose()} className="absolute inset-0 cursor-default bg-ink/30" />
        <div role="dialog" aria-modal="true" aria-label="ავტომატური პროგრამა"
          className="absolute inset-x-0 top-[24%] bottom-0 mx-auto flex max-w-[640px] flex-col rounded-t-card bg-page text-ink shadow-float safe-x">
          <AssistantScreen classId={req.classId} page={req.page} mini onClose={onClose} />
        </div>
      </div>,
      document.body,
    );
  }
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="ავტომატური პროგრამა"
      className="fixed inset-0 z-[76] flex flex-col bg-page pt-[env(safe-area-inset-top)] text-ink safe-x">
      <AssistantScreen classId={req.classId} page={req.page} onClose={onClose} />
    </div>,
    document.body,
  );
};
