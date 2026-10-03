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
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80 p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
      <div className="flex items-center gap-2.5">
        <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 shadow-xs"></span>
        <h2 className="font-bold text-slate-800 text-lg sm:text-xl tracking-tight">
          {title}
        </h2>
      </div>

      {/* Fast search filter input */}
      <div className="relative flex-1 sm:max-w-xs">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="ძიება საგალობლებში..."
          className="w-full pl-9 pr-8 py-2 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all shadow-2xs"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            title="გასუფთავება"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
