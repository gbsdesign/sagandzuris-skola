import React, { useState } from 'react';
import { ChevronDown, ChevronRight, GraduationCap } from 'lucide-react';
import { useAuth } from '../../context';
import { useAllLearning } from '../../hooks/useLearning';
import { reviewsDue } from '../../utils/learn';
import { georgiaToday } from '../../utils/psalter';
import { triggerHaptic } from '../../utils/haptics';
import { pieceTitle } from '../learn/LearnReview';
import { useOpenLearning } from '../learn/openLearning';

// The home page's line of the learning mode: what waits for its review today (1, 3 and 7 days after a part was
// learned). One thin line of the home's day card (HomePage, under today's saints): one piece due — its title and
// how many parts, a tap opens it straight in its learning mode; several — „დღეს გასამეორებელი“ unfolds a line per
// piece. Members only; nothing due — no line. One line since 2026-10-31 (it was a card of its own).

const partsLabel = (n: number) => `${n} ნაწილი`;

/** the line's mark: a mortarboard on a soft gold tile, the same size as the calendar leaf above it */
const CapTile = () => (
  <span className="w-9 h-9 shrink-0 rounded-[10px] bg-[#f6ecd9] ring-1 ring-[#ecdcbc] text-[#7a2028] flex items-center justify-center" aria-hidden>
    <GraduationCap className="w-[18px] h-[18px]" />
  </span>
);

const PartsChip: React.FC<{ n: number }> = ({ n }) => (
  <span className="shrink-0 h-6 px-2 rounded-full bg-[#f6ecd9] text-[12px] font-bold leading-6 text-[#8a5a1c] whitespace-nowrap">{partsLabel(n)}</span>
);

const rowLook = 'group w-full min-h-12 flex items-center gap-2.5 py-1.5 pl-2 pr-2.5 text-left cursor-pointer hover:bg-[#fbf6ec] active:bg-[#f5ecdc] transition-colors';

export const LearnDue: React.FC = () => {
  const { user } = useAuth();
  const open = useOpenLearning();
  const all = useAllLearning(user?.uid);
  const [unfolded, setUnfolded] = useState(false);
  const due = reviewsDue(all?.learning, georgiaToday());
  if (!due.length) return null;
  const parts = due.reduce((n, d) => n + d.parts.length, 0);

  // one piece: the line is the piece itself
  if (due.length === 1) {
    const d = due[0];
    return (
      <section aria-label="დღეს გასამეორებელი" className="sg-in">
        <button type="button" onClick={() => open(d.piece)} className={rowLook}
          title={`დღეს გასამეორებელი: ${d.parts.map(p => p + 1).join(', ')} ${d.parts.length === 1 ? 'ნაწილი' : 'ნაწილები'}`}>
          <CapTile />
          <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-[#2a2017]">{pieceTitle(d.piece)}</span>
          <PartsChip n={d.parts.length} />
          <ChevronRight className="w-[18px] h-[18px] shrink-0 text-[#b08a4a]" aria-hidden />
        </button>
      </section>
    );
  }

  // several pieces: one line that unfolds a thin line per piece
  return (
    <section aria-label="დღეს გასამეორებელი" className="sg-in">
      <button type="button" onClick={() => { triggerHaptic(8); setUnfolded(u => !u); }} aria-expanded={unfolded} className={rowLook}>
        <CapTile />
        <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-[#7a2028]">დღეს გასამეორებელი</span>
        <PartsChip n={parts} />
        <ChevronDown className={`w-[18px] h-[18px] shrink-0 text-[#b3a594] group-hover:text-[#7a2028] transition-transform ${unfolded ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {unfolded && (
        <ul className="pb-1 border-t border-[#f1e8d9] sg-in">
          {due.map(d => (
            <li key={d.piece}>
              <button type="button" onClick={() => open(d.piece)}
                className="w-full min-h-11 flex items-center gap-2 pl-[3.25rem] pr-2.5 text-left cursor-pointer hover:bg-[#fbf6ec] active:bg-[#f5ecdc] transition-colors">
                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-[#2a2017]">{pieceTitle(d.piece)}</span>
                <span className="shrink-0 text-[12px] font-semibold text-[#8c7c6b]">{partsLabel(d.parts.length)}</span>
                <ChevronRight className="w-4 h-4 shrink-0 text-[#b08a4a]" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
