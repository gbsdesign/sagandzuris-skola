import React, { useMemo, useCallback, useState } from 'react';
import { useNavigation, useChants, useAuth, ServiceType } from '../context';
import { useMyClasses } from '../hooks/useClasses';
import { ChantItem, ChantVariant } from '../data';
import { getChantMedia } from '../data/chantMediaRegistry';
import { chantRecordings } from '../data/chantRecordings';
import { useRecordingBindings } from '../data/runtimeRecordings';
import { ServiceTabs, ChantSearchBar, ChantAccordionItem } from './galoba';
import { ProgramCard, ServiceDownload } from './galoba/LiturgyBits';
import { SERVICE_CHANTS, chantMatches, ChantHit } from './galoba/chantSearch';
import { SearchField, SearchResults } from './galoba/SearchResults';
import { useNotes } from '../context/NotesContext';
import { triggerHaptic } from '../utils/haptics';
import { prepareSearch } from '../utils/searchUtils';
import { GraduationCap } from 'lucide-react';
import pantocrator from '../assets/images/pantocrator.webp';

// "მთელი წირვის ჩამოწერა"
const SERVICE_GENITIVE: Partial<Record<NonNullable<ServiceType>, string>> = {
  'წირვა': 'წირვის', 'მწუხრი': 'მწუხრის', 'ცისკარი': 'ცისკრის', 'სადღესასწაულო': 'სადღესასწაულოს', 'მარხვანი': 'მარხვანის', 'ზატიკი': 'ზატიკის', 'მომიხსენენი': 'მომიხსენენის', 'ძლისპირები': 'ძლისპირების', 'კატაბასიები': 'კატაბასიების',
};
const SERVICE_TITLES: Partial<Record<NonNullable<ServiceType>, string>> = {
  'წირვა': 'წირვის საგალობლები',
  'მწუხრი': 'მწუხრის საგალობლები',
  'ცისკარი': 'ცისკრის საგალობლები',
  'სადღესასწაულო': 'სადღესასწაულო საგალობლები',
  'მარხვანი': 'მარხვანის საგალობლები',
  'ზატიკი': 'ზატიკის საგალობლები',
  'მომიხსენენი': 'მომიხსენენი',
  'ძლისპირები': 'ძლისპირები',
  'კატაბასიები': 'კატაბასიები',
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
  const [medallionIn, setMedallionIn] = useState(false);
  const toggleShowAll = () => {
    triggerHaptic(10);
    setShowAll(v => { try { sessionStorage.setItem('sg-class-mode-all', v ? '0' : '1'); } catch { /* storage blocked */ } return !v; });
  };

  const serviceChants = useMemo(
    () => {
      const all = selectedService ? SERVICE_CHANTS[selectedService] : [];
      return classOnly
        ? all.map(c => ({ ...c, variants: (c.variants || []).filter(v => programIds.has(v.id)) })).filter(c => c.variants.length > 0)
        : all;
    },
    [selectedService, classOnly, programIds]
  );
  // in class mode the search elsewhere also keeps to the program
  const keepChant = useMemo(
    () => (classOnly ? (c: ChantItem) => (c.variants || []).some(v => programIds.has(v.id)) : undefined),
    [classOnly, programIds]
  );

  // one search for everything: this service's list, the other services, the songs and the prayers
  const query = useMemo(() => prepareSearch(chantSearch || ''), [chantSearch]);
  const filteredChants = useMemo(
    () => (query ? serviceChants.filter(c => chantMatches(c, query)) : serviceChants),
    [query, serviceChants]
  );

  // versions with a recording, looked up once for the whole list (re-made when the panel binds a new one)
  const bindings = useRecordingBindings();
  const recorded = useMemo(() => {
    const keys = new Set<string>();
    for (const c of serviceChants) for (const v of c.variants || []) if (getChantMedia(c.id, v.code) || chantRecordings(v.id).length) keys.add(`${c.id}|${v.code}`);
    return keys;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceChants, bindings, user]);

  // a hit in another service: that service opens with the chant unfolded, the search stays
  const openHit = useCallback((hit: ChantHit) => {
    setSelectedService(hit.service);
    setExpandedChantId(hit.chant.id);
    window.scrollTo({ top: 0 });
  }, [setSelectedService, setExpandedChantId]);

  // 1. The services, under a small title and the search in all of them
  if (!selectedService) {
    return (
      <div className="galoba-font w-full px-1 flex flex-col gap-4">
        <div className="w-full max-w-2xl mx-auto flex flex-col gap-3">
          <h1 className="mx-1 font-serif-ge text-[22px] sm:text-2xl font-bold leading-tight text-[#7a2028]">გალობა</h1>
          <SearchField value={chantSearch || ''} onChange={setChantSearch} placeholder="ძიება ყველა მსახურებაში" />
          {query ? (
            // a tall box, so the centred page doesn't jump up and down while typing
            <div className="min-h-[60vh]">
              <SearchResults query={query} keepChant={keepChant} onOpenChant={openHit} />
            </div>
          ) : (
            <ProgramCard />
          )}
        </div>
        {!query && <ServiceTabs onSelectService={handleSelectService} />}
      </div>
    );
  }

  // 2. Chant list of the service, with unfolding variants
  const title = SERVICE_TITLES[selectedService] ?? 'საგალობლები';
  return (
    <div className="galoba-font w-full my-2 px-1 flex flex-col gap-2.5">
      {/* Christ the Saviour at the head of the list. Phone: a small medallion beside the title, so the list
          starts on the first screen; computer: large, on a soft golden halo that shows only once the image is in */}
      <div className="flex items-center gap-3 sm:flex-col sm:gap-0 sm:pt-1">
        <div className="relative shrink-0 w-[68px] sm:w-40">
          <div
            aria-hidden
            className={`hidden sm:block absolute left-1/2 top-[61%] -translate-x-1/2 -translate-y-1/2 w-[115%] aspect-square rounded-full bg-amber-300/35 blur-2xl transition-opacity duration-500 ${medallionIn ? 'opacity-100' : 'opacity-0'}`}
          />
          <img
            src={pantocrator}
            alt="მაცხოვარი"
            width={420}
            height={481}
            draggable={false}
            ref={el => { if (el?.complete && !medallionIn) setMedallionIn(true); }}
            onLoad={() => setMedallionIn(true)}
            className="relative block w-full h-auto select-none drop-shadow-[0_4px_8px_rgba(133,80,44,0.25)] sm:drop-shadow-[0_8px_16px_rgba(133,80,44,0.28)]"
          />
        </div>
        <div className="sm:hidden min-w-0">
          <h1 className="font-serif-ge text-[21px] font-bold leading-tight text-[#7a2028] text-balance">{title}</h1>
          <p className="mt-0.5 text-[12px] font-semibold text-[#8c7c6b]">{serviceChants.length} საგალობელი</p>
        </div>
        <div aria-hidden className="hidden sm:flex mt-2.5 items-center gap-2">
          <span className="h-px w-28 bg-gradient-to-r from-transparent to-amber-500/60" />
          <span className="w-1.5 h-1.5 rotate-45 bg-amber-500/70" />
          <span className="h-px w-28 bg-gradient-to-l from-transparent to-amber-500/60" />
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

      {/* heading row: the title (on a computer), the search and the download */}
      <ChantSearchBar
        title={title}
        phoneTitle={false}
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
        {filteredChants.map((chant: ChantItem) => (
          <ChantAccordionItem
            key={chant.id}
            chant={chant}
            isExpanded={expandedChantId === chant.id}
            onToggleExpand={() => handleToggleExpand(chant.id)}
            selectedChantVariants={selectedChantVariants}
            onToggleVariant={handleToggleVariant}
            recorded={recorded}
          />
        ))}
      </div>

      {/* searching: what this service lacks may be in another one, a song or a prayer */}
      {query && (
        <div className="mt-3 flex flex-col gap-3">
          {filteredChants.length === 0 && (
            <p className="mx-1 text-[13px] font-semibold text-[#8c7c6b]">ამ მსახურებაში ვერ მოიძებნა.</p>
          )}
          <SearchResults
            query={query}
            skipService={selectedService}
            keepChant={keepChant}
            onOpenChant={openHit}
            emptyAbove={filteredChants.length === 0}
          />
        </div>
      )}
    </div>
    );
};
