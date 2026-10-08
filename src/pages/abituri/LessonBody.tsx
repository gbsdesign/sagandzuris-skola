import React, { useState } from 'react';
import { ClipboardList, Eye, EyeOff, Lightbulb } from 'lucide-react';
import type { Block, Exercise } from '../../data/abituriLessons';
import { triggerHaptic } from '../../utils/haptics';
import { PianoKeys } from './PianoKeys';
import { Staff } from './Staff';

// One theory lesson: text blocks, notation (with sound), a keyboard, and exercises whose answers open on tap

// **bold** inside lesson text
const rich = (s: string) =>
  s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <b key={i} className="font-bold text-[#2a2017]">{part.slice(2, -2)}</b>
      : <React.Fragment key={i}>{part}</React.Fragment>,
  );

const TEXT = 'text-[15px] leading-[1.7] text-[#3a2d22]';
const HEAD = 'font-serif-ge text-[17px] font-bold leading-snug text-[#7a2028]';

// a row of answers „1) მი–სოლ♯ · 2) ლა–ლა · …“ is laid out item by item, none broken in two
const Answer: React.FC<{ text: string }> = ({ text }) => {
  const items = text.split(' · ');
  if (items.length < 3) return <p className={`mt-1 mb-2 ${TEXT}`}>{rich(text)}</p>;
  return (
    <ul className={`mt-1 mb-2 flex flex-wrap gap-x-5 gap-y-0.5 ${TEXT}`}>
      {items.map((it, i) => <li key={i} className="whitespace-nowrap">{rich(it)}</li>)}
    </ul>
  );
};

const ExerciseView: React.FC<{ ex: Exercise; n: number }> = ({ ex, n }) => {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3.5 sm:px-4 pt-3 pb-3.5">
      <div className="flex gap-3">
        <span className="shrink-0 mt-0.5 grid place-items-center w-6 h-6 rounded-full bg-[#c9a66b]/20 text-[#7a5a26] text-[12.5px] font-bold">{n}</span>
        <p className={`${TEXT} font-semibold`}>{rich(ex.q)}</p>
      </div>
      {ex.abc && <Staff abc={ex.abc} play={false} />}
      <button
        type="button"
        onClick={() => { triggerHaptic(10); setOpen(o => !o); }}
        aria-expanded={open}
        className={`mt-3 inline-flex items-center gap-1.5 min-h-10 px-4 rounded-full text-[13px] font-bold cursor-pointer transition-colors ${
          open ? 'bg-[#fbf6ec] text-[#7a2028] ring-1 ring-[#7a2028]/25' : 'bg-[#fbf6ec] text-[#4a3426] ring-1 ring-[#e8dcc8] hover:text-[#7a2028]'
        }`}
      >
        {open ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        {open ? 'პასუხის დამალვა' : 'პასუხის ნახვა'}
      </button>
      {open && (
        <div className="mt-3 rounded-xl bg-[#fbf6ec] ring-1 ring-[#ecdcbc] px-3.5 pt-2.5 pb-1">
          <p className="text-[12px] font-black uppercase tracking-wide text-[#a0703c]">პასუხი</p>
          <Answer text={ex.a} />
          {ex.aAbc && <Staff abc={ex.aAbc} play={ex.play ?? 'arp'} />}
        </div>
      )}
    </li>
  );
};

const BlockView: React.FC<{ b: Block }> = ({ b }) => {
  if ('h' in b) return <h4 className={`mt-8 first:mt-0 mb-2 ${HEAD}`}>{b.h}</h4>;
  if ('p' in b) return <p className={`mt-3 first:mt-0 ${TEXT}`}>{rich(b.p)}</p>;
  if ('list' in b) {
    return (
      <ul className="mt-3 space-y-1.5">
        {b.list.map((it, i) => (
          <li key={i} className={`flex gap-2.5 ${TEXT}`}>
            <span className="shrink-0 mt-[0.7em] w-1.5 h-1.5 rounded-full bg-[#c9a66b]" aria-hidden />
            <span>{rich(it)}</span>
          </li>
        ))}
      </ul>
    );
  }
  if ('steps' in b) {
    return (
      <ol className="mt-3.5 space-y-3">
        {b.steps.map((it, i) => (
          <li key={i} className={`flex gap-3 ${TEXT}`}>
            <span className="shrink-0 mt-[0.15em] grid place-items-center w-6 h-6 rounded-full bg-[#7a2028] text-[#fbf6ec] text-[12.5px] font-bold">{i + 1}</span>
            <span>{rich(it)}</span>
          </li>
        ))}
      </ol>
    );
  }
  if ('table' in b) {
    return (
      <div className="mt-3.5 overflow-x-auto rounded-xl ring-1 ring-[#e8dcc8] bg-white">
        <table className="w-full text-[14px] leading-snug">
          {b.head && (
            <thead>
              <tr className="bg-[#fbf6ec]">
                {b.head.map((h, i) => <th key={i} className="px-3 py-2.5 text-left font-bold text-[#4a3426]">{h}</th>)}
              </tr>
            </thead>
          )}
          <tbody>
            {b.table.map((r, i) => (
              <tr key={i} className="border-t border-[#efe5d4] first:border-t-0">
                {r.map((c, j) => {
                  // a second line in a cell is its explanation
                  const [main, ...more] = c.split('\n');
                  // short values (დო–სოლ♭) stay on one line; the first column takes what is left
                  const keep = j > 0 && main.length <= 9 ? 'whitespace-nowrap' : '';
                  return (
                    <td key={j} className={`px-3 py-2 align-top ${keep} ${j === 0 ? 'font-semibold text-[#2a2017]' : 'text-[#3a2d22]'}`}>
                      {rich(main)}
                      {more.map((m, k) => <span key={k} className="block mt-0.5 text-[13px] font-normal text-[#6b5c4d]">{rich(m)}</span>)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if ('keys' in b) return <PianoKeys {...b.keys} />;
  if ('tip' in b) {
    return (
      <div className="mt-4 flex gap-3 rounded-xl bg-[#fbf3e1] ring-1 ring-[#ecd9b0] px-3.5 py-3">
        <Lightbulb className="shrink-0 w-5 h-5 mt-[0.2em] text-[#a0703c]" aria-hidden />
        <p className={TEXT}>{rich(b.tip)}</p>
      </div>
    );
  }
  // before 'staff': an exam block may carry a staff too
  if ('exam' in b) {
    return (
      <div className="mb-5 rounded-xl bg-[#7a2028]/[0.045] ring-1 ring-[#7a2028]/15 px-3.5 pt-3 pb-1">
        <p className="flex items-center gap-1.5 text-[12px] font-black uppercase tracking-wide text-[#7a2028]">
          <ClipboardList className="w-4 h-4" aria-hidden /> გამოცდაზე
        </p>
        <p className={`mt-1.5 mb-2 ${TEXT}`}>{rich(b.exam)}</p>
        {b.staff && <Staff {...b.staff} />}
      </div>
    );
  }
  if ('staff' in b) return <Staff {...b.staff} />;
  if ('ex' in b) {
    return (
      <section className="mt-8">
        <h4 className={`mb-3 ${HEAD}`}>სავარჯიშოები</h4>
        <ol className="space-y-3">
          {b.ex.map((e, i) => <ExerciseView key={i} ex={e} n={i + 1} />)}
        </ol>
      </section>
    );
  }
  return null;
};

export const LessonBody: React.FC<{ blocks: Block[] }> = ({ blocks }) => (
  <div className="font-serif-ge">
    {blocks.map((b, i) => <BlockView key={i} b={b} />)}
  </div>
);
