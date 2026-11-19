import React from 'react';
import { LoaderCircle, Pause, Play } from 'lucide-react';
import { Press, cx, FOCUS } from '../../../components/ui2';
import { clock, useAlbumPlayer } from '../../../utils/useAlbumPlayer';

// One recording in a short list (a მელექსე's poems, an instrument's window) in the new look: the round ▶, the name, a grey
// line, and the time bar while it sounds (board x-meleqseebi). The list's one player (useAlbumPlayer) keeps one sounding.

export type AlbumPlayer = ReturnType<typeof useAlbumPlayer>;

export const TakeLine: React.FC<{ id: string; title: string; note?: string; player: AlbumPlayer }> = ({ id, title, note, player }) => {
  const on = player.cur === id;
  const phase = on ? player.phase : 'paused';
  return (
    <div className={cx('flex flex-col gap-1.5 py-2.5 pr-3 pl-4 transition-colors', on && 'bg-tint/60')}>
      <div className="flex min-w-0 items-center gap-3">
        <Press
          onClick={() => player.toggle(id, { title, artist: note })}
          aria-label={phase === 'playing' ? `პაუზა: ${title}` : `მოსმენა: ${title}`}
          className={cx(
            'flex size-tap shrink-0 cursor-pointer items-center justify-center rounded-full transition active:scale-95 [&_svg]:size-[18px]',
            on ? 'bg-wine text-white' : 'bg-tint text-wine',
            FOCUS,
          )}
        >
          {phase === 'loading' ? <LoaderCircle aria-hidden="true" className="animate-spin" />
            : phase === 'playing' ? <Pause aria-hidden="true" className="fill-current" />
            : <Play aria-hidden="true" className="translate-x-px fill-current" />}
        </Press>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-lead leading-snug font-bold wrap-break-word">{title}</span>
          {note && <span className="text-meta text-mut wrap-break-word">{note}</span>}
        </span>
      </div>
      {on && (
        <div className="flex items-center gap-2.5 pl-14 max-[359px]:pl-0">
          <span className="w-9 text-right text-cap font-semibold text-mut tabular-nums">{clock(player.time)}</span>
          <input
            type="range"
            min={0}
            max={player.dur || 0}
            step={0.5}
            value={Math.min(player.time, player.dur || 0)}
            onChange={e => player.seek(Number(e.target.value))}
            disabled={!player.dur}
            className="h-8 min-w-0 flex-1 cursor-pointer accent-wine disabled:opacity-40"
            aria-label="გადახვევა"
          />
          <span className="w-9 text-cap font-semibold text-mut tabular-nums">{player.dur ? clock(player.dur) : '–:––'}</span>
        </div>
      )}
    </div>
  );
};
