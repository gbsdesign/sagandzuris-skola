import React, { useState } from 'react';
import { Tabs } from '../components/ui/kit';
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
    setTab(id);
    try { localStorage.setItem(TAB_KEY, id); } catch { /* ignore */ }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-6 px-1">
      {/* the page bar already names the page: only the one line about the yearly rules */}
      <UpdateNotice className="px-2 mb-4" />

      {/* the exams in order: two by two on a phone, one row from 480px up (the kit's tabs) */}
      <Tabs cols={4} items={TABS.map(t => ({ id: t.id, label: t.label, over: t.step }))} value={tab} onChange={pick} />

      <div className="mt-6" role="tabpanel">
        {tab === 'program' ? <ProgramTab /> : tab === 'theory' ? <TheoryTab /> : tab === 'colloquium' ? <ColloquiumTab /> : <AdmissionTab />}
      </div>

      {/* a song from the archive opens over the page */}
      <SongPage />
    </div>
  );
};
