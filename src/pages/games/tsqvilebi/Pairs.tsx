import React from 'react';
import type { TsqItem } from '../../../utils/tsqvilebi';
import { PlayDot, useSampler } from '../rounds/samples';
import { TSQ_CLIP, clipOf } from './Board';

// A board's pairs once it is over (the answer online, the end alone and in teams): every sound with its name, each with its ▶ —
// what was that piece, to hear it again; `tint` marks who found it (the teams' colours).

export const PairsList: React.FC<{ items: readonly TsqItem[]; tint?: (pair: number) => string | null; title?: string }> = ({ items, tint, title = 'დაფის წყვილები' }) => {
  const s = useSampler(TSQ_CLIP);
  return (
    <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-3 py-3 space-y-1.5">
      <p className="px-1 text-[12.5px] font-bold text-[#75685a]">{title}</p>
      <ul className="space-y-1">
        {items.map((it, k) => {
          const color = tint?.(k) ?? null;
          return (
            <li key={it.id} className="flex items-center gap-3 rounded-2xl px-1 py-0.5">
              <PlayDot busy={s.isOn(k)} load={s.isLoading(k)} label={`${it.name} — მოსმენა`} size="sm" onTap={() => s.tap(k, clipOf(it.sound))} />
              <div className="min-w-0 flex-1">
                <p className="font-serif-ge text-[14.5px] font-bold leading-snug text-[#4a3426] [overflow-wrap:anywhere]">{it.name}</p>
                {it.sub && <p className="text-[12.5px] leading-tight text-[#9a8b7b]">{it.sub}</p>}
              </div>
              {color && <span className="w-3 h-3 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />}
            </li>
          );
        })}
      </ul>
    </section>
  );
};
