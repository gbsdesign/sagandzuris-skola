import React, { useState } from 'react';
import { useAuth } from '../context';
import { CHESTS } from '../data/pearls';
import { findVersion } from '../data/chantLookup';
import { usePearls } from '../hooks/usePearls';
import { pearlState } from '../utils/pearls';
import { PearlIcon } from '../components/pearls/PearlIcon';
import { PearlSheet, chantName } from '../components/pearls/PearlSheet';
import { Bar } from '../components/ui/kit';
import { triggerHaptic } from '../utils/haptics';

// „თამაშები“ (redesign stage 7): the pearls game. Each chest holds chants; each chant is a pearl to polish by
// singing its first phrase, and a teacher makes it shine.
export const GamesPage: React.FC = () => {
  const { user, isSuperAdmin } = useAuth();
  const { pearls, shine, voice, loaded } = usePearls(user?.uid);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="w-full max-w-2xl space-y-4">
      {CHESTS.map(chest => {
        const states = chest.pearls.map(id => pearlState(pearls[id], shine[id]));
        const polished = states.filter(s => s === 'polished' || s === 'shining').length;
        const shining = states.filter(s => s === 'shining').length;
        return (
          <section key={chest.id} className="rounded-3xl bg-white/80 ring-1 ring-[#e8dcc8] shadow-[0_1px_2px_rgba(74,52,38,0.05)] p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-serif-ge text-lg font-bold text-[#4a3426]">{chest.title}</h2>
                <p className="text-[13px] text-[#75685a]">{chest.sub}</p>
              </div>
              <p className="shrink-0 pt-1 text-[13px] font-bold tabular-nums text-[#7a2028]">{polished}/{chest.pearls.length}</p>
            </div>
            <div className="mt-2.5"><Bar value={polished} max={chest.pearls.length} /></div>
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
                    <PearlIcon state={states[i]} size={60} className="transition-transform group-hover:scale-105 group-active:scale-95" />
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

export default GamesPage;
