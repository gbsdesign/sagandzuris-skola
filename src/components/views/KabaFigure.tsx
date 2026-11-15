import React from 'react';
import { KABA_HEADS, KABA_LAYERS, KabaPart } from '../../data/kabaData';
import { KabaHeads, KabaPiece, kabaHeadPlace } from '../../utils/kabaArt';

const ROOM = 58; // the room over the collar, in % of the figure's width

// The kaba coming together, as the chokha does: a pale ghost of the whole dress, each collected part in colour over
// it, the headdresses above the collar — the veil behind the dress, the kerchief (it falls onto the shoulders) over
// it. Shared by the member's „ჩემი სამოსი“ and the owner's studio preview.
export const KabaFigure: React.FC<{
  pieces: Record<string, KabaPiece>;
  on: (id: string) => boolean;
  drops?: Record<string, number>;
  shine?: number | null;
  places?: KabaHeads;
}> = ({ pieces, on, drops = {}, shine = null, places }) => {
  const full = pieces.full;
  if (!full) return null;
  // a headdress where it would sit on a head
  const headPic = (p: KabaPart) => {
    const pic = pieces[p.id];
    if (!pic) return null;
    const place = kabaHeadPlace(places, p.id);
    return (
      <img
        key={`${p.id}-${drops[p.id] || 0}`}
        src={pic.url}
        alt=""
        draggable={false}
        className={`absolute left-1/2 -translate-x-1/2 h-auto pointer-events-none transition-opacity duration-300 ${on(p.id) && drops[p.id] ? 'samosi-drop' : ''}`}
        // the room is 58% of the width tall, so a % of the width is that share of the room's height
        style={{ bottom: `${(-place.y / ROOM) * 100}%`, width: `${place.w}%`, opacity: on(p.id) ? 1 : 0 }}
      />
    );
  };
  return (
    <div className="relative mx-auto" style={{ width: 'clamp(150px, calc(100% - 150px), 240px)' }}>
      {/* the room over the collar */}
      <div aria-hidden className="relative" style={{ paddingTop: `${ROOM}%` }}>
        {KABA_HEADS.filter(p => !p.over).map(headPic)}
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
      {/* the same room again, laid over the dress: what falls onto the shoulders covers them */}
      <div aria-hidden className="absolute inset-x-0 top-0 pointer-events-none" style={{ paddingTop: `${ROOM}%` }}>
        {KABA_HEADS.filter(p => p.over).map(headPic)}
      </div>
    </div>
  );
};
