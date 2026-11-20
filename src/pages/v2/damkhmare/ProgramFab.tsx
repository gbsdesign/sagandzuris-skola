import React, { useEffect, useRef, useState } from 'react';
import { useAuth, useNavigation } from '../../../context';
import { useNotes } from '../../../context/NotesContext';
import { useCall } from '../../../utils/callSession';
import { triggerHaptic } from '../../../utils/haptics';
import { cx } from '../../../components/ui2';
import { GearSpark } from './GearSpark';
import { openAssistant, useAssistantAllowed } from './open';
import { useFabShown } from './fabPref';

// „მცურავი კბილანა“ (plan 2.0, prototype 15): a small round cog that follows a superadmin onto every page and opens
// „ავტომატური პროგრამა“ as a small window over that page, told which page it is. Only superadmins (the user's rule:
// „ეგ მხოლოდ სუპერ ადმინებს ქონდეთ“). A finger drags it; where it is left, it stays (the device's `sg-program-fab`).
// It hides in church mode and during a call, and while the program's own window is open — and wholly when switched off
// (fabPref.ts: „პარამეტრები“ → „მცურავი კბილანა“, or the small window's „დამალვა“).

const KEY = 'sg-program-fab';
const SIZE = 52;
const EDGE = 8;
/** over the bottom menu by default */
const DEFAULT = { right: 16, bottom: 104 };

interface Spot { right: number; bottom: number }

const read = (): Spot => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (v && Number.isFinite(v.right) && Number.isFinite(v.bottom)) return { right: v.right, bottom: v.bottom };
  } catch { /* storage off */ }
  return DEFAULT;
};

const clamp = (s: Spot): Spot => ({
  right: Math.min(Math.max(EDGE, s.right), Math.max(EDGE, window.innerWidth - SIZE - EDGE)),
  bottom: Math.min(Math.max(EDGE, s.bottom), Math.max(EDGE, window.innerHeight - SIZE - EDGE)),
});

export const ProgramFab: React.FC<{ hidden?: boolean }> = ({ hidden }) => {
  const { isSuperAdmin } = useAuth();
  const allowed = useAssistantAllowed();
  const { currentPage, selectedClassId } = useNavigation();
  const { church } = useNotes();
  const call = useCall();
  const shown = useFabShown();
  const [spot, setSpot] = useState<Spot>(() => clamp(read()));
  const [held, setHeld] = useState(false);
  const drag = useRef<{ x: number; y: number; from: Spot; moved: boolean } | null>(null);
  /** a drag just ended: the click that follows it does not open the window */
  const dragged = useRef(false);

  // a turned phone or a smaller window keeps it on the screen
  useEffect(() => {
    const fit = () => setSpot(s => clamp(s));
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const inCall = call.status === 'connecting' || call.status === 'waiting' || call.status === 'live';
  if (!isSuperAdmin || !allowed || !shown || hidden || church || inCall) return null;

  const down = (e: React.PointerEvent<HTMLButtonElement>) => {
    dragged.current = false;
    drag.current = { x: e.clientX, y: e.clientY, from: spot, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
    setHeld(true);
  };
  const move = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 8) return;
    d.moved = true;
    setSpot(clamp({ right: d.from.right - dx, bottom: d.from.bottom - dy }));
  };
  const up = () => {
    const d = drag.current;
    drag.current = null;
    setHeld(false);
    if (!d?.moved) return;
    dragged.current = true;
    try { localStorage.setItem(KEY, JSON.stringify(spot)); } catch { /* storage off */ }
  };
  // a tap, or Enter / Space from a keyboard
  const press = () => {
    if (dragged.current) { dragged.current = false; return; }
    triggerHaptic(10);
    openAssistant({ classId: currentPage === 'class' ? selectedClassId ?? undefined : undefined, page: currentPage, mini: true });
  };

  return (
    <button
      type="button"
      aria-label="ავტომატური პროგრამა"
      title="ავტომატური პროგრამა"
      onClick={press}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => { drag.current = null; setHeld(false); }}
      style={{ right: spot.right, bottom: `calc(${spot.bottom}px + env(safe-area-inset-bottom, 0px))` }}
      className={cx(
        'fixed z-[45] flex size-[52px] cursor-pointer touch-none items-center justify-center rounded-full bg-wine text-white shadow-float select-none',
        'ring-4 ring-page transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine/60',
        '[&_svg]:size-7',
        held ? 'scale-110' : 'active:scale-95',
      )}
    >
      <GearSpark />
    </button>
  );
};
