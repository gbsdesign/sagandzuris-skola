import React from 'react';
import { createPortal } from 'react-dom';
import { useLearnHistory } from '../../../components/learn/LearnShared';

/** The learning mode's full-screen layer in the new look (board x-stsavla): the same history step and keys as the old look's
 *  LearnFrame (useLearnHistory), the page's ground and one column; the screen draws its own bar and gets „უკან“ here.
 *  z 80 like the notes page under it and the kit's sheets over it: a later layer of the same height lies on top, so the
 *  ⋯ window (opened later) shows over the learning screen, and the learning screen (opened later) over the notes. */
export const LearnScreen: React.FC<{ label: string; onClose: () => void; children: (back: () => void) => React.ReactNode }> = ({ label, onClose, children }) => {
  const back = useLearnHistory(onClose);
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`სასწავლო რეჟიმი · ${label}`}
      className="fixed inset-0 z-[80] overflow-y-auto overscroll-contain bg-page text-ink">
      <div className="safe-top safe-x safe-bottom">
        <div className="mx-auto flex max-w-[560px] flex-col gap-3 px-4 pb-10">{children(back)}</div>
      </div>
    </div>,
    document.body,
  );
};
