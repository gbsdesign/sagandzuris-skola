import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ChestToken } from '../../utils/pathChests';
import type { PearlState } from '../../utils/pathPearls';
import { triggerHaptic } from '../../utils/haptics';
import { PearlIcon } from './PearlIcon';
import { TokenIcon } from './Tokens';
import { TreasureChest } from './LearnChests';

// A voice marked in „ნასწავლი“ (2026-11-09, the user: „ბრილიანტი ბრწყინავდეს მისივე მონიშვნაზე, ამოდიოდეს ეკრანზე მაღლა
// და ლამაზად ბრწყინავდეს და სკივრში ჩადიოდეს … სკივრი იკეტებოდეს და ბრუნდებოდეს უკან თავის ადგილას“): the row's pearl
// lights up where it is, rises to the upper middle of the screen and shines there (a breathing gold light, turning rays,
// sparks), while its own chest flies out of the chests' card (or up from below when that is off the screen) and opens under
// it; the pearl drops in, the lid slams, the chest flies back to its place and the pearl comes back into its row with a hop.
// Nothing is blocked meanwhile (pointer-events none). „Reduce motion“ skips it.

export interface Flight {
  /** a new number each mark, so a mark during a flight starts afresh */
  n: number;
  /** the item's id: its row's token (`data-token`) is hidden while its copy flies — the row may move from „სასწავლი“ up */
  id: string;
  /** where the row's token was when tapped */
  from: DOMRect;
  chestId: string;
  token: ChestToken;
  state: PearlState;
}

const T = 3600; // the whole flight, ms
const P = 96; // the flying pearl's box
const CS = 128; // the chest's width there
const CH = (CS * 64) / 72;

const at = (x: number, y: number, size: number, k: number) => `translate(${x - size / 2}px, ${y - size / 2}px) scale(${k})`;

const SPARKS: [number, number][] = [[-58, -40], [52, -46], [-66, 18], [62, 22], [-18, -70], [24, 64], [0, -78], [-40, 58]];

const Flying: React.FC<{ f: Flight; onDone: () => void }> = ({ f, onDone }) => {
  const pearl = useRef<HTMLDivElement>(null);
  const chest = useRef<HTMLDivElement>(null);
  const dim = useRef<HTMLDivElement>(null);
  const [lid, setLid] = useState<'shut' | 'opening' | 'closing'>('shut');
  const done = useRef(onDone);
  done.current = onDone;

  useLayoutEffect(() => {
    const W = window.innerWidth, H = window.innerHeight;
    const r0 = f.from;
    const sx = r0.left + r0.width / 2, sy = r0.top + r0.height / 2;
    const k0 = Math.max(0.2, r0.width / P);

    // the chest's own place in the card, when it is on the screen
    const slot = document.querySelector<HTMLElement>(`[data-chest-art="${CSS.escape(f.chestId)}"]`);
    const c0 = slot?.getBoundingClientRect();
    const seen = !!c0 && c0.width > 0 && c0.bottom > 0 && c0.top < H;
    const cx0 = seen ? c0!.left + c0!.width / 2 : W / 2;
    const cy0 = seen ? c0!.top + c0!.height / 2 : H + CH;
    const ck0 = seen ? c0!.width / CS : 0.6;

    const top = { x: W / 2, y: Math.max(90, H * 0.32) };
    const chestAt = { x: W / 2, y: Math.min(H - CH / 2 - 24, H * 0.68) };
    const mouth = chestAt.y - CH / 2 + (CH * 29) / 64;

    if (seen) slot!.style.visibility = 'hidden';

    const anims: Animation[] = [];
    const ease = 'cubic-bezier(0.45, 0, 0.25, 1)';
    if (pearl.current) anims.push(pearl.current.animate([
      { offset: 0, transform: at(sx, sy, P, k0), opacity: 1 },
      { offset: 0.1, transform: at(sx, sy, P, k0 * 1.4), opacity: 1, easing: ease },
      { offset: 0.3, transform: at(top.x, top.y, P, 1), opacity: 1 },
      { offset: 0.52, transform: at(top.x, top.y, P, 1.1), opacity: 1 },
      { offset: 0.58, transform: at(top.x, top.y - 16, P, 1.04), opacity: 1, easing: 'cubic-bezier(0.55, 0, 0.9, 0.6)' },
      { offset: 0.68, transform: at(top.x, mouth, P, 0.34), opacity: 1 },
      { offset: 0.7, transform: at(top.x, mouth + 8, P, 0.2), opacity: 0 },
      { offset: 1, transform: at(top.x, mouth + 8, P, 0.2), opacity: 0 },
    ], { duration: T, fill: 'forwards' }));
    if (chest.current) anims.push(chest.current.animate([
      { offset: 0, transform: at(cx0, cy0, CS, ck0), opacity: seen ? 1 : 0 },
      { offset: 0.12, transform: at(cx0, cy0, CS, ck0), opacity: seen ? 1 : 0, easing: 'cubic-bezier(0.3, 0.9, 0.3, 1.15)' },
      { offset: 0.32, transform: at(chestAt.x, chestAt.y, CS, 1), opacity: 1 },
      { offset: 0.8, transform: at(chestAt.x, chestAt.y, CS, 1), opacity: 1, easing: ease },
      { offset: 0.97, transform: at(cx0, cy0, CS, ck0), opacity: seen ? 1 : 0 },
      { offset: 1, transform: at(cx0, cy0, CS, ck0), opacity: seen ? 1 : 0 },
    ], { duration: T, fill: 'forwards' }));
    if (dim.current) anims.push(dim.current.animate([
      { offset: 0, opacity: 0 }, { offset: 0.25, opacity: 1 }, { offset: 0.8, opacity: 1 }, { offset: 1, opacity: 0 },
    ], { duration: T, fill: 'forwards' }));

    const timers = [
      window.setTimeout(() => triggerHaptic(10), 360),
      window.setTimeout(() => setLid('opening'), 1250),
      window.setTimeout(() => { setLid('closing'); triggerHaptic(22); }, 2560),
      window.setTimeout(() => done.current(), T),
    ];
    return () => {
      timers.forEach(t => window.clearTimeout(t));
      anims.forEach(a => a.cancel());
      if (seen) slot!.style.visibility = '';
      // the pearl comes back into its row with a hop
      const home = document.querySelector<HTMLElement>(`[data-token="${CSS.escape(f.id)}"]`);
      if (home) {
        home.classList.remove('sg-bead-in');
        void home.offsetWidth;
        home.classList.add('sg-bead-in');
        window.setTimeout(() => home.classList.remove('sg-bead-in'), 700);
      }
    };
  }, [f]);

  const icon = f.token === 'pearl'
    ? <PearlIcon state={f.state} size={P} />
    : <TokenIcon kind={f.token} state={f.state} size={P} />;

  return createPortal(
    <div className="fixed inset-0 z-[96] pointer-events-none overflow-hidden" aria-hidden>
      <style>{`[data-token="${CSS.escape(f.id)}"]{visibility:hidden}`}</style>
      <div ref={dim} className="absolute inset-0 opacity-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(28,18,11,0.15),rgba(28,18,11,0.45))]" />
      <div ref={chest} className="absolute left-0 top-0 opacity-0" style={{ width: CS, height: CH, transformOrigin: '50% 50%' }}>
        <TreasureChest
          open={lid === 'opening'}
          motion={lid === 'shut' ? undefined : lid}
          heap={f.token}
          spin
          size={CS}
        />
      </div>
      <div ref={pearl} className="absolute left-0 top-0" style={{ width: P, height: P, transformOrigin: '50% 50%' }}>
        <div className="sg-fly-glow absolute -inset-[70%] rounded-full bg-[radial-gradient(circle,rgba(255,236,170,0.95)_0%,rgba(246,201,78,0.5)_32%,rgba(246,201,78,0)_68%)]" />
        <div className="absolute -inset-[60%]">
          <svg viewBox="-50 -50 100 100" className="sg-fly-rays w-full h-full">
            {Array.from({ length: 12 }, (_, k) => (
              <path key={k} d="M-2.2 -20 L0 -48 L2.2 -20 Z" fill="#fff3c4" opacity={k % 2 ? 0.45 : 0.75} transform={`rotate(${k * 30})`} />
            ))}
          </svg>
        </div>
        {SPARKS.map(([dx, dy], k) => (
          <span
            key={k}
            className="sg-fly-spark absolute left-1/2 top-1/2 -ml-1 -mt-1 w-2 h-2 rounded-full bg-[#fff6d8] shadow-[0_0_8px_3px_rgba(246,201,78,0.85)]"
            style={{ '--dx': `${dx}px`, '--dy': `${dy}px`, animationDelay: `${0.4 + k * 0.15}s` } as React.CSSProperties}
          />
        ))}
        <div className="relative">{icon}</div>
      </div>
    </div>,
    document.body,
  );
};

export const PearlFlight: React.FC<{ flight: Flight | null; onDone: () => void }> = ({ flight, onDone }) => {
  const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  useEffect(() => { if (flight && still) onDone(); }, [flight, still, onDone]);
  if (!flight || still) return null;
  return <Flying key={flight.n} f={flight} onDone={onDone} />;
};
