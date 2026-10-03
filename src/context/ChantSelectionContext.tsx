import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from './AuthContext';
import { useModal } from './ModalContext';
import { filterValidVariants } from '../utils/variantValidation';
import { triggerHaptic } from '../utils/haptics';
import { getHabitsWeekKey } from '../utils/habitsWeek';
import { ChantItem, ChantVariant } from '../data/tsirvaChants';

export interface SelectedChantVariant {
  variantId: string;
  chantId: string;
  chantName: string;
  code: string;
  label: string;
  fullTitle: string;
  isLearned?: boolean;
  voices?: ('1' | '2' | '3')[];
}

export interface ChantSelectionContextType {
  selectedChantVariants: Record<string, SelectedChantVariant>;
  maneraStats: Record<string, string>;
  habitsStats: Record<string, boolean>;
  saveHabitsToFirestore: (nextStats: Record<string, boolean>) => void;
  saveManeraToFirestore: (nextStats: Record<string, string>) => void;
  saveVariantsToFirestoreAndStorage: (nextVariants: Record<string, any>) => void;
  toggleVariantSelection: (chant: ChantItem, v: ChantVariant) => void;
  handleToggleSong: (songId: string, songTitle: string, regionCode: string, regionName: string) => void;
  handleTogglePoem: (poemId: string, poemTitle: string, author: string, regionCode: string, regionName: string) => void;
  handleToggleInstrument: (instrumentId: string, instrumentName: string) => void;
  setSelectedChantVariants: React.Dispatch<React.SetStateAction<Record<string, SelectedChantVariant>>>;
}

const ChantSelectionContext = createContext<ChantSelectionContextType | undefined>(undefined);

export const ChantSelectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { openModal } = useModal();
  const [selectedChantVariants, setSelectedChantVariants] = useState<Record<string, SelectedChantVariant>>({});
  const [maneraStats, setManeraStats] = useState<Record<string, string>>({});
  const [storedHabits, setStoredHabits] = useState<Record<string, boolean>>({});
  const [habitsWeek, setHabitsWeek] = useState('');

  // Marks saved in an earlier week are hidden: the checklist starts over every Sunday 09:00.
  const habitsStats = habitsWeek === getHabitsWeekKey() ? storedHabits : {};

  const saveHabitsToFirestore = (nextStats: Record<string, boolean>) => {
    if (!user) {
      openModal('chvevebi');
      return;
    }
    const weekKey = getHabitsWeekKey();
    setStoredHabits(nextStats);
    setHabitsWeek(weekKey);
    triggerHaptic(15);
    const userDocRef = doc(db, 'students', user.uid);
    setDoc(
      userDocRef,
      { habitsStats: nextStats, habitsWeek: weekKey },
      { mergeFields: ['habitsStats', 'habitsWeek'] }
    ).catch((err) => {
      console.warn('Firestore habits sync note:', err);
    });
  };

  const saveManeraToFirestore = (nextStats: Record<string, string>) => {
    if (!user) {
      openModal('manera');
      return;
    }
    setManeraStats(nextStats);
    triggerHaptic(15);
    const userDocRef = doc(db, 'students', user.uid);
    setDoc(userDocRef, { maneraStats: nextStats }, { mergeFields: ['maneraStats'] }).catch((err) => {
      console.warn('Firestore manera sync note:', err);
    });
  };

  const saveVariantsToFirestoreAndStorage = (nextVariants: Record<string, any>) => {
    if (!user) {
      openModal('bookmark');
      return;
    }

    const cleaned = filterValidVariants(nextVariants);
    setSelectedChantVariants(cleaned);

    const userDocRef = doc(db, 'students', user.uid);
    setDoc(userDocRef, { selectedChantVariants: cleaned }, { mergeFields: ['selectedChantVariants'] }).catch((err) => {
      console.warn('Firestore sync note:', err);
    });
  };

  const toggleVariantSelection = (chant: ChantItem, v: ChantVariant) => {
    if (!user) {
      triggerHaptic(20);
      openModal('bookmark');
      return;
    }

    const next = { ...selectedChantVariants };
    if (next[v.id]) {
      delete next[v.id];
    } else {
      next[v.id] = {
        variantId: v.id,
        chantId: chant.id,
        chantName: chant.title,
        code: v.code,
        label: v.label,
        fullTitle: v.fullTitle,
        isLearned: false,
        voices: [],
      };
    }
    saveVariantsToFirestoreAndStorage(next);
  };

  const handleToggleSong = (songId: string, songTitle: string, regionCode: string, regionName: string) => {
    if (!user) {
      triggerHaptic(20);
      openModal('bookmark');
      return;
    }

    const next = { ...selectedChantVariants };
    if (next[songId]) {
      delete next[songId];
    } else {
      next[songId] = {
        variantId: songId,
        chantId: songId,
        chantName: `${songTitle} (${regionName})`,
        code: regionCode,
        label: regionName,
        fullTitle: `${songTitle} (${regionName})`,
        isLearned: false,
        voices: [],
      };
    }
    saveVariantsToFirestoreAndStorage(next);
  };

  const handleTogglePoem = (poemId: string, poemTitle: string, author: string, regionCode: string, regionName: string) => {
    if (!user) {
      triggerHaptic(20);
      openModal('bookmark');
      return;
    }

    const next = { ...selectedChantVariants };
    if (next[poemId]) {
      delete next[poemId];
    } else {
      next[poemId] = {
        variantId: poemId,
        chantId: poemId,
        chantName: `${poemTitle} - ${author} (${regionName})`,
        code: regionCode,
        label: regionName,
        fullTitle: `${poemTitle} - ${author} (${regionName})`,
        isLearned: false,
        voices: [],
      };
    }
    saveVariantsToFirestoreAndStorage(next);
  };

  const handleToggleInstrument = (instrumentId: string, instrumentName: string) => {
    if (!user) {
      triggerHaptic(20);
      openModal('bookmark');
      return;
    }

    const next = { ...selectedChantVariants };
    if (next[instrumentId]) {
      delete next[instrumentId];
    } else {
      next[instrumentId] = {
        variantId: instrumentId,
        chantId: instrumentId,
        chantName: instrumentName,
        code: 'საკრავი',
        label: instrumentName,
        fullTitle: instrumentName,
        isLearned: false,
        voices: [],
      };
    }
    saveVariantsToFirestoreAndStorage(next);
  };

  // Sync with Firestore strictly when user is authenticated
  useEffect(() => {
    if (!user) {
      setSelectedChantVariants({});
      setManeraStats({});
      setStoredHabits({});
      setHabitsWeek('');
      return;
    }

    const userDocRef = doc(db, 'students', user.uid);
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data?.selectedChantVariants) {
            setSelectedChantVariants(filterValidVariants(data.selectedChantVariants));
          } else {
            setSelectedChantVariants({});
          }
          if (data?.maneraStats) {
            setManeraStats(data.maneraStats);
          }
          if (data?.habitsStats) {
            setStoredHabits(data.habitsStats);
            if (data.habitsWeek) {
              setHabitsWeek(data.habitsWeek);
            } else {
              // Marks saved before the weekly reset existed count as this week's, so nobody loses them on deploy.
              const weekKey = getHabitsWeekKey();
              setHabitsWeek(weekKey);
              setDoc(userDocRef, { habitsWeek: weekKey }, { mergeFields: ['habitsWeek'] }).catch((err) =>
                console.warn('Firestore habits week note:', err)
              );
            }
          }
        } else {
          // Initialize new student doc
          setDoc(userDocRef, {
            email: user.email || '',
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            selectedChantVariants: {},
            maneraStats: {},
            habitsStats: {},
            createdAt: new Date().toISOString(),
          }).catch((err) => console.warn('Init student doc note:', err));
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `students/${user.uid}`);
      }
    );

    return () => unsubscribe();
  }, [user]);

  return (
    <ChantSelectionContext.Provider
      value={{
        selectedChantVariants,
        maneraStats,
        habitsStats,
        saveHabitsToFirestore,
        saveManeraToFirestore,
        saveVariantsToFirestoreAndStorage,
        toggleVariantSelection,
        handleToggleSong,
        handleTogglePoem,
        handleToggleInstrument,
        setSelectedChantVariants,
      }}
    >
      {children}
    </ChantSelectionContext.Provider>
  );
};

export const useChants = (): ChantSelectionContextType => {
  const context = useContext(ChantSelectionContext);
  if (!context) {
    throw new Error('useChants must be used within a ChantSelectionProvider');
  }
  return context;
};
