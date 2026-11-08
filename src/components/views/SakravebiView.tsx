import React, { useState } from 'react';
import { Music } from 'lucide-react';
import { INSTRUMENTS_LIST, InstrumentItem } from '../../data';
import { instrumentsIn } from '../../data/instrumentsData';
import type { FolkRegion } from '../../data/songsData';
import { RegionLocator, RegionPuzzleMap } from '../maps/RegionPuzzleMap';
import { useNavigation } from '../../context';
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
  /** a region open on the instruments' map: its instruments (else the map and every instrument) */
  region?: FolkRegion | null;
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
// Since 2026-11-08 (the user: „საკრავებშიც … გამოიყენე რუკის პრინციპი“, answer „რუკა + სია ქვემოთ“) the map of Georgia comes
// first — a region (`mapItem` „i:<region>“) lists the instruments played there —, then every instrument with where it is from.
export const SakravebiView: React.FC<SakravebiViewProps> = ({ selectedChantVariants = {}, region = null }) => {
  const [soon, setSoon] = useState<string | null>(null);
  const [open, setOpen] = useState<InstrumentItem | null>(null);
  const { openMapItem } = useNavigation();
  useAlbumAccess(); // an admin's switch applies at once
  const press = (instrument: InstrumentItem) => {
    triggerHaptic(8);
    if (takesOf(instrument.id).length) setOpen(instrument);
    else setSoon(`„${instrument.nameGe}“ — გაკვეთილები მალე დაემატება`);
  };
  const here = region ? instrumentsIn(region.id) : [];

  return (
    <div className="w-full flex flex-col gap-4 animate-in fade-in duration-200">
      {region ? (
        <>
          {/* where the region is: a small map with it lit — another region takes a tap */}
          <div className="flex items-center gap-3 px-1 pb-3 border-b border-[#e4d8c4]">
            <RegionLocator region={region} onPick={id => openMapItem(`i:${id}`, true)} className="w-32 sm:w-36 h-auto shrink-0" />
            <div className="min-w-0 flex flex-col gap-0.5">
              <h3 className="text-lg sm:text-xl font-black text-[#2a2017] leading-tight">{region.nameGe}</h3>
              <span className="text-xs font-bold text-[#b4620e]">{here.length} საკრავი</span>
            </div>
          </div>
          {here.length ? (
            <InstrumentGrid list={here} line={i => i.here?.[region.id] ?? i.where} selected={selectedChantVariants} onPress={press} />
          ) : (
            <p className="py-8 text-center text-sm font-bold text-[#8a7a6a]">ამ კუთხის საკრავები ჯერ არ დამატებულა</p>
          )}
        </>
      ) : (
        <>
          <RegionPuzzleMap
            onSelect={r => { triggerHaptic(10); openMapItem(`i:${r.id}`); }}
            count={id => instrumentsIn(id).length}
            countLabel={n => `${n} საკრავი`}
            title="საკრავები"
          />
          <section className="flex flex-col gap-2">
            <h3 className="px-1 text-[15px] font-black text-[#2a2017]">ყველა საკრავი</h3>
            <InstrumentGrid list={INSTRUMENTS_LIST} line={i => i.where} selected={selectedChantVariants} onPress={press} />
          </section>
        </>
      )}

      <InstrumentSheet instrument={open} onClose={() => setOpen(null)} />
      <Toast message={soon || ''} type="info" isVisible={!!soon} onClose={() => setSoon(null)} />
    </div>
  );
};

/** the instruments as roomy cards: the name, where it is from (or its name here), its recordings */
const InstrumentGrid: React.FC<{
  list: InstrumentItem[];
  line: (i: InstrumentItem) => string;
  selected: Record<string, any>;
  onPress: (i: InstrumentItem) => void;
}> = ({ list, line, selected, onPress }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
    {list.map(instrument => {
      const n = takesOf(instrument.id).length;
      return (
        <button
          key={instrument.id}
          type="button"
          onClick={() => onPress(instrument)}
          className="min-h-14 px-3 py-2 rounded-2xl bg-white ring-1 ring-[#e8dcc8] shadow-[0_1px_0_rgba(133,80,44,0.06)] hover:ring-[#7a2028]/30 flex items-center gap-2.5 text-left cursor-pointer active:scale-[0.98] transition"
        >
          <span className="w-9 h-9 shrink-0 rounded-full grid place-items-center bg-[#fcf1df] text-[#b4620e]">
            <Music className="w-4 h-4" />
          </span>
          <span className="flex-1 min-w-0 flex flex-col">
            <span className="text-[15px] font-bold leading-snug text-[#4a3426]">{instrument.nameGe}</span>
            <span className="text-[12px] font-semibold leading-snug text-[#8a7a6a] break-words">{line(instrument)}</span>
            {n > 0 && <span className="text-[12px] font-semibold text-[#b4620e]">{n} ჩანაწერი</span>}
            {selected[instrument.id] && <span className="text-[12px] font-semibold text-[#2f7a4f]">მონიშნულია ✓</span>}
          </span>
        </button>
      );
    })}
  </div>
);
