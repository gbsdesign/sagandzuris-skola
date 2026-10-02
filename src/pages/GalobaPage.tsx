import React, { useMemo, useCallback } from 'react';
import { useNavigation, useChants, ServiceType } from '../context';
import { TSIRVA_CHANTS, ChantItem, ChantVariant } from '../data';
import { ServiceTabs, ChantSearchBar, ChantAccordionItem } from './galoba';
import { triggerHaptic } from '../utils/haptics';
import { matchesSearch } from '../utils/searchUtils';
import { ArrowLeft, Music } from 'lucide-react';

export const GalobaPage: React.FC = () => {
  const {
    selectedService,
    setSelectedService,
    expandedChantId,
    setExpandedChantId,
    chantSearch,
    setChantSearch,
  } = useNavigation();

  const { selectedChantVariants = {}, toggleVariantSelection } = useChants();

  const handleSelectService = useCallback(
    (s: ServiceType) => {
      setSelectedService(s);
    },
    [setSelectedService]
  );

  const handleToggleExpand = useCallback(
    (chantId: string) => {
      setExpandedChantId((prev) => (prev === chantId ? null : chantId));
    },
    [setExpandedChantId]
  );

  const handleToggleVariant = useCallback(
    (c: ChantItem, v: ChantVariant) => {
      if (toggleVariantSelection) {
        toggleVariantSelection(c, v);
      }
    },
    [toggleVariantSelection]
  );

  // Unconditionally compute filtered chants at top level (adheres strictly to React Rules of Hooks)
  const filteredChants = useMemo(() => {
    const search = (chantSearch || '').trim();
    if (!search) return TSIRVA_CHANTS;
    return TSIRVA_CHANTS.filter((chant) => {
      if (!chant) return false;
      if (matchesSearch(chant.title || '', search)) return true;
      return (
        chant.variants?.some(
          (v) =>
            matchesSearch(v.fullTitle || '', search) ||
            matchesSearch(v.chantName || '', search) ||
            matchesSearch(v.label || '', search) ||
            matchesSearch(v.code || '', search)
        ) || false
      );
    });
  }, [chantSearch]);

  // 1. Service Selection Menu (when no specific service is selected)
  if (!selectedService) {
    return <ServiceTabs onSelectService={handleSelectService} />;
  }

  // 2. წირვა Chants View with 47 chants and unfolding variants
  if (selectedService === 'წირვა') {
    return (
      <div className="w-full my-2 px-1 flex flex-col gap-3.5">
        {/* Header Search Controls Bar */}
        <ChantSearchBar
          searchQuery={chantSearch || ''}
          onSearchChange={setChantSearch}
          resultCount={filteredChants.length}
        />

        {/* List of Chants Accordions */}
        <div className="space-y-2.5">
          {filteredChants.map((chant: ChantItem) => {
            const isExpanded = expandedChantId === chant.id;
            return (
              <ChantAccordionItem
                key={chant.id}
                chant={chant}
                isExpanded={isExpanded}
                onToggleExpand={() => handleToggleExpand(chant.id)}
                selectedChantVariants={selectedChantVariants}
                onToggleVariant={handleToggleVariant}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // 3. Sub-pages for services other than წირვა
  return (
    <div className="w-full max-w-md my-auto py-8 px-4 text-center bg-white/95 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col items-center gap-4 mx-auto">
      <button
        type="button"
        onClick={() => {
          triggerHaptic(10);
          setSelectedService(null);
        }}
        className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 active:scale-95 text-slate-700 font-semibold text-xs transition-all cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>უკან დაბრუნება</span>
      </button>
      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 flex items-center justify-center">
        <Music className="w-6 h-6 text-[#85502c]" />
      </div>
      <div>
        <h3 className="font-bold text-slate-800 text-lg">
          {selectedService === 'სადღესასწაულო'
            ? 'სადღესასწაულო საგალობლები'
            : selectedService === 'მარხვანი'
            ? 'მარხვანის საგალობლები'
            : selectedService === 'ზატიკი'
            ? 'ზატიკის საგალობლები'
            : `${selectedService}ს საგალობლები`}
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          საგალობლების სრული სია და ვარიანტები მალე დაემატება.
        </p>
      </div>
    </div>
  );
};
