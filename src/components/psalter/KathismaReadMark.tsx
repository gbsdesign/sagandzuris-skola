import React from 'react';
import { Check, HandHelping, Undo2 } from 'lucide-react';
import { useAuth } from '../../context';
import { Btn, Flash } from '../ui/kit';
import { PsalterGroup, ergative, firstName, memberName, useGroupNow, useMyPsalterGroups } from '../../hooks/usePsalter';
import { responsible } from '../../utils/psalter';
import { useKathismaActions } from './useKathismaActions';

// At the end of a kathisma's text: "წავიკითხე" for each of my groups in which this kathisma is mine now.
export const KathismaReadMark: React.FC<{ k: number }> = ({ k }) => {
  const { user } = useAuth();
  const { groups } = useMyPsalterGroups(user?.uid);
  if (!user) return null;
  const mine = groups.filter(g => g.memberIds.includes(user.uid));
  if (!mine.length) return null;
  return (
    <div className="space-y-3">
      {mine.map(g => <Mark key={g.id} group={g} k={k} uid={user.uid} />)}
    </div>
  );
};

const Mark: React.FC<{ group: PsalterGroup; k: number; uid: string }> = ({ group, k, uid }) => {
  const { cycle, slots, owners } = useGroupNow(group, uid);
  const actions = useKathismaActions(group, cycle);
  const slot = slots[k];
  const who = responsible(slot, owners[k] || []);
  const isMine = who.includes(uid);
  const read = !!slot?.readBy;
  if (!cycle || (!isMine && !read && slot?.takenBy)) return null;

  return (
    <section className="rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] p-4">
      <p className="text-[12px] font-bold uppercase tracking-wide text-[#8a7a6a]">{group.name}</p>
      {read ? (
        <div className="mt-1.5 flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0"><Check className="w-5 h-5 stroke-[3]" /></span>
          <span className="flex-1 min-w-0 text-sm font-semibold text-[#2a2017]">
            კანონი {k} ამ ციკლში წაკითხულია{slot?.readBy !== uid ? ` · ${firstName(memberName(group, slot?.readBy))}` : ''}.
          </span>
          {slot?.readBy === uid && <Btn size="sm" kind="ghost" icon={<Undo2 />} onClick={() => actions.unread(k)}>გაუქმება</Btn>}
        </div>
      ) : isMine ? (
        <div className="mt-2 space-y-2">
          <p className="text-sm text-[#4a3426]">დაასრულე კითხვა? მონიშნე, რომ ჯგუფმა იცოდეს.</p>
          <Btn full size="lg" icon={<Check />} disabled={actions.busy === k} onClick={() => actions.read(k)}>წავიკითხე კანონი {k}</Btn>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <p className="text-sm text-[#4a3426]">
            ამ ციკლში კანონი {k} {who.length ? `${who.map(u => firstName(memberName(group, u))).join(', ')}-ს ებარება` : 'თავისუფალია'}. თუ შენ წაიკითხე, აიღე და მონიშნე.
          </p>
          <Btn full kind="soft" icon={<HandHelping />} disabled={actions.busy === k} onClick={async () => { if (await actions.take(k)) await actions.read(k); }}>
            ავიღე და წავიკითხე
          </Btn>
        </div>
      )}
      <div className="mt-2 empty:hidden"><Flash flash={actions.message} onClose={actions.clearMessage} /></div>
    </section>
  );
};
