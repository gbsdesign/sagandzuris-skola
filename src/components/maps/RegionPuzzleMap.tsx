import React, { useState } from 'react';
import { FOLK_REGIONS, FolkRegion, FolkRegionId } from '../../data/songsData';
import { GEORGIA_MAP_SHAPES, GEORGIA_MAP_SIZE } from '../../data/georgiaMapShapes';

// Georgia as a wooden puzzle: every region is a button, with the same regions repeated
// below as roomy buttons for phones. Shared look with the songs map.
interface RegionPuzzleMapProps {
  onSelect: (region: FolkRegion) => void;
  count: (id: FolkRegionId) => number;
  countLabel: (n: number) => string; // "3 ავტორი"
  regionName?: (region: FolkRegion) => string; // e.g. Tbilisi instead of "ქალაქური"
}

const DARK_FILLS = new Set<FolkRegionId>(['mtianeti', 'kalakuri']);

export const RegionPuzzleMap: React.FC<RegionPuzzleMapProps> = ({ onSelect, count, countLabel, regionName = r => r.nameGe }) => {
  const [hovered, setHovered] = useState<FolkRegionId | null>(null);
  const { width, height } = GEORGIA_MAP_SIZE;

  return (
    <div className="w-full flex flex-col items-center gap-4 animate-in fade-in duration-200">
      <div className="w-full rounded-3xl bg-gradient-to-br from-[#f7ecd9] via-[#f3e3c6] to-[#ead6b3] border border-[#e2c9a0] shadow-inner p-2 sm:p-4">
        <svg
          viewBox={`-12 -12 ${width + 24} ${height + 24}`}
          className="w-full h-auto select-none"
          role="group"
          aria-label="საქართველოს რუკა — აირჩიეთ კუთხე"
        >
          <defs>
            <filter id="puzzle-piece-shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#6b4423" floodOpacity="0.35" />
            </filter>
          </defs>
          {FOLK_REGIONS.map(r => {
            const isHover = hovered === r.id;
            return (
              <path
                key={r.id}
                d={GEORGIA_MAP_SHAPES[r.id].d}
                fill={r.color}
                stroke="#fffaf0"
                strokeWidth={3}
                strokeLinejoin="round"
                filter="url(#puzzle-piece-shadow)"
                role="button"
                tabIndex={0}
                aria-label={regionName(r)}
                onClick={() => onSelect(r)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(r); } }}
                onPointerEnter={() => setHovered(r.id)}
                onPointerLeave={() => setHovered(null)}
                className="cursor-pointer outline-none transition-[transform,filter] duration-150 focus-visible:brightness-110"
                style={{
                  transform: isHover ? 'translateY(-4px)' : undefined,
                  filter: isHover ? 'url(#puzzle-piece-shadow) brightness(1.07)' : undefined,
                }}
              />
            );
          })}
          {/* Labels on top, so they never block taps */}
          {FOLK_REGIONS.map(r => {
            const [x, y] = GEORGIA_MAP_SHAPES[r.id].label;
            const name = regionName(r);
            if (r.id === 'kalakuri') {
              return (
                <g key={r.id} pointerEvents="none">
                  <circle cx={x} cy={y} r={9} fill="#fffaf0" stroke="#85502c" strokeWidth={3} />
                  <text x={x + 14} y={y - 20} textAnchor="middle" className="font-black" fontSize={22} fill="#5c3a1e" stroke="#fffaf0" strokeWidth={5} paintOrder="stroke">
                    {name}
                  </text>
                </g>
              );
            }
            // Double names ("მცხეთა-მთიანეთი") go on two lines
            const lines = name.includes('-') ? name.replace('-', '-\n').split('\n') : [name];
            const lift = hovered === r.id ? 4 : 0;
            return (
              <text
                key={r.id}
                textAnchor="middle"
                pointerEvents="none"
                fontSize={lines.length > 1 ? 18 : 21}
                className="font-black"
                fill={DARK_FILLS.has(r.id) ? '#fffaf0' : '#4a2f17'}
              >
                {lines.map((line, i) => (
                  <tspan key={i} x={x} y={y - lift + (i - (lines.length - 1) / 2) * 20} dominantBaseline="middle">
                    {line}
                  </tspan>
                ))}
              </text>
            );
          })}
        </svg>
      </div>

      <div className="w-full grid grid-cols-2 sm:grid-cols-3 gap-2">
        {FOLK_REGIONS.map(r => {
          const n = count(r.id);
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelect(r)}
              onPointerEnter={() => setHovered(r.id)}
              onPointerLeave={() => setHovered(null)}
              className={`min-h-11 px-3 py-2 rounded-xl border bg-white hover:bg-amber-50/60 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2.5 text-left ${
                hovered === r.id ? 'border-amber-400 shadow-sm' : 'border-slate-200/90'
              }`}
            >
              <span className="w-4 h-4 shrink-0 rounded-md border border-black/10" style={{ background: r.color }} />
              <span className="flex-1 min-w-0 flex flex-col">
                <span className="text-[13px] sm:text-sm font-bold text-slate-800 leading-tight break-words">{regionName(r)}</span>
                <span className={`text-[11px] font-semibold ${n ? 'text-amber-700' : 'text-slate-400'}`}>
                  {n ? countLabel(n) : 'ჯერ არ არის'}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
