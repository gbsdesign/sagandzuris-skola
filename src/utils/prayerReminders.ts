import { useEffect, useRef, useState } from 'react';
import { PRAYER_HOURS, PrayerHour } from '../data/prayers';
import type { HabitSchedule } from './myHabits';
import { isDue } from './habitSchedule';

// Reminders for the seven-times prayers ("შვიდგზის ლოცვა"). Kept per device in localStorage:
// { 'hour-12': [10, 5, 1], ... } — minutes before the hour.
// Where the browser supports Web Push (installed service worker), the settings are also sent to the
// Cloudflare Worker "sagandzuri-reminders" (worker/reminders), which pushes them even while the site
// is closed. Otherwise the page itself checks the clock, which only works while the site is open.

export const REMINDER_OFFSETS = [10, 5, 1];

const KEY = 'prayerReminders';
const FIRED_KEY = 'prayerRemindersFired';
const CHANGED = 'prayer-reminders-changed';
// what the push server last accepted from this browser: { endpoint, settings }
const PUSH_KEY = 'prayerRemindersPush';

const PUSH_SERVER = 'https://sagandzuri-reminders.mr-gabunia.workers.dev/subscribe';
const VAPID_PUBLIC_KEY = 'BPQ3-oe86mthAy7mhsrDJIcTnl92WBn7t_OKcGe7h1bg7jR2N2Z_O3eC1D1k8oTFnuo6b6iDC7DI00TxroHz7t8';

export type ReminderSettings = Record<string, number[]>;

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode — reminders just won't persist */
  }
};

export const getReminders = (): ReminderSettings => read<ReminderSettings>(KEY, {});

// Habits with a time and reminders (set on a habit's card): kept per device as well, sent to the push server
// with the prayer ones (`reminders.habits`), and checked by the page itself while it is open.
const HABITS_KEY = 'habitReminders';
export interface HabitReminder {
  id: string;
  title: string;
  /** "HH:MM" */
  at: string;
  /** minutes before `at` */
  alerts: number[];
  plan?: HabitSchedule;
}
export const getHabitReminders = (): HabitReminder[] => read<HabitReminder[]>(HABITS_KEY, []);
export const setHabitReminders = (list: HabitReminder[]) => {
  if (JSON.stringify(list) === JSON.stringify(getHabitReminders())) return;
  write(HABITS_KEY, list);
  void syncPush();
};

// The learning mode's review reminder (utils/learnReminder.ts): one more „habit“ on the next day with a review, kept
// apart so the habits' list (set from the habits) does not drop it.
const LEARN_KEY = 'learnReminder';
export const LEARN_ID = 'learn-review';
const getLearnReminder = (): HabitReminder | null => read<HabitReminder | null>(LEARN_KEY, null);
export const setLearnReminder = (r: HabitReminder | null) => {
  if (JSON.stringify(r) === JSON.stringify(getLearnReminder())) return;
  if (r) write(LEARN_KEY, r);
  else { try { localStorage.removeItem(LEARN_KEY); } catch { /* storage off */ } }
  void syncPush();
};
const allHabitReminders = () => {
  const learn = getLearnReminder();
  return learn ? [...getHabitReminders(), learn] : getHabitReminders();
};

// everything this browser asks the push server for
const pushReminders = () => {
  const habits = allHabitReminders();
  return { ...getReminders(), ...(habits.length ? { habits } : {}) };
};

export const setHourReminders = (hourId: string, offsets: number[]) => {
  const all = getReminders();
  if (offsets.length) all[hourId] = [...offsets].sort((a, b) => b - a);
  else delete all[hourId];
  write(KEY, all);
  window.dispatchEvent(new Event(CHANGED));
  void syncPush();
};

interface PushState {
  endpoint: string;
  settings: string;
}

// true while the push server holds this browser's current reminders
const pushActive = () => {
  const state = read<PushState | null>(PUSH_KEY, null);
  return Boolean(state && state.settings === JSON.stringify(pushReminders()) && state.settings !== '{}');
};

const keyBytes = (b64url: string) => {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)), c => c.charCodeAt(0));
};

// Sends this browser's reminders to the push server (or removes them there). Skips the request when
// the server already has exactly these settings for this subscription.
export const syncPush = async () => {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (!notificationsSupported() || Notification.permission !== 'granted') return;
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg?.pushManager) return;
    const reminders = pushReminders();
    const settings = JSON.stringify(reminders);
    const hasAny = settings !== '{}';
    let sub = await reg.pushManager.getSubscription();
    if (!sub && hasAny) {
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) });
    }
    if (!sub) return;
    const last = read<PushState | null>(PUSH_KEY, null);
    if (last && last.endpoint === sub.endpoint && last.settings === settings) return;
    const res = await fetch(PUSH_SERVER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON(), reminders, tz: Intl.DateTimeFormat().resolvedOptions().timeZone }),
    });
    if (res.ok) write(PUSH_KEY, { endpoint: sub.endpoint, settings });
  } catch {
    /* push unavailable — the page's own clock check still covers an open site */
  }
};

export const useReminders = (): ReminderSettings => {
  const [settings, setSettings] = useState(getReminders);
  useEffect(() => {
    const sync = () => setSettings(getReminders());
    window.addEventListener(CHANGED, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGED, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return settings;
};

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window;

export const askNotificationPermission = async (): Promise<NotificationPermission | 'unsupported'> => {
  if (!notificationsSupported()) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
};

// Next time (ms) the given hour's prayer starts, counting from `from`.
const nextHourStart = (h: PrayerHour, from: number) => {
  const d = new Date(from);
  d.setHours(h.hour, 0, 0, 0);
  if (d.getTime() <= from) d.setDate(d.getDate() + 1);
  return d.getTime();
};

const minutesWord = (m: number) => `${m} წუთი`;

const show = async (hour: PrayerHour, minutes: number, onOpen: (prayerId: string) => void) => {
  if (!notificationsSupported() || Notification.permission !== 'granted') return;
  const title = 'შვიდგზის ლოცვა';
  const body = `${hour.label.replace('საათზე', 'საათის')} ლოცვამდე ${minutesWord(minutes)} დარჩა`;
  const options: NotificationOptions = {
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: `${hour.id}-${minutes}`,
    data: { prayerId: hour.id },
  };
  // Desktop browsers allow page notifications (their click comes back here); Android only
  // allows them through the service worker, whose click handler is public/prayer-notify-sw.js.
  try {
    const n = new Notification(title, options);
    n.onclick = () => {
      window.focus();
      onOpen(hour.id);
      n.close();
    };
    return;
  } catch {
    /* fall through to the service worker */
  }
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    await reg?.showNotification(title, options);
  } catch {
    /* nothing more we can do */
  }
};

const habitWord = (m: number) => (m === 0 ? 'დროა' : m === 60 ? '1 საათში' : `${m} წუთში`);

const showHabit = async (h: HabitReminder, minutes: number) => {
  if (!notificationsSupported() || Notification.permission !== 'granted') return;
  const options: NotificationOptions = {
    body: `${habitWord(minutes)} — ${h.at}`,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: `habit-${h.id}-${minutes}`,
    data: { url: h.id === LEARN_ID ? '/' : '/?open=gz' }, // the learning review opens home, with its line
  };
  try {
    const n = new Notification(h.title, options);
    n.onclick = () => {
      window.focus();
      n.close();
    };
    return;
  } catch {
    /* fall through to the service worker */
  }
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    await reg?.showNotification(h.title, options);
  } catch {
    /* nothing more we can do */
  }
};

// the habits' reminders due in the last 2 minutes, today's or (before midnight) tomorrow's, on the habit's own days
const habitTick = () => {
  const now = Date.now();
  const fired = read<Record<string, number>>(FIRED_KEY, {});
  let changed = false;
  for (const h of allHabitReminders()) {
    const [hh, mm] = h.at.split(':').map(Number);
    for (const minutes of h.alerts) {
      for (const shift of [0, 1]) {
        const day = new Date();
        day.setDate(day.getDate() + shift);
        day.setHours(hh, mm, 0, 0);
        const at = day.getTime() - minutes * 60_000;
        const key = `habit-${h.id}-${minutes}`;
        if (at <= now && now - at < 2 * 60_000 && fired[key] !== at && (!h.plan || isDue(h.plan, day))) {
          fired[key] = at;
          changed = true;
          void showHabit(h, minutes);
        }
      }
    }
  }
  if (changed) write(FIRED_KEY, fired);
};

// Mounted once for the whole app: checks every 15 s whether a reminder is due.
// A reminder fires if its moment passed less than 2 minutes ago and it has not fired yet,
// so a throttled background tab or a short sleep still catches it, but an old one does not.
export const usePrayerReminderScheduler = (onOpenPrayer: (prayerId: string) => void) => {
  const openRef = useRef(onOpenPrayer);
  openRef.current = onOpenPrayer;

  useEffect(() => {
    const onOpen = (prayerId: string) => openRef.current(prayerId);
    const tick = () => {
      // the push server sends these; showing them here too would double them
      // a habit's reminder here too (one with the same tag from the push server only replaces it)
      habitTick();
      if (pushActive()) return;
      const settings = getReminders();
      const now = Date.now();
      const fired = read<Record<string, number>>(FIRED_KEY, {});
      let changed = false;
      for (const hour of PRAYER_HOURS) {
        for (const minutes of settings[hour.id] || []) {
          // the hour start this reminder belongs to may already be up to 2 minutes behind us
          const start = nextHourStart(hour, now - 2 * 60_000 + minutes * 60_000);
          const at = start - minutes * 60_000;
          const key = `${hour.id}-${minutes}`;
          if (at <= now && now - at < 2 * 60_000 && fired[key] !== at) {
            fired[key] = at;
            changed = true;
            void show(hour, minutes, onOpen);
          }
        }
      }
      if (changed) write(FIRED_KEY, fired);
    };
    tick();
    void syncPush();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, []);

  // a click on a service-worker notification opens the prayer in this tab
  useEffect(() => {
    const sw = navigator.serviceWorker;
    if (!sw) return;
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'open-prayer' && typeof e.data.prayerId === 'string') openRef.current(e.data.prayerId);
    };
    sw.addEventListener('message', onMessage);
    return () => sw.removeEventListener('message', onMessage);
  }, []);
};
