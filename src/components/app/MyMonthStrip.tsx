import React, { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context';
import { deedsOf } from '../../utils/vazi';
import { georgiaToday } from '../../utils/psalter';
import { MONTHS_GEN_GE } from '../../utils/dateNames';

// „ჩემი თვე“ under the profile's head (2026-11-06, the user's pick): three numbers of this month, read from what the app
// already keeps — the days I did anything (a habit, a game, a phrase, an exercise), the habit ticks, the phrases practised
// in the learning mode. Nothing new is stored.

export const monthNumbers = (data: Record<string, unknown> | null | undefined, today: string) => {
  const month = today.slice(0, 7);
  const deeds = deedsOf(data);
  let days = 0, habits = 0, learn = 0;
  for (const [day, d] of Object.entries(deeds)) {
    if (!day.startsWith(month)) continue;
    days += 1;
    habits += d.habits ?? 0;
    learn += d.learn ?? 0;
  }
  return { days, habits, learn };
};

const Figure: React.FC<{ n: number; label: string }> = ({ n, label }) => (
  <div className="flex-1 min-w-0 rounded-2xl bg-white ring-1 ring-[#2a2017]/[0.07] px-3 py-2.5 text-center">
    <span className="block font-serif-ge text-[22px] leading-none font-bold text-[#7a2028] tabular-nums">{n}</span>
    <span className="block mt-1 text-[12px] leading-snug text-[#8a7a6a]">{label}</span>
  </div>
);

export const MyMonthStrip: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    if (!user) { setData(null); return; }
    return onSnapshot(doc(db, 'students', user.uid), s => setData(s.data() || {}), () => setData({}));
  }, [user]);
  const today = georgiaToday();
  const n = useMemo(() => monthNumbers(data, today), [data, today]);
  if (!user || data === null) return null;
  const month = MONTHS_GEN_GE[Number(today.slice(5, 7)) - 1];
  return (
    <section aria-label="ჩემი თვე" className="px-0.5">
      <h3 className="px-3.5 pb-1.5 text-[12.5px] font-bold text-[#a08a76]">{month} თვე</h3>
      <div className="flex gap-2">
        <Figure n={n.days} label={n.days === 1 ? 'აქტიური დღე' : 'აქტიური დღე'} />
        <Figure n={n.habits} label="მონიშნული ჩვევა" />
        <Figure n={n.learn} label="ნავარჯიშევი ფრაზა" />
      </div>
    </section>
  );
};
