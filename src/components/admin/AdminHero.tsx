import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

export interface HeroTile {
  id: string;
  label: string;
  n: number;
  Icon: React.ComponentType<{ className?: string }>;
  /** a small amber dot: something waits for a decision */
  alert?: boolean;
}

/** The admin panel's head: a wine-to-gold band with the back button, the title and who is signed in, and the
 *  school's main numbers as four tiles in one row. A tile is a button: it opens the list it counts (the open one is lit). */
export const AdminHero: React.FC<{
  title: string;
  subtitle: string;
  onBack: () => void;
  tiles: HeroTile[];
  activeId: string | null;
  onTile: (id: string) => void;
}> = ({ title, subtitle, onBack, tiles, activeId, onTile }) => (
  <header className="relative overflow-hidden rounded-[28px] p-3.5 sm:p-5 text-[#fbf6ec] bg-gradient-to-r from-[#4a1a20] via-[#7a2028] to-[#a77c3c] shadow-[0_14px_34px_-20px_rgba(94,24,32,0.8)]">
    {/* a soft light behind the title, like a lamp on paper */}
    <span aria-hidden className="pointer-events-none absolute -top-16 -right-10 w-56 h-56 rounded-full bg-[#f3d9a4]/25 blur-3xl" />
    <div className="relative flex items-center gap-3">
      <button type="button" onClick={onBack} aria-label="უკან" title="უკან"
        className="w-11 h-11 shrink-0 rounded-full bg-white/12 ring-1 ring-white/20 hover:bg-white/20 flex items-center justify-center cursor-pointer active:scale-95 transition">
        <ArrowLeft className="w-5 h-5" />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="font-serif-ge text-[20px] sm:text-[26px] leading-tight font-bold">{title}</h1>
        <p className="mt-0.5 text-[13px] text-[#fbf6ec]/75 truncate">{subtitle}</p>
      </div>
    </div>

    {/* four numbers in one row on every screen: the number big, the name under it */}
    <div className="relative mt-4 grid grid-cols-4 gap-1.5 sm:gap-2">
      {tiles.map(({ id, label, n, Icon, alert }) => {
        const on = id === activeId;
        return (
          <button key={id} type="button" aria-pressed={on} onClick={() => { triggerHaptic(8); onTile(id); }}
            className={`relative min-h-[72px] px-2 sm:px-3 py-2.5 rounded-2xl text-left flex flex-col justify-between gap-1 cursor-pointer transition active:scale-[0.97] ${on
              ? 'bg-[#fbf6ec] text-[#7a2028] shadow-[0_0_26px_-4px_rgba(251,236,200,0.75)]'
              : 'bg-white/10 ring-1 ring-white/15 hover:bg-white/[0.17]'}`}>
            <span className="flex items-center gap-1.5">
              <span className="text-[24px] sm:text-[28px] leading-none font-bold tabular-nums">{n}</span>
              <Icon className={`hidden sm:block w-4 h-4 ml-auto shrink-0 ${on ? 'text-[#7a2028]/60' : 'text-[#fbf6ec]/60'}`} />
            </span>
            <span className={`text-[12px] font-semibold leading-tight ${on ? 'text-[#7a2028]/80' : 'text-[#fbf6ec]/80'}`}>{label}</span>
            {alert && <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-200/50 animate-pulse" aria-label="ელოდება გადაწყვეტილებას" />}
          </button>
        );
      })}
    </div>
  </header>
);
