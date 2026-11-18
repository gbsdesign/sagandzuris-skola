// A small menu that opens above its button (the players sit at the bottom): a few lines, a tick on the chosen one.
// A tap outside or Escape closes it; Escape stays here (the notes page would close itself on Escape).
import React, { useEffect, useId, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { cx, FOCUS_IN, Press } from '../../../components/ui2';

export type MiniItem = { id: string; label: string; icon?: React.ReactNode; on?: boolean; onPick: () => void };

export const MiniMenu: React.FC<{
  items: MiniItem[];
  /** the button that opens it; gets the open state */
  trigger: (open: boolean, toggle: () => void, id: string) => React.ReactNode;
  align?: 'left' | 'right';
  label: string;
  className?: string;
}> = ({ items, trigger, align = 'left', label, className }) => {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    document.addEventListener('pointerdown', away);
    window.addEventListener('keydown', key, true);
    return () => { document.removeEventListener('pointerdown', away); window.removeEventListener('keydown', key, true); };
  }, [open]);
  return (
    <div ref={box} className={cx('relative', className)}>
      {trigger(open, () => setOpen(o => !o), id)}
      {open && (
        <div
          id={id}
          role="menu"
          aria-label={label}
          className={cx(
            'sg-up absolute bottom-full z-10 mb-2 flex min-w-52 flex-col overflow-hidden rounded-tile bg-surf py-1 text-ink shadow-float',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {items.map(it => (
            <Press
              key={it.id}
              role={it.on === undefined ? 'menuitem' : 'menuitemcheckbox'}
              aria-checked={it.on}
              onClick={() => { setOpen(false); it.onPick(); }}
              className={cx(
                'flex h-tap w-full cursor-pointer items-center gap-3 px-4 text-left text-body font-semibold whitespace-nowrap active:bg-soft',
                '[&_svg]:size-[18px] [&_svg]:shrink-0',
                FOCUS_IN,
              )}
            >
              <span aria-hidden="true" className="flex text-wine">{it.icon}</span>
              <span className="min-w-0 flex-1 truncate">{it.label}</span>
              {it.on && <Check aria-hidden="true" className="text-wine" strokeWidth={2.4} />}
            </Press>
          ))}
        </div>
      )}
    </div>
  );
};
