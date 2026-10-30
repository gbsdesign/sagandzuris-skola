import React from 'react';
import { LoaderCircle, Pause, Play } from 'lucide-react';
import { clock, useAlbumPlayer } from '../../utils/useAlbumPlayer';

// One recording in a short list (a მელექსე's poems, an instrument's window): the round ▶ of the album page, the title,
// a note, and the time bar while it sounds. The list's one player (useAlbumPlayer) keeps a single recording sounding.

type Player = ReturnType<typeof useAlbumPlayer>;

export const TakeRow: React.FC<{ id: string; title: string; note?: string; player: Player }> = ({ id, title, note, player }) => {
  const on = player.cur === id;
  const phase = on ? player.phase : 'paused';
  return (
    <li className={`px-3.5 py-3 flex flex-col gap-2 transition-colors ${on ? 'bg-[#fcf6ea]' : ''}`}>
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={() => player.toggle(id, { title, artist: note })}
          className={`shrink-0 w-[46px] h-[46px] rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#b4620e] ${
            on ? 'bg-[#dc8a22] text-white shadow-[0_6px_14px_-6px_rgba(180,98,14,0.75)]' : 'bg-[#dc8a22]/[0.1] text-[#b4620e] hover:bg-[#dc8a22]/[0.16]'
          }`}
          aria-label={phase === 'playing' ? `პაუზა: ${title}` : `მოსმენა: ${title}`}
        >
          {phase === 'loading' ? (
            <LoaderCircle className="w-5 h-5 animate-spin" />
          ) : phase === 'playing' ? (
            <Pause className="w-[18px] h-[18px] fill-current" />
          ) : (
            <Play className="w-[18px] h-[18px] fill-current translate-x-[1px]" />
          )}
        </button>
        <div className="min-w-0 flex-1 flex flex-col gap-0.5">
          <span className="text-[15.5px] font-bold leading-snug text-[#2a2017] break-words">{title}</span>
          {note && <span className="text-[12.5px] leading-snug text-[#8c7c6b] break-words">{note}</span>}
        </div>
      </div>
      {on && (
        <div className="flex items-center gap-2.5 pl-[58px] max-[359px]:pl-0">
          <span className="w-9 text-right text-[11.5px] font-semibold tabular-nums text-[#8c7c6b]">{clock(player.time)}</span>
          <input
            type="range"
            min={0}
            max={player.dur || 0}
            step={0.5}
            value={Math.min(player.time, player.dur || 0)}
            onChange={e => player.seek(Number(e.target.value))}
            disabled={!player.dur}
            className="flex-1 min-w-0 h-8 accent-[#dc8a22] cursor-pointer disabled:opacity-40"
            aria-label="გადახვევა"
          />
          <span className="w-9 text-[11.5px] font-semibold tabular-nums text-[#8c7c6b]">{player.dur ? clock(player.dur) : '–:––'}</span>
        </div>
      )}
    </li>
  );
};
