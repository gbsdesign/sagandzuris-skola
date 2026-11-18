import React from 'react';
import { Check as CheckIcon, Minus, Plus } from 'lucide-react';
import { cx, FOCUS } from './cx';
import { Counter, Press } from './Buttons';
import { Row } from './Rows';

export type ChipItem<T extends string> = { id: T; label: string; icon?: React.ReactNode };

// the 40px pill a chip shows; its 44px button around it takes the finger and the focus mark goes on the pill
const chipLook = (on: boolean) => cx(
  'flex h-10 min-w-[44px] items-center justify-center gap-1.5 rounded-full px-4 text-body whitespace-nowrap transition',
  'group-active:scale-[0.97] [&_svg]:size-[18px] [&_svg]:shrink-0',
  'group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-wine/60',
  on ? 'bg-wine font-bold text-white' : 'bg-surf font-semibold text-ink',
);
const chipButton = 'group flex h-tap shrink-0 cursor-pointer items-center rounded-full focus-visible:outline-none';

/** One choice out of a row of pills that scrolls sideways past the page's edges — `chips`. Never scrolls by itself. */
export const Chips = <T extends string>({ items, value, onChange, label, className }: {
  items: ChipItem<T>[];
  value: T;
  onChange: (id: T) => void;
  /** what the row chooses, for screen readers */
  label?: string;
  className?: string;
}): React.ReactElement => (
  <div role="group" aria-label={label} className={cx(
    '-mx-4 -my-1 flex shrink-0 gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
    className,
  )}>
    {items.map(it => {
      const on = it.id === value;
      return (
        <Press key={it.id} aria-pressed={on} onClick={() => onChange(it.id)} className={chipButton}>
          <span className={chipLook(on)}>{it.icon}{it.label}</span>
        </Press>
      );
    })}
  </div>
);

/** Several choices out of pills that wrap onto more lines — `wrapchips`. */
export const WrapChips = <T extends string>({ items, value, onChange, label, className }: {
  items: ChipItem<T>[];
  value: T[];
  onChange: (next: T[]) => void;
  label?: string;
  className?: string;
}): React.ReactElement => (
  <div role="group" aria-label={label} className={cx('flex shrink-0 flex-wrap gap-x-2 gap-y-1', className)}>
    {items.map(it => {
      const on = value.includes(it.id);
      return (
        <Press
          key={it.id}
          aria-pressed={on}
          onClick={() => onChange(on ? value.filter(v => v !== it.id) : [...value, it.id])}
          className={chipButton}
        >
          <span className={chipLook(on)}>{it.icon}{it.label}</span>
        </Press>
      );
    })}
  </div>
);

export type SegItem<T extends string> = { id: T; label: string; icon?: React.ReactNode; badge?: number };

/** A switch between two to five parts on a grey track — `dseg` / `seg4`; `iconsOnlyWhenIdle` = `ipill`.
 *  Arrow keys move between the parts. */
export const Seg = <T extends string>({ items, value, onChange, iconsOnlyWhenIdle, label, className }: {
  items: SegItem<T>[];
  value: T;
  onChange: (id: T) => void;
  /** the parts not chosen show only their icon (each must have one) */
  iconsOnlyWhenIdle?: boolean;
  label?: string;
  className?: string;
}): React.ReactElement => {
  const many = items.length >= 4;
  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const tabs = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]'));
    // from the focused part, else from the chosen one
    const focused = tabs.indexOf(document.activeElement as HTMLElement);
    const at = focused >= 0 ? focused : Math.max(0, items.findIndex(it => it.id === value));
    const next = (at + step + items.length) % items.length;
    onChange(items[next].id);
    tabs[next]?.focus();
  };
  return (
    <div role="tablist" aria-label={label} onKeyDown={onKey} className={cx('flex h-[52px] shrink-0 gap-1 rounded-full bg-track p-1', className)}>
      {items.map(it => {
        const on = it.id === value;
        const compact = !!iconsOnlyWhenIdle && !on && !!it.icon;
        return (
          <Press
            key={it.id}
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            aria-label={compact ? (it.badge ? `${it.label} (${it.badge})` : it.label) : undefined}
            title={compact ? it.label : undefined}
            onClick={() => onChange(it.id)}
            className={cx(
              'relative flex h-tap cursor-pointer items-center justify-center gap-2 rounded-full whitespace-nowrap transition',
              '[&_svg]:size-5 [&_svg]:shrink-0',
              compact ? 'w-[50px] flex-none' : cx('min-w-0 px-2', many && !iconsOnlyWhenIdle ? 'flex-auto' : 'flex-1'),
              many ? 'text-meta tracking-tight' : 'text-body',
              on ? 'bg-surf font-bold text-wine shadow-knob' : 'font-semibold text-mut active:bg-ink/5',
              FOCUS,
            )}
          >
            {it.icon}
            {!compact && <span className="min-w-0 truncate">{it.label}</span>}
            {!!it.badge && (compact
              ? <Counter n={it.badge} className="absolute top-0.5 right-0.5" />
              : <Counter n={it.badge} className="shrink-0" />)}
          </Press>
        );
      })}
    </div>
  );
};

/** A small tag, not pressed: a state or a count — `pill`. `on`: the wine one. */
export const Pill: React.FC<{ children: React.ReactNode; on?: boolean; icon?: React.ReactNode; className?: string }> = ({
  children, on, icon, className,
}) => (
  <span className={cx(
    'inline-flex h-8 max-w-full shrink-0 items-center gap-1.5 rounded-full px-3 text-meta font-bold whitespace-nowrap [&_svg]:size-3.5 [&_svg]:shrink-0',
    on ? 'bg-wine text-white' : 'bg-tint text-wine',
    className,
  )}>
    {icon}
    <span className="min-w-0 truncate">{children}</span>
  </span>
);

/** The round tick mark, drawn only — `chk`. */
export const Check: React.FC<{ on: boolean; size?: 30 | 26 | 24; className?: string }> = ({ on, size = 30, className }) => {
  const box = size === 26 ? 'size-[26px]' : size === 24 ? 'size-6' : 'size-[30px]';
  return on ? (
    <span aria-hidden="true" className={cx('flex shrink-0 items-center justify-center rounded-full bg-wine text-white', box, className)}>
      <CheckIcon className="size-[58%]" strokeWidth={2.6} />
    </span>
  ) : (
    <span aria-hidden="true" className={cx('shrink-0 rounded-full border-[1.5px] border-dim', box, className)} />
  );
};

/** The tick mark as a 44px button of its own (a habit ticked at a row's end). */
export const CheckButton: React.FC<{ on: boolean; onChange: (on: boolean) => void; label: string; disabled?: boolean; className?: string }> = ({
  on, onChange, label, disabled, className,
}) => (
  <Press
    aria-pressed={on}
    aria-label={label}
    title={label}
    disabled={disabled}
    onClick={() => onChange(!on)}
    className={cx(
      'flex size-tap shrink-0 cursor-pointer items-center justify-center rounded-full transition active:scale-95 disabled:cursor-default disabled:opacity-40',
      FOCUS,
      className,
    )}
  >
    <Check on={on} />
  </Press>
);

/** One line to pick with a tick at its start, inside `Rows` — `choice`. `multi`: several may be ticked. */
export const Choice: React.FC<{
  title: React.ReactNode;
  sub?: React.ReactNode;
  on: boolean;
  onClick: () => void;
  multi?: boolean;
  disabled?: boolean;
  wrap?: boolean;
}> = ({ title, sub, on, onClick, multi, disabled, wrap }) => (
  <Row
    role={multi ? 'checkbox' : 'radio'}
    aria-checked={on}
    lead={<Check on={on} size={26} />}
    title={title}
    sub={sub}
    right={null}
    onClick={onClick}
    disabled={disabled}
    wrap={wrap}
  />
);

// the switch's picture; the button around it says what it is
const Track: React.FC<{ on: boolean }> = ({ on }) => (
  <span aria-hidden="true" className={cx('relative h-7 w-[46px] shrink-0 rounded-full transition-colors', on ? 'bg-wine' : 'bg-dim')}>
    <span className={cx(
      'absolute top-[3px] left-[3px] size-[22px] rounded-full bg-white shadow-knob transition-transform',
      on && 'translate-x-[18px]',
    )} />
  </span>
);

/** An on/off switch — `tog`. */
export const Toggle: React.FC<{ on: boolean; onChange: (on: boolean) => void; label: string; disabled?: boolean; className?: string }> = ({
  on, onChange, label, disabled, className,
}) => (
  <Press
    role="switch"
    aria-checked={on}
    aria-label={label}
    title={label}
    disabled={disabled}
    onClick={() => onChange(!on)}
    className={cx(
      'flex h-tap min-w-tap shrink-0 cursor-pointer items-center justify-center rounded-full px-0.5 disabled:cursor-default disabled:opacity-40',
      FOCUS,
      className,
    )}
  >
    <Track on={on} />
  </Press>
);

/** A row whose whole line turns a switch at its end, inside `Rows` — `row` + `tog`. */
export const ToggleRow: React.FC<{
  title: React.ReactNode;
  sub?: React.ReactNode;
  lead?: React.ReactNode;
  on: boolean;
  onChange: (on: boolean) => void;
  disabled?: boolean;
  wrap?: boolean;
}> = ({ title, sub, lead, on, onChange, disabled, wrap }) => (
  <Row
    role="switch"
    aria-checked={on}
    lead={lead}
    title={title}
    sub={sub}
    right={<Track on={on} />}
    onClick={() => onChange(!on)}
    disabled={disabled}
    wrap={wrap}
  />
);

// − and +: a 40px round drawn, a 44px finger area
const stepButton = cx(
  'relative flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-track text-ink transition',
  'before:absolute before:-inset-0.5 before:rounded-full active:scale-95 disabled:cursor-default disabled:opacity-35 disabled:active:scale-100',
  '[&_svg]:size-4',
  FOCUS,
);

/** − value + — `stepper`. */
export const Stepper: React.FC<{
  value: number;
  onChange: (v: number) => void;
  /** what is counted, for screen readers */
  label: string;
  min?: number;
  max?: number;
  step?: number;
  format?: (v: number) => React.ReactNode;
  className?: string;
}> = ({ value, onChange, label, min = -Infinity, max = Infinity, step = 1, format, className }) => (
  <span role="group" aria-label={label} className={cx('flex shrink-0 items-center gap-1.5', className)}>
    <Press aria-label="ნაკლები" disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))} className={stepButton}>
      <Minus strokeWidth={2.2} />
    </Press>
    <output aria-live="polite" className="min-w-7 text-center text-lead font-bold tabular-nums">{format ? format(value) : value}</output>
    <Press aria-label="მეტი" disabled={value >= max} onClick={() => onChange(Math.min(max, value + step))} className={stepButton}>
      <Plus strokeWidth={2.2} />
    </Press>
  </span>
);
