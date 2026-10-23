import React, { useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import { IconBtn } from '../ui/kit';

/** A folding card of the „სკოლა“ tab: icon, title and a short summary while folded (open, the rest says it); ▾ opens the
 *  rest. `info`: a longer explanation behind an ⓘ button, shown inside the open card. */
export const Fold: React.FC<{
  icon: React.ReactNode;
  title: string;
  summary?: React.ReactNode;
  info?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ icon, title, summary, info, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  const [why, setWhy] = useState(false);
  return (
    <section className={`rounded-3xl bg-white/80 ring-1 transition-shadow ${open ? 'ring-[#dccbb0] shadow-[0_6px_20px_-14px_rgba(74,52,38,0.35)]' : 'ring-[#e8dcc8]'}`}>
      <div className="flex items-center gap-1 pr-2 sm:pr-3">
        <button type="button" aria-expanded={open} onClick={() => setOpen(o => !o)}
          className="flex-1 min-w-0 min-h-[68px] flex items-center gap-3 pl-4 sm:pl-5 pr-1 py-3 text-left cursor-pointer group">
          <span className="w-10 h-10 shrink-0 rounded-2xl bg-[#7a2028]/[0.08] text-[#7a2028] flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5">{icon}</span>
          <span className="min-w-0 flex-1">
            <span className="block font-serif-ge text-[16px] font-bold text-[#4a3426] leading-snug group-hover:text-[#7a2028] transition-colors">{title}</span>
            {summary && !open && <span className="block text-[12.5px] text-[#8a7a6a] leading-snug mt-0.5">{summary}</span>}
          </span>
        </button>
        {open && info && (
          <IconBtn label="განმარტება" aria-expanded={why} onClick={() => setWhy(o => !o)} className={why ? '!bg-[#7a2028]/[0.1] !text-[#7a2028]' : ''}>
            <Info />
          </IconBtn>
        )}
        <button type="button" aria-label={open ? 'დაკეცვა' : 'გაშლა'} onClick={() => setOpen(o => !o)}
          className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-[#8a7a6a] hover:text-[#7a2028] hover:bg-[#7a2028]/[0.06] cursor-pointer transition">
          <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {open && (
        <div className="px-4 sm:px-5 pb-4 sg-in">
          {info && why && <p className="mb-3 text-[13px] text-[#75685a] leading-relaxed sg-in">{info}</p>}
          {children}
        </div>
      )}
    </section>
  );
};
