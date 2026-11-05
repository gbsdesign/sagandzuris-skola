import React from 'react';
import { useNavigation } from '../../context';
import { KATHISMA_PSALMS } from '../../utils/psalter';
import { PsalterGroup, useGroupNow } from '../../hooks/usePsalter';
import { triggerHaptic } from '../../utils/haptics';
import { useKathismaActions } from './useKathismaActions';
import { TileCheck, TileName, tileClass } from '../home/ShelfTile';

// "ჩემი კანონი" as the first of "ჩემი ღილაკები": the tile opens the kathisma's text (the user's choice, 2026-10-31 —
// it opened the group page before), its ✓ marks it read (a second tap takes my own mark back). One tile per kathisma of
// mine; nothing in a cycle without one.
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
            {/* half height since 2026-11-05: the number and „კანონი“ in one row (the psalms stay in the title) */}
            <button
              type="button"
              onClick={() => { triggerHaptic(10); openPrayer(`kathisma-${k}`); }}
              aria-label={`ჩემი კანონი ${k} — კითხვა`}
              title={`კანონი ${k} · ფს. ${KATHISMA_PSALMS[k - 1]}`}
              className={`${tileClass('wine', true)} gap-[5px] active:scale-[0.97]`}
            >
              <span className="shrink-0 font-serif-ge text-[18px] leading-none font-bold tabular-nums text-[#f3d9a4]">{k}</span>
              <TileName label="კანონი" room="tight" />
            </button>
            <TileCheck
              on={read}
              dark
              disabled={actions.busy === k || (read && !canUndo)}
              onClick={() => { triggerHaptic(15); if (!read) actions.read(k); else if (canUndo) actions.unread(k); }}
              label={read ? `კანონი ${k} წაკითხულია — მონიშვნის მოხსნა` : `კანონი ${k} — წავიკითხე`}
              title={read ? 'წაკითხულია' : 'წავიკითხე'}
            />
          </li>
        );
      })}
    </>
  );
};
