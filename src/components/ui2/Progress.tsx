import React from 'react';
import { Play } from 'lucide-react';
import { cx, FOCUS_IN } from './cx';
import { Press } from './Buttons';
import { Num, Two } from './Rows';

export type BarTone = 'wine' | 'leaf' | 'gold' | 'sea' | 'white';

const FILL: Record<BarTone, string> = {
  wine: 'bg-wine',
  leaf: 'bg-leaf',
  gold: 'bg-gold',
  sea: 'bg-sea',
  white: 'bg-white',
};

/** A thin progress line — `bar`. `white` is for the wine hero (its track turns pale white). */
export const Bar: React.FC<{ value: number; tone?: BarTone; h?: 5 | 6 | 8; label?: string; className?: string }> = ({
  value, tone = 'wine', h = 6, label, className,
}) => {
  const pct = Math.round(Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0)) * 100);
  const a11y = label
    ? { role: 'progressbar' as const, 'aria-label': label, 'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100 }
    : { 'aria-hidden': true as const };
  return (
    <div {...a11y} className={cx(
      'w-full overflow-hidden rounded-full',
      h === 5 ? 'h-[5px]' : h === 8 ? 'h-2' : 'h-1.5',
      tone === 'white' ? 'bg-white/20' : 'bg-track',
      className,
    )}>
      <div className={cx('h-full rounded-full transition-[width] duration-500', FILL[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
};

/** Numbered steps in one card, the current one in wine — `steps`. */
export const Steps: React.FC<{ items: React.ReactNode[]; current?: number; className?: string }> = ({ items, current = 0, className }) => (
  <ol className={cx('shrink-0 divide-y divide-line overflow-hidden rounded-tile bg-surf', className)}>
    {items.map((it, i) => (
      <li key={i} aria-current={i === current ? 'step' : undefined} className="flex min-h-[52px] items-center gap-3 px-4 py-2">
        <Num n={i + 1} on={i === current} />
        <span className="min-w-0 flex-1 text-body leading-snug font-semibold wrap-break-word">{it}</span>
      </li>
    ))}
  </ol>
);

/** A wizard's progress: short lines, the done ones in wine — `dashes`. */
export const Dashes: React.FC<{ total: number; done: number; label?: string; className?: string }> = ({ total, done, label, className }) => {
  const a11y = label
    ? { role: 'progressbar' as const, 'aria-label': label, 'aria-valuenow': done, 'aria-valuemin': 0, 'aria-valuemax': total }
    : { 'aria-hidden': true as const };
  return (
    <div {...a11y} className={cx('flex shrink-0 gap-1.5', className)}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={cx('h-[5px] flex-1 rounded-full transition-colors', i < done ? 'bg-wine' : 'bg-track')} />
      ))}
    </div>
  );
};

/** Two to four big numbers side by side in one card — `stats`. */
export const Stats: React.FC<{ items: { value: React.ReactNode; label: React.ReactNode }[]; className?: string }> = ({ items, className }) => (
  <dl className={cx('flex shrink-0 divide-x divide-line rounded-tile bg-surf', className)}>
    {items.map((it, i) => (
      <div key={i} className="flex min-w-0 flex-1 flex-col-reverse px-1.5 py-3.5 text-center">
        <dt className="mt-[3px] text-meta leading-snug text-mut wrap-break-word">{it.label}</dt>
        <dd className="text-title leading-tight font-bold tabular-nums">{it.value}</dd>
      </div>
    ))}
  </dl>
);

export type TileItem = { lead?: React.ReactNode; title: React.ReactNode; sub?: React.ReactNode; onClick?: () => void; href?: string };

/** Small white tiles in two or three columns, a mark and a name each — `tiles`. */
export const Tiles: React.FC<{ items: TileItem[]; cols?: 2 | 3; className?: string }> = ({ items, cols = 2, className }) => (
  <div className={cx('grid shrink-0 gap-2.5', cols === 3 ? 'grid-cols-3' : 'grid-cols-2', className)}>
    {items.map((it, i) => {
      const look = 'flex min-h-[72px] min-w-0 items-center gap-2.5 rounded-tile bg-surf px-3 py-2 text-left text-ink';
      const body = <>{it.lead}<Two title={it.title} sub={it.sub} size="body" /></>;
      return it.onClick || it.href ? (
        <Press key={i} onClick={it.onClick} href={it.href}
          className={cx(look, 'cursor-pointer transition active:scale-[0.98] active:bg-soft', FOCUS_IN)}>
          {body}
        </Press>
      ) : (
        <div key={i} className={look}>{body}</div>
      );
    })}
  </div>
);

/** A video's still: a dark box with a play mark and its length — `thumb`. Drawn only; the row around it is pressed. */
export const Thumb: React.FC<{ duration?: string; w?: number; h?: number; className?: string }> = ({ duration, w = 104, h = 64, className }) => (
  <span aria-hidden="true" style={{ width: w, height: h }}
    className={cx('relative flex shrink-0 items-center justify-center overflow-hidden rounded-field bg-ink text-white', className)}>
    <span className="absolute inset-0 bg-linear-to-br from-white/10 to-transparent" />
    <Play className="relative size-[18px] fill-current" strokeWidth={1.5} />
    {duration && (
      <span className="absolute right-1.5 bottom-[5px] rounded-chip bg-black/55 px-[5px] py-px text-cap leading-tight font-bold tabular-nums">
        {duration}
      </span>
    )}
  </span>
);
