import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, Lock } from 'lucide-react';
import { useAuth, useChants, useViewing } from '../../context';
import { useConfirmations } from '../../hooks/useConfirmations';
import { usePearlGifts } from '../../hooks/usePearlGifts';
import { filterValidVariants } from '../../utils/variantValidation';
import { CHEST_COUNT, CHEST_SIZE, chestsOf, pearlCounts } from '../../utils/pathPearls';
import { giftPartLabel, nextChest, partInChest } from '../../utils/pearlGifts';
import { triggerHaptic } from '../../utils/haptics';
import { fireworks } from '../../utils/samosiFireworks';
import { PearlIcon } from './PearlIcon';
import { GiftPartPic, NextGiftLine } from './PearlGift';

// The top of „ნასწავლი“ (2026-11-05, the user: „მაღლა სკივრები იყოს, 10 საგალობელზე იხსნებოდეს 1 სკივრი, სულ 3“; the same
// evening: „3 სკივრის გახსნაზე თითო ჩოხის ნაწილს იძლეოდეს … ჩოხის ზოლი სკივრებს ზემოთ … ქართული … კომპაქტური, მარა არა
// ძალიან“, answers „მხოლოდ სკივრები · ჩუქურთმა + ბორჯღალი“). One card: on top the outfit's next part and the chest it waits
// in (NextGiftLine), then three chests — Georgian კიდობნები with carved rosettes, a braid on the lid and a gold borjgali
// lock — that fill with the member's polished pearls (utils/pathPearls.ts), ten each, and open; every chest that opens gives
// „ჩემი სამოსი“ a part (utils/pearlGifts.ts), which then stands in it. A chest opened since this device last saw it shakes,
// throws its lid up, lets out light and pearls and lifts its part, once; a pearl just polished drops into its chest. Under
// them what the two kinds of pearl mean, with their counts.

const ROMAN = ['I', 'II', 'III'];

/** The pearls of the signed-in member's path (also a student's, inside their page): polished, shining, all. */
export const usePathPearls = () => {
  const { user } = useAuth();
  const { selectedChantVariants = {} } = useChants();
  const confirmed = useConfirmations(user?.uid);
  return useMemo(() => pearlCounts(filterValidVariants(selectedChantVariants), confirmed), [selectedChantVariants, confirmed]);
};

const fmt = (n: number) => Math.round(n * 100) / 100;

/** A braid (two waves crossing every 4 units) from x0 to x1 on line y — the lid's carved band. */
const braid = (x0: number, x1: number, y: number, a: number, flip: 1 | -1) => {
  let d = `M${x0} ${y} Q${x0 + 2} ${fmt(y - a * flip)} ${x0 + 4} ${y}`;
  for (let x = x0 + 8; x <= x1; x += 4) d += ` T${x} ${y}`;
  return d;
};

/** A carved rosette of six whirling petals. */
const Rosette: React.FC<{ cx: number; cy: number; r: number }> = ({ cx, cy, r }) => {
  const arms = Array.from({ length: 6 }, (_, k) => {
    const t = (k * Math.PI) / 3;
    const c = t + 0.75;
    return `M${cx} ${cy} Q${fmt(cx + r * 0.62 * Math.cos(c))} ${fmt(cy + r * 0.62 * Math.sin(c))} ${fmt(cx + r * 0.9 * Math.cos(t))} ${fmt(cy + r * 0.9 * Math.sin(t))}`;
  }).join(' ');
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#2a1306" fillOpacity="0.16" stroke="#3a1c09" strokeOpacity="0.6" strokeWidth="0.8" />
      <path d={arms} transform="translate(0.45 0.45)" stroke="#e8ac70" strokeOpacity="0.35" strokeWidth="0.9" fill="none" strokeLinecap="round" />
      <path d={arms} stroke="#3a1c09" strokeOpacity="0.7" strokeWidth="0.9" fill="none" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="0.9" fill="#3a1c09" fillOpacity="0.7" />
    </g>
  );
};

/** The borjgali: seven arms whirling round a centre. */
const Borjgali: React.FC<{ cx: number; cy: number; r: number }> = ({ cx, cy, r }) => {
  const arms = Array.from({ length: 7 }, (_, k) => {
    const t = (k * 2 * Math.PI) / 7;
    const p = (rr: number, dt: number) => `${fmt(cx + rr * Math.cos(t + dt))} ${fmt(cy + rr * Math.sin(t + dt))}`;
    return `M${p(r * 0.2, 0)} Q${p(r * 0.72, 0.3)} ${p(r * 0.92, 1.05)}`;
  }).join(' ');
  return (
    <g className="sg-borjgali">
      <path d={arms} stroke="#7a4a10" strokeWidth="1.05" fill="none" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={r * 0.2} fill="#7a4a10" />
    </g>
  );
};

/** A Georgian chest (კიდობანი): walnut with a carved braid on the lid, two carved rosettes and a gold borjgali lock; open,
 *  its lid thrown back, light and pearls heaped at the rim. `fresh` plays the opening once; `spin` turns the borjgali (the
 *  chest being filled), `near` gives it a little shake now and then, `nudge` makes it hop as a pearl drops in. */
export const TreasureChest: React.FC<{
  open: boolean; fresh?: boolean; dim?: boolean; spin?: boolean; near?: boolean; nudge?: boolean; size?: number;
}> = ({ open, fresh, dim, spin, near, nudge, size = 56 }) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const gold = `url(#gb${id})`;
  const bead = (x: number, y: number, r: number, k: number) => (
    <g key={k} className="sg-chest-bead" style={{ animationDelay: `${0.72 + k * 0.06}s` }}>
      <circle cx={x} cy={y} r={r} fill={`url(#pb${id})`} />
      <circle cx={x - r * 0.35} cy={y - r * 0.38} r={r * 0.32} fill="#fff" />
    </g>
  );
  const shutLid = (
    <g className="sg-chest-lidshut">
      <path d="M8 31 V23 Q8 11 21 11 H51 Q64 11 64 23 V31 Z" fill={`url(#wl${id})`} />
      <path d="M12 17 Q15.5 12.8 25 12.6" stroke="#fff" strokeOpacity="0.3" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {/* the carved band: a channel with a gold braid in it */}
      <rect x="11" y="17.6" width="50" height="7.4" rx="1.2" fill="#3a1c09" fillOpacity="0.22" />
      <path d={`${braid(12, 60, 21.3, 2.7, 1)} ${braid(12, 60, 21.3, 2.7, -1)}`} stroke={gold} strokeWidth="1.05" fill="none" />
      {Array.from({ length: 12 }, (_, k) => <circle key={k} cx={14 + k * 4} cy="21.3" r="0.55" fill="#f2cf72" />)}
      {/* the hasp coming down to the lock */}
      <rect x="33.8" y="27.5" width="4.4" height="8" rx="1.1" fill={gold} stroke="#8a5f18" strokeWidth="0.5" />
    </g>
  );
  const openLid = (
    <g className="sg-chest-lidopen">
      <path d="M9.5 31 L13.5 6.5 Q36 0.8 58.5 6.5 L62.5 31 Z" fill={`url(#wi${id})`} />
      <path d="M13.5 6.5 Q36 0.8 58.5 6.5" stroke={gold} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M9.5 31 L13.5 6.5 M62.5 31 L58.5 6.5" stroke={gold} strokeWidth="1.6" />
      <path d={`${braid(18, 54, 15, 2.2, 1)} ${braid(18, 54, 15, 2.2, -1)}`} stroke="#c8942e" strokeOpacity="0.55" strokeWidth="0.9" fill="none" />
    </g>
  );
  return (
    <svg
      viewBox="0 0 72 64"
      width={size}
      height={(size * 64) / 72}
      aria-hidden
      className={`sg-chest ${open ? 'open' : ''} ${fresh ? 'is-new' : ''} ${spin ? 'spin' : ''} ${near ? 'near' : ''} ${nudge ? 'nudge' : ''} ${dim ? 'grayscale-[0.75] opacity-50' : ''}`}
    >
      <defs>
        <linearGradient id={`wb${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9a5a2c" />
          <stop offset="1" stopColor="#5c3016" />
        </linearGradient>
        <linearGradient id={`wl${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b97a42" />
          <stop offset="1" stopColor="#7e4521" />
        </linearGradient>
        <linearGradient id={`wi${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3e1f0b" />
          <stop offset="1" stopColor="#6a3818" />
        </linearGradient>
        <linearGradient id={`gb${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c8942e" />
          <stop offset="0.45" stopColor="#f6d77c" />
          <stop offset="1" stopColor="#b88424" />
        </linearGradient>
        <radialGradient id={`gm${id}`} cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#fff2c2" />
          <stop offset="0.5" stopColor="#ecc45c" />
          <stop offset="1" stopColor="#a87818" />
        </radialGradient>
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

      <ellipse cx="36" cy="60.5" rx="28" ry="3.2" fill="#4a3426" opacity="0.16" />

      {open && (
        <>
          {/* the light coming out of it */}
          <ellipse className="sg-chest-glow" cx="36" cy="22" rx="38" ry="30" fill={`url(#gl${id})`} />
          <g className="sg-chest-ray" fill="#f2bf3f">
            {[[5, 12, 4.5], [67, 9, 3.6], [65, 29, 2.6], [8, 30, 2.2]].map(([x, y, r]) => (
              <path key={`${x}-${y}`} d={`M${x} ${y - r}Q${x + r * 0.16} ${y - r * 0.16} ${x + r} ${y}Q${x + r * 0.16} ${y + r * 0.16} ${x} ${y + r}Q${x - r * 0.16} ${y + r * 0.16} ${x - r} ${y}Q${x - r * 0.16} ${y - r * 0.16} ${x} ${y - r}Z`} />
            ))}
          </g>
          {openLid}
          {/* the pearls heaped at the rim */}
          <rect x="10" y="27.5" width="52" height="6" rx="1.5" fill="#2a1406" />
          {[
            [21, 30, 4.6], [30, 28, 5.2], [39.5, 28.6, 4.9], [49, 30.2, 4.4], [25.5, 32.2, 4], [34.8, 31.8, 4.4], [44, 32.4, 3.9],
          ].map(([x, y, r], k) => bead(x, y, r, k))}
          {/* sparks flying up as it opens */}
          {fresh && [[-14, -24], [-5, -30], [6, -28], [15, -22], [0, -34]].map(([dx, dy], k) => (
            <circle
              key={k}
              className="sg-chest-spark"
              cx="36" cy="26" r={k % 2 ? 1.1 : 1.5}
              fill={k % 2 ? '#fff6d8' : '#f6c94e'}
              style={{ '--dx': `${dx}px`, '--dy': `${dy}px`, animationDelay: `${0.62 + k * 0.05}s` } as React.CSSProperties}
            />
          ))}
        </>
      )}

      {/* the body: walnut, a carved frame with two rosettes, gold bands and the borjgali lock */}
      <rect x="10" y="55" width="7" height="4" rx="1" fill="#3e1f0b" />
      <rect x="55" y="55" width="7" height="4" rx="1" fill="#3e1f0b" />
      <rect x="8" y="31" width="56" height="25" rx="2.5" fill={`url(#wb${id})`} />
      <rect x="11" y="35" width="50" height="17.5" rx="1.5" fill="none" stroke="#3a1c09" strokeOpacity="0.5" strokeWidth="0.9" />
      <rect x="11.6" y="35.6" width="50" height="17.5" rx="1.5" fill="none" stroke="#e3a568" strokeOpacity="0.18" strokeWidth="0.7" />
      <Rosette cx={20.5} cy={43.8} r={5.4} />
      <Rosette cx={51.5} cy={43.8} r={5.4} />
      <rect x="7.5" y="29.6" width="57" height="3.2" rx="1" fill={gold} />
      <rect x="8" y="53.4" width="56" height="2.6" rx="1" fill={gold} />
      <circle cx="36" cy="43.8" r="6.9" fill={`url(#gm${id})`} stroke="#8a5f18" strokeWidth="0.7" />
      <circle cx="36" cy="43.8" r="5.7" fill="none" stroke="#8a5f18" strokeOpacity="0.45" strokeWidth="0.5" />
      <Borjgali cx={36} cy={43.8} r={5.2} />

      {/* shut: the lid; opening: the shut lid swings away as the open one rises */}
      {(!open || fresh) && shutLid}
    </svg>
  );
};

/** Ten little pearls in two rows of five: the chest's polished ones lustrous (warm once it is open), the rest empty rings;
 *  the ones from `dropFrom` on have just come and drop in. */
const ChestBeads: React.FC<{ have: number; open?: boolean; dropFrom?: number }> = ({ have, open, dropFrom = CHEST_SIZE }) => (
  <span className="grid grid-cols-5 gap-[3px]" aria-hidden>
    {Array.from({ length: CHEST_SIZE }, (_, i) => (
      <span
        key={i}
        className={`w-2 h-2 rounded-full ${i < have && i >= dropFrom ? 'sg-bead-in' : ''} ${i < have
          ? open
            ? 'bg-[radial-gradient(circle_at_35%_30%,#fffef7_0%,#fbe9c2_45%,#cf9f4c_100%)] shadow-[0_1px_1.5px_rgba(120,80,20,0.4)]'
            : 'bg-[radial-gradient(circle_at_35%_30%,#ffffff_0%,#f4ede8_45%,#bcaaa3_100%)] shadow-[0_1px_1.5px_rgba(74,52,38,0.35)]'
          : 'ring-1 ring-inset ring-[#dccdb6] bg-[#fbf7f0]'}`}
        style={i < have && i >= dropFrom ? { animationDelay: `${(i - dropFrom) * 0.08}s` } : undefined}
      />
    ))}
  </span>
);

const seenKey = (uid: string) => `sg-chests-seen:${uid}`;

export const LearnChests: React.FC<{ polished: number; shining: number }> = ({ polished, shining }) => {
  const { user } = useAuth();
  const uid = user?.uid;
  const viewing = useViewing();
  const g = usePearlGifts();
  const chests = chestsOf(polished);
  const opened = chests.filter(c => c.open).length;

  // the chests that opened since this device last showed them: they open before the eyes once (not on a teacher's look)
  const [fresh, setFresh] = useState<number[]>([]);
  useEffect(() => {
    if (!uid || viewing) return;
    let seen = 0;
    try { seen = Number(localStorage.getItem(seenKey(uid))) || 0; } catch { /* storage off */ }
    if (opened <= seen) return;
    try { localStorage.setItem(seenKey(uid), String(opened)); } catch { /* storage off */ }
    setFresh(Array.from({ length: opened - seen }, (_, i) => seen + i));
    triggerHaptic(40);
    // the fireworks go off as the lid flies up
    window.setTimeout(() => fireworks(opened === CHEST_COUNT), 650);
  }, [opened, uid, viewing]);
  useEffect(() => {
    if (!fresh.length) return;
    const t = window.setTimeout(() => setFresh([]), 3400);
    return () => window.clearTimeout(t);
  }, [fresh]);

  // a pearl just polished drops into its chest, which hops
  const last = useRef(polished);
  const [drop, setDrop] = useState<number | null>(null);
  useEffect(() => {
    const before = last.current;
    last.current = polished;
    // (a jump of more than a few is the path loading, not a tap)
    if (viewing || polished <= before || polished - before > 3) return;
    setDrop(before);
    const t = window.setTimeout(() => setDrop(null), 900);
    return () => window.clearTimeout(t);
  }, [polished, viewing]);

  return <ChestsView polished={polished} shining={shining} fresh={fresh} drop={drop} gifts={g} />;
};

type Gifts = Pick<ReturnType<typeof usePearlGifts>, 'ready' | 'chestParts' | 'left' | 'outfit' | 'look'>;

/** What LearnChests shows, from plain numbers: `fresh` = the chests opening now, `drop` = the polished count before the
 *  pearls that are dropping in now. */
export const ChestsView: React.FC<{ polished: number; shining: number; fresh: number[]; drop: number | null; gifts: Gifts }> = ({
  polished, shining, fresh, drop, gifts: g,
}) => {
  const chests = chestsOf(polished);
  const opened = chests.filter(c => c.open).length;
  const current = chests.find(c => !c.open)?.index ?? -1;
  // the way to the next part: the chest it waits in and how many more pearls open it
  const nc = g.ready ? nextChest(opened, g.chestParts.length) : null;
  const nextPart = nc != null ? partInChest(nc, g.chestParts, g.left) : null;

  return (
    <section aria-label="სკივრები" className="rounded-2xl bg-gradient-to-b from-[#fdf8ef] to-[#f6ead6] ring-1 ring-[#eadcc4] p-2 space-y-2">
      {nc != null && nextPart && (
        <NextGiftLine part={nextPart} chest={nc} left={Math.max(1, (nc + 1) * CHEST_SIZE - polished)} outfit={g.outfit} look={g.look} />
      )}

      <ol className="grid grid-cols-3 gap-1.5">
        {chests.map(c => {
          const isNew = fresh.includes(c.index);
          const isCurrent = c.index === current;
          const locked = !c.open && !isCurrent;
          const need = (c.index + 1) * CHEST_SIZE;
          const part = c.open && g.ready ? partInChest(c.index, g.chestParts, g.left) : null;
          // the beads that have just dropped into this chest
          const dropFrom = drop != null && drop < need && polished > c.index * CHEST_SIZE ? Math.max(0, drop - c.index * CHEST_SIZE) : CHEST_SIZE;
          return (
            <li
              key={c.index}
              aria-label={`${ROMAN[c.index]} სკივარი: ${c.open ? `გახსნილია${part ? ` — ${giftPartLabel(part)}` : ''}` : `${c.have} / ${CHEST_SIZE}`}`}
              className={`relative flex flex-col items-center gap-1 rounded-xl px-1 pt-1.5 pb-1.5 text-center transition ${
                c.open ? `bg-gradient-to-b from-[#fff8e4] to-[#fbe7b8] ring-1 ring-[#e7c56f] shadow-[0_8px_18px_-12px_rgba(176,128,36,0.9)] ${isNew ? 'sg-chest-card-new' : ''}`
                  : isCurrent ? 'bg-white ring-2 ring-[#7a2028] shadow-[0_6px_16px_-10px_rgba(122,32,40,0.6)]'
                  : 'bg-white/55 ring-1 ring-[#eadcc4]'}`}
            >
              <span className="relative">
                <TreasureChest
                  open={c.open}
                  fresh={isNew}
                  dim={locked}
                  spin={isCurrent}
                  near={isCurrent && CHEST_SIZE - c.have <= 2}
                  nudge={dropFrom < CHEST_SIZE && !c.open}
                  size={58}
                />
                {/* the part this chest gave, standing up out of it */}
                {part && (
                  <span className={`sg-chest-gift ${isNew ? 'is-new' : ''} absolute left-1/2 -top-1 -ml-[17px] w-[34px] h-[34px] flex items-center justify-center`}>
                    <GiftPartPic id={part} look={g.look} className="w-[34px] h-[34px]" />
                  </span>
                )}
              </span>
              <span className={`text-[12px] font-black leading-none ${locked ? 'text-[#a99a86]' : 'text-[#4a3426]'}`}>{ROMAN[c.index]} სკივარი</span>
              <ChestBeads have={c.have} open={c.open} dropFrom={dropFrom} />
              <span className={`max-w-full min-h-4 inline-flex items-center gap-1 text-[12px] font-bold leading-none tabular-nums ${
                c.open ? 'text-[#9a6a1c]' : isCurrent ? 'text-[#7a2028]' : 'text-[#a99a86]'}`}>
                {c.open ? (
                  <><Check className="w-3.5 h-3.5 shrink-0 stroke-[3]" /><span className="truncate">{isNew ? 'გაიხსნა!' : part ? giftPartLabel(part) : 'გახსნილია'}</span></>
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

      {/* what the two kinds of pearl mean, with how many there are */}
      <ul className="px-1 space-y-0.5">
        {(['polished', 'shining'] as const).map(s => (
          <li key={s} className="flex items-center gap-2 text-[12px] leading-snug text-[#5c4a3a]">
            <PearlIcon state={s} size={20} className="shrink-0" />
            <span className="flex-1 min-w-0">
              {s === 'polished'
                ? <><b className="font-bold text-[#4a3426]">მონიშნე ხმა</b> — მარგალიტი გაპრიალდება</>
                : <><b className="font-bold text-[#4a3426]">მასწავლებელი ჩათვლის</b> — იბრწყინებს</>}
            </span>
            <span className="shrink-0 min-w-6 h-5 px-1.5 rounded-full bg-white/80 ring-1 ring-[#eadcc4] text-[12px] font-bold tabular-nums text-[#7a5a26] flex items-center justify-center">
              {s === 'polished' ? polished : shining}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};
