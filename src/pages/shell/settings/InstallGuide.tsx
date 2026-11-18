import React from 'react';
import { Share } from 'lucide-react';
import { Button, Num, Sheet } from '../../../components/ui2';

// „აპის დაყენება“ on an iPhone or iPad: Safari offers no install button, so two steps say how (the same words as the old
// look's guide in components/PWAInstallButton.tsx).

export const InstallGuide: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => (
  <Sheet open={open} onClose={onClose} title="დაყენება iPhone / iPad-ზე">
    <ol className="flex shrink-0 flex-col divide-y divide-line overflow-hidden rounded-card bg-surf">
      <li className="flex min-h-row items-center gap-3 px-4 py-3">
        <Num n="1" on />
        <p className="min-w-0 flex-1 text-body leading-snug text-ink">
          დააჭირე Safari-ს <b>გაზიარების</b> <span className="whitespace-nowrap">ღილაკს
            <Share aria-label="გაზიარება" className="ml-1 inline size-4 -translate-y-0.5 text-wine" strokeWidth={2} /></span>
        </p>
      </li>
      <li className="flex min-h-row items-center gap-3 px-4 py-3">
        <Num n="2" on />
        <p className="min-w-0 flex-1 text-body leading-snug text-ink">სიაში აირჩიე <b>Add to Home Screen</b></p>
      </li>
    </ol>
    <Button full onClick={onClose}>გასაგებია</Button>
  </Sheet>
);
