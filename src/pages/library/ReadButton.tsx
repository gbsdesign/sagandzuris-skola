import React from 'react';
import { Check } from 'lucide-react';
import { useBooksRead } from '../../hooks/useBooksRead';
import { triggerHaptic } from '../../utils/haptics';

/** „წავიკითხე“ on a book's or a life's bar: a pill that turns green „წაკითხულია“ once marked; a second tap takes it back. */
export const ReadButton: React.FC<{ id: string }> = ({ id }) => {
  const { isRead, toggle } = useBooksRead();
  const done = isRead(id);
  return (
    <button
      type="button"
      aria-pressed={done}
      onClick={() => { triggerHaptic(done ? 8 : 18); toggle(id); }}
      className={`shrink-0 inline-flex items-center gap-1.5 h-9 pl-2.5 pr-3.5 rounded-full text-[13px] font-bold cursor-pointer select-none transition-all active:scale-95 ${
        done
          ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-[0_4px_12px_-6px_rgba(4,120,87,0.8)]'
          : 'bg-white text-[#2a2017] ring-1 ring-[#2a2017]/[0.12] hover:ring-[#2f7a70]/50'
      }`}
    >
      <span className={`flex items-center justify-center w-5 h-5 rounded-full ${done ? 'bg-white/25' : 'ring-[1.5px] ring-[#2f7a70]/60 text-[#2f7a70]'}`}>
        <Check className="w-3.5 h-3.5 stroke-[3]" />
      </span>
      {done ? 'წაკითხულია' : 'წავიკითხე'}
    </button>
  );
};
