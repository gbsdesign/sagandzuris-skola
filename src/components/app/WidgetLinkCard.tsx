import React, { useEffect, useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import { isAndroidApp } from '../../utils/androidApp';
import { handToApp, onWidgetsChanged, widgetSecret, widgetsLinked } from '../../utils/widgetLink';

/** The profile's „ვიჯეტები“ row, only inside the Android app: links the home-screen widgets to this member (once per
 *  phone). Tapping it again links anew — after a reinstall, or when the widgets show someone else. Two taps: the first
 *  fetches the secret, the second hands it to the app (Chrome opens the app only straight from a tap). */
export const WidgetLinkCard: React.FC = () => {
  const [linked, setLinked] = useState(widgetsLinked);
  const [state, setState] = useState<'idle' | 'busy' | 'error'>('idle');
  const [secret, setSecret] = useState<string | null>(null);
  useEffect(() => onWidgetsChanged(() => setLinked(widgetsLinked())), []);
  if (!isAndroidApp()) return null;
  const go = async () => {
    triggerHaptic(10);
    if (secret) {
      handToApp(secret);
      setSecret(null);
      return;
    }
    setState('busy');
    try {
      setSecret(await widgetSecret());
      setState('idle');
    } catch {
      setState('error');
    }
  };
  return (
    <button
      type="button"
      onClick={go}
      disabled={state === 'busy'}
      className="w-full rounded-2xl bg-white ring-1 ring-[#2a2017]/[0.07] shadow-[0_1px_2px_rgba(42,32,23,0.05),0_10px_28px_-18px_rgba(42,32,23,0.35)] px-4 py-3 flex items-center gap-3.5 text-left cursor-pointer transition hover:ring-[#7a2028]/25 active:scale-[0.99] disabled:opacity-60"
    >
      <span aria-hidden className={`w-11 h-11 shrink-0 rounded-2xl ring-1 flex items-center justify-center ${
        linked ? 'bg-[#7a2028] ring-[#7a2028] text-[#fbf6ec]' : 'bg-[#7a2028]/[0.07] ring-[#7a2028]/10 text-[#7a2028]'}`}>
        <LayoutGrid className="w-5 h-5" strokeWidth={1.9} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-serif-ge text-[15px] font-bold text-[#4a3426]">
          {state === 'busy' ? 'ვამზადებ…' : secret ? 'შეეხე — ვიჯეტებში ჩაწერა' : linked ? 'ვიჯეტები დაკავშირებულია' : 'ვიჯეტის დაკავშირება'}
        </span>
        <span className={`block text-[13px] leading-snug ${state === 'error' ? 'text-[#b3261e]' : 'text-[#8a7a6a]'}`}>
          {state === 'error'
            ? 'ვერ დავაკავშირე — სცადე ხელახლა'
            : secret ? 'მზადაა: კიდევ ერთხელ შეეხე და ვიჯეტები შეივსება'
            : linked ? 'ჩვევები და გზა მთავარ ეკრანზე · ხელახლა დაკავშირება' : 'ჩვევები, გზა და კანონი ტელეფონის მთავარ ეკრანზე'}
        </span>
      </span>
    </button>
  );
};
