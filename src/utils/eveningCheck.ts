import { useEffect, useState } from 'react';
import { EVENING_ID, EVENING_OPEN, setEveningReminder, syncPush } from './prayerReminders';
import { dayKey } from './habitsWeek';

// „საღამოს კითხვა“ (the user, 2026-11-21: „ყოველ საღამოს აპი შეეკითხოს მოსწავლე რა ჩვევები შეასრულა და შესთავაზოს
// მონიშვნა სურვილისამებრ“; picks: a notice + a window, 21:00, on for everyone, can be turned off). Each evening at the
// member's hour the phone asks „რა შეასრულე დღეს?“ (through the habits' reminders — a push even with the app closed) and
// the open app shows a window with the day's habits not ticked yet (components/habits/EveningCheck). Nothing is asked
// when everything is ticked. Kept per device, like the other reminders.

const KEY = 'sg-evening-check';
const SEEN_KEY = 'sg-evening-seen';
const CHANGED = 'sg-evening-changed';
export const EVENING_DEFAULT = '21:00';
export const EVENING_TIMES = ['20:00', '21:00', '22:00', '23:00'];

/** the member's hour, '' when turned off */
export const getEveningAt = (): string => {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'off') return '';
    return v && EVENING_TIMES.includes(v) ? v : EVENING_DEFAULT;
  } catch { return EVENING_DEFAULT; }
};

let last: { signedIn: boolean; doneToday: boolean } = { signedIn: false, doneToday: false };

const nextDay = (d: Date) => { const x = new Date(d); x.setDate(x.getDate() + 1); return x; };

/** Puts the evening notice on today (or on tomorrow, when today's habits are all ticked or today's hour has passed). */
export const syncEveningReminder = (state?: { signedIn: boolean; doneToday: boolean }) => {
  if (state) last = state;
  const at = getEveningAt();
  if (!at || !last.signedIn) { setEveningReminder(null); return; }
  const now = new Date();
  const start = last.doneToday ? nextDay(now) : now;
  setEveningReminder({
    id: EVENING_ID,
    title: 'დღის ბოლო 🌙',
    at,
    alerts: [0],
    plan: { every: 1, unit: 'day', start: dayKey(start) },
  });
};

export const setEveningAt = (at: string) => {
  try { localStorage.setItem(KEY, at || 'off'); } catch { /* storage off */ }
  window.dispatchEvent(new Event(CHANGED));
  syncEveningReminder();
  void syncPush();
};

export const useEveningAt = (): string => {
  const [at, setAt] = useState(getEveningAt);
  useEffect(() => {
    const sync = () => setAt(getEveningAt());
    window.addEventListener(CHANGED, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGED, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return at;
};

/** the window waits until this moment: „მოგვიანებით“ puts it off an hour, „მონიშვნა“ until tomorrow */
export const putOffUntil = (): number => {
  try { return Number(localStorage.getItem(SEEN_KEY)) || 0; } catch { return 0; }
};
export const putOff = (tillTomorrow: boolean) => {
  const t = new Date();
  if (tillTomorrow) { t.setDate(t.getDate() + 1); t.setHours(0, 0, 0, 0); } else t.setTime(t.getTime() + 60 * 60_000);
  try { localStorage.setItem(SEEN_KEY, String(t.getTime())); } catch { /* storage off */ }
};

/** true from the member's hour until midnight */
export const isEvening = (at: string, now: Date = new Date()): boolean => {
  if (!at) return false;
  const [hh, mm] = at.split(':').map(Number);
  return now.getHours() * 60 + now.getMinutes() >= hh * 60 + mm;
};

// a tap on the notice (/?open=sagamo) may come before the window is mounted: it waits here
let wanted = false;
export const requestEvening = () => {
  wanted = true;
  window.dispatchEvent(new Event(EVENING_OPEN));
};
export const takeEveningRequest = (): boolean => {
  const w = wanted;
  wanted = false;
  return w;
};
