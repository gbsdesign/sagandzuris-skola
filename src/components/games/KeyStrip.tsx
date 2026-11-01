import React from 'react';
import { ALPHABET, toScript, type Script } from '../../utils/oldScripts';

// The old script's key (games hub, 2026-11-01: „სამი დამწერლობა“'s quick reading, then „ციხის გასაღები“'s inscriptions): the 33
// letters, each old letter over today's. Eleven a row on a phone, seventeen when the screen is big.

export const KeyStrip: React.FC<{ script: Exclude<Script, 'mkhedruli'>; big?: boolean; className?: string }> = ({ script, big = false, className = '' }) => (
  <ul className={`grid w-full mx-auto ${big ? 'grid-cols-17 gap-1 max-w-4xl' : 'grid-cols-11 gap-[3px] max-w-xl'} ${className}`} aria-label="ანბანის გასაღები">
    {ALPHABET.map(ch => (
      <li key={ch} className="rounded-lg bg-white ring-1 ring-[#efe5d3] py-0.5 flex flex-col items-center">
        <span className={`font-serif-ge leading-tight text-[#7a2028] ${big ? 'text-[26px]' : 'text-[17px]'}`}>{toScript(ch, script)}</span>
        <span className={`leading-none pb-0.5 text-[#75685a] ${big ? 'text-[14px]' : 'text-[11px]'}`}>{ch}</span>
      </li>
    ))}
  </ul>
);
