import React from 'react';
import { createPortal } from 'react-dom';
import { MkitkheScreen } from './MkitkheScreen';
import type { MkitkheRequest } from './open';

/** Mounted in App: `{mkitkhe && <Suspense><MkitkheHost req={mkitkhe} onClose={close} /></Suspense>}`. For everyone (guests
 *  too: the ready answers need no sign-in). Over the notes page (z 80, laid later in the page) and under the kit's sheets
 *  opened from it (its voice sheet), which come after it. */
export const MkitkheHost: React.FC<{ req: MkitkheRequest; onClose: (then?: () => void) => void }> = ({ req, onClose }) =>
  createPortal(
    <div role="dialog" aria-modal="true" aria-label="მკითხე — აპის დამხმარე"
      className="fixed inset-0 z-[80] flex flex-col bg-page pt-[env(safe-area-inset-top)] text-ink safe-x">
      <MkitkheScreen query={req.query} onClose={onClose} />
    </div>,
    document.body,
  );
