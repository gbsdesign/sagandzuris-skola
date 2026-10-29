import { auth } from '../firebase';
import { WIDGET_SERVER } from './widgetLink';

// „კალენდარი ტელეფონში“: the reminders Worker serves each member a calendar feed (worker/reminders/ics.js) — the great
// feasts, the fasts and their classes' lessons — at an address with a secret of its own (the widgets' /widget/link).
// The phone's calendar app fetches it by itself, so new lessons arrive without a tap. The address stays on this device.

const KEY = 'sg-cal-feed';

export const calendarFeedUrl = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('signed out');
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved?.uid === user.uid && typeof saved.url === 'string') return saved.url as string;
  } catch {
    /* storage off */
  }
  const res = await fetch(`${WIDGET_SERVER}/widget/link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: await user.getIdToken() }),
  });
  if (!res.ok) throw new Error(`calendar link ${res.status}`);
  const { secret } = await res.json();
  const url = `${WIDGET_SERVER}/cal/${secret}.ics`;
  try {
    localStorage.setItem(KEY, JSON.stringify({ uid: user.uid, url }));
  } catch {
    /* asked again next time */
  }
  return url;
};

const webcal = (url: string) => url.replace(/^https:/, 'webcal:');
/** Google Calendar's „add by address“ page (Android phones, computers) */
export const googleCalendarLink = (url: string) => `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal(url))}`;
/** iPhone, Mac and Outlook open a webcal: address in their own calendar */
export const appleCalendarLink = webcal;
