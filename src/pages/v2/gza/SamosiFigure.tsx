import React from 'react';
import { Check } from 'lucide-react';
import { cx } from '../../../components/ui2';
import { SamosiArt } from '../../../components/views/SamosiArt';
import { KabaFigure } from '../../../components/views/KabaFigure';
import { SAMOSI_ASPECT, SAMOSI_FIGURE, SAMOSI_PARTS, SamosiPart, SamosiPhoto, samosiLayer } from '../../../data/samosiData';
import type { KabaHeads, KabaPiece } from '../../../utils/kabaArt';
import { DyeWay, useSamosiSrc } from '../../../utils/samosiDye';

// „ჩემი სამოსი“'s figures in the new look (board x-samosi): the chokha coming together part by part — a pale mannequin,
// each part on it dropping into place in its colour, the hat above the collar, the boots in a round slot beside it — and
// the kaba (the old KabaFigure). The same layers as the old ChemiSamosi; only the frame is new: the figure stands big
// in the middle of the white card, a fixed height tall.

/** the room above the collar for the hat, in % of the figure's width (the hats' places in samosiData are measured in it) */
const HEAD_ROOM = 72;
/** its top that no hat reaches (every hat's top is lower), cut off so the figure itself is bigger in the card */
const ROOM_CUT = 12.5;
const ROOM = HEAD_ROOM - ROOM_CUT;
/** the chokha figure's height in its widths: the room + the photo */
const TALL = ROOM / 100 + 1 / SAMOSI_ASPECT;
const PHOTO_PARTS = SAMOSI_PARTS.filter(p => !p.art && !p.photo);
const SHOULDER_PARTS = SAMOSI_PARTS.filter(p => p.shoulder && p.photo);
const SLOT_PARTS = SAMOSI_PARTS.filter(p => p.art && !p.head);
// the fading hem, so the figure ends softly in the card
const HEM = 'linear-gradient(black 84%, transparent)';

/** how a part's own photo is dyed: `dye` null keeps the photo's colour */
export type SamosiLook = { dye: string | null; way?: DyeWay };

/** A picture of the outfit dyed into its colour; an empty box of the same size while it dyes. */
export const SamosiPic: React.FC<{ src: string; dye: string | null; way?: DyeWay; className?: string; style?: React.CSSProperties }> = ({
  src, dye, way, className, style,
}) => {
  const url = useSamosiSrc(src, dye, way);
  if (!url) return <span aria-hidden="true" className={cx('block', className)} style={style} />;
  return <img src={url} alt="" aria-hidden="true" draggable={false} className={className} style={style} />;
};

export interface ChokhaFigureProps {
  /** the parts shown on the figure */
  on: (id: string) => boolean;
  /** how many times each part dropped in this visit: a new number replays its drop */
  drops: Record<string, number>;
  /** a layer of the chokha photo in its colour (null = the photo's own blue) */
  dyeOf: (id: string) => string | null;
  /** the papanaki's and the hats' own photo in their colour */
  lookOf: (part: SamosiPart) => SamosiLook;
  /** a part's own photo in the member's kind of it (the papakha's two) */
  photoOf: (part: SamosiPart) => SamosiPhoto | undefined;
  /** the hat on the head */
  worn?: SamosiPart;
  /** every part on: the shine runs across it (`shine` replays it) */
  complete: boolean;
  shine: number;
  /** the figure's height in px, the hat's room included */
  height: number;
}

/** The chokha, centred, `height` px tall. */
export const ChokhaFigure: React.FC<ChokhaFigureProps> = ({ on, drops, dyeOf, lookOf, photoOf, worn, complete, shine, height }) => {
  const wornPhoto = worn && photoOf(worn);
  return (
    <div className="relative mx-auto shrink-0" style={{ width: `${height / TALL}px` }}>
      {/* the room over the collar, with the hat where it would sit on a head */}
      <div aria-hidden="true" className="relative" style={{ paddingTop: `${ROOM}%` }}>
        {worn && wornPhoto && (
          <SamosiPic
            key={`${worn.id}-${drops[worn.id] || 0}`}
            src={wornPhoto.src}
            {...lookOf(worn)}
            className={cx('pointer-events-none absolute h-auto', drops[worn.id] ? 'samosi-drop' : '')}
            style={{ left: `${wornPhoto.place.left}%`, top: `${((wornPhoto.place.top - ROOM_CUT) / ROOM) * 100}%`, width: `${wornPhoto.place.width}%` }}
          />
        )}
      </div>
      <div className="relative" style={{ aspectRatio: `${SAMOSI_ASPECT}`, WebkitMaskImage: HEM, maskImage: HEM }}>
        <img src={SAMOSI_FIGURE} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 h-full w-full opacity-20 contrast-90 grayscale" />
        {PHOTO_PARTS.map(p => (
          <SamosiPic
            key={`${p.id}-${drops[p.id] || 0}`}
            src={samosiLayer(p.id)}
            dye={dyeOf(p.id)}
            className={cx('absolute inset-0 h-full w-full transition-opacity duration-300', on(p.id) && drops[p.id] ? 'samosi-drop' : '')}
            style={{ opacity: on(p.id) ? 1 : 0 }}
          />
        ))}
        {/* the papanaki on the right shoulder */}
        {SHOULDER_PARTS.map(p => {
          const place = p.photo!.place;
          return (
            <SamosiPic
              key={`${p.id}-${drops[p.id] || 0}`}
              src={p.photo!.src}
              {...lookOf(p)}
              className={cx('absolute h-auto transition-opacity duration-300', on(p.id) && drops[p.id] ? 'samosi-drop' : '')}
              style={{ left: `${place.left}%`, top: `${place.top}%`, width: `${place.width}%`, opacity: on(p.id) ? 1 : 0 }}
            />
          );
        })}
        {complete && (
          <div
            key={shine}
            aria-hidden="true"
            className="samosi-shine pointer-events-none absolute inset-0"
            style={{ WebkitMaskImage: `url(${SAMOSI_FIGURE})`, WebkitMaskSize: '100% 100%', maskImage: `url(${SAMOSI_FIGURE})`, maskSize: '100% 100%' }}
          />
        )}
      </div>
      {/* the boots: a round slot beside the figure, down by the hem */}
      {SLOT_PARTS.map(p => <Slot key={p.id} part={p} on={on(p.id)} pop={drops[p.id] || 0} />)}
    </div>
  );
};

/** A drawn part's round slot beside the figure: dashed and pale until it is on. */
const Slot: React.FC<{ part: SamosiPart; on: boolean; pop: number }> = ({ part, on, pop }) => (
  <div aria-hidden="true" className="absolute bottom-[12%] -left-[76px] flex w-16 flex-col items-center gap-1">
    <span
      key={on ? pop : 'off'}
      className={cx(
        'relative flex size-14 items-center justify-center rounded-full border-2 bg-surf transition-[border-color] duration-300',
        on ? 'samosi-pop border-wine shadow-lift' : 'border-dashed border-dim',
      )}
    >
      {part.art && <SamosiArt kind={part.art} className={cx('size-10 transition-[filter,opacity] duration-300', !on && 'opacity-35 grayscale')} />}
      {on && (
        <span className="absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-wine text-white ring-2 ring-surf">
          <Check className="size-3" strokeWidth={3} />
        </span>
      )}
    </span>
    <span className={cx('text-cap font-semibold', on ? 'text-wine' : 'text-mut')}>{part.label}</span>
  </div>
);

/** The kaba as the old KabaFigure draws it, held to the chokha's size in the card. */
export const KabaFigureBox: React.FC<{
  pieces: Record<string, KabaPiece>;
  on: (id: string) => boolean;
  drops: Record<string, number>;
  shine: number | null;
  heads: KabaHeads;
}> = ({ pieces, on, drops, shine, heads }) => (
  // KabaFigure is clamp(150px, 100% − 150px, 240px) wide: a 300px box gives it its smallest, about the chokha's height
  <div className="mx-auto w-[300px] max-w-full">
    <KabaFigure pieces={pieces} on={on} drops={drops} shine={shine} places={heads} />
  </div>
);
