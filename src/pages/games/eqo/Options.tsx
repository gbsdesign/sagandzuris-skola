import React from 'react';
import { Chip } from '../../../components/games/Chip';
import { lights } from './store';

// „ექო“'s level, in the room's lobby (the host's), in the circle's setup and over a run alone: the keys light up while the
// phrase sounds (Simon's way), or the ear alone.

export const EqoOptions: React.FC = () => {
  const on = lights.use();
  return (
    <div className="space-y-2">
      <p className="text-[13.5px] font-bold text-[#4a3426]">დონე</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="დონე">
        <Chip on={on} onClick={() => lights.set(true)}>ფერებით</Chip>
        <Chip on={!on} onClick={() => lights.set(false)}>მხოლოდ ყურით</Chip>
      </div>
      <p className="text-[12.5px] leading-snug text-[#9a8b7b]">
        {on ? 'კლავიში ნათდება, როცა მისი ნოტი ჟღერს — თვალიც გეხმარება.' : 'კლავიშები არ ნათდება: ნოტები მხოლოდ სმენით უნდა იპოვო.'}
      </p>
    </div>
  );
};
