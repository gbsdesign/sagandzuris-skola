import React, { useEffect, useState } from 'react';
import { BookOpen, ChevronDown } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

// How a game is played, in a few numbered steps (2026-11-04, the games' review — the user: „მარტივად აღქმადი გახადე“): one
// block over a game's settings, in place of the long grey paragraph under its start button. Open the first time on this
// device; once seen it folds to its title line and a tap opens it again (`sg-howto` = the ids seen).

const KEY = 'sg-howto';
const seenIds = (): string[] => {
  try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter(x => typeof x === 'string') : []; } catch { return []; }
};
const markSeen = (id: string) => {
  try { const s = seenIds(); if (!s.includes(id)) localStorage.setItem(KEY, JSON.stringify([...s, id].slice(-200))); } catch { /* private mode */ }
};

export const HowTo: React.FC<{ id: string; steps: React.ReactNode[]; title?: string; className?: string }> = ({ id, steps, title = 'როგორ ვითამაშოთ', className = '' }) => {
  const [open, setOpen] = useState(() => !seenIds().includes(id));
  useEffect(() => markSeen(id), [id]);
  const listId = `howto-${id}`;
  return (
    <section className={`rounded-3xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] ${className}`}>
      <button
        type="button"
        onClick={() => { triggerHaptic(5); setOpen(o => !o); }}
        aria-expanded={open}
        aria-controls={listId}
        className="w-full min-h-[52px] flex items-center gap-2.5 px-4 py-2 text-left rounded-3xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7a2028]/40"
      >
        <span className="w-8 h-8 shrink-0 rounded-full bg-[#7a2028]/[0.08] text-[#7a2028] flex items-center justify-center"><BookOpen className="w-4 h-4" /></span>
        <span className="min-w-0 flex-1 text-[14.5px] font-bold leading-snug text-[#4a3426]">{title}</span>
        <ChevronDown className={`w-5 h-5 shrink-0 text-[#8a7a6a] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <Steps id={listId} steps={steps} className="px-4 pb-4 -mt-0.5" />}
    </section>
  );
};

/** the numbered steps alone — for a card that shows how to play only until the first move (2026-11-04) */
export const Steps: React.FC<{ steps: React.ReactNode[]; id?: string; className?: string }> = ({ steps, id, className = '' }) => (
  <ol id={id} className={`space-y-2.5 ${className}`}>
    {steps.map((s, i) => (
      <li key={i} className="flex items-start gap-2.5">
        <span className="w-6 h-6 shrink-0 rounded-full bg-[#7a2028] text-[#fbf6ec] text-[12.5px] font-bold flex items-center justify-center tabular-nums">{i + 1}</span>
        <span className="min-w-0 pt-[2px] text-[13.5px] leading-snug text-[#4a3426]">{s}</span>
      </li>
    ))}
  </ol>
);
