import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { triggerHaptic } from '../utils/haptics';

export type ModalType = 'profile' | 'bookmark' | 'chvevebi' | 'manera' | 'gza' | 'docFilms' | 'drive' | null;

export interface ModalContextType {
  activeModal: ModalType;
  openModal: (modal: NonNullable<ModalType>) => void;
  closeModal: () => void;
  isModalOpen: (modal: NonNullable<ModalType>) => boolean;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const openModal = useCallback((modal: NonNullable<ModalType>) => {
    triggerHaptic(10);
    setActiveModal(modal);
  }, []);

  const closeModal = useCallback(() => {
    triggerHaptic(8);
    setActiveModal(null);
  }, []);

  const isModalOpen = useCallback(
    (modal: NonNullable<ModalType>) => activeModal === modal,
    [activeModal]
  );

  // Global Desktop Accessibility (a11y): Escape key to close active modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && activeModal !== null) {
        closeModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModal, closeModal]);

  return (
    <ModalContext.Provider
      value={{
        activeModal,
        openModal,
        closeModal,
        isModalOpen,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = (): ModalContextType => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};
