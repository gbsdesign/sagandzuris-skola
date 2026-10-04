import React from 'react';

// Motifs redrawn from the Georgian wine plate (qvevri, jugs, grapes, vine leaves, sprigs, rosettes),
// each a standalone flat SVG in the plate's palette.
const RED = '#c4262e';
const NAVY = '#1f3f78';
const YELLOW = '#eab53a';
const SAGE = '#b3cbbd';
const PEACH = '#f3cfa6';
const CREAM = '#fbf6ec';

type Svg = { className?: string; style?: React.CSSProperties };
const Box: React.FC<Svg & { children: React.ReactNode }> = ({ className, style, children }) => (
  <svg viewBox="0 0 100 100" className={className} style={style} fill="none" aria-hidden>
    {children}
  </svg>
);

export const Qvevri: React.FC<Svg> = p => (
  <Box {...p}>
    <path d="M39 19C20 26 9 42 10 60c1 20 19 34 40 34s39-14 40-34c1-18-10-34-29-41Z" fill={RED} />
    <path d="M38 14h24v8H38Z" fill={RED} />
    <path d="M37 21.5c8 2.5 18 2.5 26 0" stroke={CREAM} strokeWidth={1.4} strokeLinecap="round" />
    <ellipse cx={50} cy={12} rx={16} ry={5.5} fill={CREAM} stroke={RED} strokeWidth={4} />
  </Box>
);

export const SpiralJug: React.FC<Svg> = p => (
  <Box {...p}>
    <g transform="rotate(35 50 50)">
      <path d="M50 6c24 0 38 22 36 44-2 20-16 30-26 32v6H40v-6C30 80 16 70 14 50 12 28 26 6 50 6Z" fill={YELLOW} />
      <path d="M50 14c18 0 28 16 27 34-1 16-13 24-27 24S24 64 23 48c-1-18 9-34 27-34Z" stroke="#f6d57e" strokeWidth={2} />
      <path d="M50 44c3 0 4 3 2 5-3 3-9 1-9-4 0-7 9-10 14-5 6 6 2 17-7 17-10 0-15-10-12-18" stroke={CREAM} strokeWidth={3} strokeLinecap="round" />
      <ellipse cx={50} cy={90} rx={12} ry={4.5} fill={CREAM} stroke={YELLOW} strokeWidth={3} />
    </g>
  </Box>
);

export const PeachPot: React.FC<Svg> = p => (
  <Box {...p}>
    <path d="M30 34C14 38 10 62 26 74" stroke={SAGE} strokeWidth={3} strokeLinecap="round" />
    <ellipse cx={50} cy={58} rx={32} ry={34} transform="rotate(-20 50 58)" fill={PEACH} />
    <ellipse cx={74} cy={20} rx={8} ry={12} transform="rotate(40 74 20)" fill={CREAM} stroke={YELLOW} strokeWidth={3.5} />
  </Box>
);

// irregular cluster, wide at the stem and narrowing down like the plate's bunches
const BUNCH: [number, number, number][] = [
  [30, 30, 8], [47, 27, 9.5], [64, 30, 8],
  [21, 46, 6.5], [37, 44, 9], [56, 44, 9.5], [72, 47, 7],
  [29, 60, 8], [46, 60, 9], [63, 61, 8],
  [37, 75, 8], [54, 75, 7.5], [46, 88, 6.5],
];
export const GrapeBunch: React.FC<Svg & { color: string; curls?: boolean; leaf?: boolean }> = ({ color, curls, leaf, ...p }) => (
  <Box {...p}>
    <path d="M47 18c0-8 5-12 11-12 6 0 8 6 4 8-3 1-4-2-2-3" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    {curls && (
      <path d="M14 34c-6 0-8-6-4-8 3-1 4 2 2 3M82 34c6 0 8-6 4-8-3-1-4 2-2 3" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    )}
    {BUNCH.map(([cx, cy, r]) => (
      <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={color} stroke={CREAM} strokeWidth={1.2} />
    ))}
    {leaf && <path d="M70 80l6-6 2 6 7-3-3 7 6 3-8 3 1 6-6-4-4 5Z" fill={color} />}
  </Box>
);

const LEAF = 'M50 86L44 74 30 80 32 68 14 64 24 54 10 40 28 38 26 22 40 30 50 10 60 30 74 22 72 38 90 40 76 54 86 64 68 68 70 80 56 74Z';
export const VineLeaf: React.FC<Svg & { color: string }> = ({ color, ...p }) => (
  <Box {...p}>
    <path d={LEAF} fill={color} stroke={color} strokeWidth={3} strokeLinejoin="round" />
    <path d="M50 96V30M50 62 30 46M50 62 70 46" stroke={CREAM} strokeWidth={2} strokeLinecap="round" />
    <path d="M50 86v10" stroke={color} strokeWidth={3} strokeLinecap="round" />
  </Box>
);

// straight stem with paired oval leaves, like the plate's little fern sprigs
export const Sprig: React.FC<Svg & { color: string }> = ({ color, ...p }) => (
  <Box {...p}>
    <path d="M50 96V16" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    {[78, 60, 42].map(y => (
      <g key={y}>
        <ellipse cx={38} cy={y - 7} rx={12} ry={5} transform={`rotate(35 38 ${y - 7})`} fill={color} />
        <ellipse cx={62} cy={y - 7} rx={12} ry={5} transform={`rotate(-35 62 ${y - 7})`} fill={color} />
      </g>
    ))}
    <ellipse cx={50} cy={14} rx={5} ry={11} fill={color} />
  </Box>
);

export const Rosette: React.FC<Svg & { color?: string; petals?: number }> = ({ color = RED, petals = 8, ...p }) => (
  <Box {...p}>
    {Array.from({ length: petals }, (_, i) => {
      const a = (i / petals) * Math.PI * 2;
      return <circle key={i} cx={50 + Math.cos(a) * 26} cy={50 + Math.sin(a) * 26} r={14} fill={color} stroke={CREAM} strokeWidth={2.5} />;
    })}
    <circle cx={50} cy={50} r={17} fill={color} stroke={CREAM} strokeWidth={2.5} />
    <circle cx={50} cy={50} r={8} fill={CREAM} />
    <circle cx={50} cy={50} r={4} fill={color} />
  </Box>
);

export const BerrySprig: React.FC<Svg> = p => (
  <Box {...p}>
    <path d="M50 22C47 40 53 56 47 80" stroke={RED} strokeWidth={2.2} strokeLinecap="round" />
    <path d="M50 38 34 44M51 46 64 48M50 58 39 62M51 64 61 68M48 74 31 74M48 76 63 85" stroke={RED} strokeWidth={1.6} strokeLinecap="round" />
    {[[34, 46, 6.5], [65, 50, 7.5], [38, 64, 7.5], [62, 70, 6.5], [47, 86, 8.5], [29, 76, 5.5], [64, 87, 5.5]].map(([cx, cy, r]) => (
      <circle key={`${cx}`} cx={cx} cy={cy} r={r} fill={RED} />
    ))}
    <g transform="translate(36 -6) scale(0.32)">
      <path d={LEAF} fill={RED} stroke={RED} strokeWidth={6} strokeLinejoin="round" />
    </g>
    <circle cx={70} cy={14} r={2.5} fill={RED} /><circle cx={78} cy={20} r={1.6} fill={RED} />
  </Box>
);

// overlapping wine-glass rings seen from above
export const WineRings: React.FC<Svg> = p => (
  <Box {...p}>
    <circle cx={44} cy={44} r={28} stroke={RED} strokeWidth={2} />
    <circle cx={48} cy={48} r={27} stroke="#8e1d23" strokeWidth={1.2} />
    <circle cx={64} cy={66} r={20} stroke={YELLOW} strokeWidth={1.8} />
    <path d="M28 46c4-12 22-14 30-4-8 4-20 6-30 4Z" fill={RED} />
    <path d="M30 50c8 2 20 2 28-4-2 10-20 14-28 4Z" fill={YELLOW} />
    {[[62, 64], [67, 70], [72, 64], [64, 75]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r={1.4} fill={NAVY} />)}
  </Box>
);

const Drops: React.FC<Svg & { color: string }> = ({ color, ...p }) => (
  <Box {...p}>
    <circle cx={22} cy={50} r={11} fill={color} /><circle cx={50} cy={46} r={7} fill={color} /><circle cx={72} cy={52} r={4} fill={color} />
  </Box>
);

const Tendril: React.FC<Svg & { color: string }> = ({ color, ...p }) => (
  <Box {...p}>
    <path d="M10 80C30 76 44 60 46 42c1-12-8-18-15-12-5 4-2 12 4 10" stroke={color} strokeWidth={3} strokeLinecap="round" />
  </Box>
);

type Motion = 'sway' | 'swing' | 'spin' | 'bob';
type Place = { el: React.ReactNode; a: Motion; top: string; left?: string; right?: string; w: string; rot?: number };

// desktop: scattered down both side margins of the card, like the plate's ring of motifs
const SIDES: Place[] = [
  { el: <GrapeBunch color={RED} curls />, a: 'swing', top: '4%', left: '5%', w: '7.5rem', rot: -8 },
  { el: <Rosette />, a: 'spin', top: '6%', left: '24%', w: '2.25rem' },
  { el: <SpiralJug />, a: 'bob', top: '19%', left: '4%', w: '8rem' },
  { el: <Drops color={YELLOW} />, a: 'bob', top: '17%', left: '19%', w: '2.5rem' },
  { el: <Sprig color={NAVY} />, a: 'sway', top: '35%', left: '13%', w: '5rem', rot: -40 },
  { el: <VineLeaf color={RED} />, a: 'sway', top: '46%', left: '4%', w: '4rem', rot: -15 },
  { el: <WineRings />, a: 'spin', top: '55%', left: '13%', w: '6rem' },
  { el: <GrapeBunch color={SAGE} />, a: 'swing', top: '70%', left: '4%', w: '6.5rem', rot: 10 },
  { el: <Tendril color={SAGE} />, a: 'sway', top: '79%', left: '17%', w: '3.5rem' },
  { el: <Sprig color={YELLOW} />, a: 'sway', top: '88%', left: '8%', w: '3.75rem', rot: 50 },

  { el: <VineLeaf color={SAGE} />, a: 'sway', top: '4%', right: '22%', w: '3.5rem', rot: 15 },
  { el: <Qvevri />, a: 'bob', top: '7%', right: '4%', w: '9rem' },
  { el: <GrapeBunch color={NAVY} curls leaf />, a: 'swing', top: '26%', right: '15%', w: '6rem', rot: 6 },
  { el: <PeachPot />, a: 'bob', top: '36%', right: '3%', w: '7rem' },
  { el: <Rosette color={YELLOW} petals={10} />, a: 'spin', top: '51%', right: '20%', w: '2rem' },
  { el: <BerrySprig />, a: 'swing', top: '55%', right: '6%', w: '6.5rem', rot: -10 },
  { el: <GrapeBunch color={YELLOW} curls />, a: 'swing', top: '72%', right: '15%', w: '6rem', rot: -6 },
  { el: <VineLeaf color={NAVY} />, a: 'sway', top: '78%', right: '4%', w: '4rem', rot: 20 },
  { el: <Sprig color={SAGE} />, a: 'sway', top: '89%', right: '16%', w: '3.5rem', rot: -55 },
  { el: <Drops color={RED} />, a: 'bob', top: '91%', right: '5%', w: '2.5rem' },
];

export const PlateScatter: React.FC = () => (
  <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden>
    {SIDES.map((o, i) => (
      <div
        key={i}
        className="absolute orn-in"
        style={{ top: o.top, left: o.left, right: o.right, width: o.w, transform: o.rot ? `rotate(${o.rot}deg)` : undefined, animationDelay: `${0.15 + i * 0.07}s` }}
      >
        {/* negative delays put neighbours at different points of their loop, so nothing moves in unison */}
        {React.cloneElement(o.el as React.ReactElement<Svg>, {
          className: `block w-full h-auto orn-${o.a}`,
          style: { animationDelay: `-${(i * 1.3) % 6}s` },
        })}
      </div>
    ))}
  </div>
);

// phone/tablet: one row of motifs used as a divider
const BAND: { el: React.ReactElement<Svg>; a: Motion; cls: string }[] = [
  { el: <Sprig color={SAGE} />, a: 'sway', cls: 'w-[9%] -rotate-90' },
  { el: <VineLeaf color={RED} />, a: 'sway', cls: 'w-[10%] -rotate-12' },
  { el: <GrapeBunch color={NAVY} curls />, a: 'swing', cls: 'w-[13%]' },
  { el: <Rosette />, a: 'spin', cls: 'w-[8%]' },
  { el: <GrapeBunch color={YELLOW} curls />, a: 'swing', cls: 'w-[13%]' },
  { el: <VineLeaf color={SAGE} />, a: 'sway', cls: 'w-[10%] rotate-12' },
  { el: <Sprig color={SAGE} />, a: 'sway', cls: 'w-[9%] rotate-90' },
];

export const PlateBand: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center justify-center gap-[3%] w-full max-w-md ${className}`} aria-hidden>
    {BAND.map((b, i) => (
      <div key={i} className={`orn-in ${b.cls}`} style={{ animationDelay: `${0.2 + i * 0.1}s` }}>
        {React.cloneElement(b.el, { className: `block w-full h-auto orn-${b.a}`, style: { animationDelay: `-${i * 1.1}s` } })}
      </div>
    ))}
  </div>
);

// every other page: a light sprinkle of motifs fixed to the window edges, behind all content.
// Slots stay put; which motif sits where shifts with the page, so pages don't look identical.
const SPRINKLE_SLOTS: { top: string; left?: string; right?: string; rot: number; size: number }[] = [
  { top: '14%', left: '2%', rot: -10, size: 1 },
  { top: '38%', left: '4.5%', rot: 15, size: 0.7 },
  { top: '60%', left: '1.5%', rot: -20, size: 0.9 },
  { top: '84%', left: '4%', rot: 8, size: 0.75 },
  { top: '20%', right: '2.5%', rot: 12, size: 0.85 },
  { top: '44%', right: '1.5%', rot: -8, size: 1 },
  { top: '68%', right: '4.5%', rot: 20, size: 0.7 },
  { top: '88%', right: '2%', rot: -12, size: 0.9 },
];
const SPRINKLE_MOTIFS: { el: React.ReactElement<Svg>; a: Motion }[] = [
  { el: <GrapeBunch color={RED} curls />, a: 'swing' },
  { el: <VineLeaf color={SAGE} />, a: 'sway' },
  { el: <Rosette />, a: 'spin' },
  { el: <Sprig color={NAVY} />, a: 'sway' },
  { el: <Qvevri />, a: 'bob' },
  { el: <GrapeBunch color={YELLOW} curls />, a: 'swing' },
  { el: <VineLeaf color={RED} />, a: 'sway' },
  { el: <Sprig color={SAGE} />, a: 'sway' },
  { el: <GrapeBunch color={NAVY} curls leaf />, a: 'swing' },
  { el: <Rosette color={YELLOW} petals={10} />, a: 'spin' },
  { el: <SpiralJug />, a: 'bob' },
  { el: <BerrySprig />, a: 'swing' },
];

export const PageSprinkles: React.FC<{ seed: string }> = ({ seed }) => {
  const shift = [...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 997, 7);
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden opacity-45" aria-hidden>
      {SPRINKLE_SLOTS.map((s, i) => {
        const m = SPRINKLE_MOTIFS[(i * 5 + shift) % SPRINKLE_MOTIFS.length];
        return (
          <div
            key={`${seed}-${i}`}
            className="absolute orn-in"
            style={{ top: s.top, left: s.left, right: s.right, width: `calc(clamp(34px, 6vw, 88px) * ${s.size})`, transform: `rotate(${s.rot}deg)`, animationDelay: `${0.1 + i * 0.08}s` }}
          >
            {React.cloneElement(m.el, { className: `block w-full h-auto orn-${m.a}`, style: { animationDelay: `-${(i * 1.7) % 6}s` } })}
          </div>
        );
      })}
    </div>
  );
};
