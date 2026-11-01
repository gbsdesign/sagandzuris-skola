import React from 'react';
import { Chip } from '../../../components/games/Chip';
import { songsAreRecordings } from '../../../data/tsqvilebiPool';
import { modes, sizes, whats } from './store';

// „ხმის წყვილები“'s choices: in the room's lobby (the host's), over a board alone and in the teams' setup — what sounds, what
// a pair is, how many cards.

const WHAT = [
  { id: 'chants', label: 'საგალობლები' },
  { id: 'songs', label: 'სიმღერები' },
  { id: 'both', label: 'ორივე' },
] as const;

export const TsqvilebiOptions: React.FC<{ noSize?: boolean }> = ({ noSize }) => {
  const what = whats.use();
  const mode = modes.use();
  const size = sizes.use();
  const recorded = songsAreRecordings();
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <p className="text-[13.5px] font-bold text-[#4a3426]">რა ჟღერს</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="რა ჟღერს">
          {WHAT.map(w => <Chip key={w.id} on={what === w.id} onClick={() => whats.set(w.id)}>{w.label}</Chip>)}
        </div>
        <p className="text-[12.5px] leading-snug text-[#9a8b7b]">
          {what === 'chants'
            ? 'ცნობილი საგალობლების დასაწყისი, სამივე ხმით, წიგნის ნოტებით.'
            : recorded
              ? 'ხალხური სიმღერების ჩანაწერები — ინტერნეტიდან იტვირთება, პირველად ცოტა ხანს შეიძლება დაყოვნდეს.'
              : 'სიმღერები მისაღები პროგრამიდან, ნოტებით.'}
        </p>
      </div>
      <div className="space-y-2">
        <p className="text-[13.5px] font-bold text-[#4a3426]">წყვილი</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="წყვილი">
          <Chip on={mode === 'name'} onClick={() => modes.set('name')}>ხმა და სახელი</Chip>
          <Chip on={mode === 'same'} onClick={() => modes.set('same')}>ორი ერთნაირი ხმა</Chip>
        </div>
        <p className="text-[12.5px] leading-snug text-[#9a8b7b]">
          {mode === 'name' ? 'ერთი ბარათი ჟღერს, მისი წყვილი მისი სახელია.' : 'უფრო ადვილად: ორი ბარათი ერთსა და იმავეს უკრავს — სახელი წყვილის პოვნისას გამოჩნდება.'}
        </p>
      </div>
      {!noSize && (
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426]">ბარათები</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="ბარათები">
            {[8, 12, 16].map(n => <Chip key={n} on={size === n} onClick={() => sizes.set(n)}>{n}</Chip>)}
          </div>
        </div>
      )}
    </div>
  );
};
