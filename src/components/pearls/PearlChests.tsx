import React, { useState } from 'react';
import { Headphones, Mic, Sparkles } from 'lucide-react';
import { useAuth } from '../../context';
import { CHESTS, Chest, chestOf } from '../../data/pearls';
import { findVersion } from '../../data/chantLookup';
import { usePearls } from '../../hooks/usePearls';
import { PearlRecord, PearlShine, isGolden, pearlState } from '../../utils/pearls';
import { PearlIcon, VoiceDots } from './PearlIcon';
import { PearlSheet, chantName } from './PearlSheet';
import { NextGiftLine } from './PearlGift';
import { Bar } from '../ui/kit';
import { triggerHaptic } from '../../utils/haptics';
import { usePearlWish } from '../../utils/pearlWish';

// „მარგალიტები“, a round button of „საგანძურის გზა“ (PathOrbs; it was the „თამაშები“ page until 2026-10-27).
// Each chest holds chants; each chant is a pearl to polish by singing its first phrase, and a teacher makes it shine.
// The chests are three cards on top (one open at a time, remembered on the device); under each pearl three dots say
// which voices are polished, and a pearl polished in all three is golden. A line under the steps shows the way to the
// next part of „ჩემი სამოსი“ (every five shining pearls give one, PearlGift); „დღის მარგალიტი“ on the home page opens a
// pearl here (utils/pearlWish).

const STEPS = [
  { icon: <Headphones />, text: 'მოისმინე ფრაზა' },
  { icon: <Mic />, text: 'იმღერე შენს ტონალობაში' },
  { icon: <Sparkles />, text: '80%-ზე გაპრიალდება' },
];

const CHEST_KEY = 'sg-pearl-chest';

type Records = { pearls: Record<string, PearlRecord>; shine: Record<string, PearlShine> };

const chestCounts = (chest: Chest, { pearls, shine }: Records) => {
  const states = chest.pearls.map(id => pearlState(pearls[id], shine[id]));
  return {
    states,
    polished: states.filter(s => s === 'polished' || s === 'shining').length,
    shining: states.filter(s => s === 'shining').length,
    golden: chest.pearls.filter(id => isGolden(pearls[id])).length,
  };
};

export const PearlChests: React.FC = () => {
  const { user, isSuperAdmin } = useAuth();
  const { pearls, shine, voice, loaded } = usePearls(user?.uid);
  const [open, setOpen] = useState<string | null>(null);
  // the chest chosen on this device; else the first one not fully polished
  const [picked, setPicked] = useState<string | null>(() => {
    try { return localStorage.getItem(CHEST_KEY); } catch { return null; }
  });
  const records = { pearls, shine };
  const firstUnfinished = CHESTS.find(c => chestCounts(c, records).polished < c.pearls.length) ?? CHESTS[0];
  const chest = CHESTS.find(c => c.id === picked) ?? firstUnfinished;
  const pick = (id: string) => {
    triggerHaptic(8);
    setPicked(id);
    try { localStorage.setItem(CHEST_KEY, id); } catch { /* storage off */ }
  };
  const counts = chestCounts(chest, records);
  // a pearl asked for from elsewhere: its chest, and its sheet
  usePearlWish(id => {
    const c = chestOf(id);
    if (!c) return;
    setPicked(c.id);
    setOpen(id);
  });

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

      {/* the next part of the outfit the shining pearls will give */}
      {user && <NextGiftLine />}

      {/* the chests: a card each, the chosen one with a wine rim */}
      <div role="tablist" aria-label="სკივრები" className="grid grid-cols-3 gap-2">
        {CHESTS.map(c => {
          const n = chestCounts(c, records);
          const on = c.id === chest.id;
          const full = n.polished === c.pearls.length;
          return (
            <button key={c.id} type="button" role="tab" aria-selected={on} onClick={() => pick(c.id)}
              className={`flex flex-col items-center gap-1 rounded-2xl px-1.5 pt-2 pb-2.5 cursor-pointer transition ${
                on ? 'bg-white ring-2 ring-[#7a2028] shadow-[0_6px_16px_-10px_rgba(122,32,40,0.6)]' : 'bg-[#fbf6ec] ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40'}`}>
              <ChestIcon full={full} size={44} />
              <span className="text-[13px] font-bold leading-tight text-[#4a3426]">{c.label}</span>
              <span className="text-[12px] font-semibold tabular-nums text-[#8a7a6a]">{n.polished}/{c.pearls.length}</span>
              <span className="w-full px-1"><Bar value={n.polished} max={c.pearls.length} /></span>
            </button>
          );
        })}
      </div>

      <section key={chest.id} className="sg-in">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-serif-ge text-[17px] font-bold text-[#4a3426]">{chest.title}</h3>
            <p className="text-[13px] text-[#75685a]">{chest.sub}</p>
          </div>
          <p className="shrink-0 pt-0.5 text-[13px] font-bold tabular-nums text-[#7a2028]">{counts.polished}/{chest.pearls.length}</p>
        </div>
        <p className="mt-1.5 text-[12px] leading-snug text-[#8a7a6a]">
          გაპრიალებული {counts.polished}{counts.golden ? ` · ოქროსფერი ${counts.golden}` : ''}{counts.shining ? ` · ბრწყინავს ${counts.shining}` : ''}
          {' · '}წერტილები — I, II და III ხმა
        </p>

        <div className={`mt-4 grid grid-cols-4 sm:grid-cols-5 gap-x-2 gap-y-4 transition-opacity ${loaded ? '' : 'opacity-50'}`}>
          {chest.pearls.map((id, i) => {
            const info = findVersion(id);
            if (!info) return null;
            const golden = isGolden(pearls[id]);
            return (
              <button key={id} type="button" onClick={() => { triggerHaptic(10); setOpen(id); }}
                className="group flex flex-col items-center text-center cursor-pointer rounded-2xl py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7a2028]/40">
                <PearlIcon state={counts.states[i]} golden={golden} size={56} className="transition-transform group-hover:scale-105 group-active:scale-95" />
                <VoiceDots rec={pearls[id]} golden={golden} />
                <span className="mt-1 text-[12px] font-bold tabular-nums text-[#7a2028]">№{info.variant.bookNums?.[0]}</span>
                <span className="mt-0.5 text-[12px] leading-snug text-[#4a3426] line-clamp-2 hyphens-auto break-words">{chantName(info.chant.title)}</span>
              </button>
            );
          })}
        </div>
      </section>

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

/** A small treasure chest: wood with gold bands and a lock; glowing once all its pearls are polished. */
export const ChestIcon: React.FC<{ full?: boolean; size?: number }> = ({ full, size = 44 }) => {
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg viewBox="0 0 64 56" width={size} height={(size * 56) / 64} aria-hidden>
      <defs>
        <linearGradient id={`l${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a8683a" />
          <stop offset="1" stopColor="#7a4321" />
        </linearGradient>
        <linearGradient id={`b${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8c4f27" />
          <stop offset="1" stopColor="#5e3117" />
        </linearGradient>
        <radialGradient id={`g${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0.4" stopColor="#f3d27a" stopOpacity="0.8" />
          <stop offset="1" stopColor="#f3d27a" stopOpacity="0" />
        </radialGradient>
      </defs>
      {full && <ellipse cx="32" cy="28" rx="32" ry="27" fill={`url(#g${id})`} />}
      <ellipse cx="32" cy="51" rx="24" ry="3" fill="#4a3426" opacity="0.15" />
      <path d="M9 25 V19 Q9 9 19 9 H45 Q55 9 55 19 V25 Z" fill={`url(#l${id})`} />
      <rect x="9" y="25" width="46" height="23" rx="3" fill={`url(#b${id})`} />
      <rect x="9" y="23.5" width="46" height="3" fill="#d9a93f" />
      <rect x="17" y="9.6" width="4" height="38.4" fill="#d9a93f" />
      <rect x="43" y="9.6" width="4" height="38.4" fill="#d9a93f" />
      <rect x="27.5" y="24" width="9" height="11" rx="2" fill="#e6b84a" stroke="#9a6a1c" strokeWidth="0.8" />
      <circle cx="32" cy="28.6" r="1.6" fill="#4a3426" />
      <rect x="31.3" y="29" width="1.4" height="3.6" fill="#4a3426" />
      <path d="M13 13 Q20 10.5 30 10.5" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
};

export default PearlChests;
