import React, { useId } from 'react';
import { SamosiArtKind } from '../../data/samosiData';

// Drawn pictures for the outfit parts that are not in the chokha photo:
// აზიურები (soft leather boots) and ფაფანაკი (the flat round Imeretian cap tied under the chin).
export const SamosiArt: React.FC<{ kind: SamosiArtKind; className?: string }> = ({ kind, className }) => {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return kind === 'boots' ? <Boots id={uid} className={className} /> : <Hat id={uid} className={className} />;
};

const BOOT = 'M39 10 L61 10 L60 62 C64 70 76 74 86 79 C92 82 91 89 84 89 L44 89 C39 89 37 86 38 80 C39 60 38 32 39 10 Z';

const Boots: React.FC<{ id: string; className?: string }> = ({ id, className }) => (
  <svg viewBox="0 0 100 100" className={className} aria-hidden>
    <defs>
      <linearGradient id={`${id}-leather`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#1c1410" />
        <stop offset="0.45" stopColor="#4a382c" />
        <stop offset="1" stopColor="#21180f" />
      </linearGradient>
      <linearGradient id={`${id}-back`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#2a1f18" />
        <stop offset="0.5" stopColor="#5a463a" />
        <stop offset="1" stopColor="#2c2219" />
      </linearGradient>
    </defs>
    <ellipse cx="56" cy="93" rx="38" ry="3.2" fill="#4a3426" opacity="0.18" />
    {/* the boot behind */}
    <g transform="translate(-17 -3)">
      <path d={BOOT} fill={`url(#${id}-back)`} />
      <path d="M39 10 L61 10 L61 15 L39 15 Z" fill="#6b5546" />
      <path d="M41.5 89 L84.5 89 Q86 89 86 90.5 Q86 92 84.5 92 L43 92 Q41 92 41 90.5 Z" fill="#17110d" />
    </g>
    {/* the boot in front */}
    <path d={BOOT} fill={`url(#${id}-leather)`} />
    <path d="M39 10 L61 10 L61 15 L39 15 Z" fill="#5a463a" />
    <path d="M39 15.5 L61 15.5" stroke="#c8962e" strokeWidth="1.2" />
    <path d="M45 19 C44.5 36 45 52 46 64" stroke="#fff" strokeOpacity="0.16" strokeWidth="2.6" strokeLinecap="round" fill="none" />
    <path d="M64 72 C70 75 76 77 82 80" stroke="#fff" strokeOpacity="0.14" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    <path d="M41.5 89 L84.5 89 Q86 89 86 90.5 Q86 92 84.5 92 L43 92 Q41 92 41 90.5 Z" fill="#120d0a" />
  </svg>
);

const Hat: React.FC<{ id: string; className?: string }> = ({ id, className }) => (
  <svg viewBox="0 0 100 100" className={className} aria-hidden>
    <defs>
      <radialGradient id={`${id}-felt`} cx="0.42" cy="0.35" r="0.75">
        <stop offset="0" stopColor="#4a3b33" />
        <stop offset="0.6" stopColor="#241b16" />
        <stop offset="1" stopColor="#130e0b" />
      </radialGradient>
    </defs>
    {/* ties hanging under the chin */}
    <path d="M19 47 C22 64 36 76 48.5 83" stroke="#2b211b" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    <path d="M81 47 C78 64 64 76 51.5 83" stroke="#2b211b" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    <circle cx="50" cy="84" r="3" fill="#c8962e" />
    <path d="M48 86.5 L46.5 95 M50 87 L50 96 M52 86.5 L53.5 95" stroke="#c8962e" strokeWidth="1.3" strokeLinecap="round" />
    {/* the flat round cap */}
    <path d="M15 42 A35 15 0 0 0 85 42 L85 47.5 A35 15 0 0 1 15 47.5 Z" fill="#0f0b09" />
    <ellipse cx="50" cy="42" rx="35" ry="15" fill={`url(#${id}-felt)`} />
    <ellipse cx="50" cy="42" rx="27" ry="11" fill="none" stroke="#c8962e" strokeWidth="1.4" strokeDasharray="2.4 2.2" />
    <ellipse cx="50" cy="42" rx="31.5" ry="13" fill="none" stroke="#c8962e" strokeOpacity="0.55" strokeWidth="0.8" />
    {/* rosette in the middle */}
    <path d="M50 35.5 L52 40.5 L57.5 42 L52 43.5 L50 48.5 L48 43.5 L42.5 42 L48 40.5 Z" fill="#d9a63a" />
    <circle cx="50" cy="42" r="1.6" fill="#7a2028" />
  </svg>
);
