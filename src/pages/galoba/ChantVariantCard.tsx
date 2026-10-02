import React, { memo } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { ChantItem, ChantVariant } from '../../data';
import { triggerHaptic } from '../../utils/haptics';
import { ChantDetailPage } from '../ChantDetailPage';

interface ChantVariantCardProps {
  chant: ChantItem;
  variant: ChantVariant;
  isSelected: boolean;
  onToggle: (chant: ChantItem, v: ChantVariant) => void;
  isOpen: boolean;
  onOpenToggle: (variantId: string) => void;
}

export const ChantVariantCard: React.FC<ChantVariantCardProps> = memo(({
  chant,
  variant,
  isSelected,
  onToggle,
  isOpen,
  onOpenToggle,
}) => {
  const code = variant?.code || '';
  const isGS = code.startsWith('გ.ს.');
  const isKK = code.startsWith('ქ.კ.');

  const handleNavigate = () => {
    triggerHaptic(10);
    // Remembered so the standalone detail page (e.g. from bookmarks) opens the same variant
    localStorage.setItem('selectedChantId', chant.id);
    localStorage.setItem('selectedVariantId', variant.id);
    onOpenToggle(variant.id);
  };

  const handleToggleSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(15);
    onToggle(chant, variant);
  };

  return (
    <div
      className={`rounded-xl border transition-all duration-200 overflow-hidden ${
        isOpen
          ? 'col-span-full bg-white border-amber-400/80 shadow-md ring-1 ring-amber-300/40'
          : isSelected
          ? 'bg-amber-100/30 border-amber-300/80 shadow-2xs'
          : 'bg-white hover:bg-amber-50/30 border-slate-200 hover:border-amber-300 text-slate-800 shadow-2xs'
      }`}
    >
      <div
        className="p-3 flex items-center justify-between gap-2.5 select-none hover:bg-amber-50/40 transition-colors cursor-pointer"
        onClick={handleNavigate}
        role="button"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span
            className={`px-2 py-0.5 rounded-md font-bold text-xs shrink-0 border ${
              isGS
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : isKK
                ? 'bg-sky-100 text-sky-900 border-sky-300'
                : 'bg-emerald-100 text-emerald-900 border-emerald-300'
            }`}
          >
            {code}
          </span>
          <span className="font-medium text-xs sm:text-sm text-slate-800 leading-snug line-clamp-2">
            {variant?.chantName || chant?.title || ''}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-1.5">
          <button
            type="button"
            onClick={handleToggleSelection}
            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer border ${
              isSelected
                ? 'bg-amber-600 text-white border-amber-700 shadow-2xs ring-1 ring-amber-500/50'
                : 'bg-white hover:bg-slate-100 text-transparent border-slate-300 hover:border-amber-400'
            }`}
            title={isSelected ? 'მონიშვნის მოხსნა' : 'დამოუკიდებელ სამუშაოში დამატება'}
          >
            <Check className={`w-3.5 h-3.5 stroke-[3] ${isSelected ? 'text-white' : 'opacity-0'}`} />
          </button>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-amber-700' : ''}`} />
        </div>
      </div>

      {/* Inline player (mounted only while open, so closing stops playback) */}
      {isOpen && (
        <div className="border-t border-amber-100 px-2 pb-2.5 pt-2 bg-gradient-to-b from-amber-50/30 to-white">
          <ChantDetailPage chantId={chant.id} variantId={variant.id} inline />
        </div>
      )}
    </div>
  );
});
