import { useLayoutEffect, useSyncExternalStore } from 'react';
import { COLOR, DARK } from './tokens';

// Reading comfort over the whole app (2026-11-18, boards x-ultra-teqsti and x-ultra-muqi): the text size, the bold
// letters and the dark look. All three stay on this device and are set before the first paint (main.tsx), so a page never
// flashes in the wrong size or colour.
//
// • Text size: five steps of the root font size. The design tokens' text sizes are rem, so the new look grows with it;
//   index.css divides Tailwind's spacing by the same factor (`--sg-scale`), so paddings, buttons and finger sizes keep
//   their size. Above the usual step `html.sg-text-big` lets long names wrap instead of ending in „…“ (`.sg-fit`).
// • Bold: `html.sg-bold` — index.css raises the weight of running text.
// • Dark: `html.sg-dark` swaps the token colours (tokens.css). Only the pages rebuilt for the new look are made of the
//   tokens, so the dark look is shown only while such a page is open (`setDarkPage` from the router); a page not yet
//   rebuilt keeps its own light colours, frame and all, instead of dark text on a dark ground.

const listeners = new Set<() => void>();
const emit = () => listeners.forEach(f => f());
const subscribe = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };

const read = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, v: string) => { try { localStorage.setItem(key, v); } catch { /* private mode: this visit only */ } };
const root = () => (typeof document === 'undefined' ? null : document.documentElement);

// ——— text size ———

export const TEXT_STEPS = [
  { pct: 87.5, name: 'პატარა' },
  { pct: 100, name: 'ჩვეულებრივი' },
  { pct: 112.5, name: 'საშუალო' },
  { pct: 125, name: 'დიდი' },
  { pct: 137.5, name: 'ძალიან დიდი' },
] as const;
export const TEXT_NORMAL = 1;

const SIZE_KEY = 'sg-text-size';
const BOLD_KEY = 'sg-text-bold';

/** the chosen step, 0…4 (1 = the usual size) */
export const textStep = (): number => {
  const n = Number(read(SIZE_KEY));
  return Number.isInteger(n) && n >= 0 && n < TEXT_STEPS.length && read(SIZE_KEY) !== null ? n : TEXT_NORMAL;
};
export const textBold = () => read(BOLD_KEY) === '1';

export const applyTextSize = () => {
  const el = root();
  if (!el) return;
  const step = textStep();
  const scale = TEXT_STEPS[step].pct / 100;
  el.style.fontSize = step === TEXT_NORMAL ? '' : `${TEXT_STEPS[step].pct}%`;
  el.style.setProperty('--sg-scale', String(scale));
  el.classList.toggle('sg-text-big', step > TEXT_NORMAL);
  el.classList.toggle('sg-bold', textBold());
};

export const setTextStep = (step: number) => {
  write(SIZE_KEY, String(Math.max(0, Math.min(TEXT_STEPS.length - 1, Math.round(step)))));
  applyTextSize();
  emit();
};
export const setTextBold = (on: boolean) => {
  write(BOLD_KEY, on ? '1' : '0');
  applyTextSize();
  emit();
};

export const useTextLook = () => {
  const step = useSyncExternalStore(subscribe, textStep, () => TEXT_NORMAL);
  const bold = useSyncExternalStore(subscribe, textBold, () => false);
  return { step, bold };
};

// ——— the dark look ———

export type Theme = 'light' | 'dark' | 'auto';
export const THEME_NAMES: Record<Theme, string> = { light: 'ღია', dark: 'მუქი', auto: 'ტელეფონის მიხედვით' };

const THEME_KEY = 'sg-theme';

export const themeChoice = (): Theme => {
  const v = read(THEME_KEY);
  return v === 'dark' || v === 'auto' ? v : 'light';
};

const osDark = () => {
  try { return window.matchMedia('(prefers-color-scheme: dark)').matches; } catch { return false; }
};

/** the person wants the dark look now (the choice, or the phone's when „ტელეფონის მიხედვით“) — e.g. the notes' „ავტო“ */
export const darkWanted = () => {
  const t = themeChoice();
  return t === 'dark' || (t === 'auto' && osDark());
};

// the open page is built of the design tokens (routes/AppRouter.tsx says so through setDarkPage); until the router has
// spoken the first time the home page is assumed (most openings), so a dark choice does not flash light
let pageOk = true;

/** the dark look is on the screen right now */
export const darkShown = () => pageOk && darkWanted();

let lightThemeColor: string | null = null;

export const applyTheme = () => {
  const el = root();
  if (!el) return;
  const dark = darkShown();
  el.classList.toggle('sg-dark', dark);
  el.style.colorScheme = dark ? 'dark' : '';
  // the phone's bar above the page takes the page's colour
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) {
    if (lightThemeColor === null) lightThemeColor = meta.content;
    meta.content = dark ? DARK.page : pageOk ? COLOR.page : lightThemeColor;
  }
};

export const setTheme = (t: Theme) => {
  write(THEME_KEY, t);
  applyTheme();
  emit();
};

/** the router tells whether the page on screen is a rebuilt one (the dark look follows only those) */
export const setDarkPage = (ok: boolean) => {
  if (ok === pageOk) return;
  pageOk = ok;
  applyTheme();
  emit();
};

/** the pages built of the design tokens in the new look; a part of `gz` still shows an old panel (ოსტატობა) */
const DARK_PAGES = new Set([
  'home', 'notices', 'settings', 'search', 'calendar', 'gz', 'class', 'psalter', 'messages', 'dm', 'student', 'birthdays', 'galoba',
  // stage 6 (pages/v2/lotsva, pages/v2/library)
  'prayer', 'commemoration', 'biblioteka', 'tsinaprebi',
]);
export const darkReadyPage = (page: string, mapItem: string | null) =>
  DARK_PAGES.has(page) && !(page === 'gz' && mapItem === 'ostatoba');

/** the router's one line: the page on screen may (or may not) wear the dark look */
export const useDarkPage = (ok: boolean) => useLayoutEffect(() => setDarkPage(ok), [ok]);

// the phone switching between day and night while „ტელეფონის მიხედვით“ is chosen
if (typeof window !== 'undefined' && window.matchMedia) {
  try {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { applyTheme(); emit(); });
  } catch { /* old browsers: the choice applies on the next opening */ }
}
// another tab changed a setting
if (typeof window !== 'undefined') {
  window.addEventListener('storage', e => {
    if (e.key === THEME_KEY) applyTheme();
    if (e.key === SIZE_KEY || e.key === BOLD_KEY) applyTextSize();
    if (e.key === THEME_KEY || e.key === SIZE_KEY || e.key === BOLD_KEY) emit();
  });
}

export const useTheme = () => {
  const choice = useSyncExternalStore(subscribe, themeChoice, () => 'light' as Theme);
  const wanted = useSyncExternalStore(subscribe, darkWanted, () => false);
  const shown = useSyncExternalStore(subscribe, darkShown, () => false);
  return { choice, wanted, shown };
};
