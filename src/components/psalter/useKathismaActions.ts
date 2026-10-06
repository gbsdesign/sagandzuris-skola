import { useState } from 'react';
import { useAuth, useChants } from '../../context';
import { dayKey } from '../../utils/habitsWeek';
import { Cycle } from '../../utils/psalter';
import {
  PsalterGroup, TakenError, askHelp, cancelHelp, ergative, firstName, giveBack, markRead, memberName, takeKathisma, unmarkRead,
} from '../../hooks/usePsalter';
import { notifyGroup } from '../../utils/groupPush';

const PSALMS_HABIT = 'habit_6'; // "ფსალმუნების კითხვა"

/** The group actions with their messages; "წავიკითხე" also ticks today's psalm habit. */
export const useKathismaActions = (group: PsalterGroup | null | undefined, cycle: Cycle | null | undefined) => {
  const { user } = useAuth();
  const { habitLog, toggleHabitToday } = useChants();
  const [busy, setBusy] = useState<number | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const run = async (k: number, fn: () => Promise<unknown>, ok?: string) => {
    if (!group || !cycle || !user) return false;
    setBusy(k);
    setMessage(null);
    try {
      await fn();
      if (ok) setMessage({ text: ok, type: 'success' });
      return true;
    } catch (e: any) {
      if (e instanceof TakenError) {
        setMessage({ text: `კანონი ${k} უკვე ${ergative(firstName(memberName(group, e.by)))} აიღო.`, type: 'error' });
      } else if (e?.code === 'unavailable' || /offline/i.test(e?.message || '')) {
        setMessage({ text: 'აღებას ინტერნეტი სჭირდება — სცადე კავშირის აღდგენისას.', type: 'error' });
      } else {
        setMessage({ text: 'ვერ შესრულდა. სცადე ხელახლა.', type: 'error' });
      }
      return false;
    } finally {
      setBusy(null);
    }
  };

  return {
    busy,
    message,
    clearMessage: () => setMessage(null),
    read: (k: number) =>
      run(k, async () => {
        // the mark waits on the phone when offline and is sent later
        void markRead(group!.id, cycle!, k, user!.uid).catch(() => {});
        if (!(habitLog[dayKey(new Date())] || []).includes(PSALMS_HABIT)) toggleHabitToday(PSALMS_HABIT);
      }, `კანონი ${k} მოინიშნა წაკითხულად. ღმერთმა შეგეწიოს!`),
    unread: (k: number) => run(k, () => unmarkRead(group!.id, cycle!, k), `კანონი ${k}: მონიშვნა გაუქმდა.`),
    take: (k: number) =>
      run(k, async () => {
        await takeKathisma(group!.id, cycle!, k, user!.uid);
        void notifyGroup(group!.id, 'taken', k);
      }, `კანონი ${k} შენ აიღე. გმადლობთ, რომ ეხმარები ჯგუფს!`),
    giveBack: (k: number) => run(k, () => giveBack(group!.id, cycle!, k), `კანონი ${k} დაბრუნდა.`),
    askHelp: (k: number) =>
      run(k, async () => {
        await askHelp(group!.id, cycle!, k, user!.uid);
        void notifyGroup(group!.id, 'help', k);
      }, 'ჯგუფს ეცნობა — ვინც შეძლებს, აიღებს შენს კანონს.'),
    cancelHelp: (k: number) => run(k, () => cancelHelp(group!.id, cycle!, k), 'თხოვნა გაუქმდა.'),
  };
};
