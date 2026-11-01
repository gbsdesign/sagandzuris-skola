import React, { useLayoutEffect, useRef, useState } from 'react';
import { isLetter, longestWord } from '../../../utils/tsartsera';
import { toScript, type Script } from '../../../utils/oldScripts';

// „ხუცური წარწერა“'s board: the line in the old letters, an empty box under each, the verse's lines kept apart and a word never
// broken. Its size follows the width it is given (the longest word fills a row at most), so a phone and a projector alike show
// it whole. A tap on a letter picks it — every box of that letter lights up and the next letter typed goes into all of them.

export type Tone = 'plain' | 'open' | 'wrong' | 'won';

const BOX: Record<Tone, string> = {
  plain: 'bg-white ring-1 ring-[#cdbb9e] text-[#3d2a1e]',
  open: 'bg-[#fbf2dc] ring-1 ring-[#e2c27a] text-[#8a6416]',
  wrong: 'bg-[#fde8e8] ring-2 ring-[#c8504a] text-[#b23a48]',
  won: 'bg-[#e6f2e9] ring-1 ring-[#7fb38f] text-[#2f7d4f]',
};

export const TsBoard: React.FC<{
  text: string;
  script: Script;
  /** what the box under the old letter of `c` shows ('' = empty) */
  shown: (c: string) => string;
  toneOf: (c: string) => Tone;
  selected?: string | null;
  onPick?: (c: string) => void;
  /** a refused letter's boxes flash red for a moment */
  flash?: string | null;
  /** the teams' screen: bigger letters */
  big?: boolean;
  label: string;
}> = ({ text, script, shown, toneOf, selected = null, onPick, flash = null, big, label }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const longest = longestWord(text);
  const gap = big ? 5 : 3;
  // a phone keeps the tiles small enough for two short words a row; a wide screen and the teams' screen let them grow
  const cap = big ? (width >= 900 ? 60 : width >= 700 ? 52 : width >= 600 ? 44 : 30) : width >= 600 ? 36 : 30;
  const tile = Math.max(20, Math.min(cap, Math.floor((width - (longest - 1) * gap) / longest)));
  let n = 0;

  return (
    <div ref={ref} className="w-full" role="group" aria-label={label}>
      {width > 0 && text.split('\n').map((verse, vi) => (
        <div key={vi} className="flex flex-wrap justify-center" style={{ columnGap: tile * 0.6, rowGap: tile * 0.45, marginTop: vi ? tile * 0.55 : 0 }}>
          {verse.split(' ').filter(Boolean).map((word, wi) => (
            <span key={wi} className="inline-flex items-end" style={{ gap }}>
              {[...word].map((ch, ci) => {
                if (!isLetter(ch)) {
                  return (
                    <span key={ci} aria-hidden="true" className="font-bold text-[#8a7a6a] leading-none" style={{ fontSize: tile * 0.62, paddingBottom: tile * 0.3 }}>
                      {ch}
                    </span>
                  );
                }
                n++;
                const sel = selected === ch;
                const value = shown(ch);
                const tone = toneOf(ch);
                const flashing = flash === ch;
                return (
                  <button
                    key={ci}
                    type="button"
                    disabled={!onPick}
                    onClick={() => onPick?.(ch)}
                    aria-label={`ასო ${n}: ${value || 'ცარიელი'}`}
                    aria-pressed={onPick ? sel : undefined}
                    className={`flex flex-col items-center rounded-lg ${onPick ? 'cursor-pointer' : 'cursor-default'} ${sel ? 'bg-[#7a2028]/[0.07]' : ''}`}
                    style={{ width: tile }}
                  >
                    <span
                      className={`font-serif-ge leading-none flex items-end justify-center ${sel ? 'text-[#7a2028]' : 'text-[#3d2a1e]'}`}
                      style={{ fontSize: tile * 0.74, height: tile * 0.92 }}
                    >
                      {toScript(ch, script)}
                    </span>
                    <span
                      className={`mt-1 w-full flex items-center justify-center rounded-md font-bold leading-none transition-colors ${
                        flashing ? 'bg-[#fde8e8] ring-2 ring-[#c8504a] animate-pulse' : sel && tone === 'plain' ? 'bg-white ring-2 ring-[#7a2028] text-[#3d2a1e]' : BOX[tone]
                      }`}
                      style={{ height: tile * 1.08, fontSize: tile * 0.56 }}
                    >
                      {value}
                    </span>
                  </button>
                );
              })}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
};
