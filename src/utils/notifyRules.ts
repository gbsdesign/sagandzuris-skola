// The rules of how the phone's notices come — pure, so the tests and the hook (notifyPrefs.ts) share them.

// How the phone's notices come (redesign stage 4e, boards x-ultra-shejameba, -1, -3): one morning summary instead of many
// separate notices, and quiet hours when the phone stays silent (a call may still ring; a teacher's or the school's notice
// and the seven-times prayer reminders always come). Kept in `students/{uid}.notify` (the person's own record, every
// device) and given to the reminders Worker (`/notify-prefs`), which sends the summary and holds the night's messages.

export interface NotifyItems {
  /** today's class lesson */
  lesson: boolean;
  /** messages held in the quiet hours */
  chat: boolean;
  /** the day's lesson with the AI teacher, else the reviews due */
  day: boolean;
  birthdays: boolean;
  /** the church calendar's feast */
  feast: boolean;
}

export interface NotifyPrefs {
  summary: boolean;
  /** the summary's hour, „HH:MM“ (Tbilisi) */
  at: string;
  items: NotifyItems;
  quiet: boolean;
  from: string;
  to: string;
  /** a call rings in the quiet hours too */
  calls: boolean;
}

export const NOTIFY_DEFAULTS: NotifyPrefs = {
  summary: false,
  at: '09:00',
  items: { lesson: true, chat: true, day: true, birthdays: true, feast: false },
  quiet: false,
  from: '22:00',
  to: '08:00',
  calls: true,
};

export const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
const hhmm = (v: unknown, d: string) => (typeof v === 'string' && HHMM.test(v) ? v : d);

/** what is stored, made whole and safe (unknown or broken values fall back to the defaults) */
export const prefsOf = (raw: unknown): NotifyPrefs => {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const it = (r.items && typeof r.items === 'object' ? r.items : {}) as Record<string, unknown>;
  const d = NOTIFY_DEFAULTS;
  return {
    summary: bool(r.summary, d.summary),
    at: hhmm(r.at, d.at),
    items: {
      lesson: bool(it.lesson, d.items.lesson),
      chat: bool(it.chat, d.items.chat),
      day: bool(it.day, d.items.day),
      birthdays: bool(it.birthdays, d.items.birthdays),
      feast: bool(it.feast, d.items.feast),
    },
    quiet: bool(r.quiet, d.quiet),
    from: hhmm(r.from, d.from),
    to: hhmm(r.to, d.to),
    calls: bool(r.calls, d.calls),
  };
};

const minutesOf = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** whether a moment of the day (minutes after Tbilisi's midnight) falls in the quiet hours; they may pass midnight */
export const inQuiet = (p: Pick<NotifyPrefs, 'quiet' | 'from' | 'to'>, minute: number): boolean => {
  if (!p.quiet) return false;
  const a = minutesOf(p.from);
  const b = minutesOf(p.to);
  if (a === b) return false;
  return a < b ? minute >= a && minute < b : minute >= a || minute < b;
};
