import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

// „მაგიდის ეკრანი“: the full-screen face of a live game (games hub, 2026-10-28) — the one phone on the table shows big
// text and big buttons, nothing else; the screen stays awake while it is open. Born with „ამიხსენი“, for every live game
// after it. Respects the phone's safe areas (viewport-fit=cover). `tone="night"` dims it to the night's dark blue
// („სამშვილდის ღამე“: the host reads the night by it while everybody's eyes are closed).

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

export const TableScreen: React.FC<{
  title: React.ReactNode;
  right?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  tone?: 'day' | 'night';
}> = ({ title, right, onClose, children, footer, tone = 'day' }) => {
  useWakeLock(true);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
  const night = tone === 'night';
  return (
    <div className={`fixed inset-0 z-[70] flex flex-col safe-top safe-bottom safe-x ${night ? 'bg-[#1b1830] text-[#ece3d2]' : 'bg-[#fbf6ec] text-[#4a3426]'}`} role="dialog" aria-modal="true">
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
