import { auth } from '../firebase';
import { isAndroidApp, openInApp } from './androidApp';

// The app's home-screen widgets read the member's day from the reminders Worker (worker/reminders, /widget/*):
// „ვიჯეტის დაკავშირება“ asks it for a secret and hands that to the app; while the site is open it leaves there what
// the widgets show (components/app/WidgetSync.tsx). Kept on this device: whether the widgets are linked.

export const WIDGET_SERVER = 'https://sagandzuri-reminders.mr-gabunia.workers.dev';
const KEY = 'sg-widgets-linked';
const CHANGED = 'sg-widgets-changed';

export const widgetsLinked = () => {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
};

export const onWidgetsChanged = (fn: () => void) => {
  window.addEventListener(CHANGED, fn);
  return () => window.removeEventListener(CHANGED, fn);
};

export const linkWidgets = async () => {
  const user = auth.currentUser;
  if (!user || !isAndroidApp()) return false;
  const res = await fetch(`${WIDGET_SERVER}/widget/link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: await user.getIdToken() }),
  });
  if (!res.ok) throw new Error(`widget link ${res.status}`);
  const { secret } = await res.json();
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    /* storage off: the summary is still sent this visit */
  }
  window.dispatchEvent(new Event(CHANGED));
  openInApp(`link?s=${encodeURIComponent(secret)}`);
  return true;
};

export const sendWidgetSummary = async (summary: unknown) => {
  const user = auth.currentUser;
  if (!user) return;
  await fetch(`${WIDGET_SERVER}/widget/summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: await user.getIdToken(), summary }),
  });
};
