import React, { useEffect, useId, useMemo, useState } from 'react';
import { Check, Lock } from 'lucide-react';
import { useAuth, useChants, useViewing } from '../../context';
import { useConfirmations } from '../../hooks/useConfirmations';
import { filterValidVariants } from '../../utils/variantValidation';
import { CHEST_COUNT, CHEST_SIZE, chestsOf, pearlCounts } from '../../utils/pathPearls';
import { triggerHaptic } from '../../utils/haptics';
import { fireworks } from '../../utils/samosiFireworks';
import { PearlIcon } from './PearlIcon';
import { NextGiftLine } from './PearlGift';

// The top of „ნასწავლი“ (2026-11-05, the user: „მაღლა სკივრები იყოს, 10 საგალობელზე იხსნებოდეს 1 სკივრი, სულ 3“): three
// chests that fill with the member's polished pearls (utils/pathPearls.ts) — ten each — and open; a chest that opened since
// this device last saw it jumps and glows with fireworks once. Under them what the two kinds of pearl mean, and the way to
// the outfit's next part (every five shining pearls, PearlGift).

const ROMAN = ['I', 'II', 'III'];

/** The pearls of the signed-in member's path (also a student's, inside their page): polished, shining, all. */
export const usePathPearls = () => {
  const { user } = useAuth();
  const { selectedChantVariants = {} } = useChants();
  const confirmed = useConfirmations(user?.uid);
  return useMemo(() => pearlCounts(filterValidVariants(selectedChantVariants), confirmed), [selectedChantVariants, confirmed]);
};

/** A treasure chest: shut with gold bands and a lock; open with its pearls heaped at the rim, a glow and rays behind. */
export const TreasureChest: React.FC<{ open: boolean; fresh?: boolean; dim?: boolean; size?: number }> = ({ open, fresh, dim, size = 60 }) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const band = `url(#gb${id})`;
  const bead = (x: number, y: number, r: number, k: number) => (
    <g key={k}>
      <circle cx={x} cy={y} r={r} fill={`url(#pb${id})`} />
      <circle cx={x - r * 0.35} cy={y - r * 0.38} r={r * 0.32} fill="#fff" />
    </g>
  );
  return (
    <svg
      viewBox="0 0 72 64"
      width={size}
      height={(size * 64) / 72}
      aria-hidden
      className={`sg-chest ${open ? 'open' : ''} ${fresh ? 'is-new' : ''} ${dim ? 'grayscale-[0.7] opacity-50' : ''} overflow-visible`}
    >
      <defs>
        <linearGradient id={`wb${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a05f30" />
          <stop offset="1" stopColor="#6a381a" />
        </linearGradient>
        <linearGradient id={`wl${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b8763f" />
          <stop offset="1" stopColor="#8a4d26" />
        </linearGradient>
        <linearGradient id={`wi${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a2610" />
          <stop offset="1" stopColor="#6e3b1a" />
        </linearGradient>
        <linearGradient id={`gb${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c8942e" />
          <stop offset="0.45" stopColor="#f6d77c" />
          <stop offset="1" stopColor="#b88424" />
        </linearGradient>
        <radialGradient id={`pb${id}`} cx="38%" cy="32%" r="72%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#f3ece6" />
          <stop offset="1" stopColor="#c9b8ae" />
        </radialGradient>
        <radialGradient id={`gl${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0.25" stopColor="#ffe9a3" stopOpacity="0.95" />
          <stop offset="0.6" stopColor="#f6c94e" stopOpacity="0.4" />
          <stop offset="1" stopColor="#f6c94e" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="36" cy="60" rx="27" ry="3.4" fill="#4a3426" opacity="0.16" />

      {open ? (
        <>
          {/* the light coming out of it */}
          <ellipse className="sg-chest-glow" cx="36" cy="24" rx="38" ry="30" fill={`url(#gl${id})`} />
          <g className="sg-chest-ray" fill="#f2bf3f">
            {[[6, 12, 4.5], [66, 10, 3.6], [64, 30, 2.6]].map(([x, y, r]) => (
              <path key={x} d={`M${x} ${y - r}Q${x + r * 0.16} ${y - r * 0.16} ${x + r} ${y}Q${x + r * 0.16} ${y + r * 0.16} ${x} ${y + r}Q${x - r * 0.16} ${y + r * 0.16} ${x - r} ${y}Q${x - r * 0.16} ${y - r * 0.16} ${x} ${y - r}Z`} />
            ))}
          </g>
          {/* the lid, thrown back: its inside and its gold edges */}
          <path d="M12 31 L16 8 Q36 2.5 56 8 L60 31 Z" fill={`url(#wi${id})`} />
          <path d="M16 8 Q36 2.5 56 8" stroke={band} strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d="M20 31 L23 7.2 M52 31 L49 7.2" stroke={band} strokeWidth="3.6" />
          {/* the pearls heaped at the rim */}
          <rect x="11" y="29" width="50" height="6" rx="1.5" fill="#2f1808" />
          {[
            [22, 31, 4.6], [30.5, 29, 5.2], [39.5, 29.8, 4.9], [48, 31.2, 4.3], [26.5, 33, 4], [35, 32.6, 4.4], [43.5, 33.2, 3.9],
          ].map(([x, y, r], k) => bead(x, y, r, k))}
        </>
      ) : (
        <>
          {/* the lid */}
          <path d="M10 32 V24 Q10 12 22 12 H50 Q62 12 62 24 V32 Z" fill={`url(#wl${id})`} />
          <path d="M11 22.5 Q12 14.5 22 14 H50 Q60 14.5 61 22.5" stroke="#5a2f14" strokeOpacity="0.35" strokeWidth="1" fill="none" />
          <path d="M14 18 Q20 13.2 32 13.2" stroke="#fff" strokeOpacity="0.32" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <rect x="18.5" y="12.4" width="4.6" height="20" fill={band} />
          <rect x="48.9" y="12.4" width="4.6" height="20" fill={band} />
        </>
      )}

      {/* the body: planks, bands, rivets and the lock */}
      <rect x="10" y={open ? 33 : 31} width="52" height={open ? 23.5 : 25.5} rx="3" fill={`url(#wb${id})`} />
      <path d={open ? 'M11 41.5 H61 M11 49 H61' : 'M11 40 H61 M11 48 H61'} stroke="#3e1f0b" strokeOpacity="0.35" strokeWidth="0.9" />
      <rect x="10" y={open ? 32 : 30} width="52" height="3.6" rx="1" fill={band} />
      <rect x="18.5" y={open ? 33 : 31} width="4.6" height={open ? 23.5 : 25.5} fill={band} />
      <rect x="48.9" y={open ? 33 : 31} width="4.6" height={open ? 23.5 : 25.5} fill={band} />
      {[20.8, 51.2].map(x => [open ? 44 : 43, open ? 52 : 51.5].map(y => <circle key={`${x}-${y}`} cx={x} cy={y} r="0.95" fill="#7a5212" />))}
      <rect x="30.4" y={open ? 33.5 : 28} width="11.2" height="12.5" rx="2.6" fill={band} stroke="#8a5f18" strokeWidth="0.8" />
      <circle cx="36" cy={open ? 38.4 : 32.9} r="1.7" fill="#3e2410" />
      <path d={open ? 'M35.3 39 H36.7 L37.1 42.4 H34.9 Z' : 'M35.3 33.5 H36.7 L37.1 36.9 H34.9 Z'} fill="#3e2410" />
    </svg>
  );
};

/** Ten little pearls in two rows of five: the chest's polished ones lustrous (warm once it is open), the rest empty rings. */
const ChestBeads: React.FC<{ have: number; open?: boolean }> = ({ have, open }) => (
  <span className="grid grid-cols-5 gap-[3px]" aria-hidden>
    {Array.from({ length: CHEST_SIZE }, (_, i) => (
      <span
        key={i}
        className={`w-[9px] h-[9px] rounded-full ${i < have
          ? open
            ? 'bg-[radial-gradient(circle_at_35%_30%,#fffef7_0%,#fbe9c2_45%,#cf9f4c_100%)] shadow-[0_1px_1.5px_rgba(120,80,20,0.4)]'
            : 'bg-[radial-gradient(circle_at_35%_30%,#ffffff_0%,#f4ede8_45%,#bcaaa3_100%)] shadow-[0_1px_1.5px_rgba(74,52,38,0.35)]'
          : 'ring-1 ring-inset ring-[#dccdb6] bg-[#fbf7f0]'}`}
      />
    ))}
  </span>
);

const seenKey = (uid: string) => `sg-chests-seen:${uid}`;

export const LearnChests: React.FC<{ polished: number; shining: number }> = ({ polished, shining }) => {
  const { user } = useAuth();
  const viewing = useViewing();
  const chests = chestsOf(polished);
  const opened = chests.filter(c => c.open).length;
  // the chests that opened since this device last showed them: they jump and glow once (not on a teacher's look)
  const [fresh, setFresh] = useState<number[]>([]);
  useEffect(() => {
    if (!user || viewing) return;
    let seen = 0;
    try { seen = Number(localStorage.getItem(seenKey(user.uid))) || 0; } catch { /* storage off */ }
    if (opened <= seen) return;
    try { localStorage.setItem(seenKey(user.uid), String(opened)); } catch { /* storage off */ }
    setFresh(Array.from({ length: opened - seen }, (_, i) => seen + i));
    triggerHaptic(40);
    fireworks(opened === CHEST_COUNT);
    const t = window.setTimeout(() => setFresh([]), 3200);
    return () => window.clearTimeout(t);
  }, [opened, user, viewing]);
  const current = chests.find(c => !c.open)?.index ?? -1;

  return (
    <div className="space-y-2.5">
      <section aria-label="სკივრები" className="rounded-2xl bg-gradient-to-b from-[#fdf8ef] to-[#f7eddc] ring-1 ring-[#eadcc4] px-2.5 pt-2.5 pb-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-1">
          <h4 className="text-[14px] font-black text-[#4a3426]">შენი სკივრები</h4>
          <p className="text-[12.5px] font-semibold tabular-nums text-[#8a7a6a]">
            {polished} გაპრიალებული{shining ? ` · ${shining} ბრწყინავს` : ''}
          </p>
        </div>
        <ol className="mt-2 grid grid-cols-3 gap-2">
          {chests.map(c => {
            const isNew = fresh.includes(c.index);
            const isCurrent = c.index === current;
            const locked = !c.open && !isCurrent;
            const need = (c.index + 1) * CHEST_SIZE;
            return (
              <li
                key={c.index}
                aria-label={`${ROMAN[c.index]} სკივრი: ${c.open ? 'გახსნილია' : `${c.have} / ${CHEST_SIZE}`}`}
                className={`relative flex flex-col items-center gap-1.5 rounded-2xl px-1 pt-2 pb-2 text-center transition ${
                  c.open ? 'bg-gradient-to-b from-[#fff8e4] to-[#fbeac0] ring-1 ring-[#e7c56f] shadow-[0_8px_18px_-12px_rgba(176,128,36,0.9)]'
                    : isCurrent ? 'bg-white ring-2 ring-[#7a2028] shadow-[0_6px_16px_-10px_rgba(122,32,40,0.6)]'
                    : 'bg-white/60 ring-1 ring-[#eadcc4]'}`}
              >
                <TreasureChest open={c.open} fresh={isNew} dim={locked} size={64} />
                <span className={`text-[12.5px] font-black leading-none ${locked ? 'text-[#a99a86]' : 'text-[#4a3426]'}`}>{ROMAN[c.index]} სკივრი</span>
                <ChestBeads have={c.have} open={c.open} />
                <span className={`min-h-4 inline-flex items-center gap-1 text-[12px] font-bold leading-none tabular-nums ${
                  c.open ? 'text-[#9a6a1c]' : isCurrent ? 'text-[#7a2028]' : 'text-[#a99a86]'}`}>
                  {c.open ? (
                    <><Check className="w-3.5 h-3.5 stroke-[3]" /> {isNew ? 'გაიხსნა!' : 'გახსნილია'}</>
                  ) : isCurrent ? (
                    `კიდევ ${CHEST_SIZE - c.have}`
                  ) : (
                    <><Lock className="w-3 h-3" /> {need}-ზე</>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
        {/* what the two kinds of pearl mean, said once */}
        <ul className="mt-2.5 px-1 space-y-1">
          {(['polished', 'shining'] as const).map(s => (
            <li key={s} className="flex items-center gap-2 text-[12.5px] leading-snug text-[#5c4a3a]">
              <PearlIcon state={s} size={22} className="shrink-0" />
              {s === 'polished'
                ? <span><b className="font-bold text-[#4a3426]">მონიშნე ხმა</b> — მარგალიტი გაპრიალდება</span>
                : <span><b className="font-bold text-[#4a3426]">მასწავლებელი ჩათვლის</b> — იბრწყინებს</span>}
            </li>
          ))}
        </ul>
      </section>
      {/* the outfit's next part: every five shining pearls give one */}
      {user && <NextGiftLine />}
    </div>
  );
};
