import React from 'react';
import { LoadFailed } from './PageSkeleton';

// „ინტერნეტი არ არის“ in the new look: a page whose file is not on the phone yet and cannot be fetched. The same calm screen
// as every page that did not load (board x-ultra-chonchkhi-3, PageSkeleton's `LoadFailed`): what happened, why,
// „ხელახლა ცდა“ and the way to what the phone keeps. (The bottom menu is the way home.)

export const NotLoadedView: React.FC<{ onRetry: () => void; onHome?: () => void }> = ({ onRetry }) => (
  <LoadFailed
    title="ინტერნეტი არ არის"
    text="ეს გვერდი ჯერ არ გაგიხსნია, ამიტომ ტელეფონში არ ინახება. ჩართე ინტერნეტი და ისევ სცადე."
    onRetry={onRetry}
    className="pt-6"
  />
);
