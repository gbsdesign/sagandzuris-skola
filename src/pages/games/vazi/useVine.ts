import { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAuth } from '../../../context';
import { useMembership } from '../../../utils/memberAccess';
import { tbilisiToday } from '../../../utils/hangi';
import { deedsOf, vineOf, type Vine } from '../../../utils/vazi';

// The member's own vine, live from their record (students/{uid}); a guest's grows only from the daily games played on this
// device (useDailyRecord keeps them under `sg-<game>`).

const DAILY = ['hangi', 'sitqva', 'otkheuli', 'bade', 'tsartsera', 'khazi', 'anbani', 'tabu', 'vin', 'saidumlo'];
const deviceData = () => ({
  games: Object.fromEntries(DAILY.map(g => {
    try { return [g, { days: JSON.parse(localStorage.getItem(`sg-${g}`) || 'null') ?? {} }]; } catch { return [g, { days: {} }]; }
  })),
});

/** today's Tbilisi day, moving on at midnight while the page is open */
export const useToday = () => {
  const [today, setToday] = useState(tbilisiToday);
  useEffect(() => { const t = setInterval(() => setToday(tbilisiToday()), 60_000); return () => clearInterval(t); }, []);
  return today;
};

export const useVine = (): { vine: Vine; loaded: boolean; member: boolean; name: string } => {
  const { user } = useAuth();
  const { isMember } = useMembership();
  const uid = user && isMember ? user.uid : null;
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!uid) { setData(deviceData()); setLoaded(true); return; }
    setLoaded(false);
    return onSnapshot(
      doc(db, 'students', uid),
      s => { setData(s.data() || {}); setLoaded(true); },
      () => { setData(deviceData()); setLoaded(true); },
    );
  }, [uid]);
  const today = useToday();
  const vine = useMemo(() => vineOf(deedsOf(data), today), [data, today]);
  const profile = (data?.profile ?? {}) as { firstName?: unknown };
  const name = typeof profile.firstName === 'string' ? profile.firstName.trim().split(/\s+/)[0] ?? '' : '';
  return { vine, loaded, member: !!uid, name };
};
