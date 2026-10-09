import React, { useMemo } from 'react';
import { Activity, Headphones, BookOpen, GraduationCap } from 'lucide-react';
import { findVersion } from '../../data/chantLookup';
import { SchoolClass } from '../../hooks/useClasses';
import { PsalterGroup, useCycleHistory } from '../../hooks/usePsalter';
import { useAttendance } from '../../hooks/useTeaching';
import { KATHISMA_COUNT, cycleOf, georgiaToday, previousCycle, readCount } from '../../utils/psalter';
import { Bar, Card, CardTitle, Stat } from '../ui/kit';
import { UserRecord } from './UsersTab';

const DAY = 86400_000;
const within = (iso: string, days: number) => !!iso && Date.now() - new Date(iso).getTime() < days * DAY;

// "სტატისტიკა": active people, the most listened chants, how the psalter groups and classes are doing.
export const StatsTab: React.FC<{ users: UserRecord[]; classes: SchoolClass[]; groups: PsalterGroup[] }> = ({ users, classes, groups }) => {
  const active7 = users.filter(u => within(u.lastActiveAt, 7)).length;
  const active30 = users.filter(u => within(u.lastActiveAt, 30)).length;
  const withHabits = users.filter(u => Object.keys(u.habitLog).some(d => within(d, 7))).length;

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
    <div className="space-y-4">
      <div className="grid grid-cols-2 min-[520px]:grid-cols-4 gap-2">
        <Stat value={users.length} label="რეგისტრირებული" />
        <Stat value={active7} label="აქტიური 7 დღეში" tone="green" />
        <Stat value={active30} label="აქტიური 30 დღეში" tone="wine" />
        <Stat value={withHabits} label="ჩვევებს ინიშნავს" tone="amber" />
      </div>

      <Card>
        <CardTitle icon={<Headphones />} title="ყველაზე მოსმენადი საგალობლები" hint="სინთეზატორით ან ჩანაწერით მოსმენა; ერთი ადამიანი ერთ ვერსიას ერთხელ ითვლება ყოველ შესვლაზე" />
        {top.length === 0 ? (
          <p className="text-sm text-[#8a7a6a]">მოსმენები ჯერ არ დაგროვილა — ითვლება ამ განახლებიდან.</p>
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

      <Card>
        <CardTitle icon={<BookOpen />} title="ფსალმუნთა ჯგუფები" hint="ბოლო 6 ციკლი: რამდენი კანონი იკითხებოდა საშუალოდ" />
        {groups.length === 0 ? <p className="text-sm text-[#8a7a6a]">ჯგუფი ჯერ არ არის.</p> : (
          <ul className="space-y-3">{groups.map(g => <GroupPerf key={g.id} group={g} />)}</ul>
        )}
      </Card>

      <Card>
        <CardTitle icon={<GraduationCap />} title="კლასები" hint="ბოლო 8 გაკვეთილის დასწრება" />
        {classes.length === 0 ? <p className="text-sm text-[#8a7a6a]">კლასი ჯერ არ არის.</p> : (
          <ul className="space-y-3">{classes.map(c => <ClassPerf key={c.id} cls={c} />)}</ul>
        )}
      </Card>

      <p className="flex items-center gap-2 text-xs text-[#8a7a6a]"><Activity className="w-4 h-4" /> „აქტიური“ — ვინც ამ დროში საიტზე შევიდა.</p>
    </div>
  );
};

const GroupPerf: React.FC<{ group: PsalterGroup }> = ({ group }) => {
  const docs = useCycleHistory(group.id, 10);
  const { avg, full } = useMemo(() => {
    const byId = new Map(docs.map(d => [d.id, d.slots]));
    let c = previousCycle(cycleOf(georgiaToday(), group.cycleDays, group.shiftDays), group.cycleDays, group.shiftDays);
    const reads: number[] = [];
    for (let i = 0; i < 6; i++) {
      if (group.startDate && c.end < group.startDate) break;
      reads.push(readCount(byId.get(c.id)));
      c = previousCycle(c, group.cycleDays, group.shiftDays);
    }
    return { avg: reads.length ? reads.reduce((a, b) => a + b, 0) / reads.length : 0, full: reads.filter(r => r === KATHISMA_COUNT).length };
  }, [docs, group]);
  return (
    <li>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="text-sm font-semibold text-[#2a2017] truncate">{group.name} <span className="font-normal text-[#8a7a6a]">· {group.members.length} წევრი</span></span>
        <span className="text-sm font-bold tabular-nums text-[#4a3426] shrink-0">{avg.toFixed(1)}/20</span>
      </div>
      <Bar value={avg} max={KATHISMA_COUNT} tone={avg >= 19.5 ? 'green' : 'wine'} />
      <p className="mt-1 text-xs text-[#8a7a6a]">სრულად წაკითხული ციკლი: {full}</p>
    </li>
  );
};

const ClassPerf: React.FC<{ cls: SchoolClass }> = ({ cls }) => {
  const days = useAttendance(cls.id, 8);
  const rate = days.length && cls.members.length ? days.reduce((a, d) => a + d.present.length, 0) / (days.length * cls.members.length) : 0;
  return (
    <li>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="text-sm font-semibold text-[#2a2017] truncate">{cls.name} <span className="font-normal text-[#8a7a6a]">· {cls.members.length} მოსწავლე</span></span>
        <span className="text-sm font-bold tabular-nums text-[#4a3426] shrink-0">{days.length ? `${Math.round(rate * 100)}%` : '—'}</span>
      </div>
      <Bar value={rate * 100} max={100} tone={rate >= 0.75 ? 'green' : 'wine'} />
    </li>
  );
};
