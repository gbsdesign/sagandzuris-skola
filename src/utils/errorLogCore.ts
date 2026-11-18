// The error log's pure part (2026-11-18; the browser side is utils/errorLog.ts, the admins' list
// components/admin/ErrorLogFold.tsx). It turns whatever was thrown into one short line with NO personal data —
// no name, uid, e-mail, typed words or document ids — and gives the same bug one fingerprint across builds, so
// errorLog/{fingerprint} only counts up. Kept free of Firebase and browser globals so tests/errorLog.test.ts runs in Node.

export type ErrorKind = 'error' | 'promise' | 'react' | 'report';
export interface ErrorEntry {
  id: string; msg: string; where: string; stack: string; kind: ErrorKind;
  count: number; first: string; last: string; ver: string; dev: string;
}

/** Strips what is personal or changes from one time to the next. */
export const scrub = (text: string): string =>
  String(text)
    // an e-mail (not a stack frame like go@index-AbC1.js:1:2)
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[A-Za-z]{2,24}(?![\w.:-])/g, '…@…')
    .replace(/https?:\/\/[^\s'"`)]+/g, u => u.replace(/[?#].*$/, ''))
    // quoted words someone may have typed (a space, a Georgian letter, or long); a short property name stays readable
    .replace(/(["'`])([^"'`\n]+)\1/g, (m, q: string, inner: string) => (/\s|[^\x00-\x7f]/.test(inner) || inner.length > 40 ? `${q}…${q}` : m))
    // ids and tokens (uids, document ids) — but not a file name of the build, like vendor-firebase-Bx8a7KQz.js
    .replace(/[A-Za-z0-9_-]{20,}(?![A-Za-z0-9_-]|\.m?js)/g, w => (/[A-Za-z]/.test(w) && /\d/.test(w) ? '…' : w))
    .replace(/\d{5,}/g, '#')
    .replace(/\s+/g, ' ')
    .trim();

// a frame's address cut down to its file: https://site/assets/index-AbC123.js:1:2345 → index-AbC123.js:1:2345
const fileOf = (frame: string) => frame.replace(/(?:https?|file|webpack|blob):\/\/[^\s)]*\/([^/\s)]+)/g, '$1');

/** The first frames of a stack, each frame's address cut to its file name, scrubbed. */
export const shortStack = (stack: string | undefined, max = 6): string => {
  if (!stack) return '';
  const lines = String(stack).split('\n').map(l => l.trim()).filter(Boolean);
  // V8 starts with „TypeError: message“ — the message is kept apart already
  const frames = lines.filter((l, i) => !(i === 0 && !/^at\s|@/.test(l) && !/:\d+:\d+/.test(l)));
  return frames.slice(0, max).map(f => scrub(fileOf(f))).join('\n').slice(0, 1200);
};

const NOISE = [
  /resizeobserver loop/i,
  /^script error\.?$/i,
  /aborterror|the user aborted|the operation was aborted/i,
  /load failed|failed to fetch|networkerror|network error|network request failed|client is offline|\bunavailable\b/i,
  /notallowederror|permission denied by (the )?user|the request is not allowed by the user agent/i,
  /loading (css )?chunk|dynamically imported module|importing a module script failed/i,
];
const EXTENSION = /(?:chrome|moz|safari(?:-web)?)-extension:\/\//i;

/** Things that are not the app's own bugs: a lost connection, a refused permission, a newly published version, an add-on. */
export const isNoise = (msg: string, stack: string): boolean =>
  NOISE.some(r => r.test(msg)) || EXTENSION.test(stack);

// cyrb53, a small stable string hash (no crypto API needed)
const hash = (s: string, seed = 0) => {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

// a frame without its build: index-AbC123.js:1:2345 → index.js
const stableFrame = (f: string) => f.replace(/-[A-Za-z0-9_]{6,}(\.m?js)/g, '$1').replace(/(:\d+)+\)?$/g, '').replace(/:\d+:\d+/g, '');

/** 14 hex characters: the same bug gives the same one in every build and on every phone. */
export const fingerprint = (kind: string, msg: string, stack: string): string => {
  const frames = stack.split('\n').slice(0, 2).map(stableFrame).join('|');
  const key = `${kind}|${scrub(msg).replace(/\d+/g, '#')}|${frames}`;
  return hash(key).toString(16).padStart(14, '0').slice(-14);
};

/** The kind of device only — nothing more precise. */
export const deviceKind = (ua: string, inApp: 'android' | 'ios' | null): string => {
  const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && /Mobile/i.test(ua));
  const android = /Android/i.test(ua);
  const base = inApp === 'android' ? 'android-app' : inApp === 'ios' ? 'ios-app' : android ? 'android' : ios ? 'ios' : 'desktop';
  if (inApp) return base;
  const browser = /SamsungBrowser/i.test(ua) ? 'samsung' : /Firefox|FxiOS/i.test(ua) ? 'firefox'
    : /Chrome|CriOS|Chromium|Edg\//i.test(ua) ? 'chrome' : /Safari/i.test(ua) ? 'safari' : 'other';
  return `${base} ${browser}`;
};

const messageOf = (error: unknown): { msg: string; stack: string } => {
  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    return { msg: `${typeof code === 'string' && code ? `${code}: ` : ''}${error.name && error.name !== 'Error' && !error.message.startsWith(error.name) ? `${error.name}: ` : ''}${error.message}`, stack: error.stack || '' };
  }
  if (typeof error === 'string') return { msg: error, stack: '' };
  if (error && typeof error === 'object') {
    const o = error as { message?: unknown; code?: unknown; stack?: unknown };
    const m = typeof o.message === 'string' ? o.message : '';
    const c = typeof o.code === 'string' ? o.code : '';
    return { msg: c && m ? `${c}: ${m}` : m || c, stack: typeof o.stack === 'string' ? o.stack : '' };
  }
  return { msg: error === undefined ? '' : String(error), stack: '' };
};

/** One log line for anything thrown, or null for noise and empty errors. */
export const buildEntry = (input: {
  kind: ErrorKind; error: unknown; extraStack?: string; where: string; ver: string; dev: string; now: string;
}): ErrorEntry | null => {
  const { msg: raw, stack: rawStack } = messageOf(input.error);
  if (!raw.trim() || isNoise(raw, rawStack + (input.extraStack || ''))) return null;
  const msg = scrub(raw).slice(0, 300);
  const stack = (shortStack(rawStack) + (input.extraStack ? `\n${shortStack(input.extraStack, 4)}` : '')).trim().slice(0, 1200);
  return {
    id: fingerprint(input.kind, raw, stack),
    msg, stack, kind: input.kind,
    where: input.where.slice(0, 60), ver: input.ver.slice(0, 40), dev: input.dev.slice(0, 40),
    count: 1, first: input.now, last: input.now,
  };
};

export interface LimitState { seen: string[]; day: string; n: number }
const PER_LOAD = 5;
const PER_DAY = 20;

/** Each error once a page load, at most five different ones a load and twenty writes a device a day. */
export const allow = (state: LimitState, id: string, today: string): { ok: boolean; state: LimitState } => {
  const s = state.day === today ? state : { ...state, day: today, n: 0 };
  if (s.seen.includes(id) || s.seen.length >= PER_LOAD || s.n >= PER_DAY) return { ok: false, state: s };
  return { ok: true, state: { seen: [...s.seen, id], day: today, n: s.n + 1 } };
};

// errorText.ts (used in many places, also by Node tests) reaches the browser side through this hook, so it pulls in
// no Firebase. utils/errorLog.ts sets it when it starts.
let reporter: ((e: unknown) => void) | null = null;
export const setReporter = (fn: (e: unknown) => void) => { reporter = fn; };
export const noteError = (e: unknown) => { try { reporter?.(e); } catch { /* the log must never break the app */ } };
