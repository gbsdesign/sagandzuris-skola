import React from 'react';
import { cx } from '../ui2';

// One way to wait (redesign stage 2, the prototypes `ultra-chonchkhi`): while a page is still loading, its shape stands where
// the words will be — a field, then a card of rows (a round + two lines) — so the screen does not jump when it arrives. The
// shapes breathe softly, and stand still for „reduce motion“.

const Bar: React.FC<{ className: string }> = ({ className }) => <span className={cx('block rounded-full bg-track', className)} />;

export const PageSkeleton: React.FC<{ rows?: number; className?: string }> = ({ rows = 7, className }) => (
  <div role="status" aria-label="იტვირთება" className={cx('flex w-full flex-col gap-3 motion-safe:animate-pulse', className)}>
    <div className="h-12 shrink-0 rounded-full bg-surf" />
    <div className="flex shrink-0 flex-col overflow-hidden rounded-card bg-surf">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={cx('flex h-row items-center gap-2.5 pr-3 pl-4', i > 0 && 'border-t border-line')}>
          <span className="size-icon shrink-0 rounded-full bg-track" />
          <span className="flex flex-1 flex-col gap-2">
            <Bar className="h-3.5 w-[62%]" />
            <Bar className="h-2.5 w-[38%]" />
          </span>
        </div>
      ))}
    </div>
  </div>
);

const LINES = ['w-full', 'w-[94%]', 'w-[98%]', 'w-[72%]', 'w-full', 'w-[90%]', 'w-[96%]', 'w-[60%]', 'w-full', 'w-[88%]', 'w-[40%]'];

/** A reading page's shape: round tools in a row, then a card of text lines. */
export const TextSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div role="status" aria-label="იტვირთება" className={cx('flex w-full flex-col gap-3 motion-safe:animate-pulse', className)}>
    <div className="flex gap-2">
      {[0, 1, 2, 3].map(i => <span key={i} className="size-tap rounded-full bg-surf" />)}
    </div>
    <div className="flex flex-col gap-4 rounded-card bg-surf p-5">
      <Bar className="mb-4 h-5 w-[55%]" />
      {LINES.map((w, i) => <Bar key={i} className={cx('h-3.5', w)} />)}
    </div>
  </div>
);
