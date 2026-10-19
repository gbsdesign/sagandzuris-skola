import React, { useMemo } from 'react';
import { useChants, useNavigation } from '../../context';
import { filterValidVariants } from '../../utils/variantValidation';
import { CATEGORY_LABEL, PathCategory, PathItem, categoryOf, sortPathItems, usesVoices } from '../../utils/pathItems';
import { ChevronRight, Compass } from 'lucide-react';
import { PATH_LABEL } from './pathStyle';

/** One kind of the path (გალობა, სიმღერა, მთქმელი, საკრავები): its counts and the items already learned. */
export type PathCategoryStats = {
  id: PathCategory; label: string; total: number; learned: number; voices: number; voiceSlots: number; done: PathItem[]; todo: PathItem[];
};

// the chants, songs, poems and instruments of the path: how many are learned, and their voices — in all and per kind
// (only the kinds the member has on the path)
export const usePathStats = () => {
  const { selectedChantVariants = {} } = useChants();
  return useMemo(() => {
    const items = sortPathItems(Object.values(filterValidVariants(selectedChantVariants)) as PathItem[]);
    const voiceCount = (it: PathItem) => (Array.isArray(it.voices) ? it.voices.length : 0);
    // one voice is enough for a chant or song to count as learned; the voices are counted beside it
    const isLearned = (it: PathItem) => !!it.isLearned || voiceCount(it) > 0;
    const categories: PathCategoryStats[] = (Object.keys(CATEGORY_LABEL) as PathCategory[])
      .map(id => {
        const list = items.filter(it => categoryOf(it.variantId) === id);
        const voiced = list.filter(it => usesVoices(it.variantId));
        return {
          id,
          label: CATEGORY_LABEL[id],
          total: list.length,
          learned: list.filter(isLearned).length,
          voices: voiced.reduce((a, it) => a + voiceCount(it), 0),
          voiceSlots: voiced.length * 3,
          done: list.filter(isLearned),
          todo: list.filter(it => !isLearned(it)),
        };
      })
      .filter(c => c.total > 0);
    const sum = (k: 'total' | 'learned' | 'voices' | 'voiceSlots') => categories.reduce((a, c) => a + c[k], 0);
    const total = sum('total'), learned = sum('learned');
    return { total, learned, voices: sum('voices'), voiceSlots: sum('voiceSlots'), percent: total ? Math.round((100 * learned) / total) : 0, categories };
  }, [selectedChantVariants]);
};

// An empty path, inside "ნასწავლი": one step to take instead of a list of nothing
export const FirstStep: React.FC = () => {
  const { navigateTo } = useNavigation();
  return (
    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
      <span className="shrink-0 w-[52px] h-[52px] sm:w-16 sm:h-16 rounded-full bg-[#7a2028]/[0.06] flex items-center justify-center text-[#7a2028]">
        <Compass className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={1.7} />
      </span>
      <div className="min-w-0 space-y-1.5">
        <p className={PATH_LABEL}>შენი გზა</p>
        <p className="text-sm leading-snug text-[#4a3426]">აქ გამოჩნდება, რას სწავლობ და რამდენი ისწავლე.</p>
        <button
          type="button"
          onClick={() => navigateTo('galoba')}
          className="min-h-11 py-2 pl-4 pr-3 rounded-[22px] bg-[#7a2028] hover:bg-[#5e1820] text-[#fbf6ec] text-sm font-bold leading-snug text-left inline-flex items-center gap-1 transition-colors cursor-pointer active:scale-[0.97] shadow-[0_6px_16px_-8px_rgba(122,32,40,0.7)]"
        >
          აირჩიე პირველი საგალობელი
          <ChevronRight className="w-4 h-4 shrink-0" />
        </button>
      </div>
    </div>
  );
};
