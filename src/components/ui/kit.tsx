import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

// Shared building blocks for the whole app: the same warm paper, burgundy accents and roomy controls everywhere.
// Rules (2026-10-25): text is never smaller than 12px (text-xs); icon buttons are 36px, the back button 44px;
// every inner page has the one PageBar; anything that cannot be undone asks through askConfirm, never window.confirm.

export const C = {
  ink: '#2a2017',
  brown: '#4a3426',
  wine: '#7a2028',
  muted: '#8a7a6a',
  line: '#e8dcc8',
  paper: '#fbf6ec',
};

export const FIELD =
  'w-full h-11 px-3.5 rounded-xl bg-white ring-1 ring-[#e8dcc8] focus:ring-2 focus:ring-[#7a2028]/40 text-[15px] text-[#2a2017] placeholder:text-[#b3a594] outline-none transition';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/** The one round 44px „←“ of a page's bar. Full-screen windows with their own sticky bar (a song, a biography, the
 *  search) use it too, so every way back looks the same. */
export const BackBtn: React.FC<{ onClick: () => void; label?: string; className?: string; icon?: React.ReactNode }> = ({ onClick, label = 'უკან', className, icon }) => (
  <button
    type="button"
    onClick={onClick}
    className={cx('w-11 h-11 shrink-0 rounded-full ring-1 ring-[#e8dcc8] bg-white/85 hover:bg-white hover:ring-[#7a2028]/35 text-[#4a3426] hover:text-[#7a2028] flex items-center justify-center cursor-pointer active:scale-95 transition', className)}
    aria-label={label}
    title={label}
  >
    {icon ?? <ArrowLeft className="w-5 h-5" />}
  </button>
);

/** true once `target` (a window's big title) has scrolled up under its sticky bar inside the scrolling `root`:
 *  the bar then shows the title itself, so the name is never written twice on one screen. */
export const useScrolledAway = (target: React.RefObject<Element | null>, root: React.RefObject<Element | null>, key: unknown, bar = 56) => {
  const [away, setAway] = useState(false);
  useEffect(() => {
    const el = target.current;
    setAway(false);
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([e]) => setAway(!e.isIntersecting && e.boundingClientRect.top < (e.rootBounds?.top ?? bar)),
      { root: root.current, rootMargin: `-${bar}px 0px 0px 0px` }
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return away;
};

/**
 * The one title bar of every inner page: a round 44px „←“, the title on the left (a small line under it if needed)
 * and up to a few 36px round buttons on the right (📌 ✎ ⓘ). Once the bar has scrolled away a round „←“ floats —
 * bottom left on a phone (thumb reach; it steps aside while scrolling down), in the empty margin left of the page
 * column on a computer, where it covers nothing.
 */
export const PageBar: React.FC<{ title: React.ReactNode; subtitle?: React.ReactNode; onBack?: () => void; right?: React.ReactNode; className?: string; lead?: React.ReactNode }> = ({ title, subtitle, onBack, right, className, lead }) => {
  const barRef = useRef<HTMLDivElement>(null);
  const [away, setAway] = useState(false);
  const [down, setDown] = useState(false);
  const floats = !!onBack;
  useEffect(() => {
    const el = barRef.current;
    if (!floats || !el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setAway(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, [floats]);
  useEffect(() => {
    if (!floats) return;
    let last = window.scrollY, raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        if (Math.abs(y - last) < 8) return;
        setDown(y > last);
        last = y;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, [floats]);
  const phoneShow = away && !down;

  return (
    <>
      <div ref={barRef} className={cx('flex items-center gap-3', className)}>
        {onBack && <BackBtn onClick={() => { triggerHaptic(8); onBack(); }} />}
        {/* `lead`: a small picture beside the title (a class's logo) */}
        {lead}
        <div className="min-w-0 flex-1">
          <h1 className="font-serif-ge text-[22px] sm:text-[26px] leading-tight font-bold text-[#4a3426] text-balance">{title}</h1>
          {subtitle && <p className="mt-0.5 text-[13px] sm:text-sm text-[#8a7a6a] truncate">{subtitle}</p>}
        </div>
        {right && <div className="flex items-center gap-1 shrink-0">{right}</div>}
      </div>

      {onBack && (
        <button
          type="button"
          onClick={() => { triggerHaptic(8); onBack(); }}
          tabIndex={away ? 0 : -1}
          aria-hidden={!away}
          aria-label="უკან"
          title="უკან"
          className={cx(
            'fixed z-40 left-[calc(env(safe-area-inset-left,0px)+16px)] bottom-[calc(env(safe-area-inset-bottom,0px)+18px)] lg:bottom-auto lg:top-4 lg:left-[max(12px,calc(50%-560px))] w-12 h-12 lg:w-10 lg:h-10 rounded-full grid place-items-center bg-[#fffdf8]/90 backdrop-blur-md ring-1 ring-[#e8dcc8] shadow-[0_10px_26px_-12px_rgba(74,52,38,0.55)] text-[#7a2028] hover:bg-white hover:ring-[#7a2028]/30 cursor-pointer transition-[opacity,transform,background-color] duration-300 ease-out active:scale-95',
            phoneShow ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none',
            away ? 'lg:opacity-100 lg:translate-y-0 lg:pointer-events-auto' : 'lg:opacity-0 lg:-translate-y-3 lg:pointer-events-none'
          )}
        >
          <ArrowLeft className="w-5 h-5 lg:w-[18px] lg:h-[18px]" />
        </button>
      )}
    </>
  );
};

export const Card: React.FC<{ className?: string; children: React.ReactNode; tone?: 'white' | 'paper' | 'wine' }> = ({ className, children, tone = 'white' }) => (
  <section
    className={cx(
      'rounded-3xl p-4 sm:p-5',
      tone === 'white' && 'bg-white/80 ring-1 ring-[#e8dcc8] shadow-[0_1px_2px_rgba(74,52,38,0.05)]',
      tone === 'paper' && 'bg-[#fbf6ec] ring-1 ring-[#e8dcc8]',
      tone === 'wine' && 'bg-gradient-to-br from-[#7a2028] to-[#5e1820] text-[#fbf6ec] shadow-[0_8px_24px_-12px_rgba(122,32,40,0.6)]',
      className
    )}
  >
    {children}
  </section>
);

/** `hint`: a short line under the title; `info`: a longer explanation behind an ⓘ button. */
export const CardTitle: React.FC<{ icon?: React.ReactNode; title: React.ReactNode; hint?: React.ReactNode; info?: React.ReactNode; right?: React.ReactNode; className?: string }> = ({ icon, title, hint, info, right, className }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={cx('mb-3.5', className)}>
      <div className="flex items-start gap-3">
        {icon && <span className="w-10 h-10 shrink-0 rounded-2xl bg-[#7a2028]/[0.08] text-[#7a2028] flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5">{icon}</span>}
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 className="font-serif-ge text-[17px] font-bold text-[#4a3426] leading-snug">{title}</h2>
          {hint && <p className="text-[13px] text-[#8a7a6a] leading-snug mt-0.5">{hint}</p>}
        </div>
        {info && (
          <IconBtn label="განმარტება" aria-expanded={open} onClick={() => setOpen(o => !o)} className={open ? '!bg-[#7a2028]/[0.1] !text-[#7a2028]' : ''}>
            <Info />
          </IconBtn>
        )}
        {right}
      </div>
      {info && open && <p className={cx('mt-2 text-[13px] text-[#75685a] leading-relaxed sg-in', !!icon && 'sm:pl-[52px]')}>{info}</p>}
    </div>
  );
};

type BtnKind = 'primary' | 'ghost' | 'danger' | 'red' | 'soft' | 'light';
const BTN: Record<BtnKind, string> = {
  primary: 'bg-[#7a2028] hover:bg-[#5e1820] text-[#fbf6ec] shadow-[0_4px_12px_-6px_rgba(122,32,40,0.7)]',
  ghost: 'bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40 text-[#4a3426]',
  danger: 'bg-white ring-1 ring-red-200 hover:bg-red-50 text-red-700',
  // the solid one for a confirmed deletion
  red: 'bg-[#b3261e] hover:bg-[#962019] text-white shadow-[0_4px_12px_-6px_rgba(179,38,30,0.7)]',
  soft: 'bg-[#7a2028]/[0.08] hover:bg-[#7a2028]/[0.14] text-[#7a2028]',
  light: 'bg-[#fbf6ec] hover:bg-white text-[#7a2028]',
};

export const Btn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: BtnKind; size?: 'md' | 'sm' | 'lg'; icon?: React.ReactNode; full?: boolean }> = ({
  kind = 'primary', size = 'md', icon, full, className, children, onClick, ...rest
}) => (
  <button
    type="button"
    {...rest}
    onClick={e => { triggerHaptic(10); onClick?.(e); }}
    className={cx(
      'inline-flex items-center justify-center gap-2 rounded-full font-bold cursor-pointer select-none transition active:scale-[0.97] disabled:opacity-50 disabled:cursor-default disabled:active:scale-100 [&>svg]:w-[18px] [&>svg]:h-[18px] [&>svg]:shrink-0',
      size === 'sm' ? 'h-9 px-3.5 text-[13px]' : size === 'lg' ? 'h-12 px-6 text-[15px]' : 'h-11 px-5 text-sm',
      full && 'w-full',
      BTN[kind],
      className
    )}
  >
    {icon}
    {children}
  </button>
);

export const IconBtn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: 'plain' | 'danger' | 'wine' }> = ({ label, tone = 'plain', className, children, onClick, ...rest }) => (
  <button
    type="button"
    {...rest}
    onClick={e => { triggerHaptic(8); onClick?.(e); }}
    aria-label={label}
    title={label}
    className={cx(
      'w-9 h-9 shrink-0 rounded-full flex items-center justify-center cursor-pointer transition active:scale-95 disabled:opacity-30 disabled:cursor-default [&>svg]:w-[18px] [&>svg]:h-[18px]',
      tone === 'plain' && 'text-[#8a7a6a] hover:text-[#7a2028] hover:bg-[#7a2028]/[0.06]',
      tone === 'danger' && 'text-[#8a7a6a] hover:text-red-600 hover:bg-red-50',
      tone === 'wine' && 'bg-[#7a2028] text-[#fbf6ec] hover:bg-[#5e1820]',
      className
    )}
  >
    {children}
  </button>
);

/** Segmented tabs that wrap into a grid on phones instead of shrinking. */
export function Tabs<T extends string>({ items, value, onChange, cols = 3 }: {
  items: { id: T; label: string; Icon?: React.ComponentType<{ className?: string }>; count?: number; dot?: boolean }[];
  value: T;
  onChange: (id: T) => void;
  cols?: 2 | 3 | 4 | 'wide';
}) {
  return (
    <div className={cx('grid gap-1 p-1 rounded-2xl bg-white/75 ring-1 ring-[#e8dcc8]',
      cols === 2 ? 'grid-cols-2' : cols === 4 ? 'grid-cols-2 min-[480px]:grid-cols-4' : cols === 'wide' ? 'grid-cols-2 min-[600px]:grid-cols-3' : 'grid-cols-3')}>
      {items.map(({ id, label, Icon, count, dot }) => {
        const on = id === value;
        return (
          <button
            key={id}
            type="button"
            onClick={() => { triggerHaptic(8); onChange(id); }}
            aria-pressed={on}
            className={cx(
              'relative min-h-11 px-2 py-1.5 rounded-xl flex items-center justify-center gap-1.5 text-[13px] sm:text-sm font-bold transition-colors cursor-pointer',
              on ? 'bg-[#7a2028] text-[#fbf6ec] shadow-sm' : 'text-[#4a3426] hover:bg-[#7a2028]/[0.05]'
            )}
          >
            {Icon && <Icon className="w-4 h-4 shrink-0" />}
            <span className="leading-tight text-center">{label}</span>
            {count !== undefined && <span className={cx('text-xs tabular-nums', on ? 'text-[#fbf6ec]/75' : 'text-[#8a7a6a]')}>{count}</span>}
            {dot && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500" />}
          </button>
        );
      })}
    </div>
  );
}

export const Avatar: React.FC<{ name?: string; photo?: string; size?: number; className?: string }> = ({ name = '?', photo, size = 40, className }) =>
  photo ? (
    <img src={photo} alt="" referrerPolicy="no-referrer" style={{ width: size, height: size }} className={cx('rounded-full object-cover shrink-0 bg-[#efe5d4]', className)} />
  ) : (
    <span
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      className={cx('rounded-full shrink-0 bg-[#efe5d4] text-[#4a3426] font-bold flex items-center justify-center', className)}
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );

export const Pill: React.FC<{ tone?: 'wine' | 'brown' | 'green' | 'amber' | 'muted' | 'solid'; children: React.ReactNode; className?: string }> = ({ tone = 'wine', children, className }) => (
  <span
    className={cx(
      'inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-xs font-bold whitespace-nowrap [&>svg]:w-3.5 [&>svg]:h-3.5',
      tone === 'wine' && 'bg-[#7a2028]/10 text-[#7a2028]',
      tone === 'brown' && 'bg-[#4a3426]/10 text-[#4a3426]',
      tone === 'green' && 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200',
      tone === 'amber' && 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
      tone === 'muted' && 'bg-[#f1e8d9] text-[#75685a]',
      tone === 'solid' && 'bg-[#4a3426] text-[#fbf6ec]',
      className
    )}
  >
    {children}
  </span>
);

export const Empty: React.FC<{ icon?: React.ReactNode; title: string; text?: React.ReactNode; action?: React.ReactNode }> = ({ icon, title, text, action }) => (
  <div className="py-9 px-4 text-center rounded-3xl border border-dashed border-[#e0d0b6] bg-white/40">
    {icon && <div className="mx-auto mb-3 w-12 h-12 rounded-2xl bg-[#7a2028]/[0.07] text-[#7a2028] flex items-center justify-center [&>svg]:w-6 [&>svg]:h-6">{icon}</div>}
    <p className="font-serif-ge font-bold text-[#4a3426]">{title}</p>
    {text && <p className="mt-1 text-[13px] text-[#8a7a6a] max-w-sm mx-auto leading-relaxed">{text}</p>}
    {action && <div className="mt-4 flex justify-center">{action}</div>}
  </div>
);

export const Label: React.FC<{ children: React.ReactNode; hint?: React.ReactNode; htmlFor?: string }> = ({ children, hint, htmlFor }) => (
  <label htmlFor={htmlFor} className="flex items-baseline justify-between gap-2 mb-1.5">
    <span className="text-[13px] font-bold text-[#75685a]">{children}</span>
    {hint && <span className="text-xs text-[#8a7a6a]">{hint}</span>}
  </label>
);

export const Toggle: React.FC<{ on: boolean; onChange: (on: boolean) => void; label: React.ReactNode; hint?: React.ReactNode; disabled?: boolean }> = ({ on, onChange, label, hint, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    disabled={disabled}
    onClick={() => { triggerHaptic(10); onChange(!on); }}
    className="w-full flex items-center gap-3 py-2.5 text-left cursor-pointer disabled:opacity-50 disabled:cursor-default"
  >
    <span className="min-w-0 flex-1">
      <span className="block text-[15px] font-semibold text-[#2a2017]">{label}</span>
      {hint && <span className="block text-[13px] text-[#8a7a6a] leading-snug">{hint}</span>}
    </span>
    <Knob on={on} />
  </button>
);

const Knob: React.FC<{ on: boolean }> = ({ on }) => (
  <span className={cx('relative block w-12 h-7 shrink-0 rounded-full transition-colors', on ? 'bg-[#7a2028]' : 'bg-[#dccdb5]')}>
    <span className={cx('absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-[left]', on ? 'left-6' : 'left-1')} />
  </span>
);

/** The same switch without its own label, for a row that has more in it; the tap area is 44px tall. */
export const Switch: React.FC<{ on: boolean; onChange: (on: boolean) => void; label: string; disabled?: boolean }> = ({ on, onChange, label, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    title={label}
    disabled={disabled}
    onClick={() => { triggerHaptic(10); onChange(!on); }}
    className="h-11 px-1 shrink-0 flex items-center cursor-pointer disabled:opacity-50 disabled:cursor-default"
  >
    <Knob on={on} />
  </button>
);

/** A banner for the result of an action; closes by itself after a while. */
export type FlashMsg = { text: string; type: 'success' | 'error' } | null;
export const useFlash = () => {
  const [flash, setFlash] = useState<FlashMsg>(null);
  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), flash.type === 'error' ? 7000 : 3500);
    return () => window.clearTimeout(t);
  }, [flash]);
  return {
    flash,
    ok: (text: string) => setFlash({ text, type: 'success' }),
    fail: (text: string) => setFlash({ text, type: 'error' }),
    say: (text: string, type: 'success' | 'error') => setFlash({ text, type }),
    clear: () => setFlash(null),
  };
};

export const Flash: React.FC<{ flash: FlashMsg; onClose: () => void }> = ({ flash, onClose }) =>
  flash ? (
    <div
      role="status"
      className={cx(
        'px-4 py-3 rounded-2xl text-sm font-semibold flex items-center gap-2 sg-in',
        flash.type === 'success' ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200' : 'bg-red-50 text-red-800 ring-1 ring-red-200'
      )}
    >
      {flash.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
      <span className="flex-1 min-w-0">{flash.text}</span>
      <button type="button" onClick={onClose} className="w-7 h-7 rounded-full hover:bg-black/5 flex items-center justify-center cursor-pointer shrink-0" aria-label="დახურვა">
        <X className="w-4 h-4" />
      </button>
    </div>
  ) : null;

/** A sheet that rises from the bottom on phones and sits centred on wide screens. */
/** `locked`: no ✕, and neither Escape nor a tap outside closes it (a form that must be filled in). */
export const Sheet: React.FC<{ open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean; locked?: boolean }> = ({ open, onClose, title, children, footer, wide, locked }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !locked && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose, locked]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-[#2a2017]/45 backdrop-blur-[2px] sg-in" onClick={locked ? undefined : onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
        className={cx(
          'relative w-full max-h-[92dvh] flex flex-col bg-[#fbf6ec] ring-1 ring-[#e8dcc8] shadow-2xl rounded-t-[28px] sm:rounded-[28px] safe-bottom sg-up',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'
        )}
      >
        <div className="flex items-center gap-2 px-5 pt-5 pb-3 border-b border-[#e8dcc8]">
          <span className="sm:hidden absolute left-1/2 -translate-x-1/2 top-1.5 w-10 h-1 rounded-full bg-[#d9c8ac]" aria-hidden />
          <h3 className="flex-1 min-w-0 font-serif-ge text-[17px] font-bold text-[#4a3426]">{title}</h3>
          {!locked && <IconBtn label="დახურვა" onClick={onClose}><X /></IconBtn>}
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-[#e8dcc8] bg-[#fbf6ec]/95">{footer}</div>}
      </div>
    </div>,
    document.body
  );
};

/** A big number with a caption, for overviews. */
export const Stat: React.FC<{ value: React.ReactNode; label: string; tone?: 'plain' | 'wine' | 'green' | 'amber' }> = ({ value, label, tone = 'plain' }) => (
  <div className={cx(
    'rounded-2xl px-3 py-2.5 min-w-0',
    tone === 'plain' && 'bg-[#fbf6ec] ring-1 ring-[#efe3cf]',
    tone === 'wine' && 'bg-[#7a2028]/[0.07]',
    tone === 'green' && 'bg-emerald-50',
    tone === 'amber' && 'bg-amber-50'
  )}>
    <div className={cx('text-xl font-bold tabular-nums leading-tight', tone === 'green' ? 'text-emerald-800' : tone === 'amber' ? 'text-amber-800' : 'text-[#4a3426]')}>{value}</div>
    <div className="text-xs font-semibold text-[#8a7a6a] leading-tight mt-0.5">{label}</div>
  </div>
);

/* ---------- confirmation in the app's own window ---------- */

export type ConfirmOpts = {
  /** the question, e.g. „წავშალო კლასი „ა“?“ */
  title: string;
  /** what will follow, in one sentence */
  text?: React.ReactNode;
  /** the confirming button's word (default „კი“); `danger` makes it solid red */
  ok?: string;
  cancel?: string;
  danger?: boolean;
};
type PendingConfirm = ConfirmOpts & { resolve: (yes: boolean) => void };
let confirmHost: ((p: PendingConfirm) => void) | null = null;

/**
 * Asks before something that cannot be undone and resolves `true` when the person confirms. A plain string is
 * the question. Works from any handler (no hook); while no ConfirmHost is mounted it falls back to the browser's box.
 */
export const askConfirm = (opts: ConfirmOpts | string): Promise<boolean> => {
  const o: ConfirmOpts = typeof opts === 'string' ? { title: opts } : opts;
  if (!confirmHost) return Promise.resolve(window.confirm(o.title));
  return new Promise(resolve => confirmHost?.({ ...o, resolve }));
};

/** Mounted once in App: the small paper card that askConfirm opens. Above every sheet (z-90). */
export const ConfirmHost: React.FC = () => {
  const [q, setQ] = useState<PendingConfirm | null>(null);
  useEffect(() => {
    confirmHost = p => setQ(prev => { prev?.resolve(false); return p; });
    return () => { confirmHost = null; };
  }, []);
  const answer = (yes: boolean) => {
    triggerHaptic(10);
    q?.resolve(yes);
    setQ(null);
  };
  useEffect(() => {
    if (!q) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); answer(false); } };
    window.addEventListener('keydown', onKey, true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey, true); document.body.style.overflow = prev; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  if (!q) return null;
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-3 sm:p-6 bg-[#2a2017]/45 backdrop-blur-[2px] sg-in" onClick={() => answer(false)}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="sg-confirm-title"
        onClick={e => e.stopPropagation()}
        className="w-full sm:max-w-sm rounded-[24px] bg-[#fbf6ec] ring-1 ring-[#e8dcc8] shadow-2xl p-5 safe-bottom sg-up"
      >
        <h3 id="sg-confirm-title" className="font-serif-ge text-[18px] leading-snug font-bold text-[#4a3426] text-balance">{q.title}</h3>
        {q.text && <p className="mt-2 text-sm leading-relaxed text-[#75685a]">{q.text}</p>}
        <div className="mt-5 grid grid-cols-2 gap-2">
          {/* the harmless button takes the focus, so Enter never deletes by accident */}
          <Btn kind="ghost" onClick={() => answer(false)} autoFocus>{q.cancel || 'გაუქმება'}</Btn>
          <Btn kind={q.danger ? 'red' : 'primary'} onClick={() => answer(true)}>{q.ok || 'კი'}</Btn>
        </div>
      </div>
    </div>,
    document.body
  );
};

/** Thin progress bar. */
export const Bar: React.FC<{ value: number; max: number; tone?: 'wine' | 'green' }> = ({ value, max, tone = 'wine' }) => (
  <div className="h-2 rounded-full bg-[#efe5d4] overflow-hidden">
    <div
      className={cx('h-full rounded-full transition-[width] duration-500', tone === 'green' ? 'bg-emerald-600' : 'bg-[#7a2028]')}
      style={{ width: `${max ? Math.min(100, Math.round((value / max) * 100)) : 0}%` }}
    />
  </div>
);
