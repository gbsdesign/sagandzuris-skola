import React from 'react';
import { Music, X } from 'lucide-react';
import { SwipeToDismiss } from '../ui/SwipeToDismiss';
import { ManeraContent, ManeraAverageBadge } from '../views/ManeraPanel';

interface ManeraModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Kept for any caller that still opens manner as a window; the path page shows the same content folded in place.
export const ManeraModal: React.FC<ManeraModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#2a2017]/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => onClose()}
    >
      <SwipeToDismiss
        onDismiss={onClose}
        className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto bg-[#fbf6ec] rounded-[28px] p-4 sm:p-6 shadow-2xl ring-1 ring-[#e8dcc8] space-y-4 animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#e8dcc8]">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-[#7a2028]/10 text-[#7a2028] flex items-center justify-center">
              <Music className="w-[18px] h-[18px]" />
            </span>
            <h3 className="font-serif-ge text-lg font-bold text-[#4a3426]">მანერა</h3>
            <ManeraAverageBadge />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-white/80 ring-1 ring-[#e8dcc8] text-[#8a7a6a] hover:text-[#7a2028] transition-colors cursor-pointer shrink-0"
            title="დახურვა"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <ManeraContent />
      </SwipeToDismiss>
    </div>
  );
};
