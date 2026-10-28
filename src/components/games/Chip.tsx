import React from 'react';
import { triggerHaptic } from '../../utils/haptics';

// A choice chip of a game's settings (games hub, 2026-10-28): one of a row, the chosen one wine. Born with „ამიხსენი“.
export const Chip: React.FC<{ on: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }> = ({ on, onClick, children, disabled }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={() => { triggerHaptic(5); onClick(); }}
    aria-pressed={on}
    className={`h-10 px-3.5 rounded-full text-[13px] font-bold ring-1 transition cursor-pointer active:scale-[0.97] disabled:opacity-40 disabled:cursor-default ${on ? 'bg-[#7a2028] text-[#fbf6ec] ring-[#7a2028]' : 'bg-white text-[#4a3426] ring-[#e8dcc8] hover:ring-[#7a2028]/40'}`}
  >
    {children}
  </button>
);

export default Chip;
