import React, { useState } from 'react';
import { CalendarDays, Check, Copy, ExternalLink, Loader2 } from 'lucide-react';
import { Btn, Sheet } from '../ui/kit';
import { triggerHaptic } from '../../utils/haptics';
import { appleCalendarLink, calendarFeedUrl, googleCalendarLink } from '../../utils/calendarFeed';

const isApple = () => /iPhone|iPad|Macintosh/.test(navigator.userAgent);

/** The profile's „კალენდარი ტელეფონში“: the feasts, fasts and my lessons in the phone's own calendar, kept up to date. */
export const CalendarLinkCard: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'busy' | 'error' | 'copied'>('idle');

  const show = async () => {
    triggerHaptic(10);
    setOpen(true);
    if (url) return;
    setState('busy');
    try {
      setUrl(await calendarFeedUrl());
      setState('idle');
    } catch {
      setState('error');
    }
  };
  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setState('copied');
    } catch {
      /* no clipboard: the address is shown */
    }
  };
  const apple = isApple();
  const google = url && <Btn full size="lg" icon={<ExternalLink />} onClick={() => window.open(googleCalendarLink(url), '_blank', 'noopener')}>Google კალენდარში დამატება</Btn>;
  const appleBtn = url && <Btn full size="lg" kind={apple ? 'primary' : 'soft'} icon={<CalendarDays />} onClick={() => { window.location.href = appleCalendarLink(url); }}>iPhone-ის კალენდარში</Btn>;

  return (
    <>
      <button
        type="button"
        onClick={show}
        className="w-full rounded-2xl bg-white ring-1 ring-[#2a2017]/[0.07] shadow-[0_1px_2px_rgba(42,32,23,0.05),0_10px_28px_-18px_rgba(42,32,23,0.35)] px-4 py-3 flex items-center gap-3.5 text-left cursor-pointer transition hover:ring-[#7a2028]/25 active:scale-[0.99]"
      >
        <span aria-hidden className="w-11 h-11 shrink-0 rounded-2xl ring-1 bg-[#7a2028]/[0.07] ring-[#7a2028]/10 text-[#7a2028] flex items-center justify-center">
          <CalendarDays className="w-5 h-5" strokeWidth={1.9} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-serif-ge text-[15px] font-bold text-[#4a3426]">კალენდარი ტელეფონში</span>
          <span className="block text-[13px] leading-snug text-[#8a7a6a]">დღესასწაულები, მარხვები და ჩემი გაკვეთილები</span>
        </span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="კალენდარი ტელეფონში">
        <div className="space-y-4">
          <p className="text-[14.5px] leading-relaxed text-[#4a3426]">
            ტელეფონის კალენდარში ჩაჯდება დიდი დღესასწაულები, მარხვები და შენი კლასის გაკვეთილები. კალენდარი თვითონ ახლდება —
            ახალი გაკვეთილი რამდენიმე საათში გამოჩნდება.
          </p>
          {state === 'busy' && <p className="flex items-center gap-2 text-[14px] text-[#8a7a6a]"><Loader2 className="w-4 h-4 animate-spin" /> ვამზადებ…</p>}
          {state === 'error' && <p className="text-[14px] text-[#b3261e]">ვერ მოვამზადე — შეამოწმე ინტერნეტი და სცადე ხელახლა.</p>}
          {url && (
            <div className="space-y-2.5">
              {apple ? <>{appleBtn}{google}</> : <>{google}{appleBtn}</>}
              <Btn full kind="ghost" icon={state === 'copied' ? <Check /> : <Copy />} onClick={copy}>
                {state === 'copied' ? 'დაკოპირდა' : 'მისამართის კოპირება'}
              </Btn>
              <p className="text-[12.5px] leading-snug text-[#8a7a6a]">
                Google კალენდარში „დამატება“ დააჭირე. ტელეფონის Google კალენდარში ის რამდენიმე წუთში გამოჩნდება, სახელით „საგანძური“.
                ეს მისამართი არავის გაუზიარო — მასში შენი გაკვეთილებია.
              </p>
            </div>
          )}
        </div>
      </Sheet>
    </>
  );
};
