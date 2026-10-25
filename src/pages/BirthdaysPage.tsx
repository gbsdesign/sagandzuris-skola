import React from 'react';
import { Cake, Loader2 } from 'lucide-react';
import { useAuth } from '../context';
import { Birthday, ageNow, inDaysText, nextBirthday, turning, useBirthdays } from '../utils/birthdays';
import { useMembership } from '../utils/memberAccess';
import { MONTHS_GE, MONTHS_SHORT_GE } from '../utils/dateNames';
import { Avatar, Empty } from '../components/ui/kit';

// „დაბადების დღეები“: who and when, for every member. On top the next month's birthdays in the order they come; under
// them the whole year month by month, starting with this one. Members see the day and month only; teachers and admins
// also the age, and the coming week's birthdays stand out for them in gold (bigger), so nobody is forgotten.

const SOON_DAYS = 30;
const HIGHLIGHT_DAYS = 7;

export const BirthdaysPage: React.FC = () => {
  const { user, isTeacher } = useAuth();
  const { isMember } = useMembership();
  const list = useBirthdays(!!user && isMember, isTeacher);

  if (!list) return <div className="py-16 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-[#7a2028]" /></div>;
  if (!list.length) return <Empty icon={<Cake />} title="ჯერ არავის ჩაუწერია დაბადების თარიღი" />;

  const now = new Date();
  const withNext = list.map(b => ({ b, ...nextBirthday(b, now) }));
  const soon = withNext.filter(x => x.days <= SOON_DAYS).sort((a, z) => a.days - z.days || a.b.name.localeCompare(z.b.name, 'ka'));
  const thisMonth = now.getMonth() + 1;
  const months = Array.from({ length: 12 }, (_, i) => ((thisMonth - 1 + i) % 12) + 1)
    .map(m => ({ m, people: list.filter(b => b.month === m).sort((a, z) => a.day - z.day || a.name.localeCompare(z.name, 'ka')) }))
    .filter(x => x.people.length);

  return (
    <div className="w-full max-w-2xl mx-auto px-1 pb-10 space-y-6 text-[#2a2017]">
      {soon.length > 0 && (
        <section aria-label="მალე">
          <h2 className="px-1 mb-2 font-serif-ge text-lg font-bold text-[#4a3426]">მალე</h2>
          <ul className="space-y-2">
            {soon.map(({ b, days }) => (
              <SoonRow key={b.uid} b={b} days={days} me={b.uid === user?.uid} staff={isTeacher} />
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
            {people.map(b => {
              const age = isTeacher ? ageNow(b, now) : undefined;
              const today = nextBirthday(b, now).days === 0;
              return (
                <li key={b.uid} className={`min-h-14 flex items-center gap-3 px-2 py-1.5 ${b.uid === user?.uid ? 'bg-[#7a2028]/[0.04] rounded-2xl' : ''}`}>
                  <span className={`w-11 h-11 shrink-0 rounded-xl flex flex-col items-center justify-center leading-none ${today ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-[#fbf6ec] ring-1 ring-[#efe3cf] text-[#4a3426]'}`}>
                    <span className="font-serif-ge text-[17px] font-bold tabular-nums">{b.day}</span>
                    <span className="mt-0.5 text-[11px] font-semibold opacity-75">{MONTHS_SHORT_GE[b.month - 1]}</span>
                  </span>
                  <Avatar name={b.name} photo={b.photoURL} size={36} />
                  <span className="flex-1 min-w-0 text-[15px] font-semibold truncate">
                    {b.name}
                    {b.uid === user?.uid && <span className="ml-1.5 text-xs font-normal text-[#8a7a6a]">(შენ)</span>}
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

/** One coming birthday. For teachers and admins the coming week's stand out: bigger, in gold, with the age. */
const SoonRow: React.FC<{ b: Birthday; days: number; me: boolean; staff: boolean }> = ({ b, days, me, staff }) => {
  const big = staff && days <= HIGHLIGHT_DAYS;
  const age = staff ? turning(b) : undefined;
  return (
    <li
      className={`flex items-center gap-3 rounded-2xl px-3 ${
        big
          ? 'min-h-[68px] py-2 bg-gradient-to-br from-[#fbf0d8] to-[#f3dfb4] ring-1 ring-[#d9b46a] shadow-[0_8px_18px_-12px_rgba(154,116,56,0.8)]'
          : 'min-h-14 py-1.5 bg-white/70 ring-1 ring-[#e8dcc8]'
      }`}
    >
      <Avatar name={b.name} photo={b.photoURL} size={big ? 44 : 36} />
      <span className="flex-1 min-w-0">
        <span className={`block truncate font-semibold ${big ? 'font-serif-ge text-[17px] font-bold text-[#5a3d14]' : 'text-[15px]'}`}>
          {b.name}{me && <span className="ml-1.5 text-xs font-normal text-[#8a7a6a]">(შენ)</span>}
        </span>
        <span className={`block text-[13px] ${big ? 'text-[#7a5a26]' : 'text-[#8a7a6a]'}`}>
          {b.day} {MONTHS_GE[b.month - 1]}{age !== undefined ? ` · ხდება ${age}` : ''}
        </span>
      </span>
      <span className={`shrink-0 h-8 px-3 rounded-full inline-flex items-center gap-1 text-[13px] font-bold ${
        days === 0 ? 'bg-[#7a2028] text-[#fbf6ec]' : big ? 'bg-white/70 text-[#7a5a26] ring-1 ring-[#d9b46a]/60' : 'bg-[#f6efe3] text-[#4a3426]'
      }`}>
        {days === 0 && <Cake className="w-4 h-4" />}
        {inDaysText(days)}
      </span>
    </li>
  );
};
