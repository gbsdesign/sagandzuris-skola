import React, { useMemo, useCallback, useState } from 'react';
import { useNavigation, useChants, useAuth, ServiceType } from '../context';
import { useMyClasses } from '../hooks/useClasses';
import { TSIRVA_CHANTS, MWUKHRI_CHANTS, CISKARI_CHANTS, SADGHESASWAULO_CHANTS, MARXVANI_CHANTS, ZATIKI_CHANTS, ChantItem, ChantVariant } from '../data';
import { ServiceTabs, ChantSearchBar, ChantAccordionItem } from './galoba';
import { ProgramCard, ServiceDownload } from './galoba/LiturgyBits';
import { useNotes } from '../context/NotesContext';
import { triggerHaptic } from '../utils/haptics';
import { matchesSearch } from '../utils/searchUtils';
import { ArrowLeft, Music, GraduationCap } from 'lucide-react';
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

  // "კლასის რეჟიმი": a class whose teacher turned it on sees only its program's versions (one tap shows all)
  const { user, isTeacher } = useAuth();
  const myClasses = useMyClasses(user?.uid);
  const modeClass = isTeacher ? undefined : myClasses.find(c => c.classMode && c.program.some(p => p.id));
  const programIds = useMemo(() => new Set((modeClass?.program || []).map(p => p.id).filter(Boolean) as string[]), [modeClass]);
  const [showAll, setShowAll] = useState(() => { try { return sessionStorage.getItem('sg-class-mode-all') === '1'; } catch { return false; } });
  const classOnly = Boolean(modeClass) && !showAll;
  const toggleShowAll = () => {
    triggerHaptic(10);
    setShowAll(v => { try { sessionStorage.setItem('sg-class-mode-all', v ? '0' : '1'); } catch { /* storage blocked */ } return !v; });
  };

  const allServiceChants = selectedService ? SERVICE_CHANTS[selectedService] : undefined;
  const serviceChants = useMemo(
    () => (allServiceChants && classOnly
      ? allServiceChants
          .map(c => ({ ...c, variants: (c.variants || []).filter(v => programIds.has(v.id)) }))
          .filter(c => c.variants.length > 0)
      : allServiceChants),
    [allServiceChants, classOnly, programIds]
  );

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

        {modeClass && (
          <div className={`flex flex-wrap items-center gap-x-3 gap-y-2.5 p-3 rounded-2xl ring-1 ${classOnly ? 'bg-[#7a2028]/[0.05] ring-[#7a2028]/20' : 'bg-white/80 ring-[#e8dcc8]'}`}>
            <span className="w-9 h-9 rounded-xl bg-[#7a2028] text-[#fbf6ec] flex items-center justify-center shrink-0"><GraduationCap className="w-[18px] h-[18px]" /></span>
            <span className="flex-1 min-w-[10rem] leading-snug">
              <span className="block text-[13px] font-bold text-[#4a3426]">კლასის რეჟიმი · {modeClass.name}</span>
              <span className="block text-[12px] text-[#8a7a6a]">{classOnly ? 'ჩანს მხოლოდ კლასის პროგრამის ვერსიები' : 'ახლა ყველა ვერსია ჩანს'}</span>
            </span>
            <button type="button" onClick={toggleShowAll} className="ml-auto h-10 px-4 rounded-full bg-white ring-1 ring-[#e8dcc8] text-[13px] font-bold text-[#7a2028] cursor-pointer shrink-0 active:scale-95">
              {classOnly ? 'ყველაფრის ჩვენება' : 'მხოლოდ პროგრამა'}
            </button>
          </div>
        )}

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
