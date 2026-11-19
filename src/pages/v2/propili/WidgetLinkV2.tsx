import React from 'react';
import { LayoutGrid } from 'lucide-react';
import { Button, Note, Sheet } from '../../../components/ui2';
import type { useWidgetAsk } from '../../../components/app/WidgetLinkAsk';

// x-vijetis-dakavshireba — „ვიჯეტის დაკავშირება“, only inside the Android app: a home-screen widget not linked yet opens the
// app here (/?open=widgets). What the widgets will show, and one button — the member's secret is fetched first, the tap
// hands it to the app (components/app/WidgetLinkAsk `useWidgetAsk`).

const SHOWS = ['ჩვევები', 'საგანძურის გზა', 'ჩემი კანონი'];

export const WidgetLinkV2: React.FC<{ w: ReturnType<typeof useWidgetAsk> }> = ({ w }) => (
  <Sheet open title="ვიჯეტის დაკავშირება" onClose={w.close}>
    {w.signedOut ? (
      <Note>ჯერ შედი შენს ანგარიშზე — ვიჯეტები შენს ჩვევებს, გზასა და კანონს აჩვენებს.</Note>
    ) : (
      <>
        <Note>ტელეფონის მთავარ ეკრანზე გამოჩნდება:</Note>
        <ul className="flex shrink-0 flex-wrap gap-2">
          {SHOWS.map(s => (
            <li key={s} className="flex h-10 items-center rounded-full bg-surf px-4 text-body font-semibold">{s}</li>
          ))}
        </ul>
      </>
    )}
    {w.user && (
      <Button full icon={<LayoutGrid />} disabled={!w.secret} onClick={w.link} className="mt-8">
        {w.secret ? 'დაკავშირება' : w.failed ? 'ვერ მოვამზადე' : 'ვამზადებ…'}
      </Button>
    )}
    {w.failed && <Button full kind="quiet" onClick={w.retry}>ხელახლა ცდა</Button>}
  </Sheet>
);
