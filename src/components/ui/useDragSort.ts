import React, { useEffect, useRef, useState } from 'react';
import { triggerHaptic } from '../../utils/haptics';

// Reordering by dragging, with a finger or a mouse: the items carry data-sort-id inside `container`,
// and the grip's props start the drag. While dragging the order changes live (the item swaps with the
// one under the pointer — rows or a grid alike); letting go hands the new order to `onChange`.
// The pointer is followed on the window, so an item that moves to another row (and is drawn anew)
// stays in hand. The arrow keys move a focused grip one step.

export const useDragSort = (ids: string[], onChange: (ids: string[]) => void) => {
  const container = useRef<HTMLElement | null>(null);
  const [live, setLive] = useState<string[] | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const current = useRef<string[]>(ids);
  const stop = useRef<(() => void) | null>(null);
  const latest = useRef({ ids, onChange });
  latest.current = { ids, onChange };
  useEffect(() => () => stop.current?.(), []);
  const order = live ?? ids;

  const moveTo = (id: string, to: number) => {
    const list = current.current.filter(x => x !== id);
    list.splice(Math.max(0, Math.min(list.length, to)), 0, id);
    current.current = list;
    setLive(list);
  };

  const start = (id: string) => {
    current.current = latest.current.ids;
    setDragging(id);
    triggerHaptic(10);
    const move = (e: PointerEvent) => {
      if (!container.current) return;
      const over = Array.from(container.current.querySelectorAll<HTMLElement>('[data-sort-id]')).find(el => {
        const r = el.getBoundingClientRect();
        return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      });
      const target = over?.dataset.sortId;
      if (!target || target === id) return;
      moveTo(id, current.current.indexOf(target));
      triggerHaptic(6);
    };
    const end = () => {
      stop.current?.();
      const { ids: before, onChange: save } = latest.current;
      setDragging(null);
      setLive(null);
      if (before.join('\n') !== current.current.join('\n')) save(current.current);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    stop.current = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      stop.current = null;
    };
  };

  const grip = (id: string) => ({
    style: { touchAction: 'none' } as React.CSSProperties,
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0 || stop.current) return;
      e.preventDefault();
      start(id);
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
      const step = e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : 0;
      if (!step) return;
      e.preventDefault();
      const at = ids.indexOf(id);
      if (at + step < 0 || at + step >= ids.length) return;
      current.current = ids;
      moveTo(id, at + step);
      setLive(null);
      onChange(current.current);
    },
  });

  return { container, order, dragging, grip };
};
