import React from 'react';
import { Check, ChevronRight, Play } from 'lucide-react';
import type { AbituriProgressApi, AbituriWho } from '../../hooks/useAbituriProgress';
import { BOYS_SONGS, CHANTS, DOCUMENTS, GIRLS_SONGS } from '../../data/abituriProgram';
import { examStates, nextStep, type ExamId, type Piece } from '../../utils/abituriPrep';
import { triggerHaptic } from '../../utils/haptics';
import { CARD, useLessons } from './shared';

// „ჩემი მომზადება“ — the one card on top of the admission page (2026-11-06, the user: „გაამარტივე … რომ მიზანს არ
// მოწყდეს მოსწავლე“): a row an exam with where I am, and one big button with the next step. The song list (boys /
// girls) is asked here once; until then the button gives way to that choice.

const EXAMS: { id: ExamId; mark: string; title: string }[] = [
  { id: 'program', mark: 'I', title: 'გალობა-სიმღერა' },
  { id: 'theory', mark: 'II', title: 'თეორია' },
  { id: 'colloquium', mark: 'III', title: 'კოლოქვიუმი' },
  { id: 'admission', mark: '✦', title: 'ჩაბარება' },
];

/** the I exam's pieces for me: the chants and my song list */
export const myPieces = (who: AbituriWho | undefined): Piece[] => [
  ...CHANTS.map(c => ({ key: `chant:${c.title}`, title: c.title })),
  ...(who ? (who === 'girls' ? GIRLS_SONGS : BOYS_SONGS).map(s => ({ key: `${who}:${s.title}`, title: s.title })) : []),
];

export const MyPrep: React.FC<{ api: AbituriProgressApi; onGo: (tab: ExamId, id?: string) => void }> = ({ api, onGo }) => {
  const { progress } = api;
  const { lessons } = useLessons();
  const input = { progress, pieces: myPieces(progress.who), lessons, docsCount: DOCUMENTS.length };
  const states = examStates(input);
  const step = nextStep(input);
  const overall = Math.round((states.reduce((n, s) => n + s.share, 0) / states.length) * 100);

  return (
    <section className={`${CARD} p-3.5 sm:p-4 flex flex-col gap-3`} aria-label="ჩემი მომზადება">
      <div className="flex items-center gap-2 px-0.5">
        <p className="flex-1 text-[12px] font-black uppercase tracking-wide text-[#a0703c]">ჩემი მომზადება</p>
        {overall > 0 && <span className="text-[12.5px] font-bold tabular-nums text-[#8a7a6a]">{overall}%</span>}
      </div>

      <ol className="flex flex-col">
        {EXAMS.map((ex, i) => {
          const st = states[i];
          return (
            <li key={ex.id}>
              <button
                type="button"
                onClick={() => { triggerHaptic(8); onGo(ex.id); }}
                className="w-full flex items-center gap-3 min-h-14 px-1.5 py-1.5 rounded-xl text-left cursor-pointer hover:bg-[#fbf6ec] group"
              >
                <span className={`shrink-0 grid place-items-center w-9 h-9 rounded-full font-serif-ge text-[14px] font-bold ${st.done ? 'bg-[#2f6b43] text-white' : 'bg-[#7a2028]/[0.08] text-[#7a2028]'}`}>
                  {st.done ? <Check className="w-5 h-5" aria-label="მზადაა" /> : ex.mark}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] font-bold leading-snug text-[#2a2017] group-hover:text-[#7a2028]">{ex.title}</span>
                  <span className="block mt-0.5 text-[12.5px] font-semibold leading-snug text-[#8a7a6a]">{st.note}</span>
                  <span className="mt-1.5 block h-1.5 rounded-full bg-[#f3ead9] overflow-hidden" aria-hidden>
                    <span className={`block h-full rounded-full transition-[width] ${st.done ? 'bg-[#2f6b43]' : 'bg-[#7a2028]'}`} style={{ width: `${Math.round(st.share * 100)}%` }} />
                  </span>
                </span>
                <ChevronRight className="w-4 h-4 shrink-0 text-[#b8a68e] group-hover:text-[#7a2028]" />
              </button>
            </li>
          );
        })}
      </ol>

      {progress.who ? (
        <button
          type="button"
          onClick={() => { triggerHaptic(10); onGo(step.tab, step.id); }}
          className="w-full min-h-12 px-4 rounded-2xl bg-[#7a2028] text-[#fbf6ec] inline-flex items-center justify-center gap-2 text-[14.5px] font-bold cursor-pointer hover:bg-[#5e1820] active:scale-[0.99] transition shadow-[0_8px_18px_-10px_rgba(122,32,40,0.8)]"
        >
          <Play className="w-4 h-4 shrink-0" fill="currentColor" />
          <span className="min-w-0 truncate">{step.label}</span>
        </button>
      ) : (
        <WhoPicker onPick={api.setWho} />
      )}
    </section>
  );
};

/** Asked once: whose song list is mine (the I exam has a boys' and a girls' program). */
export const WhoPicker: React.FC<{ onPick: (who: AbituriWho) => void }> = ({ onPick }) => (
  <div className="rounded-xl bg-[#fbf6ec] ring-1 ring-[#efe5d4] p-3">
    <p className="px-0.5 text-[13.5px] font-bold text-[#2a2017]">რომელი სიმღერები ისწავლო?</p>
    <p className="px-0.5 mt-0.5 text-[12.5px] font-semibold text-[#8a7a6a]">ვაჟებსა და გოგონებს სხვადასხვა პროგრამა აქვთ</p>
    <div className="mt-2.5 grid grid-cols-2 gap-2">
      {([['boys', 'ვაჟების'], ['girls', 'გოგონების']] as [AbituriWho, string][]).map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => { triggerHaptic(10); onPick(id); }}
          className="min-h-12 rounded-xl bg-[#7a2028] text-[#fbf6ec] text-[14px] font-bold cursor-pointer hover:bg-[#5e1820] active:scale-[0.98] transition"
        >
          {label}
        </button>
      ))}
    </div>
  </div>
);
