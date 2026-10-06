import React, { useMemo, useCallback } from 'react';
import { useNavigation, useChants, ServiceType } from '../context';
import { TSIRVA_CHANTS, MWUKHRI_CHANTS, CISKARI_CHANTS, SADGHESASWAULO_CHANTS, MARXVANI_CHANTS, ZATIKI_CHANTS, ChantItem, ChantVariant } from '../data';
import { ServiceTabs, ChantSearchBar, ChantAccordionItem } from './galoba';
import { ProgramCard, ServiceDownload } from './galoba/LiturgyBits';
import { useNotes } from '../context/NotesContext';
import { triggerHaptic } from '../utils/haptics';
import { matchesSearch } from '../utils/searchUtils';
import { ArrowLeft, Music } from 'lucide-react';
import pantocrator from '../assets/images/pantocrator.webp';

// Services whose chant lists exist; the rest show "coming soon"
const SERVICE_CHANTS: Partial<Record<NonNullable<ServiceType>, ChantItem[]>> = {
  'წირვა': TSIRVA_CHANTS,
  'მწუხრი': MWUKHRI_CHANTS,
  'ცისკარი': CISKARI_CHANTS,
  'სადღესასწაულო': SADGHESASWAULO_CHANTS,
  'მარხვანი': MARXVANI_CHANTS,
  'ზატიკი': ZATIKI_CHANTS,
};
// "მთელი წირვის ჩამოწერა"
const SERVICE_GENITIVE: Partial<Record<NonNullable<ServiceType>, string>> = {
  'წირვა': 'წირვის', 'მწუხრი': 'მწუხრის', 'ცისკარი': 'ცისკრის', 'სადღესასწაულო': 'სადღესასწაულოს', 'მარხვანი': 'მარხვანის', 'ზატიკი': 'ზატიკის',
};
const SERVICE_TITLES: Partial<Record<NonNullable<ServiceType>, string>> = {
  'წირვა': 'წირვის საგალობლები',
  'მწუხრი': 'მწუხრის საგალობლები',
  'ცისკარი': 'ცისკრის საგალობლები',
  'სადღესასწაულო': 'სადღესასწაულო საგალობლები',
  'მარხვანი': 'მარხვანის საგალობლები',
  'ზატიკი': 'ზატიკის საგალობლები',
};

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
  const regent = useNotes().liturgy.role === 'teacher';

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

  const serviceChants = selectedService ? SERVICE_CHANTS[selectedService] : undefined;

  // Unconditionally compute filtered chants at top level (adheres strictly to React Rules of Hooks)
  const filteredChants = useMemo(() => {
    const chants = serviceChants ?? [];
    const search = (chantSearch || '').trim();
    if (!search) return chants;
    return chants.filter((chant) => {
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
  }, [chantSearch, serviceChants]);

  // 1. Service Selection Menu (when no specific service is selected)
  if (!selectedService) {
    return (
      <div className="w-full flex flex-col gap-4">
        {/* same frame as ServiceTabs (px-1 outside, max-w-2xl inside), so the card and the services line up */}
        <div className="w-full px-1"><div className="max-w-2xl mx-auto"><ProgramCard /></div></div>
        <ServiceTabs onSelectService={handleSelectService} />
      </div>
    );
  }

  // 2. Chant list of the service, with unfolding variants
  if (serviceChants) {
    return (
      <div className="galoba-font w-full my-2 px-1 flex flex-col gap-2.5">
        {/* Christ the Saviour at the head of the list: medallion on a soft golden halo + ornament line */}
        <div className="flex flex-col items-center pt-1">
          <div className="relative w-32 sm:w-40">
            {/* the halo sits on the circle (61% down), not on the crown */}
            <div
              aria-hidden
              className="absolute left-1/2 top-[61%] -translate-x-1/2 -translate-y-1/2 w-[115%] aspect-square rounded-full bg-amber-300/35 blur-2xl"
            />
            <img
              src={pantocrator}
              alt="მაცხოვარი"
              width={420}
              height={481}
              draggable={false}
              className="relative block w-full h-auto select-none drop-shadow-[0_8px_16px_rgba(133,80,44,0.28)]"
            />
          </div>
          <div aria-hidden className="mt-2.5 flex items-center gap-2">
            <span className="h-px w-16 sm:w-28 bg-gradient-to-r from-transparent to-amber-500/60" />
            <span className="w-1.5 h-1.5 rotate-45 bg-amber-500/70" />
            <span className="h-px w-16 sm:w-28 bg-gradient-to-l from-transparent to-amber-500/60" />
          </div>
        </div>

        <ProgramCard />

        {/* heading row as in the prototype: title, then a small search and the download on the right */}
        <ChantSearchBar
          title={SERVICE_TITLES[selectedService] ?? 'საგალობლები'}
          searchQuery={chantSearch || ''}
          onSearchChange={setChantSearch}
          resultCount={filteredChants.length}
        >
          <ServiceDownload chants={serviceChants} label={`მთელი ${SERVICE_GENITIVE[selectedService] ?? selectedService}`} />
        </ChantSearchBar>
        {regent && (
          <p className="mx-0.5 text-[11.5px] leading-normal text-[#8c7c6b]">„+“ ვერსიას დღევანდელ წირვაში ამატებს.</p>
        )}

        {/* the chants: cards stacked edge to edge, as in the prototype */}
        <div className="flex flex-col">
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
