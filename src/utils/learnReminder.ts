import type { LearnRecord } from './learn';
import { nextReviewDay } from './learn';
import { georgiaToday } from './psalter';
import { LEARN_ID, setLearnReminder, syncPush } from './prayerReminders';

// „გამეორების შეხსენება“ of the learning mode: at the hour the member picked, on the next day a learned part waits for
// its review, the phone says so — through the habits' reminders (a push even with the app closed where the reminders
// Worker runs, otherwise while the site is open). Kept per device, like the other reminders.

const TIME_KEY = 'sg-learn-remind';
export const REMIND_TIMES = ['09:00', '14:00', '19:00', '21:00'];

export const getRemindTime = (): string => { try { return localStorage.getItem(TIME_KEY) || ''; } catch { return ''; } };

let lastLearning: Record<string, LearnRecord> | undefined;

/** Puts the reminder on the next review day (or takes it away), after the member's learning changed. */
export const syncLearnReminder = (learning?: Record<string, LearnRecord>) => {
  if (learning) lastLearning = learning;
  const at = getRemindTime();
  const today = georgiaToday();
  const next = at ? nextReviewDay(lastLearning, today) : null;
  if (!at || !next) { setLearnReminder(null); return; }
  // a review already waiting today, but today's hour has passed: tomorrow
  const [hh, mm] = at.split(':').map(Number);
  const passed = new Date().getHours() * 60 + new Date().getMinutes() >= hh * 60 + mm;
  let day = next.day;
  if (day === today && passed) {
    const d = new Date(today + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + 1);
    day = d.toISOString().slice(0, 10);
  }
  setLearnReminder({
    id: LEARN_ID,
    title: `გალობის გამეორება · ${next.count} ნაწილი`,
    at,
    alerts: [0],
    plan: { every: 1, unit: 'day', start: day, count: 1 },
  });
};

export const setRemindTime = (at: string) => {
  try { if (at) localStorage.setItem(TIME_KEY, at); else localStorage.removeItem(TIME_KEY); } catch { /* storage off */ }
  syncLearnReminder();
  void syncPush();
};
