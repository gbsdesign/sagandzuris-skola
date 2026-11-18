import React from 'react';
import { triggerHaptic } from '../../utils/haptics';
import { cx, FOCUS } from './cx';

/** What every tappable part takes: a button, or a link when `href` is given (a disabled link becomes a disabled button). */
export type PressProps = Omit<React.HTMLAttributes<HTMLElement>, 'onClick'> & {
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
  href?: string;
  target?: string;
  rel?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
};

/** The bare tappable element under every kit v2 control: haptic tick, `type="button"`, link or button. */
export const Press = React.forwardRef<HTMLElement, PressProps>(
  ({ href, target, rel, disabled, type = 'button', onClick, children, ...rest }, ref) => {
    const press = (e: React.MouseEvent<HTMLElement>) => { triggerHaptic(10); onClick?.(e); };
    if (href && !disabled) {
      return (
        <a ref={ref as React.Ref<HTMLAnchorElement>} href={href} target={target}
          rel={rel ?? (target === '_blank' ? 'noopener noreferrer' : undefined)} onClick={press} {...rest}>
          {children}
        </a>
      );
    }
    return (
      <button ref={ref as React.Ref<HTMLButtonElement>} type={type} disabled={disabled} onClick={press} {...rest}>
        {children}
      </button>
    );
  },
);
Press.displayName = 'Press';

export type ButtonKind = 'primary' | 'ghost' | 'soft' | 'danger' | 'quiet';

const KIND: Record<ButtonKind, string> = {
  primary: 'bg-wine text-white hover:bg-wine-deep active:bg-wine-deep',
  ghost: 'bg-surf text-ink active:bg-soft',
  soft: 'bg-tint text-wine active:brightness-95',
  danger: 'bg-danger text-white active:brightness-90',
  quiet: 'bg-transparent text-wine hover:bg-tint active:bg-tint',
};

/** A word button — `big` (primary), `ghost`, `primary(full)` / `ghostw` of the prototypes. One line; a long word ends in „…“. */
export const Button: React.FC<PressProps & {
  kind?: ButtonKind;
  size?: 'lg' | 'md';
  icon?: React.ReactNode;
  full?: boolean;
}> = ({ kind = 'primary', size = 'lg', icon, full, className, children, ...rest }) => (
  <Press
    {...rest}
    className={cx(
      'inline-flex max-w-full min-w-0 items-center justify-center gap-2 rounded-full text-body font-bold whitespace-nowrap select-none',
      'cursor-pointer transition active:scale-[0.97] disabled:cursor-default disabled:opacity-50 disabled:active:scale-100',
      '[&_svg]:size-[18px] [&_svg]:shrink-0',
      size === 'lg' ? 'h-tap-lg' : 'h-tap',
      icon ? 'pr-5 pl-4' : size === 'lg' ? 'px-[22px]' : 'px-5',
      full && 'w-full',
      KIND[kind],
      FOCUS,
      className,
    )}
  >
    {icon}
    <span className="min-w-0 truncate">{children}</span>
  </Press>
);

export type RoundTone = 'surf' | 'wine' | 'page' | 'plain' | 'glass';

const TONE: Record<RoundTone, string> = {
  surf: 'bg-surf text-ink active:bg-soft',
  wine: 'bg-wine text-white hover:bg-wine-deep active:bg-wine-deep',
  page: 'bg-page text-ink active:bg-soft',
  plain: 'bg-transparent text-mut hover:bg-ink/5 hover:text-ink active:bg-ink/5',
  glass: 'bg-white/15 text-white active:bg-white/25',
};

/** A round icon button — `wbtn` (and the badge of `ipill`). The 36px one keeps a 44px finger area around it. */
export const RoundButton: React.FC<Omit<PressProps, 'children'> & {
  /** said by screen readers and shown on hover */
  label: string;
  size?: 44 | 48 | 36;
  tone?: RoundTone;
  /** a small red counter at the top right; 0 or none hides it */
  badge?: number;
  /** the big wine button that floats over the page */
  raised?: boolean;
  children: React.ReactNode;
}> = ({ label, size = 44, tone = 'surf', badge, raised, className, children, ...rest }) => (
  <Press
    {...rest}
    aria-label={badge ? `${label} (${badge})` : label}
    title={label}
    className={cx(
      'relative flex shrink-0 items-center justify-center rounded-full cursor-pointer select-none transition active:scale-95',
      'disabled:cursor-default disabled:opacity-40 disabled:active:scale-100',
      size === 48 ? 'size-tap-lg [&_svg]:size-[22px]' : size === 36 ? 'size-icon [&_svg]:size-[18px]' : 'size-tap [&_svg]:size-5',
      // a 36px button still answers a 44px finger
      size === 36 && 'before:absolute before:-inset-1 before:rounded-full',
      raised ? 'bg-wine text-white shadow-wine active:bg-wine-deep' : TONE[tone],
      FOCUS,
      className,
    )}
  >
    {children}
    {!!badge && <Counter n={badge} className="absolute -top-1 -right-1" />}
  </Press>
);

/** The small red counter on a round button or a tab (`ipill`'s). */
export const Counter: React.FC<{ n: number; className?: string }> = ({ n, className }) => (
  <span aria-hidden="true" className={cx(
    'pointer-events-none flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-cap leading-none font-bold text-white',
    className,
  )}>
    {n > 99 ? '99+' : n}
  </span>
);

/** Two buttons side by side, each half the width — `duo`. */
export const Duo: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cx('flex shrink-0 gap-2.5 [&>*]:min-w-0 [&>*]:flex-1', className)}>{children}</div>
);
