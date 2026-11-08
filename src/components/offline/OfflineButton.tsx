import React, { lazy, Suspense, useState } from 'react';
import { Cloud, CloudDownload, CloudOff } from 'lucide-react';
import { offlineStatus, runPercent, useOffline } from '../../utils/offlineFiles';
import { useAccess } from '../../hooks/useAccess';
import { triggerHaptic } from '../../utils/haptics';
import type { OfflineKind } from './OfflineSheet';

// A list's round ☁ (2026-11-08; the header's cloud is gone — the user: „ჩამოტვირთვის ლოგო დავშალოთ“): beside the
// chant page's „1 2“, on the songs', the admission program's and the library's bar. A tap opens that list's part of
// „ოფლაინ რეჟიმი“ in a window (OfflineSheet.tsx, loaded on the first tap). A thin bar fills while something the
// person turned on downloads; crossed out without internet.

const OfflineSheet = lazy(() => import('./OfflineSheet'));

const LABEL: Record<OfflineKind, string> = {
  galoba: 'ოფლაინ: ნოტები და გალობა',
  simghera: 'ოფლაინ: სიმღერები',
  abituri: 'ოფლაინ: აბიტურიენტს',
  library: 'ოფლაინ: ბიბლიოთეკა',
};

export const OfflineButton: React.FC<{ kind: OfflineKind }> = ({ kind }) => {
  const s = useOffline();
  const { can } = useAccess();
  const [open, setOpen] = useState(false);
  // the songs and the admission program offer only recordings
  if (!s.supported || ((kind === 'simghera' || kind === 'abituri') && !can('recordings'))) return null;
  const status = offlineStatus(s);
  const pct = runPercent(s);
  const mine = status === 'run' && !!s.run && !s.run.what.startsWith('auto-');
  const Icon = mine ? CloudDownload : status === 'offline' ? CloudOff : Cloud;
  return (
    <>
      <button
        type="button"
        onClick={() => { triggerHaptic(10); setOpen(true); }}
        className="relative w-9 h-9 shrink-0 rounded-full bg-white/85 ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40 text-[#7a2028] flex items-center justify-center cursor-pointer transition active:scale-95"
        title={LABEL[kind]}
        aria-label={LABEL[kind]}
      >
        <Icon className={`w-[18px] h-[18px] ${status === 'offline' ? 'text-[#8a7a6a]' : ''}`} />
        {mine && (
          <span aria-hidden className="absolute left-2 right-2 bottom-1.5 h-[3px] rounded-full bg-current/15 overflow-hidden">
            <span className="block h-full rounded-full bg-current transition-[width] duration-500" style={{ width: `${Math.max(6, pct)}%` }} />
          </span>
        )}
      </button>
      {open && <Suspense fallback={null}><OfflineSheet kind={kind} onClose={() => setOpen(false)} /></Suspense>}
    </>
  );
};
