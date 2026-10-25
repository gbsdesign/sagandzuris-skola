import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles, Search, Loader2 } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context';
import { CalendarDay, loadCalendarYearDays } from '../../data/churchCalendar';
import { MONTHS_GE, MONTHS_SHORT_GE } from '../../utils/dateNames';
import { fullName } from '../../utils/memberName';
import { NameDay, clearNameDay, saveNameDay } from '../../utils/nameDays';
import { nameDayCandidates } from '../../utils/nameDayMatch';
import { Btn, FIELD, Sheet } from '../ui/kit';

// „ჩემი ანგელოზის დღე“ on the birthdays page: the member's chosen saint's day, and the window to choose it from the
// days of the church calendar that name a saint of their (baptismal) name; another name can be typed in.
export const MyNameDay: React.FC<{ mine?: NameDay }> = ({ mine }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ firstName: string; lastName: string; churchName: string }>({ firstName: '', lastName: '', churchName: '' });
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, 'students', user.uid), s => {
      const p = s.data()?.profile || {};
      setProfile({ firstName: p.firstName || '', lastName: p.lastName || '', churchName: p.churchName || '' });
    }, () => {});
  }, [user]);
  if (!user) return null;
  const baptismal = profile.churchName || profile.firstName;

  return (
    <section className="rounded-3xl bg-white/80 ring-1 ring-[#e8dcc8] p-3.5 flex items-center gap-3">
      <span className="w-11 h-11 shrink-0 rounded-xl bg-[#7a2028]/[0.07] text-[#7a2028] flex items-center justify-center"><Sparkles className="w-5 h-5" /></span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-[#75685a]">ჩემი ანგელოზის დღე</p>
        {mine ? (
          <>
            <p className="text-[15px] font-semibold text-[#2a2017]">{mine.day} {MONTHS_GE[mine.month - 1]}</p>
            <p className="text-[12px] leading-snug text-[#8a7a6a] line-clamp-2">{mine.saint}</p>
          </>
        ) : (
          <p className="text-[14px] text-[#8a7a6a]">ჯერ არ არის არჩეული</p>
        )}
      </div>
      <Btn kind={mine ? 'ghost' : 'primary'} size="sm" onClick={() => setOpen(true)}>{mine ? 'შეცვლა' : 'არჩევა'}</Btn>
      {open && (
        <NameDaySheet
          first={baptismal}
          mine={mine}
          onPick={async c => {
            const name = fullName(profile) || user.displayName || '';
            await saveNameDay(user.uid, name, user.photoURL || '', c);
            setOpen(false);
          }}
          onClear={async () => { await clearNameDay(user.uid); setOpen(false); }}
          onClose={() => setOpen(false)}
        />
      )}
    </section>
  );
};

const NameDaySheet: React.FC<{
  first: string;
  mine?: NameDay;
  onPick: (c: ReturnType<typeof nameDayCandidates>[number]) => Promise<void>;
  onClear: () => Promise<void>;
  onClose: () => void;
}> = ({ first, mine, onPick, onClear, onClose }) => {
  const [name, setName] = useState(first);
  const [days, setDays] = useState<Record<string, CalendarDay> | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { loadCalendarYearDays().then(setDays, () => setDays({})); }, []);
  const list = useMemo(() => (days && name.trim().length >= 2 ? nameDayCandidates(days, name) : []), [days, name]);

  const pick = async (c: (typeof list)[number]) => {
    setBusy(c.iso + c.saint); setError('');
    try { await onPick(c); } catch (e) { setError('ვერ შეინახა: ' + ((e as { code?: string })?.code || '')); }
    setBusy('');
  };

  return (
    <Sheet open onClose={onClose} title="ანგელოზის დღე"
      footer={mine ? <Btn kind="danger" full onClick={() => { setBusy('clear'); onClear().catch(() => setBusy('')); }}>არჩევანის მოხსნა</Btn> : undefined}>
      <div className="space-y-3">
        <label className="block">
          <span className="block mb-1 text-[13px] font-bold text-[#75685a]">სახელი (ნათლობის)</span>
          <span className="relative block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a99a88]" />
            <input value={name} onChange={e => setName(e.target.value)} className={`${FIELD} pl-9`} placeholder="მაგ. ნინო" />
          </span>
        </label>
        {!days ? (
          <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#7a2028]" /></div>
        ) : !list.length ? (
          <p className="py-6 text-center text-[14px] text-[#8a7a6a]">
            {name.trim().length < 2 ? 'ჩაწერე სახელი.' : 'ამ სახელით კალენდარში წმინდანი ვერ ვიპოვე — ჩაწერე ნათლობის სახელი.'}
          </p>
        ) : (
          <>
            <p className="text-[13px] text-[#75685a]">აირჩიე შენი წმინდანის დღე ({list.length}):</p>
            <ul className="space-y-1.5">
              {list.map(c => {
                const chosen = mine && mine.month === c.month && mine.day === c.day && mine.saint === c.saint;
                return (
                  <li key={c.iso + c.saint}>
                    <button type="button" onClick={() => pick(c)} disabled={!!busy}
                      className={`w-full flex items-start gap-3 rounded-2xl px-2.5 py-2 text-left cursor-pointer ring-1 transition-colors disabled:opacity-60 ${
                        chosen ? 'bg-[#7a2028]/[0.07] ring-[#7a2028]/40' : 'bg-white ring-[#e8dcc8] hover:ring-[#7a2028]/30'}`}>
                      <span className={`w-11 h-11 shrink-0 rounded-xl flex flex-col items-center justify-center leading-none ${c.feast ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-[#fbf6ec] ring-1 ring-[#efe3cf] text-[#4a3426]'}`}>
                        <span className="font-serif-ge text-[17px] font-bold tabular-nums">{c.day}</span>
                        <span className="mt-0.5 text-[11px] font-semibold opacity-80">{MONTHS_SHORT_GE[c.month - 1]}</span>
                      </span>
                      <span className={`flex-1 min-w-0 pt-0.5 text-[14px] leading-snug ${c.feast ? 'font-bold text-[#2a2017]' : 'text-[#4a3426]'}`}>
                        {busy === c.iso + c.saint ? 'ინახება…' : c.saint}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
        {error && <p className="text-[13px] text-red-700">{error}</p>}
      </div>
    </Sheet>
  );
};
