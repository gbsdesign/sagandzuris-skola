import React, { useId } from 'react';
import { useSweep } from './PercentRing';

/** Ring colours (start → end of the stroke): one hue per round button, green once it is full. */
export const ORB_HUES = {
  gold: ['#d9a93f', '#9a4a1e'],
  wine: ['#c2414c', '#6e1c24'],
  blue: ['#6d8fd6', '#1e2f5a'],
  done: ['#34d399', '#047857'],
  rose: ['#fb7185', '#be123c'],
  amber: ['#fbbf24', '#c2410c'],
} as const satisfies Record<string, readonly [string, string]>;
export type OrbHue = keyof typeof ORB_HUES;

/** The percent in the middle of a round button, counted up with its ring. */
export const OrbPercent: React.FC<{ value: number }> = ({ value }) => {
  const p = useSweep(Math.max(0, Math.min(100, value)));
  return (
    <span className="font-black tabular-nums leading-none text-[#2a2017] text-[17px] min-[400px]:text-[19px] sm:text-[21px]">
      {Math.round(p)}
      <span className="text-[10px] sm:text-[11px] font-bold text-[#a08a76]">%</span>
    </span>
  );
};

/** The small round mark on a button's top-right edge (PathOrb's `badge`): a number in wine, or green once done. */
export const OrbBadge: React.FC<{ done?: boolean; children: React.ReactNode }> = ({ done, children }) => (
  <span
    aria-hidden
    className={`absolute -top-0.5 -right-0.5 min-w-[22px] h-[22px] px-1 rounded-full ring-2 ring-white flex items-center justify-center text-[11px] font-black text-white tabular-nums shadow-[0_3px_8px_-3px_rgba(42,32,23,0.6)] ${
      done ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' : 'bg-gradient-to-br from-[#c2414c] to-[#7a2028]'
    }`}
  >
    {children}
  </span>
);

// A round button at the top of "საგანძურის გზა": a coloured ring that fills to `percent` around a glossy disc
// (nothing coloured behind it), the name under it, a short bar under the name while open.
// The buttons rise in one after another (`index`), lift on hover and give a springy press.
export const PathOrb: React.FC<{
  label: string;
  /** the full name for screen readers */
  title: string;
  percent: number;
  hue: OrbHue;
  open: boolean;
  onClick: () => void;
  index: number;
  /** a small mark on the top-right edge (today's hours) */
  badge?: React.ReactNode;
  children: React.ReactNode;
}> = ({ label, title, percent, hue, open, onClick, index, badge, children }) => {
  const id = useId();
  const full = percent >= 100;
  const [from, to] = ORB_HUES[full ? 'done' : hue];
  const p = useSweep(Math.max(0, Math.min(100, percent)));
  const R = 35, C = 2 * Math.PI * R;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-controls="path-orb-panel"
      aria-label={`${title}: ${Math.round(percent)}%`}
      className="path-orb-in group relative min-w-0 flex flex-col items-center gap-1.5 cursor-pointer select-none rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[#7a2028]/40"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <span className="relative w-[68px] h-[68px] min-[400px]:w-[76px] min-[400px]:h-[76px] sm:w-[84px] sm:h-[84px] transition-transform duration-300 ease-[cubic-bezier(0.3,1.5,0.5,1)] group-hover:-translate-y-[3px] group-active:scale-[0.9] group-active:duration-100">
        {/* the disc: lit from the top left, a soft shade at the bottom */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_34%_26%,#ffffff_0%,#fffdf8_42%,#f3e9d8_100%)] shadow-[inset_0_-4px_8px_rgba(122,90,60,0.12),inset_0_2px_3px_rgba(255,255,255,0.9),0_10px_20px_-12px_rgba(42,32,23,0.55)]"
        />
        <svg viewBox="0 0 80 80" className="absolute inset-0 w-full h-full -rotate-90" aria-hidden>
          <defs>
            <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={from} />
              <stop offset="1" stopColor={to} />
            </linearGradient>
          </defs>
          <circle cx="40" cy="40" r={R} fill="none" stroke="#efe4d2" strokeWidth="5" />
          {p > 0.5 && (
            <circle
              cx="40" cy="40" r={R} fill="none" stroke={`url(#${id}-g)`} strokeWidth="5" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - p / 100)}
            />
          )}
        </svg>
        {/* the gloss over the middle */}
        <span aria-hidden className="absolute inset-[10px] rounded-full bg-[radial-gradient(circle_at_36%_22%,rgba(255,255,255,0.95),rgba(255,255,255,0)_58%)]" />
        <span className="absolute inset-0 flex items-center justify-center">{children}</span>
        {badge}
      </span>
      <span className={`max-w-full truncate text-[12.5px] sm:text-[13px] font-bold leading-tight transition-colors ${open ? 'text-[#7a2028]' : 'text-[#4a3426] group-hover:text-[#7a2028]'}`}>
        {label}
      </span>
      <span aria-hidden className={`h-[3px] w-6 rounded-full bg-[#7a2028] transition-all duration-300 ${open ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}`} />
    </button>
  );
};
