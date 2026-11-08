import React, { useId } from 'react';
import type { PearlState } from '../../utils/pathPearls';
import type { ChestToken } from '../../utils/pathChests';
import { PearlIcon } from './PearlIcon';

// What each kind of learned thing is in „ნასწავლი“ (2026-11-08, the user: „მარგალიტები მხოლოდ გალობას ეხება … მტევანი იყოს
// … ჩვეულებრივი თეთრი ჯიშის ყურძნის … მინანქრის მედალიონი … გრაგნილი“): a chant is a pearl (PearlIcon), a song or an
// instrument a bunch of white grapes, a poem a scroll, a film watched an enamel medallion. Like the pearl each has three
// looks — `new` faded, `polished` plain, `shining` with a gold halo (a teacher confirmed it) — and `number` writes a count
// in its middle (a chest's rows). Drawn on a 64-unit square.

type Look = { state?: PearlState; size?: number; className?: string };

const fadeOf = (state: PearlState) => (state === 'new' ? 'grayscale-[0.7] opacity-55' : '');

/** The gold halo and two sparks behind a shining token. */
const Halo: React.FC<{ id: string }> = ({ id }) => (
  <>
    <defs>
      <radialGradient id={`h${id}`} cx="50%" cy="50%" r="50%">
        <stop offset="0.35" stopColor="#ffe9a3" stopOpacity="0.95" />
        <stop offset="1" stopColor="#f6c94e" stopOpacity="0" />
      </radialGradient>
    </defs>
    <circle cx="32" cy="32" r="31" fill={`url(#h${id})`} />
  </>
);

const Spark: React.FC<{ x: number; y: number; r: number }> = ({ x, y, r }) => (
  <path
    d={`M${x} ${y - r}Q${x + r * 0.16} ${y - r * 0.16} ${x + r} ${y}Q${x + r * 0.16} ${y + r * 0.16} ${x} ${y + r}Q${x - r * 0.16} ${y + r * 0.16} ${x - r} ${y}Q${x - r * 0.16} ${y - r * 0.16} ${x} ${y - r}Z`}
    fill="#f2c24e"
  />
);

// the bunch's berries, back rows first: four, three, two and one, with two at the sides
const BERRIES: [number, number][] = [
  [19, 21], [28.5, 19.5], [38, 20], [47, 22.5],
  [14.5, 29], [24, 28], [33.5, 28], [43, 29.5],
  [19.5, 36], [29, 36], [38.5, 37],
  [24.5, 43.5], [34, 44.5],
  [29.5, 51.5],
];

/** A bunch of white grapes (რქაწითელი's green-gold) under a vine leaf. */
export const GrapeIcon: React.FC<Look> = ({ state = 'polished', size = 34, className = '' }) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden className={`overflow-visible ${fadeOf(state)} ${className}`}>
      {state === 'shining' && <Halo id={id} />}
      <defs>
        <radialGradient id={`b${id}`} cx="36%" cy="30%" r="72%">
          <stop offset="0" stopColor="#fdfce6" />
          <stop offset="0.4" stopColor="#e6e9a6" />
          <stop offset="0.82" stopColor="#b2bd5a" />
          <stop offset="1" stopColor="#87953a" />
        </radialGradient>
        <linearGradient id={`l${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7cb252" />
          <stop offset="1" stopColor="#3f7a32" />
        </linearGradient>
      </defs>
      {/* the stalk and a vine leaf */}
      <path d="M31 17 Q31.5 10 35 5" stroke="#7a5532" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M35 9 Q36 3 43 2.5 Q46 5 50 3.5 Q53 8 57 9 Q55 13 57.5 17 Q51 18.5 47 16 Q43 17 38.5 14.5 Q35.5 13 35 9 Z" fill={`url(#l${id})`} />
      <path d="M36 10 Q44 9.5 54 9.5 M44 9.7 Q46 6 49 4.5 M47 9.7 Q50 13 54.5 15.5" stroke="#2f5f25" strokeOpacity="0.55" strokeWidth="0.8" fill="none" strokeLinecap="round" />
      <path d="M35 6 Q30 4 28.5 8 Q28 11 31 11" stroke="#6f9a3e" strokeWidth="1" fill="none" strokeLinecap="round" />
      {BERRIES.map(([x, y], k) => (
        <g key={k}>
          <circle cx={x} cy={y} r="5.6" fill={`url(#b${id})`} stroke="#6b7826" strokeOpacity="0.35" strokeWidth="0.7" />
          <ellipse cx={x - 1.7} cy={y - 2} rx="1.5" ry="1.1" fill="#fff" fillOpacity="0.85" />
        </g>
      ))}
      {state === 'shining' && (
        <>
          <Spark x={8} y={14} r={3.4} />
          <Spark x={56} y={40} r={2.6} />
        </>
      )}
    </svg>
  );
};

/** A parchment scroll with its two rolls and a wine seal. `bare` leaves its lines off (a number stands there). */
export const ScrollIcon: React.FC<Look & { bare?: boolean }> = ({ state = 'polished', size = 34, className = '', bare }) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const roll = (y: number) => (
    <g>
      <rect x="10" y={y} width="44" height="9" rx="4.5" fill={`url(#r${id})`} />
      <ellipse cx="10.8" cy={y + 4.5} rx="2.6" ry="4.5" fill="#8a5f2c" />
      <ellipse cx="53.2" cy={y + 4.5} rx="2.6" ry="4.5" fill="#8a5f2c" />
      <path d={`M14 ${y + 2.4} H50`} stroke="#fff" strokeOpacity="0.4" strokeWidth="1.2" strokeLinecap="round" />
    </g>
  );
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden className={`overflow-visible ${fadeOf(state)} ${className}`}>
      {state === 'shining' && <Halo id={id} />}
      <defs>
        <linearGradient id={`p${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fbf0d2" />
          <stop offset="1" stopColor="#e9d09a" />
        </linearGradient>
        <linearGradient id={`r${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e2c07f" />
          <stop offset="1" stopColor="#a87a3c" />
        </linearGradient>
      </defs>
      <path d="M14 12 H50 Q48 32 50 52 H14 Q16 32 14 12 Z" fill={`url(#p${id})`} stroke="#b88f4c" strokeOpacity="0.55" strokeWidth="0.8" />
      {!bare && (
        <g stroke="#a47a3e" strokeOpacity="0.6" strokeWidth="1.4" strokeLinecap="round">
          <path d="M20 21 H44" />
          <path d="M20 27 H41" />
          <path d="M20 33 H44" />
          <path d="M20 39 H36" />
        </g>
      )}
      {roll(7)}
      {roll(48)}
      {/* the seal, its ribbon hanging */}
      <path d="M44 55 L42 63 L45.5 61 L48 63.5 L47.5 55 Z" fill="#7a2028" />
      <circle cx="45.5" cy="54" r="4.6" fill="#8e2431" stroke="#5c1219" strokeWidth="0.7" />
      <circle cx="45.5" cy="54" r="2.2" fill="none" stroke="#e7a7ad" strokeOpacity="0.6" strokeWidth="0.7" />
      {state === 'shining' && (
        <>
          <Spark x={6} y={30} r={3.2} />
          <Spark x={58} y={22} r={2.6} />
        </>
      )}
    </svg>
  );
};

/** A Georgian cloisonné enamel medallion: a beaded gold rim, a deep blue field and an eight-petalled flower in gold wire
 *  with turquoise and red enamel. `bare` leaves the flower's heart large and white (a number stands there). */
export const MedallionIcon: React.FC<Look & { bare?: boolean }> = ({ state = 'polished', size = 34, className = '', bare }) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const cx = 32, cy = 34;
  const petals = Array.from({ length: 8 }, (_, k) => {
    const t = (k * Math.PI) / 4 - Math.PI / 2;
    const p = (r: number, dt: number) => `${(cx + r * Math.cos(t + dt)).toFixed(2)} ${(cy + r * Math.sin(t + dt)).toFixed(2)}`;
    return { d: `M${p(5.5, 0)} Q${p(13, -0.42)} ${p(17.5, 0)} Q${p(13, 0.42)} ${p(5.5, 0)} Z`, fill: k % 2 ? '#c8343a' : '#2bb3b0' };
  });
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden className={`overflow-visible ${fadeOf(state)} ${className}`}>
      {state === 'shining' && <Halo id={id} />}
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f8dc85" />
          <stop offset="0.5" stopColor="#d6a43c" />
          <stop offset="1" stopColor="#a8761e" />
        </linearGradient>
        <radialGradient id={`e${id}`} cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#3d7fc6" />
          <stop offset="1" stopColor="#173d72" />
        </radialGradient>
      </defs>
      {/* the loop it hangs by */}
      <circle cx="32" cy="5" r="3.3" fill="none" stroke={`url(#g${id})`} strokeWidth="2.2" />
      <circle cx={cx} cy={cy} r="26" fill={`url(#g${id})`} stroke="#8a5f18" strokeWidth="0.8" />
      {Array.from({ length: 28 }, (_, k) => {
        const t = (k * 2 * Math.PI) / 28;
        return <circle key={k} cx={cx + 23.6 * Math.cos(t)} cy={cy + 23.6 * Math.sin(t)} r="1.15" fill="#fff3c4" fillOpacity="0.9" />;
      })}
      <circle cx={cx} cy={cy} r="21" fill={`url(#e${id})`} stroke="#f2cf72" strokeWidth="1.2" />
      {petals.map((p, k) => (
        <path key={k} d={p.d} fill={p.fill} stroke="#f2cf72" strokeWidth="1" strokeLinejoin="round" opacity={bare ? 0.85 : 1} />
      ))}
      <circle cx={cx} cy={cy} r={bare ? 9 : 5} fill="#f8f3e8" stroke="#f2cf72" strokeWidth="1.2" />
      {!bare && <circle cx={cx} cy={cy} r="1.8" fill="#c8343a" />}
      <path d="M17 22 Q23 14 33 12.5" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" fill="none" strokeLinecap="round" />
      {state === 'shining' && (
        <>
          <Spark x={6} y={20} r={3.2} />
          <Spark x={58} y={50} r={2.6} />
        </>
      )}
    </svg>
  );
};

// where the number sits in each picture (share of the size) and how it reads
const NUMBER_AT: Record<ChestToken, { top: string; cls: string }> = {
  pearl: { top: '46%', cls: 'text-[#6b4a1a] [text-shadow:0_1px_0_rgba(255,255,255,0.9)]' },
  grape: { top: '54%', cls: 'text-[#3f4a10] bg-white/85 rounded-full ring-1 ring-[#c9cf7a]' },
  scroll: { top: '50%', cls: 'text-[#5a3a14]' },
  medallion: { top: '53%', cls: 'text-[#7a2028]' },
};

/** A token of any kind; `number` writes a count in its middle. */
export const TokenIcon: React.FC<Look & { kind: ChestToken; number?: number; label?: string }> = ({ kind, number, state = 'polished', size = 34, className = '', label }) => {
  const shown = number !== undefined;
  const pic =
    kind === 'pearl' ? <PearlIcon state={state} size={size} label={label} />
      : kind === 'grape' ? <GrapeIcon state={state} size={size} />
      : kind === 'scroll' ? <ScrollIcon state={state} size={size} bare={shown} />
      : <MedallionIcon state={state} size={size} bare={shown} />;
  if (!shown) return <span className={`inline-flex ${className}`} title={label}>{pic}</span>;
  const at = NUMBER_AT[kind];
  const fs = Math.max(12, Math.round(size * (kind === 'medallion' ? 0.2 : 0.23)));
  return (
    <span className={`relative inline-flex ${className}`}>
      {pic}
      <span
        className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-[1.6em] px-1 text-center font-black tabular-nums leading-[1.35] ${at.cls}`}
        style={{ top: at.top, fontSize: fs }}
      >
        {number}
      </span>
    </span>
  );
};
