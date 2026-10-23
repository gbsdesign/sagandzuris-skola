import React, { useEffect, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { LayoutGrid, Baby, Save, Check } from 'lucide-react';
import { db } from '../../firebase';
import { SECTIONS, SectionId, SectionState } from '../../data/sections';
import { useSections } from '../../hooks/useSections';
import { Btn } from '../ui/kit';
import { Fold } from './Fold';

// each state with its own colour, so the list reads at a glance
const STATES: { id: SectionState; label: string; dot: string; on: string }[] = [
  { id: 'open', label: 'ღია', dot: 'bg-emerald-500', on: 'text-emerald-800' },
  { id: 'soon', label: 'მალე', dot: 'bg-amber-500', on: 'text-amber-800' },
  { id: 'hidden', label: 'დამალული', dot: 'bg-[#a3968a]', on: 'text-[#4a3426]' },
];

// "განყოფილებები" (in the „სკოლა“ tab): which sections show on the home vine and in the header — open,
// marked "მალე" or hidden — and which sections a new kids' mode starts with. One folding card, one save.
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

  // the folded card's line: how many sections stand in each state, or a warning while changes wait unsaved
  const summary = dirty
    ? <span className="font-semibold text-[#9a6212]">ცვლილება ჯერ არ შენახულა</span>
    : STATES.map(st => ({ st, n: SECTIONS.filter(s => state[s.id] === st.id).length }))
      .filter(x => x.n > 0)
      .map(({ st, n }, i) => (
        <React.Fragment key={st.id}>
          {i > 0 && ' · '}
          <span className="inline-flex items-center gap-1"><span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{n} {st.label}</span>
        </React.Fragment>
      ));

  return (
    <Fold icon={<LayoutGrid />} title="განყოფილებები" summary={summary}
        info="ღია — ყველა ხედავს; მალე — ჩანს „მალე“ წარწერით; დამალული — არსად ჩანს. ადმინები ყოველთვის ხედავენ ყველაფერს. საბავშვო რეჟიმს მოსწავლეს მასწავლებელი თავად ურთავს და შეუძლია ქვემოთა სია შეცვალოს.">
      <ul className="grid md:grid-cols-2 md:gap-x-8">
        {SECTIONS.map(sec => (
          <li key={sec.id} className="py-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-[#f1e8d9]">
            <span className="flex-1 min-w-[8.5rem]">
              <span className="block text-[14px] font-semibold text-[#2a2017] leading-tight">{sec.label}</span>
              {sec.hint && <span className="block text-[11.5px] text-[#9a8b7b] leading-snug">{sec.hint}</span>}
            </span>
            <span className="inline-flex p-0.5 rounded-full bg-[#f4ece0] shrink-0">
              {STATES.map(st => {
                const disabled = st.id === 'open' && !sec.page;
                const on = state[sec.id] === st.id;
                return (
                  <button key={st.id} type="button" disabled={disabled} aria-pressed={on} onClick={() => setState(s => ({ ...s, [sec.id]: st.id }))}
                    className={`h-8 px-2.5 inline-flex items-center gap-1.5 rounded-full text-[12px] font-bold cursor-pointer transition disabled:opacity-30 disabled:cursor-default ${on ? `bg-white shadow-[0_1px_3px_rgba(74,52,38,0.14)] ${st.on}` : 'text-[#8a7a6a] hover:text-[#4a3426]'}`}>
                    {on && <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />}
                    {st.label}
                  </button>
                );
              })}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4">
        <p className="mb-2 flex items-center gap-1.5 text-[12.5px] font-bold text-[#75685a]"><Baby className="w-4 h-4 text-[#7a2028]" /> საბავშვო რეჟიმი — თავიდან რა ჩანს</p>
        <div className="flex flex-wrap gap-1.5">
          {SECTIONS.filter(s => s.page).map(sec => {
            const on = kids.includes(sec.id);
            return (
              <button key={sec.id} type="button" aria-pressed={on} onClick={() => setKids(k => (on ? k.filter(x => x !== sec.id) : [...k, sec.id]))}
                className={`h-8 px-3 inline-flex items-center gap-1 rounded-full text-[12px] font-semibold cursor-pointer transition [&>svg]:w-3.5 [&>svg]:h-3.5 ${on ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-[#f4ece0] text-[#75685a] hover:text-[#4a3426]'}`}>
                {on && <Check />}
                {sec.label}
              </button>
            );
          })}
        </div>
      </div>

      {dirty && (
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2 sg-in">
          <span className="mr-auto text-[12px] font-semibold text-[#9a6212]">ცვლილება ჯერ არ შენახულა</span>
          <Btn size="sm" kind="ghost" disabled={busy} onClick={() => { setState(saved.state); setKids(saved.kidsDefault); }}>გაუქმება</Btn>
          <Btn size="sm" icon={<Save />} disabled={busy} onClick={save}>{busy ? 'ინახება…' : 'შენახვა'}</Btn>
        </div>
      )}
    </Fold>
  );
};
