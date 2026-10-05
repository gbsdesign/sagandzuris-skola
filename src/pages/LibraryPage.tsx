import React, { useState } from 'react';
import { BookOpen, Church } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { BookTab } from './library/BookTab';
import { FeastsTab } from './library/FeastsTab';

// "ბიბლიოთეკა": readings from orthodoxy.ge — Svimon Mchedlidze's Sacred History and the church feasts
const TABS = [
  { id: 'book', label: 'საღმრთო ისტორია', Icon: BookOpen },
  { id: 'feasts', label: 'დღესასწაულები', Icon: Church },
] as const;
type TabId = typeof TABS[number]['id'];

const TAB_KEY = 'libraryTab';

export const LibraryPage: React.FC = () => {
  const [tab, setTab] = useState<TabId>(() => {
    try { return localStorage.getItem(TAB_KEY) === 'feasts' ? 'feasts' : 'book'; } catch { return 'book'; }
  });
  const pick = (id: TabId) => {
    triggerHaptic(10);
    setTab(id);
    try { localStorage.setItem(TAB_KEY, id); } catch { /* ignore */ }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-2 px-1">
      {/* full width on a phone, a compact centred switch from sm up */}
      <div role="tablist" aria-label="ბიბლიოთეკა" className="flex sm:w-fit sm:mx-auto rounded-full bg-white/80 ring-1 ring-[#e8dcc8] p-1">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => pick(id)}
            className={`flex-1 sm:flex-none min-w-0 inline-flex items-center justify-center gap-1.5 h-9 px-3 sm:px-5 rounded-full text-[13px] font-bold whitespace-nowrap transition-all cursor-pointer select-none active:scale-[0.98] ${
              tab === id ? 'bg-[#7a2028] text-[#fbf6ec] shadow-[0_6px_14px_-8px_rgba(122,32,40,0.7)]' : 'text-[#4a3426] hover:text-[#7a2028] hover:bg-[#7a2028]/[0.04]'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4" role="tabpanel">
        {tab === 'book' ? <BookTab /> : <FeastsTab />}
      </div>
    </div>
  );
};
