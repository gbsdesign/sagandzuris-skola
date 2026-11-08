import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { useAuth, useChants, useViewing } from '../../context';
import { useConfirmations } from '../../hooks/useConfirmations';
import { useWatchedVideos } from '../../hooks/useWatchedVideos';
import { useLongPress } from '../../hooks/useLongPress';
import { filterValidVariants } from '../../utils/variantValidation';
import { categoryOf } from '../../utils/pathItems';
import { pearlCounts, pearlOf } from '../../utils/pathPearls';
import { Chest, ChestItem, SCHOOL_ROWS, pathChests, topChests } from '../../utils/pathChests';
import { SERVICE_LISTS, findVersion } from '../../data/chantLookup';
import { triggerHaptic } from '../../utils/haptics';
import { fireworks } from '../../utils/samosiFireworks';
import { Sheet } from '../ui/kit';
import { PearlIcon } from './PearlIcon';
import { TokenIcon } from './Tokens';

// The top of „ნასწავლი“ (2026-11-08, the user: „სკივრებს საფეხურების მაგივრად ეწეროს … წირვა … დიდხანს დაჭერით იხსნებოდეს
// ანიმაციურად სკივრი ლამაზი ნათებით … ამოდიოდეს სკივრის თავზე 3 რიგად გელათი კახური გურული … მარგალიტი … შიგნით … ციფრი“;
// „ტოპ 3 სკივრი … დანარჩენები პატარა ისარზე … ფანჯარა“; the chests no longer give the outfit's parts — answer „1ბ“). A chest
// a service of the books (წირვა, მწუხრი…) and one each for the songs, the poems and the films watched (utils/pathChests.ts).
// The three fullest stand on top, every chest in the window the small arrow opens. A long press opens one before the eyes:
// its lid flies up in a gold light and its tokens rise over it — a chant chest's three schools, each one big pearl with its
// count, or one bunch of grapes, scroll or medallion with the whole count (ChestOpening). A plain tap only nudges it and says
// how. Georgian კიდობნები with carved rosettes, a braid on the lid and a gold borjgali lock (TreasureChest).

/** The pearls of the signed-in member's path (also a student's, inside their page): polished, shining, all. */
export const usePathPearls = () => {
  const { user } = useAuth();
  const { selectedChantVariants = {} } = useChants();
  const confirmed = useConfirmations(user?.uid);
  return useMemo(() => pearlCounts(filterValidVariants(selectedChantVariants), confirmed), [selectedChantVariants, confirmed]);
};

/** Which chest a path item's token goes into (its `id` in pathChests). */
export const chestIdOf = (id: string): string => {
  const kind = categoryOf(id);
  if (kind === 'mtkmeli') return 'poems';
  if (kind !== 'galoba') return 'songs';
  const v = findVersion(id);
  const service = v && v.service !== 'სიმღერა' ? v.service : null;
  return service && SERVICE_LISTS.some(([s]) => s === service) ? `s:${service}` : 'other';
};

/** Every chest of the member's path (also a student's, inside their page), its learned things counted. */
export const usePathChests = () => {
  const { user } = useAuth();
  const { selectedChantVariants = {} } = useChants();
  const confirmed = useConfirmations(user?.uid);
  const watched = useWatchedVideos();
  return useMemo(() => {
    const items: ChestItem[] = [];
    for (const [id, it] of Object.entries(filterValidVariants(selectedChantVariants))) {
      if (pearlOf(it as Parameters<typeof pearlOf>[0], confirmed[id]) === 'new') continue;
      const kind = categoryOf(id);
      if (kind !== 'galoba') { items.push({ kind }); continue; }
      const v = findVersion(id);
      items.push({ kind, service: v && v.service !== 'სიმღერა' ? v.service : null, school: v?.variant.code ?? (it as { code?: string }).code ?? null });
    }
    return pathChests(items, SERVICE_LISTS.map(([s]) => s), watched.count);
  }, [selectedChantVariants, confirmed, watched.count]);
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
// what lies heaped in an open chest: pearls, white grapes, or gold for the scrolls and medallions
const HEAP: Record<Chest['token'], [string, string, string]> = {
  pearl: ['#ffffff', '#f3ece6', '#c9b8ae'],
  grape: ['#fbfadf', '#dfe39a', '#9aa63d'],
  scroll: ['#fff2c2', '#ecc45c', '#a87818'],
  medallion: ['#fff2c2', '#ecc45c', '#a87818'],
};

export const TreasureChest: React.FC<{
  open: boolean; fresh?: boolean; dim?: boolean; spin?: boolean; near?: boolean; nudge?: boolean; size?: number; heap?: Chest['token'];
  /** a quick lid (the flying pearl, PearlFlight): 'opening' throws it up at once, 'closing' slams it shut */
  motion?: 'opening' | 'closing';
}> = ({ open, fresh, dim, spin, near, nudge, size = 56, heap = 'pearl', motion }) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [h0, h1, h2] = HEAP[heap];
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
      className={`sg-chest ${open ? 'open' : ''} ${fresh ? 'is-new' : ''} ${spin ? 'spin' : ''} ${near ? 'near' : ''} ${nudge ? 'nudge' : ''} ${motion ?? ''} ${dim ? 'grayscale-[0.75] opacity-50' : ''}`}
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
          <stop offset="0" stopColor={h0} />
          <stop offset="0.55" stopColor={h1} />
          <stop offset="1" stopColor={h2} />
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

const TOKEN_WORD: Record<Chest['token'], string> = { pearl: 'მარგალიტი', grape: 'მტევანი', scroll: 'გრაგნილი', medallion: 'მედალიონი' };

/** One chest in the row (or the window): its picture, its name under it and how many it holds. A long press opens it
 *  (onOpen), a short tap shakes it and says to hold it. */
export const ChestCard: React.FC<{ chest: Chest; nudge?: boolean; onOpen: (c: Chest) => void; onHint: () => void }> = ({ chest, nudge, onOpen, onHint }) => {
  const [shake, setShake] = useState(0);
  const press = useLongPress(() => onOpen(chest), () => { triggerHaptic(8); setShake(n => n + 1); onHint(); });
  const empty = chest.count === 0;
  return (
    <li>
      <button
        type="button"
        {...press}
        aria-label={`${chest.label}: ${chest.count} — დიდხანს დააჭირე გასახსნელად`}
        className={`w-full h-full flex flex-col items-center gap-1 rounded-xl px-1 pt-1.5 pb-2 text-center select-none [-webkit-touch-callout:none] cursor-pointer transition active:scale-[0.97] ${
          empty ? 'bg-white/55 ring-1 ring-[#eadcc4]' : 'bg-gradient-to-b from-[#fffaf0] to-[#fbedd0] ring-1 ring-[#e7c56f] shadow-[0_8px_18px_-12px_rgba(176,128,36,0.9)]'
        }`}
      >
        <span key={shake} data-chest-art={chest.id} className={shake ? 'sg-chest-shake' : ''}>
          <TreasureChest open={false} dim={empty} nudge={nudge} spin={!empty} size={58} />
        </span>
        <span className={`w-full min-h-[2.1em] flex items-center justify-center ${chest.label.length > 11 ? 'text-[11.5px]' : 'text-[12.5px]'} font-black leading-tight break-words ${empty ? 'text-[#a99a86]' : 'text-[#4a3426]'}`}>
          {chest.label}
        </span>
        <span className={`inline-flex items-center gap-1 text-[12.5px] font-bold tabular-nums leading-none ${empty ? 'text-[#b5a690]' : 'text-[#8a5a14]'}`}>
          <TokenIcon kind={chest.token} state={empty ? 'new' : 'polished'} size={18} />
          {chest.count}
        </span>
      </button>
    </li>
  );
};

/** A chest opened before the eyes, over the whole screen: a dim backdrop, the chest big in the middle throwing its lid up in
 *  a gold light, and over it its tokens rising — a chant chest's three schools, each with one big shining pearl and its
 *  count inside, or one big token with the whole count. A tap anywhere (or Esc) closes it. */
export const ChestOpening: React.FC<{ chest: Chest | null; onClose: () => void }> = ({ chest, onClose }) => {
  useEffect(() => {
    if (!chest) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    triggerHaptic(40);
    // the fireworks go off as the lid flies up
    const t = chest.count ? window.setTimeout(() => fireworks(false), 700) : undefined;
    return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = prev; window.clearTimeout(t); };
  }, [chest, onClose]);
  if (!chest) return null;
  const pearls = chest.token === 'pearl' && chest.schools;
  const others = pearls ? chest.count - SCHOOL_ROWS.reduce((n, r) => n + chest.schools![r.id], 0) : 0;
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${chest.label} — ${chest.count}`}
      onClick={onClose}
      className="sg-open-in fixed inset-0 z-[95] flex items-center justify-center px-3 bg-[#1c120b]/75 backdrop-blur-[3px] cursor-pointer select-none"
    >
      <div className="relative flex flex-col items-center">
        <span aria-hidden className="sg-open-glow absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] max-w-[110vw] rounded-full bg-[radial-gradient(circle,rgba(255,226,140,0.55)_0%,rgba(246,201,78,0.18)_45%,rgba(246,201,78,0)_70%)] pointer-events-none" />
        {/* what is in it, rising over it */}
        <div className="relative z-10 flex items-end justify-center gap-3 min-[400px]:gap-5 sm:gap-8 -mb-3">
          {pearls ? (
            SCHOOL_ROWS.map((r, i) => (
              <div key={r.id} className="sg-rise flex flex-col items-center gap-2" style={{ animationDelay: `${0.55 + i * 0.14}s` }}>
                <span className="px-2.5 h-7 rounded-full inline-flex items-center bg-[#fff6dc] ring-1 ring-[#e7c56f] text-[13px] min-[400px]:text-[14px] font-black text-[#6b4a1a] shadow-[0_4px_14px_-6px_rgba(246,201,78,0.9)]">
                  {r.label}
                </span>
                <TokenIcon kind="pearl" state={chest.schools![r.id] ? 'shining' : 'polished'} size={78} number={chest.schools![r.id]} label={`${r.label}: ${chest.schools![r.id]}`} />
              </div>
            ))
          ) : (
            <div className="sg-rise flex flex-col items-center" style={{ animationDelay: '0.6s' }}>
              <TokenIcon kind={chest.token} state={chest.count ? 'shining' : 'polished'} size={104} number={chest.count} label={`${TOKEN_WORD[chest.token]}: ${chest.count}`} />
            </div>
          )}
        </div>
        <TreasureChest open fresh size={176} heap={chest.token} />
        <p className="relative mt-2 font-serif-ge text-[22px] font-bold text-[#fff6dc] drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]">{chest.label}</p>
        <p className="relative mt-0.5 text-[14px] font-semibold text-[#f3e3bf]/90 tabular-nums">
          {chest.count ? `სულ ${chest.count}` : 'ჯერ ცარიელია'}
          {others > 0 && ` · ${others} სხვა სკოლის`}
        </p>
        <p className="relative mt-4 text-[12.5px] font-medium text-[#f3e3bf]/60">შეეხე, რომ დაიხუროს</p>
      </div>
    </div>,
    document.body
  );
};

/** The chests on top of „ნასწავლი“, with what the pearls' two looks mean (and how many there are). */
export const LearnChests: React.FC<{ polished: number; shining: number }> = ({ polished, shining }) => {
  const chests = usePathChests();
  const viewing = useViewing();
  const top = topChests(chests);
  const [opening, setOpening] = useState<Chest | null>(null);
  const [all, setAll] = useState(false);
  const [hint, setHint] = useState(false);

  // a chest that just got something hops (not while the path loads, nor on a teacher's look)
  const last = useRef<Record<string, number> | null>(null);
  const [nudged, setNudged] = useState<string | null>(null);
  useEffect(() => {
    const now = Object.fromEntries(chests.map(c => [c.id, c.count]));
    const before = last.current;
    last.current = now;
    if (!before || viewing) return;
    const grew = chests.find(c => c.count > (before[c.id] ?? 0) && c.count - (before[c.id] ?? 0) <= 3);
    if (!grew) return;
    setNudged(grew.id);
    const t = window.setTimeout(() => setNudged(null), 900);
    return () => window.clearTimeout(t);
  }, [chests, viewing]);
  useEffect(() => {
    if (!hint) return;
    const t = window.setTimeout(() => setHint(false), 2600);
    return () => window.clearTimeout(t);
  }, [hint]);

  const open = (c: Chest) => { setOpening(c); };
  const card = (c: Chest) => <ChestCard key={c.id} chest={c} nudge={nudged === c.id} onOpen={open} onHint={() => setHint(true)} />;

  return (
    <section aria-label="სკივრები" className="rounded-2xl bg-gradient-to-b from-[#fdf8ef] to-[#f6ead6] ring-1 ring-[#eadcc4] p-2 space-y-2">
      <ol className="grid grid-cols-3 gap-1.5">{top.map(card)}</ol>

      <div className="flex items-center gap-2 pl-1">
        <p className={`flex-1 min-w-0 text-[12px] font-semibold leading-snug transition-colors ${hint ? 'text-[#7a2028]' : 'text-[#9a8a76]'}`}>
          დიდხანს დააჭირე სკივარს — გაიხსნება
        </p>
        <button
          type="button"
          onClick={() => { triggerHaptic(8); setAll(true); }}
          aria-label={`ყველა სკივარი · ${chests.length}`}
          title="ყველა სკივარი"
          className="shrink-0 h-9 pl-3 pr-2 rounded-full inline-flex items-center gap-1 bg-white ring-1 ring-[#e3d3b8] text-[12.5px] font-bold text-[#7a2028] shadow-[0_2px_8px_-5px_rgba(74,52,38,0.35)] cursor-pointer transition active:scale-95 hover:bg-[#fffdf9]"
        >
          ყველა <span className="tabular-nums text-[#a4927c]">{chests.length}</span>
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* what the two looks mean, with how many there are */}
      <ul className="px-1 space-y-0.5">
        {(['polished', 'shining'] as const).map(s => (
          <li key={s} className="flex items-center gap-2 text-[12px] leading-snug text-[#5c4a3a]">
            <PearlIcon state={s} size={20} className="shrink-0" />
            <span className="flex-1 min-w-0">
              {s === 'polished'
                ? <><b className="font-bold text-[#4a3426]">მონიშნე</b> — გაპრიალდება</>
                : <><b className="font-bold text-[#4a3426]">მასწავლებელი ჩათვლის</b> — იბრწყინებს</>}
            </span>
            <span className="shrink-0 min-w-6 h-5 px-1.5 rounded-full bg-white/80 ring-1 ring-[#eadcc4] text-[12px] font-bold tabular-nums text-[#7a5a26] flex items-center justify-center">
              {s === 'polished' ? polished : shining}
            </span>
          </li>
        ))}
      </ul>

      <Sheet open={all} onClose={() => setAll(false)} title="ყველა სკივარი">
        <p className="mb-2.5 text-[12.5px] font-semibold text-[#8a7a6a]">დიდხანს დააჭირე სკივარს — გაიხსნება</p>
        <ol className="grid grid-cols-3 gap-1.5 pb-1">{chests.map(card)}</ol>
      </Sheet>
      <ChestOpening chest={opening} onClose={() => setOpening(null)} />
    </section>
  );
};
