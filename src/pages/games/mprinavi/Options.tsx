import React from 'react';
import { Chip } from '../../../components/games/Chip';
import { clefs, names } from './store';

// „მფრინავი ნოტები“'s choices, in the room's lobby (the host's), in the circle's setup and over a flight alone: the clef and
// how the notes are named.

const CLEFS = [
  { id: 'treble', label: 'სოლის გასაღები' },
  { id: 'bass', label: 'ფას გასაღები' },
  { id: 'both', label: 'ორივე' },
] as const;

export const MprinaviOptions: React.FC = () => {
  const clef = clefs.use();
  const kind = names.use();
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <p className="text-[13.5px] font-bold text-[#4a3426]">გასაღები</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="გასაღები">
          {CLEFS.map(c => <Chip key={c.id} on={clef === c.id} onClick={() => clefs.set(c.id)}>{c.label}</Chip>)}
        </div>
        <p className="text-[12.5px] leading-snug text-[#9a8b7b]">
          {clef === 'treble' ? 'ზედა ხმის ნოტები, ოქტავით მაღლა — როგორც საგალობლის წიგნებშია.' : clef === 'bass' ? 'ბანის ნოტები, როგორც ჟღერს.' : 'რიგრიგობით: ზედა ხმა სოლის გასაღებზე, ბანი — ფას გასაღებზე.'}
        </p>
      </div>
      <div className="space-y-2">
        <p className="text-[13.5px] font-bold text-[#4a3426]">ნოტების სახელები</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="ნოტების სახელები">
          <Chip on={kind === 'syl'} onClick={() => names.set('syl')}>დო რე მი</Chip>
          <Chip on={kind === 'abc'} onClick={() => names.set('abc')}>C D E</Chip>
        </div>
        {kind === 'abc' && <p className="text-[12.5px] leading-snug text-[#9a8b7b]">გერმანული ასოებით, როგორც თეორიის გამოცდაზე: H = სი, B = სი ბემოლი.</p>}
      </div>
    </div>
  );
};
