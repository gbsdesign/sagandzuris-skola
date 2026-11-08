import React, { useSyncExternalStore } from 'react';
import { Search, X } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

// The songs' search field is folded since 2026-11-08 (the user: „სანიშნის ადგილას სერჩის ნიშანი ჩასვი“): the page bar's
// round 🔍 (in place of 📌) opens and closes it; GeorgiaMap shows the field while it is open.
let open = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

export const setSongSearchOpen = (v: boolean) => { if (open !== v) { open = v; emit(); } };
export const toggleSongSearch = () => setSongSearchOpen(!open);
export const useSongSearchOpen = () => useSyncExternalStore(
  l => { listeners.add(l); return () => { listeners.delete(l); }; },
  () => open,
  () => false,
);

// the bar's round 🔍 (36px, as the ☁ beside it); filled wine while the field is open
export const SongSearchButton: React.FC = () => {
  const on = useSongSearchOpen();
  return (
    <button
      type="button"
      onClick={() => { triggerHaptic(10); toggleSongSearch(); }}
      aria-label={on ? 'ძებნის დახურვა' : 'სიმღერის ძებნა'}
      aria-pressed={on}
      className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center cursor-pointer transition active:scale-95 ${
        on ? 'bg-[#7a2028] text-white' : 'bg-white/85 ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40 text-[#7a2028]'
      }`}
    >
      {on ? <X className="w-[18px] h-[18px]" /> : <Search className="w-[18px] h-[18px]" />}
    </button>
  );
};
