import React, { useState } from 'react';
import { useNavigation, useModal } from '../../context';
import { triggerHaptic } from '../../utils/haptics';
import { Toast } from '../ui/Toast';

// Home menu as a grape cluster drawn like a manuscript ornament: a thin vine line,
// "გაიცანი წინაპრები" on the stem, every grape a calm flat button. Grapes without `go` are not built yet.
type Grape = { label: string; go?: () => void; big?: boolean };

const INK = '#9a3324';

// outlined vine leaf, base at (0,0), pointing up
const LEAF = 'M0 0C-5-3-13-1-18-8-14-11-13-16-17-23-9-22-5-27 0-36 5-27 9-22 17-23 13-16 14-11 18-8 13-1 5-3 0 0Z';
const Leaf: React.FC<{ x: number; y: number; r: number; s: number }> = ({ x, y, r, s }) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
    <path d={LEAF} fill={INK} fillOpacity={0.1} stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />
    <path d="M0 0V-28M0-9-12-17M0-9 12-17" stroke={INK} strokeWidth={1} strokeLinecap="round" opacity={0.6} />
  </g>
);

export const GrapeNav: React.FC = () => {
  const { navigateTo } = useNavigation();
  const { openModal } = useModal();
  const [soon, setSoon] = useState<string | null>(null);

  const rows: Grape[][] = [
    [
      { label: 'მედავით­ნეობა' },
      { label: 'ჩვევები', go: () => openModal('chvevebi') },
    ],
    [
      { label: 'სიმღერა', go: () => navigateTo('simghera'), big: true },
      { label: 'გალობა', go: () => navigateTo('galoba'), big: true },
      { label: 'მთქმელი', go: () => navigateTo('mtkmeli'), big: true },
    ],
    [
      { label: 'საკრა­ვები', go: () => navigateTo('sakravebi') },
      { label: 'თამაშები' },
    ],
    [{ label: 'გაიცანი წინაპრები', go: () => openModal('docFilms') }],
  ];

  const press = (g: Grape) => {
    triggerHaptic(10);
    if (g.go) g.go();
    else setSoon(`„${g.label}“ ჯერ მზადდება — მალე დაემატება`);
  };

  return (
    <div className="@container w-full max-w-md select-none">
      {/* vine line with leaves */}
      <div className="relative">
        <svg viewBox="0 0 400 70" className="block w-full overflow-visible" fill="none" aria-hidden>
          <path d="M4 36H396" stroke={INK} strokeWidth={2} strokeLinecap="round" />
          <path d="M56 36c-4-10 3-17 10-14 5 2 3 9-2 7M344 36c4-10-3-17-10-14-5 2-3 9 2 7" stroke={INK} strokeWidth={1.4} strokeLinecap="round" />
          <Leaf x={28} y={36} r={-62} s={0.75} />
          <Leaf x={86} y={36} r={-30} s={0.95} />
          <Leaf x={314} y={36} r={30} s={0.95} />
          <Leaf x={372} y={36} r={62} s={0.75} />
        </svg>
      </div>

      {/* stem */}
      <svg viewBox="0 0 40 30" className="block w-[10%] mx-auto -mt-[8.5%]" fill="none" aria-hidden>
        <path d="M20 0V30" stroke={INK} strokeWidth={3} strokeLinecap="round" />
      </svg>

      {rows.map((row, ri) => (
        <div key={ri} className={`flex justify-center ${ri > 0 ? '-mt-[3.2%]' : ''}`}>
          {row.map(g => (
            <button
              key={g.label}
              type="button"
              onClick={() => press(g)}
              className={`${g.big ? 'w-[27%]' : 'w-[24%]'} aspect-square rounded-full flex flex-col items-center justify-center px-[2%] text-center border-[3px] border-[#f8f2e7] shadow-[inset_0_0_0_5px_var(--g),inset_0_0_0_6px_rgba(251,243,230,0.35)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 ${
                g.go ? 'bg-[#8e2f22] [--g:#8e2f22] hover:bg-[#74251a] hover:[--g:#74251a]' : 'bg-[#b5695c] [--g:#b5695c] hover:bg-[#a45b4e] hover:[--g:#a45b4e]'
              }`}
            >
              <span className={`font-serif-ge font-bold text-[#fbf3e6] leading-tight hyphens-manual ${g.big ? 'text-[clamp(12px,3.6cqw,17px)]' : g.label.length > 8 ? 'text-[clamp(10px,2.9cqw,14px)]' : 'text-[clamp(11px,3.2cqw,15px)]'}`}>
                {g.label}
              </span>
              {!g.go && (
                <span className="mt-1 text-[clamp(10px,2.8cqw,12px)] text-[#fbf3e6]/85">მალე</span>
              )}
            </button>
          ))}
        </div>
      ))}

      <Toast message={soon || ''} type="info" isVisible={!!soon} onClose={() => setSoon(null)} />
    </div>
  );
};
