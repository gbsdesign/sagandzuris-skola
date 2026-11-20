// The players' own fold, always in sight (the user, 2026-11-19: „ჩასაკეცი არ არის“ — it used to hide in the ⋯ menu): a small
// pill with ⌄ on top of the synthesizer's and the recording's player. A tap or a pull down folds the player back to the
// bottom bar; the sound goes on. The phone's back folds it too (NotesPage, utils/backToClose).
import React, { useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cx, Press } from '../../../components/ui2';

export const DockHandle: React.FC<{ onFold: () => void; dark?: boolean }> = ({ onFold, dark }) => {
  const from = useRef<number | null>(null);
  const stop = () => { from.current = null; };
  return (
    <Press
      onClick={onFold}
      onPointerDown={e => { from.current = e.clientY; }}
      onPointerMove={e => { if (from.current !== null && e.clientY - from.current > 32) { from.current = null; onFold(); } }}
      onPointerUp={stop}
      onPointerCancel={stop}
      aria-label="ჩაკეცვა"
      title="ჩაკეცვა"
      className="group -mt-2.5 -mb-2 flex h-9 w-full shrink-0 cursor-pointer touch-none items-center justify-center focus-visible:outline-none"
    >
      <span className={cx(
        'flex h-5 w-14 items-center justify-center rounded-full transition group-active:scale-95 [&_svg]:size-4',
        'group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-wine/60',
        dark ? 'bg-white/10 text-night-ink' : 'bg-page text-mut',
      )}>
        <ChevronDown aria-hidden="true" strokeWidth={2.4} />
      </span>
    </Press>
  );
};
