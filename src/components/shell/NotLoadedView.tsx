import React from 'react';
import { Home, RefreshCw, Wifi } from 'lucide-react';
import { Button } from '../ui2';

// „ინტერნეტი არ არის“ in the new look (redesign stage 2, the prototype `ver-chaitvirta`): a page whose file is not on the phone
// yet and cannot be fetched. One calm screen: what happened, why, and two ways on.

export const NotLoadedView: React.FC<{ onRetry: () => void; onHome: () => void }> = ({ onRetry, onHome }) => (
  <div className="mx-auto flex w-full max-w-sm flex-col items-center px-4 pt-20 pb-10 text-center">
    <span aria-hidden="true" className="mb-5 flex size-20 items-center justify-center rounded-full bg-tint text-wine">
      <Wifi className="size-8" strokeWidth={1.75} />
    </span>
    <h1 className="text-head font-bold">ინტერნეტი არ არის</h1>
    <p className="mt-2 text-body leading-normal text-mut">
      ეს გვერდი ჯერ არ გაგიხსნია, ამიტომ ტელეფონში არ ინახება. ჩართე ინტერნეტი და ისევ სცადე.
    </p>
    <div className="mt-6 flex w-full flex-col items-center gap-2.5">
      <Button icon={<RefreshCw />} onClick={onRetry} className="w-full max-w-72">ხელახლა ცდა</Button>
      <Button kind="ghost" icon={<Home />} onClick={onHome} className="w-full max-w-72">მთავარზე</Button>
    </div>
  </div>
);
