import React from 'react';
import { SwipeToDismiss } from '../ui/SwipeToDismiss';
import { ChvevebiContent } from '../views/ChvevebiPanel';

interface ChvevebiModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Kept for any caller that still opens habits as a window; the path page shows the same content folded in place.
export const ChvevebiModal: React.FC<ChvevebiModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#2a2017]/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => onClose()}
    >
      <SwipeToDismiss
        onDismiss={onClose}
        className="relative w-full max-w-xl max-h-[90dvh] overflow-y-auto bg-[#fbf6ec] rounded-[28px] p-4 sm:p-6 shadow-2xl ring-1 ring-[#e8dcc8] space-y-4 animate-in zoom-in-95 duration-200"
      >
        {/* the habits draw their own title row, with ✕ */}
        <ChvevebiContent onClose={onClose} />
      </SwipeToDismiss>
    </div>
  );
};
