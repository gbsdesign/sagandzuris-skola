import React, { useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { SPEEDS, SPEED_NAMES } from '../../../utils/gundi';
import { triggerHaptic } from '../../../utils/haptics';
import { Chip } from '../../../components/games/Chip';
import { GUNDI_SONGS, phraseSeconds, songOf, type LoadedSong } from './songs';

// „ჩემი გუნდი“'s choices, the same on the stage and with the class: the song (‹ › or the list), its phrase, the tempo.

const ROUND = 'w-11 h-11 shrink-0 rounded-full flex items-center justify-center bg-white ring-1 ring-[#e8dcc8] text-[#7a2028] transition active:scale-95 hover:ring-[#7a2028]/40 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7a2028]/50';

export const SongPicker: React.FC<{ value: number; onChange: (num: number) => void }> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const i = Math.max(0, GUNDI_SONGS.findIndex(s => s.num === value));
  const song = songOf(value);
  const step = (d: number) => { triggerHaptic(6); onChange(GUNDI_SONGS[(i + d + GUNDI_SONGS.length) % GUNDI_SONGS.length].num); };
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button type="button" className={ROUND} aria-label="წინა სიმღერა" onClick={() => step(-1)}><ChevronLeft className="w-5 h-5" /></button>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => { triggerHaptic(5); setOpen(o => !o); }}
          className="min-w-0 flex-1 min-h-14 rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3 py-1.5 flex items-center justify-center gap-1.5 cursor-pointer hover:ring-[#7a2028]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7a2028]/50"
        >
          <span className="min-w-0 text-center">
            <span className="block font-serif-ge text-[16.5px] font-bold leading-tight text-[#4a3426]">{song.title}</span>
            <span className="block text-[12px] font-bold leading-tight text-[#75685a]">{song.region} · {i + 1}/{GUNDI_SONGS.length}</span>
          </span>
          <ChevronDown className={`w-4 h-4 shrink-0 text-[#9a8b7b] transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        <button type="button" className={ROUND} aria-label="შემდეგი სიმღერა" onClick={() => step(1)}><ChevronRight className="w-5 h-5" /></button>
      </div>
      {open && (
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="სიმღერა">
          {GUNDI_SONGS.map(s => (
            <button
              key={s.num}
              type="button"
              aria-pressed={s.num === value}
              onClick={() => { triggerHaptic(5); onChange(s.num); setOpen(false); }}
              className={`min-h-12 rounded-xl px-3 py-1.5 text-left ring-1 transition cursor-pointer ${s.num === value ? 'bg-[#7a2028] ring-[#7a2028] text-[#fbf6ec]' : 'bg-white ring-[#e8dcc8] text-[#4a3426] hover:ring-[#7a2028]/40'}`}
            >
              <span className="block text-[13.5px] font-bold leading-tight">{s.title}</span>
              <span className={`block text-[12px] leading-tight ${s.num === value ? 'text-[#fbf6ec]/80' : 'text-[#75685a]'}`}>{s.region}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const PhrasePicker: React.FC<{ song: LoadedSong | null; value: number; speed: number; waiting?: number | null; onChange: (i: number) => void }> = ({ song, value, speed, waiting, onChange }) => {
  if (!song || song.loops.length < 2) {
    return song ? <p className="text-[13px] font-bold text-[#75685a]">ფრაზა · {Math.round(phraseSeconds(song, song.loops[0], speed))} წამი</p> : null;
  }
  return (
    <div className="space-y-1.5">
      <p className="text-[13px] font-bold text-[#75685a]">ფრაზა{waiting != null ? <span className="text-[#a67c2e]"> · ახალი შემდეგ წრეზე</span> : ''}</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="ფრაზა">
        {song.loops.map((l, k) => (
          <Chip key={k} on={k === value} onClick={() => onChange(k)}>
            {k + 1} · {Math.round(phraseSeconds(song, l, speed))} წმ{waiting === k ? ' …' : ''}
          </Chip>
        ))}
      </div>
    </div>
  );
};

export const TempoPicker: React.FC<{ value: number; onChange: (speed: number) => void }> = ({ value, onChange }) => (
  <div className="space-y-1.5">
    <p className="text-[13px] font-bold text-[#75685a]">ტემპი</p>
    <div className="flex flex-wrap gap-2" role="group" aria-label="ტემპი">
      {SPEEDS.map((s, k) => <Chip key={s} on={s === value} onClick={() => onChange(s)}>{SPEED_NAMES[k]}</Chip>)}
    </div>
  </div>
);
