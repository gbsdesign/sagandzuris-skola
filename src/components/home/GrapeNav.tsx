import React, { useState } from 'react';
import { useNavigation, useModal, useAuth } from '../../context';
import { openPathPanel } from '../views/IndependentWorkCard';
import { triggerHaptic } from '../../utils/haptics';
import { Toast } from '../ui/Toast';

// Home menu drawn on the vine-and-qvevri picture: light parchment labels hang under the grape
// clusters, sit on the leaves and on the qvevri, and sway gently. Labels without `go` are not built yet.
// x/y are the label's centre in % of the picture (public/home/vine.png, 1033×1390).
// nx/ny: the same spot on a phone, where the labels keep a readable size on a smaller picture and would touch;
// they stay on the same leaf / cluster, only spread apart (from a 448px-wide picture up, x/y apply).
type Spot = { label: string; x: number; y: number; nx?: number; ny?: number; go?: () => void; big?: boolean; hero?: boolean };

const VINE = '/home/vine.png';

export const GrapeNav: React.FC = () => {
  const { navigateTo } = useNavigation();
  const { openModal } = useModal();
  const { user } = useAuth();
  const [soon, setSoon] = useState<string | null>(null);

  const spots: Spot[] = [
    // under the grape clusters
    { label: 'სიმღერა', x: 13, y: 36, nx: 18, ny: 43, go: () => navigateTo('simghera'), big: true },
    // chant, the main path, stands biggest at the heart of the vine
    { label: 'გალობა', x: 57, y: 31, nx: 56, ny: 33, go: () => navigateTo('galoba'), hero: true },
    { label: 'მთქმელი', x: 50, y: 58, nx: 47, ny: 59, go: () => navigateTo('mtkmeli'), big: true },
    { label: 'საკრავები', x: 70, y: 48, nx: 73, ny: 48, go: () => navigateTo('sakravebi') },
    // on the leaves
    // the psalter group ("ფსალმუნთა ჯგუფი")
    { label: 'მედავით­ნეობა', x: 35, y: 13, nx: 29, ny: 14, go: () => navigateTo('psalter') },
    // signed in: habits fold open on the path page; guests get the sign-in prompt
    { label: 'ჩვევები', x: 62, y: 8, nx: 66, ny: 8, go: () => (user ? (openPathPanel('habits'), navigateTo('gz')) : openModal('chvevebi')) },
    { label: 'თამაშები', x: 86, y: 28, nx: 83, ny: 20 },
    // in the qvevri
    { label: 'გაიცანი წინაპრები', x: 51, y: 82, go: () => navigateTo('tsinaprebi') },
  ];

  const press = (s: Spot) => {
    triggerHaptic(10);
    if (s.go) s.go();
    else setSoon(`„${s.label}“ ჯერ მზადდება — მალე დაემატება`);
  };

  return (
    <div className="@container w-full max-w-lg select-none">
      <div className="relative w-full aspect-[1033/1390]">
        {/* Softened so the vine stays a backdrop and the labels lead the eye */}
        <img
          src={VINE}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full opacity-75 [filter:saturate(0.8)_contrast(0.85)_sepia(0.15)]"
          draggable={false}
        />

        {spots.map((s, i) => (
          <button
            key={s.label}
            type="button"
            onClick={() => press(s)}
            style={{ '--x': `${s.x}%`, '--y': `${s.y}%`, '--nx': `${s.nx ?? s.x}%`, '--ny': `${s.ny ?? s.y}%`, animationDelay: `${-i * 0.7}s` } as React.CSSProperties}
            className="vine-sway absolute left-[var(--nx)] top-[var(--ny)] @md:left-[var(--x)] @md:top-[var(--y)] -translate-x-1/2 -translate-y-1/2 cursor-pointer focus-visible:outline-none group"
          >
            <span
              className={`flex flex-col items-center justify-center rounded-full text-center transition-[transform,background-color] duration-200 group-hover:scale-105 group-active:scale-95 group-focus-visible:ring-4 group-focus-visible:ring-amber-300 ${
                s.hero ? 'px-[1.1em] py-[0.45em] min-h-12' : 'px-[0.9em] py-[0.35em] min-h-9'
              } ${
                s.go
                  ? 'bg-[#7a2028] text-[#fbf6ec] border-2 border-[#fbf6ec] shadow-[0_3px_10px_rgba(74,52,38,0.35)] group-hover:bg-[#5e1820]'
                  : 'bg-[#fbf6ec] text-[#75685a] border border-dashed border-[#8a7a6a]/70'
              }`}
            >
              <span
                className={`font-serif-ge font-bold leading-tight hyphens-manual max-w-[6.5em] ${
                  // the smallest phones (~320px wide) have no room left: there only, a touch smaller
                  s.hero ? 'text-[clamp(20px,6cqw,30px)] @max-[300px]:text-[18px] tracking-wide' : s.big ? 'text-[clamp(14px,3.8cqw,18px)] @max-[300px]:text-[13px]' : 'text-[clamp(12px,3.2cqw,15px)] @max-[300px]:text-[11px]'
                }`}
              >
                {s.label}
              </span>
              {!s.go && <span className="text-[clamp(10px,2.5cqw,12px)] leading-tight opacity-80">მალე</span>}
            </span>
          </button>
        ))}
      </div>

      <Toast message={soon || ''} type="info" isVisible={!!soon} onClose={() => setSoon(null)} />
    </div>
  );
};
