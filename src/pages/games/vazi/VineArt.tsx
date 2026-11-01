import React, { useId } from 'react';
import {
  BRANCHES, BUNCH_SLOTS, BUNCH_STALK, GRAPES, GROUND_Y, LEAF_PATH, LEAF_SLOTS, LEAF_STALK, LEAF_VEINS, POSTS, VINE_H, VINE_W, WIRE_Y,
  grownTo, leafPlaces, leafTransform, pathOf, tendril,
} from '../../../utils/vineShape';

// „ჩემი ვაზი“'s picture: the fixed vine of utils/vineShape.ts — its wood grown as far as `wood` leaves (its whole life) took
// it, `leaves` leaves on it now (the last weeks'), the season's bunches under the arms (ripe purple or golden, this month's
// still green), part of the leaves yellow when the vine was left alone. The leaves grown today come out with a small pop.

export type BunchLook = 'purple' | 'gold' | 'green';
const GRAPE: Record<BunchLook, { fill: string; edge: string }> = {
  purple: { fill: '#4b2b5f', edge: '#36204a' },
  gold: { fill: '#c9ad4b', edge: '#a88f34' },
  green: { fill: '#a6c46f', edge: '#86a556' },
};
const GREENS = ['#5e8f3b', '#6c9f45', '#4f7f34', '#77a94f'];
const YELLOWS = ['#cfae45', '#d79c3c', '#bf8f3a'];
// the same leaves turn yellow first, from the outside in (a fixed shuffle of their places)
const yellowRank = LEAF_SLOTS.map((_, i) => ((i * 7919) % 101) / 101);

export const VineArt: React.FC<{
  /** the leaves on the vine now */
  leaves: number;
  /** every leaf it ever had: the wood grows from them (as many as `leaves` when not given) */
  wood?: number;
  bunches?: BunchLook[];
  yellow?: number;
  fresh?: number;
  className?: string;
  label?: string;
  /** the owner's first name on a little board by the vine */
  name?: string;
  /** a qvevri by the vine once earlier seasons' bunches went into it */
  cellar?: number;
}> = ({ leaves, wood = leaves, bunches = [], yellow = 0, fresh = 0, className, label, name, cellar = 0 }) => {
  const uid = useId().replace(/:/g, '');
  const places = Math.max(0, Math.min(Math.max(wood, leaves), LEAF_SLOTS.length));
  const { drawn, fresh: newOnes } = leafPlaces(places, leaves, fresh);
  const shownBunches = bunches.slice(0, BUNCH_SLOTS.length);
  const grown = grownTo(places, shownBunches.length);
  const young = places === 0;
  const full = Math.min(1, Math.max(wood, leaves) / 60);
  const trunkW = 2.6 + 4.2 * full;
  return (
    <svg viewBox={`0 0 ${VINE_W} ${VINE_H}`} className={className} role="img" aria-label={label ?? `ვაზი: ${leaves} ფოთოლი, ${bunches.length} მტევანი`}>
      <defs>
        <linearGradient id={`${uid}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6eedd" />
          <stop offset="1" stopColor="#fdf9f1" />
        </linearGradient>
        <linearGradient id={`${uid}soil`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c7a679" />
          <stop offset="1" stopColor="#a9875c" />
        </linearGradient>
        <g id={`${uid}leaf`}>
          <path d={LEAF_STALK} stroke="#6b5a2c" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d={LEAF_PATH} fill="currentColor" stroke="rgba(40,55,20,.55)" strokeWidth="1.6" strokeLinejoin="round" />
          <path d={LEAF_VEINS} stroke="rgba(35,60,20,.42)" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        </g>
        {(Object.keys(GRAPE) as BunchLook[]).filter(look => shownBunches.includes(look)).map(look => (
          <g key={look} id={`${uid}b${look}`}>
            <path d={BUNCH_STALK} stroke="#6b5a2c" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            {GRAPES.map((g, k) => (
              <g key={k}>
                <circle cx={g.x} cy={g.y} r={g.r} fill={GRAPE[look].fill} stroke={GRAPE[look].edge} strokeWidth=".7" />
                <circle cx={g.x - g.r * 0.35} cy={g.y - g.r * 0.38} r={g.r * 0.32} fill="#fff" opacity=".32" />
              </g>
            ))}
          </g>
        ))}
      </defs>
      <style>{`
        .vz-pop{transform-box:fill-box;transform-origin:50% 100%;animation:vz-pop .7s cubic-bezier(.2,1.4,.4,1) both}
        @keyframes vz-pop{from{transform:scale(0)}to{transform:scale(1)}}
        @media (prefers-reduced-motion:reduce){.vz-pop{animation:none}}
      `}</style>

      <rect x="0" y="0" width={VINE_W} height={VINE_H} fill={`url(#${uid}sky)`} />
      <circle cx="336" cy="26" r="14" fill="#f1c24f" opacity={yellow > 0.3 ? 0.18 : 0.38} />
      {/* far hills */}
      <path d={`M0 ${GROUND_Y - 22}C60 ${GROUND_Y - 44} 120 ${GROUND_Y - 16} 190 ${GROUND_Y - 30}S310 ${GROUND_Y - 42} 360 ${GROUND_Y - 24}V${GROUND_Y}H0Z`} fill="#e3dcc0" opacity=".7" />
      <rect x="0" y={GROUND_Y} width={VINE_W} height={VINE_H - GROUND_Y} fill={`url(#${uid}soil)`} />
      {[30, 74, 128, 236, 292, 340].map(x => (
        <path key={x} d={`M${x} ${GROUND_Y + 1}l-3 -7M${x + 3} ${GROUND_Y + 1}l1 -9M${x + 6} ${GROUND_Y + 1}l4 -6`} stroke="#7f9c4f" strokeWidth="1.5" strokeLinecap="round" />
      ))}

      {/* the trellis: two posts and the wire, the stake the young vine climbs */}
      {POSTS.map(x => <rect key={x} x={x - 3.5} y={WIRE_Y - 8} width="7" height={GROUND_Y - WIRE_Y + 8} rx="1.5" fill="#a07c52" stroke="#7d5f3d" strokeWidth="1" />)}
      <line x1={POSTS[0]} y1={WIRE_Y} x2={POSTS[1]} y2={WIRE_Y} stroke="#8f8b84" strokeWidth="1" />
      <line x1={POSTS[0]} y1={WIRE_Y - 52} x2={POSTS[1]} y2={WIRE_Y - 52} stroke="#b3afa6" strokeWidth=".7" strokeDasharray="1 0" opacity=".7" />
      <line x1={POSTS[0]} y1={WIRE_Y - 8} x2={POSTS[0]} y2={WIRE_Y - 52} stroke="#a07c52" strokeWidth="3" />
      <line x1={POSTS[1]} y1={WIRE_Y - 8} x2={POSTS[1]} y2={WIRE_Y - 52} stroke="#a07c52" strokeWidth="3" />
      <line x1="188" y1={GROUND_Y + 2} x2="188" y2={WIRE_Y + 2} stroke="#c9ad83" strokeWidth="2.4" strokeLinecap="round" />

      {name && (
        <g>
          <line x1="72" y1="236" x2="72" y2={GROUND_Y + 2} stroke="#8a6a44" strokeWidth="2.4" strokeLinecap="round" />
          <rect x="40" y="216" width="64" height="21" rx="3" fill="#e2c697" stroke="#8a6a44" strokeWidth="1.2" />
          <text x="72" y="230.5" textAnchor="middle" fontSize={Math.min(11, 96 / Math.max(1, [...name].length))} fontWeight="700" fill="#4a3426">{name}</text>
        </g>
      )}
      {cellar > 0 && (
        <g transform="translate(298 0)" aria-hidden="true">
          <path d={`M-9 233C-20 237 -22 252 -21 ${GROUND_Y}H21C22 252 20 237 9 233Z`} fill="#b4683c" stroke="#8e4f2c" strokeWidth="1.2" />
          <path d="M-12 242C-6 244 6 244 12 242" stroke="#d08a5c" strokeWidth="1.4" fill="none" opacity=".7" />
          <ellipse cx="0" cy="232.4" rx="11.5" ry="3.2" fill="#cdbb9a" stroke="#9b8a6c" strokeWidth="1" />
        </g>
      )}

      {/* the wood */}
      {BRANCHES.filter(b => grown[b.id] !== undefined).map(b => {
        const d = pathOf(b.pts, grown[b.id]);
        if (b.kind === 'trunk') {
          return (
            <g key={b.id}>
              <path d={d} stroke="#4d3423" strokeWidth={trunkW + 1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d={d} stroke="#7a5638" strokeWidth={trunkW} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </g>
          );
        }
        return (
          <g key={b.id}>
            {b.kind === 'arm' && <path d={d} stroke="#4d3423" strokeWidth={2.6 + 2.4 * full + 1.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />}
            <path d={d} stroke={b.kind === 'arm' ? '#6f4d32' : '#8b7443'} strokeWidth={b.kind === 'arm' ? 2.6 + 2.4 * full : 1.7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            {b.kind === 'cane' && grown[b.id] >= b.pts.length - 1 && <path d={tendril(b.pts)} stroke="#8a9a4a" strokeWidth="1" fill="none" strokeLinecap="round" />}
          </g>
        );
      })}

      {/* a cutting's two first buds */}
      {young && [-38, 38].map(rot => (
        <g key={rot} transform={leafTransform({ x: 180.6, y: GROUND_Y - 22, rot, s: 0.15 })}>
          <use href={`#${uid}leaf`} color={GREENS[1]} />
        </g>
      ))}

      {drawn.map(i => {
        const yel = yellowRank[i] < yellow;
        const color = yel ? YELLOWS[i % YELLOWS.length] : GREENS[i % GREENS.length];
        const k = newOnes.indexOf(i);
        return (
          <g key={i} transform={leafTransform(LEAF_SLOTS[i])}>
            <g className={k >= 0 ? 'vz-pop' : undefined} style={k >= 0 ? { animationDelay: `${k * 0.12}s` } : undefined}>
              <use href={`#${uid}leaf`} color={color} />
            </g>
          </g>
        );
      })}

      {shownBunches.map((look, i) => {
        const b = BUNCH_SLOTS[i];
        return <use key={i} href={`#${uid}b${look}`} transform={`translate(${b.x} ${b.y}) scale(${b.s})`} />;
      })}
    </svg>
  );
};
