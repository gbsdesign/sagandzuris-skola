import React from 'react';
import { createPortal } from 'react-dom';
import { AssistantScreen } from './AssistantScreen';
import { useAssistantAllowed, type AssistantRequest } from './open';

/** Mounted in App: `{assistant && <Suspense><AssistantHost req={assistant} onClose={close} /></Suspense>}`. Over everything but
 *  the kit's sheets (z 80), so its own sheets open above it. Only teachers and admins while „AI მასწავლებელი“ is open. */
export const AssistantHost: React.FC<{ req: AssistantRequest; onClose: (then?: () => void) => void }> = ({ req, onClose }) => {
  const allowed = useAssistantAllowed();
  if (!allowed) return null;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="AI დამხმარე"
      className="fixed inset-0 z-[76] flex flex-col bg-page pt-[env(safe-area-inset-top)] text-ink safe-x">
      <AssistantScreen classId={req.classId} onClose={onClose} />
    </div>,
    document.body,
  );
};
