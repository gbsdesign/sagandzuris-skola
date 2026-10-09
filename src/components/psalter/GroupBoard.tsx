import React from 'react';
import { BookOpen, Check, HandHelping, Undo2, LifeBuoy } from 'lucide-react';
import { useNavigation } from '../../context';
import { KATHISMA_PSALMS, Slots, responsible, slotState } from '../../utils/psalter';
import { ALL_KATHISMAS, PsalterGroup, ergative, firstName, memberName } from '../../hooks/usePsalter';
import { useKathismaActions } from './useKathismaActions';

type Act = { key: string; label: string; icon: React.ReactNode; onClick: () => void; strong?: boolean; on?: boolean };

/** The twenty kathismas of the cycle: who reads each one, how far it got, and what I can do with it — right in
 *  the tile's corner (mark as read, take, ask for help), no extra window. Tapping the tile opens the text. */
export const KathismaGrid: React.FC<{
  group: PsalterGroup;
  slots: Slots;
  owners: Record<number, string[]>;
  uid?: string;
  isLeader: boolean;
  isMember: boolean;
  actions: ReturnType<typeof useKathismaActions>;
}> = ({ group, slots, owners, uid, isLeader, isMember, actions }) => {
  const { openPrayer } = useNavigation();
  return (
    <div>
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {ALL_KATHISMAS.map(k => {
          const slot = slots[k];
          const own = owners[k] || [];
          const who = responsible(slot, own);
          const state = slotState(slot, own, false);
          const mine = !!uid && who.includes(uid);
          const ownerMine = !!uid && own.includes(uid);
          const help = !!slot?.help && state !== 'read' && state !== 'taken';
          const caption =
            state === 'read' ? memberName(group, slot?.readBy)
              : state === 'taken' ? `${ergative(firstName(memberName(group, slot?.takenBy)))} აიღო`
              : state === 'free' ? 'თავისუფალი'
              : state === 'skipped' ? 'გამოტოვდა'
              : who.map(u => memberName(group, u)).join(', ');

          const acts: Act[] = [];
          if (state !== 'read' && (mine || isLeader)) acts.push({ key: 'read', label: 'წავიკითხე', icon: <Check />, onClick: () => actions.read(k), strong: mine });
          if (state === 'read' && (slot?.readBy === uid || isLeader)) acts.push({ key: 'unread', label: 'მონიშვნის გაუქმება', icon: <Undo2 />, onClick: () => actions.unread(k) });
          // taking is only for a kathisma whose reader asked for help
          if (isMember && help && !mine) acts.push({ key: 'take', label: 'აღება — მე წავიკითხავ', icon: <HandHelping />, onClick: () => actions.take(k), strong: true });
          if (state === 'taken' && slot?.takenBy === uid) acts.push({ key: 'back', label: 'დაბრუნება', icon: <Undo2 />, onClick: () => actions.giveBack(k) });
          if (ownerMine && state === 'unread') acts.push(slot?.help
            ? { key: 'help', label: 'დახმარების თხოვნის გაუქმება', icon: <LifeBuoy />, onClick: () => actions.cancelHelp(k), on: true }
            : { key: 'help', label: 'ვერ ვკითხულობ — დახმარება მჭირდება', icon: <LifeBuoy />, onClick: () => actions.askHelp(k) });

          const dark = state === 'read';
          const quiet = state === 'free';
          return (
            <li
              key={k}
              className={[
                'relative rounded-2xl p-3 min-h-[96px] flex flex-col transition-colors',
                state === 'read' && 'bg-emerald-700 text-white shadow-[0_6px_14px_-10px_rgba(4,120,87,0.9)]',
                state === 'taken' && 'bg-amber-50 text-amber-900 ring-1 ring-amber-300',
                state === 'unread' && !mine && 'bg-white text-[#4a3426] ring-1 ring-[#e8dcc8]',
                mine && state !== 'read' && 'bg-[#7a2028]/[0.05] text-[#4a3426] ring-2 ring-[#7a2028]',
                quiet && 'text-[#a8977f] border border-dashed border-[#e3d5bd]',
                state === 'skipped' && 'bg-red-50 text-red-800 ring-1 ring-red-200',
              ].filter(Boolean).join(' ')}
            >
              {/* the whole tile opens the text; its buttons sit above */}
              <button
                type="button"
                onClick={() => openPrayer(`kathisma-${k}`)}
                aria-label={`კანონი ${k}: კითხვა`}
                className={`absolute inset-0 rounded-2xl cursor-pointer transition-colors ${dark ? 'hover:bg-white/[0.06]' : 'hover:bg-[#7a2028]/[0.03]'}`}
              />
              <div className="relative pointer-events-none flex items-start gap-1.5">
                <span className={`font-serif-ge text-[26px] font-bold leading-none tabular-nums pt-1 ${quiet ? 'text-[#c9b9a0]' : ''}`}>{k}</span>
                {dark && <Check className="w-4 h-4 mt-1.5 stroke-[3] text-emerald-200" aria-label="წაკითხულია" />}
                {help && <span className="w-2.5 h-2.5 mt-2 rounded-full bg-amber-500 animate-pulse" aria-label="დახმარება სჭირდება" />}
                <span className="flex-1" />
                {acts.length > 0 && <div className="pointer-events-auto flex gap-1 -mt-0.5 -mr-0.5">
                  {acts.map(a => (
                    <button
                      key={a.key}
                      type="button"
                      title={a.label}
                      aria-label={`კანონი ${k}: ${a.label}`}
                      disabled={actions.busy === k}
                      onClick={a.onClick}
                      className={[
                        'w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition active:scale-90 disabled:opacity-40 [&>svg]:w-[17px] [&>svg]:h-[17px]',
                        dark ? 'bg-white/15 hover:bg-white/25 text-white'
                          : a.strong ? 'bg-[#7a2028] text-white hover:bg-[#6c1c24] shadow-[0_4px_10px_-6px_rgba(122,32,40,0.9)] [&>svg]:stroke-[2.6]'
                          : a.on ? 'bg-amber-200 text-amber-900'
                          : quiet ? 'text-[#b5a48c] ring-1 ring-[#e3d5bd] hover:text-[#7a2028] hover:ring-[#7a2028]/30'
                          : 'bg-[#7a2028]/[0.07] text-[#7a2028] hover:bg-[#7a2028]/[0.13]',
                      ].join(' ')}
                    >
                      {a.icon}
                    </button>
                  ))}
                </div>}
              </div>
              <div className="relative pointer-events-none mt-auto pt-2 min-w-0">
                <span className={`block leading-tight line-clamp-2 break-words ${quiet ? 'text-[12px] font-medium' : 'text-[13.5px] font-bold'}`}>{caption || '—'}</span>
                <span className={`block mt-0.5 text-[11px] leading-tight ${dark ? 'text-white/70' : help ? 'text-amber-700 font-semibold' : 'opacity-70'}`}>
                  {help ? 'დახმარებას ითხოვს' : `ფს. ${KATHISMA_PSALMS[k - 1]}`}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] font-semibold text-[#8a7a6a] [&_svg]:w-3.5 [&_svg]:h-3.5 [&_svg]:text-[#7a2028]">
        <span className="inline-flex items-center gap-1"><BookOpen /> ფილაზე დაჭერა — კითხვა</span>
        <span className="inline-flex items-center gap-1"><Check /> წავიკითხე</span>
        <span className="inline-flex items-center gap-1"><HandHelping /> აღება</span>
        <span className="inline-flex items-center gap-1"><LifeBuoy /> დახმარება</span>
        <span className="inline-flex items-center gap-1"><Undo2 /> გაუქმება</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-700" /> წაკითხული</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 ring-1 ring-amber-300" /> აღებული</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded ring-2 ring-[#7a2028]" /> შენი</span>
      </div>
    </div>
  );
};
