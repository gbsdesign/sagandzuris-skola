import React, { useState } from 'react';
import { ChevronRight, X } from 'lucide-react';
import { useAuth, useNavigation } from '../../context';
import { useAccess } from '../../hooks/useAccess';
import { usePearls } from '../../hooks/usePearls';
import { CHESTS } from '../../data/pearls';
import { findVersion } from '../../data/chantLookup';
import { chantName, isGolden, pearlState } from '../../utils/pearls';
import { pickOfDay, tbilisiToday } from '../../utils/hangi';
import { openPearl } from '../../utils/pearlWish';
import { openPathPanel } from '../views/IndependentWorkCard';
import { PearlIcon, VoiceDots } from '../pearls/PearlIcon';
import { triggerHaptic } from '../../utils/haptics';

// „დღის მარგალიტი“ on the home page (2026-10-28): one pearl of the chests a day, the same for the whole school (as the
// daily games: the Tbilisi day's rendezvous pick, utils/hangi pickOfDay). A tap opens it on the path page, in the
// pearls panel; ✕ hides it for the day. Only for members the pearls game is open to.

const POOL = CHESTS.flatMap(c => c.pearls).map(id => ({ id }));
const SEEN_KEY = 'sg-pearl-day-hidden';
const hiddenOn = (iso: string) => {
  try { return localStorage.getItem(SEEN_KEY) === iso; } catch { return false; }
};

export const PearlOfDay: React.FC<{ className?: string }> = ({ className }) => {
  const { user } = useAuth();
  const access = useAccess();
  const { navigateTo } = useNavigation();
  const [iso] = useState(() => tbilisiToday());
  const [hidden, setHidden] = useState(() => hiddenOn(iso));
  const can = !!user && access.section('margalitebi') === 'open' && access.page('gz') === 'open';
  const { pearls, shine, loaded } = usePearls(can && !hidden ? user?.uid : null);
  const id = pickOfDay(POOL, iso)?.id;
  const info = id ? findVersion(id) : null;
  if (!can || hidden || !loaded || !id || !info) return null;

  const rec = pearls[id];
  const golden = isGolden(rec);
  const state = pearlState(rec, shine[id]);
  // short, so it fits a phone's line beside the voice dots (it may still wrap, never cut)
  const status = golden ? 'ოქროსფერია ✓'
    : state === 'polished' || state === 'shining' ? 'სცადე სხვა ხმაც'
    : state === 'tried' ? `${rec?.best}% · სცადე ისევ`
    : 'მოისმინე და იმღერე';

  const open = () => {
    triggerHaptic(10);
    openPearl(id);
    openPathPanel('pearls');
    navigateTo('gz');
  };
  const close = () => {
    triggerHaptic(8);
    setHidden(true);
    try { localStorage.setItem(SEEN_KEY, iso); } catch { /* shows again next time */ }
  };

  return (
    <section aria-label="დღის მარგალიტი"
      className={`w-full max-w-md text-left flex items-center gap-1 pl-2 pr-1.5 rounded-2xl bg-white/80 ring-1 ring-[#e8dcc8] shadow-[0_1px_2px_rgba(74,52,38,0.05)] sg-in ${className || ''}`}>
      <button type="button" onClick={open} className="group flex-1 min-w-0 flex items-center gap-2.5 py-1.5 text-left cursor-pointer">
        <PearlIcon state={state} golden={golden} size={44} className="shrink-0" />
        <span className="flex-1 min-w-0">
          <span className="block text-xs font-semibold text-[#8a7a6a]">დღის მარგალიტი · №{info.variant.bookNums?.[0]}</span>
          <span className="block truncate font-serif-ge text-[15px] leading-snug text-[#2a2017]">{chantName(info.chant.title)}</span>
          <span className="flex items-center gap-2 text-[12px] leading-snug text-[#75685a]">
            <VoiceDots rec={rec} golden={golden} className="shrink-0" />
            <span className="min-w-0">{status}</span>
          </span>
        </span>
        <ChevronRight className="w-[18px] h-[18px] shrink-0 text-[#b3a594] group-hover:text-[#7a2028] transition-colors" aria-hidden />
      </button>
      <button type="button" onClick={close} aria-label="დღეს აღარ მაჩვენო" title="დღეს აღარ მაჩვენო"
        className="w-9 h-9 shrink-0 rounded-full text-[#8a7a6a] hover:text-[#7a2028] hover:bg-[#7a2028]/[0.06] flex items-center justify-center cursor-pointer transition-colors">
        <X className="w-[18px] h-[18px]" />
      </button>
    </section>
  );
};
