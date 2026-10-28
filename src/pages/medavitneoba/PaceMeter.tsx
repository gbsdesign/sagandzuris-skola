import React from 'react';
import { Gauge } from 'lucide-react';
import { PACE, PACE_NAMES, paceNumber, type Pace } from '../../utils/readingPace';

// The pace of a recorded reading (utils/readingPace.ts): a bar of three zones, where this reading fell, and what to do.

const LOW = 1.5;
const HIGH = 7;
const ZONES = [
  { zone: 'slow', from: LOW, to: PACE.slow, bar: 'bg-amber-200' },
  { zone: 'even', from: PACE.slow, to: PACE.fast, bar: 'bg-emerald-300' },
  { zone: 'fast', from: PACE.fast, to: HIGH, bar: 'bg-amber-200' },
] as const;

const ADVICE: Record<Pace['zone'], string> = {
  slow: 'ნელა კითხულობ. ცოტა მოუმატე — ოღონდ სიტყვები ისევ ბოლომდე და მკაფიოდ გამოთქვი.',
  even: 'კარგი ტემპია — აუჩქარებლად და გასაგებად. ასე განაგრძე.',
  fast: 'აჩქარდი. შეანელე: სიტყვები ბოლომდე გამოთქვი და ყოველ მუხლზე ოდნავ შეისვენე.',
};

export const PaceMeter: React.FC<{ pace: Pace }> = ({ pace }) => {
  if (pace.partial) return (
    <p className="mt-3 rounded-xl bg-[#fdf4e3] ring-1 ring-[#e9c98f] px-3.5 py-2.5 text-[13px] leading-snug text-[#4a3826] text-pretty">
      ჩანაწერი ტექსტისთვის ძალიან მოკლეა. ტექსტი ბოლომდე წაიკითხე და ტემპს დაგითვლი.
    </p>
  );
  const at = Math.min(98, Math.max(2, ((pace.rate - LOW) / (HIGH - LOW)) * 100));
  const tone = pace.zone === 'even' ? 'text-emerald-700' : 'text-amber-700';
  return (
    <div role="group" className="mt-3 rounded-xl bg-white ring-1 ring-[#e8dcc8] px-3.5 py-3" aria-label={`ტემპი: ${PACE_NAMES[pace.zone]}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <p className="inline-flex items-center gap-1.5 text-[14px] font-bold text-[#2a2017]">
          <Gauge className="w-4 h-4 text-[#7a2028]" />ტემპი: <span className={tone}>{PACE_NAMES[pace.zone]}</span>
        </p>
        <p className="text-[13px] font-semibold tabular-nums text-[#8a7a6a]">{paceNumber(pace.rate)} მარცვალი წამში</p>
      </div>
      <div className="relative mt-3" aria-hidden>
        <div className="flex h-2.5 gap-0.5 rounded-full overflow-hidden">
          {ZONES.map(z => <span key={z.zone} className={z.bar} style={{ flexGrow: z.to - z.from, flexBasis: 0 }} />)}
        </div>
        <span className="absolute top-1/2 w-4 h-4 -mt-2 -ml-2 rounded-full bg-[#7a2028] ring-[3px] ring-white shadow-[0_1px_3px_rgba(42,32,23,0.35)]" style={{ left: `${at}%` }} />
      </div>
      <div className="mt-1.5 flex text-[12px] font-semibold text-[#8a7a6a]" aria-hidden>
        {ZONES.map(z => (
          <span key={z.zone} className={`text-center ${pace.zone === z.zone ? 'text-[#2a2017] font-bold' : ''}`} style={{ flexGrow: z.to - z.from, flexBasis: 0 }}>
            {PACE_NAMES[z.zone]}
          </span>
        ))}
      </div>
      <p className="mt-2 text-[13px] leading-snug text-[#4a3826] text-pretty">{ADVICE[pace.zone]}</p>
    </div>
  );
};
