import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, History } from 'lucide-react';
import { Card, CardTitle, IconBtn } from '../ui/kit';
import { Cycle, KATHISMA_COUNT, Slots, formatRange, ownersIn, previousCycle } from '../../utils/psalter';
import { ALL_KATHISMAS, PsalterGroup, firstName, memberName, useCycleHistory } from '../../hooks/usePsalter';

// The finished cycles, one at a time (‹ date ›, or pick from the list): who read which kathisma and which
// were skipped. `footer` (the reminders switch and „how it works“) sits at its bottom.
export const GroupHistory: React.FC<{ group: PsalterGroup; current: Cycle; count?: number; footer?: React.ReactNode }> = ({ group, current, count = 12, footer }) => {
  const docs = useCycleHistory(group.id, count + 4);
  const rows = useMemo(() => {
    const byId = new Map(docs.map(d => [d.id, d.slots]));
    const out: { cycle: Cycle; read: number; slots: Slots }[] = [];
    let c = previousCycle(current, group.cycleDays, group.shiftDays);
    const since = group.startDate || (group.createdAt || '').slice(0, 10);
    for (let i = 0; i < count; i++) {
      if (since && c.end < since) break;
      const slots = byId.get(c.id) || {};
      out.push({ cycle: c, read: ALL_KATHISMAS.filter(k => slots[k]?.readBy).length, slots });
      c = previousCycle(c, group.cycleDays, group.shiftDays);
    }
    return out;
  }, [docs, current, group.cycleDays, group.shiftDays, group.startDate, group.createdAt, count]);

  const [at, setAt] = useState(0); // 0 = the latest finished cycle
  const row = rows[Math.min(at, rows.length - 1)];
  // who was to read each kathisma then (by today's distribution turned to that cycle; whoever took it, if anyone)
  const owners = useMemo(() => (row ? ownersIn(group.assignment, group.baseHalf, row.cycle.half) : {}), [row, group.assignment, group.baseHalf]);
  const short = (uid?: string) => firstName(memberName(group, uid));

  return (
    <Card>
      <CardTitle icon={<History />} title="ისტორია" hint="აირჩიე ციკლი: ვინ რომელი კანონი წაიკითხა, რომელი გამოტოვდა" />
      {!row ? (
        <p className="text-sm text-[#8a7a6a]">ჯგუფი ახლახან დაიწყო — ისტორია პირველი ციკლის შემდეგ გამოჩნდება.</p>
      ) : (
        <div>
          <div className="flex items-center gap-2">
            <IconBtn label="წინა ციკლი" disabled={at >= rows.length - 1} onClick={() => setAt(i => Math.min(i + 1, rows.length - 1))}><ChevronLeft /></IconBtn>
            <label className="relative flex-1 min-w-0 h-10 rounded-full bg-[#fbf6ec] ring-1 ring-[#efe3cf] flex items-center justify-center gap-1.5 text-sm font-semibold text-[#2a2017] cursor-pointer">
              <span className="truncate">{formatRange(row.cycle)}</span>
              <ChevronDown className="w-4 h-4 text-[#8a7a6a] shrink-0" />
              <select
                aria-label="ციკლის არჩევა"
                value={Math.min(at, rows.length - 1)}
                onChange={e => setAt(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              >
                {rows.map((r, i) => <option key={r.cycle.id} value={i}>{formatRange(r.cycle)} · {r.read}/{KATHISMA_COUNT}</option>)}
              </select>
            </label>
            <IconBtn label="შემდეგი ციკლი" disabled={at === 0} onClick={() => setAt(i => Math.max(i - 1, 0))}><ChevronRight /></IconBtn>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-[#efe5d4] overflow-hidden">
              <div className={`h-full rounded-full ${row.read === KATHISMA_COUNT ? 'bg-emerald-600' : 'bg-[#7a2028]'}`} style={{ width: `${(row.read / KATHISMA_COUNT) * 100}%` }} />
            </div>
            <span className={`text-sm font-bold tabular-nums ${row.read === KATHISMA_COUNT ? 'text-emerald-700' : 'text-[#4a3426]'}`}>{row.read}/{KATHISMA_COUNT}</span>
          </div>

          <ul className="mt-3 grid grid-cols-5 sm:grid-cols-10 gap-1.5">
            {ALL_KATHISMAS.map(k => {
              const s = row.slots[k];
              const read = !!s?.readBy;
              const who = read ? s!.readBy : s?.takenBy || (owners[k] || [])[0];
              return (
                <li
                  key={k}
                  title={read ? `${k} — წაიკითხა ${memberName(group, s!.readBy)}` : `${k} — გამოტოვდა${who ? ` (${memberName(group, who)})` : ''}`}
                  className={`h-12 rounded-lg px-1 flex flex-col items-center justify-center ${read ? 'bg-emerald-700 text-white' : 'bg-red-50 text-red-800 ring-1 ring-red-200'}`}
                >
                  <span className="font-serif-ge text-[15px] font-bold leading-none tabular-nums">{k}</span>
                  <span className="mt-0.5 w-full text-center text-[10px] leading-tight font-semibold truncate opacity-90">{who ? short(who) : '—'}</span>
                </li>
              );
            })}
          </ul>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-[#8a7a6a]">
            <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-700" /> წაიკითხა</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-50 ring-1 ring-red-200" /> გამოტოვდა (ვისი იყო)</span>
          </div>
        </div>
      )}
      {footer && <div className="mt-3 pt-3 border-t border-[#efe3cf]">{footer}</div>}
    </Card>
  );
};
