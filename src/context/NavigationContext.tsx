import React, { createContext, useContext, useEffect, useState } from 'react';
import { triggerHaptic } from '../utils/haptics';

export type PageType = 'home' | 'profile' | 'galoba' | 'galoba-detail' | 'simghera' | 'mtkmeli' | 'sakravebi' | 'gz' | 'tsinaprebi' | 'bookmark' | 'admin' | 'class' | 'prayer';
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
  handleGoBack: () => void;
  setSelectedService: (service: ServiceType) => void;
  setExpandedChantId: React.Dispatch<React.SetStateAction<string | null>>;
  setChantSearch: (search: string) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [selectedService, setSelectedService] = useState<ServiceType>(null);
  const [expandedChantId, setExpandedChantId] = useState<string | null>(null);
  const [chantSearch, setChantSearch] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedPrayerId, setSelectedPrayerId] = useState<string | null>(null);
  const [prayerReturnPage, setPrayerReturnPage] = useState<PageType>('home');
  const [prayerReturnScroll, setPrayerReturnScroll] = useState(0);

  const navigateTo = (page: PageType) => {
    triggerHaptic(10);
    setCurrentPage(page);
    if (page !== 'galoba-detail' && page !== 'galoba') {
      setSelectedService(null);
      setExpandedChantId(null);
      setChantSearch('');
    }
  };

  const openClass = (classId: string) => {
    setSelectedClassId(classId);
    navigateTo('class');
  };

  const openPrayer = (prayerId: string) => {
    setSelectedPrayerId(prayerId);
    if (currentPage !== 'prayer') {
      setPrayerReturnPage(currentPage);
      setPrayerReturnScroll(window.scrollY);
    }
    navigateTo('prayer');
    window.scrollTo({ top: 0 });
  };

  const handleGoBack = () => {
    triggerHaptic(10);
    if (currentPage === 'prayer') {
      setCurrentPage(prayerReturnPage);
      // back to the list where the prayer was picked
      window.setTimeout(() => window.scrollTo({ top: prayerReturnScroll }), 0);
      return;
    }
    if (currentPage === 'galoba-detail') {
      setCurrentPage('galoba');
      if (!selectedService) {
        setSelectedService('წირვა');
      }
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
        handleGoBack,
        setSelectedService,
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
