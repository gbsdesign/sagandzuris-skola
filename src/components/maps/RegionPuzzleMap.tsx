import React, { useState } from 'react';
import { FOLK_REGIONS, FolkRegion, FolkRegionId, MapRegionId } from '../../data/songsData';
import { GEORGIA_MAP_SHAPES, GEORGIA_MAP_SIZE } from '../../data/georgiaMapShapes';

// Georgia as a wooden puzzle, shared by the songs and მთქმელი maps. The map itself carries only colour and touch
// (names are too small to read on a phone); every region also has a roomy card with its name and count below.
interface RegionPuzzleMapProps {
  onSelect: (region: FolkRegion) => void;
  count: (id: FolkRegionId) => number;
  countLabel: (n: number) => string; // "3 ავტორი"
  regionName?: (region: FolkRegion) => string; // e.g. Tbilisi instead of "ქალაქური"
  title?: string; // written along the northern border
  extraRegions?: FolkRegion[]; // lands outside the map (ლაზეთი): cards after the map's regions
}

const { width, height } = GEORGIA_MAP_SIZE;

export const RegionPuzzleMap: React.FC<RegionPuzzleMapProps> = ({ onSelect, count, countLabel, regionName = r => r.nameGe, title, extraRegions = [] }) => {
  const [hovered, setHovered] = useState<FolkRegionId | null>(null);
  const lit = FOLK_REGIONS.find(r => r.id === hovered);
  const tbilisi = GEORGIA_MAP_SHAPES.kalakuri.label;

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
            {/* Follows the northern border, from Abkhazia down towards Mtianeti */}
            <path id="puzzle-title-path" d="M150,22 Q380,40 600,165" fill="none" />
          </defs>
          {title && (
            <text className="font-black" fontSize={30} letterSpacing={2} fill="#85502c" pointerEvents="none">
              <textPath href="#puzzle-title-path" startOffset="50%" textAnchor="middle">
                {title}
              </textPath>
            </text>
          )}
          {FOLK_REGIONS.map(r => {
            const isLit = hovered === r.id;
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
                onFocus={() => setHovered(r.id)}
                onBlur={() => setHovered(null)}
                className="cursor-pointer outline-none transition-[transform,filter,opacity] duration-150"
                style={{
                  transform: isLit ? 'translateY(-4px)' : undefined,
                  filter: isLit ? 'url(#puzzle-piece-shadow) brightness(1.08)' : undefined,
                  // the lit piece stands out: the others step back a little
                  opacity: hovered && !isLit ? 0.55 : 1,
                }}
              />
            );
          })}
          {/* Tbilisi is a small piece: a dot marks it (it never blocks taps) */}
          <circle cx={tbilisi[0]} cy={tbilisi[1]} r={9} fill="#fffaf0" stroke="#85502c" strokeWidth={3} pointerEvents="none" />
        </svg>
        {/* the lit region's name: a fixed-height line, so nothing jumps */}
        <p className="h-6 mt-1 flex items-center justify-center gap-2 text-[13px] font-bold text-[#6b4423]" aria-live="polite">
          {lit ? (
            <>
              <span className="w-3 h-3 rounded-[4px] border border-black/10" style={{ background: lit.color }} />
              <span>{regionName(lit)}</span>
              {count(lit.id) > 0 && <span className="font-semibold text-amber-700">· {countLabel(count(lit.id))}</span>}
            </>
          ) : (
            <span className="font-semibold text-[#a07c58]">აირჩიე კუთხე რუკაზე ან სიაში</span>
          )}
        </p>
      </div>

      {/* The same regions as roomy cards (easier to tap on a phone) */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-3 gap-2">
        {[...FOLK_REGIONS, ...extraRegions].map(r => {
          const n = count(r.id);
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelect(r)}
              onPointerEnter={() => setHovered(r.id)}
              onPointerLeave={() => setHovered(null)}
              className={`${r.wide ? 'col-span-2 sm:col-span-3 ' : ''}min-h-11 px-3 py-2 rounded-xl border bg-white hover:bg-amber-50/60 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2.5 text-left ${
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

// A small map at the top of a region's list: the region lit, the rest of Georgia pale
export const RegionLocator: React.FC<{ region: FolkRegion; className?: string }> = ({ region, className }) => {
  const shape = region.id in GEORGIA_MAP_SHAPES ? GEORGIA_MAP_SHAPES[region.id as MapRegionId] : undefined;
  // a land outside today's map (ლაზეთი): its colour as a tile instead
  if (!shape) {
    return (
      <span className="w-16 h-16 shrink-0 rounded-2xl border border-black/10 shadow-inner flex items-center justify-center text-[11px] font-black text-white/95" style={{ background: region.color }} aria-hidden="true">
        {region.regionCode}
      </span>
    );
  }
  return (
    <svg viewBox={`-8 -8 ${width + 16} ${height + 16}`} className={className} aria-hidden="true">
      {FOLK_REGIONS.filter(r => r.id !== region.id).map(r => (
        // a mid-tone, so even the palest region (Imereti) stands out from the rest
        <path key={r.id} d={GEORGIA_MAP_SHAPES[r.id].d} fill="#d9cfbf" stroke="#fffaf0" strokeWidth={6} strokeLinejoin="round" />
      ))}
      <path d={shape.d} fill={region.color} stroke="#6b4423" strokeWidth={8} strokeLinejoin="round" />
      {/* Tbilisi is too small to see at this size: a dot in its colour */}
      {region.id === 'kalakuri' && (
        <circle cx={shape.label[0]} cy={shape.label[1]} r={34} fill={region.color} stroke="#6b4423" strokeWidth={7} />
      )}
    </svg>
  );
};
