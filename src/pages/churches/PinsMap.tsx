import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed } from 'lucide-react';
import type { Church } from '../../data/churches';
import { triggerHaptic } from '../../utils/haptics';
import { locateMe, myPlace } from '../../hooks/useMyPlace';

// „რუკა“ on „ეკლესია-მონასტრები“: every church with a known place as a dot on a real map (Leaflet over OpenStreetMap's
// tiles, drawn on one canvas so 3 400 dots stay light on a phone). The dot's colour is its kind, a green ring = I have been
// there; a tap opens the church's window. Loaded only when this tab opens (React.lazy).

const COLOR = { c: '#7a2028', m: '#b07a1e', x: '#9a8c7e' } as const;
const GEORGIA: L.LatLngBoundsExpression = [[41.05, 40.0], [43.6, 46.75]];

/** `fill` (the new look's whole-screen map, pages/v2/tadzrebi): the map fills its parent, the zoom and the credit at the top, a
 *  round „ჩემი ადგილი“ at the bottom right over `below` (the screen's own card with the key); `fit`: the view fits the list's
 *  dots (one region's churches, the nearest) instead of the whole country */
const PinsMap: React.FC<{
  list: Church[]; visited: (id: string) => boolean; onOpen: (id: string) => void; fill?: boolean; fit?: boolean; below?: React.ReactNode;
}> = ({ list, visited, onOpen, fill, fit, below }) => {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const dots = useRef<L.LayerGroup | null>(null);
  const me = useRef<L.CircleMarker | null>(null);
  const open = useRef(onOpen);
  open.current = onOpen;
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!box.current) return;
    // a quarter step of zoom, so a phone's narrow box still fits the whole country without half of Russia above it
    const m = L.map(box.current, { preferCanvas: true, zoomSnap: 0.25, zoomDelta: 0.5, maxBounds: [[39.8, 38.5], [44.8, 48.5]], minZoom: 5.5, zoomControl: !fill });
    if (fill) {
      // Georgian names and a finger-sized button (Leaflet's own are English and 30 px)
      const zoom = L.control.zoom({ position: 'topleft', zoomInTitle: 'გადიდება', zoomOutTitle: 'დაპატარავება' }).addTo(m);
      zoom.getContainer()?.querySelectorAll('a').forEach(a => {
        a.style.width = '40px'; a.style.height = '40px'; a.style.lineHeight = '40px'; a.style.fontSize = '22px';
      });
      m.attributionControl.setPosition('topright');
    }
    const own = fit ? list.filter(c => c.located) : [];
    if (own.length) {
      m.fitBounds(L.latLngBounds(own.map(c => [c.lat, c.lng] as [number, number])), { padding: [28, 28], maxZoom: 13 });
    } else {
      m.fitBounds(GEORGIA, { padding: [6, 6] });
      // on a phone the whole width leaves the dots small: half a step closer, the far east and west just past the edges
      if (box.current.clientWidth < 520) m.setView([42.05, 43.75], m.getZoom() + 0.75);
    }
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    }).addTo(m);
    map.current = m;
    dots.current = L.layerGroup().addTo(m);
    return () => { m.remove(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // the dots, drawn anew when the list or my visits change
  useEffect(() => {
    const g = dots.current;
    if (!g) return;
    g.clearLayers();
    const renderer = L.canvas({ padding: 0.3, tolerance: 6 });
    for (const c of list) {
      if (!c.located) continue;
      const been = visited(c.id);
      L.circleMarker([c.lat, c.lng], {
        renderer,
        radius: c.kind === 'm' ? 6.5 : 5,
        color: been ? '#2f6b3a' : '#fffaf0',
        weight: been ? 2.5 : 1.2,
        fillColor: COLOR[c.kind],
        fillOpacity: 0.92,
      })
        .on('click', () => { triggerHaptic(10); open.current(c.id); })
        .bindTooltip(c.name, { direction: 'top', offset: [0, -6] })
        .addTo(g);
    }
  }, [list, visited]);

  // my place: the same one „ახლოს მდებარე“ found (hooks/useMyPlace.ts) — a known one is shown at once, a tap asks the phone
  const showMe = (at: L.LatLngExpression, fly: boolean) => {
    if (!map.current) return;
    me.current?.remove();
    me.current = L.circleMarker(at, { radius: 8, color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }).addTo(map.current);
    if (fly) map.current.setView(at, 12);
  };
  useEffect(() => { const f = myPlace(); if (f) showMe([f.lat, f.lng], false); }, []);
  const locate = async () => {
    triggerHaptic(10);
    setLocating(true);
    const f = await locateMe();
    setLocating(false);
    if (f) showMe([f.lat, f.lng], true);
  };

  if (fill) {
    return (
      <div className="absolute inset-0 bg-[#f3e3c6]">
        <div ref={box} className="absolute inset-0 z-0" aria-label="საქართველოს რუკა ტაძრებით" />
        <div className="absolute inset-x-0 bottom-0 z-[500] flex flex-col items-end gap-3 pointer-events-none">
          <button type="button" onClick={locate} disabled={locating} aria-label="ჩემი ადგილი" title="ჩემი ადგილი"
            className="pointer-events-auto mr-4 w-12 h-12 rounded-full bg-white shadow-md ring-1 ring-black/10 text-[#1b1816] flex items-center justify-center cursor-pointer disabled:opacity-60 active:scale-95 transition">
            <LocateFixed className={`w-[22px] h-[22px] ${locating ? 'animate-pulse' : ''}`} />
          </button>
          {below && <div className="w-full">{below}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative w-full h-[52vh] min-h-[320px] max-h-[560px] rounded-3xl overflow-hidden ring-1 ring-[#e2c9a0] shadow-inner bg-[#f3e3c6]">
        <div ref={box} className="absolute inset-0 z-0" aria-label="საქართველოს რუკა ტაძრებით" />
        <button type="button" onClick={locate} disabled={locating} aria-label="ჩემი ადგილი"
          className="absolute right-3 bottom-8 z-[500] h-11 px-4 rounded-full bg-white shadow-md ring-1 ring-black/10 text-[#7a2028] text-[14px] font-bold inline-flex items-center gap-2 cursor-pointer disabled:opacity-60">
          <LocateFixed className={`w-[18px] h-[18px] ${locating ? 'animate-pulse' : ''}`} /> ჩემი ადგილი
        </button>
      </div>
      <div className="px-1 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] font-semibold text-[#574739]">
        <Key color={COLOR.c} label="ეკლესია" />
        <Key color={COLOR.m} label="მონასტერი" big />
        <Key color={COLOR.x} label="არ მოქმედებს" />
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-full ring-[2.5px] ring-[#2f6b3a] bg-white" />ვიყავი</span>
      </div>
    </div>
  );
};

const Key: React.FC<{ color: string; label: string; big?: boolean }> = ({ color, label, big }) => (
  <span className="inline-flex items-center gap-1.5">
    <span className={`${big ? 'w-3.5 h-3.5' : 'w-3 h-3'} rounded-full`} style={{ background: color }} />{label}
  </span>
);

/** the dots' colours, for a key drawn elsewhere (the new look's map card) */
export const PIN_COLOR = COLOR;

export default PinsMap;
