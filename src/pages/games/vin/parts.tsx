import React from 'react';
import { Check, HelpCircle, X } from 'lucide-react';
import { type VinPerson, vinPerson } from '../../../data/vinPeople';
import { VIN_QUESTIONS, answerOf, ruledOut, type VinRun } from '../../../utils/vin';
import { VIN_PEOPLE } from '../../../data/vinPeople';
import { Sheet } from '../../../components/ui/kit';
import { triggerHaptic } from '../../../utils/haptics';

// „ვინ ვარ მე?“'s pieces (2026-11-01): the board of names, the sheet of questions, the answers so far, a person's card with
// their facts — shared by the game alone and the class's forehead game.

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
/** when a person was born: the century for the old ones, the year since 1500 */
export const bornLabel = (p: VinPerson) => {
  if (p.born >= 1500) return `${p.born}`;
  const c = Math.floor((Math.abs(p.born) - 1) / 100) + 1;
  return `${p.born < 0 ? 'ძვ. წ. ' : ''}${ROMAN[c - 1] ?? c} ს.`;
};

/** the name and its line: what they did, when they were born */
export const PersonHead: React.FC<{ p: VinPerson; big?: boolean; light?: boolean }> = ({ p, big, light }) => (
  <div className="min-w-0">
    <p className={`font-serif-ge font-bold leading-tight [overflow-wrap:anywhere] ${big ? 'text-[26px] sm:text-[30px]' : 'text-[19px]'} ${light ? 'text-white' : 'text-[#4a3426]'}`}>{p.name}</p>
    <p className={`mt-0.5 text-[13px] leading-snug ${light ? 'text-[#f0d9a0]' : 'text-[#75685a]'}`}>{p.role} · {p.born >= 1500 ? `დაიბ. ${bornLabel(p)}` : bornLabel(p)}</p>
  </div>
);

/** a person's facts, numbered */
export const Facts: React.FC<{ p: VinPerson; light?: boolean; className?: string }> = ({ p, light, className = '' }) => (
  <ol className={`space-y-1.5 ${className}`}>
    {p.facts.map((f, i) => (
      <li key={i} className={`flex gap-2.5 text-[14px] leading-snug ${light ? 'text-white/90' : 'text-[#4a3426]'}`}>
        <span className={`w-5 h-5 shrink-0 mt-px rounded-full text-[11.5px] font-bold inline-flex items-center justify-center ${light ? 'bg-white/15 text-[#f0d9a0]' : 'bg-[#7a2028]/[0.08] text-[#7a2028]'}`}>{i + 1}</span>
        <span className="min-w-0">{f}</span>
      </li>
    ))}
  </ol>
);

/** the board: every name, the ruled-out ones faded; a tap guesses */
export const NameBoard: React.FC<{ run: VinRun; over: boolean; onGuess: (id: string) => void }> = ({ run, over, onGuess }) => {
  const out = ruledOut(run, VIN_PEOPLE);
  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2" aria-label="დაფა">
      {run.board.map(id => {
        const p = vinPerson(id);
        if (!p) return null;
        const gone = out.has(id);
        const found = over && id === run.hidden;
        const wrong = run.asked.includes(`g:${id}`) && id !== run.hidden;
        return (
          <li key={id}>
            <button
              type="button"
              disabled={over || gone}
              onClick={() => { triggerHaptic(8); onGuess(id); }}
              className={`w-full min-h-[52px] rounded-2xl px-3 py-2 text-left transition-[opacity,background-color] ${
                found ? 'bg-[#2f7d4f] text-white ring-2 ring-[#2f7d4f] shadow-[0_6px_16px_-8px_rgba(47,125,79,0.9)]'
                : gone ? 'bg-[#f1e8d9]/70 opacity-45'
                : 'bg-white ring-1 ring-[#e8dcc8] hover:bg-[#fbf6ec] active:scale-[0.98] cursor-pointer disabled:cursor-default'
              }`}
              aria-label={`${p.name}${gone ? ' — წაიშალა' : ''}`}
            >
              <span className={`flex items-start gap-1 text-[14px] font-bold leading-tight ${found ? '' : gone ? 'line-through text-[#9a8b7b]' : 'text-[#4a3426]'}`}>
                <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{p.name}</span>
                {wrong && <X className="w-4 h-4 shrink-0 text-[#b23a48]" aria-hidden="true" />}
                {found && <Check className="w-4 h-4 shrink-0" aria-hidden="true" />}
              </span>
              <span className={`block mt-0.5 text-[12px] leading-snug ${found ? 'text-white/85' : 'text-[#9a8b7b]'}`}>{p.role} · {bornLabel(p)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
};

const Answer: React.FC<{ yes: boolean }> = ({ yes }) => (
  <span className={`shrink-0 h-7 px-2.5 rounded-full text-[12.5px] font-bold inline-flex items-center gap-1 ${yes ? 'bg-[#2f7d4f]/12 text-[#2f7d4f]' : 'bg-[#4a3426]/[0.07] text-[#75685a]'}`}>
    {yes ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}{yes ? 'კი' : 'არა'}
  </span>
);

/** the questions in two groups; the asked ones keep their answer */
export const QuestionSheet: React.FC<{ open: boolean; onClose: () => void; run: VinRun; onAsk: (id: string) => void; left: number }> = ({ open, onClose, run, onAsk, left }) => {
  const group = (g: 'who' | 'when', title: string) => (
    <div className="space-y-1.5">
      <p className="px-1 text-[13px] font-bold text-[#9a8b7b]">{title}</p>
      <ul className="rounded-2xl ring-1 ring-[#e8dcc8] bg-white overflow-hidden divide-y divide-[#f1e8d9]">
        {VIN_QUESTIONS.filter(q => q.group === g).map(q => {
          const asked = run.asked.includes(`q:${q.id}`);
          const yes = asked ? answerOf(run, q.id, VIN_PEOPLE) : null;
          return (
            <li key={q.id}>
              <button
                type="button"
                disabled={asked}
                onClick={() => { triggerHaptic(10); onAsk(q.id); }}
                className="w-full min-h-12 px-3.5 py-2 flex items-center gap-3 text-left text-[15px] text-[#4a3426] cursor-pointer hover:bg-[#fbf6ec] disabled:cursor-default disabled:text-[#9a8b7b] disabled:hover:bg-transparent"
              >
                <span className="min-w-0 flex-1 leading-snug">{q.text}</span>
                {yes !== null && <Answer yes={yes} />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
  return (
    <Sheet open={open} onClose={onClose} title={<span className="inline-flex items-center gap-2"><HelpCircle className="w-5 h-5 text-[#7a2028]" />კითხვა · დარჩა {left}</span>}>
      <div className="space-y-4">
        {group('who', 'ვინ იყო?')}
        {group('when', 'როდის დაიბადა?')}
      </div>
    </Sheet>
  );
};

/** what was asked so far, in order: a question with its answer, a guess crossed out */
export const AskedLine: React.FC<{ run: VinRun }> = ({ run }) => {
  if (!run.asked.length) return null;
  return (
    <ol className="flex flex-wrap gap-1.5" aria-label="დასმული კითხვები">
      {run.asked.map((a, i) => {
        if (a.startsWith('g:')) {
          const p = vinPerson(a.slice(2));
          const right = a === `g:${run.hidden}`;
          return (
            <li key={i} className={`h-8 pl-2 pr-2.5 rounded-full text-[12.5px] font-bold inline-flex items-center gap-1 ${right ? 'bg-[#2f7d4f] text-white' : 'bg-[#b23a48]/10 text-[#b23a48]'}`}>
              <span className="tabular-nums opacity-70">{i + 1}.</span>{right ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}{p?.name}
            </li>
          );
        }
        const q = VIN_QUESTIONS.find(x => x.id === a.slice(2));
        const yes = answerOf(run, a.slice(2), VIN_PEOPLE);
        return (
          <li key={i} className="h-8 pl-2 pr-1 rounded-full bg-white ring-1 ring-[#e8dcc8] text-[12.5px] text-[#4a3426] inline-flex items-center gap-1.5">
            <span className="tabular-nums text-[#9a8b7b]">{i + 1}.</span>{q?.text}
            <span className={`h-6 px-2 rounded-full text-[12px] font-bold inline-flex items-center ${yes ? 'bg-[#2f7d4f]/12 text-[#2f7d4f]' : 'bg-[#4a3426]/[0.07] text-[#75685a]'}`}>{yes ? 'კი' : 'არა'}</span>
          </li>
        );
      })}
    </ol>
  );
};

/** twenty dots: a yes green, a no grey, a wrong guess red, the right one gold */
export const QuestionDots: React.FC<{ run: VinRun; max: number }> = ({ run, max }) => (
  <div className="flex gap-[3px]" aria-hidden="true">
    {Array.from({ length: max }, (_, i) => {
      const a = run.asked[i];
      const bg = !a ? 'bg-[#f1e8d9]'
        : a.startsWith('g:') ? (a === `g:${run.hidden}` ? 'bg-[#d9a21b]' : 'bg-[#b23a48]')
        : answerOf(run, a.slice(2), VIN_PEOPLE) ? 'bg-[#2f7d4f]' : 'bg-[#4a3426]/45';
      return <span key={i} className={`h-2 flex-1 rounded-full ${bg}`} />;
    })}
  </div>
);
