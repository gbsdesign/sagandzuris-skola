import React, { memo, useCallback, useState } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import { ChantItem, ChantVariant } from '../../data';
import { ChantVariantCard } from './ChantVariantCard';
import { triggerHaptic } from '../../utils/haptics';

interface ChantAccordionItemProps {
  chant: ChantItem;
  isExpanded: boolean;
  onToggleExpand: () => void;
  selectedChantVariants: Record<string, any>;
  onToggleVariant: (chant: ChantItem, v: ChantVariant) => void;
}

export const ChantAccordionItem: React.FC<ChantAccordionItemProps> = memo(({
  chant,
  isExpanded,
  onToggleExpand,
  selectedChantVariants = {},
  onToggleVariant,
}) => {
  const selectedCount = chant?.variants?.filter((v) => Boolean(selectedChantVariants?.[v.id]))?.length || 0;
  // Only one variant's player is open at a time
  const [openVariantId, setOpenVariantId] = useState<string | null>(null);
  const handleOpenToggle = useCallback((id: string) => {
    setOpenVariantId(prev => (prev === id ? null : id));
  }, []);

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
        isExpanded
          ? 'bg-white border-amber-400/80 shadow-md ring-1 ring-amber-300/40'
          : 'bg-white/95 border-slate-200/90 shadow-xs hover:border-amber-300/80 hover:shadow-sm'
      }`}
    >
      {/* Chant Title Header (Tap to unfold variants) */}
      <button
        type="button"
        onClick={() => {
          triggerHaptic(10);
          onToggleExpand();
        }}
        className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer select-none group hover:bg-slate-50/60"
      >
        <div className="flex items-center gap-3">
          <span
            className={`w-2 h-2 rounded-full transition-all ${
              isExpanded
                ? 'bg-amber-500 scale-125'
                : selectedCount > 0
                ? 'bg-emerald-500'
                : 'bg-slate-300 group-hover:bg-amber-400'
            }`}
          ></span>
          <span className="font-bold text-slate-800 text-sm sm:text-base group-hover:text-[#85502c] transition-colors">
            {chant?.title || ''}
          </span>
          {selectedCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
              {selectedCount} მონიშნულია
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
              isExpanded
                ? 'rotate-180 bg-amber-100 text-amber-800'
                : 'bg-slate-100 text-slate-400 group-hover:text-slate-600'
            }`}
          >
            <ChevronDown className="w-4 h-4 transition-transform duration-200" />
          </div>
        </div>
      </button>

      {/* Unfolded Variants */}
      {isExpanded && chant?.variants && (
        <div className="border-t border-amber-200/70 bg-gradient-to-b from-amber-50/40 to-stone-50/50 p-3 sm:p-4 space-y-2.5 animate-in fade-in duration-200">
          <div className="text-[11px] font-semibold text-slate-500 px-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>საგალობლის ვარიანტები (აირჩიეთ):</span>
          </div>

          <div className={`${openVariantId ? '' : 'max-h-[500px] overflow-y-auto pr-1.5 scrollbar-thin'} grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5`}>
            {chant.variants.map((variant) => {
              const isSelected = Boolean(selectedChantVariants?.[variant.id]);
              return (
                <ChantVariantCard
                  key={variant.id}
                  chant={chant}
                  variant={variant}
                  isSelected={isSelected}
                  onToggle={onToggleVariant}
                  isOpen={openVariantId === variant.id}
                  onOpenToggle={handleOpenToggle}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});
