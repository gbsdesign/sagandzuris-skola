import { useEffect, useState } from 'react';

// ხუცური for the whole site: the header's „Ⴞ“ button (and the prayer page's „ხუცური“) turn it on and off.
// On = `html.khutsuri`, which index.css answers by drawing every Georgian letter with the nuskhuri fonts of the
// „საღვთისმსახურო წიგნები“ app (public/fonts/sg-*.woff, made by scripts/fonts/build-sg-nuskhuri.py) — the text
// itself stays ordinary Georgian, so copying and search keep working. The choice stays on this device.

const KEY = 'sg-khutsuri';
const EVENT = 'sg-khutsuri';

export const isKhutsuri = (): boolean => {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
};

export const applyKhutsuri = (on: boolean) => document.documentElement.classList.toggle('khutsuri', on);

export const setKhutsuri = (on: boolean) => {
  try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* private mode: this visit only */ }
  applyKhutsuri(on);
  window.dispatchEvent(new Event(EVENT));
};

export const useKhutsuriSetting = (): [boolean, (on: boolean) => void] => {
  const [on, setOn] = useState(isKhutsuri);
  useEffect(() => {
    const sync = () => setOn(document.documentElement.classList.contains('khutsuri'));
    const fromOtherTab = (e: StorageEvent) => { if (e.key === KEY) { applyKhutsuri(isKhutsuri()); sync(); } };
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', fromOtherTab);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener('storage', fromOtherTab); };
  }, []);
  return [on, setKhutsuri];
};
