import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed } from 'lucide-react';
import type { Church } from '../../data/churches';
import { triggerHaptic } from '../../utils/haptics';

// „რუკა“ on „ეკლესია-მონასტრები“: every church with a known place as a dot on a real map (Leaflet over OpenStreetMap's
// tiles, drawn on one canvas so 3 400 dots stay light on a phone). The dot's colour is its kind, a green ring = I have been
// there; a tap opens the church's window. Loaded only when this tab opens (React.lazy).

const COLOR = { c: '#7a2028', m: '#b07a1e', x: '#9a8c7e' } as const;
const GEORGIA: L.LatLngBoundsExpression = [[41.05, 40.0], [43.6, 46.75]];

const PinsMap: React.FC<{ list: Church[]; visited: (id: string) => boolean; onOpen: (id: string) => void }> = ({ list, visited, onOpen }) => {
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
    const m = L.map(box.current, { preferCanvas: true, zoomSnap: 0.25, zoomDelta: 0.5, maxBounds: [[39.8, 38.5], [44.8, 48.5]], minZoom: 5.5 });
    m.fitBounds(GEORGIA, { padding: [6, 6] });
    // on a phone the whole width leaves the dots small: half a step closer, the far east and west just past the edges
    if (box.current.clientWidth < 520) m.setView([42.05, 43.75], m.getZoom() + 0.75);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    }).addTo(m);
    map.current = m;
    dots.current = L.layerGroup().addTo(m);
    return () => { m.remove(); map.current = null; };
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

  const locate = () => {
    if (!('geolocation' in navigator) || !map.current) return;
    triggerHaptic(10);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(p => {
      setLocating(false);
      const at: L.LatLngExpression = [p.coords.latitude, p.coords.longitude];
      me.current?.remove();
      me.current = L.circleMarker(at, { radius: 8, color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }).addTo(map.current!);
      map.current!.setView(at, 12);
    }, () => setLocating(false), { enableHighAccuracy: true, timeout: 15000, maximumAge: 120000 });
  };

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

export default PinsMap;
