import React, { useMemo } from 'react';
import { Headphones } from 'lucide-react';
import { findVersion } from '../../data/chantLookup';
import { SchoolClass } from '../../hooks/useClasses';
import { PsalterGroup, useCycleHistory } from '../../hooks/usePsalter';
import { useAttendance } from '../../hooks/useTeaching';
import { KATHISMA_COUNT, cycleOf, georgiaToday, previousCycle, readCount } from '../../utils/psalter';
import { Bar, Card, CardTitle } from '../ui/kit';
import { UserRecord } from './UsersTab';

// The admin panel's numbers, each shown where it belongs (there is no separate statistics tab): a class's
// attendance on its row, a psalter group's reading on its row, the most listened chants under „ჩანაწერები“;
// the people counts are the filters of the users list.

/** Attendance of the last 8 lessons in percent; null before the first lesson. */
export const useClassAttendance = (cls: SchoolClass) => {
  const days = useAttendance(cls.id, 8);
  if (!days.length || !cls.members.length) return null;
  return Math.round((days.reduce((a, d) => a + d.present.length, 0) / (days.length * cls.members.length)) * 100);
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

/** The ten chant versions listened to most, by everyone together. */
export const TopChants: React.FC<{ users: UserRecord[] }> = ({ users }) => {
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

  return (
    <Card>
      <CardTitle icon={<Headphones />} title="ყველაზე მოსმენადი საგალობლები"
        info="სინთეზატორით ან ჩანაწერით მოსმენა. ერთი ადამიანი ერთ ვერსიას ერთხელ ითვლება ყოველ შესვლაზე." />
      {top.length === 0 ? (
        <p className="text-sm text-[#8a7a6a]">მოსმენები ჯერ არ დაგროვილა.</p>
      ) : (
        <ol className="space-y-2.5">
          {top.map((t, i) => (
            <li key={t.vid} className="flex items-center gap-3">
              <span className="w-6 text-right text-sm font-bold text-[#b3a594] tabular-nums">{i + 1}</span>
              <span className="flex-1 min-w-0">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-[#2a2017] truncate">{t.info!.chant.title.replace(/[;\s]+$/, '')}</span>
                  <span className="text-sm font-bold tabular-nums text-[#7a2028] shrink-0">{t.n}</span>
                </span>
                <span className="block text-xs text-[#8a7a6a] mb-1">{t.info!.service} · {t.info!.variant.code}</span>
                <Bar value={t.n} max={maxPlays} />
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
};
