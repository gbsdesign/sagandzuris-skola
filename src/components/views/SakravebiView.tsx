import React, { useState } from 'react';
import { Music } from 'lucide-react';
import { INSTRUMENTS_LIST, InstrumentItem } from '../../data';
import { CENTRE_INSTRUMENT_TAKES } from '../../data/centreOther';
import { albumRight, useAlbumAccess } from '../../data/albumAccess';
import { Toast } from '../ui/Toast';
import { Sheet } from '../ui/kit';
import { TakeRow } from '../maps/TakeRow';
import { useAlbumPlayer } from '../../utils/useAlbumPlayer';
import { triggerHaptic } from '../../utils/haptics';
export { INSTRUMENTS_LIST };
export type { InstrumentItem };

export interface SakravebiViewProps {
  selectedChantVariants?: Record<string, any>;
}

type Take = (typeof CENTRE_INSTRUMENT_TAKES)[string][number];

/** an instrument's recordings the signed-in person may hear (an album's 🎧, data/albumAccess.ts) */
const takesOf = (id: string): Take[] => (CENTRE_INSTRUMENT_TAKES[id] ?? []).filter(t => albumRight(t[2]).listen);

const InstrumentSheet: React.FC<{ instrument: InstrumentItem | null; onClose: () => void }> = ({ instrument, onClose }) => {
  const player = useAlbumPlayer();
  const takes = instrument ? takesOf(instrument.id) : [];
  return (
    <Sheet open={Boolean(instrument)} onClose={() => { player.stop(); onClose(); }} title={instrument?.nameGe ?? ''}>
      <p className="mb-3 text-[13px] leading-snug text-[#8c7c6b]">ჩანაწერები · გაკვეთილები მალე დაემატება</p>
      <ul className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] divide-y divide-[#efe5d4] overflow-hidden">
        {takes.map(([file, title, , album, note]) => (
          <TakeRow key={file} id={file} title={title} note={[note, `ალბომი „${album}“`].filter(Boolean).join(' · ')} player={player} />
        ))}
      </ul>
    </Sheet>
  );
};

// The instruments have no lessons yet. One with recordings (data/centreOther.ts — from the albums, so only whoever may hear
// that album sees them) opens a small window with them; the others only say they are coming (so they can't be added to the
// path, "საგანძურის გზა", for now; a teacher may still put one in a class program).
export const SakravebiView: React.FC<SakravebiViewProps> = ({ selectedChantVariants = {} }) => {
  const [soon, setSoon] = useState<string | null>(null);
  const [open, setOpen] = useState<InstrumentItem | null>(null);
  useAlbumAccess(); // an admin's switch applies at once

  return (
    <div className="w-full max-w-lg mx-auto animate-in fade-in duration-200">
      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2.5">
        {INSTRUMENTS_LIST.map(instrument => {
          const n = takesOf(instrument.id).length;
          return (
          <button
            key={instrument.id}
            type="button"
            onClick={() => { triggerHaptic(8); if (n) setOpen(instrument); else setSoon(`„${instrument.nameGe}“ — გაკვეთილები მალე დაემატება`); }}
            className="min-h-12 px-3 py-2 rounded-2xl bg-white ring-1 ring-[#e8dcc8] shadow-[0_1px_0_rgba(133,80,44,0.06)] hover:ring-[#7a2028]/30 flex items-center gap-2.5 text-left cursor-pointer active:scale-[0.98] transition"
          >
            <span className="w-9 h-9 shrink-0 rounded-full grid place-items-center bg-[#fcf1df] text-[#b4620e]">
              <Music className="w-4 h-4" />
            </span>
            <span className="flex-1 min-w-0 flex flex-col">
              <span className="text-[15px] font-bold leading-snug text-[#4a3426]">{instrument.nameGe}</span>
              {n > 0 && <span className="text-[12px] font-semibold text-[#b4620e]">{n} ჩანაწერი</span>}
              {selectedChantVariants[instrument.id] && <span className="text-[12px] font-semibold text-[#2f7a4f]">მონიშნულია ✓</span>}
            </span>
          </button>
          );
        })}
      </div>

      <InstrumentSheet instrument={open} onClose={() => setOpen(null)} />
      <Toast message={soon || ''} type="info" isVisible={!!soon} onClose={() => setSoon(null)} />
    </div>
  );
};
