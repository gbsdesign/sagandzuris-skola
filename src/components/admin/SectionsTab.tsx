import React, { useEffect, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { LayoutGrid, Baby, Check } from 'lucide-react';
import { db } from '../../firebase';
import { SECTIONS, SectionId, SectionState } from '../../data/sections';
import { useSections } from '../../hooks/useSections';
import { Fold } from './Fold';
import { changed } from './changed';

// each state with its own colour, so the list reads at a glance
const STATES: { id: SectionState; label: string; dot: string; on: string }[] = [
  { id: 'open', label: 'ღია', dot: 'bg-emerald-500', on: 'text-emerald-800' },
  { id: 'soon', label: 'მალე', dot: 'bg-amber-500', on: 'text-amber-800' },
  { id: 'hidden', label: 'დამალული', dot: 'bg-[#a3968a]', on: 'text-[#4a3426]' },
];

// "განყოფილებები" (in ⚙ „სკოლა“): which sections show on the home vine and in the header — open,
// marked "მალე" or hidden — and, in the same row („ბავშვებს“; stage IV, 2026-10-28 — no second list), which sections a
// new kids' mode starts with. One folding card; every tap is
// saved at once (everyone sees it straight away), a failed save goes back and says so. Every button is 40px tall:
// a tap changes the site for everyone, so it must be hard to miss.
export const SectionsTab: React.FC<{ onMessage: (t: string, type: 'success' | 'error') => void }> = ({ onMessage }) => {
  const saved = useSections();
  const [state, setState] = useState(saved.state);
  const [kids, setKids] = useState<SectionId[]>(saved.kidsDefault);
  useEffect(() => { setState(saved.state); setKids(saved.kidsDefault); }, [saved]);

  const put = (next: { state?: Partial<typeof state>; kidsDefault?: SectionId[] }) =>
    setDoc(doc(db, 'settings', 'sections'), { ...next, updatedAt: new Date().toISOString() }, { merge: true });
  const write = async (next: { state?: typeof state; kidsDefault?: SectionId[] }) => {
    try {
      await put(next);
      return true;
    } catch {
      setState(saved.state);
      setKids(saved.kidsDefault);
      onMessage('ვერ შეინახა — შეამოწმე ინტერნეტი.', 'error');
      return false;
    }
  };
  // every tap is logged and can be taken back for a few seconds (only that section goes back)
  const nameOf = (id: SectionId) => SECTIONS.find(s => s.id === id)?.label || id;
  const stateName = (st: SectionState) => STATES.find(x => x.id === st)?.label || st;
  const setSection = async (id: SectionId, st: SectionState) => {
    const was = state[id];
    if (was === st) return;
    const next = { ...state, [id]: st };
    setState(next);
    if (await write({ state: next })) {
      changed('section', `„${nameOf(id)}“ — ${stateName(st)} (იყო ${stateName(was)})`, id, () => put({ state: { [id]: was } }));
    }
  };
  const toggleKids = async (id: SectionId) => {
    const was = kids;
    const on = !kids.includes(id);
    const next = on ? [...kids, id] : kids.filter(x => x !== id);
    setKids(next);
    if (await write({ kidsDefault: next })) {
      changed('section', `„${nameOf(id)}“ ${on ? 'დაემატა' : 'მოიხსნა'} საბავშვო რეჟიმის საწყის სიაში`, id, () => put({ kidsDefault: was }));
    }
  };

  // the folded card's line: how many sections stand in each state
  const summary = STATES.map(st => ({ st, n: SECTIONS.filter(s => state[s.id] === st.id).length }))
      .filter(x => x.n > 0)
      .map(({ st, n }, i) => (
        <React.Fragment key={st.id}>
          {i > 0 && ' · '}
          <span className="inline-flex items-center gap-1"><span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{n} {st.label}</span>
        </React.Fragment>
      ));

  return (
    <Fold icon={<LayoutGrid />} title="განყოფილებები" summary={summary}>
      <p className="mb-1 flex items-start gap-1.5 text-[12.5px] text-[#8a7a6a] leading-snug">
        <Baby className="w-4 h-4 shrink-0 text-[#7a2028]" />
        <span>„ბავშვებს“ — განყოფილება ჩანს საბავშვო რეჟიმშიც (ახლად ჩართული რეჟიმის საწყისი სია).</span>
      </p>
      <ul>
        {SECTIONS.map(sec => {
          const kid = kids.includes(sec.id);
          return (
            // a phone: the name and „ბავშვებს“ on top, the three states as one wide row under them; wider: one line
            <li key={sec.id} className="py-2.5 grid grid-cols-[minmax(0,1fr)_auto] sm:flex sm:items-center gap-x-3 gap-y-2 border-b border-[#f1e8d9] last:border-0">
              <span className="self-center sm:flex-1 min-w-0 text-[14.5px] font-semibold text-[#2a2017] leading-tight" title={sec.hint}>{sec.label}</span>
              {sec.page ? (
                <button type="button" aria-pressed={kid} onClick={() => toggleKids(sec.id)} title="საბავშვო რეჟიმში ჩანს"
                  className={`justify-self-end h-9 pl-2 pr-3 inline-flex items-center gap-1.5 rounded-full text-[12.5px] font-bold cursor-pointer transition [&>svg]:w-4 [&>svg]:h-4 ${kid ? 'bg-[#7a2028]/[0.1] text-[#7a2028] ring-1 ring-[#7a2028]/30' : 'bg-[#f4ece0] text-[#8a7a6a] hover:text-[#4a3426]'}`}>
                  {kid ? <Check /> : <Baby />}
                  ბავშვებს
                </button>
              ) : <span />}
              <span className="col-span-2 grid grid-cols-3 sm:inline-flex p-0.5 rounded-full bg-[#f4ece0] shrink-0">
                {STATES.map(st => {
                  const disabled = st.id === 'open' && !sec.page;
                  const on = state[sec.id] === st.id;
                  return (
                    <button key={st.id} type="button" disabled={disabled} aria-pressed={on} onClick={() => !on && setSection(sec.id, st.id)}
                      className={`h-10 px-2.5 inline-flex items-center justify-center gap-1.5 rounded-full text-[12.5px] font-bold cursor-pointer transition disabled:opacity-30 disabled:cursor-default ${on ? `bg-white shadow-[0_1px_3px_rgba(74,52,38,0.14)] ${st.on}` : 'text-[#8a7a6a] hover:text-[#4a3426]'}`}>
                      {on && <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />}
                      {st.label}
                    </button>
                  );
                })}
              </span>
            </li>
          );
        })}
      </ul>
    </Fold>
  );
};
