import React, { useEffect, useState } from 'react';
import { deleteField, doc, setDoc } from 'firebase/firestore';
import { LayoutGrid, Baby, Check, CalendarClock, X } from 'lucide-react';
import { db } from '../../firebase';
import { SECTIONS, SectionId, SectionState } from '../../data/sections';
import { useSections } from '../../hooks/useSections';
import { tbilisiToday } from '../../utils/hangi';
import { shortDate } from '../../utils/dateNames';
import { Fold } from './Fold';
import { changed } from './changed';
import { Btn } from '../ui/kit';

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
// a tap changes the site for everyone, so it must be hard to miss. A „მალე“ section can be given a day
// (`openOn`, idea 9): it opens by itself that day in Georgia (useSections); any other state set by hand clears the day.
export const SectionsTab: React.FC<{ onMessage: (t: string, type: 'success' | 'error') => void }> = ({ onMessage }) => {
  const saved = useSections();
  const [state, setState] = useState(saved.state);
  const [kids, setKids] = useState<SectionId[]>(saved.kidsDefault);
  useEffect(() => { setState(saved.state); setKids(saved.kidsDefault); }, [saved]);

  type Put = { state?: Partial<typeof state>; kidsDefault?: SectionId[]; openOn?: Partial<Record<SectionId, string | ReturnType<typeof deleteField>>> };
  const put = (next: Put) =>
    setDoc(doc(db, 'settings', 'sections'), { ...next, updatedAt: new Date().toISOString() }, { merge: true });
  const write = async (next: Put) => {
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
  // a day kept for the section, or the field's removal
  const dayOr = (day?: string) => day || deleteField();
  const setSection = async (id: SectionId, st: SectionState) => {
    const was = state[id];
    if (was === st) return;
    const wasStored = saved.stored[id], wasDay = saved.openOn[id];
    setState({ ...state, [id]: st });
    if (await write({ state: { [id]: st }, openOn: { [id]: deleteField() } })) {
      changed('section', `„${nameOf(id)}“ — ${stateName(st)} (იყო ${stateName(was)})`, id,
        () => put({ state: { [id]: wasStored }, openOn: { [id]: dayOr(wasDay) } }));
    }
  };
  // the day a „მალე“ section opens by itself ('' = no day)
  const today = tbilisiToday();
  const [dayFor, setDayFor] = useState<SectionId | null>(null);
  const [draft, setDraft] = useState('');
  const pickDay = (id: SectionId) => { setDraft(saved.openOn[id] || ''); setDayFor(id); };
  const setDay = async (id: SectionId, day: string) => {
    const was = saved.openOn[id];
    setDayFor(null);
    if ((was || '') === day) return;
    if (await write({ openOn: { [id]: dayOr(day) } })) {
      changed('section', day ? `„${nameOf(id)}“ გაიხსნება ${shortDate(`${day}T12:00:00`)}` : `„${nameOf(id)}“ — გახსნის დღე მოიხსნა`, id,
        () => put({ openOn: { [id]: dayOr(was) } }));
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
          // a built section still „მალე“ may get its day
          const day = state[sec.id] === 'soon' && sec.page ? saved.openOn[sec.id] || '' : null;
          return (
            // a phone: the name and „ბავშვებს“ on top, the three states as one wide row under them; wider: one line
            <li key={sec.id} className="py-2.5 border-b border-[#f1e8d9] last:border-0">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] sm:flex sm:items-center gap-x-3 gap-y-2">
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
              </div>
              {day !== null && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {dayFor === sec.id ? (
                    <>
                      <input type="date" min={today} value={draft} autoFocus aria-label={`„${sec.label}“ — გახსნის დღე`}
                        onChange={e => setDraft(e.target.value)}
                        className="h-10 px-3 rounded-xl bg-white ring-1 ring-[#e8dcc8] focus:ring-2 focus:ring-[#7a2028]/40 text-[14px] text-[#2a2017] outline-none" />
                      <Btn size="sm" icon={<Check />} disabled={!/^\d{4}-\d{2}-\d{2}$/.test(draft) || draft < today} onClick={() => setDay(sec.id, draft)}>შენახვა</Btn>
                      <button type="button" onClick={() => setDayFor(null)} aria-label="დახურვა"
                        className="w-9 h-9 rounded-full inline-flex items-center justify-center text-[#8a7a6a] hover:text-[#7a2028] hover:bg-[#7a2028]/[0.06] cursor-pointer"><X className="w-4 h-4" /></button>
                    </>
                  ) : day ? (
                    <span className="h-9 pl-3 pr-1 rounded-full bg-amber-50 ring-1 ring-amber-200 text-amber-800 text-[13px] font-bold inline-flex items-center gap-1.5">
                      <CalendarClock className="w-4 h-4" />
                      <button type="button" onClick={() => pickDay(sec.id)} className="cursor-pointer hover:underline">იხსნება {shortDate(`${day}T12:00:00`)}</button>
                      <button type="button" onClick={() => setDay(sec.id, '')} aria-label="გახსნის დღის მოხსნა"
                        className="w-7 h-7 rounded-full inline-flex items-center justify-center hover:bg-amber-100 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                    </span>
                  ) : (
                    <button type="button" onClick={() => pickDay(sec.id)}
                      className="h-9 px-3 rounded-full text-[13px] font-bold inline-flex items-center gap-1.5 cursor-pointer transition text-[#8a7a6a] hover:text-[#7a2028] hover:bg-[#7a2028]/[0.06]">
                      <CalendarClock className="w-4 h-4" /> გახსნის დღე
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Fold>
  );
};
