import React from 'react';
import { Check, Footprints, X } from 'lucide-react';
import { toScript } from '../../../utils/oldScripts';
import { LETTERS, choiceText, type PathStory } from '../../../utils/tsinapari';

// „წინაპრის გზა“'s shared pieces (2026-11-01): the ancestor's monogram in asomtavruli (no portraits — some are icons), the
// forks' dots, a fork's heading, a way to pick and the real path told back at the end.

export const GREEN = '#2f7d4f';
export const AMBER = '#b26a12';

/** the ancestor's initials in the old capitals, in a ring of the story's colour */
export const Medallion: React.FC<{ story: PathStory; size?: number; className?: string }> = ({ story, size = 64, className = '' }) => (
  <span
    className={`relative inline-flex shrink-0 items-center justify-center rounded-full ${className}`}
    style={{ width: size, height: size, background: `radial-gradient(circle at 50% 38%, #fffdf8 0%, #f6efe2 70%, ${story.tint}18 100%)`, boxShadow: `inset 0 0 0 ${Math.max(2, size / 26)}px ${story.tint}, inset 0 0 0 ${Math.max(4, size / 13)}px #fbf6ec, inset 0 0 0 ${Math.max(5, size / 11)}px #c9a22766` }}
    aria-hidden="true"
  >
    <span className="font-serif-ge font-bold leading-none" style={{ color: story.tint, fontSize: size * (story.short.length > 1 ? 0.36 : 0.46) }}>{toScript(story.short, 'asomtavruli')}</span>
  </span>
);

/** a dot a fork: green = as the ancestor did, amber = another way, ringed = the one on screen */
export const ForkDots: React.FC<{ story: PathStory; picks: readonly number[]; at: number }> = ({ story, picks, at }) => (
  <ol className="flex items-center gap-1.5" aria-label={`გასაყარი ${Math.min(at + 1, story.steps.length)} / ${story.steps.length}`}>
    {story.steps.map((_, i) => {
      const p = picks[i];
      const done = p !== undefined;
      const bg = !done ? (i === at ? '#fff' : '#e8dcc8') : p === 0 ? GREEN : p === -1 ? '#c9bfae' : AMBER;
      return (
        <li
          key={i}
          className="h-2.5 rounded-full transition-all"
          style={{ width: i === at ? 22 : 10, background: bg, boxShadow: i === at ? `inset 0 0 0 2px ${story.tint}` : undefined }}
        />
      );
    })}
  </ol>
);

/** the year and the place of a fork */
export const ForkHead: React.FC<{ story: PathStory; step: number }> = ({ story, step }) => {
  const s = story.steps[step];
  return (
    <p className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] font-bold">
      <span className="rounded-full px-2.5 py-1 text-white" style={{ background: story.tint }}>{s.year}</span>
      <span className="text-[#75685a]">{s.place}</span>
    </p>
  );
};

/** a way to take: its letter, its words; once the story is out, ✓ on the ancestor's and ✗ on a wrong one picked */
export const WayButton: React.FC<{
  story: PathStory;
  letter: number;
  text: string;
  state: 'idle' | 'chosen' | 'right' | 'picked-wrong' | 'other';
  onClick?: () => void;
  note?: React.ReactNode;
}> = ({ story, letter, text, state, onClick, note }) => {
  const right = state === 'right';
  const wrong = state === 'picked-wrong';
  const chosen = state === 'chosen';
  const ring = right ? GREEN : wrong ? AMBER : chosen ? story.tint : '#e8dcc8';
  const body = (
    <>
      <span
        className="mt-0.5 w-9 h-9 shrink-0 rounded-full flex items-center justify-center font-serif-ge text-[17px] font-bold"
        style={right ? { background: GREEN, color: '#fff' } : wrong ? { background: AMBER, color: '#fff' } : chosen ? { background: story.tint, color: '#fff' } : { background: `${story.tint}12`, color: story.tint }}
        aria-hidden="true"
      >
        {right ? <Check className="w-5 h-5" /> : wrong ? <X className="w-5 h-5" /> : LETTERS[letter]}
      </span>
      <span className="min-w-0 flex-1 py-1.5">
        <span className={`block text-[15.5px] leading-snug ${state === 'other' ? 'text-[#75685a]' : 'text-[#4a3426]'} ${right ? 'font-bold' : ''}`}>{text}</span>
        {note}
      </span>
    </>
  );
  const cls = 'w-full min-h-14 rounded-2xl px-3 py-2 flex items-start gap-3 text-left bg-white transition';
  const style = { boxShadow: `inset 0 0 0 ${right || wrong || chosen ? 2 : 1}px ${ring}` };
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} cursor-pointer active:scale-[0.99] hover:shadow-[0_2px_8px_rgba(74,52,38,0.12)]`} style={style}>{body}</button>
  ) : (
    <div className={cls} style={style}>{body}</div>
  );
};

/** the three ways in a run's order, their state by the pick */
export const waysOf = (story: PathStory, step: number, order: readonly number[]) => order.map((c, i) => ({ c, letter: i, text: choiceText(story.steps[step], c) }));

/** the path the ancestor really took: a line of its forks, each ✓ where one chose the same */
export const RealPath: React.FC<{ story: PathStory; picks: readonly number[] }> = ({ story, picks }) => (
  <div className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3.5">
    <p className="flex items-center gap-2 text-[13.5px] font-bold" style={{ color: story.tint }}><Footprints className="w-4.5 h-4.5" />ნამდვილი გზა</p>
    <ol className="mt-2.5 relative">
      {story.steps.map((s, i) => {
        const same = picks[i] === 0;
        return (
          <li key={i} className="relative pl-9 pb-3 last:pb-0">
            {i < story.steps.length - 1 && <span className="absolute left-[13px] top-7 bottom-0 w-0.5 bg-[#e8dcc8]" aria-hidden="true" />}
            <span
              className="absolute left-0 top-0.5 w-7 h-7 rounded-full flex items-center justify-center text-white"
              style={{ background: same ? GREEN : picks[i] === undefined ? '#c9bfae' : AMBER }}
              aria-label={same ? 'შენც ასე აირჩიე' : 'შენ სხვა გზა აირჩიე'}
            >
              {same ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            </span>
            <p className="text-[12.5px] font-bold text-[#75685a]">{s.year} · {s.place}</p>
            <p className="text-[14.5px] leading-snug text-[#4a3426]">{s.right}</p>
          </li>
        );
      })}
    </ol>
  </div>
);

/** a box of a known fact */
export const FactBox: React.FC<{ story: PathStory }> = ({ story }) => (
  <div className="rounded-2xl bg-[#f6f0e4] px-4 py-3 text-left">
    <p className="text-[12.5px] font-bold text-[#8a6416]">იცოდი?</p>
    <p className="mt-1 text-[15px] leading-relaxed text-[#4a3426]">{story.fact}</p>
  </div>
);

export const UNCHECKED = 'ამბები აპის „წინაპრების“ ბიოგრაფიებიდანაა. სცენების სიტყვები, სხვა გზები და „რა მოხდებოდა“ Claude-მა დაწერა — მასწავლებელს ჯერ არ შეუმოწმებია.';
