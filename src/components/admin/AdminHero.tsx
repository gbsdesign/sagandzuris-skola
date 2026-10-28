import React from 'react';
import { triggerHaptic } from '../../utils/haptics';

/** The wine-to-gold of the admin's places: the profile's „ადმინის პანელი“ row and the panel's numbers (one look). */
export const WINE_BAND = 'bg-gradient-to-r from-[#4a1a20] via-[#7a2028] to-[#9a6a38]';

export interface HeroTile {
  id: string;
  label: string;
  /** null while the list is still coming: the tile shows „—“, never a false 0 */
  n: number | null;
  Icon: React.ComponentType<{ className?: string }>;
  /** something waits for a decision: the tile turns amber (the person's row says it once more, nothing else does) */
  alert?: boolean;
}

/** The admin panel's numbers, under its page bar: a wine-to-gold band with the school's four main numbers in one row.
 *  A tile is a button: it opens the list it counts (the open one is lit). */
export const AdminHero: React.FC<{
  tiles: HeroTile[];
  activeId: string | null;
  onTile: (id: string) => void;
}> = ({ tiles, activeId, onTile }) => (
  <section aria-label="სკოლის რიცხვები" className={`relative overflow-hidden rounded-3xl p-2.5 sm:p-3 text-[#fbf6ec] ${WINE_BAND} shadow-[0_14px_34px_-20px_rgba(94,24,32,0.8)]`}>
    {/* a soft light in the corner, like a lamp on paper */}
    <span aria-hidden className="pointer-events-none absolute -top-16 -right-10 w-56 h-56 rounded-full bg-[#f3d9a4]/25 blur-3xl" />
    {/* four numbers in one row on every screen: the number big, the name under it (a long name breaks, never shrinks) */}
    <div className="relative grid grid-cols-4 gap-1.5 sm:gap-2">
      {tiles.map(({ id, label, n, Icon, alert }) => {
        const on = id === activeId;
        const amber = alert && !on;
        return (
          <button key={id} type="button" aria-pressed={on} onClick={() => { triggerHaptic(8); onTile(id); }}
            className={`relative min-h-[72px] px-2 sm:px-3 py-2.5 rounded-2xl text-left flex flex-col justify-between gap-1 cursor-pointer transition active:scale-[0.97] ${on
              ? 'bg-[#fbf6ec] text-[#7a2028] shadow-[0_0_26px_-4px_rgba(251,236,200,0.75)]'
              : amber ? 'bg-amber-300/20 ring-1 ring-amber-200/60 hover:bg-amber-300/30'
              : 'bg-white/10 ring-1 ring-white/15 hover:bg-white/[0.17]'}`}>
            <span className="flex items-center gap-1.5">
              <span className={`text-[24px] sm:text-[28px] leading-none font-bold tabular-nums ${amber ? 'text-amber-200' : ''}`}>{n ?? '—'}</span>
              <Icon className={`hidden sm:block w-4 h-4 ml-auto shrink-0 ${on ? 'text-[#7a2028]/60' : amber ? 'text-amber-200/80' : 'text-[#fbf6ec]/60'}`} />
            </span>
            <span className={`text-[12px] font-semibold leading-tight break-words ${on ? 'text-[#7a2028]/80' : amber ? 'text-amber-100' : 'text-[#fbf6ec]/80'}`}>{label}</span>
          </button>
        );
      })}
    </div>
  </section>
);
