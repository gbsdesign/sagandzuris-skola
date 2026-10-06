import React, { useEffect, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { LayoutGrid, Baby, Save } from 'lucide-react';
import { db } from '../../firebase';
import { SECTIONS, SectionId, SectionState } from '../../data/sections';
import { useSections } from '../../hooks/useSections';
import { Btn, Card, CardTitle } from '../ui/kit';

const STATES: { id: SectionState; label: string }[] = [
  { id: 'open', label: 'ღია' },
  { id: 'soon', label: 'მალე' },
  { id: 'hidden', label: 'დამალული' },
];

// "განყოფილებების ჩართვა": which sections show on the home vine and in the header — open, marked "მალე"
// or hidden — and which sections a new kids' mode starts with.
export const SectionsTab: React.FC<{ onMessage: (t: string, type: 'success' | 'error') => void }> = ({ onMessage }) => {
  const saved = useSections();
  const [state, setState] = useState(saved.state);
  const [kids, setKids] = useState<SectionId[]>(saved.kidsDefault);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setState(saved.state); setKids(saved.kidsDefault); }, [saved]);
  const dirty = JSON.stringify(state) !== JSON.stringify(saved.state) || JSON.stringify(kids) !== JSON.stringify(saved.kidsDefault);

  const save = async () => {
    setBusy(true);
    try {
      await setDoc(doc(db, 'settings', 'sections'), { state, kidsDefault: kids, updatedAt: new Date().toISOString() }, { merge: true });
      onMessage('განყოფილებები შენახულია — ყველას მაშინვე შეეცვლება.', 'success');
    } catch {
      onMessage('ვერ შეინახა.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle icon={<LayoutGrid />} title="განყოფილებები" hint="ღია — ყველა ხედავს; მალე — ჩანს „მალე“ წარწერით; დამალული — არსად ჩანს. ადმინები ყოველთვის ხედავენ ყველაფერს." />
        <ul className="divide-y divide-[#f1e8d9]">
          {SECTIONS.map(sec => (
            <li key={sec.id} className="py-3 flex flex-col min-[460px]:flex-row min-[460px]:items-center gap-2">
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-[#2a2017]">{sec.label}</span>
                {sec.hint && <span className="block text-xs text-[#8a7a6a]">{sec.hint}</span>}
              </span>
              <span className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-white ring-1 ring-[#e8dcc8] shrink-0">
                {STATES.map(st => {
                  const disabled = st.id === 'open' && !sec.page;
                  const on = state[sec.id] === st.id;
                  return (
                    <button key={st.id} type="button" disabled={disabled} onClick={() => setState(s => ({ ...s, [sec.id]: st.id }))}
                      className={`h-9 px-3 rounded-lg text-[13px] font-bold cursor-pointer transition disabled:opacity-35 disabled:cursor-default ${on ? (st.id === 'hidden' ? 'bg-[#4a3426] text-[#fbf6ec]' : 'bg-[#7a2028] text-[#fbf6ec]') : 'text-[#4a3426] hover:bg-[#7a2028]/5'}`}>
                      {st.label}
                    </button>
                  );
                })}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardTitle icon={<Baby />} title="საბავშვო რეჟიმი — თავიდან რა ჩანს" hint="მასწავლებელი მოსწავლეს რეჟიმს თავად ურთავს და შეუძლია ეს სია შეცვალოს." />
        <div className="flex flex-wrap gap-1.5">
          {SECTIONS.filter(s => s.page).map(sec => {
            const on = kids.includes(sec.id);
            return (
              <button key={sec.id} type="button" onClick={() => setKids(k => (on ? k.filter(x => x !== sec.id) : [...k, sec.id]))}
                className={`h-10 px-3.5 rounded-full text-[13px] font-semibold cursor-pointer transition ${on ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426]'}`}>
                {sec.label}
              </button>
            );
          })}
        </div>
      </Card>

      <Btn icon={<Save />} disabled={!dirty || busy} onClick={save}>{busy ? 'ინახება…' : 'შენახვა'}</Btn>
    </div>
  );
};
