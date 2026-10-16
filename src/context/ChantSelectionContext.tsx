import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { FieldPath, deleteField, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from './AuthContext';
import { useModal } from './ModalContext';
import { filterValidVariants } from '../utils/variantValidation';
import { triggerHaptic } from '../utils/haptics';
import { HabitCounts, HabitLog, canTickDay, dayKey, getHabitsWeekKey, habitsThisWeek } from '../utils/habitsWeek';
import { HABIT_ITEMS } from '../data/habitsAndManera';
import { ChantItem, ChantVariant, versionTitle } from '../data/tsirvaChants';

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
  /** the counted habits' numbers per day */
  habitCounts: HabitCounts;
  /** ticks or unticks a habit for a day (today unless given; up to six days back); returns true when it was
   *  ticked (false also when signed out or the day is too old) */
  toggleHabit: (id: string, date?: Date) => boolean;
  toggleHabitToday: (id: string) => boolean;
  /** sets a counted habit's number for a day (today unless given); sent a moment after the last change */
  setHabitCount: (id: string, count: number, date?: Date) => void;
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
  const [habitCounts, setHabitCounts] = useState<HabitCounts>({});

  // A habit is ticked per day; the week's summary (habitsStats) is kept alongside for the admin panel.
  // Only the changed day is sent, so the whole history (kept for the year views) is never rewritten.
  const toggleHabit = (id: string, date: Date = new Date()) => {
    if (!user) {
      openModal('chvevebi');
      return false;
    }
    if (!canTickDay(date)) return false;
    const day = dayKey(date);
    const ids = habitLog[day] || [];
    const turningOn = !ids.includes(id);
    const nextIds = turningOn ? [...ids, id] : ids.filter((h) => h !== id);
    const next = { ...habitLog };
    if (nextIds.length) next[day] = nextIds;
    else delete next[day];
    setHabitLog(next);
    triggerHaptic(15);
    const userDocRef = doc(db, 'students', user.uid);
    const stats = habitsThisWeek(next);
    const week = getHabitsWeekKey();
    (nextIds.length
      ? setDoc(
          userDocRef,
          { habitLog: { [day]: nextIds }, habitsStats: stats, habitsWeek: week },
          { mergeFields: [new FieldPath('habitLog', day), 'habitsStats', 'habitsWeek'] }
        )
      : updateDoc(userDocRef, new FieldPath('habitLog', day), deleteField(), 'habitsStats', stats, 'habitsWeek', week)
    ).catch((err) => {
      console.warn('Firestore habits sync note:', err);
    });
    return turningOn;
  };
  const toggleHabitToday = (id: string) => toggleHabit(id);

  // A counter is tapped many times in a row (the Jesus prayer): the numbers are sent a moment after the last tap,
  // and until then a snapshot from elsewhere must not take them back.
  const unsentCounts = useRef<HabitCounts>({});
  const countTimer = useRef<number | undefined>(undefined);
  const uidRef = useRef<string | null>(null);
  uidRef.current = user?.uid ?? null;

  const sendCounts = () => {
    window.clearTimeout(countTimer.current);
    const unsent = unsentCounts.current;
    unsentCounts.current = {};
    const uid = uidRef.current;
    const paths = Object.entries(unsent).flatMap(([day, byId]) => Object.keys(byId).map((id) => new FieldPath('habitCounts', day, id)));
    if (!uid || !paths.length) return;
    setDoc(doc(db, 'students', uid), { habitCounts: unsent }, { mergeFields: paths }).catch((err) =>
      console.warn('Firestore habit counts note:', err)
    );
  };

  const setHabitCount = (id: string, count: number, date: Date = new Date()) => {
    if (!user || !canTickDay(date)) return;
    const day = dayKey(date);
    const n = Math.max(0, Math.min(99999, Math.round(count) || 0));
    setHabitCounts((prev) => ({ ...prev, [day]: { ...prev[day], [id]: n } }));
    unsentCounts.current = { ...unsentCounts.current, [day]: { ...unsentCounts.current[day], [id]: n } };
    window.clearTimeout(countTimer.current);
    countTimer.current = window.setTimeout(sendCounts, 1200);
  };

  // closing the app right after the last tap still keeps the number
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && sendCounts();
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      sendCounts();
    };
  }, []);

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
        fullTitle: versionTitle(chant, v),
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
      setHabitCounts({});
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
          // the numbers still being typed stay over what the server has
          const counts: HabitCounts = data?.habitCounts && typeof data.habitCounts === 'object' ? { ...data.habitCounts } : {};
          for (const [day, byId] of Object.entries(unsentCounts.current)) counts[day] = { ...counts[day], ...byId };
          setHabitCounts(counts);
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
        habitCounts,
        toggleHabit,
        toggleHabitToday,
        setHabitCount,
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
