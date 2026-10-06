import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { triggerHaptic } from '../utils/haptics';

export type PageType = 'home' | 'profile' | 'galoba' | 'simghera' | 'mtkmeli' | 'sakravebi' | 'gz' | 'tsinaprebi' | 'bookmark' | 'admin' | 'teacher' | 'class' | 'prayer' | 'commemoration' | 'biblioteka' | 'psalter';
export type ServiceType = 'წირვა' | 'მწუხრი' | 'ცისკარი' | 'სადღესასწაულო' | 'მარხვანი' | 'ზატიკი' | null;

export interface NavigationContextType {
  currentPage: PageType;
  selectedService: ServiceType;
  expandedChantId: string | null;
  chantSearch: string;
  navigateTo: (page: PageType) => void;
  // the class shown on the 'class' page
  selectedClassId: string | null;
  openClass: (classId: string) => void;
  // the prayer shown on the 'prayer' page (an id from data/prayers)
  selectedPrayerId: string | null;
  openPrayer: (prayerId: string) => void;
  // "მოსახსენებელი": the student's name lists
  openCommemoration: () => void;
  // the region open on the songs / მთქმელი map, or the instrument open on the instruments page
  // (its own history step, so "back" first returns to the map)
  mapItem: string | null;
  openMapItem: (id: string) => void;
  handleGoBack: () => void;
  setSelectedService: (service: ServiceType) => void;
  setExpandedChantId: React.Dispatch<React.SetStateAction<string | null>>;
  setChantSearch: (search: string) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

// Every step inside the app (a page, a service's chant list, a class, a prayer) is a browser history entry
// { sgNav, sgDepth }, so the phone's back gesture / button goes one step back instead of leaving the app.
// The notes page and "დღევანდელი წირვა" keep their own entries (NotesContext: sgNotes / sgProg).
interface NavSnap { page: PageType; service: ServiceType; classId: string | null; prayerId: string | null; mapItem?: string | null }
const HOME: NavSnap = { page: 'home', service: null, classId: null, prayerId: null, mapItem: null };
const MAP_PAGES: PageType[] = ['simghera', 'mtkmeli', 'sakravebi'];
const makeSnap = (page: PageType, service: ServiceType, classId: string | null, prayerId: string | null, mapItem: string | null): NavSnap => ({
  page,
  service: page === 'galoba' ? service : null,
  classId: page === 'class' ? classId : null,
  prayerId: page === 'prayer' ? prayerId : null,
  mapItem: MAP_PAGES.includes(page) ? mapItem : null,
});
const sameSnap = (a?: NavSnap | null, b?: NavSnap | null) =>
  Boolean(a && b) && a!.page === b!.page && a!.service === b!.service && a!.classId === b!.classId && a!.prayerId === b!.prayerId &&
  (a!.mapItem ?? null) === (b!.mapItem ?? null);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const historyState = (): Record<string, any> => (typeof window !== 'undefined' && window.history.state) || {};

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // a reload stays on the page it was on
  const [boot] = useState<NavSnap | null>(() => historyState().sgNav ?? null);
  const [currentPage, setCurrentPage] = useState<PageType>(boot?.page ?? 'home');
  const [selectedService, setSelectedService] = useState<ServiceType>(boot?.service ?? null);
  const [expandedChantId, setExpandedChantId] = useState<string | null>(null);
  const [chantSearch, setChantSearch] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(boot?.classId ?? null);
  const [selectedPrayerId, setSelectedPrayerId] = useState<string | null>(boot?.prayerId ?? null);
  const [mapItem, setMapItem] = useState<string | null>(boot?.mapItem ?? null);
  // pages a prayer or the name lists were opened from, so "back" retraces them
  const [returnStack, setReturnStack] = useState<{ page: PageType; scroll: number; prayerId: string | null }[]>([]);

  const snap = makeSnap(currentPage, selectedService, selectedClassId, selectedPrayerId, mapItem);
  const snapRef = useRef(snap);
  snapRef.current = snap;
  // the scroll of the page being left, read before the new page changes it; and "replace instead of push"
  const leaving = useRef<{ y: number; t: number } | null>(null);
  const replaceNext = useRef(0);
  const markLeave = () => { if (!leaving.current) leaving.current = { y: window.scrollY, t: performance.now() }; };
  // the open chant and the search of the page being left (values of the previous render)
  const prevList = useRef({ exp: expandedChantId, search: chantSearch });

  useEffect(() => {
    try { window.history.scrollRestoration = 'manual'; } catch { /* very old browsers */ }
    const s = historyState();
    if (!s.sgNav) window.history.replaceState({ ...s, sgNav: snapRef.current, sgDepth: 0 }, '');
    const onPop = (e: PopStateEvent) => {
      const st = e.state || {};
      if (st.sgNotes || st.sgProg) return; // the notes / program pages handle their own entries
      let target: NavSnap | undefined = st.sgNav;
      if (!target) {
        target = HOME;
        window.history.replaceState({ ...st, sgNav: HOME, sgDepth: 0 }, '');
      }
      const cur = snapRef.current;
      if (sameSnap(cur, target)) return; // e.g. the notes page closed over this same list
      if ((cur.page === 'prayer' || cur.page === 'commemoration') && target.page !== cur.page) setReturnStack(stack => stack.slice(0, -1));
      setCurrentPage(target.page);
      setSelectedService(target.service);
      if (target.classId) setSelectedClassId(target.classId);
      if (target.prayerId) setSelectedPrayerId(target.prayerId);
      setMapItem(target.mapItem ?? null);
      setExpandedChantId(st.sgExp ?? null);
      setChantSearch(st.sgSearch ?? '');
      const y = st.sgScroll ?? 0;
      window.setTimeout(() => window.scrollTo({ top: y }), 0);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // a new step: a new history entry (the page being left remembers its scroll, open chant and search)
  useEffect(() => {
    const s = historyState();
    if (s.sgNotes || s.sgProg) return; // an overlay's entry is on top: leave it alone
    if (sameSnap(s.sgNav, snap)) return; // already recorded, or just restored by back / forward
    const now = performance.now();
    const y = leaving.current && now - leaving.current.t < 1500 ? leaving.current.y : window.scrollY;
    leaving.current = null;
    const prev: NavSnap | undefined = s.sgNav;
    // going "up" with nothing behind, or turning a prayer's chapters: this entry is replaced
    if ((replaceNext.current && now - replaceNext.current < 1500) || (prev?.page === 'prayer' && snap.page === 'prayer')) {
      replaceNext.current = 0;
      window.history.replaceState({ ...s, sgNav: snap, sgDepth: s.sgDepth ?? 0 }, '');
      return;
    }
    window.history.replaceState({ ...s, sgNav: prev ?? HOME, sgDepth: s.sgDepth ?? 0, sgScroll: y, sgExp: prevList.current.exp, sgSearch: prevList.current.search }, '');
    window.history.pushState({ sgNav: snap, sgDepth: (s.sgDepth ?? 0) + 1 }, '', window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap.page, snap.service, snap.classId, snap.prayerId, snap.mapItem]);
  // after the effect above, so it still sees the previous values
  useEffect(() => { prevList.current = { exp: expandedChantId, search: chantSearch }; });

  const selectService = (service: ServiceType) => {
    markLeave();
    setSelectedService(service);
  };

  const navigateTo = (page: PageType) => {
    triggerHaptic(10);
    markLeave();
    setCurrentPage(page);
    setMapItem(null);
    if (page !== 'galoba') {
      setSelectedService(null);
      setExpandedChantId(null);
      setChantSearch('');
    }
  };

  const openClass = (classId: string) => {
    setSelectedClassId(classId);
    navigateTo('class');
  };

  const openMapItem = (id: string) => {
    triggerHaptic(10);
    markLeave();
    setMapItem(id);
    // the list starts at its top; "back" brings the map back where it was
    window.setTimeout(() => window.scrollTo({ top: 0 }), 0);
  };

  const pushReturn = () => setReturnStack(stack => [...stack, { page: currentPage, scroll: window.scrollY, prayerId: selectedPrayerId }]);

  const openPrayer = (prayerId: string) => {
    setSelectedPrayerId(prayerId);
    // moving between chapters or prayers replaces the page instead of stacking it
    if (currentPage !== 'prayer') pushReturn();
    navigateTo('prayer');
    window.scrollTo({ top: 0 });
  };

  const openCommemoration = () => {
    if (currentPage === 'commemoration') return;
    pushReturn();
    navigateTo('commemoration');
    window.scrollTo({ top: 0 });
  };

  const handleGoBack = () => {
    triggerHaptic(10);
    // a step inside the app lies behind this page: return to it, exactly like the phone's back gesture
    const hs = historyState();
    if (!hs.sgNotes && !hs.sgProg && (hs.sgDepth ?? 0) > 0) {
      window.history.back();
      return;
    }
    // opened straight here (a link, a reload): go up one level in place
    replaceNext.current = performance.now();
    if (currentPage === 'prayer' || currentPage === 'commemoration') {
      const back = returnStack[returnStack.length - 1] || { page: 'home' as PageType, scroll: 0, prayerId: null };
      setReturnStack(stack => stack.slice(0, -1));
      if (back.page === 'prayer') setSelectedPrayerId(back.prayerId);
      setCurrentPage(back.page);
      // back to the place the prayer was picked
      window.setTimeout(() => window.scrollTo({ top: back.scroll }), 0);
      return;
    }
    if (mapItem) {
      setMapItem(null);
      return;
    }
    if (selectedService) {
      setSelectedService(null);
      setExpandedChantId(null);
      setChantSearch('');
      return;
    }
    setCurrentPage('home');
    setSelectedService(null);
    setExpandedChantId(null);
    setChantSearch('');
  };

  return (
    <NavigationContext.Provider
      value={{
        currentPage,
        selectedService,
        expandedChantId,
        chantSearch,
        navigateTo,
        selectedClassId,
        openClass,
        selectedPrayerId,
        openPrayer,
        openCommemoration,
        mapItem,
        openMapItem,
        handleGoBack,
        setSelectedService: selectService,
        setExpandedChantId,
        setChantSearch,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
