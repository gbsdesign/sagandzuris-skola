import React, { useEffect, useState } from 'react';
import { ChevronRight, Pin, PinOff } from 'lucide-react';
import { useAuth } from '../../../context';
import { Badge, Press, RoundButton, cx, FOCUS_IN } from '../../../components/ui2';
import { MAX_SHORTCUTS, saveShortcuts, shortcutLabel, useMyShortcuts } from '../../../utils/shortcuts';
import { useLongPress } from '../../../hooks/useLongPress';

// The small pieces of „საგანძურის გზა“ in the new look (boards x-gza, x-sagandzuri): the ring with its number, one big
// row of the path, the round 📌 and the short note a button leaves under itself.

const C = 2 * Math.PI * 22;

/** A 52px ring: a grey track and the wine share, with a number or a picture in the middle — `x-gza`'s rings. */
export const Ring: React.FC<{ share: number; children?: React.ReactNode }> = ({ share, children }) => {
  const s = Math.min(1, Math.max(0, Number.isFinite(share) ? share : 0));
  return (
    <span aria-hidden="true" className="relative flex size-[52px] shrink-0 items-center justify-center">
      <svg viewBox="0 0 52 52" className="absolute inset-0 size-full">
        <circle cx="26" cy="26" r="22" strokeWidth="4" className="fill-surf stroke-line" />
        {s > 0 && (
          <circle cx="26" cy="26" r="22" fill="none" strokeWidth="4" strokeLinecap="round" className="stroke-wine"
            strokeDasharray={`${(C * s).toFixed(1)} ${C.toFixed(1)}`} transform="rotate(-90 26 26)" />
        )}
      </svg>
      <span className="relative flex items-center justify-center">{children}</span>
    </span>
  );
};

/** The number inside a ring („6/6“, „24/24“); a long one steps down a size so it stays inside. */
export const RingText: React.FC<{ children: string }> = ({ children }) => (
  <span className={cx('font-bold tabular-nums leading-none text-ink', children.length > 5 ? 'text-cap tracking-tight' : 'text-meta')}>{children}</span>
);

/** One place of the path: its ring, name, grey line, a red count and „›“ — 84px, a card of its own. A long press (or a
 *  right click) calls `onLong` (the order of the rows). */
export const PathRow: React.FC<{
  ring: React.ReactNode;
  title: string;
  sub: string;
  badge?: number;
  onClick?: () => void;
  onLong?: () => void;
  label?: string;
}> = ({ ring, title, sub, badge, onClick, onLong, label }) => {
  const press = useLongPress(() => onLong?.());
  return (
    <Press
      {...(onLong ? press : {})}
      onClick={onClick}
      aria-label={label}
      className={cx(
        'flex min-h-[84px] w-full shrink-0 py-3 cursor-pointer items-center gap-3.5 rounded-card bg-surf pr-3 pl-4 text-left text-ink select-none',
        'transition active:scale-[0.99] active:bg-soft [-webkit-touch-callout:none]',
        FOCUS_IN,
      )}
    >
      {ring}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-head leading-tight font-bold">{title}</span>
        <span className="text-meta leading-snug text-mut wrap-break-word">{sub}</span>
      </span>
      {!!badge && <Badge n={badge} />}
      <ChevronRight aria-hidden="true" className="size-[18px] shrink-0 text-mut" strokeWidth={1.75} />
    </Press>
  );
};

/** A short line under a button for a moment (the pin's „გავიდა მთავარ გვერდზე“). */
export const ButtonNote: React.FC<{ text: string }> = ({ text }) => (
  <span role="status" className="sg-in absolute top-full right-0 z-20 mt-1.5 rounded-chip bg-ink px-2.5 py-1 text-cap font-semibold whitespace-nowrap text-white shadow-lift">
    {text}
  </span>
);

/** The page's 📌 in the new look: puts it among the home page's buttons or takes it off (the old PinButton's rules). */
export const PinRound: React.FC<{ id: string }> = ({ id }) => {
  const { user } = useAuth();
  const { list, loaded } = useMyShortcuts(user?.uid);
  const [note, setNote] = useState('');
  useEffect(() => {
    if (!note) return;
    const t = window.setTimeout(() => setNote(''), 2200);
    return () => window.clearTimeout(t);
  }, [note]);
  if (!user || !loaded || !shortcutLabel(id)) return null;
  const current = list || [];
  const pinned = current.includes(id);
  const toggle = () => {
    if (pinned) { saveShortcuts(user.uid, current.filter(x => x !== id)).catch(() => {}); setNote('მოიხსნა მთავარიდან'); }
    else if (current.length >= MAX_SHORTCUTS) setNote(`მთავარზე უკვე ${MAX_SHORTCUTS} ღილაკია`);
    else { saveShortcuts(user.uid, [...current, id]).catch(() => {}); setNote('გავიდა მთავარ გვერდზე'); }
  };
  return (
    <span className="relative inline-flex">
      <RoundButton label={pinned ? 'მთავარიდან მოხსნა' : 'მთავარ გვერდზე მიმაგრება'} tone={pinned ? 'wine' : 'surf'} aria-pressed={pinned} onClick={toggle}
        className="[&_svg]:size-[18px]">
        {pinned ? <PinOff strokeWidth={1.75} /> : <Pin strokeWidth={1.75} />}
      </RoundButton>
      {note && <ButtonNote text={note} />}
    </span>
  );
};
