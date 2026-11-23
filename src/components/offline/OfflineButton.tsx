import React, { lazy, Suspense, useState } from 'react';
import { Cloud, CloudDownload, CloudOff } from 'lucide-react';
import { offlineStatus, runPercent, useOffline } from '../../utils/offlineFiles';
import { useAccess } from '../../hooks/useAccess';
import { RoundButton } from '../ui2';
import type { OfflineKind } from './OfflineSheet';
import { useRecordingTools } from '../../hooks/useRecordingTools';

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
  wignebi: 'ოფლაინ: საღვთისმსახურო წიგნები',
};

export const OfflineButton: React.FC<{ kind: OfflineKind }> = ({ kind }) => {
  const s = useOffline();
  const { can } = useAccess();
  const tools = useRecordingTools();
  const [open, setOpen] = useState(false);
  // the songs and the admission program offer only recordings
  if (!s.supported || ((kind === 'simghera' || kind === 'abituri') && (!can('recordings') || !tools.offline))) return null;
  const status = offlineStatus(s);
  const pct = runPercent(s);
  const mine = status === 'run' && !!s.run && !s.run.what.startsWith('auto-');
  const Icon = mine ? CloudDownload : status === 'offline' ? CloudOff : Cloud;
  return (
    <>
      <RoundButton tone="surf" label={LABEL[kind]} onClick={() => setOpen(true)} className="text-wine">
        <Icon className={status === 'offline' ? 'text-mut' : ''} />
        {mine && (
          <span aria-hidden className="absolute right-2 bottom-1.5 left-2 h-[3px] overflow-hidden rounded-full bg-current/15">
            <span className="block h-full rounded-full bg-current transition-[width] duration-500" style={{ width: `${Math.max(6, pct)}%` }} />
          </span>
        )}
      </RoundButton>
      {open && <Suspense fallback={null}><OfflineSheet kind={kind} onClose={() => setOpen(false)} /></Suspense>}
    </>
  );
};
