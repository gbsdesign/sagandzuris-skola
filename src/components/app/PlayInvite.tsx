import React, { useEffect, useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { useNotes } from '../../context/NotesContext';
import { useCall } from '../../utils/callSession';
import { isAndroidApp, NEW_APP_PACKAGE, APP_PACKAGE } from '../../utils/androidApp';
import { Btn } from '../ui/kit';

// An Android phone's browser that has not got the Play app (2026-11-23, the user: „ვინც აპში შემოვა და არ ექნება
// ჩამოწერილი მას გაუხსნას პირდაპირ გუგლში … და სთხოვოს ჩამოწერა თუ ანდროიდი აქვს“): a window a moment after opening,
// whose button opens the Play closed test's page. Chrome tells whether the app is on the phone (getInstalledRelatedApps
// over the manifest's related_applications + the app's asset_statements); then nothing shows. Never inside the app, a
// service (the notes, the program, church mode) or a call. „მოგვიანებით“ = again tomorrow, a tap on the button = in 3 days.

export const PLAY_TEST_URL = `https://play.google.com/apps/testing/${NEW_APP_PACKAGE}`;
const LATER = 'sg-play-invite-later';
const DAY = 86400_000;

const androidBrowser = () => /android/i.test(navigator.userAgent) && !isAndroidApp();

const hiddenUntil = () => {
  try { return Number(localStorage.getItem(LATER) || 0); } catch { return 0; }
};
const hideFor = (days: number) => {
  try { localStorage.setItem(LATER, String(Date.now() + days * DAY)); } catch { /* private window */ }
};

type RelatedApp = { id?: string; platform?: string };
const hasPlayApp = async (): Promise<boolean> => {
  const nav = navigator as Navigator & { getInstalledRelatedApps?: () => Promise<RelatedApp[]> };
  if (!nav.getInstalledRelatedApps) return false;
  try {
    const apps = await nav.getInstalledRelatedApps();
    return apps.some((a) => a.id === NEW_APP_PACKAGE || a.id === APP_PACKAGE);
  } catch {
    return false;
  }
};

export const PlayInvite: React.FC = () => {
  const { notes, programOpen, church } = useNotes();
  const call = useCall();
  const [ask, setAsk] = useState(false);

  useEffect(() => {
    if (!androidBrowser() || Date.now() < hiddenUntil()) return;
    let off = false;
    const t = window.setTimeout(async () => {
      if (await hasPlayApp()) return;
      if (!off) setAsk(true);
    }, 2500);
    return () => { off = true; window.clearTimeout(t); };
  }, []);

  if (!ask || notes || programOpen || church || call.status !== 'idle') return null;

  const later = () => { hideFor(1); setAsk(false); };
  const open = () => { hideFor(3); setAsk(false); };

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-[#2a2017]/45 backdrop-blur-[2px] p-3 sm:p-6 sg-in" onClick={later}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="ჩამოწერე აპი"
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-sm rounded-[28px] bg-[#fbf6ec] ring-1 ring-[#e8dcc8] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] shadow-2xl sg-up"
      >
        <div className="flex items-start gap-3">
          <span className="w-12 h-12 shrink-0 rounded-full bg-[#7a2028]/[0.08] text-[#7a2028] flex items-center justify-center">
            <Smartphone className="w-6 h-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-serif-ge text-[18px] font-bold leading-snug text-[#2a2017]">ჩამოწერე აპი</p>
            <p className="mt-1 text-[14px] leading-snug text-[#75685a]">
              საგანძურის სკოლა Google Play-ზეა. აპში უფრო სწრაფად იხსნება, რეკავს და შეგატყობინებს, დახურულიც.
            </p>
          </div>
        </div>
        <a
          href={PLAY_TEST_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={open}
          className="mt-4 w-full h-12 rounded-full bg-[#7a2028] hover:bg-[#5e1820] text-[#fbf6ec] font-bold text-[15px] flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
        >
          <Download className="w-5 h-5" />
          ჩამოწერა Google Play-დან
        </a>
        <div className="mt-2 flex justify-center">
          <Btn kind="ghost" onClick={later}>მოგვიანებით</Btn>
        </div>
      </div>
    </div>
  );
};

export default PlayInvite;
