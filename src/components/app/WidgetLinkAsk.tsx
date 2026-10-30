import React, { useEffect, useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { useAuth } from '../../context';
import { Btn, Sheet } from '../ui/kit';
import { isAndroidApp } from '../../utils/androidApp';
import { handToApp, widgetSecret } from '../../utils/widgetLink';

// A widget that is not linked yet opens the app at /?open=widgets (android/ BaseWidget.notLinked): this window asks for
// the member's secret at once and links with one tap — Chrome hands a link to the app only straight from a tap.

let pending = false;
const EVENT = 'sg-widget-ask';

export const requestWidgetLink = () => {
  pending = true;
  window.dispatchEvent(new Event(EVENT));
};

export const WidgetLinkAsk: React.FC = () => {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [tries, setTries] = useState(0);

  useEffect(() => {
    const take = () => {
      if (!pending || !isAndroidApp()) return;
      pending = false;
      setOpen(true);
    };
    take();
    window.addEventListener(EVENT, take);
    return () => window.removeEventListener(EVENT, take);
  }, []);

  useEffect(() => {
    if (!open || !user || secret) return;
    setFailed(false);
    widgetSecret().then(setSecret, () => setFailed(true));
  }, [open, user, secret, tries]);

  if (!open) return null;
  const close = () => { setOpen(false); setSecret(null); };
  return (
    <Sheet open onClose={close} title="ვიჯეტის დაკავშირება">
      <div className="space-y-4">
        <p className="text-[14px] leading-snug text-[#75685a]">
          {!user && !loading
            ? 'ჯერ შედი შენს ანგარიშზე — ვიჯეტები შენს ჩვევებს, გზასა და კანონს აჩვენებს.'
            : 'ჩვევები, საგანძურის გზა და ჩემი კანონი ტელეფონის მთავარ ეკრანზე.'}
        </p>
        {user && (
          <Btn
            size="lg"
            full
            icon={<LayoutGrid />}
            disabled={!secret}
            onClick={() => { if (secret) { handToApp(secret); close(); } }}
          >
            {secret ? 'დაკავშირება' : failed ? 'ვერ მოვამზადე' : 'ვამზადებ…'}
          </Btn>
        )}
        {failed && (
          <button type="button" onClick={() => setTries(t => t + 1)} className="w-full text-[13px] text-[#7a2028] underline cursor-pointer">
            ხელახლა ცდა
          </button>
        )}
      </div>
    </Sheet>
  );
};
