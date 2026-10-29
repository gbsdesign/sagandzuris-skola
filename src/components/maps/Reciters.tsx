import React, { useState } from 'react';
import { ChevronDown, Feather, Mic } from 'lucide-react';
import { CENTRE_RECITERS, CENTRE_RECITERS_ALBUM } from '../../data/centreOther';
import { albumRight, useAlbumAccess } from '../../data/albumAccess';
import { useAlbumPlayer } from '../../utils/useAlbumPlayer';
import { triggerHaptic } from '../../utils/haptics';
import { TakeRow } from './TakeRow';

// „მელექსეები“ in a region of the მთქმელი map: the voices of the disc „ლექსის თქმა მწადის ერთისა“ (data/centreOther.ts),
// one card of rows, each folding open to the poems that voice says, ▶ on every one. Only for whoever may hear that album
// (data/albumAccess.ts: staff, or a member an admin turned it on for) — for everyone else the block, and the map's count of
// them, is not there. The texts are not shown: the poets are of the 20th century.

type Reciter = (typeof CENTRE_RECITERS)[number];
/** the poems of no named poet: a row of its own, not counted as a მელექსე */
export const isFolkGroup = (r: Reciter) => r[0] === 'rc-folk';

/** the voices the signed-in person may hear (none without the album's 🎧) */
export const useReciters = (): Reciter[] => {
  useAlbumAccess(); // an admin's switch applies at once
  return albumRight(CENTRE_RECITERS_ALBUM).listen ? CENTRE_RECITERS : [];
};

const ReciterRow: React.FC<{ r: Reciter; open: boolean; onToggle: () => void; player: ReturnType<typeof useAlbumPlayer> }> = ({ r, open, onToggle, player }) => {
  const [, name, , area, poems] = r;
  const folk = isFolkGroup(r);
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`w-full min-h-[60px] pl-3 pr-2.5 py-2.5 flex items-center gap-3 text-left cursor-pointer select-none group transition-colors ${open ? 'bg-[#fcf6ea]' : 'hover:bg-[#fbf6ec]'}`}
      >
        <span className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-[16px] font-black ${folk ? 'bg-[#eef3e6] text-[#4d6b2f]' : 'bg-[#fcf1df] text-[#b4620e]'}`} aria-hidden>
          {folk ? <Feather className="w-[18px] h-[18px]" /> : name.charAt(0)}
        </span>
        <span className="flex-1 min-w-0 flex flex-col gap-0.5">
          <span className="font-bold text-[#2a2017] text-[16px] leading-snug group-hover:text-[#7a2028] transition-colors break-words">{name}</span>
          <span className="text-[12px] font-semibold text-[#8c7c6b]">{poems.length} ლექსი{area ? ` · ${area}` : ''}</span>
        </span>
        <span className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-all ${open ? 'rotate-180 bg-[#fcf1df] text-[#b4620e]' : 'bg-[#f1e9dc] text-[#8c7c6b] group-hover:text-[#7a2028]'}`}>
          <ChevronDown className="w-4 h-4" />
        </span>
      </button>
      {open && (
        <ul className="border-t border-[#efe5d4] bg-[#fffdf8] divide-y divide-[#efe5d4] animate-in fade-in duration-200">
          {poems.map(([id, title, note]) => <TakeRow key={id} id={id} title={title} note={note} player={player} />)}
        </ul>
      )}
    </li>
  );
};

export const Reciters: React.FC<{ list: Reciter[] }> = ({ list }) => {
  const player = useAlbumPlayer();
  const [open, setOpen] = useState<string | null>(null);
  if (list.length === 0) return null;
  return (
    <section className="flex flex-col gap-2.5 pt-2" aria-labelledby="reciters-title">
      <div className="px-1 flex items-start gap-3">
        <span className="w-9 h-9 shrink-0 rounded-xl bg-[#7a2028]/[0.08] text-[#7a2028] flex items-center justify-center">
          <Mic className="w-[18px] h-[18px]" />
        </span>
        <div className="min-w-0 flex flex-col gap-0.5">
          <h4 id="reciters-title" className="text-[17px] font-black leading-tight text-[#2a2017]">მელექსეები</h4>
          <p className="text-[12.5px] leading-snug text-[#8c7c6b]">ხალხური პოეტები თავიანთ ლექსებს ამბობენ · ალბომიდან „ლექსის თქმა მწადის ერთისა“</p>
        </div>
      </div>
      <ul className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] shadow-[0_1px_3px_rgba(74,52,38,0.06)] overflow-hidden divide-y divide-[#efe5d4]">
        {list.map(r => (
          <ReciterRow
            key={r[0]}
            r={r}
            open={open === r[0]}
            onToggle={() => { triggerHaptic(10); player.stop(); setOpen(o => (o === r[0] ? null : r[0])); }}
            player={player}
          />
        ))}
      </ul>
    </section>
  );
};
