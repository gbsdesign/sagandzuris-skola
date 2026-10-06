import React from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';

// One "my list" (დამოუკიდებელი სამუშაო) button for songs, works and instruments — the same bookmark as in the top bar
export const AddToListButton: React.FC<{ isSelected: boolean; onToggle: () => void; withLabel?: boolean }> = ({ isSelected, onToggle, withLabel }) => {
  const hint = isSelected ? 'ჩემს სიაშია — ამოღება' : 'ჩემს სიაში დამატება';
  const Icon = isSelected ? BookmarkCheck : Bookmark;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isSelected}
      aria-label={hint}
      title={hint}
      className={`h-9 shrink-0 rounded-xl border inline-flex items-center justify-center gap-1.5 text-xs font-black transition-all cursor-pointer active:scale-95 ${
        withLabel ? 'px-3.5' : 'w-9'
      } ${
        isSelected
          ? 'bg-[#7a2028] text-white border-[#7a2028] shadow-2xs'
          : 'bg-white text-[#7a2028] border-[#e8dcc8] hover:border-[#7a2028]/40 hover:bg-[#7a2028]/[0.04]'
      }`}
    >
      <Icon className="w-4 h-4" />
      {withLabel && <span>{isSelected ? 'ჩემს სიაშია' : 'ჩემს სიაში'}</span>}
    </button>
  );
};
