import React, { useEffect, useState } from 'react';
import {
  Amphora, Bath, BrickWall, Building2, CableCar, Castle, Check, Clapperboard, Drama, FerrisWheel, FlameKindling, Footprints, Grape,
  HatGlasses, Landmark, Mountain, MountainSnow, Music, PartyPopper, School, Scissors, ShoppingBasket, Snowflake, Star, Store, TrainFront,
  Trees, Trophy, Volleyball, Waves, Wine, X, type LucideIcon,
} from 'lucide-react';
import type { UtskhoIcon, UtskhoPlace } from '../../../data/utskhoPlaces';
import { triggerHaptic } from '../../../utils/haptics';

// „უცხო სოფელში“'s small pieces (2026-11-01): a place's icon, its tile on the board, the villagers' answers, the secret card.

export const PLACE_ICON: Record<UtskhoIcon, LucideIcon> = {
  wine: Wine, grape: Grape, 'party-popper': PartyPopper, castle: Castle, snowflake: Snowflake, music: Music, landmark: Landmark,
  bath: Bath, store: Store, mountain: Mountain, waves: Waves, 'mountain-snow': MountainSnow, 'flame-kindling': FlameKindling,
  'shopping-basket': ShoppingBasket, footprints: Footprints, drama: Drama, clapperboard: Clapperboard, volleyball: Volleyball,
  trophy: Trophy, 'train-front': TrainFront, 'cable-car': CableCar, school: School, 'building-2': Building2, 'brick-wall': BrickWall,
  'ferris-wheel': FerrisWheel, trees: Trees, amphora: Amphora, scissors: Scissors,
};

export const StrangerIcon = HatGlasses;

/** a phone on its side (the screen under 500px tall) */
const SHORT = '(max-height: 500px)';
export const useShort = () => {
  const [short, setShort] = useState(() => window.matchMedia(SHORT).matches);
  useEffect(() => {
    const m = window.matchMedia(SHORT);
    const h = () => setShort(m.matches);
    m.addEventListener('change', h);
    return () => m.removeEventListener('change', h);
  }, []);
  return short;
};

/** the place's icon in its round badge */
export const PlaceBadge: React.FC<{ p: UtskhoPlace; size?: 'sm' | 'md' | 'lg'; tone?: 'wine' | 'green' | 'muted' | 'red' }> = ({ p, size = 'md', tone = 'wine' }) => {
  const Icon = PLACE_ICON[p.icon];
  const box = size === 'lg' ? 'w-16 h-16 rounded-3xl' : size === 'sm' ? 'w-8 h-8 rounded-xl' : 'w-10 h-10 rounded-2xl';
  const ico = size === 'lg' ? 'w-8 h-8' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const look = tone === 'green' ? 'bg-[#2f7d4f] text-white' : tone === 'red' ? 'bg-[#b23a48]/10 text-[#b23a48]' : tone === 'muted' ? 'bg-[#f1e8d9] text-[#b5a58f]' : 'bg-[#7a2028]/[0.08] text-[#7a2028]';
  return <span className={`${box} ${look} inline-flex items-center justify-center shrink-0`} aria-hidden="true"><Icon className={ico} /></span>;
};

/** a place on the stranger's board: open, crossed out by a hint, guessed wrong, found, or shown at the end */
export type PlaceLook = 'open' | 'cut' | 'wrong' | 'right' | 'reveal' | 'plain';

export const PlaceTile: React.FC<{ p: UtskhoPlace; look: PlaceLook; onTap?: () => void }> = ({ p, look, onTap }) => {
  const off = look === 'cut' || look === 'wrong';
  const frame =
    look === 'right' ? 'bg-[#2f7d4f]/[0.09] ring-2 ring-[#2f7d4f]'
    : look === 'reveal' ? 'bg-[#f0d9a0]/40 ring-2 ring-[#b8860b]'
    : look === 'wrong' ? 'bg-[#b23a48]/[0.05] ring-1 ring-[#b23a48]/30'
    : look === 'cut' ? 'bg-[#f6f0e5] ring-1 ring-[#ece2d1]'
    : 'bg-white ring-1 ring-[#e8dcc8]';
  const body = (
    <>
      <PlaceBadge p={p} size="sm" tone={look === 'right' ? 'green' : look === 'wrong' ? 'red' : look === 'cut' ? 'muted' : 'wine'} />
      <span className={`min-w-0 flex-1 text-left text-[14px] font-bold leading-tight break-words ${off ? 'text-[#b5a58f]' : 'text-[#4a3426]'} ${look === 'cut' ? 'line-through decoration-[#c9b99f]' : ''}`}>{p.name}</span>
      {look === 'wrong' && <X className="w-4 h-4 shrink-0 text-[#b23a48]" aria-label="არა" />}
      {look === 'right' && <Check className="w-4 h-4 shrink-0 text-[#2f7d4f]" aria-label="ეს იყო" />}
    </>
  );
  const cls = `min-h-14 w-full rounded-2xl px-2.5 py-2 flex items-center gap-2.5 ${frame}`;
  if (!onTap || off) return <div className={cls}>{body}</div>;
  return (
    <button type="button" onClick={() => { triggerHaptic(6); onTap(); }} className={`${cls} cursor-pointer transition hover:ring-[#7a2028]/40 active:scale-[0.98]`}>
      {body}
    </button>
  );
};

export const PlaceGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">{children}</div>
);

/** the villagers' answers heard so far; once the game is over, the rest too (paler) */
export const Answers: React.FC<{ answers: [string, string][]; shown: number; all?: boolean }> = ({ answers, shown, all }) => (
  <ol className="space-y-2.5">
    {answers.slice(0, all ? answers.length : shown).map(([q, a], i) => {
      const heard = i < shown;
      return (
        <li key={i} className={`flex gap-2.5 ${heard ? '' : 'opacity-55'}`}>
          <span className={`mt-0.5 w-6 h-6 shrink-0 rounded-full text-[12px] font-bold tabular-nums inline-flex items-center justify-center ${heard ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-[#e6dccb] text-[#75685a]'}`}>{i + 1}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold leading-snug text-[#9a8b7b]">— {q}</p>
            <p className="mt-1 rounded-2xl rounded-tl-md bg-white ring-1 ring-[#e8dcc8] px-3.5 py-2 font-serif-ge text-[16px] leading-snug text-[#4a3426]">
              — {a}
            </p>
          </div>
        </li>
      );
    })}
  </ol>
);

/**
 * the secret card on one phone: the place and a role, or „უცხო ხარ“. Both look the same from afar (the same paper, the
 * same big icon and line) — a darker card would tell the table who the stranger is.
 */
export const SecretCard: React.FC<{ place: UtskhoPlace | undefined; role: string; name: string }> = ({ place, role, name }) => {
  const stranger = !role || !place;
  const Icon = stranger ? StrangerIcon : PLACE_ICON[place.icon];
  const short = useShort();
  const badge = <span className={`${short ? '' : 'mx-auto '}w-20 h-20 shrink-0 rounded-[26px] bg-[#7a2028]/[0.08] text-[#7a2028] flex items-center justify-center`} aria-hidden="true"><Icon className="w-10 h-10" /></span>;
  if (short) {
    // a phone on its side: the icon beside the words, so the card fits the screen
    return (
      <div className="w-full max-w-2xl mx-auto rounded-[28px] bg-white ring-1 ring-[#e8dcc8] shadow-[0_16px_40px_-24px_rgba(74,52,38,0.55)] px-5 py-4 flex items-center gap-5">
        {badge}
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[13px] font-bold text-[#9a8b7b]">{name}, შენი ბარათი · {stranger ? 'შენ ხარ' : 'ადგილი'}</p>
          <p className="font-serif-ge text-[30px] font-bold leading-tight text-[#7a2028] [overflow-wrap:anywhere]">{stranger ? 'უცხო!' : place.name}</p>
          {!stranger && <p className="text-[15px] text-[#4a3426]">შენი როლი: <b>{role}</b></p>}
          <p className="text-[13.5px] leading-snug text-[#75685a]">
            {stranger ? 'არ იცი, სად ხართ. უსმინე, ისე უპასუხე, რომ არ გამოჩნდე. მიხვდი ადგილს? დააჭირე „უცხო ვარ“ და თქვი.' : 'უპასუხე ისე, რომ სოფლელებმა იცნონ, რომ იცი — უცხომ კი ვერ მიხვდეს, სად ხართ.'}
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="w-full max-w-md mx-auto rounded-[28px] bg-white ring-1 ring-[#e8dcc8] shadow-[0_16px_40px_-24px_rgba(74,52,38,0.55)] px-5 py-6 text-center space-y-3">
      <p className="text-[13px] font-bold text-[#9a8b7b]">{name}, შენი ბარათი</p>
      {badge}
      {stranger ? (
        <>
          <p className="text-[13px] font-bold text-[#9a8b7b]">შენ ხარ</p>
          <p className="font-serif-ge text-[34px] font-bold leading-tight text-[#7a2028]">უცხო!</p>
          <p className="text-[14.5px] leading-snug text-[#4a3426]">
            არ იცი, სად ხართ. უსმინე კითხვებსა და პასუხებს, ისე უპასუხე, რომ არ გამოჩნდე. მიხვდი ადგილს? დააჭირე „უცხო ვარ“ და თქვი.
          </p>
        </>
      ) : (
        <>
          <p className="text-[13px] font-bold text-[#9a8b7b]">ადგილი</p>
          <p className="font-serif-ge text-[34px] font-bold leading-tight text-[#7a2028] [overflow-wrap:anywhere]">{place.name}</p>
          <p className="text-[15px] text-[#4a3426]">შენი როლი: <b>{role}</b></p>
          <p className="text-[14px] leading-snug text-[#75685a]">უპასუხე ისე, რომ სოფლელებმა იცნონ, რომ იცი — უცხომ კი ვერ მიხვდეს, სად ხართ.</p>
        </>
      )}
    </div>
  );
};

/** the stars of a game alone */
export const Stars: React.FC<{ n: number }> = ({ n }) => (
  <span className="inline-flex gap-0.5" aria-label={`${n} ვარსკვლავი`}>
    {[0, 1, 2].map(i => <Star key={i} className={`w-5 h-5 ${i < n ? 'fill-[#d9a21b] text-[#d9a21b]' : 'text-[#d8c9b0]'}`} aria-hidden="true" />)}
  </span>
);
