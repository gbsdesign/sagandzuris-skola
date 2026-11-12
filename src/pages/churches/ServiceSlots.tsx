// „მსახურებები“ shown compactly (2026-11-12): a row a service — ☀ / 🌙 in a soft round, what and which days, the hour as a pill.
// Used in a church's window (under the feast line) and in the services' list.
import React from 'react';
import { Lock, Moon, Sun } from 'lucide-react';
import { SERVICES_SOURCE, type ChurchService, type ServiceSlot } from '../../data/churchServices';

const LOOK = {
  morning: { icon: Sun, round: 'bg-[#f6e6c4] text-[#a8700f]', word: 'დილით' },
  night: { icon: Moon, round: 'bg-[#dfe4f2] text-[#33407a]', word: 'ღამით' },
} as const;

/** `inButton` draws spans, since a list may not stand inside a button */
export const SlotRow: React.FC<{ s: ServiceSlot; inButton?: boolean }> = ({ s, inButton }) => {
  const Row = inButton ? 'span' : 'li';
  const L = LOOK[s.when];
  const Icon = L.icon;
  return (
    <Row className="flex items-center gap-2.5">
      <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${L.round}`}><Icon className="w-4 h-4" aria-label={L.word} /></span>
      <span className="flex-1 min-w-0 text-[14.5px] leading-snug text-[#2a2017]">
        <b className="font-bold">{s.what}</b> <span className="text-[#6b5a4a] font-semibold">· {s.days}</span>
      </span>
      <span className={`shrink-0 px-2.5 py-1 rounded-full text-[12.5px] font-bold tabular-nums ${L.round}`}>{s.time ?? L.word}</span>
    </Row>
  );
};

/** the window's block: compact rows, then one quiet line (and the online note, if any) */
export const ServiceSlots: React.FC<{ service: ChurchService }> = ({ service }) => (
  <div className="flex flex-col gap-2 rounded-2xl bg-white/80 ring-1 ring-[#e8dcc8] p-3">
    <div className="flex items-center justify-between gap-2">
      <span className="text-[12.5px] font-black tracking-wide text-[#7a2028]">მსახურებები</span>
      <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#8a7a6a]"><Lock className="w-3 h-3" aria-hidden />ადმინები და მასწავლებლები</span>
    </div>
    <ul className="flex flex-col gap-1.5">{service.slots.map(s => <SlotRow key={s.when + s.what} s={s} />)}</ul>
    {service.note && <p className="text-[13px] font-semibold text-[#574739] leading-snug">{service.note}</p>}
    {service.checked && <p className="text-[12.5px] font-semibold text-[#9a5f08] leading-snug">⚠ {service.checked}</p>}
    <p className="text-[11.5px] font-semibold text-[#8a7a6a] leading-snug">{SERVICES_SOURCE}</p>
  </div>
);
