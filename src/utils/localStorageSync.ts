import { filterValidVariants } from './variantValidation';
import { SelectedChantVariant } from '../context/ChantSelectionContext';

const GUEST_VARIANTS_KEY = 'sagandzuri_guest_variants';
const GUEST_HABITS_KEY = 'sagandzuri_guest_habits';
const GUEST_MANERA_KEY = 'sagandzuri_guest_manera';

export interface GuestData {
  variants: Record<string, SelectedChantVariant>;
  habits: Record<string, boolean>;
  manera: Record<string, string>;
}

export const loadGuestData = (): GuestData => {
  try {
    const rawVariants = localStorage.getItem(GUEST_VARIANTS_KEY);
    const rawHabits = localStorage.getItem(GUEST_HABITS_KEY);
    const rawManera = localStorage.getItem(GUEST_MANERA_KEY);

    const variants = rawVariants ? filterValidVariants(JSON.parse(rawVariants)) : {};
    const habits = rawHabits ? JSON.parse(rawHabits) : {};
    const manera = rawManera ? JSON.parse(rawManera) : {};

    return { variants, habits, manera };
  } catch (err) {
    console.warn('Error reading guest data from localStorage:', err);
    return { variants: {}, habits: {}, manera: {} };
  }
};

export const saveGuestVariants = (variants: Record<string, SelectedChantVariant>) => {
  try {
    const cleaned = filterValidVariants(variants);
    localStorage.setItem(GUEST_VARIANTS_KEY, JSON.stringify(cleaned));
  } catch (err) {
    console.warn('Error saving guest variants to localStorage:', err);
  }
};

export const saveGuestHabits = (habits: Record<string, boolean>) => {
  try {
    localStorage.setItem(GUEST_HABITS_KEY, JSON.stringify(habits));
  } catch (err) {
    console.warn('Error saving guest habits to localStorage:', err);
  }
};

export const saveGuestManera = (manera: Record<string, string>) => {
  try {
    localStorage.setItem(GUEST_MANERA_KEY, JSON.stringify(manera));
  } catch (err) {
    console.warn('Error saving guest manera to localStorage:', err);
  }
};

export const clearGuestData = () => {
  try {
    localStorage.removeItem(GUEST_VARIANTS_KEY);
    localStorage.removeItem(GUEST_HABITS_KEY);
    localStorage.removeItem(GUEST_MANERA_KEY);
  } catch (err) {
    console.warn('Error clearing guest data from localStorage:', err);
  }
};

/**
 * Smart Merge Algorithm: Merges guest data with existing remote Firestore user data.
 * Does not overwrite learned voices if remote already has them, but adds new items.
 */
export const mergeGuestWithRemoteData = (
  remoteData: {
    selectedChantVariants?: Record<string, SelectedChantVariant>;
    habitsStats?: Record<string, boolean>;
    maneraStats?: Record<string, string>;
  },
  guestData: GuestData
) => {
  const mergedVariants: Record<string, SelectedChantVariant> = {
    ...filterValidVariants(remoteData.selectedChantVariants || {}),
  };

  Object.entries(guestData.variants).forEach(([variantId, guestItem]) => {
    if (!mergedVariants[variantId]) {
      mergedVariants[variantId] = guestItem;
    } else {
      // Merge voices & learned state
      const remoteVoices = mergedVariants[variantId].voices || [];
      const guestVoices = guestItem.voices || [];
      const combinedVoices = Array.from(new Set([...remoteVoices, ...guestVoices])).sort() as ('1' | '2' | '3')[];
      mergedVariants[variantId] = {
        ...mergedVariants[variantId],
        ...guestItem,
        voices: combinedVoices,
        isLearned: mergedVariants[variantId].isLearned || guestItem.isLearned || combinedVoices.length > 0,
      };
    }
  });

  const mergedHabits: Record<string, boolean> = {
    ...(remoteData.habitsStats || {}),
    ...guestData.habits,
  };

  const mergedManera: Record<string, string> = {
    ...(remoteData.maneraStats || {}),
    ...guestData.manera,
  };

  const hasNewData =
    Object.keys(guestData.variants).length > 0 ||
    Object.keys(guestData.habits).length > 0 ||
    Object.keys(guestData.manera).length > 0;

  return {
    mergedVariants,
    mergedHabits,
    mergedManera,
    hasNewData,
  };
};
