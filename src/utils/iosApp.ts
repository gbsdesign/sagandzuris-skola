// The App Store app (ios/): the site inside the app's own web view (WKWebView). Before the site's scripts the app puts
// window.sgIOS into every page (ios/Sagandzuri/Shim.swift) — by it the site knows it runs in the app, and through it asks
// the app for what a web view cannot do itself: Google's and Apple's sign-in (Google refuses its page inside an app),
// the phone's notifications. The same shim gives the page Notification and a pushManager made of the app's parts, so
// utils/groupPush.ts and utils/prayerReminders.ts bind the phone without knowing it is an iPhone.
// The Play Store app (android/MainActivity.java, since 2026-11-11 its own WebView too) puts the same bridge in as
// window.sgApp (android/…/Bridge.java, platform 'android'), so every call here serves both phones.

interface IosBridge {
  call: (fn: string, args?: Record<string, unknown>) => Promise<unknown>;
  version: string;
}

const bridge = (): IosBridge | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { sgIOS?: IosBridge; sgApp?: IosBridge };
  const b = w.sgIOS || w.sgApp;
  return b && typeof b.call === 'function' ? b : null;
};

/** in one of the store apps (iPhone or Android): the page asks the app for sign-in and notifications */
export const isIosApp = () => bridge() !== null;

/** the iPhone's app only (Apple's sign-in) */
export const isIphoneApp = () =>
  typeof window !== 'undefined' && typeof (window as unknown as { sgIOS?: IosBridge }).sgIOS?.call === 'function';

/** Calls the app (ios/Sagandzuri/NativeBridge.swift). Fails with the app's short word: 'cancelled', 'not-ready', … */
export const iosCall = async <T>(fn: string, args?: Record<string, unknown>): Promise<T> => {
  const b = bridge();
  if (!b) throw new Error('not-ios');
  return (await b.call(fn, args)) as T;
};

/** the app's short word of a failed call ('' when it is not one) */
export const iosWord = (e: unknown) => (e instanceof Error ? e.message : typeof e === 'string' ? e : '');
