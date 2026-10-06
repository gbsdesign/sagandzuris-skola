import { useEffect, useState } from 'react';
import { auth } from '../firebase';

// Group notifications through the reminders Worker (worker/reminders):
// • POST /account { subscription, token, psalter, assignments } — this browser receives the signed-in
//   person's group reminders (unread kathisma at 20:00, the cycle's end at 21:00, the new kathisma on
//   the 1st and the 15th) and assignment deadlines. The Firebase ID token proves who they are.
// • POST /group-event { token, groupId, kind, kathisma } — "your kathisma was taken by …" to its reader,
//   "help needed" to the whole group. The Worker checks the facts in Firestore before it sends anything.
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
