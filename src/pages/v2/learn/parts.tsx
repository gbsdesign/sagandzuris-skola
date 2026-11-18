import React from 'react';
import { cx, FOCUS, Press } from '../../../components/ui2';

// Small pieces of the learning mode's and the studio's new look (boards x-stsavla, x-studia), drawn only from the design
// rules' names. The screens' logic stays in components/learn and components/studio; these only draw.

/** What a button does: its word, its icon, its job. */
export interface LearnAction {
  label: string;
  icon?: React.ReactNode;
  run: () => void;
  disabled?: boolean;
}

/** The one big wine button that says what to do now (56px). `pulse`: the phone is listening or counting in. */
export const MainButton: React.FC<{ action: LearnAction; pulse?: boolean; className?: string }> = ({ action, pulse, className }) => (
  <Press
    onClick={action.run}
    disabled={action.disabled}
    className={cx(
      'relative flex h-14 w-full shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-wine px-5 text-body font-bold text-white select-none',
      'transition hover:bg-wine-deep active:scale-[0.985] active:bg-wine-deep disabled:cursor-default disabled:opacity-60 disabled:active:scale-100',
      '[&_svg]:size-[18px] [&_svg]:shrink-0',
      FOCUS,
      className,
    )}
  >
    {pulse && <span aria-hidden="true" className="absolute inset-0 rounded-full bg-white/15 motion-safe:animate-pulse" />}
    <span className="relative flex min-w-0 items-center gap-2">
      {action.icon}
      <span className="min-w-0 truncate">{action.label}</span>
    </span>
  </Press>
);

/** A white button of the two-by-two grid under the main one; a long word wraps instead of being cut. `on`: a switch that is on. */
export const TileButton: React.FC<{ action: LearnAction; on?: boolean }> = ({ action, on }) => (
  <Press
    onClick={action.run}
    disabled={action.disabled}
    aria-pressed={on}
    className={cx(
      'flex min-h-tap-lg min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-center text-body leading-tight font-bold',
      'transition active:scale-[0.97] disabled:cursor-default disabled:opacity-40 disabled:active:scale-100 [&_svg]:size-[18px] [&_svg]:shrink-0',
      on ? 'bg-tint text-wine' : 'bg-surf text-ink active:bg-soft',
      FOCUS,
    )}
  >
    {action.icon}
    <span className="min-w-0 wrap-break-word">{action.label}</span>
  </Press>
);

/** A quiet word button (no ground) for what is needed only now and then. */
export const QuietButton: React.FC<{ action: LearnAction }> = ({ action }) => (
  <Press
    onClick={action.run}
    disabled={action.disabled}
    className={cx(
      'inline-flex min-h-tap max-w-full min-w-0 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-meta font-bold text-wine',
      'transition hover:bg-tint active:bg-tint disabled:cursor-default disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
      FOCUS,
    )}
  >
    {action.icon}
    <span className="min-w-0 wrap-break-word text-left">{action.label}</span>
  </Press>
);

export type LineTone = 'leaf' | 'danger' | 'mut';
const LINE: Record<LineTone, string> = { leaf: 'text-leaf-ink font-bold', danger: 'text-danger', mut: 'text-mut' };

/** A short line said once something happened (sent, not sent). */
export const Line: React.FC<{ tone: LineTone; icon?: React.ReactNode; children: React.ReactNode }> = ({ tone, icon, children }) => (
  <p role="status" className={cx('flex shrink-0 items-center justify-center gap-1.5 px-2 text-center text-meta [&_svg]:size-4 [&_svg]:shrink-0', LINE[tone])}>
    {icon}<span className="min-w-0 wrap-break-word">{children}</span>
  </p>
);

/** A soft gold box: something does not work here (no microphone), with what to do instead. */
export const Warn: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p role="status" className="shrink-0 rounded-tile bg-gold-tint px-4 py-3 text-meta leading-normal text-gold-ink wrap-break-word">{children}</p>
);

/** The words of a sentence drawn with marks in it (for the phone to read it aloud). */
export const textOf = (n: React.ReactNode): string => {
  if (n == null || typeof n === 'boolean') return '';
  if (typeof n === 'string' || typeof n === 'number') return String(n);
  if (Array.isArray(n)) return n.map(textOf).join('');
  if (React.isValidElement(n)) return textOf((n.props as { children?: React.ReactNode }).children);
  return '';
};
