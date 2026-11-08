import React from 'react';
import { MtkmeliMap } from './MtkmeliMap';

// „მთქმელი“: the poets' map. Its videos tab went on 2026-11-09 (the user: „მთქმელის ღილაკ წაშალე მასში არსებული ვიდეობი … გადაიტანე
// სახალისოში … წმ პაისი ბიბლიოთეკაში“): the films live in „სახალისო“, St Paisios on the library's „ვიდეოთეკა“; the vine has no
// „მთქმელი“ label any more (the poets are in „ხალხური“'s regions), the page still opens from the search and old history steps.
interface MtkmeliPageProps {
  selectedChantVariants?: Record<string, any>;
  onTogglePoem?: (poemId: string, poemTitle: string, author: string, regionCode: string, regionName: string) => void;
}

export const MtkmeliPage: React.FC<MtkmeliPageProps> = ({ selectedChantVariants, onTogglePoem }) => (
  <div className="w-full flex flex-col gap-3">
    <MtkmeliMap selectedChantVariants={selectedChantVariants} onTogglePoem={onTogglePoem} />
  </div>
);
