import { useEffect, useState } from 'react';
import { auth } from '../firebase';
import { isAndroidApp } from './androidApp';

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

/** whether a subscription was made with this site's server key (none given: an app's, it goes through Firebase) */
const sameServerKey = (sub: PushSubscription) => {
  const k = sub.options?.applicationServerKey;
  if (!k) return true;
  const a = new Uint8Array(k);
  const b = keyBytes(VAPID_PUBLIC_KEY);
  return a.length === b.length && a.every((x, i) => x === b[i]);
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

const send = async (path: string, body: Record<string, unknown>) => {
  const user = auth.currentUser;
  if (!user) return null;
  return fetch(`${SERVER}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: await user.getIdToken(), ...body }),
  });
};

const post = async (path: string, body: Record<string, unknown>) => {
  try {
    await send(path, body);
  } catch {
    /* offline or the Worker isn't updated yet: the open app shows it anyway */
  }
};

/** the Worker's JSON answer, or null (offline, refused, or an older Worker that answers in words) */
const postJson = async <T>(path: string, body: Record<string, unknown>): Promise<T | null> => {
  try {
    const res = await send(path, body);
    if (!res?.ok || !(res.headers.get('Content-Type') || '').includes('json')) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
};

/** One person a ring was sent for (worker/reminders `ringReport`): their phones bound for calls, how many took the ring
 *  and of what kind ('android' the Play app · 'ios' the iPhone app · 'web' a browser), whether their quiet hours held
 *  it, and the push service's word for a phone that refused. */
export interface RingPerson { uid: string; phones: number; ok: number; kinds: string[]; quiet: boolean; why: string[] }

/** A call just started in `base` (dms/{id} or classes/{id}): the others' phones ring, and the answer says whose did.
 *  `end`: nobody answered (the phones still ringing say „გამოტოვებული ზარი“). */
export const notifyRing = async (base: string, end = false): Promise<RingPerson[] | null> => {
  const answer = await postJson<{ people?: RingPerson[] }>('/ring', end ? { base, end: true } : { base });
  return Array.isArray(answer?.people) ? answer.people : null;
};

/** A message `id` was just written in `base`: the chat's other people see it on their phones. `pin`: a teacher's card
 *  in a class (classes/{id}/pins) — only its member hears it. */
export const notifyChat = (base: string, id: string, pin = false) => post('/chat-notify', pin ? { base, id, pin: true } : { base, id });

/** An admin's notice for everyone (the header's 🔔 „ყველას მიწერა“): the Worker sends it to every phone bound for messages. */
export const notifyAnnouncement = (id: string) => post('/announce', { id });

const CHAT_BOUND = 'sg-chat-push';

// a step of the phone's that never answers (2026-11-05: the Play app before 1.1.3 could not show Android's permission
// window, and „ირთვება…“ stayed for ever) gives up after a while and says what to do instead: in the app the permission
// can be given in the phone's own settings, and the card binds by itself once it is (PhoneRingSetup)
const LATE = Symbol('late');
const within = <T>(p: Promise<T>, ms: number): Promise<T | typeof LATE> =>
  Promise.race([p, new Promise<typeof LATE>(r => window.setTimeout(() => r(LATE), ms))]);
const NO_WINDOW = () => (isAndroidApp()
  ? 'ნებართვის ფანჯარა ვერ გაიხსნა. ჩართე ტელეფონის პარამეტრებში: პარამეტრები → აპები → საგანძური → შეტყობინებები → ჩართვა, და დაბრუნდი აქ. თუ ისევ არ ჩაირთო, განაახლე აპი Play Store-ში.'
  : 'ნებართვის ფანჯარა არ გამოჩნდა — სცადე თავიდან.');

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
    const answer = await within(Notification.requestPermission(), 20_000);
    if (answer === LATE) return NO_WINDOW();
    if (answer !== 'granted') return 'შეტყობინებები დაბლოკილია — ჩართე ტელეფონის პარამეტრებში.';
  }
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg?.pushManager) return 'შეტყობინებები მხოლოდ გამოქვეყნებულ საიტზე მუშაობს.';
    let old = await reg.pushManager.getSubscription();
    // a browser's subscription made with another server key is refused by its push service (403): it is made anew
    // (the store apps' subscriptions carry no key — theirs go through Firebase)
    if (old && !sameServerKey(old)) {
      await old.unsubscribe().catch(() => false);
      old = null;
    }
    const sub = old
      ?? await within(reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }), 30_000);
    if (sub === LATE) return 'ტელეფონმა შეტყობინებები ვერ ჩართო — გადატვირთე აპი და სცადე თავიდან.';
    const res = await fetch(`${SERVER}/account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON(), token: await user.getIdToken(), chat: true }),
    });
    if (!res.ok) return 'შეხსენებების სერვერმა ვერ მიიღო. სცადე მოგვიანებით.';
    localStorage.setItem(CHAT_BOUND, `${user.uid}|${sub.endpoint.slice(-24)}|${new Date().toISOString().slice(0, 10)}`);
    boundNow = user.uid;
    return '';
  } catch (e) {
    // the phone's own word (the store apps: Firebase's „SERVICE_NOT_AVAILABLE“, „not-ready“…) says where it stopped
    const word = e instanceof Error ? e.message : '';
    if (word && !/fetch|network|load failed/i.test(word)) return `ტელეფონმა ზარები ვერ ჩართო (${word.slice(0, 60)}). გადატვირთე აპი და სცადე თავიდან.`;
    return 'შეხსენებების სერვერთან კავშირი ვერ მოხერხდა.';
  }
};

// bound in this opening of the page (the store apps bind again at every opening: their phone's token can change while
// the app is closed, and a token the server dropped is otherwise not bound again until the next day)
let boundNow = '';

/** this browser was bound for this person today (a quiet re-bind once a day keeps a renewed subscription in place) */
export const chatBoundToday = (uid: string) => {
  const v = localStorage.getItem(CHAT_BOUND) || '';
  return v.startsWith(`${uid}|`) && v.endsWith(`|${new Date().toISOString().slice(0, 10)}`);
};

/** bound recently enough: in the store apps since this opening, in a browser today */
export const chatBoundFresh = (uid: string) => {
  const w = window as unknown as { sgApp?: unknown; sgIOS?: unknown };
  return w.sgApp || w.sgIOS ? boundNow === uid : chatBoundToday(uid);
};

/** how many phones of each person ring for calls with the app closed, and of what kind (a teacher's or an admin's look —
 *  worker/reminders `/phones`; null: not staff, offline, or an older Worker) */
export interface PhonesOf { phones: number; kinds: string[] }
export const phonesOf = (uids: string[]) => postJson<Record<string, PhonesOf>>('/phones', { uids });

// ---- this phone's own check (settings → „შეტყობინებები“ → „ზარები ამ ტელეფონზე“, 2026-11-24) --------------------------

/** a test ring's outcome as the server saw it: whether the push service took it, its word when not, the phone's kind */
export interface PhoneTest { at: string; ok: boolean; why: string; kind: string }
export interface PhoneState { bound: boolean; kind: string; last?: PhoneTest | null; test?: PhoneTest }

/** this browser's push subscription, never asking anything (null: none, or notifications not allowed) */
const currentSubscription = async () => {
  if (!pushSupported() || Notification.permission !== 'granted') return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager?.getSubscription()) ?? null;
};

/** Whether this phone rings for the signed-in person's calls (null: the server could not be asked). `test`: the server
 *  rings it 10 s later — time to lock the screen — and answers whether the push service took the ring. */
export const myPhone = async (test = false): Promise<PhoneState | null> => {
  let sub: PushSubscription | null = null;
  try {
    sub = await currentSubscription();
  } catch {
    sub = null;
  }
  if (!sub) return { bound: false, kind: '' };
  return postJson<PhoneState>('/my-phone', { endpoint: sub.endpoint, test });
};
