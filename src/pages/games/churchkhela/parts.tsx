import React, { useEffect, useState } from 'react';
import { hushSnippets, usePieceState } from '../rounds/useSnippet';
import { triggerHaptic } from '../../../utils/haptics';

// „ცხელი ჩურჩხელა“'s pieces for the room (2026-11-04): the churchkhela itself, and each phone's own clock of a round — the
// heat. A round burns `burn` ms after its music began playing on this phone (if the music has not begun within FALLBACK, the
// clock starts by itself then, and music that comes later only plays until the burn), or when the music stops before that; at
// the burn the music stops, so on every phone the moment the music stops is the moment it burns, however long the recording
// took to come.

/** the clock starts by itself when the music has not begun by then (ms after the round came) */
const FALLBACK = 2500;

interface Heat { t0: number; play: number | null; burnt: boolean }
const heats = new Map<string, Heat>();
const heatOf = (id: string) => {
  let h = heats.get(id);
  if (!h) {
    h = { t0: performance.now(), play: null, burnt: false };
    heats.set(id, h);
    if (heats.size > 30) heats.delete(heats.keys().next().value!);
  }
  return h;
};

/**
 * A round's heat on this phone (keyed by the round's `id`; every screen of it shares one): whether it has burnt, and how long
 * the churchkhela has been held so far — music time, ms.
 */
export const useHeat = (id: string, burn: number) => {
  const piece = usePieceState();
  const [burnt, setBurnt] = useState(() => !!id && heatOf(id).burnt);
  useEffect(() => { setBurnt(!!id && heatOf(id).burnt); }, [id]);
  // the music's first start after the round came; its stop before the burn burns it at once
  useEffect(() => {
    if (!id) return;
    const h = heatOf(id);
    if (h.burnt) return;
    if (h.play === null && piece.state === 'play' && piece.since >= h.t0 - 50 && piece.since <= h.t0 + FALLBACK) h.play = piece.since;
    else if (h.play !== null && piece.since > h.play && (piece.state === 'done' || piece.state === 'error')) {
      h.burnt = true;
      triggerHaptic(160);
      setBurnt(true);
    }
  }, [id, piece]);
  // the burn: `burn` after the music began (or after the clock started by itself)
  useEffect(() => {
    if (!id || !burn) return;
    const h = heatOf(id);
    if (h.burnt) return;
    const wait = (h.play ?? h.t0 + FALLBACK) + burn - performance.now();
    const t = window.setTimeout(() => {
      if (!h.burnt) { h.burnt = true; hushSnippets(); triggerHaptic(160); }
      setBurnt(true);
    }, Math.max(0, wait));
    return () => window.clearTimeout(t);
  }, [id, burn, piece]);
  const held = () => {
    if (!id) return 0;
    const h = heatOf(id);
    return Math.max(0, performance.now() - (h.play ?? h.t0 + FALLBACK));
  };
  return { burnt, held };
};

export type ChurchkhelaLook = 'hot' | 'cool' | 'burnt';

// the lumps of walnuts under their coat, top to bottom
const LUMPS = Array.from({ length: 8 }, (_, i) => ({ cy: 46 + i * 19.5, cx: 50 + (i % 2 ? 1.6 : -1.4), rx: i % 3 === 1 ? 15.5 : 17 }));
const COAT: Record<ChurchkhelaLook, [string, string, string]> = {
  hot: ['#d0694a', '#93301f', '#5c1a12'],
  cool: ['#b8644c', '#86331f', '#561c13'],
  burnt: ['#5b4038', '#2a1a15', '#0f0806'],
};

/** a churchkhela hanging on its string: hot (it sways, steam rises), cool (let go in time) or burnt (black, in flames) */
export const Churchkhela: React.FC<{ look: ChurchkhelaLook; className?: string }> = ({ look, className = '' }) => {
  const [a, b, c] = COAT[look];
  const g = `chk-${look}`;
  return (
    <svg viewBox="0 0 100 230" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={g} cx="34%" cy="32%" r="78%">
          <stop offset="0" stopColor={a} /><stop offset=".55" stopColor={b} /><stop offset="1" stopColor={c} />
        </radialGradient>
        <radialGradient id="chk-fire" cx="50%" cy="85%" r="70%">
          <stop offset="0" stopColor="#fde68a" /><stop offset=".45" stopColor="#f59e0b" /><stop offset="1" stopColor="#dc2626" />
        </radialGradient>
      </defs>
      {look === 'hot' && [24, 50, 76].map((x, i) => (
        <path key={i} className="chk-steam" style={{ animationDelay: `${i * 0.55}s` }} d={`M${x} 30 q-5 -7 0 -13 q5 -6 0 -12`} fill="none" stroke="#c9b8a6" strokeWidth="2.4" strokeLinecap="round" />
      ))}
      {look === 'burnt' && [30, 52, 72].map((x, i) => (
        <circle key={i} className="chk-steam" style={{ animationDelay: `${i * 0.45}s` }} cx={x} cy={22 - i * 3} r={6 + i} fill="#9a8b7b" opacity=".5" />
      ))}
      <g className={look === 'hot' ? 'chk-hot' : ''}>
        <circle cx="50" cy="7" r="4.2" fill="none" stroke="#a88e6a" strokeWidth="1.8" />
        <path d="M50 11 V34" stroke="#a88e6a" strokeWidth="1.8" />
        <ellipse cx="50" cy="33" rx="6" ry="3.4" fill={`url(#${g})`} />
        {LUMPS.map((l, i) => <ellipse key={i} cx={l.cx} cy={l.cy} rx={l.rx} ry="12.6" fill={`url(#${g})`} />)}
        <path d="M41 193 Q50 216 59 193 Z" fill={`url(#${g})`} />
        {look !== 'burnt' && LUMPS.map((l, i) => <ellipse key={i} cx={l.cx - 6} cy={l.cy - 5} rx="4.6" ry="2.4" fill="#fff" opacity=".2" />)}
        {look === 'burnt' && (
          <g>
            <path className="chk-flame" d="M30 214 C22 196 34 186 32 170 C42 182 46 192 40 214 Z" fill="url(#chk-fire)" />
            <path className="chk-flame" style={{ animationDelay: '.15s' }} d="M42 216 C36 190 52 178 50 152 C64 172 66 196 58 216 Z" fill="url(#chk-fire)" />
            <path className="chk-flame" style={{ animationDelay: '.3s' }} d="M60 214 C58 198 68 190 68 174 C78 188 80 202 70 214 Z" fill="url(#chk-fire)" />
          </g>
        )}
      </g>
    </svg>
  );
};
