import React from 'react';
import { BookOpen, Check, Clock, HandHelping, LifeBuoy, ChevronRight, Settings2, Undo2, Users } from 'lucide-react';
import { useNavigation } from '../../context';
import { Btn, Flash } from '../ui/kit';
import { KATHISMA_COUNT, KATHISMA_PSALMS, formatLeft, readCount, formatRange, msLeft, nextShiftDate, georgiaToday } from '../../utils/psalter';
import { PsalterGroup, ergative, firstName, memberName, useGroupNow } from '../../hooks/usePsalter';
import { useKathismaActions } from './useKathismaActions';
import { openPsalterGroup } from './selectedGroup';

// "ჩემი კანონი": my kathisma(s) in this cycle, the time left, read / mark as read; who took mine; and
// the group's calls for help. On the home page it is compact and leads to the group page; on the group page
// a leader gets „მართვა“ in its top row.
export const MyKathismaCard: React.FC<{ group: PsalterGroup; uid: string; compact?: boolean; onManage?: () => void }> = ({ group, uid, compact, onManage }) => {
  const { openPrayer, navigateTo } = useNavigation();
  const { now, cycle, slots, mine, takenFromMe, helpWanted } = useGroupNow(group, uid);
  const actions = useKathismaActions(group, cycle);
  if (!cycle) return null;

  const left = msLeft(cycle, now);
  const urgent = left < 6 * 3600_000;
  const isMember = group.memberIds.includes(uid);
  const othersHelp = helpWanted.filter(h => h.by !== uid);
  const allRead = mine.length > 0 && mine.every(k => slots[k]?.readBy);
  const shift = nextShiftDate(georgiaToday(now), group.shiftDays);
  // My own unread kathismas: „დახმარება“ for them sits in the bottom strip.
  const helpable = compact ? [] : mine.filter(k => !slots[k]?.readBy && slots[k]?.takenBy !== uid);

  return (
    <section className="rounded-3xl overflow-hidden bg-gradient-to-br from-[#7a2028] via-[#6c1c24] to-[#4f141b] text-[#fbf6ec] shadow-[0_14px_30px_-18px_rgba(122,32,40,0.9)] sg-in">
      <div className="px-4 pt-3 pb-3.5 sm:px-5">
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
          {!compact && onManage && (
            <button
              type="button"
              onClick={onManage}
              className="ml-auto -mr-1 h-9 px-3 rounded-full text-[12px] font-bold text-[#fbf6ec] bg-white/10 ring-1 ring-white/20 hover:bg-white/20 inline-flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Settings2 className="w-4 h-4" /> მართვა
            </button>
          )}
        </div>

        {!isMember ? (
          <p className="mt-3 text-sm text-[#fbf6ec]/80">შენ ამ ჯგუფს ხელმძღვანელობ. თუ თავადაც კითხულობ, დაამატე თავი წევრებში.</p>
        ) : mine.length === 0 ? (
          <div className="mt-3">
            <p className="font-serif-ge text-xl font-bold">ამ ციკლში კანონი არ გაქვს</p>
            <p className="mt-1 text-sm text-[#fbf6ec]/75">მარაგში ხარ — როცა ვინმე დახმარებას ითხოვს, შეგიძლია აიღო მისი კანონი.</p>
          </div>
        ) : (
          <ul className="mt-2 divide-y divide-white/10">
            {mine.map(k => {
              const s = slots[k];
              const read = !!s?.readBy;
              const tookIt = s?.takenBy === uid;
              return (
                <li key={k} className="py-2.5 first:pt-1 last:pb-0">
                  <div className="flex items-center gap-3">
                    <span className={`relative w-12 h-12 rounded-xl flex items-center justify-center font-serif-ge text-[24px] font-bold tabular-nums shrink-0 ${read ? 'bg-emerald-600/90 text-white' : 'bg-[#fbf6ec] text-[#7a2028]'}`}>
                      {k}
                      {read && <Check className="absolute -top-1.5 -right-1.5 w-5 h-5 p-0.5 rounded-full bg-white text-emerald-700 stroke-[3]" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-serif-ge text-[16px] font-bold leading-snug">ფსალმუნნი {KATHISMA_PSALMS[k - 1]}</span>
                      <span className="block text-[13px] text-[#fbf6ec]/75">
                        {read ? 'წაკითხულია · ღმერთს ებარებოდე' : tookIt ? 'შენ აიღე ჯგუფის დასახმარებლად' : 'ამ ციკლში შენ კითხულობ'}
                      </span>
                    </span>
                  </div>
                  {!read && (
                    <div className="mt-2 pl-[60px] flex flex-wrap gap-2">
                      <Btn kind="light" size="sm" className="!h-10 !px-4" icon={<BookOpen />} onClick={() => openPrayer(`kathisma-${k}`)}>კითხვა</Btn>
                      <Btn kind="ghost" size="sm" className="!h-10 !px-4 !bg-white/10 !ring-white/25 !text-[#fbf6ec] hover:!bg-white/20" icon={<Check />} disabled={actions.busy === k} onClick={() => actions.read(k)}>
                        წავიკითხე
                      </Btn>
                    </div>
                  )}
                  {!compact && read && s?.readBy === uid && (
                    <button type="button" onClick={() => actions.unread(k)} className="mt-2 h-9 px-3 -ml-1 rounded-full text-[13px] font-semibold text-[#fbf6ec]/70 hover:text-white hover:bg-white/10 inline-flex items-center gap-1.5 cursor-pointer">
                      <Undo2 className="w-4 h-4" /> შემთხვევით მოვნიშნე
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}


        {takenFromMe.map(k => (
          <p key={k} className="mt-2.5 px-3 py-2 rounded-xl bg-white/10 text-[13px] leading-snug">
            შენი კანონი {k} {ergative(firstName(memberName(group, slots[k]?.takenBy)))} აიღო — ამ ციკლში მისი წასაკითხია.
          </p>
        ))}

        {!compact && <GroupPulse read={readCount(slots)} members={group.memberIds.length} />}
      </div>

      {isMember && (
        <div className="px-4 sm:px-5 py-2 bg-black/15 text-[12.5px]">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className={`min-w-0 inline-flex items-center gap-1.5 font-semibold ${urgent && !allRead ? 'text-amber-200' : 'text-[#fbf6ec]/80'}`}>
              <Clock className="w-4 h-4 shrink-0" />
              {formatRange(cycle)} · {allRead ? 'შენი წილი შესრულებულია' : `დარჩა ${formatLeft(left)}`}
            </span>
            {helpable.map(k => slots[k]?.help ? (
              <span key={k} className="ml-auto inline-flex items-center gap-1.5 text-amber-200 font-semibold">
                <LifeBuoy className="w-4 h-4" /> დახმარება ითხოვე{helpable.length > 1 ? ` · ${k}` : ''}
              </span>
            ) : (
              <button key={k} type="button" onClick={() => actions.askHelp(k)} className="ml-auto -mr-2 h-9 px-2.5 rounded-full font-semibold text-[#fbf6ec]/75 hover:text-white hover:bg-white/10 inline-flex items-center gap-1.5 cursor-pointer">
                <LifeBuoy className="w-4 h-4" /> ვერ ვკითხულობ{helpable.length > 1 ? ` · ${k}` : ''}
              </button>
            ))}
          </div>
          {!compact && <p className="text-[11.5px] text-[#fbf6ec]/55 leading-snug">{shift.from} ყველა ერთი კანონით წინ გადადის.</p>}
        </div>
      )}

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


      {actions.message && (
        <div className="px-3 pb-3 bg-transparent">
          <Flash flash={actions.message} onClose={actions.clearMessage} />
        </div>
      )}
    </section>
  );
};

// The whole group in this cycle: a ring of the kathismas read so far, and how many members there are.
const GroupPulse: React.FC<{ read: number; members: number }> = ({ read, members }) => {
  const gradId = `gp${React.useId().replace(/[^\w-]/g, '')}`;
  const total = KATHISMA_COUNT;
  const done = read >= total;
  const r = 31;
  const len = 2 * Math.PI * r;
  return (
    <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-4">
      <div className="relative w-[78px] h-[78px] shrink-0" role="img" aria-label={`წაკითხულია ${read} კანონი ${total}-დან`}>
        <svg viewBox="0 0 78 78" className="w-full h-full -rotate-90" aria-hidden>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={done ? '#a7f3d0' : '#fbe7c6'} />
              <stop offset="100%" stopColor={done ? '#34d399' : '#e2b26f'} />
            </linearGradient>
          </defs>
          <circle cx="39" cy="39" r={r} fill="none" strokeWidth="9" className="stroke-white/15" />
          {read > 0 && (
            <circle
              cx="39" cy="39" r={r} fill="none" strokeWidth="9" strokeLinecap="round"
              stroke={`url(#${gradId})`}
              strokeDasharray={len}
              strokeDashoffset={len * (1 - Math.min(read, total) / total)}
              className="transition-[stroke-dashoffset] duration-700 ease-out"
            />
          )}
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          {done ? <Check className="w-7 h-7 text-emerald-300 stroke-[3]" /> : (
            <>
              <span className="font-serif-ge text-[22px] font-bold tabular-nums">{read}</span>
              <span className="mt-0.5 text-[11px] text-[#fbf6ec]/55 tabular-nums">/ {total}</span>
            </>
          )}
        </span>
      </div>

      <div className="min-w-0 flex-1 space-y-1 text-[13px]">
        <p className="text-[11px] font-bold tracking-wide uppercase text-[#fbf6ec]/55">ჯგუფი ამ ციკლში</p>
        <p className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${done ? 'bg-emerald-300' : 'bg-[#eac58f]'}`} />
          წაკითხული <b className="ml-auto tabular-nums">{read}</b>
        </p>
        <p className="flex items-center gap-2 text-[#fbf6ec]/75">
          <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-white/20" />
          დარჩა <b className="ml-auto tabular-nums text-[#fbf6ec]">{Math.max(total - read, 0)}</b>
        </p>
      </div>

      <div className="self-stretch w-px bg-white/10" />
      <div className="shrink-0 w-14 text-center">
        <Users className="w-4 h-4 mx-auto text-[#fbf6ec]/55" />
        <p className="mt-1 font-serif-ge text-[22px] font-bold tabular-nums leading-none">{members}</p>
        <p className="mt-1 text-[11.5px] text-[#fbf6ec]/65 leading-none">წევრი</p>
      </div>
    </div>
  );
};
