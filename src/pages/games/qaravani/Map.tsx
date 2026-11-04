import React, { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Maximize, Minus, Plus } from 'lucide-react';
import { CITY_TRACKS, ROUTE_TRACKS, TRACKS } from '../../../utils/qaravani';
import {
  QMAP_BG, QMAP_BOX, QMAP_GLYPH, QMAP_NAMES, QMAP_RING, QMAP_TOP, Q_CELLS, Q_CITIES, Q_INN_ART, Q_PLAYERS, Q_SHIP_AT,
} from '../../../data/qaravaniMap';
import { triggerHaptic } from '../../../utils/haptics';
import { GOLD, INK, PAPER, WINE, roadLook } from './look';

// „ქარავანი“'s map on screen: the printed board's drawing (data/qaravaniMap.ts) with the roads coloured by their owners, the inns
// and the letters' cities ringed. Two fingers (or ctrl + the wheel) zoom, one finger moves a zoomed map, +/− and „all of it“ sit
// in its corner; a tap opens the road or the city under it. The cities' names are the print's once they are big enough, before
// that the screen's own (12 px) — as many as fit, the letters' cities first.

const [BX, BY, BW, BH] = QMAP_BOX;
const R = QMAP_RING.r;
const MAX_ZOOM = 9;
/** a city's circle is never smaller than this on screen (px) */
const MIN_CITY = 4.5;
/** from this scale (px a mm) the print's names are 11 px or more: they are drawn where the print has them */
const BIG = 11 / QMAP_NAMES.size;
const PASSES_AT = 11 / 3.3;

type Cell = readonly [number, number, number];
const CELLS: readonly (readonly Cell[])[] = TRACKS.map((tr, t) => Q_CELLS[tr.route][ROUTE_TRACKS[tr.route].indexOf(t)]);
const rad = (d: number) => (d * Math.PI) / 180;
/** a track's line through its cells' centres, from the first cell's end to the last one's */
const LINES = CELLS.map(cells => {
  const pts = cells.map(c => [c[0], c[1]] as const);
  const out = (a: readonly number[], b: readonly number[]) => {
    const dx = a[0] - b[0], dy = a[1] - b[1], L = Math.hypot(dx, dy) || 1;
    return [a[0] + (dx / L) * 9.3, a[1] + (dy / L) * 9.3] as const;
  };
  const line = pts.length > 1 ? [out(pts[0], pts[1]), ...pts, out(pts[pts.length - 1], pts[pts.length - 2])] : (() => {
    const a = rad(cells[0][2]), [x, y] = pts[0];
    return [[x - Math.cos(a) * 9.3, y - Math.sin(a) * 9.3], [x + Math.cos(a) * 9.3, y + Math.sin(a) * 9.3]] as const;
  })();
  return `M${line.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L')}`;
});
/** the cities with the most roads first (their names win a crowded screen) */
const BY_ROADS = Q_CITIES.map((_, x) => x).sort((a, b) => CITY_TRACKS[b].length - CITY_TRACKS[a].length);

const STONES = [-6.3, 0, 6.3].flatMap(x => [-1.95, 1.95].map(y => (
  <rect key={`${x}${y}`} x={x - 2.75} y={y - 1.4} width="5.5" height="2.8" rx="1" fill="#d6d0c7" stroke="#8d857b" strokeWidth=".22" />
)));
const SNOW = <path d="M-3.5 2.4L-.9 -2.2L.3 -.7L1.2 -1.7L3.5 2.4Z" fill="#fff" stroke={INK} strokeWidth=".42" strokeLinejoin="round" />;
const SHIP = (
  <>
    <circle r="3.7" fill="#fff" stroke={INK} strokeWidth=".4" />
    <g transform="scale(.78) translate(0 -.2)" fill={INK}>
      <path d="M-3.9 .4H3.9L2.9 2.5H-2.6Z" /><rect x="-2.2" y="-1.1" width="3.6" height="1.5" /><path d="M.3 -1.1V-3.1H1.4V-1.1Z" />
      <circle cx="1.6" cy="-3.9" r=".65" opacity=".55" /><circle cx="2.7" cy="-4.4" r=".8" opacity=".4" />
      <path d="M-3.4 3.3Q-2.6 2.8 -1.8 3.3T-.2 3.3T1.4 3.3T3 3.3" fill="none" stroke={INK} strokeWidth=".35" />
    </g>
  </>
);

/** one track: free — its cells as printed; taken — a band of its owner's colour with a glow, a cart on every cell */
const TrackShape = memo<{ t: number; owner: number; closed: boolean }>(({ t, owner, closed }) => {
  const tr = TRACKS[t];
  if (owner >= 0) {
    const P = Q_PLAYERS[owner] ?? Q_PLAYERS[0];
    return (
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d={LINES[t]} stroke={P.color} strokeOpacity=".3" strokeWidth="17" />
        <path d={LINES[t]} stroke={INK} strokeWidth="10.6" />
        <path d={LINES[t]} stroke={P.color} strokeWidth="8.2" />
        {CELLS[t].map(([x, y, a], i) => (
          <rect key={i} x="-6.5" y="-1.4" width="13" height="2.8" rx="1.4" fill={P.ink} fillOpacity=".75" transform={`translate(${x} ${y}) rotate(${a})`} />
        ))}
      </g>
    );
  }
  const L = roadLook(tr.color), gray = tr.color === 8, white = tr.color === 5;
  const ships = tr.ships ? Q_SHIP_AT[tr.route] ?? [] : [];
  return (
    <g opacity={closed ? 0.3 : 1}>
      {CELLS[t].map(([x, y, a], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <g transform={`rotate(${a})`}>
            {tr.mountain && <path d="M-10 -5.8H10M-10 5.8H10" stroke={INK} strokeWidth=".8" strokeDasharray="1.6 1" />}
            <rect x="-10" y="-4.5" width="20" height="9" rx="1.4" fill={L.color} stroke={L.dark} strokeWidth={white ? 0.5 : 0.4} />
            {gray ? STONES : <path d="M-8.4 -2.15H8.4M-8.4 2.15H8.4" stroke={white ? '#b3a99c' : L.dark} strokeOpacity={white ? 1 : 0.6} strokeWidth=".45" strokeDasharray="2.4 .9" />}
          </g>
          {tr.mountain && SNOW}
          {ships.includes(i) && SHIP}
        </g>
      ))}
    </g>
  );
});

const Cities = memo<{ k: number; inn: readonly number[] }>(({ k, inn }) => (
  <g>
    {Q_CITIES.map((c, x) => (
      <g key={c.key} transform={`translate(${c.x} ${c.y}) scale(${k})`}>
        <circle r={R} fill={PAPER} stroke={WINE} strokeWidth=".9" />
        <circle r={R - 1.15} fill="none" stroke={GOLD} strokeWidth=".35" />
        <g dangerouslySetInnerHTML={{ __html: QMAP_GLYPH[c.look] }} />
        {inn[x] >= 0 && (
          <g transform="translate(6.6 -6.6) scale(1.2)" style={{ color: (Q_PLAYERS[inn[x]] ?? Q_PLAYERS[0]).color }}>
            <circle r="5.9" fill={PAPER} stroke={INK} strokeWidth=".55" />
            <g dangerouslySetInnerHTML={{ __html: Q_INN_ART }} />
          </g>
        )}
      </g>
    ))}
  </g>
));

interface View { s: number; x: number; y: number }
interface Size { w: number; h: number }
const clampView = (v: View, size: Size, fit: number): View => {
  const s = Math.min(Math.max(v.s || fit, fit), fit * MAX_ZOOM);
  const vw = size.w / s, vh = size.h / s;
  const x = vw >= BW ? BX - (vw - BW) / 2 : Math.min(Math.max(v.x, BX), BX + BW - vw);
  const y = vh >= BH ? BY - (vh - BH) / 2 : Math.min(Math.max(v.y, BY), BY + BH - vh);
  return { s, x, y };
};

let measure: CanvasRenderingContext2D | null | undefined;
const widths = new Map<string, number>();
const textW = (s: string, font: string) => {
  const key = `${font}|${s}`;
  const known = widths.get(key);
  if (known !== undefined) return known;
  if (measure === undefined) measure = document.createElement('canvas').getContext('2d');
  let w = s.length * 7.4;
  if (measure) { measure.font = font; w = measure.measureText(s).width || w; }
  widths.set(key, w);
  return w;
};
type Dir = (typeof Q_CITIES)[number]['dir'];
const TRY: readonly Dir[] = ['e', 'w', 's', 'n', 'ne', 'se', 'nw', 'sw'];
const NAME_PX = 12;
type Box = [number, number, number, number];
const hits = (a: Box, b: Box) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];

export interface MapRing { x: number; tone: 'gold' | 'wine' }

export const QaravaniMap: React.FC<{
  owner: readonly number[];
  inn: readonly number[];
  players: number;
  /** cities ringed: the letters' (gold), the chosen letter's (wine) */
  rings?: readonly MapRing[];
  /** tracks lit from under: the roads that may be taken now */
  hot?: readonly number[];
  sel?: number | null;
  /** cities whose names go first */
  first?: readonly number[];
  /** shown whole again, or brought to these cities, when `key` changes */
  focus?: { key: string; cities: readonly number[] } | null;
  onRoad?: (t: number) => void;
  onCity?: (x: number) => void;
  className?: string;
}> = ({ owner, inn, players, rings = [], hot = [], sel = null, first = [], focus, onRoad, onCity, className = 'aspect-[735/459]' }) => {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size>({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const on = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    on();
    const ro = new ResizeObserver(on);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const fit = size.w && size.h ? Math.min(size.w / BW, size.h / BH) : 1;
  const [raw, setRaw] = useState<View | null>(null);
  const view = useMemo(() => clampView(raw ?? { s: 0, x: BX, y: BY }, size, fit), [raw, size, fit]);
  const viewRef = useRef(view);
  viewRef.current = view;
  const k = Math.max(1, Math.round((MIN_CITY / view.s / R) * 10) / 10);
  const kRef = useRef(k);
  kRef.current = k;
  const zoomed = view.s > fit * 1.02;

  // ---------- moving the map ----------
  const tween = useRef(0);
  const stop = () => cancelAnimationFrame(tween.current);
  useEffect(() => stop, []);
  const animateTo = useCallback((to: View) => {
    stop();
    const from = viewRef.current, t0 = performance.now();
    const target = clampView(to, size, fit);
    const c0 = { x: from.x + size.w / 2 / from.s, y: from.y + size.h / 2 / from.s };
    const c1 = { x: target.x + size.w / 2 / target.s, y: target.y + size.h / 2 / target.s };
    const frame = (now: number) => {
      const q = Math.min(1, (now - t0) / 280), e = 1 - (1 - q) ** 3;
      const s = Math.exp(Math.log(from.s) + (Math.log(target.s) - Math.log(from.s)) * e);
      const cx = c0.x + (c1.x - c0.x) * e, cy = c0.y + (c1.y - c0.y) * e;
      setRaw({ s, x: cx - size.w / 2 / s, y: cy - size.h / 2 / s });
      if (q < 1) tween.current = requestAnimationFrame(frame);
    };
    tween.current = requestAnimationFrame(frame);
  }, [size, fit]);
  const zoomAt = useCallback((p: { x: number; y: number }, f: number, smooth = false) => {
    const v = viewRef.current;
    const s = Math.min(Math.max(v.s * f, fit), fit * MAX_ZOOM);
    const mx = v.x + p.x / v.s, my = v.y + p.y / v.s;
    const next = { s, x: mx - p.x / s, y: my - p.y / s };
    if (smooth) animateTo(next); else setRaw(next);
  }, [fit, animateTo]);

  // brought to the cities of a letter (or shown whole) when the focus changes
  const focusKey = focus?.key ?? '';
  useEffect(() => {
    if (!focusKey || !size.w) return;
    const cs = focus?.cities ?? [];
    if (!cs.length) { animateTo({ s: fit, x: BX, y: BY }); return; }
    const xs = cs.map(x => Q_CITIES[x].x), ys = cs.map(x => Q_CITIES[x].y), m = 34;
    const x0 = Math.min(...xs) - m, x1 = Math.max(...xs) + m, y0 = Math.min(...ys) - m, y1 = Math.max(...ys) + m;
    const s = Math.min(Math.max(Math.min(size.w / (x1 - x0), size.h / (y1 - y0)), fit), fit * 4);
    animateTo({ s, x: (x0 + x1) / 2 - size.w / 2 / s, y: (y0 + y1) / 2 - size.h / 2 / s });
  }, [focusKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // the wheel zooms with ctrl (a touchpad's pinch sends it), else the page scrolls on
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const on = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      stop();
      const r = el.getBoundingClientRect();
      zoomAt({ x: e.clientX - r.left, y: e.clientY - r.top }, Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.004)));
    };
    el.addEventListener('wheel', on, { passive: false });
    return () => el.removeEventListener('wheel', on);
  }, [zoomAt]);

  // ---------- fingers ----------
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const base = useRef<{ v: View; a: { x: number; y: number }; b?: { x: number; y: number } } | null>(null);
  const tap = useRef<{ x: number; y: number; t: number; ok: boolean }>({ x: 0, y: 0, t: 0, ok: false });
  const local = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const rebase = () => {
    const list = [...pts.current.values()];
    base.current = list.length ? { v: viewRef.current, a: list[0], b: list[1] } : null;
  };

  const hit = (p: { x: number; y: number }) => {
    const v = viewRef.current, mx = v.x + p.x / v.s, my = v.y + p.y / v.s, rc = R * kRef.current;
    let city = -1, cd = Infinity;
    Q_CITIES.forEach((c, x) => { const d = Math.hypot(c.x - mx, c.y - my); if (d < cd) { cd = d; city = x; } });
    if (onCity && city >= 0 && cd <= rc + 8 / v.s) { onCity(city); return; }
    if (onRoad) {
      let road = -1, rd = Infinity;
      CELLS.forEach((cells, t) => {
        for (const [x, y, a] of cells) {
          const dx = mx - x, dy = my - y, c = Math.cos(rad(a)), s = Math.sin(rad(a));
          const u = Math.abs(dx * c + dy * s) - 10, w = Math.abs(-dx * s + dy * c) - 4.5;
          const d = Math.hypot(Math.max(0, u), Math.max(0, w)) + (u < 0 && w < 0 ? w * 0.01 : 0);
          if (d < rd) { rd = d; road = t; }
        }
      });
      if (road >= 0 && rd <= 12 / v.s) { triggerHaptic(5); onRoad(road); return; }
    }
    if (onCity && city >= 0 && cd <= rc + 22 / v.s) onCity(city);
  };

  const down = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    stop();
    box.current?.setPointerCapture(e.pointerId);
    const p = local(e);
    if (!pts.current.size) tap.current = { ...p, t: Date.now(), ok: true };
    else tap.current.ok = false;
    pts.current.set(e.pointerId, p);
    rebase();
  };
  const move = (e: React.PointerEvent) => {
    if (!pts.current.has(e.pointerId)) return;
    const p = local(e);
    pts.current.set(e.pointerId, p);
    const list = [...pts.current.values()];
    const b = base.current;
    if (tap.current.ok && Math.hypot(p.x - tap.current.x, p.y - tap.current.y) > 8) tap.current.ok = false;
    if (!b || tap.current.ok) return;
    if (list.length === 1 && !b.b) {
      setRaw({ s: b.v.s, x: b.v.x - (list[0].x - b.a.x) / b.v.s, y: b.v.y - (list[0].y - b.a.y) / b.v.s });
    } else if (list.length >= 2 && b.b) {
      const d0 = Math.hypot(b.a.x - b.b.x, b.a.y - b.b.y) || 1, d1 = Math.hypot(list[0].x - list[1].x, list[0].y - list[1].y);
      const m0 = { x: (b.a.x + b.b.x) / 2, y: (b.a.y + b.b.y) / 2 }, m1 = { x: (list[0].x + list[1].x) / 2, y: (list[0].y + list[1].y) / 2 };
      const s = Math.min(Math.max(b.v.s * (d1 / d0), fit), fit * MAX_ZOOM);
      const mx = b.v.x + m0.x / b.v.s, my = b.v.y + m0.y / b.v.s;
      setRaw({ s, x: mx - m1.x / s, y: my - m1.y / s });
    }
  };
  const up = (e: React.PointerEvent) => {
    if (!pts.current.has(e.pointerId)) return;
    const p = local(e);
    pts.current.delete(e.pointerId);
    if (e.type === 'pointerup' && tap.current.ok && !pts.current.size && Date.now() - tap.current.t < 600) hit(p);
    rebase();
  };

  // ---------- names ----------
  const big = view.s >= BIG;
  const ringOf = useMemo(() => new Map(rings.map(r => [r.x, r.tone])), [rings]);
  const font = useMemo(() => (box.current ? `700 ${NAME_PX}px ${getComputedStyle(box.current).fontFamily}` : `700 ${NAME_PX}px sans-serif`), [size.w]); // eslint-disable-line react-hooks/exhaustive-deps
  const smallNames = useMemo(() => {
    if (big || !size.w) return [];
    const s = view.s, rpx = R * k * s, h = NAME_PX + 3;
    const scr = (x: number, y: number) => [(x - view.x) * s, (y - view.y) * s] as const;
    const dots = Q_CITIES.map(c => scr(c.x, c.y));
    const circles: Box[] = dots.map(([px, py]) => [px - rpx, py - rpx, px + rpx, py + rpx]);
    // the zoom buttons in the top right corner are kept clear
    const labels: Box[] = [[size.w - 48, 0, size.w, zoomed ? 132 : 48]];
    // the cities in a ring (my letters' ends) are always named, in the ring's wine: when no side is free, the name may run
    // under a neighbour's circle (the circles are drawn over the names) — the side covering least wins; a circle's middle
    // costs more, a name set farther out more still, and a name whose near end is closer to another city costs most
    const sure = new Set([...rings.map(r => r.x), ...first]);
    const order = [...new Set([...rings.map(r => r.x), ...first, ...BY_ROADS])];
    const out: { x: number; tx: number; ty: number; anchor: 'start' | 'middle' | 'end' }[] = [];
    for (const x of order) {
      const c = Q_CITIES[x], [px, py] = dots[x];
      if (px < -60 || py < -20 || px > size.w + 60 || py > size.h + 20) continue;
      const w = textW(c.name, font);
      let best: { tx: number; ty: number; anchor: 'start' | 'middle' | 'end'; b: Box; cost: number } | null = null;
      const tries = [c.dir, ...TRY.filter(t => t !== c.dir)].flatMap(d => (sure.has(x) ? [[d, 0], [d, 7]] as const : [[d, 0]] as const));
      for (const [d, more] of tries) {
        const e = d.includes('e'), wv = d.includes('w'), n = d.includes('n'), so = d.includes('s');
        const diag = (e || wv) && (n || so);
        const off = (diag ? rpx * 0.62 + 1 : rpx + 2.5) + more;
        const anchor = e ? 'start' : wv ? 'end' : 'middle';
        let tx = e ? px + off : wv ? px - off : px;
        const ty = n ? py - off - h / 2 + (diag ? 2 : 0) : so ? py + off + h / 2 - (diag ? 2 : 0) : py;
        // a name above or below a city at the map's edge slides inward
        if (anchor === 'middle') tx = Math.min(Math.max(tx, w / 2 + 3), size.w - w / 2 - 3);
        const x0 = anchor === 'start' ? tx : anchor === 'end' ? tx - w : tx - w / 2;
        const b: Box = [x0 - 1, ty - h / 2, x0 + w + 1, ty + h / 2];
        if (b[0] < 2 || b[2] > size.w - 2 || b[1] < 1 || b[3] > size.h - 1) continue;
        if (labels.some(o => hits(o, b))) continue;
        let cost = more ? 500 : 0, blocked = false;
        const ax = e ? b[0] : wv ? b[2] : tx, ay = n ? b[3] : so ? b[1] : ty, mine = Math.hypot(ax - px, ay - py);
        for (let y = 0; y < circles.length && !blocked; y++) {
          if (y === x) continue;
          const [qx, qy] = dots[y];
          if (sure.has(x) && Math.hypot(ax - qx, ay - qy) < mine) cost += 1000;
          if (!hits(circles[y], b)) continue;
          if (!sure.has(x)) { blocked = true; break; }
          cost += (Math.min(b[2], circles[y][2]) - Math.max(b[0], circles[y][0])) * (Math.min(b[3], circles[y][3]) - Math.max(b[1], circles[y][1]))
            + (qx > b[0] && qx < b[2] && qy > b[1] && qy < b[3] ? 400 : 0);
        }
        if (blocked || (best && cost >= best.cost)) continue;
        best = { tx, ty, anchor, b, cost };
        if (!cost) break;
      }
      if (!best) continue;
      labels.push(best.b);
      out.push({ x, tx: best.tx, ty: best.ty, anchor: best.anchor });
    }
    return out;
  }, [big, view, size, k, rings, first, font, zoomed]);

  const closedOf = (t: number) => { const tw = TRACKS[t].twin; return tw >= 0 && owner[t] === -1 && players <= 3 && owner[tw] !== -1; };
  const bg = useMemo(() => <g dangerouslySetInnerHTML={{ __html: QMAP_BG }} />, []);
  const passes = useMemo(() => <g dangerouslySetInnerHTML={{ __html: QMAP_TOP }} />, []);
  const btn = 'w-9 h-9 rounded-full flex items-center justify-center bg-[#fbf6ec]/95 text-[#7a2028] ring-1 ring-[#e8dcc8] shadow-[0_4px_10px_-6px_rgba(43,30,20,0.6)] cursor-pointer active:scale-95 transition [&>svg]:w-[18px] [&>svg]:h-[18px] disabled:opacity-40 disabled:cursor-default';
  const center = { x: size.w / 2, y: size.h / 2 };

  return (
    <div
      ref={box}
      className={`relative w-full overflow-hidden rounded-2xl bg-[#e9eef0] ring-1 ring-[#e8dcc8] select-none ${className}`}
      style={{ touchAction: zoomed ? 'none' : 'pan-y' }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      role="img"
      aria-label="ქარავნის რუკა"
    >
      {size.w > 0 && (
        <svg width={size.w} height={size.h} viewBox={`${view.x} ${view.y} ${size.w / view.s} ${size.h / view.s}`} className="absolute inset-0 block">
          {bg}
          {hot.map(t => <path key={`h${t}`} d={LINES[t]} fill="none" stroke="#ffcf4d" strokeOpacity=".85" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />)}
          {sel !== null && sel >= 0 && (
            <g fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d={LINES[sel]} stroke={WINE} strokeWidth={Math.max(15, 9 / view.s + 11)} />
              <path d={LINES[sel]} stroke="#fff" strokeWidth="11.6" />
            </g>
          )}
          {TRACKS.map((_, t) => <TrackShape key={t} t={t} owner={owner[t] ?? -1} closed={closedOf(t)} />)}
          {view.s >= PASSES_AT && passes}
          {!big && (
            <g fontSize={NAME_PX / view.s} fontWeight="700" strokeLinejoin="round" style={{ paintOrder: 'stroke' }} aria-hidden="true">
              {smallNames.map(n => (
                <text key={n.x} x={view.x + n.tx / view.s} y={view.y + n.ty / view.s} textAnchor={n.anchor} dominantBaseline="central" fill={ringOf.get(n.x) ? WINE : INK} stroke={PAPER} strokeWidth={3.2 / view.s}>{Q_CITIES[n.x].name}</text>
              ))}
            </g>
          )}
          {rings.map(r => {
            const c = Q_CITIES[r.x];
            return <circle key={`r${r.x}`} cx={c.x} cy={c.y} r={R * k + 2.6} fill={r.tone === 'wine' ? '#7a2028' : '#c9a24b'} fillOpacity=".22" stroke={r.tone === 'wine' ? WINE : GOLD} strokeWidth={(r.tone === 'wine' ? 2.6 : 2) * Math.max(1, 1.2 / view.s)} />;
          })}
          <Cities k={k} inn={inn} />
          {big && (
            <g fontWeight="700" strokeLinejoin="round" style={{ paintOrder: 'stroke' }}>
              {Q_CITIES.map((c, x) => {
                const tone = ringOf.get(x);
                return (
                  <g key={c.key}>
                    <text x={c.lx} y={c.ly} fontSize={QMAP_NAMES.size} textAnchor={c.anchor} dominantBaseline="central" fill={tone ? WINE : QMAP_NAMES.ink} stroke={QMAP_NAMES.paper} strokeWidth="1.3">{c.name}</text>
                    {c.sub && <text x={c.lx} y={c.sy} fontSize={QMAP_NAMES.sub} fontWeight="400" fontStyle="italic" textAnchor={c.anchor} dominantBaseline="central" fill="#6b5440" stroke={QMAP_NAMES.paper} strokeWidth="1">{c.sub}</text>}
                  </g>
                );
              })}
            </g>
          )}
        </svg>
      )}
      <div className="absolute top-2 right-2 flex flex-col gap-1.5" onPointerDown={e => e.stopPropagation()}>
        <button type="button" aria-label="გადიდება" className={btn} disabled={view.s >= fit * MAX_ZOOM * 0.99} onClick={() => { triggerHaptic(5); zoomAt(center, 1.8, true); }}><Plus /></button>
        {zoomed && <button type="button" aria-label="დაპატარავება" className={btn} onClick={() => { triggerHaptic(5); zoomAt(center, 1 / 1.8, true); }}><Minus /></button>}
        {zoomed && <button type="button" aria-label="მთელი რუკა" className={btn} onClick={() => { triggerHaptic(5); animateTo({ s: fit, x: BX, y: BY }); }}><Maximize /></button>}
      </div>
    </div>
  );
};
