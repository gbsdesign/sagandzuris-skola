import React from 'react';
import { KABA_HEAD, KABA_LAYERS } from '../../data/kabaData';
import { KABA_HEAD_DEFAULT, KabaHead, KabaPiece } from '../../utils/kabaArt';

// The kaba coming together, as the chokha does: a pale ghost of the whole dress, each collected part in colour over
// it, the headdress above the collar. Shared by the member's „ჩემი სამოსი“ and the owner's studio preview.
export const KabaFigure: React.FC<{
  pieces: Record<string, KabaPiece>;
  on: (id: string) => boolean;
  drops?: Record<string, number>;
  shine?: number | null;
  place?: KabaHead;
}> = ({ pieces, on, drops = {}, shine = null, place = KABA_HEAD_DEFAULT }) => {
  const full = pieces.full;
  if (!full) return null;
  const head = pieces[KABA_HEAD.id];
  return (
    <div className="relative mx-auto" style={{ width: 'clamp(150px, calc(100% - 150px), 240px)' }}>
      {/* the room over the collar, with the headdress where it would sit on a head */}
      <div aria-hidden className="relative" style={{ paddingTop: '58%' }}>
        {head && (
          <img
            key={`${KABA_HEAD.id}-${drops[KABA_HEAD.id] || 0}`}
            src={head.url}
            alt=""
            draggable={false}
            className={`absolute left-1/2 -translate-x-1/2 h-auto pointer-events-none transition-opacity duration-300 ${on(KABA_HEAD.id) && drops[KABA_HEAD.id] ? 'samosi-drop' : ''}`}
            // the room is 58% of the width tall, so a % of the width is that share of the room's height
            style={{ bottom: `${(-place.y / 58) * 100}%`, width: `${place.w}%`, opacity: on(KABA_HEAD.id) ? 1 : 0 }}
          />
        )}
      </div>
      <div
        className="relative"
        style={{ aspectRatio: `${full.w / full.h}`, WebkitMaskImage: 'linear-gradient(#000 86%, transparent)', maskImage: 'linear-gradient(#000 86%, transparent)' }}
      >
        <img src={full.url} alt="" aria-hidden draggable={false} className="absolute inset-0 w-full h-full grayscale contrast-90 opacity-20" />
        {KABA_LAYERS.map(p => pieces[p.id] && (
          <img
            key={`${p.id}-${drops[p.id] || 0}`}
            src={pieces[p.id].url}
            alt=""
            aria-hidden
            draggable={false}
            className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${on(p.id) && drops[p.id] ? 'samosi-drop' : ''}`}
            style={{ opacity: on(p.id) ? 1 : 0 }}
          />
        ))}
        {shine != null && (
          <div
            key={shine}
            aria-hidden
            className="absolute inset-0 pointer-events-none samosi-shine"
            style={{ WebkitMaskImage: `url(${full.url})`, WebkitMaskSize: '100% 100%', maskImage: `url(${full.url})`, maskSize: '100% 100%' }}
          />
        )}
      </div>
    </div>
  );
};
