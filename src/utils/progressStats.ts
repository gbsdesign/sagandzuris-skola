import { SelectedChantVariant } from '../context/ChantSelectionContext';

export interface ProgressSummary {
  totalLearned: number;
  totalSelected: number;
  totalChants: number;
  totalSongs: number;
  totalPoems: number;
  totalInstruments: number;
  habitsDoneCount: number;
  totalHabits: number;
  maneraCount: number;
}

export const calculateProgressSummary = (
  variants: Record<string, SelectedChantVariant>,
  habits: Record<string, boolean> = {},
  manera: Record<string, string> = {}
): ProgressSummary => {
  const items = Object.values(variants || {});
  const totalSelected = items.length;
  const totalLearned = items.filter((i) => i.isLearned || (i.voices && i.voices.length > 0)).length;

  let totalChants = 0;
  let totalSongs = 0;
  let totalPoems = 0;
  let totalInstruments = 0;

  items.forEach((item) => {
    if (
      item.variantId.startsWith('chonguri') ||
      item.variantId.startsWith('fanduri') ||
      item.variantId.startsWith('doli') ||
      item.variantId.startsWith('garmoni') ||
      item.variantId.startsWith('chuniri') ||
      item.variantId.startsWith('changi') ||
      item.code === 'საკრავი'
    ) {
      totalInstruments++;
    } else if (
      item.code.startsWith('გ.ს.') ||
      item.code.startsWith('ქ.კ.') ||
      item.code.startsWith('შემოქმედი') ||
      item.code.startsWith('გელათი') ||
      item.code.startsWith('მარტვილი') ||
      item.variantId.startsWith('v-')
    ) {
      totalChants++;
    } else if (
      item.code === 'აფხ.' ||
      item.code === 'სამეგ.' ||
      item.code === 'სვან.' ||
      item.code === 'რაჭ.' ||
      item.code === 'იმერ.' ||
      item.code === 'გურ.' ||
      item.code === 'აჭარ.' ||
      item.code === 'მესხ.' ||
      item.code === 'ქართლ.' ||
      item.code === 'მთიან.' ||
      item.code === 'ცხინვ.' ||
      item.code === 'ქვ.ქ.' ||
      item.code === 'თბილ.' ||
      item.code === 'კახ.'
    ) {
      totalSongs++;
    } else {
      totalPoems++;
    }
  });

  const habitsDoneCount = Object.values(habits || {}).filter(Boolean).length;
  const totalHabits = 6;
  const maneraCount = Object.keys(manera || {}).length;

  return {
    totalLearned,
    totalSelected,
    totalChants,
    totalSongs,
    totalPoems,
    totalInstruments,
    habitsDoneCount,
    totalHabits,
    maneraCount,
  };
};
