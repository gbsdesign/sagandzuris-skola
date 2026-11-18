import React, { useEffect, useState } from 'react';
import { CalendarDays, Check, Copy, Leaf, Loader2, RefreshCw, Star, Users } from 'lucide-react';
import { Button, Dot, Helper, Row, Rows, Sheet } from '../../../components/ui2';
import { appleCalendarLink, calendarFeedUrl, googleCalendarLink } from '../../../utils/calendarFeed';

// „კალენდარი ტელეფონში“ in the new look (board x-kalendari-telefonshi): what comes into the phone's calendar as three rows,
// one line that it updates itself, and one main button — the phone's own calendar on an iPhone or a Mac, Google's
// elsewhere. The address is made the first time the window opens (utils/calendarFeed.ts); copying it stays for other apps.

const isApple = () => /iPhone|iPad|Macintosh/.test(navigator.userAgent);

export const PhoneCalendarSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'busy' | 'error' | 'copied'>('idle');

  useEffect(() => {
    if (!open || url) return;
    setState('busy');
    calendarFeedUrl().then(u => { setUrl(u); setState('idle'); }, () => setState('error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const add = () => {
    if (!url) return;
    if (isApple()) window.location.href = appleCalendarLink(url);
    else window.open(googleCalendarLink(url), '_blank', 'noopener');
  };
  const copy = async () => {
    if (!url) return;
    try { await navigator.clipboard.writeText(url); setState('copied'); } catch { /* no clipboard */ }
  };

  return (
    <Sheet open={open} title="კალენდარი ტელეფონში" onClose={onClose}>
      <Rows>
        <Row lead={<Dot icon={<Star />} />} title="დიდი დღესასწაულები" />
        <Row lead={<Dot icon={<Leaf />} />} title="მარხვები" />
        <Row lead={<Dot icon={<Users />} />} title="შენი კლასის გაკვეთილები" sub="ახალი გაკვეთილი მალე ჩნდება" wrap />
      </Rows>
      <Helper icon={<RefreshCw />}>კალენდარი თავად ახლდება.</Helper>
      {state === 'error' && <p role="alert" className="px-1.5 text-meta text-danger">ვერ მოვამზადე — შეამოწმე ინტერნეტი და სცადე ხელახლა.</p>}
      <div className="mt-2 flex shrink-0 flex-col gap-1">
        <Button full icon={state === 'busy' ? <Loader2 className="animate-spin" /> : <CalendarDays />} disabled={!url} onClick={add}>
          {state === 'busy' ? 'ვამზადებ…' : 'კალენდარში დამატება'}
        </Button>
        {url && (
          <Button full kind="quiet" size="md" icon={state === 'copied' ? <Check /> : <Copy />} onClick={() => void copy()}>
            {state === 'copied' ? 'დაკოპირდა — არავის გაუზიარო' : 'მისამართის კოპირება'}
          </Button>
        )}
      </div>
    </Sheet>
  );
};
