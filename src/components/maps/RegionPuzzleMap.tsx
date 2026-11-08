import React, { useRef, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { FOLK_REGIONS, FolkRegion, FolkRegionId, MapRegionId } from '../../data/songsData';
import { GEORGIA_MAP_SHAPES, GEORGIA_MAP_SIZE } from '../../data/georgiaMapShapes';
import { triggerHaptic } from '../../utils/haptics';

// Georgia as a wooden puzzle, shared by the songs and მთქმელი maps. The map itself carries only colour and touch
// (names are too small to read on a phone); every region also has a roomy card with its name and count below.
// `rich` (the big „ხალხური“ map, 2026-11-09, the user: „ციფრები რუკაზე … თითის დაჭერისას ეწერებოდეს კუთხის სახელი … გაადიდე,
// ჩარჩოც მოხსენი … კუთხეები ჩამოსაშლელი“): no frame, each region's count as a small pill on the map, a finger's first tap
// lights a region and names it under the map, a second tap opens it (a mouse opens on click, as before); the cards are folded
// behind one round ▾ under the map.
interface RegionPuzzleMapProps {
  onSelect: (region: FolkRegion) => void;
  count: (id: FolkRegionId) => number;
  countLabel: (n: number) => string; // "3 ავტორი"
  regionName?: (region: FolkRegion) => string; // e.g. Tbilisi instead of "ქალაქური"
  title?: string; // written along the northern border
  extraRegions?: FolkRegion[]; // lands outside the map (ლაზეთი): cards after the map's regions
  rich?: boolean;
}

const { width, height } = GEORGIA_MAP_SIZE;

export const RegionPuzzleMap: React.FC<RegionPuzzleMapProps> = ({ onSelect, count, countLabel, regionName = r => r.nameGe, title, extraRegions = [], rich }) => {
  const [hovered, setHovered] = useState<FolkRegionId | null>(null);
  // a finger's first tap (rich): the region named, the second tap opens it
  const [picked, setPicked] = useState<FolkRegionId | null>(null);
  const [cardsOpen, setCardsOpen] = useState(false);
  const litId = picked ?? hovered;
  const lit = FOLK_REGIONS.find(r => r.id === litId);
  const tbilisi = GEORGIA_MAP_SHAPES.kalakuri.label;
  const touch = useRef(false);

  const tap = (r: FolkRegion) => {
    if (rich && touch.current) {
      if (picked !== r.id) { triggerHaptic(8); setPicked(r.id); return; }
    }
    onSelect(r);
  };

  const svg = (
    <svg
      viewBox={`-12 -12 ${width + 24} ${height + 24}`}
      className="w-full h-auto select-none"
      role="group"
      aria-label="საქართველოს რუკა — აირჩიეთ კუთხე"
      onPointerDown={e => { touch.current = e.pointerType === 'touch'; }}
    >
      <defs>
        <filter id="puzzle-piece-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#6b4423" floodOpacity="0.35" />
        </filter>
        <filter id="puzzle-piece-lift" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="7" stdDeviation="5" floodColor="#4a2a14" floodOpacity="0.45" />
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
        const isLit = litId === r.id;
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
            aria-pressed={rich ? picked === r.id : undefined}
            onClick={() => tap(r)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(r); } }}
            // a finger lifts nothing by itself: the lifted piece moved under it and the tap could miss the region it touched
            onPointerEnter={e => { if (e.pointerType !== 'touch') setHovered(r.id); }}
            onPointerLeave={() => setHovered(null)}
            onFocus={() => setHovered(r.id)}
            onBlur={() => setHovered(null)}
            className="cursor-pointer outline-none transition-[transform,filter,opacity] duration-150"
            style={{
              transform: isLit ? 'translateY(-5px)' : undefined,
              filter: isLit ? 'url(#puzzle-piece-lift) brightness(1.08)' : undefined,
              // the lit piece stands out: the others step back a little
              opacity: litId && !isLit ? 0.55 : 1,
            }}
          />
        );
      })}
      {/* Tbilisi is a small piece: a dot marks it (it never blocks taps) */}
      <circle cx={tbilisi[0]} cy={tbilisi[1]} r={9} fill="#fffaf0" stroke="#85502c" strokeWidth={3} pointerEvents="none" />
      {/* the counts on the map (rich): a small pill on every region that has something */}
      {rich && FOLK_REGIONS.map(r => {
        const n = count(r.id);
        if (!n) return null;
        const [x, y0] = GEORGIA_MAP_SHAPES[r.id].label;
        // Tbilisi's pill sits right of its dot, the others over their region's label point
        const isTbilisi = r.id === 'kalakuri';
        const cx = isTbilisi ? x + 46 : x;
        const y = isTbilisi ? y0 : y0 + (litId === r.id ? -5 : 0);
        const text = String(n);
        const w = text.length * 17 + 22;
        return (
          <g key={`n-${r.id}`} pointerEvents="none" className="transition-transform duration-150">
            <rect x={cx - w / 2} y={y - 17} width={w} height={34} rx={17} fill="#fffaf0" fillOpacity={0.92} stroke="#6b4423" strokeOpacity={0.25} strokeWidth={1.5} />
            <text x={cx} y={y + 1} textAnchor="middle" dominantBaseline="middle" fontSize={30} fontWeight={800} fill="#4a3426" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {text}
            </text>
          </g>
        );
      })}
    </svg>
  );

  const cards = (
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
            className={`${r.wide ? 'col-span-2 sm:col-span-3 ' : ''}${rich && !n ? 'opacity-50 ' : ''}min-h-11 px-3 py-2 rounded-xl border bg-white hover:bg-amber-50/60 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2.5 text-left ${
              litId === r.id ? 'border-amber-400 shadow-sm' : 'border-[#e8dcc8]/90'
            }`}
          >
            <span className="w-4 h-4 shrink-0 rounded-md border border-black/10" style={{ background: r.color }} />
            {rich ? (
              // compact: the name, the count at the right
              <>
                <span className="flex-1 min-w-0 text-[13px] sm:text-sm font-bold text-[#2a2017] leading-tight break-words">{regionName(r)}</span>
                {n > 0 && <span className="shrink-0 text-[12px] font-bold tabular-nums text-amber-700">{n}</span>}
              </>
            ) : (
              <span className="flex-1 min-w-0 flex flex-col">
                <span className="text-[13px] sm:text-sm font-bold text-[#2a2017] leading-tight break-words">{regionName(r)}</span>
                <span className={`text-[11px] font-semibold ${n ? 'text-amber-700' : 'text-[#a39482]'}`}>
                  {n ? countLabel(n) : 'ჯერ არ არის'}
                </span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  if (rich) {
    return (
      <div className="w-full flex flex-col items-center gap-2 animate-in fade-in duration-200">
        {/* no frame: the map stands on the paper, a little wider than the page's column */}
        <div className="-mx-1 sm:mx-0 w-[calc(100%+0.5rem)] sm:w-full">{svg}</div>
        {/* the lit region: its name and count, a tap opens it (the second tap of a finger) */}
        <div className="h-12 w-full flex items-center justify-center" aria-live="polite">
          {lit ? (
            <button
              type="button"
              onClick={() => onSelect(lit)}
              className="min-h-11 pl-3 pr-4 rounded-full bg-white ring-1 ring-[#e2d3bb] shadow-[0_1px_3px_rgba(74,52,38,0.08)] flex items-center gap-2.5 cursor-pointer hover:ring-[#d9a55a] active:scale-[0.98] transition-all animate-in fade-in zoom-in-95 duration-150"
            >
              <span className="w-4 h-4 rounded-md border border-black/10" style={{ background: lit.color }} />
              <span className="text-[15px] font-black text-[#2a2017]">{regionName(lit)}</span>
              {count(lit.id) > 0 && <span className="text-[13px] font-bold text-amber-700">· {countLabel(count(lit.id))}</span>}
              <ChevronRight className="w-4 h-4 text-[#b4620e]" aria-hidden />
            </button>
          ) : (
            <span className="text-[12.5px] font-semibold text-[#a39482]">აირჩიე კუთხე რუკაზე</span>
          )}
        </div>
        {/* the regions as cards, folded behind one round button */}
        <button
          type="button"
          onClick={() => { triggerHaptic(8); setCardsOpen(o => !o); }}
          aria-expanded={cardsOpen}
          aria-label={cardsOpen ? 'კუთხეების სიის დახურვა' : 'კუთხეების სია'}
          className="w-10 h-10 -mt-1 rounded-full bg-white ring-1 ring-[#e2d3bb] text-[#7a2028] flex items-center justify-center cursor-pointer hover:bg-[#fbf6ec] active:scale-95 transition-all"
        >
          <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${cardsOpen ? 'rotate-180' : ''}`} />
        </button>
        {cardsOpen && <div className="w-full animate-in fade-in slide-in-from-top-1 duration-200">{cards}</div>}
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center gap-4 animate-in fade-in duration-200">
      <div className="w-full rounded-3xl bg-gradient-to-br from-[#f7ecd9] via-[#f3e3c6] to-[#ead6b3] border border-[#e2c9a0] shadow-inner p-2 sm:p-4">
        {svg}
        {/* the lit region's name: a fixed-height line, so nothing jumps */}
        <p className="h-6 mt-1 flex items-center justify-center gap-2 text-[13px] font-bold text-[#6b4423]" aria-live="polite">
          {/* empty until a region is lit: the map and the cards speak for themselves */}
          {lit && (
            <>
              <span className="w-3 h-3 rounded-[4px] border border-black/10" style={{ background: lit.color }} />
              <span>{regionName(lit)}</span>
              {count(lit.id) > 0 && <span className="font-semibold text-amber-700">· {countLabel(count(lit.id))}</span>}
            </>
          )}
        </p>
      </div>

      {/* The same regions as roomy cards (easier to tap on a phone) */}
      {cards}
    </div>
  );
};

// A small map at the top of a region's list: the region lit, the rest of Georgia pale. With `onPick` (2026-11-08, the user's
// „კი, პატარაზეც“) another region takes a tap and opens in place of this one; Tbilisi gets a dot of its own to tap.
export const RegionLocator: React.FC<{ region: FolkRegion; className?: string; onPick?: (id: MapRegionId) => void }> = ({ region, className, onPick }) => {
  const shape = region.id in GEORGIA_MAP_SHAPES ? GEORGIA_MAP_SHAPES[region.id as MapRegionId] : undefined;
  // a land outside today's map (ლაზეთი): its colour as a tile instead
  if (!shape) {
    return (
      <span className="w-16 h-16 shrink-0 rounded-2xl border border-black/10 shadow-inner flex items-center justify-center text-[11px] font-black text-white/95" style={{ background: region.color }} aria-hidden="true">
        {region.regionCode}
      </span>
    );
  }
  const pick = (id: MapRegionId) => () => { triggerHaptic(8); onPick?.(id); };
  const tbilisi = GEORGIA_MAP_SHAPES.kalakuri.label;
  return (
    <svg
      viewBox={`-8 -8 ${width + 16} ${height + 16}`}
      className={className}
      {...(onPick ? { role: 'group', 'aria-label': 'სხვა კუთხე' } : { 'aria-hidden': true })}
    >
      {FOLK_REGIONS.filter(r => r.id !== region.id).map(r => (
        // a mid-tone, so even the palest region (Imereti) stands out from the rest
        <path
          key={r.id}
          d={GEORGIA_MAP_SHAPES[r.id].d}
          fill="#d9cfbf"
          stroke="#fffaf0"
          strokeWidth={6}
          strokeLinejoin="round"
          {...(onPick && {
            role: 'button',
            'aria-label': r.id === 'kalakuri' ? 'თბილისი' : r.nameGe,
            onClick: pick(r.id),
            className: 'cursor-pointer transition-[fill] duration-150 hover:fill-[#c4b49c] active:fill-[#b8a68c]',
          })}
        />
      ))}
      <path d={shape.d} fill={region.color} stroke="#6b4423" strokeWidth={8} strokeLinejoin="round" />
      {/* Tbilisi is too small to see at this size: a dot in its colour */}
      {region.id === 'kalakuri' && (
        <circle cx={shape.label[0]} cy={shape.label[1]} r={34} fill={region.color} stroke="#6b4423" strokeWidth={7} />
      )}
      {/* …and too small to tap: a pale dot of its own when another region is lit */}
      {onPick && region.id !== 'kalakuri' && (
        <circle
          cx={tbilisi[0]}
          cy={tbilisi[1]}
          r={30}
          fill="#fffaf0"
          stroke="#85502c"
          strokeWidth={7}
          role="button"
          aria-label="თბილისი"
          onClick={pick('kalakuri')}
          className="cursor-pointer"
        />
      )}
    </svg>
  );
};
