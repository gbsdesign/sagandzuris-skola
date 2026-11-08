import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Headphones } from 'lucide-react';
import { CHANT_ALBUMS } from '../../data/chantAlbums';
import { useAccess } from '../../hooks/useAccess';
import { useAuth } from '../../context';
import { triggerHaptic } from '../../utils/haptics';

// The chant recordings without notes (choirs, schools) on the library's front room: one folded card „ჩანაწერები“
// that unfolds the albums. It stays open on coming back from an album (kept for this visit). Moved here from the
// chant page on 2026-11-08 (the user's wish); the album counts are gone. Only for those who may hear recordings.

const KEY = 'sg-library-recordings-open';
const wasOpen = () => { try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; } };

export const ChantRecordings: React.FC<{ onOpen: (albumId: string) => void }> = ({ onOpen }) => {
  const { can } = useAccess();
  // „დასაზუსტებელი“ is the admins' sorting box, not a list for members
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(wasOpen);
  if (!can('recordings')) return null;

  const toggle = () => {
    triggerHaptic(10);
    setOpen(o => {
      try { sessionStorage.setItem(KEY, o ? '0' : '1'); } catch { /* this visit only */ }
      return !o;
    });
  };

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="chant-albums"
        className="group w-full flex items-center gap-3.5 min-h-16 rounded-2xl bg-[#fffdf8] ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/30 shadow-[0_1px_2px_rgba(42,32,23,0.04),0_10px_24px_-20px_rgba(42,32,23,0.45)] px-3.5 py-2.5 text-left cursor-pointer active:scale-[0.99] transition-all"
      >
        <span className="w-11 h-11 shrink-0 rounded-xl bg-[#f6ecda] ring-1 ring-[#ead9bd] flex items-center justify-center text-[#b4620e]">
          <Headphones className="w-5 h-5" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-serif-ge text-[15px] font-bold leading-snug text-[#2a2017]">ჩანაწერები</span>
          <span className="mt-0.5 block text-[12px] leading-snug text-[#8a7a6a]">გუნდები და სკოლები</span>
        </span>
        <ChevronDown className={`w-5 h-5 shrink-0 text-[#cdbba3] group-hover:text-[#7a2028] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div id="chant-albums" className="mt-2 flex flex-col gap-2 animate-[galoba-unfold_0.25s_ease_both]">
          {CHANT_ALBUMS.filter(a => a.id !== 'unsure' || isAdmin).map(({ id, title }) => (
            <button
              key={id}
              type="button"
              onClick={() => { triggerHaptic(15); onOpen(id); }}
              className="group w-full flex items-center gap-3 min-h-14 pl-5 pr-3.5 py-2 rounded-2xl bg-white ring-1 ring-[#e8dcc8] shadow-[0_1px_3px_rgba(74,52,38,0.08)] hover:ring-[#b4620e]/40 active:scale-[0.98] transition-all duration-200 cursor-pointer text-left select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7a2028]"
            >
              <span className="flex-1 min-w-0 font-serif-ge font-bold text-[16px] leading-tight text-[#2a2017]">{title}</span>
              <span className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[#b4620e] bg-[#b4620e]/[0.08] group-hover:bg-[#b4620e] group-hover:text-white transition-colors" aria-hidden>
                <ChevronRight className="w-4 h-4" />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
