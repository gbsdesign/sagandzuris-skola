import { useEffect, useRef, useState } from 'react';
import { PRAYER_HOURS, PrayerHour } from '../data/prayers';

// Reminders for the seven-times prayers ("შვიდგზის ლოცვა"). Kept per device in localStorage:
// { 'hour-12': [10, 5, 1], ... } — minutes before the hour. Browsers can only fire these while
// the site is open (also in a background tab); there is no push server behind them.

export const REMINDER_OFFSETS = [10, 5, 1];

const KEY = 'prayerReminders';
const FIRED_KEY = 'prayerRemindersFired';
const CHANGED = 'prayer-reminders-changed';

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

export const setHourReminders = (hourId: string, offsets: number[]) => {
  const all = getReminders();
  if (offsets.length) all[hourId] = [...offsets].sort((a, b) => b - a);
  else delete all[hourId];
  write(KEY, all);
  window.dispatchEvent(new Event(CHANGED));
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

// Mounted once for the whole app: checks every 15 s whether a reminder is due.
// A reminder fires if its moment passed less than 2 minutes ago and it has not fired yet,
// so a throttled background tab or a short sleep still catches it, but an old one does not.
export const usePrayerReminderScheduler = (onOpenPrayer: (prayerId: string) => void) => {
  const openRef = useRef(onOpenPrayer);
  openRef.current = onOpenPrayer;

  useEffect(() => {
    const onOpen = (prayerId: string) => openRef.current(prayerId);
    const tick = () => {
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
