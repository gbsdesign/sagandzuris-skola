import React, { useState } from 'react';
import { ChevronDown, Smartphone } from 'lucide-react';
import { RingRow, STATE_WORDS, kindsLine, reachedOf, useRingReport } from '../../utils/ringReport';

// The call screen's line of whom the ring reached (2026-11-24; the Worker's report, utils/ringReport.ts). A private
// call: one quiet line while it rings — a warning only when the other phone could not ring. A class's call: one pill
// „ტელეფონზე დაირეკა 5 / 8“ that unfolds the names, those not reached first, each with why in plain words.

const DOT: Record<RingRow['state'], string> = { rang: 'bg-leaf', quiet: 'bg-gold', noPhone: 'bg-blush', failed: 'bg-blush' };

const Why: React.FC<{ row: RingRow }> = ({ row }) => (
  <span className="block text-cap text-night-ink/70 wrap-break-word">
    {STATE_WORDS[row.state]}
    {row.state === 'rang' && row.kinds.length > 0 && ` · ${kindsLine(row.kinds)}`}
    {row.state === 'failed' && row.why.length > 0 && ` · ${row.why.join(', ')}`}
  </span>
);

export const RingLine: React.FC<{ base: string; oneToOne: boolean; ringing: boolean }> = ({ base, oneToOne, ringing }) => {
  const report = useRingReport(base);
  const [open, setOpen] = useState(false);
  if (!report || !report.people.length) return null;

  if (oneToOne) {
    if (!ringing) return null;
    const row = report.people[0];
    if (row.state === 'rang') {
      return (
        <p className="relative shrink-0 mx-auto mb-2 flex items-center gap-1.5 text-meta text-night-ink/70" role="status">
          <Smartphone className="size-4" aria-hidden="true" /> {STATE_WORDS.rang}
        </p>
      );
    }
    return (
      <div className="relative shrink-0 mx-4 mb-3 flex items-start gap-3 rounded-tile bg-night-surf px-4 py-2.5" role="status">
        <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${DOT[row.state]}`} aria-hidden="true" />
        <p className="min-w-0 flex-1 text-body text-night-ink wrap-break-word">
          {STATE_WORDS[row.state]} — დაირეკება მხოლოდ მაშინ, როცა აპი გახსნილი აქვს.
          {row.state === 'failed' && row.why.length > 0 && <span className="block text-cap text-night-ink/70">{row.why.join(', ')}</span>}
        </p>
      </div>
    );
  }

  const { rang, all } = reachedOf(report.people);
  return (
    <div className="relative shrink-0 mx-4 mb-3">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="mx-auto flex min-h-tap items-center gap-2 rounded-full bg-night-surf px-4 text-body font-semibold text-night-ink cursor-pointer active:scale-95"
      >
        <Smartphone className="size-4 shrink-0" aria-hidden="true" />
        <span>ტელეფონზე დაირეკა</span>
        <span className="tabular-nums">{rang} / {all}</span>
        <ChevronDown className={`size-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <ul className="mt-2 max-h-[40dvh] overflow-y-auto overscroll-contain rounded-tile bg-night-surf px-4 py-1.5">
          {report.people.map(row => (
            <li key={row.uid} className="flex items-start gap-3 py-2">
              <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${DOT[row.state]}`} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-body font-semibold text-night-ink wrap-break-word">{row.name}</span>
                <Why row={row} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
