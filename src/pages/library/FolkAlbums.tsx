import React, { useState } from 'react';
import { ChevronDown, Disc3 } from 'lucide-react';
import { CentreAlbums, useShownAlbums } from '../../components/maps/CentreAlbums';
import { triggerHaptic } from '../../utils/haptics';

// The Folklore Centre's song albums, folded on the library's shelf under the chant recordings (2026-11-09, the user:
// „ალბომები გადაიტანე ბიბლიოთეკაში ჩამოსაშლელად“ — they left the songs map). Only the albums the person may hear
// (data/albumAccess.ts); none → nothing here. An album opens as the library's step `falbum:<id>` (LibraryPage).

const KEY = 'sg-library-folk-albums-open';
const wasOpen = () => { try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; } };

export const FolkAlbums: React.FC<{ onOpen: (albumId: string) => void }> = ({ onOpen }) => {
  const albums = useShownAlbums();
  const [open, setOpen] = useState(wasOpen);
  if (albums.length === 0) return null;

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
        aria-controls="folk-albums"
        className="group w-full flex items-center gap-3.5 min-h-16 rounded-2xl bg-[#fffdf8] ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/30 shadow-[0_1px_2px_rgba(42,32,23,0.04),0_10px_24px_-20px_rgba(42,32,23,0.45)] px-3.5 py-2.5 text-left cursor-pointer active:scale-[0.99] transition-all"
      >
        <span className="w-11 h-11 shrink-0 rounded-xl bg-[#f6ecda] ring-1 ring-[#ead9bd] flex items-center justify-center text-[#7a2028]">
          <Disc3 className="w-5 h-5" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-serif-ge text-[15px] font-bold leading-snug text-[#2a2017]">ხალხური სიმღერების ალბომები</span>
          <span className="mt-0.5 block text-[12px] leading-snug text-[#8a7a6a]">ფოლკლორის ცენტრი · {albums.length} ალბომი</span>
        </span>
        <ChevronDown className={`w-5 h-5 shrink-0 text-[#cdbba3] group-hover:text-[#7a2028] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div id="folk-albums" className="mt-2 animate-[galoba-unfold_0.25s_ease_both]">
          <CentreAlbums bare onOpen={onOpen} />
        </div>
      )}
    </div>
  );
};
