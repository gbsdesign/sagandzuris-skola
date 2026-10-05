import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from './AuthContext';
import { useModal } from './ModalContext';
import { filterValidVariants } from '../utils/variantValidation';
import { triggerHaptic } from '../utils/haptics';
import { HabitLog, dayKey, getHabitsWeekKey, habitsThisWeek, pruneHabitLog } from '../utils/habitsWeek';
import { HABIT_ITEMS } from '../data/habitsAndManera';
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
  habitLog: HabitLog;
  /** ticks or unticks a habit for today; returns true when it was ticked (false also when signed out) */
  toggleHabitToday: (id: string) => boolean;
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
  const [habitLog, setHabitLog] = useState<HabitLog>({});

  // A habit is ticked per day; the week's summary (habitsStats) is kept alongside for the admin panel.
  const toggleHabitToday = (id: string) => {
    if (!user) {
      openModal('chvevebi');
      return false;
    }
    const today = dayKey(new Date());
    const day = habitLog[today] || [];
    const turningOn = !day.includes(id);
    const next = pruneHabitLog({ ...habitLog, [today]: turningOn ? [...day, id] : day.filter((h) => h !== id) });
    setHabitLog(next);
    triggerHaptic(15);
    const userDocRef = doc(db, 'students', user.uid);
    setDoc(
      userDocRef,
      { habitLog: next, habitsStats: habitsThisWeek(next), habitsWeek: getHabitsWeekKey() },
      { mergeFields: ['habitLog', 'habitsStats', 'habitsWeek'] }
    ).catch((err) => {
      console.warn('Firestore habits sync note:', err);
    });
    return turningOn;
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
      setHabitLog({});
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
          if (data?.habitLog) {
            setHabitLog(data.habitLog);
          } else {
            // This week's marks from before the daily log count as today's, so nobody loses them on deploy.
            const week = data?.habitsWeek === getHabitsWeekKey() ? data.habitsStats || {} : {};
            const ids = HABIT_ITEMS.filter((h) => week[h.id]).map((h) => h.id);
            const seeded: HabitLog = ids.length ? { [dayKey(new Date())]: ids } : {};
            setHabitLog(seeded);
            if (ids.length) {
              setDoc(userDocRef, { habitLog: seeded }, { mergeFields: ['habitLog'] }).catch((err) =>
                console.warn('Firestore habit log note:', err)
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
        habitLog,
        toggleHabitToday,
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
