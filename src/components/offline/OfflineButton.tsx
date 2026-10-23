import React from 'react';
import { Cloud, CloudCheck, CloudDownload, CloudOff } from 'lucide-react';
import { useNavigation } from '../../context';
import { offlineStatus, runPercent, useOffline } from '../../utils/offlineFiles';
import { triggerHaptic } from '../../utils/haptics';

// The header's cloud: does the app work without internet? A thin bar fills while something downloads, ✓ when all
// that was chosen is on the device, an amber dot when some of it is not yet, crossed out without internet.
// Opens „ოფლაინ რეჟიმი“ (pages/OfflinePage.tsx).
export const OFFLINE_LABEL: Record<ReturnType<typeof offlineStatus>, string> = {
  run: 'ოფლაინ რეჟიმი — ჩამოწერა მიმდინარეობს',
  offline: 'ინტერნეტი არ არის — აპი მუშაობს ჩამოწერილით',
  pending: 'ოფლაინ რეჟიმი — ნაწილი ჯერ არ ჩამოწერილა',
  ready: 'ოფლაინ რეჟიმი — ყველაფერი ჩამოწერილია',
  starting: 'ოფლაინ რეჟიმი',
};

export const OfflineButton: React.FC = () => {
  const s = useOffline();
  const { navigateTo, currentPage } = useNavigation();
  if (!s.supported) return null;
  const status = offlineStatus(s);
  const pct = runPercent(s);
  const Icon = status === 'run' ? CloudDownload : status === 'offline' ? CloudOff : status === 'ready' ? CloudCheck : Cloud;
  const here = currentPage === 'offline';
  const label = status === 'run' ? `${OFFLINE_LABEL.run} · ${pct}%` : OFFLINE_LABEL[status];
  return (
    <button
      type="button"
      onClick={() => { triggerHaptic(10); navigateTo('offline'); }}
      className={`relative w-9 h-9 rounded-xl ring-1 flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0 ${
        here ? 'bg-[#7a2028] ring-[#7a2028] text-[#fbf6ec]' : 'bg-white/80 hover:bg-white ring-[#e8dcc8] hover:ring-[#7a2028]/40 text-[#7a2028]'
      }`}
      title={label}
      aria-label={label}
    >
      <Icon className={`w-4 h-4 ${status === 'offline' && !here ? 'text-[#8a7a6a]' : ''}`} />
      {status === 'run' && (
        <span aria-hidden className="absolute left-2 right-2 bottom-1.5 h-[3px] rounded-full bg-current/15 overflow-hidden">
          <span className="block h-full rounded-full bg-current transition-[width] duration-500" style={{ width: `${Math.max(6, pct)}%` }} />
        </span>
      )}
      {status === 'pending' && <span aria-hidden className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-[#fbf6ec]" />}
    </button>
  );
};
