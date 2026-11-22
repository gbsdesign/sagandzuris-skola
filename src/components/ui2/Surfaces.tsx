import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, X } from 'lucide-react';
import { cx } from './cx';
import { Press, RoundButton } from './Buttons';
import { Dot, Two } from './Rows';
import { useBackToClose } from '../../utils/backToClose';

/** A white card — `card`. */
export const Card: React.FC<React.HTMLAttributes<HTMLElement> & {
  pad?: 'none' | 'sm' | 'md';
  as?: 'section' | 'div';
}> = ({ pad = 'md', as: Tag = 'section', className, children, ...rest }) => (
  <Tag {...rest} className={cx(
    'shrink-0 rounded-card bg-surf',
    pad === 'md' ? 'p-4' : pad === 'sm' ? 'p-3' : 'overflow-hidden',
    className,
  )}>
    {children}
  </Tag>
);

/** The small grey name over a group of cards — `label`. */
export const SectionLabel: React.FC<{ label: React.ReactNode; right?: React.ReactNode; className?: string }> = ({ label, right, className }) => (
  <div className={cx('flex min-h-5 shrink-0 items-center justify-between gap-2 px-1.5 pt-0.5', className)}>
    <h2 className="sg-fit min-w-0 truncate text-meta font-semibold text-mut">{label}</h2>
    {right}
  </div>
);

/** A page's big name with an optional small line over it and buttons at the right — `toph` / `chead`.
 *  It sits inside the page's 16px column (its own 4px brings the name to the prototypes' 20px). */
export const PageHead: React.FC<{ title: React.ReactNode; kicker?: React.ReactNode; right?: React.ReactNode; className?: string }> = ({
  title, kicker, right, className,
}) => (
  <header className={cx('flex shrink-0 gap-2.5 pt-[18px] pb-2 pl-1', kicker ? 'items-end' : 'items-center', className)}>
    <div className="flex min-w-0 flex-1 flex-col gap-px">
      {kicker && <div className="sg-fit truncate text-meta text-mut">{kicker}</div>}
      <h1 className="text-hero font-bold tracking-tight wrap-break-word">{title}</h1>
    </div>
    {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
  </header>
);

/** An inner page's one bar — `back` + `head` of the prototypes: the round „უკან“, the name (one line, cut with „…“) with an
 *  optional grey line under it, and at most one or two round buttons at the right. A top-level page (the bottom menu's
 *  own) uses `PageHead` instead: a big name and no „უკან“. */
export const TopBar: React.FC<{
  title: React.ReactNode; sub?: React.ReactNode; onBack?: () => void; right?: React.ReactNode; className?: string;
  /** a smaller name (an open chat's head, 2026-11-21: „სახელები … მცირედ და კომპაქტურად“) */
  small?: boolean;
  /** in place of the name: a search field (the search page) */
  children?: React.ReactNode;
}> = ({ title, sub, onBack, right, className, small, children }) => (
  <header className={cx('flex shrink-0 items-center gap-2.5 pt-3.5 pb-2.5', className)}>
    {onBack && (
      <RoundButton label="უკან" onClick={onBack}>
        <ArrowLeft aria-hidden="true" strokeWidth={1.75} />
      </RoundButton>
    )}
    {children ?? (
      <div className="min-w-0 flex-1 pl-0.5">
        {/* a long name or small line takes a second line instead of ending in „…“ (four with a big text size — .sg-fit2) */}
        <h1 className={cx('sg-fit2 line-clamp-2 leading-tight font-bold tracking-tight wrap-break-word', small ? 'text-head' : 'text-title')}>{title}</h1>
        {sub && <div className="sg-fit2 line-clamp-2 text-meta leading-snug text-mut wrap-break-word">{sub}</div>}
      </div>
    )}
    {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
  </header>
);

/** A heading on the page or in a sheet with an optional grey line under it — `h2`. `big`: a wizard step's question (22px);
 *  `flush`: inside a card (no 4px inset of its own). */
export const H2: React.FC<{ children: React.ReactNode; sub?: React.ReactNode; big?: boolean; flush?: boolean; className?: string }> = ({
  children, sub, big, flush, className,
}) => (
  <div className={cx('shrink-0', !flush && 'px-1', className)}>
    <h2 className={cx('font-bold wrap-break-word', big ? 'text-title' : 'text-head')}>{children}</h2>
    {sub && <div className="mt-1 text-body leading-snug text-mut wrap-break-word">{sub}</div>}
  </div>
);

/** A quiet grey explanation under a card — `note`. */
export const Note: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <p className={cx('shrink-0 px-1.5 text-meta leading-normal text-mut wrap-break-word', className)}>{children}</p>
);

/** A grey hint with a small icon before it — `helper`. */
export const Helper: React.FC<{ children: React.ReactNode; icon?: React.ReactNode; className?: string }> = ({ children, icon, className }) => (
  <div className={cx('flex shrink-0 gap-2 px-1.5 text-meta leading-normal text-mut', className)}>
    {icon && <span aria-hidden="true" className="flex shrink-0 pt-0.5 [&_svg]:size-4">{icon}</span>}
    <span className="min-w-0 wrap-break-word">{children}</span>
  </div>
);

/** Three or four short facts, an icon each, in one card — `bullets`. */
export const Bullets: React.FC<{ items: { icon: React.ReactNode; title: React.ReactNode; sub?: React.ReactNode }[]; className?: string }> = ({
  items, className,
}) => (
  <ul className={cx('shrink-0 divide-y divide-line overflow-hidden rounded-tile bg-surf', className)}>
    {items.map((it, i) => (
      <li key={i} className="flex items-center gap-3 px-4 py-3">
        <Dot icon={it.icon} />
        <Two title={it.title} sub={it.sub} wrap />
      </li>
    ))}
  </ul>
);

/** The wine card that leads a page, with its two pale rings — `hero` + `rings`. */
export const Hero: React.FC<{
  kicker?: React.ReactNode;
  title: React.ReactNode;
  sub?: React.ReactNode;
  action?: { label: string; icon?: React.ReactNode; onClick?: () => void; href?: string };
  children?: React.ReactNode;
  className?: string;
  /** a small round button in the top right corner (e.g. the psalter card's ✎) */
  corner?: React.ReactNode;
}> = ({ kicker, title, sub, action, children, className, corner }) => (
  <section className={cx('relative flex shrink-0 flex-col gap-0.5 overflow-hidden rounded-card bg-wine px-5 pt-[18px] pb-5 text-white', className)}>
    <span aria-hidden="true" className="pointer-events-none absolute -top-[60px] -right-[50px] size-[200px] rounded-full bg-white/7" />
    <span aria-hidden="true" className="pointer-events-none absolute -top-5 -right-2.5 size-[110px] rounded-full bg-white/7" />
    {corner && <div className="absolute top-3 right-3 z-[1]">{corner}</div>}
    {kicker && <div className={cx('relative text-meta font-semibold text-white/85', !!corner && 'pr-11')}>{kicker}</div>}
    <h2 className={cx('relative text-title font-bold leading-tight wrap-break-word', !!corner && 'pr-11')}>{title}</h2>
    {sub && <div className="relative text-meta text-white/85 wrap-break-word">{sub}</div>}
    {children && <div className="relative">{children}</div>}
    {action && (
      <Press
        href={action.href}
        onClick={action.onClick}
        className={cx(
          'relative mt-2.5 inline-flex h-tap max-w-full min-w-0 items-center gap-2 self-start rounded-full bg-white text-body font-bold whitespace-nowrap text-wine',
          'cursor-pointer transition active:scale-[0.97] [&_svg]:size-[18px] [&_svg]:shrink-0',
          action.icon ? 'pr-5 pl-4' : 'px-5',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80',
        )}
      >
        {action.icon}
        <span className="min-w-0 truncate">{action.label}</span>
      </Press>
    )}
  </section>
);

/** Reading text in the serif letters, roomy lines — `para`. `sans`: the plain letters. */
export const Para: React.FC<{ children: React.ReactNode; sans?: boolean; className?: string }> = ({ children, sans, className }) => (
  <p className={cx('text-head leading-[1.75] text-ink wrap-break-word', sans ? 'font-sans' : 'font-serif-ge', className)}>{children}</p>
);

// the sheets open now, newest last: Escape closes only the top one
const openSheets: symbol[] = [];

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * A window rising from the bottom over the dimmed page — `sheet`. Closes on a tap outside, ✕, Escape, the phone's back
 * (utils/backToClose) and a pull down on its head. `back={false}`: the caller keeps a history step of its own.
 */
export const Sheet: React.FC<{
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  back?: boolean;
}> = ({ open, title, onClose, children, className, back = true }) => {
  const box = useRef<HTMLElement>(null);
  const titleId = useId();
  // the latest onClose without restarting the effect when the caller makes a new one each render
  const close = useRef(onClose);
  close.current = onClose;
  useBackToClose(open && back, () => close.current());

  // a pull down on the head (the little bar and the title) closes it, as the bar promises; a button there stays a button
  const pull = useRef<{ y: number; t: number } | null>(null);
  const pullStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' || (e.target as HTMLElement).closest('button,a,input')) return;
    pull.current = { y: e.clientY, t: e.timeStamp };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const pullMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pull.current || !box.current) return;
    const dy = Math.max(0, e.clientY - pull.current.y);
    box.current.style.transition = 'none';
    box.current.style.translate = dy ? `0 ${dy}px` : '';
  };
  const pullEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = pull.current;
    pull.current = null;
    if (!p || !box.current) return;
    const dy = e.clientY - p.y;
    const fast = dy > 24 && dy / Math.max(1, e.timeStamp - p.t) > 0.6;
    box.current.style.transition = '';
    if (e.type !== 'pointercancel' && (dy > 96 || fast)) { close.current(); return; }
    box.current.style.translate = '';
  };

  useEffect(() => {
    if (!open) return;
    const me = Symbol('sheet');
    openSheets.push(me);
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    box.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openSheets[openSheets.length - 1] === me) { e.preventDefault(); close.current(); }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      openSheets.splice(openSheets.indexOf(me), 1);
      document.body.style.overflow = prevOverflow;
      if (before?.isConnected) before.focus({ preventScroll: true });
    };
  }, [open]);

  // keep Tab inside the window
  const trapTab = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'Tab' || !box.current) return;
    const els = Array.from(box.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (!els.length) { e.preventDefault(); return; }
    const first = els[0];
    const last = els[els.length - 1];
    const at = document.activeElement;
    if (e.shiftKey && (at === first || at === box.current)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && at === last) { e.preventDefault(); first.focus(); }
  };

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
      <div aria-hidden="true" className="sg-in absolute inset-0 bg-ink/40" onClick={() => close.current()} />
      <section
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={trapTab}
        className={cx(
          'sg-up relative flex max-h-[92dvh] w-full max-w-[560px] flex-col gap-3 rounded-t-card bg-page px-4 pt-2.5 text-ink shadow-sheet outline-none transition-[translate] duration-200',
          'pb-[max(20px,env(safe-area-inset-bottom))] sm:rounded-card sm:pt-4',
          className,
        )}
      >
        <div
          className="-mx-4 -mt-2.5 flex shrink-0 touch-none flex-col gap-3 px-4 pt-2.5 sm:-mt-4 sm:pt-4"
          onPointerDown={pullStart}
          onPointerMove={pullMove}
          onPointerUp={pullEnd}
          onPointerCancel={pullEnd}
        >
          <span aria-hidden="true" className="h-1 w-10 shrink-0 self-center rounded-full bg-dim sm:hidden" />
          <div className="flex shrink-0 items-center gap-2.5">
            <h2 id={titleId} className="sg-fit2 min-w-0 flex-1 line-clamp-3 pl-1 text-title leading-tight font-bold wrap-break-word">{title}</h2>
            <RoundButton label="დახურვა" onClick={() => close.current()}><X /></RoundButton>
          </div>
        </div>
        <div className="-mx-4 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 pb-0.5">{children}</div>
      </section>
    </div>,
    document.body,
  );
};

