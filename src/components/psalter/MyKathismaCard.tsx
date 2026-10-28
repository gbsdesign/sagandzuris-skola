import React from 'react';
import { BookOpen, Check, HandHelping, LifeBuoy, ChevronRight, Settings2, Users } from 'lucide-react';
import { useNavigation } from '../../context';
import { Btn, Flash } from '../ui/kit';
import { KATHISMA_COUNT, formatLeft, readCount, msLeft } from '../../utils/psalter';
import { PsalterGroup, ergative, firstName, memberName, useGroupNow } from '../../hooks/usePsalter';
import { useKathismaActions } from './useKathismaActions';
import { openPsalterGroup } from './selectedGroup';

// "ჩემი კანონი" on the group page: on top the group in this cycle (ring, members, „მართვა“ for a leader),
// below my kanon(s). Tapping the number marks it read and tapping again takes the mark back — no extra
// buttons or hints (the user's wish, 2026-10-20). Calls for help stay in the amber strip.
export const MyKathismaCard: React.FC<{ group: PsalterGroup; uid: string; compact?: boolean; onManage?: () => void }> = ({ group, uid, compact, onManage }) => {
  const { openPrayer, navigateTo } = useNavigation();
  const { now, cycle, slots, mine, takenFromMe, helpWanted } = useGroupNow(group, uid);
  const actions = useKathismaActions(group, cycle);
  if (!cycle) return null;

  const left = msLeft(cycle, now);
  const urgent = left < 6 * 3600_000;
  const isMember = group.memberIds.includes(uid);
  const othersHelp = helpWanted.filter(h => h.by !== uid);

  return (
    <section className="rounded-3xl overflow-hidden bg-gradient-to-br from-[#7a2028] via-[#6c1c24] to-[#4f141b] text-[#fbf6ec] shadow-[0_14px_30px_-18px_rgba(122,32,40,0.9)] sg-in">
      <div className="px-4 pt-3.5 pb-4 sm:px-5">
        {compact ? (
          <div className="flex justify-end -mt-1 -mr-1.5">
            <button type="button" onClick={() => { openPsalterGroup(group.id); navigateTo('psalter'); }}
              className="h-8 pl-2.5 pr-1.5 rounded-full text-[12px] font-bold text-[#fbf6ec]/85 hover:bg-white/10 inline-flex items-center gap-0.5 cursor-pointer">
              ჯგუფი <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <GroupPulse read={readCount(slots)} members={group.memberIds.length} onManage={onManage} />
        )}

        <div className={compact ? '' : 'mt-4 pt-4 border-t border-white/10'}>
          {!isMember ? (
            <p className="text-sm text-[#fbf6ec]/80">შენ ამ ჯგუფს ხელმძღვანელობ. თუ თავადაც კითხულობ, დაამატე თავი წევრებში.</p>
          ) : mine.length === 0 ? (
            <div>
              <p className="font-serif-ge text-lg font-bold">ამ ციკლში კანონი არ გაქვს</p>
              <p className="mt-0.5 text-[13px] text-[#fbf6ec]/70">მარაგში ხარ — როცა ვინმე დახმარებას ითხოვს, შეგიძლია აიღო მისი კანონი.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {mine.map(k => {
                const s = slots[k];
                const read = !!s?.readBy;
                const tookIt = s?.takenBy === uid;
                // a kanon someone else marked (one I took over is mine to mark) can't be unmarked from here
                const canToggle = !read || s?.readBy === uid;
                const busy = actions.busy === k;
                const canAskHelp = !compact && !read && !tookIt;
                return (
                  <li key={k} className="flex items-center gap-3.5">
                    <button type="button" aria-pressed={read} disabled={!canToggle || busy}
                      aria-label={read ? `კანონი ${k} — მონიშვნის მოხსნა` : `კანონი ${k} — წავიკითხე`}
                      onClick={() => (read ? actions.unread(k) : actions.read(k))}
                      className={`relative w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center font-serif-ge text-[26px] font-bold tabular-nums cursor-pointer transition active:scale-95 disabled:cursor-default ${busy ? 'opacity-70' : ''} ${read ? 'bg-[#fbf6ec]/80 text-[#7a2028]/60' : 'bg-[#fbf6ec] text-[#7a2028] hover:bg-white'}`}>
                      {k}
                      <span className={`absolute -top-1.5 -right-1.5 w-[22px] h-[22px] rounded-full flex items-center justify-center transition ${read ? 'bg-emerald-600 text-white ring-2 ring-[#fbf6ec]/60' : 'bg-[#6c1c24] ring-2 ring-[#fbf6ec]/60'}`}>
                        {read && <Check className="w-3.5 h-3.5 stroke-[3.5]" />}
                      </span>
                    </button>
                    <span className="min-w-0 flex-1">
                      <span className="block font-serif-ge text-[18px] font-bold leading-tight">კანონი</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[13px] text-[#fbf6ec]/70">
                        {read ? 'ღმერთს ებარებოდე' : tookIt ? 'შენ აიღე ჯგუფის დასახმარებლად' : (
                          <span className={urgent ? 'text-amber-200 font-semibold' : ''}>დარჩა {formatLeft(left)}</span>
                        )}
                        {canAskHelp && (s?.help ? (
                          <span className="inline-flex items-center gap-1 text-amber-200 font-semibold">· <LifeBuoy className="w-3.5 h-3.5" /> დახმარება ითხოვე</span>
                        ) : (
                          <button type="button" onClick={() => actions.askHelp(k)}
                            className="h-7 -my-1 px-1.5 rounded-full font-semibold text-[#fbf6ec]/60 hover:text-white hover:bg-white/10 inline-flex items-center gap-1 cursor-pointer">
                            · <LifeBuoy className="w-3.5 h-3.5" /> ვერ ვკითხულობ
                          </button>
                        ))}
                      </span>
                    </span>
                    {!read && (
                      <Btn kind="light" size="sm" className="!h-10 !px-4 shrink-0" icon={<BookOpen />} onClick={() => openPrayer(`kathisma-${k}`)}>კითხვა</Btn>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {takenFromMe.map(k => (
            <p key={k} className="mt-3 px-3 py-2 rounded-xl bg-white/10 text-[13px] leading-snug">
              შენი კანონი {k} {ergative(firstName(memberName(group, slots[k]?.takenBy)))} აიღო — ამ ციკლში მისი წასაკითხია.
            </p>
          ))}
        </div>
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

      {actions.message && (
        <div className="px-3 pb-3 bg-transparent">
          <Flash flash={actions.message} onClose={actions.clearMessage} />
        </div>
      )}
    </section>
  );
};

// The whole group in this cycle: a ring of the kanons read so far and how many members there are;
// a leader's „მართვა“ sits in its top row.
const GroupPulse: React.FC<{ read: number; members: number; onManage?: () => void }> = ({ read, members, onManage }) => {
  const gradId = `gp${React.useId().replace(/[^\w-]/g, '')}`;
  const total = KATHISMA_COUNT;
  const done = read >= total;
  const r = 31;
  const len = 2 * Math.PI * r;
  return (
    <div>
      <div className="flex items-center gap-2 min-h-9">
        <p className="text-[12px] font-bold text-[#f3d9b5]">ჯგუფი ამ ციკლში</p>
        {onManage && (
          <button type="button" onClick={onManage}
            className="ml-auto -mr-1 h-9 px-3 rounded-full text-[12px] font-bold text-[#fbf6ec] bg-white/10 ring-1 ring-white/20 hover:bg-white/20 inline-flex items-center gap-1.5 cursor-pointer shrink-0">
            <Settings2 className="w-4 h-4" /> მართვა
          </button>
        )}
      </div>

      <div className="mt-2 flex items-center gap-4">
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

        <div className="min-w-0 flex-1 space-y-1.5 text-[13px]">
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
    </div>
  );
};
