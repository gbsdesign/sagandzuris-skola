import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Delete, RotateCcw } from 'lucide-react';
import { HANGEBI_WORDS, wordIndex } from '../../../utils/hangebi';
import { triggerHaptic } from '../../../utils/haptics';

// „ოთხი ჰანგი, ერთი სიტყვა“'s letter bank (like 4 Pics 1 Word): the answer's boxes — a box a letter, its words apart — and the
// letters under them. A tap on a letter puts it in the first empty box, a tap on a box gives its letter back. A full word that
// is one of the game's answers is the pick (alone it answers at once, in a room it waits for „გაგზავნა“); any other says so.

/** the boxes, word by word (a long word wraps; the phone never shrinks them) */
export const Shape: React.FC<{ shape: string; letters?: (string | null)[]; onBox?: (i: number) => void; tone?: 'plain' | 'right' | 'wrong' }> = ({ shape, letters, onBox, tone = 'plain' }) => {
  let at = 0;
  const words = shape.split(/([ -])/);
  const look = tone === 'right' ? 'bg-[#2f7d4f]/10 ring-[#2f7d4f]/45 text-[#1e4d31]' : tone === 'wrong' ? 'bg-amber-50 ring-amber-300 text-amber-900' : 'bg-white ring-[#d9c9ae] text-[#4a3426]';
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2" aria-label={`${shape.replace(/[ -]/g, '').length} ასო`}>
      {words.map((w, wi) => {
        if (w === ' ' || w === '') return null;
        if (w === '-') return <span key={wi} className="self-center -mx-2.5 font-serif-ge text-[20px] font-bold text-[#9a8b7b]" aria-hidden="true">-</span>;
        const boxes = [...w].map(() => at++);
        // a long word wraps into even rows (ten letters: five and five), never more than nine a row
        const per = Math.ceil(boxes.length / Math.ceil(boxes.length / 9));
        return (
          <div key={wi} className="flex flex-wrap justify-center gap-1" style={{ maxWidth: `${per * 36 + (per - 1) * 4}px` }}>
            {boxes.map(i => {
              const ch = letters?.[i] ?? null;
              const body = <span className="font-serif-ge text-[20px] font-bold leading-none">{ch ?? ''}</span>;
              const cls = `w-9 h-11 rounded-xl ring-1 flex items-center justify-center ${ch ? look : 'bg-[#f6efe2] ring-[#e3d5bd]'}`;
              return onBox && ch
                ? <button key={i} type="button" onClick={() => { triggerHaptic(5); onBox(i); }} aria-label={`${ch} — უკან`} className={`${cls} cursor-pointer active:scale-[0.95]`}>{body}</button>
                : <span key={i} className={cls}>{body}</span>;
            })}
          </div>
        );
      })}
    </div>
  );
};

/** the letters as they are (the teams' screen: to build on paper) */
export const Tiles: React.FC<{ tiles: string }> = ({ tiles }) => (
  <div className="flex flex-wrap justify-center gap-1.5" aria-label="ასოები">
    {[...tiles].map((ch, i) => (
      <span key={i} className="w-9 h-10 rounded-xl bg-[#4a3426]/[0.06] flex items-center justify-center font-serif-ge text-[18px] font-bold text-[#4a3426]">{ch}</span>
    ))}
  </div>
);

const Game: React.FC<{ shape: string; tiles: string; onPick: (p: number | null) => void }> = ({ shape, tiles, onPick }) => {
  const n = useMemo(() => [...shape].filter(ch => ch === '_').length, [shape]);
  const bank = useMemo(() => [...tiles], [tiles]);
  const [placed, setPlaced] = useState<(number | null)[]>(() => Array(n).fill(null));
  const letters = placed.map(i => (i === null ? null : bank[i]));
  const full = placed.every(i => i !== null);
  const word = full ? wordIndex(letters.join('')) : -1;
  const sent = useRef<number | null>(null);
  useEffect(() => {
    const p = full && word >= 0 ? word : null;
    if (p !== sent.current) { sent.current = p; onPick(p); }
  }, [full, word, onPick]);

  const put = (t: number) => {
    const at = placed.indexOf(null);
    if (at < 0 || placed.includes(t)) return;
    triggerHaptic(5);
    setPlaced(placed.map((x, i) => (i === at ? t : x)));
  };
  const back = (box: number) => setPlaced(placed.map((x, i) => (i === box ? null : x)));
  const last = () => {
    const at = placed.map((x, i) => (x === null ? -1 : i)).filter(i => i >= 0).pop();
    if (at !== undefined) { triggerHaptic(5); back(at); }
  };
  const clear = () => { triggerHaptic(8); setPlaced(Array(n).fill(null)); };
  const any = placed.some(i => i !== null);

  return (
    <div className="space-y-3.5">
      <Shape shape={shape} letters={letters} onBox={back} tone={full ? (word >= 0 ? 'right' : 'wrong') : 'plain'} />
      <p className={`min-h-[1.25rem] text-center text-[13px] font-bold ${full && word < 0 ? 'text-amber-800' : 'text-[#2f7d4f]'}`} role="status">
        {full ? (word >= 0 ? `„${HANGEBI_WORDS[word]}“` : 'ასეთი პასუხი თამაშში არ არის — შეცვალე ასოები') : ''}
      </p>
      <div className="flex flex-wrap justify-center gap-1.5 mx-auto max-w-[22rem]" role="group" aria-label="ასოები">
        {bank.map((ch, t) => {
          const used = placed.includes(t);
          return (
            <button
              key={t}
              type="button"
              disabled={used || full}
              onClick={() => put(t)}
              aria-hidden={used || undefined}
              className={`w-11 h-12 rounded-xl font-serif-ge text-[21px] font-bold transition-[opacity,transform] ${used ? 'opacity-0 pointer-events-none' : 'bg-[#7a2028] text-[#fbf6ec] shadow-[0_2px_0_#4e1218] active:translate-y-[1px] active:shadow-none cursor-pointer disabled:opacity-50 disabled:cursor-default'}`}
            >
              {ch}
            </button>
          );
        })}
      </div>
      <div className="flex justify-center gap-2">
        <button type="button" onClick={last} disabled={!any} className="h-10 px-3.5 rounded-full inline-flex items-center gap-1.5 text-[13px] font-bold bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] cursor-pointer active:scale-[0.97] disabled:opacity-40 disabled:cursor-default">
          <Delete className="w-4 h-4" />წაშლა
        </button>
        <button type="button" onClick={clear} disabled={!any} className="h-10 px-3.5 rounded-full inline-flex items-center gap-1.5 text-[13px] font-bold bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] cursor-pointer active:scale-[0.97] disabled:opacity-40 disabled:cursor-default">
          <RotateCcw className="w-4 h-4" />თავიდან
        </button>
      </div>
    </div>
  );
};

/** a round's bank: a new round starts it empty */
export const Bank: React.FC<{ id: string; shape: string; tiles: string; onPick: (p: number | null) => void }> = ({ id, ...rest }) => (
  <Game key={`${id}|${rest.tiles}`} {...rest} />
);
