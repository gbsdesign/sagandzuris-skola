import React, { useId } from 'react';
import { SamosiArtKind } from '../../data/samosiData';

// Drawn pictures for the outfit parts that have no photo: აზიურები (soft leather boots).
export const SamosiArt: React.FC<{ kind: SamosiArtKind; className?: string }> = ({ className }) => {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return <Boots id={uid} className={className} />;
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
