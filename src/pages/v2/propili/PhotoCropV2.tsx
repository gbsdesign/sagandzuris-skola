import React from 'react';
import { CircleCheck, Minus, Plus } from 'lucide-react';
import { Button, Duo, Note, RoundButton, Sheet } from '../../../components/ui2';
import { usePhotoCrop } from '../../../components/views/PhotoCrop';

/** x-potos-morgeba — „ფოტოს მორგება“: the picked picture in a round window, moved by a finger, made larger by the bar or
 *  two fingers; „მზადაა“ gives the small square JPEG (the old window's logic, components/views/PhotoCrop `usePhotoCrop`). */
export const PhotoCropV2: React.FC<{ file: File; onDone: (dataUrl: string) => void; onClose: () => void }> = ({ file, onDone, onClose }) => {
  const { img, failed, zoom, w, h, shift, setZoomKeeping, cut, pointer, view, maxZoom } = usePhotoCrop(file);
  const pct = ((zoom - 1) / (maxZoom - 1)) * 100;
  const done = () => { const url = cut(); if (url) onDone(url); };
  return (
    <Sheet open onClose={onClose} title="ფოტოს მორგება">
      {failed ? (
        <Note className="py-6 text-center">ეს ფაილი სურათად ვერ გაიხსნა — სცადე სხვა.</Note>
      ) : (
        <>
          <Note>გადაადგილე თითით, რომ სახე შუაში მოხვდეს.</Note>
          <div className="relative mx-auto shrink-0 touch-none select-none" style={{ width: view, height: view }} {...pointer}>
            <div className="absolute inset-0 overflow-hidden rounded-full bg-soft ring-4 ring-surf">
              {img && (
                <img src={img.src} alt="" draggable={false}
                  style={{ position: 'absolute', width: w, height: h, left: (view - w) / 2 + shift.x, top: (view - h) / 2 + shift.y, maxWidth: 'none' }} />
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <RoundButton label="დაპატარავება" onClick={() => setZoomKeeping(zoom - 0.25)} disabled={zoom <= 1}><Minus /></RoundButton>
            <div className="relative h-tap min-w-0 flex-1 px-[11px]">
              <div className="relative h-full">
                <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-track" />
                <span aria-hidden="true" className="absolute top-1/2 left-0 h-1.5 -translate-y-1/2 rounded-full bg-wine" style={{ width: `${pct}%` }} />
                <span aria-hidden="true" className="absolute top-1/2 size-[22px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-surf shadow-knob" style={{ left: `${pct}%` }} />
              </div>
              <input type="range" min={1} max={maxZoom} step={0.01} value={zoom} aria-label="გადიდება"
                onChange={e => setZoomKeeping(Number(e.target.value))}
                className="absolute inset-0 size-full cursor-pointer opacity-0" />
            </div>
            <RoundButton label="გადიდება" onClick={() => setZoomKeeping(zoom + 0.25)} disabled={zoom >= maxZoom}><Plus /></RoundButton>
          </div>
        </>
      )}
      <Duo className="pt-2">
        <Button kind="ghost" onClick={onClose}>გაუქმება</Button>
        <Button icon={<CircleCheck />} onClick={done} disabled={!img}>მზადაა</Button>
      </Duo>
    </Sheet>
  );
};
