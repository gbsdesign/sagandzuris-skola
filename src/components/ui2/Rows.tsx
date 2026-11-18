import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cx, FOCUS_IN } from './cx';
import { Press, type PressProps } from './Buttons';

/** A white card of rows with a hairline between them — `rows` / `lcard`. Give `role="radiogroup"` round `Choice`s. */
export const Rows: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className, ...rest }) => (
  <div {...rest} className={cx('flex shrink-0 flex-col divide-y divide-line overflow-hidden rounded-card bg-surf', className)}>
    {children}
  </div>
);

/** A name over a grey second line, taking the room left in a row — `two`. */
export const Two: React.FC<{
  title: React.ReactNode;
  sub?: React.ReactNode;
  /** `lead` 16px (a row), `body` 15px (a tile) */
  size?: 'lead' | 'body';
  /** let both lines wrap instead of ending in „…“ */
  wrap?: boolean;
  tone?: 'plain' | 'danger';
  className?: string;
}> = ({ title, sub, size = 'lead', wrap, tone = 'plain', className }) => (
  <span className={cx('flex min-w-0 flex-1 flex-col text-left', className)}>
    <span className={cx(
      'font-bold',
      size === 'lead' ? 'text-lead' : 'text-body leading-tight',
      tone === 'danger' && 'text-danger',
      // a big text size (design/look.ts) lets a long name wrap instead of ending in „…“ (.sg-fit, index.css)
      wrap ? 'wrap-break-word' : 'sg-fit truncate',
    )}>{title}</span>
    {sub && <span className={cx('text-meta text-mut', wrap ? 'wrap-break-word' : 'sg-fit truncate')}>{sub}</span>}
  </span>
);

const Chev: React.FC = () => <ChevronRight aria-hidden="true" className="size-[18px] shrink-0 text-mut" strokeWidth={2} />;

/** One line of a row card: a mark, a name with a grey line, something at the right — `row` / `lrow` / `drow`.
 *  With `onClick` or `href` the whole line is pressed; without them it is a plain line that may hold its own controls. */
export const Row: React.FC<Omit<PressProps, 'title' | 'children'> & {
  lead?: React.ReactNode;
  title: React.ReactNode;
  sub?: React.ReactNode;
  /** 'chev' (the default of a pressed line) or anything else; `null` for nothing */
  right?: React.ReactNode | 'chev';
  tone?: 'plain' | 'danger';
  wrap?: boolean;
}> = ({ lead, title, sub, right, tone = 'plain', wrap, onClick, href, className, ...rest }) => {
  const pressed = !!onClick || !!href;
  const end = right === undefined ? (pressed ? 'chev' : null) : right;
  const body = (
    <>
      {lead}
      <Two title={title} sub={sub} wrap={wrap} tone={tone} />
      {end === 'chev' ? <Chev /> : end}
    </>
  );
  const look = cx(
    'flex w-full items-center gap-2.5 py-2 pr-3 pl-4 text-ink',
    sub ? 'min-h-row' : 'min-h-14',
    className,
  );
  if (!pressed) return <div {...rest} className={look}>{body}</div>;
  return (
    <Press
      {...rest}
      onClick={onClick}
      href={href}
      className={cx(look, 'cursor-pointer text-left transition-colors active:bg-soft disabled:cursor-default disabled:opacity-50', FOCUS_IN)}
    >
      {body}
    </Press>
  );
};

export type DotColor = 'tint' | 'wine' | 'gold' | 'sea' | 'leaf' | 'plum' | 'clay' | 'soft';

const DOT: Record<DotColor, string> = {
  tint: 'bg-tint text-wine',
  wine: 'bg-wine text-white',
  gold: 'bg-gold text-white',
  sea: 'bg-sea text-white',
  leaf: 'bg-leaf text-white',
  plum: 'bg-plum text-white',
  clay: 'bg-clay text-white',
  soft: 'bg-soft text-ink',
};

/** A round mark with an icon in it — `ndot` (tint, the default), `dot` (a solid colour), `sdot` (40px). */
export const Dot: React.FC<{ icon: React.ReactNode; color?: DotColor; size?: 40 | 36 | 30; className?: string }> = ({
  icon, color = 'tint', size = 36, className,
}) => (
  <span aria-hidden="true" className={cx(
    'flex shrink-0 items-center justify-center rounded-full',
    size === 40 ? 'size-10 [&_svg]:size-[18px]' : size === 30 ? 'size-[30px] [&_svg]:size-4' : 'size-icon [&_svg]:size-[18px]',
    DOT[color],
    className,
  )}>
    {icon}
  </span>
);

/** A step's number in a round — `num`. `on`: the current one. */
export const Num: React.FC<{ n: React.ReactNode; on?: boolean; className?: string }> = ({ n, on, className }) => (
  <span aria-hidden="true" className={cx(
    'flex size-[30px] shrink-0 items-center justify-center rounded-full text-meta font-bold tabular-nums',
    on ? 'bg-wine text-white' : 'bg-track text-mut',
    className,
  )}>
    {n}
  </span>
);

export type AvatarColor = 'wine' | 'gold' | 'sea' | 'leaf' | 'plum' | 'clay';

const AVATAR: Record<AvatarColor, string> = {
  wine: 'bg-wine',
  // white letters need the deeper gold to stay readable
  gold: 'bg-gold-ink',
  sea: 'bg-sea',
  leaf: 'bg-leaf',
  plum: 'bg-plum',
  clay: 'bg-clay',
};
const AVATAR_ORDER: AvatarColor[] = ['wine', 'sea', 'leaf', 'plum', 'clay', 'gold'];

// one person keeps one colour everywhere when none is given
const colourOf = (name: string): AvatarColor => {
  let h = 0;
  for (const ch of name) h = (h * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  return AVATAR_ORDER[h % AVATAR_ORDER.length];
};

/** A person's photo, or the first letter of their name on a colour — `av`. */
export const Avatar: React.FC<{ name: string; photo?: string; size?: 40 | 32 | 48 | 64; color?: AvatarColor; className?: string }> = ({
  name, photo, size = 40, color, className,
}) => {
  const box = size === 32 ? 'size-8 text-meta' : size === 48 ? 'size-12 text-title' : size === 64 ? 'size-16 text-hero' : 'size-10 text-lead';
  if (photo) {
    return <img src={photo} alt="" aria-hidden="true" className={cx('shrink-0 rounded-full bg-soft object-cover', box, className)} />;
  }
  return (
    <span aria-hidden="true" className={cx(
      'flex shrink-0 items-center justify-center rounded-full leading-none font-bold text-white',
      box,
      AVATAR[color ?? colourOf(name)],
      className,
    )}>
      {Array.from(name.trim())[0] ?? '?'}
    </span>
  );
};

/** A red count, e.g. unread letters at a row's end — `red`. */
export const Badge: React.FC<{ n: number; className?: string }> = ({ n, className }) => (
  <span className={cx(
    'inline-flex h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-full bg-danger px-1.5 text-cap leading-none font-bold text-white tabular-nums',
    className,
  )}>
    {n > 99 ? '99+' : n}
  </span>
);

export type SmallTone = 'mut' | 'wine' | 'gold' | 'leaf' | 'danger' | 'ink';

const SMALL: Record<SmallTone, string> = {
  mut: 'text-mut',
  wine: 'text-wine',
  gold: 'text-gold-ink',
  leaf: 'text-leaf-ink',
  danger: 'text-danger',
  ink: 'text-ink',
};

/** A short grey word at a row's end (a time, a count) — `small`. */
export const Small: React.FC<{ children: React.ReactNode; tone?: SmallTone; bold?: boolean; className?: string }> = ({
  children, tone = 'mut', bold = true, className,
}) => (
  <span className={cx('shrink-0 text-meta whitespace-nowrap', bold ? 'font-semibold' : 'font-normal', SMALL[tone], className)}>{children}</span>
);

/** A setting's value and a chevron at a row's end — `val`. A long value ends in „…“. */
export const Val: React.FC<{ children: React.ReactNode; tone?: SmallTone; className?: string }> = ({ children, tone = 'mut', className }) => (
  <span className={cx('flex max-w-[55%] min-w-0 shrink-0 items-center gap-1', className)}>
    <Small tone={tone} className="min-w-0 shrink truncate">{children}</Small>
    <Chev />
  </span>
);
