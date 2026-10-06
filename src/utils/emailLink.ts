import { isSignInWithEmailLink, sendSignInLinkToEmail, signInWithEmailLink } from 'firebase/auth';
import { auth } from '../firebase';

// Sign-in by a link sent to the e-mail address, for members without a Google account (older psalter
// readers above all). Firebase sends the letter; its link opens the site again (…/?login=email&oobCode=…),
// where EmailLinkFinish completes the sign-in. The address is remembered on this device so it needn't be
// typed twice; a link opened in another browser asks for it again (Firebase's guard against a forwarded link).
// Needs "Email link (passwordless sign-in)" switched on in the Firebase console (Authentication → Sign-in method).

const KEY = 'sgEmailForSignIn';

export const looksLikeEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());

const clean = (email: string) => email.trim().toLowerCase();

export const sendEmailLink = async (email: string) => {
  await sendSignInLinkToEmail(auth, clean(email), {
    url: `${window.location.origin}/?login=email`,
    handleCodeInApp: true,
  });
  try { localStorage.setItem(KEY, clean(email)); } catch { /* asked again when the link opens */ }
};

export const rememberedEmail = () => {
  try { return localStorage.getItem(KEY) || ''; } catch { return ''; }
};

export const openedFromEmailLink = () => isSignInWithEmailLink(auth, window.location.href);

/** The link's codes off the address bar (the page and its history entry stay). */
export const dropLinkFromAddress = () => window.history.replaceState(window.history.state, '', window.location.pathname);

/** Signs in with the link this page was opened from. */
export const finishEmailLink = async (email: string) => {
  await signInWithEmailLink(auth, clean(email), window.location.href);
  try { localStorage.removeItem(KEY); } catch { /* nothing to forget */ }
  dropLinkFromAddress();
};

/** Firebase's errors on this road, in plain Georgian. */
export const emailLinkError = (code?: string) => {
  switch (code) {
    case 'auth/invalid-email':
    case 'auth/missing-email':
      return 'ელფოსტა არასწორადაა ჩაწერილი.';
    case 'auth/invalid-action-code':
    case 'auth/expired-action-code':
      return 'ეს ბმული უკვე გამოყენებულია ან ძველია. მოითხოვეთ ახალი.';
    case 'auth/too-many-requests':
    case 'auth/quota-exceeded':
      return 'ძალიან ბევრი მცდელობაა. სცადეთ ცოტა ხანში.';
    case 'auth/network-request-failed':
      return 'ინტერნეტი არ ჩანს. შეამოწმეთ კავშირი და სცადეთ თავიდან.';
    case 'auth/user-disabled':
      return 'ეს ანგარიში გათიშულია. მიმართეთ მასწავლებელს.';
    case 'auth/operation-not-allowed':
    case 'auth/unauthorized-continue-uri':
    case 'auth/unauthorized-domain':
      return 'ელფოსტით შესვლა ჯერ არ მუშაობს. შეატყობინეთ მასწავლებელს ან შედით Google-ით.';
    default:
      return 'რაღაც ვერ გამოვიდა. სცადეთ თავიდან.';
  }
};
