import React from 'react';
import { SAMOSI_ASPECT, SAMOSI_FIGURE, SAMOSI_PARTS, samosiLayer, samosiThumb, type SamosiPart, type SamosiPhoto } from '../../../data/samosiData';
import { KABA_PARTS } from '../../../data/kabaData';
import { KabaFigure } from '../../../components/views/KabaFigure';
import { useKabaArt, useKabaSettings, type KabaHead, type KabaPiece } from '../../../utils/kabaArt';
import { useAuth } from '../../../context';
import { HAT, HATS, stepsOf, type Outfit } from '../../../utils/chaitsvi';

// „ჩაიცვი ქართულად“'s figure: „ჩემი სამოსი“'s pale chokha with each part put on in colour over it (its own photos, undyed), the
// game's hat above the collar; or the owner's published dress (KabaFigure). The tray's pictures and the parts' stories too.

const HEAD_ROOM = 72; // as „ჩემი სამოსი“: the room over the collar, in % of the figure's width
const LAYERS = SAMOSI_PARTS.filter(p => !p.art && !p.photo).map(p => p.id);

/** the game's hat: one of the four, the papakha in one of its kinds */
export interface HatPick { id: string; kind?: string }
export const pickHat = (seed: number): HatPick => {
  const id = HATS[Math.abs(seed) % HATS.length];
  const part = SAMOSI_PARTS.find(p => p.id === id);
  const kinds = part?.kinds ?? [];
  return kinds.length ? { id, kind: kinds[Math.floor(Math.abs(seed) / HATS.length) % kinds.length].id } : { id };
};
const hatPartOf = (h: HatPick) => SAMOSI_PARTS.find(p => p.id === h.id) ?? SAMOSI_PARTS.find(p => p.head)!;
const hatPhotoOf = (h: HatPick): SamosiPhoto => {
  const p = hatPartOf(h);
  return p.kinds?.find(k => k.id === h.kind)?.photo ?? p.photo!;
};

export interface PartLook { id: string; label: string; story: string; thumb: string | null }
/** a step's part as the tray and the stories show it */
export const partLook = (outfit: Outfit, id: string, hat: HatPick, kaba: KabaArt | null): PartLook => {
  if (outfit === 'kaba') {
    const p = KABA_PARTS.find(k => k.id === id)!;
    return { id, label: p.label, story: p.story, thumb: kaba?.pieces[id]?.thumb ?? kaba?.pieces[id]?.url ?? null };
  }
  if (id === HAT) {
    const p = hatPartOf(hat);
    return { id, label: p.label, story: p.story, thumb: hatPhotoOf(hat).src };
  }
  const p = SAMOSI_PARTS.find(s => s.id === id) as SamosiPart;
  return { id, label: p.label, story: p.story, thumb: samosiThumb(id) };
};
export const labelOf = (outfit: Outfit, id: string, hat: HatPick) => partLook(outfit, id, hat, null).label;

/** the dress's pictures when members may see them (or the owner, who makes them); null = the chokha only */
export interface KabaArt { pieces: Record<string, KabaPiece>; head: KabaHead }
export const useKaba = (): KabaArt | null => {
  const { isOwner } = useAuth();
  const settings = useKabaSettings();
  const on = settings.published || isOwner;
  const pieces = useKabaArt(on);
  if (!on || !pieces?.full || !stepsOf('kaba').every(s => pieces[s.id])) return null;
  return { pieces, head: settings.head };
};

export const Doll: React.FC<{
  outfit: Outfit;
  on: readonly string[];
  hat: HatPick;
  kaba: KabaArt | null;
  /** a part's count of drops, so each new one plays its drop again */
  drops?: Record<string, number>;
  done?: boolean;
}> = ({ outfit, on, hat, kaba, drops = {}, done = false }) => {
  const has = (id: string) => on.includes(id);
  if (outfit === 'kaba' && kaba) {
    return <KabaFigure pieces={kaba.pieces} on={has} drops={drops} shine={done ? 1 : null} place={kaba.head} />;
  }
  const photo = hatPhotoOf(hat);
  return (
    <div className="relative mx-auto w-full">
      <div aria-hidden className="relative" style={{ paddingTop: `${HEAD_ROOM}%` }}>
        <img
          key={`hat-${drops[HAT] || 0}`}
          src={photo.src}
          alt=""
          draggable={false}
          className={`absolute h-auto pointer-events-none transition-opacity duration-300 ${has(HAT) && drops[HAT] ? 'samosi-drop' : ''}`}
          style={{ left: `${photo.place.left}%`, top: `${(photo.place.top / HEAD_ROOM) * 100}%`, width: `${photo.place.width}%`, opacity: has(HAT) ? 1 : 0 }}
        />
      </div>
      <div
        className="relative"
        style={{ aspectRatio: `${SAMOSI_ASPECT}`, WebkitMaskImage: 'linear-gradient(#000 84%, transparent)', maskImage: 'linear-gradient(#000 84%, transparent)' }}
      >
        <img src={SAMOSI_FIGURE} alt="" aria-hidden draggable={false} className="absolute inset-0 w-full h-full grayscale contrast-90 opacity-20" />
        {LAYERS.map(id => (
          <img
            key={`${id}-${drops[id] || 0}`}
            src={samosiLayer(id)}
            alt=""
            aria-hidden
            draggable={false}
            className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${has(id) && drops[id] ? 'samosi-drop' : ''}`}
            style={{ opacity: has(id) ? 1 : 0 }}
          />
        ))}
        {done && (
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none samosi-shine"
            style={{ WebkitMaskImage: `url(${SAMOSI_FIGURE})`, WebkitMaskSize: '100% 100%', maskImage: `url(${SAMOSI_FIGURE})`, maskSize: '100% 100%' }}
          />
        )}
      </div>
    </div>
  );
};

/** a part's picture in a round frame */
export const PartPic: React.FC<{ look: PartLook; className?: string }> = ({ look, className = 'w-12 h-12' }) => (
  <span className={`shrink-0 rounded-xl bg-white ring-1 ring-[#eadfcb] flex items-center justify-center overflow-hidden ${className}`}>
    {look.thumb && <img src={look.thumb} alt="" draggable={false} className="w-[86%] h-[86%] object-contain" />}
  </span>
);
