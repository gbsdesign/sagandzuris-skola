import { useEffect, useRef } from 'react';
import { atEnd, pedalKey, pedalStep, readPedal, savePedal } from './pedal';

const typing = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable;
};

/** Nothing moves by itself — only on a recognised press while `enabled`. */
export const usePedal = (opts: {
  scroller: React.RefObject<HTMLElement | null>;
  enabled: boolean;
  onNext?: () => void;
  onFirst?: () => void;
  onAny?: () => void;
}) => {
  const o = useRef(opts);
  o.current = opts;
  useEffect(() => {
    if (!opts.enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || typing(e.target)) return;
      const prefs = readPedal();
      const dir = pedalKey(e.key, prefs);
      if (!dir) return;
      const { scroller, onNext, onFirst, onAny } = o.current;
      const el = scroller.current;
      if (!el) return;
      e.preventDefault();
      if (!prefs.known) { savePedal({ ...prefs, known: true }); onFirst?.(); }
      onAny?.();
      if (dir === 'down' && prefs.nextAtEnd && atEnd(el.scrollTop, el.clientHeight, el.scrollHeight)) { onNext?.(); return; }
      const step = pedalStep(el.clientHeight, prefs);
      const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollBy({ top: dir === 'down' ? step : -step, behavior: reduce ? 'auto' : 'smooth' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [opts.enabled]);
};

/** The setup sheet: any pedal key while open. */
export const useWaitForPedal = (on: boolean, onPress: () => void) => {
  const cb = useRef(onPress);
  cb.current = onPress;
  useEffect(() => {
    if (!on) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      // a pedal sends any of the up keys too
      if (pedalKey(e.key, { step: 'screen', back: true, nextAtEnd: false, known: true })) { e.preventDefault(); cb.current(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [on]);
};
