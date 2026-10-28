import React, { useState } from 'react';
import { Music } from 'lucide-react';
import { INSTRUMENTS_LIST, InstrumentItem } from '../../data';
import { Toast } from '../ui/Toast';
import { triggerHaptic } from '../../utils/haptics';
export { INSTRUMENTS_LIST };
export type { InstrumentItem };

export interface SakravebiViewProps {
  selectedChantVariants?: Record<string, any>;
}

// The instruments have no lessons yet: each is a plain card and a tap only says they are coming
// (so they can't be added to the path, "საგანძურის გზა", for now; a teacher may still put one in a class program).
export const SakravebiView: React.FC<SakravebiViewProps> = ({ selectedChantVariants = {} }) => {
  const [soon, setSoon] = useState<string | null>(null);

  return (
    <div className="w-full max-w-lg mx-auto animate-in fade-in duration-200">
      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2.5">
        {INSTRUMENTS_LIST.map(instrument => (
          <button
            key={instrument.id}
            type="button"
            onClick={() => { triggerHaptic(8); setSoon(`„${instrument.nameGe}“ — გაკვეთილები მალე დაემატება`); }}
            className="min-h-12 px-3 py-2 rounded-2xl bg-white ring-1 ring-[#e8dcc8] shadow-[0_1px_0_rgba(133,80,44,0.06)] hover:ring-[#7a2028]/30 flex items-center gap-2.5 text-left cursor-pointer active:scale-[0.98] transition"
          >
            <span className="w-9 h-9 shrink-0 rounded-full grid place-items-center bg-[#fcf1df] text-[#b4620e]">
              <Music className="w-4 h-4" />
            </span>
            <span className="flex-1 min-w-0 flex flex-col">
              <span className="text-[15px] font-bold leading-snug text-[#4a3426]">{instrument.nameGe}</span>
              {selectedChantVariants[instrument.id] && <span className="text-[12px] font-semibold text-[#2f7a4f]">მონიშნულია ✓</span>}
            </span>
          </button>
        ))}
      </div>

      <Toast message={soon || ''} type="info" isVisible={!!soon} onClose={() => setSoon(null)} />
    </div>
  );
};
