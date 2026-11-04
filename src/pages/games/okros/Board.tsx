import React from 'react';
import { Crown } from 'lucide-react';
import { GEORGIA_MAP_SHAPES, GEORGIA_MAP_SIZE } from '../../../data/georgiaMapShapes';
import { KUTKHE_REGIONS } from '../../../utils/kutkhe';
import { PLACES, REGION_GOOD, REGION_NAMES, TBILISI, WORKS, type OkrosGame } from '../../../utils/okrosKhana';
import { triggerHaptic } from '../../../utils/haptics';
import { GOLD, GOOD_LOOK, HOUSES, MARKET, WORK_ICON } from './look';

// „ოქროს ხანა“'s board: the songs map's thirteen regions (data/georgiaMapShapes.ts), each tinted by the good it gives, with its
// mark, its two estates' places, the riders there, the king's crown and the open work's castle. While a house chooses its ride,
// the regions it may reach stay bright and take a tap (the chips under the map do the same, roomier).

const { width, height } = GEORGIA_MAP_SIZE;
/** where a region's marks stand (the label point, moved where the region is narrow) */
const ANCHOR: readonly (readonly [number, number])[] = KUTKHE_REGIONS.map((id, r) => {
  const own: Record<number, readonly [number, number]> = { 0: [196, 116], 5: [312, 326], 6: [292, 410], 7: [476, 432], 9: [640, 466], 12: [722, 398] };
  return own[r] ?? GEORGIA_MAP_SHAPES[id].label;
});

const house = (x: number, y: number, fill: string, empty: boolean, key: string) => (
  <g key={key} transform={`translate(${x - 15} ${y - 15})`}>
    <path d="M1 14 L15 2 L29 14 V29 H1 Z" fill={empty ? '#fffaf0' : fill} fillOpacity={empty ? 0.7 : 1} stroke={empty ? '#8a7a68' : '#fffaf0'} strokeWidth={empty ? 2 : 2.5} strokeDasharray={empty ? '4 3' : undefined} strokeLinejoin="round" />
    {!empty && <rect x="12" y="19" width="6" height="10" fill="#fffaf0" />}
  </g>
);
const rider = (x: number, y: number, fill: string, key: string, ring: boolean) => (
  <g key={key} transform={`translate(${x} ${y})`}>
    {ring && <circle r={17} cy={2} fill="none" stroke={GOLD} strokeWidth={4} />}
    <circle cy={-6} r={6.5} fill={fill} stroke="#fffaf0" strokeWidth={2.2} />
    <path d="M-10 13 C-10 3 -5 0 0 0 C5 0 10 3 10 13 Z" fill={fill} stroke="#fffaf0" strokeWidth={2.2} strokeLinejoin="round" />
  </g>
);

export const OkrosBoard: React.FC<{
  g: OkrosGame;
  /** the regions a ride may end in (missing: nothing to choose now) */
  reach?: readonly number[];
  sel?: number | null;
  onPick?: (r: number) => void;
}> = ({ g, reach, sel = null, onPick }) => {
  const picking = !!reach && !!onPick;
  const tap = (r: number) => { if (!picking || !reach.includes(r)) return; triggerHaptic(8); onPick(r); };
  const order = KUTKHE_REGIONS.map((_, i) => i).sort((a, b) => (a === sel ? 1 : b === sel ? -1 : 0));
  const works = new Map(g.open.map(o => [WORKS[o.id].region, o]));
  const turn = g.phase.k !== 'end' ? g.turn : -1;
  return (
    <div className="rounded-3xl bg-gradient-to-br from-[#f7ecd9] via-[#f3e3c6] to-[#ead6b3] border border-[#e2c9a0] shadow-inner p-1.5">
      <svg viewBox={`-14 -14 ${width + 28} ${height + 28}`} className="w-full h-auto select-none" role="group" aria-label="საქართველოს რუკა">
        <defs>
          <filter id="okros-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#6b4423" floodOpacity="0.28" />
          </filter>
        </defs>
        {order.map(r => {
          const id = KUTKHE_REGIONS[r];
          const good = REGION_GOOD[r];
          const can = picking && reach.includes(r);
          const ring = r === sel;
          return (
            <path
              key={id}
              d={GEORGIA_MAP_SHAPES[id].d}
              fill={good < 0 ? MARKET.tint : GOOD_LOOK[good].tint}
              stroke={ring ? '#7a2028' : '#fffaf0'}
              strokeWidth={ring ? 8 : 3}
              strokeLinejoin="round"
              filter="url(#okros-shadow)"
              style={{ opacity: picking && !can ? 0.42 : 1, transition: 'opacity 0.15s' }}
              {...(can ? {
                role: 'button', tabIndex: 0, 'aria-label': REGION_NAMES[r], 'aria-pressed': ring,
                onClick: () => tap(r),
                onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(r); } },
              } : { 'aria-label': REGION_NAMES[r] })}
              className={can ? 'cursor-pointer outline-none' : undefined}
            />
          );
        })}
        {KUTKHE_REGIONS.map((id, r) => {
          const [x, y] = ANCHOR[r];
          const good = REGION_GOOD[r];
          const L = good < 0 ? MARKET : GOOD_LOOK[good];
          const here = g.players.map((p, i) => (p.at === r ? i : -1)).filter(i => i >= 0);
          const built = g.estates[r];
          const w = works.get(r);
          const dim = picking && !reach.includes(r) ? 0.55 : 1;
          return (
            <g key={id} pointerEvents="none" opacity={dim}>
              <circle cx={x} cy={y} r={24} fill={L.color} stroke="#fffaf0" strokeWidth={3.5} />
              <L.Icon x={x - 14} y={y - 14} width={28} height={28} color="#fff" strokeWidth={2.3} />
              {r !== TBILISI && Array.from({ length: PLACES }, (_, k) => {
                const who = built[k];
                return house(x + (k ? 46 : -46), y + 4, who !== undefined ? HOUSES[who].color : '#fff', who === undefined, `h${k}`);
              })}
              {w && (
                <g transform={`translate(${x - 30} ${y - 38})`}>
                  <circle r={17} fill={DEEP_BG} stroke={GOLD} strokeWidth={3} />
                  <WORK_ICON x={-10} y={-10} width={20} height={20} color={GOLD} strokeWidth={2.4} />
                </g>
              )}
              {g.king === r && (
                <g transform={`translate(${x + 30} ${y - 38})`}>
                  <circle r={17} fill={GOLD} stroke="#fffaf0" strokeWidth={3} />
                  <Crown x={-10} y={-11} width={20} height={20} color="#3a2415" strokeWidth={2.4} />
                </g>
              )}
              {here.map((i, j) => rider(x + (j - (here.length - 1) / 2) * 25, y + 42, HOUSES[i].color, `r${i}`, i === turn))}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
const DEEP_BG = '#3a2415';
