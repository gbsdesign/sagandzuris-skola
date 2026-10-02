import React, { createContext, useContext, useEffect, useState } from 'react';
import { triggerHaptic } from '../utils/haptics';

export type PageType = 'home' | 'profile' | 'galoba' | 'galoba-detail' | 'simghera' | 'mtkmeli' | 'sakravebi' | 'gz' | 'bookmark' | 'admin';
export type ServiceType = 'წირვა' | 'მწუხრი' | 'ცისკარი' | 'სადღესასწაულო' | 'მარხვანი' | 'ზატიკი' | null;

export interface NavigationContextType {
  currentPage: PageType;
  selectedService: ServiceType;
  expandedChantId: string | null;
  chantSearch: string;
  navigateTo: (page: PageType) => void;
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

  const navigateTo = (page: PageType) => {
    triggerHaptic(10);
    setCurrentPage(page);
    if (page !== 'galoba-detail' && page !== 'galoba') {
      setSelectedService(null);
      setExpandedChantId(null);
      setChantSearch('');
    }
  };

  const handleGoBack = () => {
    triggerHaptic(10);
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
