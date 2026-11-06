import React, { useState } from 'react';
import { useNavigation, useModal, useAuth } from '../../context';
import { openPathPanel } from '../views/IndependentWorkCard';
import { triggerHaptic } from '../../utils/haptics';
import { Toast } from '../ui/Toast';
import { useAccess } from '../../hooks/useAccess';
import { askSignIn } from '../access/SignInPrompt';
import { SectionId } from '../../data/sections';
import { GraduationCap } from 'lucide-react';

// Home menu drawn on the vine-and-qvevri picture: light parchment labels hang under the grape
// clusters, sit on the leaves and on the qvevri, and sway gently. Labels without `go` are not built yet.
// x/y are the label's centre in % of the picture (public/home/vine.png, 1033×1390).
// nx/ny: the same spot on a phone, where the labels keep a readable size on a smaller picture and would touch;
// they stay on the same leaf / cluster, only spread apart (from a 448px-wide picture up, x/y apply).
type Spot = { id: SectionId; label: string; x: number; y: number; nx?: number; ny?: number; go?: () => void; big?: boolean; hero?: boolean };

const VINE = '/home/vine.png';

export const GrapeNav: React.FC = () => {
  const { navigateTo } = useNavigation();
  const { openModal } = useModal();
  const { user } = useAuth();
  const access = useAccess();
  const [soon, setSoon] = useState<string | null>(null);

  const spots: Spot[] = [
    // under the grape clusters
    { id: 'simghera', label: 'სიმღერა', x: 13, y: 36, nx: 18, ny: 43, go: () => navigateTo('simghera'), big: true },
    // chant, the main path, stands biggest at the heart of the vine
    { id: 'galoba', label: 'გალობა', x: 57, y: 31, nx: 56, ny: 33, go: () => navigateTo('galoba'), hero: true },
    { id: 'mtkmeli', label: 'მთქმელი', x: 50, y: 58, nx: 47, ny: 61, go: () => navigateTo('mtkmeli'), big: true },
    { id: 'sakravebi', label: 'საკრავები', x: 70, y: 48, nx: 73, ny: 51, go: () => navigateTo('sakravebi') },
    // on the leaves
    // მედავითნეობა — the reader's course (not the psalter group)
    { id: 'medavitneobaTopic', label: 'მედავით­ნეობა', x: 35, y: 13, nx: 29, ny: 14, go: () => navigateTo('medavitneoba') },
    // signed in: habits fold open on the path page; guests get the sign-in prompt
    { id: 'chvevebi', label: 'ჩვევები', x: 62, y: 8, nx: 66, ny: 8, go: () => (user ? (openPathPanel('habits'), navigateTo('gz')) : openModal('chvevebi')) },
    { id: 'tamashebi', label: 'თამაშები', x: 86, y: 28, nx: 83, ny: 20, go: () => navigateTo('games') },
    // in the qvevri
    { id: 'tsinaprebi', label: 'გაიცანი წინაპრები', x: 51, y: 82, go: () => navigateTo('tsinaprebi') },
  ];

  // the admin's switches, the kids' mode and the guest's limits decide what each label does
  const shown = spots
    .map(s => ({ ...s, access: access.section(s.id) }))
    .filter(s => s.access !== 'hidden')
    .map(s => (s.access === 'soon' ? { ...s, go: undefined } : s));

  const galobaOpen = shown.some(s => s.id === 'galoba' && s.access === 'open') && access.on('abituri');

  const press = (s: (typeof shown)[number]) => {
    triggerHaptic(10);
    if (s.access === 'locked') askSignIn(s.label.replace('\u00ad', ''));
    else if (s.go) s.go();
    else setSoon(`„${s.label.replace('\u00ad', '')}“ ჯერ მზადდება — მალე დაემატება`);
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

        {shown.map((s, i) => {
          const vars = { '--x': `${s.x}%`, '--y': `${s.y}%`, '--nx': `${s.nx ?? s.x}%`, '--ny': `${s.ny ?? s.y}%`, animationDelay: `${-i * 0.7}s` } as React.CSSProperties;
          const place = 'vine-sway absolute left-[var(--nx)] top-[var(--ny)] @md:left-[var(--x)] @md:top-[var(--y)] -translate-x-1/2 -translate-y-1/2';
          const label = (
            <button
              key={s.label}
              type="button"
              onClick={() => press(s)}
              style={s.id === 'galoba' && galobaOpen ? undefined : vars}
              className={`${s.id === 'galoba' && galobaOpen ? 'relative z-10 block' : place} cursor-pointer focus-visible:outline-none group`}
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
                {!s.go && <span className="text-[clamp(11px,2.5cqw,12px)] leading-tight opacity-80">მალე</span>}
              </span>
            </button>
          );
          if (!(s.id === 'galoba' && galobaOpen)) return label;
          // „აბიტურიენტს“ hangs right under „გალობა“, its left corner at გალობა's (2026-11-06, the user: „საკრავს ეფარება,
          // აწიე მაღლა და გალობის ფანჯარას მიადე ლამაზად მარცხენა კუთხით“): one swaying group, „გალობა“ stays centred on its
          // spot and the small label, out of the flow, tucks under its edge
          return (
            <div key={s.label} style={vars} className={place}>
              {label}
              <button
                type="button"
                onClick={() => { triggerHaptic(10); navigateTo('abituri'); }}
                className="absolute left-3 top-full -mt-3 cursor-pointer focus-visible:outline-none group/abituri"
              >
                <span className="inline-flex items-center gap-1.5 min-h-9 pt-2 px-3 rounded-b-2xl rounded-t-md bg-[#fbf6ec] text-[#7a2028] border-[1.5px] border-t-0 border-[#7a2028]/60 shadow-[0_4px_10px_-4px_rgba(74,52,38,0.35)] whitespace-nowrap transition-[transform,background-color] duration-200 group-hover/abituri:bg-white group-active/abituri:scale-95 group-focus-visible/abituri:ring-4 group-focus-visible/abituri:ring-amber-300">
                  <GraduationCap className="w-4 h-4 shrink-0" />
                  <span className="font-serif-ge font-bold leading-tight text-[clamp(12px,3.2cqw,14px)] @max-[300px]:text-[11px]">აბიტურიენტს</span>
                </span>
              </button>
            </div>
          );
        })}
      </div>

      <Toast message={soon || ''} type="info" isVisible={!!soon} onClose={() => setSoon(null)} />
    </div>
  );
};
