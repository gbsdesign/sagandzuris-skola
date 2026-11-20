import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';
import { X } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import { useCall } from '../../utils/callSession';
import { useNewLook } from '../../design/newLook';
import { Bar, RoundButton } from '../ui2';
import { useTableOpened } from './gameVariant';
import { useBackToClose } from '../../utils/backToClose';

// „მაგიდის ეკრანი“: the full-screen face of a live game (games hub, 2026-10-28) — the one phone on the table shows big
// text and big buttons, nothing else; the screen stays awake while it is open. Born with „ამიხსენი“, for every live game
// after it. Respects the phone's safe areas (viewport-fit=cover). `tone="night"` dims it to the night's dark blue
// („სამშვილდის ღამე“: the host reads the night by it while everybody's eyes are closed). A call shrunk to its bar keeps
// its place over the top.

const useWakeLock = (on: boolean) => {
  useEffect(() => {
    if (!on) return;
    let lock: { release: () => Promise<void> } | null = null;
    let gone = false;
    const nav = navigator as Navigator & { wakeLock?: { request: (kind: 'screen') => Promise<{ release: () => Promise<void> }> } };
    const take = () => nav.wakeLock?.request('screen').then(l => { if (gone) l.release(); else lock = l; }).catch(() => { /* not allowed: the screen may sleep */ });
    take();
    const back = () => { if (document.visibilityState === 'visible') take(); };
    document.addEventListener('visibilitychange', back);
    return () => { gone = true; document.removeEventListener('visibilitychange', back); lock?.release().catch(() => { /* already gone */ }); };
  }, [on]);
};

// The new look (boards x-tamashi-kitkhva · -asoebi · -mosmena: „ყველას ერთი ჩარჩო ექნება: ✕, სახელი, რიცხვი“): the page's own
// ground, a round ✕, the name, the round's count at the right and a thin line of how far the game is. A screen tells its
// count through `useTableHead` (the quick games' RoundHead does it for all of them).
export interface TableHead { at: number; total: number }
const HeadCtx = createContext<((h: TableHead | null) => void) | null>(null);

/** a round's place on the screen's head („1 / 10“ and the line); true when the head shows it (the new look's frame) */
export const useTableHead = (at: number, total: number): boolean => {
  const set = useContext(HeadCtx);
  const nl = useNewLook();
  const on = nl && !!set && total > 0;
  useLayoutEffect(() => {
    if (!on || !set) return;
    set({ at, total });
    return () => set(null);
  }, [on, set, at, total]);
  return on;
};

/** the same as a part to put inside the screen (a game that keeps its count in its own state) */
export const TableCount: React.FC<{ at: number; total: number }> = ({ at, total }) => { useTableHead(at, total); return null; };

export const TableScreen: React.FC<{
  title: React.ReactNode;
  /** the new look's grey line under the name („რაუნდი 2 / 6“ — pages/v2/tamashebi/TurnFrame) */
  sub?: React.ReactNode;
  right?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  tone?: 'day' | 'night';
}> = ({ title, sub, right, onClose, children, footer, tone = 'day' }) => {
  useWakeLock(true);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
  const night = tone === 'night';
  // a call shrunk to its bar (a game's own call) floats over the top: the table starts under it
  const call = useCall();
  const bar = call.small && call.info && call.status !== 'idle' && call.status !== 'ended';
  const nl = useNewLook();
  const [head, setHead] = useState<TableHead | null>(null);
  // the new look's game frame shows the game when a play screen opens under its first page (an invitation, a resumed game)
  useTableOpened(nl);
  // the new look: the phone's back does what the ✕ does (pauses / leaves this screen) instead of hiding the game under its
  // first page with the play screen still open behind it
  useBackToClose(nl, onClose);
  if (nl) {
    return (
      <HeadCtx.Provider value={setHead}>
        <div className={`fixed inset-0 z-[70] flex flex-col safe-top safe-bottom safe-x ${night ? 'bg-ink text-night-ink' : 'bg-page text-ink'}`} role="dialog" aria-modal="true">
          {bar && <div className="h-[66px] shrink-0" aria-hidden="true" />}
          <div className="flex shrink-0 items-center gap-2.5 px-4 pt-3.5 pb-2.5">
            <RoundButton label="დახურვა" tone={night ? 'glass' : 'surf'} onClick={onClose}><X strokeWidth={1.75} /></RoundButton>
            {sub ? (
              <div className="min-w-0 flex-1 pl-0.5">
                <div className="sg-fit truncate text-head leading-tight font-bold tracking-tight">{title}</div>
                <div className={`sg-fit truncate text-meta ${night ? 'text-night-ink/70' : 'text-mut'}`}>{sub}</div>
              </div>
            ) : <div className="sg-fit min-w-0 flex-1 truncate pl-0.5 text-head leading-tight font-bold tracking-tight">{title}</div>}
            {head && <span className={`shrink-0 text-meta font-bold tabular-nums ${night ? 'text-night-ink/70' : 'text-mut'}`}>{head.at + 1} / {head.total}</span>}
            {right}
          </div>
          {head && <div className="shrink-0 px-4 pb-3"><Bar value={(head.at + 1) / head.total} tone={night ? 'white' : 'wine'} label={`${head.at + 1} / ${head.total}`} /></div>}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4">{children}</div>
          {footer && <div className="shrink-0 px-4 pt-2 pb-4">{footer}</div>}
        </div>
      </HeadCtx.Provider>
    );
  }
  return (
    <div className={`fixed inset-0 z-[70] flex flex-col safe-top safe-bottom safe-x ${night ? 'bg-[#1b1830] text-[#ece3d2]' : 'bg-[#fbf6ec] text-[#4a3426]'}`} role="dialog" aria-modal="true">
      {bar && <div className="h-[66px] shrink-0" aria-hidden="true" />}
      <div className="flex items-center gap-2 px-3 h-14 shrink-0">
        <button
          type="button"
          onClick={() => { triggerHaptic(10); onClose(); }}
          aria-label="დახურვა"
          className={`w-11 h-11 -ml-1 rounded-full flex items-center justify-center cursor-pointer ${night ? 'text-[#e2c27a] hover:bg-white/10' : 'text-[#7a2028] hover:bg-[#7a2028]/[0.07]'}`}
        >
          <X className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1 font-serif-ge text-[15px] font-bold truncate">{title}</div>
        {right}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 flex flex-col">{children}</div>
      {footer && <div className="shrink-0 px-4 pb-4 pt-2">{footer}</div>}
    </div>
  );
};

export default TableScreen;
