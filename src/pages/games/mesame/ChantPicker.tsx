import React, { useMemo, useState } from 'react';
import { Check, ChevronRight, Dices } from 'lucide-react';
import { Sheet } from '../../../components/ui/kit';
import { triggerHaptic } from '../../../utils/haptics';
import type { TrioChant } from './chants';

// The chant „მესამე ხმა“ sings: a row with its name that opens the list (the class's program first, then by service),
// and a die for a chant at random.

export const ChantPicker: React.FC<{ chants: readonly TrioChant[]; value: TrioChant | null; onChange: (c: TrioChant) => void; disabled?: boolean }> = ({
  chants, value, onChange, disabled,
}) => {
  const [open, setOpen] = useState(false);
  const groups = useMemo(() => {
    const out: { name: string; list: TrioChant[] }[] = [];
    chants.forEach(c => {
      const g = out.find(x => x.name === c.group);
      if (g) g.list.push(c); else out.push({ name: c.group, list: [c] });
    });
    return out;
  }, [chants]);
  const random = () => {
    const others = chants.filter(c => c.id !== value?.id);
    if (others.length) onChange(others[Math.floor(Math.random() * others.length)]);
  };
  return (
    <div className="flex items-stretch gap-2">
      <button type="button" disabled={disabled} onClick={() => { triggerHaptic(8); setOpen(true); }}
        className="min-w-0 flex-1 flex items-center gap-3 rounded-2xl bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40 px-3.5 py-2.5 text-left cursor-pointer transition disabled:opacity-50 disabled:cursor-default">
        <span className="min-w-0 flex-1">
          <span className="block text-[12px] font-bold text-[#8a7a6a]">{value ? value.group : 'საგალობელი'}</span>
          <span className="block font-serif-ge text-[16px] font-bold leading-snug text-[#4a3426] [overflow-wrap:anywhere]">{value ? value.title : 'აირჩიე'}</span>
        </span>
        <ChevronRight className="w-5 h-5 shrink-0 text-[#a0703c]" />
      </button>
      <button type="button" disabled={disabled || chants.length < 2} onClick={() => { triggerHaptic(8); random(); }} aria-label="შემთხვევითი საგალობელი"
        className="w-12 shrink-0 rounded-2xl bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40 text-[#7a2028] flex items-center justify-center cursor-pointer transition disabled:opacity-50 disabled:cursor-default">
        <Dices className="w-5 h-5" />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="საგალობელი">
        <div className="space-y-4">
          {groups.map(g => (
            <section key={g.name}>
              <p className="text-[12.5px] font-bold uppercase tracking-wide text-[#a0703c]">{g.name}</p>
              <ul className="mt-1.5 divide-y divide-[#efe5d4] border-y border-[#efe5d4]">
                {g.list.map(c => {
                  const on = c.id === value?.id;
                  return (
                    <li key={c.id}>
                      <button type="button" onClick={() => { triggerHaptic(6); onChange(c); setOpen(false); }} aria-pressed={on}
                        className={`w-full min-h-12 flex items-center gap-3 px-1 py-2 text-left cursor-pointer ${on ? 'text-[#7a2028]' : 'text-[#2a2017]'}`}>
                        <span className="min-w-0 flex-1 font-serif-ge text-[15px] font-bold leading-snug [overflow-wrap:anywhere]">{c.title}</span>
                        {on && <Check className="w-5 h-5 shrink-0" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </Sheet>
    </div>
  );
};
