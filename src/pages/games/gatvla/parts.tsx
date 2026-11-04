import React from 'react';

// „გათვლა“'s pieces both tabs share (2026-11-04): a name of the circle as a tile — waiting, lit by the beat, picked, out;
// in the room also the one I marked (`chosen`) and, at the reveal, my mark that missed (`missed`).

export type TileState = 'idle' | 'active' | 'out' | 'picked' | 'chosen' | 'missed';

const LOOK: Record<TileState, string> = {
  picked: 'bg-[#2f7d4f] text-white shadow-[0_8px_18px_-8px_rgba(47,125,79,0.9)] scale-[1.03]',
  active: 'bg-[#7a2028] text-[#fbf6ec]',
  out: 'bg-[#f1e8d9] text-[#b3a594]',
  chosen: 'bg-[#7a2028]/[0.08] ring-2 ring-[#7a2028] text-[#7a2028]',
  missed: 'bg-white ring-2 ring-[#b3261e]/70 text-[#b3261e]',
  idle: 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426]',
};

export const NameTile: React.FC<{ name: string; state: TileState; note?: string; badge?: React.ReactNode }> = ({ name, state, note, badge }) => (
  <div className={`relative min-h-[60px] rounded-2xl px-2 py-2 flex flex-col items-center justify-center text-center font-bold leading-tight transition-colors duration-100 [overflow-wrap:anywhere] ${LOOK[state]} ${name.length > 12 ? 'text-[13px]' : 'text-[15px]'}`}>
    {name}
    {note && <span className="mt-0.5 text-[11px] font-normal opacity-80">{note}</span>}
    {badge}
  </div>
);
