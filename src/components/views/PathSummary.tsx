import React, { useMemo } from 'react';
import { useChants, useNavigation } from '../../context';
import { filterValidVariants } from '../../utils/variantValidation';
import { usesVoices } from '../../utils/pathItems';
import { ChevronRight, Compass } from 'lucide-react';
import { PercentRing } from './PercentRing';
import { PATH_CARD, PATH_LABEL } from './pathStyle';

// the chants and songs of the path: how many are learned, and their voices
const usePathStats = () => {
  const { selectedChantVariants = {} } = useChants();
  return useMemo(() => {
    const items = Object.values(filterValidVariants(selectedChantVariants));
    let learned = 0, voices = 0, voiceSlots = 0;
    for (const it of items) {
      const v = Array.isArray(it.voices) ? it.voices.length : 0;
      // one voice is enough for a chant or song to count as learned; the voices are counted beside it
      if (it.isLearned || v > 0) learned++;
      if (usesVoices(it.variantId)) {
        voices += v;
        voiceSlots += 3;
      }
    }
    return { total: items.length, learned, voices, voiceSlots, percent: items.length ? Math.round((100 * learned) / items.length) : 0 };
  }, [selectedChantVariants]);
};

// The path's progress on the folded "ჩემი სამოსი" (path page only): a ring and the counts beside it, laid out
// like the chokha's ring and title. Nothing while the path is empty — the first step shows in the "სწავლა" tab then.
export const PathProgress: React.FC = () => {
  const s = usePathStats();
  if (!s.total) return null;
  return (
    <span className="flex items-center gap-3">
      <PercentRing label="შენი გზა" percent={s.percent} done={s.percent >= 100} />
      <span className="leading-tight tabular-nums whitespace-nowrap">
        <span className="block">
          <span className="text-[15px] font-black text-[#2a2017]">{s.learned}</span>
          <span className="text-xs font-bold text-[#b3a594]"> / {s.total}</span>
          <span className="text-xs font-semibold text-[#75685a]"> ნასწავლი</span>
        </span>
        <span className="block mt-0.5 text-xs font-semibold text-[#8a7a6a]">
          {s.voiceSlots > 0 ? `${s.voices}/${s.voiceSlots} ხმა` : `${s.total - s.learned} სასწავლი`}
        </span>
      </span>
    </span>
  );
};

// "შენი გზა" in the "სწავლა" tab: the first step while the path is empty (the independent work card is in "ჩვევები")
export const PathSummary: React.FC = () => {
  const { total } = usePathStats();
  const { navigateTo } = useNavigation();
  if (total) return null;
  return (
    <section className={PATH_CARD}>
      <FirstStep onStart={() => navigateTo('galoba')} />
    </section>
  );
};

// An empty path: one step to take instead of a ring of zeros
const FirstStep: React.FC<{ onStart: () => void }> = ({ onStart }) => (
  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
    <span className="shrink-0 w-[52px] h-[52px] sm:w-16 sm:h-16 rounded-full bg-[#7a2028]/[0.06] flex items-center justify-center text-[#7a2028]">
      <Compass className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={1.7} />
    </span>
    <div className="min-w-0 space-y-1.5">
      <p className={PATH_LABEL}>შენი გზა</p>
      <p className="text-sm leading-snug text-[#4a3426]">აქ გამოჩნდება, რას სწავლობ და რამდენი ისწავლე.</p>
      <button
        type="button"
        onClick={onStart}
        className="min-h-11 py-2 pl-4 pr-3 rounded-[22px] bg-[#7a2028] hover:bg-[#5e1820] text-[#fbf6ec] text-sm font-bold leading-snug text-left inline-flex items-center gap-1 transition-colors cursor-pointer active:scale-[0.97] shadow-[0_6px_16px_-8px_rgba(122,32,40,0.7)]"
      >
        აირჩიე პირველი საგალობელი
        <ChevronRight className="w-4 h-4 shrink-0" />
      </button>
    </div>
  </div>
);
