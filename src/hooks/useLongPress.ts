import { useEffect, useRef } from 'react';
import { triggerHaptic } from '../utils/haptics';

/** A long press (≈ half a second, the finger kept still) — or a right click on a computer — calls `onLong`; the tap that
 *  ends a long press does not count as a click. Spread the result on the element (with `select-none` and no callout, so
 *  the phone does not pick the text instead). `onTap`: a plain short tap. */
export const useLongPress = (onLong: () => void, onTap?: () => void, ms = 480) => {
  const timer = useRef<number | undefined>(undefined);
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);
  const cb = useRef({ onLong, onTap });
  cb.current = { onLong, onTap };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const cancel = () => { window.clearTimeout(timer.current); start.current = null; };
  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      fired.current = false;
      start.current = { x: e.clientX, y: e.clientY };
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        fired.current = true;
        start.current = null;
        triggerHaptic(25);
        cb.current.onLong();
      }, ms);
    },
    onPointerMove: (e: React.PointerEvent) => {
      const s = start.current;
      if (s && Math.hypot(e.clientX - s.x, e.clientY - s.y) > 10) cancel();
    },
    onPointerUp: () => {
      const short = !!start.current && !fired.current;
      cancel();
      if (short) cb.current.onTap?.();
    },
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      if (fired.current) return;
      cancel();
      fired.current = true;
      cb.current.onLong();
    },
    onClickCapture: (e: React.MouseEvent) => {
      if (!fired.current) return;
      e.preventDefault();
      e.stopPropagation();
      fired.current = false;
    },
  };
};
