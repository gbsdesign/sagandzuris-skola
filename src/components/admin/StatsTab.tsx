import React, { useMemo, useState } from 'react';
import { ChevronRight, Headphones } from 'lucide-react';
import { findVersion } from '../../data/chantLookup';
import { SchoolClass } from '../../hooks/useClasses';
import { PsalterGroup, useCycleHistory } from '../../hooks/usePsalter';
import { useAttendance } from '../../hooks/useTeaching';
import { KATHISMA_COUNT, cycleOf, georgiaToday, previousCycle, readCount } from '../../utils/psalter';
import { Bar } from '../ui/kit';
import { Fold } from './Fold';
import { UserRecord } from './UsersTab';

// The admin panel's numbers, each shown where it belongs (there is no separate statistics tab): a class's
// attendance on its row, a psalter group's reading on its row, the most listened chants under „სკოლა“;
// the people counts are the filters of the users list.

/** Attendance of the last 8 lessons in percent (null before the first lesson or without members) and the day of the
 *  last lesson ('' before the first), so a card tells a class that still meets from one that stopped. */
export const useClassAttendance = (cls: SchoolClass) => {
  const days = useAttendance(cls.id, 8);
  const last = days[0]?.date || '';
  if (!days.length || !cls.members.length) return { rate: null, last };
  return { rate: Math.round((days.reduce((a, d) => a + d.present.length, 0) / (days.length * cls.members.length)) * 100), last };
};

/** The last 6 cycles: kathismas read on average and cycles read in full; null before the first cycle ends. */
export const useGroupReading = (group: PsalterGroup) => {
  const docs = useCycleHistory(group.id, 10);
  return useMemo(() => {
    const byId = new Map(docs.map(d => [d.id, d.slots]));
    let c = previousCycle(cycleOf(georgiaToday(), group.cycleDays, group.shiftDays), group.cycleDays, group.shiftDays);
    const reads: number[] = [];
    for (let i = 0; i < 6; i++) {
      if (group.startDate && c.end < group.startDate) break;
      reads.push(readCount(byId.get(c.id)));
      c = previousCycle(c, group.cycleDays, group.shiftDays);
    }
    if (!reads.length) return null;
    return { avg: reads.reduce((a, b) => a + b, 0) / reads.length, full: reads.filter(r => r === KATHISMA_COUNT).length };
  }, [docs, group]);
};

/** The ten chant versions listened to most, by everyone together: five at first, „ყველას ნახვა“ shows all ten. */
export const TopChants: React.FC<{ users: UserRecord[] }> = ({ users }) => {
  const [all, setAll] = useState(false);
  const top = useMemo(() => {
    const sum = new Map<string, number>();
    for (const u of users) for (const [vid, n] of Object.entries(u.plays)) sum.set(vid, (sum.get(vid) || 0) + (Number(n) || 0));
    return [...sum.entries()]
      .map(([vid, n]) => ({ vid, n, info: findVersion(vid) }))
      .filter(x => x.info)
      .sort((a, b) => b.n - a.n)
      .slice(0, 10);
  }, [users]);
  const maxPlays = top[0]?.n || 1;
  const shown = all ? top : top.slice(0, 5);
  const first = top[0]?.info?.chant.title.replace(/[;\s]+$/, '');

  return (
    <Fold icon={<Headphones />} title="ყველაზე მოსმენადი"
      summary={first ? <>პირველი: <span className="font-semibold text-[#4a3426]">{first}</span></> : 'მოსმენები ჯერ არ დაგროვილა'}>
      {top.length === 0 ? (
        <p className="text-sm text-[#8a7a6a]">მოსმენები ჯერ არ დაგროვილა.</p>
      ) : (
        <>
          <ol className={`grid gap-x-8 ${all ? 'md:grid-cols-2 md:grid-flow-col md:grid-rows-5' : ''}`}>
            {shown.map((t, i) => (
              <li key={t.vid} className="flex items-center gap-3 py-2 border-b border-[#f1e8d9]">
                <span className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold tabular-nums ${i < 3 ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-[#f4ece0] text-[#8a7a6a]'}`}>{i + 1}</span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-baseline gap-2">
                    <span className="flex-1 min-w-0 text-[13.5px] font-semibold text-[#2a2017] truncate">{t.info!.chant.title.replace(/[;\s]+$/, '')}</span>
                    <span className="text-[13px] font-bold tabular-nums text-[#7a2028] shrink-0">{t.n}</span>
                  </span>
                  <span className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-[#9a8b7b] shrink-0">{t.info!.service} · {t.info!.variant.code}</span>
                    <span className="flex-1 min-w-0"><Bar value={t.n} max={maxPlays} /></span>
                  </span>
                </span>
              </li>
            ))}
          </ol>
          {top.length > 5 && (
            <button type="button" onClick={() => setAll(a => !a)}
              className="mt-3 ml-auto flex items-center gap-1 h-9 px-3.5 rounded-full bg-[#7a2028]/[0.06] hover:bg-[#7a2028]/[0.12] text-[13px] font-bold text-[#7a2028] cursor-pointer transition">
              {all ? 'ნაკლების ჩვენება' : `ყველას ნახვა · ${top.length}`}
              <ChevronRight className={`w-4 h-4 transition-transform ${all ? '-rotate-90' : ''}`} />
            </button>
          )}
        </>
      )}
    </Fold>
  );
};
