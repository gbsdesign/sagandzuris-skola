import React from 'react';
import { Cake, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../context';
import { Birthday, ageNow, inDaysText, nextBirthday, turning, useBirthdays } from '../utils/birthdays';
import { NameDay, useNameDays } from '../utils/nameDays';
import { useMembership } from '../utils/memberAccess';
import { MONTHS_GE, MONTHS_SHORT_GE } from '../utils/dateNames';
import { Avatar, Empty } from '../components/ui/kit';
import { MyNameDay } from '../components/birthdays/MyNameDay';

// „დაბადების დღეები“: who and when, for every member, with the name days („ანგელოზის დღე“) the members chose. On top
// my own name day; then the next month's days in the order they come; under them the whole year month by month,
// starting with this one. Members see the day and month only; teachers and admins also the age, and the coming
// week's days stand out for them in gold (bigger), so nobody is forgotten.

const SOON_DAYS = 30;
const HIGHLIGHT_DAYS = 7;

type Ev = { key: string; uid: string; name: string; photoURL?: string; month: number; day: number } & (
  { kind: 'birth'; b: Birthday } | { kind: 'name'; saint: string }
);

const events = (births: Birthday[], names: NameDay[]): Ev[] => [
  ...births.map(b => ({ key: `b-${b.uid}`, uid: b.uid, name: b.name, photoURL: b.photoURL, month: b.month, day: b.day, kind: 'birth' as const, b })),
  ...names.map(n => ({ key: `n-${n.uid}`, uid: n.uid, name: n.name, photoURL: n.photoURL, month: n.month, day: n.day, kind: 'name' as const, saint: n.saint })),
];

export const BirthdaysPage: React.FC = () => {
  const { user, isTeacher } = useAuth();
  const { isMember } = useMembership();
  const births = useBirthdays(!!user && isMember, isTeacher);
  const names = useNameDays(!!user && isMember);

  if (!births || !names) return <div className="py-16 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-[#7a2028]" /></div>;

  const now = new Date();
  const all = events(births, names);
  const withNext = all.map(e => ({ e, ...nextBirthday(e, now) }));
  const soon = withNext.filter(x => x.days <= SOON_DAYS).sort((a, z) => a.days - z.days || a.e.name.localeCompare(z.e.name, 'ka'));
  const thisMonth = now.getMonth() + 1;
  const months = Array.from({ length: 12 }, (_, i) => ((thisMonth - 1 + i) % 12) + 1)
    .map(m => ({ m, people: all.filter(e => e.month === m).sort((a, z) => a.day - z.day || a.name.localeCompare(z.name, 'ka')) }))
    .filter(x => x.people.length);

  return (
    <div className="w-full max-w-2xl mx-auto px-1 pb-10 space-y-6 text-[#2a2017]">
      <MyNameDay mine={names.find(n => n.uid === user?.uid)} />

      {!all.length && <Empty icon={<Cake />} title="ჯერ არავის ჩაუწერია დაბადების თარიღი" />}

      {soon.length > 0 && (
        <section aria-label="მალე">
          <h2 className="px-1 mb-2 font-serif-ge text-lg font-bold text-[#4a3426]">მალე</h2>
          <ul className="space-y-2">
            {soon.map(({ e, days }) => (
              <SoonRow key={e.key} e={e} days={days} me={e.uid === user?.uid} staff={isTeacher} />
            ))}
          </ul>
        </section>
      )}

      {months.map(({ m, people }) => (
        <section key={m} aria-label={MONTHS_GE[m - 1]}>
          <h2 className="px-1 mb-1.5 flex items-baseline gap-2 font-serif-ge text-lg font-bold text-[#4a3426]">
            {MONTHS_GE[m - 1]}
            <span className="font-sans text-sm font-bold text-[#a4927c] tabular-nums">{people.length}</span>
          </h2>
          <ul className="rounded-3xl bg-white/70 ring-1 ring-[#e8dcc8] divide-y divide-[#f1e8d9] px-2">
            {people.map(e => {
              const age = isTeacher && e.kind === 'birth' ? ageNow(e.b, now) : undefined;
              const today = nextBirthday(e, now).days === 0;
              return (
                <li key={e.key} className={`min-h-14 flex items-center gap-3 px-2 py-1.5 ${e.uid === user?.uid ? 'bg-[#7a2028]/[0.04] rounded-2xl' : ''}`}>
                  <span className={`w-11 h-11 shrink-0 rounded-xl flex flex-col items-center justify-center leading-none ${today ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-[#fbf6ec] ring-1 ring-[#e8dcc8] text-[#4a3426]'}`}>
                    <span className="font-serif-ge text-[17px] font-bold tabular-nums">{e.day}</span>
                    <span className="mt-0.5 text-[11px] font-semibold opacity-75">{MONTHS_SHORT_GE[e.month - 1]}</span>
                  </span>
                  <Avatar name={e.name} photo={e.photoURL} size={36} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] font-semibold truncate">
                      {e.name}
                      {e.uid === user?.uid && <span className="ml-1.5 text-xs font-normal text-[#8a7a6a]">(შენ)</span>}
                    </span>
                    {e.kind === 'name' && <span className="flex items-center gap-1 text-[12px] font-semibold text-[#7a2028]"><Sparkles className="w-3 h-3" />ანგელოზის დღე</span>}
                  </span>
                  {age !== undefined && <span className="shrink-0 text-sm font-semibold tabular-nums text-[#8a7a6a]">{age} წლის</span>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
};

/** One coming day. For teachers and admins the coming week's stand out: bigger, in gold, with the age. */
const SoonRow: React.FC<{ e: Ev; days: number; me: boolean; staff: boolean }> = ({ e, days, me, staff }) => {
  const big = staff && days <= HIGHLIGHT_DAYS;
  const age = staff && e.kind === 'birth' ? turning(e.b) : undefined;
  const Icon = e.kind === 'name' ? Sparkles : Cake;
  return (
    <li
      className={`flex items-center gap-3 rounded-2xl px-3 ${
        big
          ? 'min-h-[68px] py-2 bg-gradient-to-br from-[#fbf0d8] to-[#f3dfb4] ring-1 ring-[#d9b46a] shadow-[0_8px_18px_-12px_rgba(154,116,56,0.8)]'
          : 'min-h-14 py-1.5 bg-white/70 ring-1 ring-[#e8dcc8]'
      }`}
    >
      <Avatar name={e.name} photo={e.photoURL} size={big ? 44 : 36} />
      <span className="flex-1 min-w-0">
        <span className={`block truncate font-semibold ${big ? 'font-serif-ge text-[17px] font-bold text-[#5a3d14]' : 'text-[15px]'}`}>
          {e.name}{me && <span className="ml-1.5 text-xs font-normal text-[#8a7a6a]">(შენ)</span>}
        </span>
        <span className={`block text-[13px] truncate ${big ? 'text-[#7a5a26]' : 'text-[#8a7a6a]'}`}>
          {e.kind === 'name' ? `ანგელოზის დღე · ${e.day} ${MONTHS_SHORT_GE[e.month - 1]}` : `${e.day} ${MONTHS_GE[e.month - 1]}${age !== undefined ? ` · ხდება ${age}` : ''}`}
        </span>
      </span>
      <span className={`shrink-0 h-8 px-3 rounded-full inline-flex items-center gap-1 text-[13px] font-bold ${
        days === 0 ? 'bg-[#7a2028] text-[#fbf6ec]' : big ? 'bg-white/70 text-[#7a5a26] ring-1 ring-[#d9b46a]/60' : 'bg-[#f6efe3] text-[#4a3426]'
      }`}>
        {days === 0 && <Icon className="w-4 h-4" />}
        {inDaysText(days)}
      </span>
    </li>
  );
};
