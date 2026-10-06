import React from 'react';
import { Check } from 'lucide-react';
import { useNavigation } from '../../context';
import { KATHISMA_PSALMS } from '../../utils/psalter';
import { PsalterGroup, useGroupNow } from '../../hooks/usePsalter';
import { triggerHaptic } from '../../utils/haptics';
import { useKathismaActions } from './useKathismaActions';

// "ჩემი კანონი" as the first of "ჩემი ღილაკები": the tile opens this cycle's kathisma, its ✓ marks it read
// (a second tap takes my own mark back). One tile per kathisma of mine; nothing in a cycle without one.
export const KathismaTiles: React.FC<{ group: PsalterGroup; uid: string }> = ({ group, uid }) => {
  const { openPrayer } = useNavigation();
  const { cycle, slots, mine } = useGroupNow(group, uid);
  const actions = useKathismaActions(group, cycle);
  if (!cycle || !group.memberIds.includes(uid)) return null;

  return (
    <>
      {mine.map(k => {
        const read = !!slots[k]?.readBy;
        const canUndo = slots[k]?.readBy === uid;
        return (
          <li key={`${group.id}-${k}`} className="relative">
            <button
              type="button"
              onClick={() => { triggerHaptic(10); openPrayer(`kathisma-${k}`); }}
              aria-label={`ჩემი კანონი ${k} — კითხვა`}
              className="w-full h-[104px] rounded-2xl bg-gradient-to-br from-[#7a2028] to-[#561820] text-[#fbf6ec] flex flex-col justify-between p-2.5 text-left cursor-pointer transition active:scale-95 shadow-[0_6px_14px_-8px_rgba(122,32,40,0.9)]"
            >
              <span className="font-serif-ge text-[28px] leading-none font-bold tabular-nums">{k}</span>
              <span className="w-full">
                <span className="block text-[12px] font-bold leading-[1.2] whitespace-nowrap">კანონი</span>
                <span className={`block text-[11px] leading-[1.25] whitespace-nowrap ${read ? 'text-emerald-200' : 'text-[#fbf6ec]/70'}`}>
                  {read ? 'წაკითხული' :`ფს. ${KATHISMA_PSALMS[k - 1]}`}
                </span>
              </span>
            </button>
            <button
              type="button"
              disabled={actions.busy === k || (read && !canUndo)}
              onClick={() => { triggerHaptic(15); if (!read) actions.read(k); else if (canUndo) actions.unread(k); }}
              aria-pressed={read}
              aria-label={read ? `კანონი ${k} წაკითხულია — მონიშვნის მოხსნა` : `კანონი ${k} — წავიკითხე`}
              title={read ? 'წაკითხულია' : 'წავიკითხე'}
              className={`absolute top-2 right-2 w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition active:scale-90 disabled:cursor-default ${
                read ? 'bg-emerald-500 text-white shadow' : 'bg-white/12 ring-1 ring-white/35 text-[#fbf6ec] hover:bg-white/20'
              }`}
            >
              <Check className="w-[18px] h-[18px] stroke-[3]" />
            </button>
          </li>
        );
      })}
    </>
  );
};
