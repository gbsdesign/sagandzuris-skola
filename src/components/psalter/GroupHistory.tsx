import React, { useMemo } from 'react';
import { History } from 'lucide-react';
import { Card, CardTitle } from '../ui/kit';
import { Cycle, KATHISMA_COUNT, formatRange, previousCycle } from '../../utils/psalter';
import { ALL_KATHISMAS, PsalterGroup, useCycleHistory } from '../../hooks/usePsalter';

// The latest finished cycles: how many kathismas the group read and which were skipped.
export const GroupHistory: React.FC<{ group: PsalterGroup; current: Cycle; count?: number }> = ({ group, current, count = 6 }) => {
  const docs = useCycleHistory(group.id, count + 4);
  const rows = useMemo(() => {
    const byId = new Map(docs.map(d => [d.id, d.slots]));
    const out: { cycle: Cycle; read: number; skipped: number[] }[] = [];
    let c = previousCycle(current, group.cycleDays);
    const since = group.startDate || (group.createdAt || '').slice(0, 10);
    for (let i = 0; i < count; i++) {
      if (since && c.end < since) break;
      const slots = byId.get(c.id) || {};
      const skipped = ALL_KATHISMAS.filter(k => !slots[k]?.readBy);
      out.push({ cycle: c, read: KATHISMA_COUNT - skipped.length, skipped });
      c = previousCycle(c, group.cycleDays);
    }
    return out;
  }, [docs, current, group.cycleDays, group.startDate, group.createdAt, count]);

  return (
    <Card>
      <CardTitle icon={<History />} title="ისტორია" hint="ბოლო ციკლები: რამდენი წაიკითხა ჯგუფმა და რომელი კანონი გამოტოვდა" />
      {rows.length === 0 ? (
        <p className="text-sm text-[#8a7a6a]">ჯგუფი ახლახან დაიწყო — ისტორია პირველი ციკლის შემდეგ გამოჩნდება.</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map(({ cycle, read, skipped }) => {
            const full = read === KATHISMA_COUNT;
            return (
              <li key={cycle.id} className="rounded-2xl bg-[#fbf6ec] ring-1 ring-[#efe3cf] px-3.5 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex-1 min-w-0 font-semibold text-[#2a2017] text-sm">{formatRange(cycle)}</span>
                  <span className={`text-sm font-bold tabular-nums ${full ? 'text-emerald-700' : 'text-[#4a3426]'}`}>{read}/{KATHISMA_COUNT}</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-[#efe5d4] overflow-hidden">
                  <div className={`h-full rounded-full ${full ? 'bg-emerald-600' : 'bg-[#7a2028]'}`} style={{ width: `${(read / KATHISMA_COUNT) * 100}%` }} />
                </div>
                {full ? (
                  <p className="mt-2 text-xs font-semibold text-emerald-700">ფსალმუნი სრულად წაიკითხა ✦</p>
                ) : read === 0 ? (
                  <p className="mt-2 text-xs text-[#8a7a6a]">ამ ციკლში მონიშვნა არ ყოფილა.</p>
                ) : (
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    <span className="text-xs text-[#8a7a6a] mr-1">გამოტოვდა:</span>
                    {skipped.map(k => (
                      <span key={k} className="min-w-6 h-6 px-1.5 rounded-md bg-red-50 text-red-800 ring-1 ring-red-200 text-[11px] font-bold flex items-center justify-center tabular-nums">{k}</span>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
};
