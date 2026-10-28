import React, { useEffect } from 'react';
import { Gift, X } from 'lucide-react';
import { SAMOSI_COLORS, SAMOSI_DEFAULT_COLOR, SAMOSI_DYED, SAMOSI_PARTS, samosiHex, samosiPhotoOf, samosiThumb } from '../../data/samosiData';
import { DyeWay, useSamosiSrc } from '../../utils/samosiDye';
import { GIFT_EVERY, giftPartLabel, joinGe } from '../../utils/pearlGifts';
import { OutfitLook, usePearlGifts } from '../../hooks/usePearlGifts';
import { fireworks } from '../../utils/samosiFireworks';
import { SamosiArt } from '../views/SamosiArt';
import { Btn, IconBtn } from '../ui/kit';

// „ჯილდო სამოსისთვის“ (utils/pearlGifts.ts): the path page's card for parts the pearls have just given
// (PearlGiftBanner, which also adds them) and the pearls panel's line on the way to the next one (NextGiftLine).

const COLOR_IDS = new Set(SAMOSI_COLORS.map(c => c.id));

// A picture dyed into the member's colour; an empty box of the same size while it dyes
const Dyed: React.FC<{ src: string; dye: string | null; way?: DyeWay; className?: string }> = ({ src, dye, way, className }) => {
  const url = useSamosiSrc(src, dye, way);
  return url ? <img src={url} alt="" aria-hidden draggable={false} className={className} /> : <span aria-hidden className={`block ${className || ''}`} />;
};

/** A part's picture in the member's colours, as its tile in „ჩემი სამოსი“ shows it (a kaba part: a gift box — its
 *  pictures are the owner's and live only in the kaba itself). */
export const GiftPartPic: React.FC<{ id: string; look: OutfitLook; className?: string }> = ({ id, look, className = 'w-9 h-9' }) => {
  const part = SAMOSI_PARTS.find(p => p.id === id);
  if (!part) return <Gift className="w-6 h-6 text-[#9a6a1c]" aria-hidden />;
  if (part.art) return <SamosiArt kind={part.art} className={className} />;
  const color = COLOR_IDS.has(look.color) ? look.color : SAMOSI_DEFAULT_COLOR;
  const own = (k: string) => (COLOR_IDS.has(look.colors[k]) ? look.colors[k] : color);
  const photo = samosiPhotoOf(part, look.kinds);
  if (photo) {
    const c = own(part.shoulder ? 'papanaki' : 'kudi');
    return c === photo.native
      ? <Dyed src={photo.src} dye={null} className={`object-contain ${className}`} />
      : <Dyed src={photo.src} dye={samosiHex(c)} way={{ range: photo.range, base: photo.native ? samosiHex(photo.native) : undefined }} className={`object-contain ${className}`} />;
  }
  const c = id === 'akhalukhi' ? own('akhalukhi') : color;
  return <Dyed src={samosiThumb(id)} dye={SAMOSI_DYED.has(id) && c !== SAMOSI_DEFAULT_COLOR ? samosiHex(c) : null} className={className} />;
};

/** The path page's gold card: „ჯილდო მარგალიტებისთვის!“ for the parts given and not yet seen, with fireworks. It is
 *  also where the parts owed are added. `onShow` opens „სამოსი“. */
export const PearlGiftBanner: React.FC<{ onShow: () => void }> = ({ onShow }) => {
  const g = usePearlGifts(true);
  const key = g.unseen.join(',');
  useEffect(() => {
    if (key) fireworks(false);
  }, [key]);
  if (!g.unseen.length) return null;
  const last = g.unseen[g.unseen.length - 1];
  const onChokha = SAMOSI_PARTS.some(p => p.id === last);
  return (
    <section
      aria-live="polite"
      className="sg-in w-full flex items-start gap-3 rounded-2xl pl-3 pr-1.5 py-3 bg-gradient-to-br from-[#fbf0d8] to-[#f3dfb4] ring-1 ring-[#d9b46a] shadow-[0_8px_18px_-12px_rgba(154,116,56,0.8)]"
    >
      <span className="relative w-14 h-14 shrink-0 rounded-xl bg-white/80 ring-1 ring-[#d9b46a]/60 flex items-center justify-center">
        <GiftPartPic id={last} look={g.look} className="w-11 h-11" />
        {g.unseen.length > 1 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-[#7a2028] text-white text-[11px] font-bold flex items-center justify-center ring-2 ring-[#fbf0d8]">
            {g.unseen.length}
          </span>
        )}
      </span>
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-[15px] font-black leading-tight text-[#5a3d14]">ჯილდო მარგალიტებისთვის!</p>
        <p className="mt-1 text-[14px] leading-snug text-[#5a3d14]">
          {onChokha ? 'ჩოხას' : 'კაბას'} დაემატა: <b>{joinGe(g.unseen.map(giftPartLabel))}</b>
        </p>
        <p className="mt-0.5 text-[12px] leading-snug text-[#7a5a26]">ყოველი {GIFT_EVERY} ბრწყინავი მარგალიტი — ერთი ახალი ნაწილი</p>
        <Btn kind="primary" size="sm" className="mt-2.5" onClick={() => { g.markSeen(); onShow(); }}>
          {onChokha ? 'ჩოხის ნახვა' : 'კაბის ნახვა'}
        </Btn>
      </div>
      <IconBtn label="დახურვა" className="text-[#9a7a4a]" onClick={g.markSeen}><X /></IconBtn>
    </section>
  );
};

/** The pearls panel's line: the next part and how many more pearls must shine for it (five dots, gold as they do). */
export const NextGiftLine: React.FC = () => {
  const g = usePearlGifts();
  if (!g.ready || !g.next.part) return null;
  const filled = Math.max(0, GIFT_EVERY - g.next.left);
  // more than five to go once a teacher took some back
  const label = g.next.left > GIFT_EVERY ? `კიდევ ${g.next.left}` : `${filled} / ${GIFT_EVERY}`;
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] pl-2 pr-3 py-2">
      <span className="w-11 h-11 shrink-0 rounded-xl bg-white ring-1 ring-[#e8dcc8] flex items-center justify-center">
        <GiftPartPic id={g.next.part} look={g.look} className="w-9 h-9" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[13px] font-bold leading-snug text-[#4a3426]">შემდეგი ჯილდო: {giftPartLabel(g.next.part)}</span>
        <span className="block text-[12px] leading-snug text-[#8a7a6a]">
          {g.outfit === 'kaba' ? 'კაბის' : 'ჩოხის'} ახალი ნაწილი ყოველ {GIFT_EVERY} ბრწყინავ მარგალიტზე
        </span>
      </span>
      <span className="shrink-0 flex flex-col items-end gap-1" role="img" aria-label={`ბრწყინავს ${label}`}>
        <span className="flex gap-1">
          {Array.from({ length: GIFT_EVERY }, (_, i) => (
            <span key={i} className={`w-2.5 h-2.5 rounded-full ${i < filled ? 'bg-[#c9962a] shadow-[0_0_0_2px_rgba(201,150,42,0.2)]' : 'bg-[#e3d6c1]'}`} />
          ))}
        </span>
        <span className="text-[12px] font-bold tabular-nums text-[#7a5a26]">{label}</span>
      </span>
    </div>
  );
};
