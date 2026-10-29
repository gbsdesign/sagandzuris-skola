// The Play Store app (android/): the site inside Chrome without its address bar (a Trusted Web Activity), plus the app's
// own parts — home-screen widgets, church silence. The app's first page load carries it as the referrer; the mark stays
// for the tab (sessionStorage), so the same phone's Chrome never thinks it is the app.

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
