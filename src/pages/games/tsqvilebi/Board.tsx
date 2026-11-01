import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Music2, Volume2, VolumeX } from 'lucide-react';
import {
  closeMiss, flipCard, isName, pairOf, softBreaks, type FlipEvent, type TsqBoard, type TsqItem, type TsqMode, type TsqSound,
} from '../../../utils/tsqvilebi';
import { triggerHaptic } from '../../../utils/haptics';
import { hushSnippets, useSnippet, type Clip } from '../rounds/useSnippet';

// „ხმის წყვილები“'s board (utils/tsqvilebi.ts): the cards face down in a grid — three columns for twelve, four for eight and
// sixteen. A tap turns a card over; a sound card plays its piece (a chant's opening on the synthesizer, a song's recording),
// and tapping it again while it is open or found plays it again. Two cards that are not a pair stay open until the sound
// ends, then close (a tap on another card closes them at once). A found pair keeps its colour: green, or its team's.

/** a sound card's piece, in seconds */
export const TSQ_CLIP = 6;
export const clipOf = (s: TsqSound): Clip => ('url' in s
  ? { url: s.url, from: s.from, seconds: TSQ_CLIP }
  : { score: { book: s.book, num: s.num }, voices: 0, seconds: TSQ_CLIP });

/** the teams' colours on one phone (a found pair takes its finder's) */
export const TEAM_TINT = ['#2b5f8a', '#cf7428', '#4f8a3c', '#5b3f8c', '#b23a48', '#24827e'];
const FOUND = '#2f7d4f';

export interface BoardPlay {
  tap: (i: number) => void;
  /** the card sounding now, the one loading, the one whose sound failed */
  playing: number | null;
  loading: number | null;
  failed: number | null;
  /** the pair just found (it pops once) */
  pop: readonly number[];
  stop: () => void;
}

/**
 * A board's play on this phone: a tap turns a card (utils/tsqvilebi.ts `flipCard`), sounds a sound card, and hands the board on
 * (`apply`, with what happened and the card); a miss closes by itself once its sound is over.
 */
export const useBoardPlay = (o: {
  items: readonly TsqItem[]; cards: readonly number[]; mode: TsqMode; board: TsqBoard;
  apply: (board: TsqBoard, event: FlipEvent | 'close', card: number) => void;
}): BoardPlay => {
  const snip = useSnippet(TSQ_CLIP);
  const [on, setOn] = useState<number | null>(null);
  const [pop, setPop] = useState<number[]>([]);
  const now = useRef(o);
  now.current = o;
  const busy = snip.state === 'play' || snip.state === 'load';
  const playing = busy ? on : null;
  const play = (i: number) => {
    const c = now.current;
    hushSnippets();
    setOn(i);
    snip.play(clipOf(c.items[pairOf(c.cards[i])].sound));
  };

  // a miss: its two cards close once the sound is over, a moment later
  const miss = o.board.open.length >= 2 ? o.board.moves : 0;
  const hearing = miss > 0 && playing !== null && o.board.open.includes(playing);
  useEffect(() => {
    if (!miss || hearing) return;
    const t = window.setTimeout(() => { const c = now.current; if (c.board.open.length >= 2) c.apply(closeMiss(c.board), 'close', -1); }, 1100);
    return () => window.clearTimeout(t);
  }, [miss, hearing]);
  useEffect(() => {
    if (!pop.length) return;
    const t = window.setTimeout(() => setPop([]), 650);
    return () => window.clearTimeout(t);
  }, [pop]);

  const tap = (i: number) => {
    const { board, cards, mode, apply } = now.current;
    const sound = !isName(cards[i], mode);
    // an open or found card: a sound card sounds again (or stops)
    if (board.done[i] || (board.open.length < 2 && board.open.includes(i))) {
      if (!sound) return;
      triggerHaptic(6);
      if (playing === i) snip.stop(); else play(i);
      return;
    }
    const r = flipCard(board, cards, i);
    if (r.event === 'none') return;
    triggerHaptic(r.event === 'match' ? 20 : r.event === 'miss' ? 12 : 6);
    if (sound) play(i);
    else if (board.open.length >= 2) snip.stop();
    if (r.event === 'match') setPop([board.open[0], i]);
    apply(r.board, r.event, i);
  };
  return {
    tap, playing, pop, stop: snip.stop,
    loading: snip.state === 'load' ? on : null,
    failed: snip.state === 'error' || snip.state === 'blocked' ? on : null,
  };
};

const Bars: React.FC = () => (
  <span className="flex items-end gap-[3px] h-5" aria-hidden="true">
    {[0, 0.25, 0.5].map(d => <span key={d} className="tsq-bar w-[5px] h-full rounded-full bg-current" style={{ animationDelay: `${d}s` }} />)}
  </span>
);

const BACK: React.CSSProperties = {
  background: 'repeating-linear-gradient(45deg, rgba(226,194,122,0.09) 0 5px, transparent 5px 11px), linear-gradient(150deg, #922e38 0%, #5a161e 100%)',
};

export const Board: React.FC<{
  items: readonly TsqItem[]; cards: readonly number[]; mode: TsqMode; board: TsqBoard; play: BoardPlay;
  /** a found card's colour (its team's), else green */
  tint?: (card: number) => string | null;
}> = ({ items, cards, mode, board, play, tint }) => {
  const cols = cards.length === 12 ? 3 : 4;
  const missed = board.open.length >= 2;
  const small = cols === 4;
  return (
    <ul className={`mx-auto w-full grid gap-1.5 ${small ? 'grid-cols-4 max-w-[440px]' : 'grid-cols-3 max-w-[400px]'}`} aria-label="ბარათები">
      {cards.map((c, i) => {
        const item = items[pairOf(c)];
        const name = isName(c, mode);
        const done = board.done[i];
        const open = board.open.includes(i);
        const up = done || open;
        const bad = missed && open;
        const color = done ? tint?.(i) ?? FOUND : null;
        const sounding = play.playing === i;
        const label = !up ? `ბარათი ${i + 1}` : name || done ? `${item.name}${done ? ', ნაპოვნია' : ''}` : sounding ? 'ხმა ჟღერს' : 'ხმა — მოსასმენად დააჭირე';
        return (
          <li key={i} className={`tsq-card ${small ? 'aspect-[4/5]' : 'aspect-square'} ${bad ? 'sg-shake' : ''} ${play.pop.includes(i) ? 'animate-[samosi-pop_0.45s_ease-out]' : ''}`}>
            <button
              type="button"
              onClick={() => play.tap(i)}
              aria-label={label}
              className={`tsq-inner ${up ? 'up' : ''} relative block w-full h-full rounded-2xl cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7a2028]`}
            >
              <span className="tsq-side absolute inset-0 rounded-2xl flex items-center justify-center shadow-[0_2px_6px_rgba(74,52,38,0.28)]" style={BACK} aria-hidden="true">
                <span className="absolute inset-[5px] rounded-[12px] ring-1 ring-[#e2c27a]/45" />
                <Music2 className={`${small ? 'w-6 h-6' : 'w-8 h-8'} text-[#e2c27a]`} />
              </span>
              <span
                className={`tsq-side tsq-face absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-1 px-1 py-1.5 text-center ${
                  name ? 'bg-[#fdf3dc]' : 'bg-white'} ${color ? 'ring-[3px]' : bad ? 'ring-2 ring-[#b23a48]' : sounding ? 'ring-2 ring-[#7a2028]' : 'ring-1 ring-[#e8dcc8]'}`}
                style={color ? { ['--tw-ring-color' as string]: color, background: `color-mix(in srgb, ${color} 10%, #ffffff)` } : undefined}
                aria-hidden="true"
              >
                {name ? (
                  <>
                    <span className={`font-serif-ge font-bold leading-[1.2] text-[#4a3426] line-clamp-4 [hyphens:manual] ${small ? 'text-[12.5px]' : 'text-[14px]'}`}>{softBreaks(item.name)}</span>
                    {item.sub && <span className="text-[12px] leading-tight text-[#9a8b7b] line-clamp-1">{item.sub}</span>}
                  </>
                ) : (
                  <>
                    <span className={`${small ? 'w-9 h-9' : 'w-11 h-11'} shrink-0 rounded-full flex items-center justify-center ${sounding ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-[#7a2028]/[0.08] text-[#7a2028]'}`}>
                      {play.loading === i ? <Loader2 className="w-4.5 h-4.5 animate-spin" />
                        : sounding ? <Bars />
                          : play.failed === i ? <VolumeX className="w-4.5 h-4.5" />
                            : <Volume2 className="w-4.5 h-4.5" />}
                    </span>
                    {done
                      ? <span className={`font-serif-ge font-bold leading-[1.2] text-[#4a3426] line-clamp-3 [hyphens:manual] ${small ? 'text-[12px]' : 'text-[13px]'}`}>{softBreaks(item.name)}</span>
                      : play.failed === i && <span className="text-[12px] font-bold leading-tight text-[#b23a48]">ვერ ჩაირთო</span>}
                  </>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
};
