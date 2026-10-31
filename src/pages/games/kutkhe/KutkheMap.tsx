import React from 'react';
import { Check } from 'lucide-react';
import { FOLK_REGIONS } from '../../../data/songsData';
import { GEORGIA_MAP_SHAPES, GEORGIA_MAP_SIZE } from '../../../data/georgiaMapShapes';
import { KUTKHE_REGIONS, isNear } from '../../../utils/kutkhe';
import { triggerHaptic } from '../../../utils/haptics';

// „საიდანაა სიმღერა?“'s map: the songs map's wooden puzzle (components/maps/RegionPuzzleMap.tsx). To answer, a region is
// tapped on the map or on its roomy chip below (the map's pieces are small on a phone); at the reveal the right region is
// green, its neighbours light green, my own pick ringed, and the host sees how many put the song where.

const { width, height } = GEORGIA_MAP_SIZE;
const regionOf = (i: number) => FOLK_REGIONS.find(r => r.id === KUTKHE_REGIONS[i])!;
export const regionName = (i: number) => regionOf(i)?.nameGe ?? '';

const RIGHT = '#2f7d4f';
const NEAR = '#a8d1b4';
const REST = '#e9dfcd';

type Props =
  | { mode: 'pick'; pick: number | null; onPick: (i: number) => void }
  | { mode: 'reveal'; right: number; mine?: number | null; counts?: number[] | null };

export const KutkheMap: React.FC<Props> = props => {
  const pick = props.mode === 'pick' ? props.pick : null;
  const tap = (i: number) => { if (props.mode !== 'pick') return; triggerHaptic(8); props.onPick(i); };
  const fill = (i: number) => {
    if (props.mode === 'pick') return regionOf(i).color;
    if (i === props.right) return RIGHT;
    return isNear(props.right, i) ? NEAR : REST;
  };
  const ringed = props.mode === 'pick' ? pick : props.mine ?? null;
  const tbilisi = GEORGIA_MAP_SHAPES.kalakuri.label;
  const order = KUTKHE_REGIONS.map((_, i) => i).sort((a, b) => (a === ringed ? 1 : b === ringed ? -1 : 0));

  return (
    <div className="rounded-3xl bg-gradient-to-br from-[#f7ecd9] via-[#f3e3c6] to-[#ead6b3] border border-[#e2c9a0] shadow-inner p-2">
      <svg viewBox={`-12 -12 ${width + 24} ${height + 24}`} className="w-full h-auto select-none" role="group" aria-label="საქართველოს რუკა">
        <defs>
          <filter id="kutkhe-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#6b4423" floodOpacity="0.3" />
          </filter>
        </defs>
        {order.map(i => {
          const id = KUTKHE_REGIONS[i];
          const ring = i === ringed;
          return (
            <path
              key={id}
              d={GEORGIA_MAP_SHAPES[id].d}
              fill={fill(i)}
              stroke={ring ? '#7a2028' : '#fffaf0'}
              strokeWidth={ring ? 8 : 3}
              strokeLinejoin="round"
              filter="url(#kutkhe-shadow)"
              {...(props.mode === 'pick' ? {
                role: 'button', tabIndex: 0, 'aria-label': regionName(i), 'aria-pressed': ring,
                onClick: () => tap(i),
                onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(i); } },
              } : { 'aria-label': regionName(i) })}
              className={props.mode === 'pick' ? 'cursor-pointer outline-none' : undefined}
              style={{ opacity: props.mode === 'pick' && pick !== null && !ring ? 0.6 : 1, transition: 'opacity 0.15s' }}
            />
          );
        })}
        <circle cx={tbilisi[0]} cy={tbilisi[1]} r={9} fill="#fffaf0" stroke="#85502c" strokeWidth={3} pointerEvents="none" />
        {props.mode === 'reveal' && (() => {
          const [x, y] = GEORGIA_MAP_SHAPES[KUTKHE_REGIONS[props.right]].label;
          return (
            <g pointerEvents="none">
              <circle cx={x} cy={y - 34} r={26} fill={RIGHT} stroke="#fffaf0" strokeWidth={5} />
              <path d={`M${x - 11},${y - 34} l7,8 l15,-17`} fill="none" stroke="#fffaf0" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
            </g>
          );
        })()}
        {props.mode === 'reveal' && props.counts && KUTKHE_REGIONS.map((id, i) => {
          const n = props.counts![i];
          if (!n) return null;
          const [x, y] = GEORGIA_MAP_SHAPES[id].label;
          const right = i === props.right;
          return (
            <g key={id} pointerEvents="none">
              <circle cx={x} cy={y + (right ? 18 : 0)} r={27} fill={right ? '#fffaf0' : '#4a3426'} stroke={right ? RIGHT : '#fffaf0'} strokeWidth={4} />
              <text x={x} y={y + (right ? 18 : 0) + 11} textAnchor="middle" fontSize={32} fontWeight={700} fill={right ? RIGHT : '#fffaf0'}>{n}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// the last chip of an odd row fills it
const lone = (i: number) => i === KUTKHE_REGIONS.length - 1 && KUTKHE_REGIONS.length % 2 === 1;

/** the regions as roomy chips (to answer), each with its map colour */
export const RegionChips: React.FC<{ pick: number | null; onPick: (i: number) => void }> = ({ pick, onPick }) => (
  <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="კუთხე">
    {KUTKHE_REGIONS.map((_, i) => {
      const on = i === pick;
      return (
        <button
          key={i}
          type="button"
          onClick={() => { triggerHaptic(8); onPick(i); }}
          aria-pressed={on}
          className={`flex items-center gap-2 min-h-11 rounded-2xl px-3 py-1.5 text-left text-[13.5px] font-bold leading-tight ring-1 transition cursor-pointer active:scale-[0.98] ${on ? 'bg-[#7a2028] text-[#fbf6ec] ring-[#7a2028]' : 'bg-white text-[#4a3426] ring-[#e8dcc8] hover:ring-[#7a2028]/40'} ${lone(i) ? 'col-span-2' : ''}`}
        >
          <span className="w-3.5 h-3.5 shrink-0 rounded-full ring-1 ring-black/10" style={{ background: regionOf(i).color }} aria-hidden="true" />
          <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{regionName(i)}</span>
          {on && <Check className="w-4 h-4 shrink-0" aria-hidden="true" />}
        </button>
      );
    })}
  </div>
);

/** the reveal's key: what the colours say */
export const MapKey: React.FC<{ mine?: boolean }> = ({ mine }) => (
  <p className="flex flex-wrap items-center gap-x-3.5 gap-y-1 px-1 text-[12px] font-bold text-[#75685a]">
    <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: RIGHT }} />სწორი კუთხე</span>
    <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: NEAR }} />მეზობელი</span>
    {mine && <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm ring-2 ring-[#7a2028]" />შენი პასუხი</span>}
  </p>
);
