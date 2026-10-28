import React, { useState } from 'react';
import { Headphones, Mic, Sparkles } from 'lucide-react';
import { useAuth } from '../../context';
import { CHESTS } from '../../data/pearls';
import { findVersion } from '../../data/chantLookup';
import { usePearls } from '../../hooks/usePearls';
import { pearlState } from '../../utils/pearls';
import { PearlIcon } from './PearlIcon';
import { PearlSheet, chantName } from './PearlSheet';
import { Bar } from '../ui/kit';
import { triggerHaptic } from '../../utils/haptics';

// „მარგალიტები“, a round button of „საგანძურის გზა“ (PathOrbs; it was the „თამაშები“ page until 2026-10-27).
// Each chest holds chants; each chant is a pearl to polish by singing its first phrase, and a teacher makes it shine.

const STEPS = [
  { icon: <Headphones />, text: 'მოისმინე ფრაზა' },
  { icon: <Mic />, text: 'იმღერე შენს ტონალობაში' },
  { icon: <Sparkles />, text: '80%-ზე გაპრიალდება' },
];

export const PearlChests: React.FC = () => {
  const { user, isSuperAdmin } = useAuth();
  const { pearls, shine, voice, loaded } = usePearls(user?.uid);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      {/* how to play, in three steps */}
      <ol className="grid grid-cols-3 gap-2">
        {STEPS.map((s, i) => (
          <li key={i} className="flex flex-col items-center gap-1.5 rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] px-1.5 py-2.5 text-center">
            <span className="w-8 h-8 rounded-full bg-white ring-1 ring-[#e8dcc8] text-[#7a2028] flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4">
              {s.icon}
            </span>
            <span className="text-[12px] font-semibold leading-snug text-[#4a3426]">{s.text}</span>
          </li>
        ))}
      </ol>

      {CHESTS.map(chest => {
        const states = chest.pearls.map(id => pearlState(pearls[id], shine[id]));
        const polished = states.filter(s => s === 'polished' || s === 'shining').length;
        const shining = states.filter(s => s === 'shining').length;
        return (
          <section key={chest.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-serif-ge text-[17px] font-bold text-[#4a3426]">{chest.title}</h3>
                <p className="text-[13px] text-[#75685a]">{chest.sub}</p>
              </div>
              <p className="shrink-0 pt-0.5 text-[13px] font-bold tabular-nums text-[#7a2028]">{polished}/{chest.pearls.length}</p>
            </div>
            <div className="mt-2"><Bar value={polished} max={chest.pearls.length} /></div>
            <p className="mt-1.5 text-[12px] text-[#8a7a6a]">
              გაპრიალებული {polished}{shining ? ` · ბრწყინავს ${shining}` : ''}
            </p>

            <div className={`mt-4 grid grid-cols-4 sm:grid-cols-5 gap-x-2 gap-y-4 transition-opacity ${loaded ? '' : 'opacity-50'}`}>
              {chest.pearls.map((id, i) => {
                const info = findVersion(id);
                if (!info) return null;
                return (
                  <button key={id} type="button" onClick={() => { triggerHaptic(10); setOpen(id); }}
                    className="group flex flex-col items-center text-center cursor-pointer rounded-2xl py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7a2028]/40">
                    <PearlIcon state={states[i]} size={56} className="transition-transform group-hover:scale-105 group-active:scale-95" />
                    <span className="mt-0.5 text-[12px] font-bold tabular-nums text-[#7a2028]">№{info.variant.bookNums?.[0]}</span>
                    <span className="mt-0.5 text-[12px] leading-snug text-[#4a3426] line-clamp-2 hyphens-auto break-words">{chantName(info.chant.title)}</span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      {open && (
        <PearlSheet
          id={open}
          uid={user?.uid ?? null}
          rec={pearls[open]}
          shine={shine[open]}
          voice={pearls[open]?.voice || voice}
          unlimited={isSuperAdmin}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
};

export default PearlChests;
