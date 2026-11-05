// What a QR code read by the notes page's camera points at: a chant of the app (opens in place), another page of
// the app (opens here), another site (asked first) or plain words.
const OWN_HOST = /^(?:www\.)?sagandzureli\.ge$|(?:^|\.)sagandzuris-skola\.pages\.dev$/i;

export type QrTarget =
  | { kind: 'chant'; vid: string }
  | { kind: 'app'; path: string }
  | { kind: 'link'; url: string }
  | { kind: 'text'; text: string };

/** `here` = this page's address; `known` says whether a chant version id exists. */
export function qrTarget(raw: string, here: string, known: (vid: string) => boolean): QrTarget {
  const text = raw.trim();
  let u: URL;
  try { u = new URL(text); } catch { return { kind: 'text', text }; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return { kind: 'text', text };
  let host = '';
  try { host = new URL(here).host; } catch { /* no address: only the school's own sites count */ }
  if (u.host !== host && !OWN_HOST.test(u.hostname)) return { kind: 'link', url: u.href };
  const v = u.searchParams.get('v');
  if (v && known(v)) return { kind: 'chant', vid: v };
  return { kind: 'app', path: `${u.pathname}${u.search}${u.hash}` };
}
