import React from 'react';

// A round's steps over its question (the quick games of two or three steps — „ქართული აკორდი“, „რვა ხმა“): the step sounding
// now in wine, the ones heard faint, each with what it still earns (online: its points, the one-phone game: its mark).

export const StepRow: React.FC<{ names: readonly string[]; worth: readonly string[]; step: number }> = ({ names, worth, step }) => (
  <ol className={`mt-3 grid gap-1.5 ${names.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`} aria-label="ნაბიჯები">
    {names.map((name, i) => {
      const now = i === step - 1;
      const past = i < step - 1;
      return (
        <li
          key={i}
          aria-current={now ? 'step' : undefined}
          className={`min-w-0 rounded-2xl px-2 py-1.5 text-center ${now ? 'bg-[#7a2028] text-white' : past ? 'bg-[#7a2028]/[0.08] text-[#7a2028]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#9a8b7b]'}`}
        >
          <span className="block text-[13px] font-bold leading-tight [overflow-wrap:anywhere]">{name}</span>
          <span className={`block mt-0.5 text-[11.5px] font-bold tabular-nums ${now ? 'text-white/80' : ''}`}>{worth[i]}</span>
        </li>
      );
    })}
  </ol>
);
