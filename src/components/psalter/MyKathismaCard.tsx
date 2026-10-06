import React from 'react';
import { BookOpen, Check, Clock, HandHelping, LifeBuoy, ChevronRight, Undo2 } from 'lucide-react';
import { useNavigation } from '../../context';
import { Btn, Flash } from '../ui/kit';
import { KATHISMA_PSALMS, formatLeft, formatRange, msLeft, nextShiftDate, georgiaToday } from '../../utils/psalter';
import { PsalterGroup, ergative, firstName, memberName, useGroupNow } from '../../hooks/usePsalter';
import { useKathismaActions } from './useKathismaActions';
import { openPsalterGroup } from './selectedGroup';

// "ჩემი კანონი": my kathisma(s) in this cycle, the time left, read / mark as read; who took mine; and
// the group's calls for help. On the home page it is compact and leads to the group page.
export const MyKathismaCard: React.FC<{ group: PsalterGroup; uid: string; compact?: boolean }> = ({ group, uid, compact }) => {
  const { openPrayer, navigateTo } = useNavigation();
  const { now, cycle, slots, mine, takenFromMe, helpWanted } = useGroupNow(group, uid);
  const actions = useKathismaActions(group, cycle);
  if (!cycle) return null;

  const left = msLeft(cycle, now);
  const urgent = left < 6 * 3600_000;
  const isMember = group.memberIds.includes(uid);
  const othersHelp = helpWanted.filter(h => h.by !== uid);
  const allRead = mine.length > 0 && mine.every(k => slots[k]?.readBy);
  const shift = nextShiftDate(georgiaToday(now));

  return (
    <section className="rounded-3xl overflow-hidden bg-gradient-to-br from-[#7a2028] via-[#6c1c24] to-[#4f141b] text-[#fbf6ec] shadow-[0_14px_30px_-18px_rgba(122,32,40,0.9)] sg-in">
      <div className="p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold tracking-wide uppercase text-[#f3d9b5]">ჩემი კანონი</span>
          <span className="text-[12px] text-[#fbf6ec]/60 truncate">· {group.name}</span>
          {compact && (
            <button
              type="button"
              onClick={() => { openPsalterGroup(group.id); navigateTo('psalter'); }}
              className="ml-auto -mr-1 h-8 pl-2.5 pr-1.5 rounded-full text-[12px] font-bold text-[#fbf6ec]/85 hover:bg-white/10 inline-flex items-center gap-0.5 cursor-pointer"
            >
              ჯგუფი <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {!isMember ? (
          <p className="mt-3 text-sm text-[#fbf6ec]/80">შენ ამ ჯგუფს ხელმძღვანელობ. თუ თავადაც კითხულობ, დაამატე თავი წევრებში.</p>
        ) : mine.length === 0 ? (
          <div className="mt-3">
            <p className="font-serif-ge text-xl font-bold">ამ ციკლში კანონი არ გაქვს</p>
            <p className="mt-1 text-sm text-[#fbf6ec]/75">მარაგში ხარ — შეგიძლია დაეხმარო ჯგუფს და აიღო წაუკითხავი კანონი.</p>
          </div>
        ) : (
          <ul className="mt-2 divide-y divide-white/10">
            {mine.map(k => {
              const s = slots[k];
              const read = !!s?.readBy;
              const tookIt = s?.takenBy === uid;
              const ownIt = !tookIt;
              return (
                <li key={k} className="py-3 first:pt-1 last:pb-0">
                  <div className="flex items-center gap-3.5">
                    <span className={`relative w-16 h-16 rounded-2xl flex items-center justify-center font-serif-ge text-[32px] font-bold tabular-nums shrink-0 ${read ? 'bg-emerald-600/90 text-white' : 'bg-[#fbf6ec] text-[#7a2028]'}`}>
                      {k}
                      {read && <Check className="absolute -top-1.5 -right-1.5 w-6 h-6 p-1 rounded-full bg-white text-emerald-700 stroke-[3]" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-serif-ge text-[17px] font-bold leading-snug">ფსალმუნნი {KATHISMA_PSALMS[k - 1]}</span>
                      <span className="block text-[13px] text-[#fbf6ec]/75">
                        {read ? 'წაკითხულია · ღმერთმა შეგეწიოს' : tookIt ? 'შენ აიღე ჯგუფის დასახმარებლად' : 'ამ ციკლში შენ კითხულობ'}
                      </span>
                    </span>
                  </div>
                  {!read && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Btn kind="light" icon={<BookOpen />} onClick={() => openPrayer(`kathisma-${k}`)}>კითხვა</Btn>
                      <Btn kind="ghost" className="!bg-white/10 !ring-white/25 !text-[#fbf6ec] hover:!bg-white/20" icon={<Check />} disabled={actions.busy === k} onClick={() => actions.read(k)}>
                        წავიკითხე
                      </Btn>
                    </div>
                  )}
                  {!compact && read && s?.readBy === uid && (
                    <button type="button" onClick={() => actions.unread(k)} className="mt-2 h-9 px-3 -ml-1 rounded-full text-[13px] font-semibold text-[#fbf6ec]/70 hover:text-white hover:bg-white/10 inline-flex items-center gap-1.5 cursor-pointer">
                      <Undo2 className="w-4 h-4" /> შემთხვევით მოვნიშნე
                    </button>
                  )}
                  {!compact && !read && ownIt && (s?.help ? (
                    <p className="mt-2 text-[13px] text-amber-200 inline-flex items-center gap-1.5"><LifeBuoy className="w-4 h-4" /> დახმარება ითხოვე — ჯგუფი ხედავს</p>
                  ) : (
                    <button type="button" onClick={() => actions.askHelp(k)} className="mt-1.5 h-9 px-3 -ml-1 rounded-full text-[13px] font-semibold text-[#fbf6ec]/70 hover:text-white hover:bg-white/10 inline-flex items-center gap-1.5 cursor-pointer">
                      <LifeBuoy className="w-4 h-4" /> ვერ ვკითხულობ — დახმარება მჭირდება
                    </button>
                  ))}
                </li>
              );
            })}
          </ul>
        )}

        {isMember && (
          <div className={`mt-3.5 flex items-center gap-1.5 text-[13px] font-semibold ${urgent && !allRead ? 'text-amber-200' : 'text-[#fbf6ec]/75'}`}>
            <Clock className="w-4 h-4 shrink-0" />
            <span className="min-w-0">ციკლი {formatRange(cycle)} · {allRead ? 'შენი წილი შესრულებულია' : `დარჩა ${formatLeft(left)}`}</span>
          </div>
        )}

        {takenFromMe.map(k => (
          <p key={k} className="mt-2.5 px-3 py-2 rounded-xl bg-white/10 text-[13px] leading-snug">
            შენი კანონი {k} {ergative(firstName(memberName(group, slots[k]?.takenBy)))} აიღო — ამ ციკლში მისი წასაკითხია.
          </p>
        ))}
      </div>

      {isMember && othersHelp.length > 0 && (
        <div className="px-4 sm:px-5 py-3 bg-amber-100 text-amber-950">
          {othersHelp.map(h => (
            <div key={h.k} className="flex items-center gap-2.5 py-1">
              <LifeBuoy className="w-5 h-5 shrink-0 text-amber-700" />
              <span className="flex-1 min-w-0 text-[13px] leading-snug">
                <b>{firstName(memberName(group, h.by))}</b> დახმარებას ითხოვს — კანონი <b>{h.k}</b>
              </span>
              <Btn size="sm" icon={<HandHelping />} disabled={actions.busy === h.k} onClick={() => actions.take(h.k)}>აღება</Btn>
            </div>
          ))}
        </div>
      )}

      {!compact && isMember && (
        <p className="px-4 sm:px-5 py-2.5 text-[12px] text-[#fbf6ec]/60 bg-black/10">
          {shift.from} ყველა ერთი კანონით წინ გადადის.
        </p>
      )}

      {actions.message && (
        <div className="px-3 pb-3 bg-transparent">
          <Flash flash={actions.message} onClose={actions.clearMessage} />
        </div>
      )}
    </section>
  );
};
