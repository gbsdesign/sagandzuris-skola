import React from 'react';
import { Button, Num, Sheet, Two } from '../../../components/ui2';

// „აპის დაყენება“ on an iPhone or iPad (board x-dakeneba-iphone): Safari offers no install button, so three steps say how —
// the third („Add“) was missing and a newcomer stopped there. „Add to Home Screen“ stays in English: the iPhone's menu is
// not in Georgian. Android never shows this window (its browser has one button).

const STEPS: [string, string][] = [
  ['ქვემოთ დააჭირე „გაზიარებას“', 'კვადრატი ზემოთ მიმართული ისრით'],
  ['აირჩიე „Add to Home Screen“', 'სიაში ცოტა ქვემოთაა'],
  ['დააჭირე „Add“', 'ხატულა მთავარ ეკრანზე გაჩნდება'],
];

export const InstallGuide: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => (
  <Sheet open={open} onClose={onClose} title="დაყენება iPhone-ზე">
    <ol className="flex shrink-0 flex-col divide-y divide-line overflow-hidden rounded-card bg-surf">
      {STEPS.map(([title, sub], i) => (
        <li key={title} className="flex min-h-row items-center gap-3 py-2 pr-3 pl-4">
          <Num n={i + 1} />
          <Two title={title} sub={sub} wrap />
        </li>
      ))}
    </ol>
    <Button full onClick={onClose} className="mt-6">გასაგებია</Button>
  </Sheet>
);
