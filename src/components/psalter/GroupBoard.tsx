import React, { useState } from 'react';
import { arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { BookOpen, Check, HandHelping, Undo2, LifeBuoy, Pencil } from 'lucide-react';
import { db } from '../../firebase';
import { useNavigation } from '../../context';
import { KATHISMA_PSALMS, Slots, cycleOf, georgiaToday, rebase, responsible, slotState } from '../../utils/psalter';
import { ALL_KATHISMAS, GroupMember, PsalterGroup, ergative, firstName, memberName } from '../../hooks/usePsalter';
import { useManagedClasses } from '../../hooks/useClasses';
import { Flash, useFlash } from '../ui/kit';
import { PeoplePicker, Person } from '../people/PeoplePicker';
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
  // a leader's ✎ under a tile: the class list, to name who reads this kanon (saved at once; a class member
  // who is not in the group yet joins it)
  const { classes } = useManagedClasses();
  const cls = classes.find(c => c.psalterGroupId === group.id);
  const [editK, setEditK] = useState<number | null>(null);
  const msg = useFlash();
  const people: Person[] = [
    ...(cls?.members || []).map(m => ({ uid: m.uid, name: m.name, photoURL: m.photoURL })),
    ...group.members.filter(m => !cls?.memberIds.includes(m.uid)).map(m => ({ uid: m.uid, name: m.name, photoURL: m.photoURL })),
  ];
  const assign = async (k: number, uids: string[]) => {
    const added: GroupMember[] = uids.filter(u => !group.memberIds.includes(u)).map(u => {
      const m = cls?.members.find(x => x.uid === u);
      return { uid: u, name: m?.name || 'წევრი', prayer: '', photoURL: m?.photoURL || '' };
    });
    try {
      await updateDoc(doc(db, 'psalterGroups', group.id), {
        assignment: rebase({ ...owners, [k]: uids }),
        baseHalf: cycleOf(georgiaToday(), group.cycleDays, group.shiftDays).half,
        ...(added.length ? { members: arrayUnion(...added), memberIds: arrayUnion(...added.map(m => m.uid)) } : {}),
        updatedAt: new Date().toISOString(),
      });
      msg.ok(`კანონი ${k}: ${uids.length ? uids.map(u => people.find(p => p.uid === u)?.name || 'წევრი').join(', ') : 'არავინ'}.`);
    } catch {
      msg.fail('ვერ შეინახა.');
    }
  };
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
                state === 'read' && 'bg-[#fbf6ec] text-[#4a3426]/70 ring-1 ring-[#e8dcc8]',
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
                className={`absolute inset-0 rounded-2xl cursor-pointer transition-colors hover:bg-[#7a2028]/[0.03]`}
              />
              <div className="relative pointer-events-none flex items-start gap-1.5">
                <span className={`font-serif-ge text-[26px] font-bold leading-none tabular-nums pt-1 ${quiet ? 'text-[#c9b9a0]' : ''}`}>{k}</span>
                {dark && <span className="w-[18px] h-[18px] mt-1 rounded-full bg-emerald-600 text-white flex items-center justify-center" aria-label="წაკითხულია"><Check className="w-3 h-3 stroke-[3.5]" /></span>}
                {help && <span className="w-2.5 h-2.5 mt-2 rounded-full bg-amber-500 animate-pulse" aria-label="დახმარება სჭირდება" />}
                <span className="flex-1" />
                <div className="pointer-events-auto flex flex-col items-end gap-1 -mt-0.5 -mr-0.5">
                {acts.length > 0 && <div className="flex gap-1">
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
                        a.strong ? 'bg-[#7a2028] text-white hover:bg-[#6c1c24] shadow-[0_4px_10px_-6px_rgba(122,32,40,0.9)] [&>svg]:stroke-[2.6]'
                          : a.on ? 'bg-amber-200 text-amber-900'
                          : quiet ? 'text-[#b5a48c] ring-1 ring-[#e3d5bd] hover:text-[#7a2028] hover:ring-[#7a2028]/30'
                          : 'bg-[#7a2028]/[0.07] text-[#7a2028] hover:bg-[#7a2028]/[0.13]',
                      ].join(' ')}
                    >
                      {a.icon}
                    </button>
                  ))}
                </div>}
                {isLeader && (
                  <button type="button" title="ვინ კითხულობს" aria-label={`კანონი ${k}: ვინ კითხულობს`} onClick={() => setEditK(k)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition active:scale-90 [&>svg]:w-4 [&>svg]:h-4 text-[#b3a594] hover:text-[#7a2028] hover:bg-[#7a2028]/[0.07]`}>
                    <Pencil />
                  </button>
                )}
                </div>
              </div>
              <div className="relative pointer-events-none mt-auto pt-2 min-w-0">
                <span className={`block leading-tight line-clamp-2 break-words ${quiet ? 'text-[12px] font-medium' : 'text-[13.5px] font-bold'}`}>{caption || '—'}</span>
                <span className={`block mt-0.5 text-[11px] leading-tight ${help ? 'text-amber-700 font-semibold' : 'opacity-70'}`}>
                  {help ? 'დახმარებას ითხოვს' : `ფს. ${KATHISMA_PSALMS[k - 1]}`}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      {msg.flash && <div className="mt-3"><Flash flash={msg.flash} onClose={msg.clear} /></div>}
      {isLeader && (
        <PeoplePicker
          open={editK !== null}
          onClose={() => setEditK(null)}
          title={editK ? `კანონი ${editK} — ვინ კითხულობს` : ''}
          people={people}
          selected={editK ? owners[editK] || [] : []}
          doneLabel="შენახვა"
          empty="კლასში ჯერ წევრები არ არიან."
          onDone={uids => { if (editK) void assign(editK, uids); }}
        />
      )}
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
