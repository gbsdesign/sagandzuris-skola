// The Play Store app (android/): the site in the app's own window (a WebView, since 2026-11-11 — window.sgApp with platform
// 'android' tells it) plus the app's own parts — home-screen widgets, church silence. The older Chrome-based app (a Trusted
// Web Activity) carries it as the first page load's referrer; that mark stays for the tab (sessionStorage), so the same
// phone's Chrome never thinks it is the app.

export const APP_PACKAGE = 'ge.sagandzureli.app';
const KEY = 'sg-android-app';

/** called once before the first paint (main.tsx) */
export const markAndroidApp = () => {
  try {
    if (document.referrer.startsWith(`android-app://${APP_PACKAGE}`)) sessionStorage.setItem(KEY, '1');
  } catch {
    /* storage off */
  }
};

export const isAndroidApp = () => {
  if (typeof window !== 'undefined' && (window as unknown as { sgApp?: { platform?: string } }).sgApp?.platform === 'android') return true;
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
};

/** Hands `path` ("link?s=…", "silence?on=1") to the app's own screens (sagandzuri://…); they do their part and step back. */
export const openInApp = (path: string) => {
  if (!isAndroidApp()) return;
  window.location.href = `intent://${path}#Intent;scheme=sagandzuri;package=${APP_PACKAGE};end`;
};
