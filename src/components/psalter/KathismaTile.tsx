import React from 'react';
import { Check } from 'lucide-react';
import { useNavigation } from '../../context';
import { KATHISMA_PSALMS } from '../../utils/psalter';
import { PsalterGroup, useGroupNow } from '../../hooks/usePsalter';
import { triggerHaptic } from '../../utils/haptics';
import { useKathismaActions } from './useKathismaActions';
import { openPsalterGroup } from './selectedGroup';

// "ჩემი კანონი" as the first of "ჩემი ღილაკები": the tile opens the group page, its ✓ marks the kathisma read
// (a second tap takes my own mark back). One tile per kathisma of mine; nothing in a cycle without one.
export const KathismaTiles: React.FC<{ group: PsalterGroup; uid: string }> = ({ group, uid }) => {
  const { navigateTo } = useNavigation();
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
              onClick={() => { triggerHaptic(10); openPsalterGroup(group.id); navigateTo('psalter'); }}
              aria-label={`ჩემი კანონი ${k} — ჯგუფის გვერდი`}
              className="w-full h-[74px] rounded-[14px] bg-gradient-to-br from-[#7a2028] to-[#561820] text-[#fbf6ec] flex flex-col justify-between px-2.5 py-2 text-left cursor-pointer transition active:scale-[0.96] shadow-[0_4px_10px_-6px_rgba(122,32,40,0.8)]"
            >
              <span className="h-7 flex items-center font-serif-ge text-[22px] leading-none font-bold tabular-nums">{k}</span>
              <span className="w-full">
                <span className="block text-[12px] font-bold leading-[1.15] whitespace-nowrap">კანონი</span>
                <span className={`block text-[11.5px] leading-[1.2] whitespace-nowrap ${read ? 'text-emerald-200' : 'text-[#fbf6ec]/70'}`}>
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
              className="group absolute top-0.5 right-0.5 w-10 h-10 flex items-center justify-center cursor-pointer transition active:scale-90 disabled:cursor-default"
            >
              <span className={`w-7 h-7 rounded-full flex items-center justify-center transition ${
                read ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white/12 ring-1 ring-white/35 text-[#fbf6ec] group-hover:bg-white/20'
              }`}>
                <Check className="w-[15px] h-[15px] stroke-[3]" />
              </span>
            </button>
          </li>
        );
      })}
    </>
  );
};
