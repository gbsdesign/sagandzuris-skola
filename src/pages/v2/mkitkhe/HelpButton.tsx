import React, { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { RoundButton } from '../../../components/ui2';
// only the type: the answers' file comes with the window, not with every page that has a „?“
import type { HelpPage } from '../../../data/mkitkhe';

// The page's „?“ (boards x-idea-adgilze-0…2): always the last round button at the right of the page's bar. A tap opens three
// ready questions of exactly this page (HelpSheet, loaded only then). The first time any „?“ is seen a dark bubble under it
// says what it is — once on the device, never again.

const HelpSheet = lazy(() => import('./HelpSheet').then(m => ({ default: m.HelpSheet })));

const SEEN = 'sg-help-hint';
// one bubble at a time, whichever „?“ mounts first
let hinting = false;

const Hint: React.FC<{ at: HTMLElement; onDone: () => void }> = ({ at, onDone }) => {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  useLayoutEffect(() => {
    const place = () => {
      const r = at.getBoundingClientRect();
      setPos({ top: r.bottom + 10, right: Math.max(8, window.innerWidth - r.right - 4) });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [at]);
  useEffect(() => {
    const t = window.setTimeout(onDone, 7000);
    // any touch elsewhere puts it away (a tap on the „?“ itself opens the questions too)
    const away = () => onDone();
    window.addEventListener('pointerdown', away, true);
    window.addEventListener('scroll', away, true);
    return () => { window.clearTimeout(t); window.removeEventListener('pointerdown', away, true); window.removeEventListener('scroll', away, true); };
  }, [onDone]);
  if (!pos) return null;
  return createPortal(
    <div role="status" style={{ top: pos.top, right: pos.right }}
      className="sg-in pointer-events-none fixed z-[79] w-[226px] max-w-[calc(100vw-24px)] rounded-tile bg-ink px-3.5 py-3 text-body leading-snug text-page shadow-float">
      <span aria-hidden="true" className="absolute -top-1.5 right-4 size-3 rotate-45 bg-ink" />
      კითხვა გაქვს ამ გვერდზე? აქ დააჭირე.
    </div>,
    document.body,
  );
};

export const HelpButton: React.FC<{ page: HelpPage; className?: string }> = ({ page, className }) => {
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState(false);
  const me = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let seen = true;
    try { seen = localStorage.getItem(SEEN) === '1'; } catch { /* storage off: no bubble */ }
    if (seen || hinting) return;
    // a moment after the page has settled
    const t = window.setTimeout(() => {
      if (!me.current || hinting) return;
      // a window or another screen opened over the page meanwhile: the bubble would hang over it — next time then
      const r = me.current.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (!top || !me.current.contains(top)) return;
      hinting = true;
      try { localStorage.setItem(SEEN, '1'); } catch { /* storage off */ }
      setHint(true);
    }, 900);
    return () => window.clearTimeout(t);
  }, []);
  const doneHint = useRef(() => { setHint(false); hinting = false; }).current;

  return (
    <span ref={me} className={className ?? 'flex shrink-0'}>
      <RoundButton size={36} tone="wine" label="დახმარება ამ გვერდზე" onClick={() => { doneHint(); setOpen(true); }}>
        <span aria-hidden="true" className="text-lead leading-none font-bold">?</span>
      </RoundButton>
      {hint && me.current && <Hint at={me.current} onDone={doneHint} />}
      {open && <Suspense fallback={null}><HelpSheet page={page} onClose={() => setOpen(false)} /></Suspense>}
    </span>
  );
};
