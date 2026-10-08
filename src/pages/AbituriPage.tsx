import React, { useState } from 'react';
import { triggerHaptic } from '../utils/haptics';
import { SongPage } from '../components/maps/SongPage';
import { ProgramTab } from './abituri/ProgramTab';
import { TheoryTab } from './abituri/TheoryTab';
import { ColloquiumTab } from './abituri/ColloquiumTab';
import { AdmissionTab } from './abituri/AdmissionTab';
import { UpdateNotice } from './abituri/shared';

// "აბიტურიენტს": the way into the University of Chant — the three admission exams and the registration.
// Data: data/abituriProgram.ts; opened from the small label under "გალობა" on the home vine.
const TABS = [
  { id: 'program', step: 'I გამოცდა', label: 'გალობა-სიმღერა' },
  { id: 'theory', step: 'II გამოცდა', label: 'თეორია' },
  { id: 'colloquium', step: 'III გამოცდა', label: 'კოლოქვიუმი' },
  { id: 'admission', step: 'რეგისტრაცია', label: 'ჩაბარება' },
] as const;
type TabId = typeof TABS[number]['id'];

const TAB_KEY = 'abituriTab';

export const AbituriPage: React.FC = () => {
  const [tab, setTab] = useState<TabId>(() => {
    try {
      const saved = localStorage.getItem(TAB_KEY);
      return (TABS.some(t => t.id === saved) ? saved : 'program') as TabId;
    } catch { return 'program'; }
  });
  const pick = (id: TabId) => {
    triggerHaptic(10);
    setTab(id);
    try { localStorage.setItem(TAB_KEY, id); } catch { /* ignore */ }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-6 px-1">
      <header className="text-center px-2 mb-5">
        <p className="text-[12px] font-black uppercase tracking-[0.14em] text-[#a0703c]">მისაღები გამოცდები · 2026</p>
        <h2 className="mt-1.5 font-serif-ge text-[22px] sm:text-[26px] font-bold leading-tight text-[#2a2017] text-balance">
          გზა გალობის უნივერსიტეტისკენ
        </h2>
        <p className="mt-2 mx-auto max-w-md text-[14px] leading-relaxed text-[#6b5c4d] text-pretty">
          სამი გამოცდა და ყველაფერი, რაც მათთვის გჭირდება — პროგრამა, ნოტები და ხმა-ხმა ჩანაწერები ერთ ადგილას.
        </p>
        <UpdateNotice className="mt-4 mx-auto max-w-xl" />
      </header>

      {/* the exams in order: two by two on a phone, one row from sm up */}
      <div role="tablist" aria-label="აბიტურიენტს" className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 rounded-[22px] bg-white/80 ring-1 ring-[#e8dcc8] p-1.5">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => pick(t.id)}
            className={`flex flex-col items-center justify-center min-h-14 px-2 py-1.5 rounded-2xl text-center transition-all cursor-pointer select-none active:scale-[0.98] ${
              tab === t.id
                ? 'bg-[#7a2028] text-[#fbf6ec] shadow-[0_6px_14px_-8px_rgba(122,32,40,0.7)]'
                : 'text-[#4a3426] hover:text-[#7a2028] hover:bg-[#7a2028]/[0.04]'
            }`}
          >
            <span className={`text-[11px] font-black uppercase tracking-wide leading-tight ${tab === t.id ? 'text-[#fbf6ec]/75' : 'text-[#a0703c]'}`}>{t.step}</span>
            <span className="mt-0.5 text-[14px] font-bold leading-tight">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-6" role="tabpanel">
        {tab === 'program' ? <ProgramTab /> : tab === 'theory' ? <TheoryTab /> : tab === 'colloquium' ? <ColloquiumTab /> : <AdmissionTab />}
      </div>

      {/* a song from the archive opens over the page */}
      <SongPage />
    </div>
  );
};
