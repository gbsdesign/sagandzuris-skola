import React from 'react';
import { Search, X } from 'lucide-react';

interface ChantSearchBarProps {
  title: string;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  resultCount?: number;
}

export const ChantSearchBar: React.FC<ChantSearchBarProps> = ({
  title,
  searchQuery,
  onSearchChange,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/70 p-3 sm:p-4 rounded-2xl border border-[#e4d8c4] shadow-[0_1px_2px_rgba(42,32,23,0.05)]">
      <div className="flex items-center gap-2.5">
        <span aria-hidden className="w-1.5 h-6 rounded-full bg-gradient-to-b from-[#a3323d] to-[#7a2028]" />
        <h2 className="font-serif-ge font-bold text-[#2a2017] text-lg sm:text-xl">
          {title}
        </h2>
      </div>

      {/* Fast search filter input */}
      <div className="relative flex-1 sm:max-w-xs">
        <Search className="w-4 h-4 text-[#a0907c] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="ძიება საგალობლებში..."
          className="w-full h-10 pl-9 pr-8 rounded-xl bg-[#faf6ef] border border-[#e4d8c4] text-[13px] sm:text-sm text-[#2a2017] placeholder-[#a0907c] focus:outline-none focus:ring-2 focus:ring-[#7a2028]/10 focus:border-[#7a2028]/40 focus:bg-white transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#a0907c] hover:text-[#574739] p-0.5 cursor-pointer"
            title="გასუფთავება"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
