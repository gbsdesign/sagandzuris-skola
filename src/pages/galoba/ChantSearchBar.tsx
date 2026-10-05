import React, { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

interface ChantSearchBarProps {
  title: string;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  resultCount?: number;
  /** small actions at the right end of the row (the "ჩამოწერა" button) */
  children?: React.ReactNode;
}

/** The list's heading row, as in the prototype: the title on the left, a small search and the download on the right.
 *  On a phone the search is an icon that opens into a field over the title. */
export const ChantSearchBar: React.FC<ChantSearchBarProps> = ({
  title,
  searchQuery,
  onSearchChange,
  children,
}) => {
  const [open, setOpen] = useState(Boolean(searchQuery));
  const inputRef = useRef<HTMLInputElement>(null);
  const expanded = open || Boolean(searchQuery);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  return (
    <div className="mt-2 mx-0.5 flex items-center justify-between gap-2.5">
      <h2 className={`${expanded ? 'hidden sm:block' : ''} min-w-0 text-[15px] font-extrabold leading-snug text-[#2a2017]`}>
        {title}
      </h2>

      <div className={`flex items-center gap-1.5 ${expanded ? 'flex-1 sm:flex-none' : ''}`}>
        <label className={`relative ${expanded ? 'flex flex-1' : 'hidden'} sm:flex sm:flex-none items-center`}>
          <Search className="w-3.5 h-3.5 text-[#a0907c] absolute left-3 pointer-events-none" />
          <input
            ref={inputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onBlur={() => { if (!searchQuery) setOpen(false); }}
            placeholder="ძიება…"
            aria-label="ძიება საგალობლებში"
            className="w-full sm:w-48 h-8 pl-8 pr-7 rounded-full bg-white text-[12.5px] text-[#2a2017] placeholder-[#a0907c] shadow-[inset_0_0_0_1px_#e4d8c4] focus:outline-none focus:shadow-[inset_0_0_0_1.5px_rgba(122,32,40,0.45)] transition-shadow [&::-webkit-search-cancel-button]:hidden"
          />
          {searchQuery && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onSearchChange(''); setOpen(false); }}
              className="absolute right-2 w-5 h-5 rounded-full grid place-items-center text-[#a0907c] hover:text-[#574739] cursor-pointer"
              title="გასუფთავება"
              aria-label="ძიების გასუფთავება"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </label>
        {!expanded && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="sm:hidden shrink-0 w-8 h-8 rounded-full grid place-items-center bg-white text-[#574739] shadow-[inset_0_0_0_1px_#e4d8c4] active:scale-95 transition-transform cursor-pointer"
            aria-label="ძიება საგალობლებში"
            title="ძიება"
          >
            <Search className="w-4 h-4" />
          </button>
        )}
        {children}
      </div>
    </div>
  );
};
