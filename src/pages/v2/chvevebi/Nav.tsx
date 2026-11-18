import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { RoundButton } from '../../../components/ui2';

/** „‹ period ›“ of the week, the month and the year (x-chvevebi-kvira / -tve / -tseli): the round arrows, the name and a grey line */
export const PeriodNav: React.FC<{ title: string; sub?: string; onPrev?: () => void; onNext?: () => void }> = ({ title, sub, onPrev, onNext }) => (
  <div className="flex shrink-0 items-center gap-2.5">
    <RoundButton label="უკან" disabled={!onPrev} onClick={onPrev}><ChevronLeft aria-hidden="true" strokeWidth={1.75} /></RoundButton>
    <div className="min-w-0 flex-1 text-center">
      <div className="truncate text-lead font-bold">{title}</div>
      {sub && <div className="truncate text-meta text-mut">{sub}</div>}
    </div>
    <RoundButton label="წინ" disabled={!onNext} onClick={onNext}><ChevronRight aria-hidden="true" strokeWidth={1.75} /></RoundButton>
  </div>
);
