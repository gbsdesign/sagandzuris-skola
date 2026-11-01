import React, { useState } from 'react';
import { Check, Flag, RotateCcw, Send } from 'lucide-react';
import type { ChatMessage } from '../../hooks/useClassChat';
import { guessForm, letterCount, sameWord, unfoldWord } from '../../utils/nakhati';
import { LATIN_TO_GEORGIAN } from '../../utils/sitqva';
import { triggerHaptic } from '../../utils/haptics';
import { InkView } from '../games/Ink';
import { setSolved, useSolved } from '../../pages/games/nakhati/store';

// A drawing to guess in a class's chat („ნახატობანა“, 2026-11-01): the drawing plays from its first line, the word's boxes
// say how many letters, a guess is checked here on the phone (the word is folded in the message), „ვნებდები“ shows it. What
// this phone guessed stays on it; the artist sees their own word.

const toGeorgian = (s: string) => [...s].map(c => LATIN_TO_GEORGIAN[c] ?? c).join('');

/** the word's shape: a box a letter, a gap a space (the letters only once it is known) */
const Boxes: React.FC<{ word: string; open: boolean; dark: boolean }> = ({ word, open, dark }) => (
  <div className="flex flex-wrap gap-x-2.5 gap-y-1.5" aria-label={open ? word : `${letterCount(word)} ასო`} role="img">
    {guessForm(word).split(' ').map((part, i) => (
      <span key={i} className="flex gap-[3px]">
        {[...part].map((ch, j) => (
          <span
            key={j}
            className={`w-[22px] h-7 rounded-md inline-flex items-center justify-center font-serif-ge text-[15px] font-bold ${
              open ? 'bg-[#2f7d4f] text-white' : dark ? 'bg-white/15 ring-1 ring-white/35' : 'bg-[#fbf6ec] ring-1 ring-[#e0d2bb]'
            }`}
          >
            {open ? ch : ''}
          </span>
        ))}
      </span>
    ))}
  </div>
);

export const DrawRiddle: React.FC<{ m: ChatMessage; mine: boolean; meta?: React.ReactNode }> = ({ m, mine, meta }) => {
  const word = unfoldWord(m.ans);
  const done = useSolved(m.id);
  const [replay, setReplay] = useState(0);
  const [text, setText] = useState('');
  const [miss, setMiss] = useState(0);
  const [shake, setShake] = useState(false);
  const sub = mine ? 'text-[#fbf6ec]/80' : 'text-[#75685a]';
  const check = () => {
    const g = text.trim();
    if (!g || !word) return;
    if (sameWord(g, word)) { triggerHaptic(25); setSolved(m.id, 1); return; }
    triggerHaptic(40);
    setMiss(n => n + 1);
    setShake(false);
    window.requestAnimationFrame(() => setShake(true));
  };
  const open = mine || done > 0;

  return (
    <div className="py-1 flex flex-col gap-2.5 w-[min(272px,68vw)]">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 font-semibold text-[15px] leading-snug">{m.text || '🎨 გამოიცანი, რა დავხატე!'}</p>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); triggerHaptic(6); setReplay(r => r + 1); }}
          aria-label="ნახატი თავიდან"
          title="ნახატი თავიდან"
          className={`w-9 h-9 shrink-0 rounded-full inline-flex items-center justify-center cursor-pointer active:scale-95 ${mine ? 'bg-white/15 text-white' : 'bg-[#7a2028]/[0.07] text-[#7a2028]'}`}
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
      {m.theme && <p className={`-mt-1.5 text-[12.5px] font-bold ${sub}`}>თემა: {m.theme}</p>}
      <InkView ink={m.ink} mode="replay" replayKey={replay} width="100%" label="კლასელის ნახატი" />
      {word && <Boxes word={word} open={open} dark={mine} />}
      {mine ? (
        <p className={`text-[13px] font-bold ${sub}`}>შენი სიტყვა: „{word}“</p>
      ) : done === 1 ? (
        <p className="flex items-center gap-1.5 text-[14px] font-bold text-[#2f7d4f]" role="status"><Check className="w-4.5 h-4.5" />გამოიცანი!</p>
      ) : done === 2 ? (
        <p className={`text-[13px] font-bold ${sub}`} role="status">პასუხი: „{word}“</p>
      ) : word ? (
        <div className="space-y-1.5">
          <form onSubmit={e => { e.preventDefault(); check(); }} className="flex items-center gap-1.5">
            <input
              value={text}
              onChange={e => setText(toGeorgian(e.target.value).replace(/[^ა-ჰ -]/g, '').slice(0, 40))}
              onAnimationEnd={() => setShake(false)}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="done"
              placeholder="შენი პასუხი"
              aria-label="შენი პასუხი"
              className={`min-w-0 flex-1 h-11 rounded-xl bg-[#fbf6ec] ring-1 ring-[#e0d2bb] px-3 text-[16px] font-bold text-[#4a3426] placeholder:font-normal placeholder:text-[14px] placeholder:text-[#b3a48f] outline-none focus:ring-2 focus:ring-[#7a2028]/40 ${shake ? 'sg-shake' : ''}`}
            />
            <button type="submit" aria-label="შემოწმება" className="w-11 h-11 shrink-0 rounded-xl bg-[#7a2028] text-[#fbf6ec] inline-flex items-center justify-center active:scale-95 cursor-pointer">
              <Send className="w-4.5 h-4.5" />
            </button>
          </form>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12.5px] font-bold text-[#a0322e]" role="status">{miss ? 'არა — სცადე კიდევ' : ''}</span>
            <button type="button" onClick={() => { triggerHaptic(8); setSolved(m.id, 2); }} className="h-9 px-2.5 rounded-full text-[12.5px] font-bold text-[#75685a] hover:bg-[#4a3426]/[0.06] inline-flex items-center gap-1 cursor-pointer">
              <Flag className="w-3.5 h-3.5" />ვნებდები
            </button>
          </div>
        </div>
      ) : null}
      {meta}
    </div>
  );
};
