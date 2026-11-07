import { type Church, placeUrl, whereOf } from '../data/churches';
import { dayText, feastOf, nextFeastDay, tbilisiToday } from '../data/churchFeasts';

// „გაზიარება“ of a church (pages/churches/ChurchCard.tsx): the phone's share sheet (WhatsApp, the class chat, a message) with
// the name, where it is, its feast and the Google Maps link; a computer without a share sheet gets the text copied.

export const churchShareText = (c: Church) => {
  const feast = feastOf(c);
  const lines = [c.name, whereOf(c)];
  if (feast) lines.push(`ტაძრობა: ${dayText(nextFeastDay(feast, tbilisiToday()))} · ${feast.label}`);
  if (c.kind === 'x') lines.push('ამჟამად არ მოქმედებს');
  if (c.located) lines.push(placeUrl(c));
  lines.push('— საგანძურის სკოლა, „ეკლესია-მონასტრები“');
  return lines.join('\n');
};

/** 'shared' | 'copied' | 'failed' */
export const shareChurch = async (c: Church): Promise<'shared' | 'copied' | 'failed'> => {
  const text = churchShareText(c);
  const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void>; canShare?: (d: ShareData) => boolean };
  if (nav.share) {
    try {
      await nav.share({ title: c.name, text });
      return 'shared';
    } catch (e) {
      // the person closed the sheet — nothing to say
      if ((e as Error)?.name === 'AbortError') return 'shared';
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
};

// the last churches opened on this device, newest first (the first screen's „ბოლოს ნანახი“)
const RECENT_KEY = 'sg-church-recent';
export const MAX_RECENT = 6;
export const readRecentChurches = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, MAX_RECENT) : [];
  } catch { return []; }
};
export const rememberChurch = (id: string) => {
  const next = [id, ...readRecentChurches().filter(x => x !== id)].slice(0, MAX_RECENT);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* private window */ }
  return next;
};
