import React, { useMemo, useState } from 'react';
import { Plus, Search, Check } from 'lucide-react';
import { searchCatalog, CatalogEntry, CATEGORY_LABEL } from '../../utils/pathItems';

// Search box over every chant, song, poem and instrument; picking a result calls onPick.
export const CatalogPicker: React.FC<{
  onPick: (e: CatalogEntry) => void;
  isTaken?: (id: string) => boolean;
  placeholder?: string;
}> = ({ onPick, isTaken, placeholder = 'მოძებნე საგალობელი, სიმღერა, ლექსი ან საკრავი' }) => {
  const [q, setQ] = useState('');
  const results = useMemo(() => searchCatalog(q, 25), [q]);

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Search className="w-4 h-4 text-[#b3a594] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder={placeholder}
          className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-white ring-1 ring-[#e8dcc8] focus:ring-2 focus:ring-[#7a2028]/40 text-sm text-[#2a2017] placeholder:text-[#b3a594] outline-none transition"
        />
      </div>
      {q.trim() && (
        <ul className="max-h-64 overflow-y-auto rounded-2xl ring-1 ring-[#e8dcc8] bg-white divide-y divide-[#f1e8d9]">
          {results.map(e => {
            const taken = isTaken?.(e.id);
            return (
              <li key={e.id}>
                <button
                  type="button"
                  disabled={taken}
                  onClick={() => onPick(e)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-[#fbf6ec] disabled:opacity-50 disabled:cursor-default cursor-pointer"
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${taken ? 'bg-[#efe5d4] text-[#8a7a6a]' : 'bg-[#7a2028]/10 text-[#7a2028]'}`}>
                    {taken ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[#2a2017] truncate">{e.title}</span>
                    <span className="block text-xs text-[#8a7a6a]">{CATEGORY_LABEL[e.category]} · {e.code}</span>
                  </span>
                </button>
              </li>
            );
          })}
          {results.length === 0 && <li className="px-3 py-5 text-center text-sm text-[#8a7a6a]">ვერ მოიძებნა.</li>}
        </ul>
      )}
    </div>
  );
};
