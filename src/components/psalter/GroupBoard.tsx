import React from 'react';
import { BookOpen, Check, HandHelping, Undo2, LifeBuoy } from 'lucide-react';
import { useNavigation } from '../../context';
import { KATHISMA_PSALMS, Slots, responsible, slotState } from '../../utils/psalter';
import { ALL_KATHISMAS, PsalterGroup, ergative, firstName, memberName } from '../../hooks/usePsalter';
import { useKathismaActions } from './useKathismaActions';

type Act = { key: string; label: string; icon: React.ReactNode; onClick: () => void; strong?: boolean; on?: boolean };

/** The twenty kathismas of the cycle: who reads each one, how far it got, and what I can do with it — right in
 *  the tile (mark as read, take, ask for help), no extra window. Tapping the number or the name opens the text. */
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
          return (
            <li
              key={k}
              className={[
                'relative rounded-2xl p-2.5 flex flex-col gap-2',
                state === 'read' && 'bg-emerald-700 text-white',
                state === 'taken' && 'bg-amber-50 text-amber-900 ring-1 ring-amber-300',
                state === 'unread' && 'bg-white text-[#4a3426] ring-1 ring-[#e8dcc8]',
                state === 'free' && 'bg-white/50 text-[#8a7a6a] border border-dashed border-[#d9c8ac]',
                state === 'skipped' && 'bg-red-50 text-red-800 ring-1 ring-red-200',
                mine && state !== 'read' && '!ring-2 !ring-[#7a2028]',
              ].filter(Boolean).join(' ')}
            >
              <button
                type="button"
                onClick={() => openPrayer(`kathisma-${k}`)}
                aria-label={`კანონი ${k}: კითხვა`}
                className="flex items-center gap-2 min-w-0 text-left cursor-pointer rounded-lg -m-1 p-1 hover:bg-black/[0.04]"
              >
                <span className="font-serif-ge text-[22px] font-bold leading-none tabular-nums w-7 text-center shrink-0">{k}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[11px] leading-tight ${dark ? 'text-white/75' : 'opacity-70'}`}>ფს. {KATHISMA_PSALMS[k - 1]}</span>
                  <span className="block text-[12.5px] leading-tight font-semibold line-clamp-2 break-words">{caption || '—'}</span>
                </span>
                {state === 'read' && <Check className="w-4 h-4 stroke-[3] shrink-0" aria-label="წაკითხულია" />}
                {help && <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" aria-label="დახმარება სჭირდება" />}
              </button>
              {acts.length > 0 && <div className="flex gap-1.5">
                {acts.map(a => (
                  <button
                    key={a.key}
                    type="button"
                    title={a.label}
                    aria-label={`კანონი ${k}: ${a.label}`}
                    disabled={actions.busy === k}
                    onClick={a.onClick}
                    className={[
                      'flex-1 h-9 rounded-xl flex items-center justify-center cursor-pointer transition active:scale-95 disabled:opacity-40 [&>svg]:w-[18px] [&>svg]:h-[18px]',
                      dark ? 'bg-white/15 hover:bg-white/25 text-white'
                        : a.strong ? 'bg-[#7a2028] text-white hover:bg-[#6c1c24]'
                        : a.on ? 'bg-amber-200 text-amber-900'
                        : 'bg-[#7a2028]/[0.07] text-[#7a2028] hover:bg-[#7a2028]/[0.13]',
                    ].join(' ')}
                  >
                    {a.icon}
                  </button>
                ))}
              </div>}
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] font-semibold text-[#8a7a6a] [&_svg]:w-3.5 [&_svg]:h-3.5 [&_svg]:text-[#7a2028]">
        <span className="inline-flex items-center gap-1"><BookOpen /> ნომერზე დაჭერა — კითხვა</span>
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
