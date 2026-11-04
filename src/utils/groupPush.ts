import { useEffect, useState } from 'react';
import { auth } from '../firebase';

// Group notifications through the reminders Worker (worker/reminders):
// • POST /account { subscription, token, psalter, assignments } — this browser receives the signed-in
//   person's group reminders (unread kathisma at 20:00, the cycle's end at 21:00, the new kathisma on
//   the 1st and the 15th) and assignment deadlines. The Firebase ID token proves who they are.
// • POST /group-event { token, groupId, kind, kathisma } — "your kathisma was taken by …" to its reader,
//   "help needed" to the whole group. The Worker checks the facts in Firestore before it sends anything.
// • /account with `admin` — an admin's notices (utils/adminPush.ts); POST /access-request { token } — a newcomer's
//   request, told to the superadmins who asked for it.
// • POST /game-invite { token, classId, roomId } — a game room just opened in a class: its members and teachers hear
//   „X გიწვევს“ (the Worker checks the room in Firestore, and tells a room once).
// • Calls and messages (2026-11-05): /account with `chat: true` (bindChatDevice) — this browser rings for the person's
//   calls and shows their chat messages; POST /ring { token, base, end? } after a call starts (or goes unanswered),
//   POST /chat-notify { token, base, id } after a message is written. The Worker checks both in Firestore.
// Push needs the installed service worker; on iPhone the site must be added to the home screen first.

const SERVER = 'https://sagandzuri-reminders.mr-gabunia.workers.dev';
const VAPID_PUBLIC_KEY = 'BPQ3-oe86mthAy7mhsrDJIcTnl92WBn7t_OKcGe7h1bg7jR2N2Z_O3eC1D1k8oTFnuo6b6iDC7DI00TxroHz7t8';
const KEY = 'sg-group-push';
const CHANGED = 'sg-group-push-changed';

export interface GroupPushSettings {
  psalter: boolean;
  assignments: boolean;
}
const OFF: GroupPushSettings = { psalter: false, assignments: false };

const read = (): GroupPushSettings => {
  try {
    return { ...OFF, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return OFF;
  }
};

const keyBytes = (b64url: string) => {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)), c => c.charCodeAt(0));
};

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

/** Turns this device's group notifications on or off. Returns an error text, or '' when done. */
export const setGroupPush = async (next: GroupPushSettings): Promise<string> => {
  if (!pushSupported()) return 'ეს ბრაუზერი შეტყობინებებს ვერ მიიღებს. iPhone-ზე ჯერ დაამატე საიტი მთავარ ეკრანზე და იქიდან გახსენი.';
  const user = auth.currentUser;
  if (!user) return 'ჯერ შედი ანგარიშში.';
  const any = next.psalter || next.assignments;
  if (any && Notification.permission !== 'granted') {
    const p = await Notification.requestPermission();
    if (p !== 'granted') return 'შეტყობინებები დაბლოკილია — ჩართე ბრაუზერის პარამეტრებში ამ საიტისთვის.';
  }
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg?.pushManager) return 'შეტყობინებები მხოლოდ გამოქვეყნებულ საიტზე მუშაობს.';
    let sub = await reg.pushManager.getSubscription();
    if (!sub && any) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) });
    if (!sub) return '';
    const res = await fetch(`${SERVER}/account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON(), token: await user.getIdToken(), ...next }),
    });
    if (!res.ok) return 'შეხსენებების სერვერმა ვერ მიიღო. სცადე მოგვიანებით.';
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(CHANGED));
    return '';
  } catch {
    return 'შეხსენებების სერვერთან კავშირი ვერ მოხერხდა.';
  }
};

/** An admin's notices (utils/adminPush.ts) come to this device too: binds it with `admin` on or off, keeping the
 *  group settings as they are. Returns an error text, or '' when done. */
export const bindAdminDevice = async (on: boolean): Promise<string> => {
  const user = auth.currentUser;
  if (!user) return 'ჯერ შედი ანგარიშში.';
  if (!pushSupported()) return on ? 'ეს ბრაუზერი შეტყობინებებს ვერ მიიღებს.' : '';
  if (on && Notification.permission !== 'granted') {
    const p = await Notification.requestPermission();
    if (p !== 'granted') return 'შეტყობინებები დაბლოკილია — ჩართე ბრაუზერის პარამეტრებში ამ საიტისთვის.';
  }
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg?.pushManager) return on ? 'შეტყობინებები მხოლოდ გამოქვეყნებულ საიტზე მუშაობს.' : '';
    let sub = await reg.pushManager.getSubscription();
    if (!sub && on) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) });
    if (!sub) return '';
    const res = await fetch(`${SERVER}/account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON(), token: await user.getIdToken(), ...read(), admin: on }),
    });
    return res.ok ? '' : 'შეხსენებების სერვერმა ვერ მიიღო. სცადე მოგვიანებით.';
  } catch {
    return 'შეხსენებების სერვერთან კავშირი ვერ მოხერხდა.';
  }
};

/** A newcomer's request: the Worker tells the superadmins who asked for it (it checks the request in Firestore). */
export const notifyAccessRequest = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return;
    await fetch(`${SERVER}/access-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: await user.getIdToken() }),
    });
  } catch {
    /* offline or the Worker isn't updated yet: the panel shows them anyway */
  }
};

/** A game room just opened: the class hears it on their phones (best effort: the strip and the chat card show it anyway). */
export const notifyGameInvite = async (classId: string, roomId: string) => {
  try {
    const user = auth.currentUser;
    if (!user) return;
    await fetch(`${SERVER}/game-invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: await user.getIdToken(), classId, roomId }),
    });
  } catch {
    /* offline or the Worker isn't updated yet */
  }
};

export const useGroupPush = () => {
  const [settings, setSettings] = useState(read);
  useEffect(() => {
    const sync = () => setSettings(read());
    window.addEventListener(CHANGED, sync);
    return () => window.removeEventListener(CHANGED, sync);
  }, []);
  return settings;
};

/** Tells the group about a take-over or a call for help (best effort; the page shows it anyway). */
export const notifyGroup = async (groupId: string, kind: 'taken' | 'help', kathisma: number) => {
  try {
    const user = auth.currentUser;
    if (!user) return;
    await fetch(`${SERVER}/group-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: await user.getIdToken(), groupId, kind, kathisma }),
    });
  } catch {
    /* offline or the Worker isn't updated yet */
  }
};

// ---- calls and messages (2026-11-05) ---------------------------------------------------------------------

const post = async (path: string, body: Record<string, unknown>) => {
  try {
    const user = auth.currentUser;
    if (!user) return;
    await fetch(`${SERVER}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: await user.getIdToken(), ...body }),
    });
  } catch {
    /* offline or the Worker isn't updated yet: the open app shows it anyway */
  }
};

/** A call just started in `base` (dms/{id} or classes/{id}): the others' phones ring. `end`: nobody answered. */
export const notifyRing = (base: string, end = false) => post('/ring', end ? { base, end: true } : { base });

/** A message `id` was just written in `base`: the chat's other people see it on their phones. `pin`: a teacher's card
 *  in a class (classes/{id}/pins) — only its member hears it. */
export const notifyChat = (base: string, id: string, pin = false) => post('/chat-notify', pin ? { base, id, pin: true } : { base, id });

const CHAT_BOUND = 'sg-chat-push';

/**
 * This browser rings for the signed-in person's calls and shows their messages. `ask`: may ask for the permission (only
 * from a tap); otherwise binds only where notifications are already allowed. Returns '' when bound, else why not.
 */
export const bindChatDevice = async (ask: boolean): Promise<string> => {
  const user = auth.currentUser;
  if (!user) return 'ჯერ შედი ანგარიშში.';
  if (!pushSupported()) return 'ეს ბრაუზერი შეტყობინებებს ვერ მიიღებს.';
  if (Notification.permission !== 'granted') {
    if (!ask || Notification.permission === 'denied') return 'შეტყობინებები დაბლოკილია — ჩართე ტელეფონის პარამეტრებში.';
    if ((await Notification.requestPermission()) !== 'granted') return 'შეტყობინებები დაბლოკილია — ჩართე ტელეფონის პარამეტრებში.';
  }
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg?.pushManager) return 'შეტყობინებები მხოლოდ გამოქვეყნებულ საიტზე მუშაობს.';
    const sub = (await reg.pushManager.getSubscription())
      ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) });
    const res = await fetch(`${SERVER}/account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON(), token: await user.getIdToken(), chat: true }),
    });
    if (!res.ok) return 'შეხსენებების სერვერმა ვერ მიიღო. სცადე მოგვიანებით.';
    localStorage.setItem(CHAT_BOUND, `${user.uid}|${sub.endpoint.slice(-24)}|${new Date().toISOString().slice(0, 10)}`);
    return '';
  } catch {
    return 'შეხსენებების სერვერთან კავშირი ვერ მოხერხდა.';
  }
};

/** this browser was bound for this person today (a quiet re-bind once a day keeps a renewed subscription in place) */
export const chatBoundToday = (uid: string) => {
  const v = localStorage.getItem(CHAT_BOUND) || '';
  return v.startsWith(`${uid}|`) && v.endsWith(`|${new Date().toISOString().slice(0, 10)}`);
};
