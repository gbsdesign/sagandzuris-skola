import React from 'react';
import { LifeEntry, lifeAsset } from '../../data/saintLives';

// A saint's icon, small, for lists — or a cross on parchment when the life has no icon.
export const LifeThumb: React.FC<{ life: LifeEntry; className?: string }> = ({ life, className = 'w-10 h-12' }) => (
  <span className={`relative shrink-0 overflow-hidden rounded-lg ring-1 ring-[#e3d3b8] bg-gradient-to-b from-[#f8efdf] to-[#efe2c9] ${className}`} aria-hidden>
    {life.i ? (
      <img src={lifeAsset(life.i)} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover object-top" />
    ) : (
      <svg viewBox="0 0 24 32" className="absolute inset-0 m-auto w-1/2 h-1/2" fill="none">
        <path d="M12 3v26M9 7h6M5 12.5h14M8 23.5l8-3" stroke="#b08a5a" strokeWidth={2} strokeLinecap="round" />
      </svg>
    )}
  </span>
);
