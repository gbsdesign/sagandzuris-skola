import React, { useState } from 'react';
import { Tabs } from '../components/ui/kit';
import { SongPage } from '../components/maps/SongPage';
import { useAbituriProgress } from '../hooks/useAbituriProgress';
import type { ExamId } from '../utils/abituriPrep';
import { ProgramTab } from './abituri/ProgramTab';
import { TheoryTab } from './abituri/TheoryTab';
import { ColloquiumTab } from './abituri/ColloquiumTab';
import { AdmissionTab } from './abituri/AdmissionTab';
import { MyPrep } from './abituri/MyPrep';
import { UpdateNotice, type Focus } from './abituri/shared';

// "აბიტურიენტს": the way into the University of Chant — the three admission exams and the registration.
// Data: data/abituriProgram.ts; opened from the small label under "გალობა" on the home vine.
// On top one card „ჩემი მომზადება“ (2026-11-06): where I am in each exam and the one next step; a tap there opens
// the exam's tab at the right place (`focus`).
const TABS: { id: ExamId; step: string; label: string }[] = [
  { id: 'program', step: 'I გამოცდა', label: 'გალობა-სიმღერა' },
  { id: 'theory', step: 'II გამოცდა', label: 'თეორია' },
  { id: 'colloquium', step: 'III გამოცდა', label: 'კოლოქვიუმი' },
  { id: 'admission', step: 'რეგისტრაცია', label: 'ჩაბარება' },
];

const TAB_KEY = 'abituriTab';

export const AbituriPage: React.FC = () => {
  const api = useAbituriProgress();
  const [tab, setTab] = useState<ExamId>(() => {
    try {
      const saved = localStorage.getItem(TAB_KEY);
      return (TABS.some(t => t.id === saved) ? saved : 'program') as ExamId;
    } catch { return 'program'; }
  });
  const [focus, setFocus] = useState<Focus | undefined>();
  const pick = (id: ExamId) => {
    setTab(id);
    try { localStorage.setItem(TAB_KEY, id); } catch { /* ignore */ }
  };
  const go = (id: ExamId, at?: string) => {
    pick(id);
    setFocus(at ? { id: at, n: (focus?.n ?? 0) + 1 } : { id: 'abituri-tabs', n: (focus?.n ?? 0) + 1 });
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-6 px-1">
      {/* the page bar already names the page: only the one line about the yearly rules */}
      <UpdateNotice className="px-2 mb-4" />

      <div className="mb-5">
        <MyPrep api={api} onGo={go} />
      </div>

      {/* the exams in order: two by two on a phone, one row from 480px up (the kit's tabs) */}
      <div id="abituri-tabs" className="scroll-mt-24">
        <Tabs cols={4} items={TABS.map(t => ({ id: t.id, label: t.label, over: t.step }))} value={tab} onChange={pick} />
      </div>

      <div className="mt-6" role="tabpanel">
        {tab === 'program' ? <ProgramTab api={api} focus={focus} />
          : tab === 'theory' ? <TheoryTab api={api} focus={focus} />
          : tab === 'colloquium' ? <ColloquiumTab focus={focus} />
          : <AdmissionTab api={api} focus={focus} />}
      </div>

      {/* a song from the archive opens over the page */}
      <SongPage />
    </div>
  );
};
