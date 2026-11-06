import React, { useEffect, useRef, useState } from 'react';
import { Camera, Check, Minus, Plus, Trash2 } from 'lucide-react';
import { Btn, Sheet } from '../ui/kit';
import { triggerHaptic } from '../../utils/haptics';

// The profile photo's own picture (2026-11-06, the user's pick: „ფოტოს ჩასწორება ატვირთვისას — ამოჭრა და გადიდება“): a tap
// on the profile's photo opens the phone's picker; the picture comes into a round window where a finger moves it and the
// slider (or two fingers) makes it larger, so the face lands in the middle; „მზადაა“ gives a small square JPEG (OUT px,
// a few KB) as a data URL — the caller keeps it (students.photo, the directory, the psalter groups).

export const PHOTO_OUT = 192;
const VIEW = 260;
const MAX_ZOOM = 4;

// the object URL stays alive while the window shows the picture; the window lets it go when it closes
const readImage = (file: File) => new Promise<HTMLImageElement>((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')); };
  img.src = url;
});

/** The window over a picked picture. `onDone(dataUrl)`; `onRemove` only when a photo of mine is already kept. */
export const PhotoCrop: React.FC<{ file: File; onDone: (dataUrl: string) => void; onClose: () => void }> = ({ file, onDone, onClose }) => {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [failed, setFailed] = useState(false);
  // the picture's scale over „fit the circle“ and its centre's shift from the window's centre, in window px
  const [zoom, setZoom] = useState(1);
  const [shift, setShift] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; sx: number; sy: number; id: number } | null>(null);
  const pinch = useRef<{ d: number; z: number } | null>(null);
  const touches = useRef(new Map<number, { x: number; y: number }>());

  useEffect(() => {
    let loaded: HTMLImageElement | null = null;
    readImage(file).then(i => { loaded = i; setImg(i); }).catch(() => setFailed(true));
    return () => { if (loaded) URL.revokeObjectURL(loaded.src); };
  }, [file]);

  // the picture scaled so its shorter side fills the circle at zoom 1
  const base = img ? VIEW / Math.min(img.naturalWidth, img.naturalHeight) : 1;
  const w = img ? img.naturalWidth * base * zoom : 0;
  const h = img ? img.naturalHeight * base * zoom : 0;
  // the picture may never leave a gap inside the circle
  const clamp = (s: { x: number; y: number }, z = zoom) => {
    const cw = img ? img.naturalWidth * base * z : 0, ch = img ? img.naturalHeight * base * z : 0;
    const mx = Math.max(0, (cw - VIEW) / 2), my = Math.max(0, (ch - VIEW) / 2);
    return { x: Math.min(mx, Math.max(-mx, s.x)), y: Math.min(my, Math.max(-my, s.y)) };
  };
  const setZoomKeeping = (z: number) => {
    const nz = Math.min(MAX_ZOOM, Math.max(1, z));
    setShift(s => clamp({ x: s.x * (nz / zoom), y: s.y * (nz / zoom) }, nz));
    setZoom(nz);
  };

  const onDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.current.size === 2) {
      const [a, b] = [...touches.current.values()];
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), z: zoom };
      drag.current = null;
    } else {
      drag.current = { x: e.clientX, y: e.clientY, sx: shift.x, sy: shift.y, id: e.pointerId };
    }
  };
  const onMove = (e: React.PointerEvent) => {
    if (!touches.current.has(e.pointerId)) return;
    touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && touches.current.size === 2) {
      const [a, b] = [...touches.current.values()];
      setZoomKeeping(pinch.current.z * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.d));
      return;
    }
    const d = drag.current;
    if (d && d.id === e.pointerId) setShift(clamp({ x: d.sx + (e.clientX - d.x), y: d.sy + (e.clientY - d.y) }));
  };
  const onUp = (e: React.PointerEvent) => {
    touches.current.delete(e.pointerId);
    if (touches.current.size < 2) pinch.current = null;
    if (drag.current?.id === e.pointerId) drag.current = null;
  };

  const done = () => {
    if (!img) return;
    const c = document.createElement('canvas');
    c.width = PHOTO_OUT; c.height = PHOTO_OUT;
    const ctx = c.getContext('2d')!;
    const k = PHOTO_OUT / VIEW;
    // the picture's top-left in window px, then scaled to the output
    const left = (VIEW - w) / 2 + shift.x, top = (VIEW - h) / 2 + shift.y;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, left * k, top * k, w * k, h * k);
    triggerHaptic(12);
    onDone(c.toDataURL('image/jpeg', 0.84));
  };

  return (
    <Sheet open onClose={onClose} title="ფოტოს მორგება" footer={
      <div className="flex gap-2">
        <Btn kind="ghost" size="lg" onClick={onClose}>გაუქმება</Btn>
        <Btn size="lg" full icon={<Check />} onClick={done} disabled={!img}>მზადაა</Btn>
      </div>
    }>
      {failed ? (
        <p className="text-center text-[14px] text-[#8a7a6a] py-6">ეს ფაილი სურათად ვერ გაიხსნა — სცადე სხვა.</p>
      ) : (
        <div className="space-y-4">
          <p className="text-[13px] leading-snug text-[#8a7a6a] text-center">თითით გადაადგილე, რომ სახე შუაში მოხვდეს; გაადიდე ზოლით ან ორი თითით.</p>
          <div className="relative mx-auto select-none touch-none" style={{ width: VIEW, height: VIEW }}
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
            <div className="absolute inset-0 rounded-full overflow-hidden bg-[#efe5d4] ring-4 ring-white shadow-[0_10px_30px_-14px_rgba(74,52,38,0.5)]">
              {img && (
                <img src={img.src} alt="" draggable={false}
                  style={{ position: 'absolute', width: w, height: h, left: (VIEW - w) / 2 + shift.x, top: (VIEW - h) / 2 + shift.y, maxWidth: 'none' }} />
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 px-2">
            <button type="button" aria-label="დაპატარავება" onClick={() => setZoomKeeping(zoom - 0.25)} className="w-9 h-9 rounded-full ring-1 ring-[#e8dcc8] bg-white flex items-center justify-center text-[#7a2028] cursor-pointer active:scale-95"><Minus className="w-4 h-4" /></button>
            <input type="range" min={1} max={MAX_ZOOM} step={0.01} value={zoom} onChange={e => setZoomKeeping(Number(e.target.value))} aria-label="გადიდება" className="flex-1 accent-[#7a2028]" />
            <button type="button" aria-label="გადიდება" onClick={() => setZoomKeeping(zoom + 0.25)} className="w-9 h-9 rounded-full ring-1 ring-[#e8dcc8] bg-white flex items-center justify-center text-[#7a2028] cursor-pointer active:scale-95"><Plus className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </Sheet>
  );
};

/** The round photo on the profile with its camera corner: a tap picks a picture; a long list is not needed — one picture. */
export const PhotoButton: React.FC<{
  src: string | null | undefined; alt: string; own: boolean; onPick: (f: File) => void; onRemove?: () => void; fallback: React.ReactNode;
}> = ({ src, alt, own, onPick, onRemove, fallback }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [menu, setMenu] = useState(false);
  const picture = src ? (
    <img src={src} alt={alt} referrerPolicy="no-referrer" className="w-[72px] h-[72px] rounded-full object-cover ring-4 ring-white bg-[#efe5d4] shadow-md" />
  ) : fallback;
  if (!own) return <>{picture}</>;
  return (
    <span className="relative inline-block">
      <button type="button" onClick={() => { triggerHaptic(8); onRemove ? setMenu(m => !m) : fileRef.current?.click(); }} aria-label="ფოტოს შეცვლა" title="ფოტოს შეცვლა"
        className="block rounded-full cursor-pointer active:scale-95 transition">
        {picture}
        <span aria-hidden className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-[#7a2028] text-[#fbf6ec] ring-2 ring-white flex items-center justify-center">
          <Camera className="w-3.5 h-3.5" />
        </span>
      </button>
      {menu && (
        <div className="absolute left-0 top-full mt-2 z-20 min-w-[11rem] p-1.5 rounded-2xl bg-white ring-1 ring-[#e8dcc8] shadow-[0_14px_36px_-14px_rgba(74,52,38,0.5)] sg-in">
          <button type="button" onClick={() => { setMenu(false); fileRef.current?.click(); }} className="w-full h-11 px-3 rounded-xl flex items-center gap-2.5 text-[14px] font-bold text-[#4a3426] hover:bg-[#fcf1df] cursor-pointer"><Camera className="w-4 h-4 text-[#7a2028]" /> სხვა ფოტო</button>
          <button type="button" onClick={() => { setMenu(false); onRemove?.(); }} className="w-full h-11 px-3 rounded-xl flex items-center gap-2.5 text-[14px] font-bold text-[#9a3324] hover:bg-[#fcf1df] cursor-pointer"><Trash2 className="w-4 h-4" /> ჩემი ფოტოს მოხსნა</button>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onPick(f); }} />
    </span>
  );
};
