import React, { useSyncExternalStore } from 'react';
import { Map as MapIcon, Search, X, type LucideIcon } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

// A page's search field folded under the bar's round 🔍 (in place of 📌). The songs' since 2026-11-08 (the user: „სანიშნის
// ადგილას სერჩის ნიშანი ჩასვი“), the churches' since 2026-11-09 („სამაგრის ადგილას ლუპა ჩასვი … ასარჩევი პანელი გააუქმე“).
const makeFold = (label: string, Icon: LucideIcon = Search, closeLabel = 'ძებნის დახურვა', xWhenOn = true) => {
  let open = false;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach(l => l());
  const set = (v: boolean) => { if (open !== v) { open = v; emit(); } };
  const use = () => useSyncExternalStore(
    l => { listeners.add(l); return () => { listeners.delete(l); }; },
    () => open,
    () => false,
  );
  // the bar's round 🔍 (36px, as the ☁ beside it); filled wine while the field is open
  const Button: React.FC = () => {
    const on = use();
    return (
      <button
        type="button"
        onClick={() => { triggerHaptic(10); set(!open); }}
        aria-label={on ? closeLabel : label}
        aria-pressed={on}
        className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center cursor-pointer transition active:scale-95 ${
          on ? 'bg-[#7a2028] text-white' : 'bg-white/85 ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40 text-[#7a2028]'
        }`}
      >
        {on && xWhenOn ? <X className="w-[18px] h-[18px]" /> : <Icon className="w-[18px] h-[18px]" />}
      </button>
    );
  };
  return { set, use, Button };
};

const songs = makeFold('სიმღერის ძებნა');
export const setSongSearchOpen = songs.set;
export const useSongSearchOpen = songs.use;
export const SongSearchButton = songs.Button;

const churches = makeFold('ტაძრის ძებნა');
export const setChurchSearchOpen = churches.set;
export const useChurchSearchOpen = churches.use;
export const ChurchSearchButton = churches.Button;

// the prayer book's (2026-11-09, the user: „საძიებელის ლუპა გადაიტანე სანიშნის ადგილას და ჩაანაცვლე“)
const prayers = makeFold('ძებნა ლოცვანში');
export const setPrayerSearchOpen = prayers.set;
export const usePrayerSearchOpen = prayers.use;
export const PrayerSearchButton = prayers.Button;

// the churches' dots map (2026-11-09, the user: „მაღლა აიტანე რუკის ნიშანი მრგვალად ძებნის ღილაკთან … კუთხეები პირდაპირ დატოვე“):
// filled while the dots map shows in place of the regions
const churchMap = makeFold('რუკა წერტილებით', MapIcon, 'კუთხეებზე დაბრუნება', false);
export const setChurchMapOpen = churchMap.set;
export const useChurchMapOpen = churchMap.use;
export const ChurchMapButton = churchMap.Button;
