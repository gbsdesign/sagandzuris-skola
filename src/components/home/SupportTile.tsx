import React, { useState } from 'react';
import { Check, Copy, HandHeart } from 'lucide-react';
import { Sheet } from '../ui2';
import { triggerHaptic } from '../../utils/haptics';
import { TileIcon, tileClass } from './ShelfTile';

// „მხარდაჭერა“ on the home's shelf (2026-11-24, the user: „დაამატე მხარდაჭერა წვრილი წარწერით და ლოგო … დაჭერისას ამოხტეს ფანჯარა
// … აპლიკაციის ფუნქციონირებისთვის და განვითარებისთვის შეგიძლიათ სურვილისამებრ გაიღოთ შესაწირი ბ 13801073031“): a small tile
// beside „ჩვევები“, its window says what the gift is for and lets one copy the number. The receiver and the banks: the user, the same
// minute („გიორგი ჩუგოშვილი მიმღები საქართველოსა და თიბისზე“) — a transfer by the receiver's personal number.

const NUMBER = '13801073031';
const SHOWN = NUMBER;
const RECEIVER = 'გიორგი ჩუგოშვილი';

const copy = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // an old browser: a hidden field
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    el.remove();
    return ok;
  }
};

export const SupportSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [copied, setCopied] = useState(false);
  const take = async () => {
    if (await copy(NUMBER)) {
      triggerHaptic(10);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    }
  };
  return (
    <Sheet open={open} title="მხარდაჭერა" onClose={onClose}>
      <div className="flex flex-col items-center gap-4 px-1 pt-1 pb-2 text-center">
        <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-full bg-tint text-wine [&_svg]:size-7">
          <HandHeart strokeWidth={1.75} />
        </span>
        <p className="text-lead leading-snug text-ink">
          აპლიკაციის ფუნქციონირებისა და განვითარებისთვის შეგიძლიათ, სურვილისამებრ, გაიღოთ შესაწირი.
        </p>
        <div className="flex w-full flex-col gap-1 rounded-tile bg-page px-4 py-3 text-left">
          <span className="text-cap font-semibold text-mut">მიმღები</span>
          <span className="text-lead font-bold text-ink">{RECEIVER}</span>
          <span className="text-meta text-mut">საქართველოს ბანკი · თიბისი — გადარიცხვა პირადი ნომრით</span>
        </div>
        <button
          type="button"
          onClick={() => { void take(); }}
          aria-label={`${SHOWN} — დაკოპირება`}
          className="flex w-full cursor-pointer items-center gap-3 rounded-tile bg-page py-3 pr-3 pl-4 text-left transition active:scale-[0.99] active:bg-soft"
        >
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-cap font-semibold text-mut">პირადი ნომერი</span>
            <span className="text-title font-bold tracking-wide text-ink tabular-nums">{SHOWN}</span>
          </span>
          <span className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-meta font-bold ${copied ? 'bg-leaf text-white' : 'bg-wine text-white'}`}>
            {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
            {copied ? 'დაკოპირდა' : 'კოპირება'}
          </span>
        </button>
        <p className="text-meta text-mut">გმადლობთ, ღმერთმა დაგლოცოთ!</p>
      </div>
    </Sheet>
  );
};

/** The shelf's tile (a list item of the home's grid). */
export const SupportTile: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <li className="relative">
      <button type="button" onClick={() => { triggerHaptic(10); setOpen(true); }} aria-label="მხარდაჭერა"
        className={`${tileClass('paper', false)} hover:ring-[#7a2028]/35 active:scale-[0.97]`}>
        <TileIcon><HandHeart /></TileIcon>
        <span className="min-w-0 flex-1 truncate text-[12px] leading-[1.15] font-semibold">მხარდაჭერა</span>
      </button>
      <SupportSheet open={open} onClose={() => setOpen(false)} />
    </li>
  );
};
