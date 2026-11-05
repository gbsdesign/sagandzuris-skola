import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { Fits, LINE_LETTERS, LabelRoom, lettersFit, shortLabel } from '../../utils/shortLabel';

// „ჩემი ღილაკები“'s tile, half its old height since 2026-11-05 (the user: „შუაზე გაჭრა, მაღლა ნაწილი დატოვო … მოსანიშნი
// ხელუხლებელი … თანამედროვე, დახვეწილი, მიმზიდველი, მაგრამ კონტექსტიდან არ ამოვარდეს“): one row — the icon (or my kanon's
// number), the name shortened into two lines at most (`shortLabel`), and the ✓ on the right as it was. The home page's
// paper and wine stay; the tile only gets a soft light from above and a deeper shadow.

export type TileTone = 'paper' | 'done' | 'wine';

const TONE: Record<TileTone, string> = {
  paper: 'text-[#4a3426] bg-[linear-gradient(180deg,#ffffff_0%,#fbf6ee_100%)] ring-1 ring-[#e9ddc8] shadow-[inset_0_1px_0_#fff,0_1px_2px_rgba(74,52,38,0.07),0_6px_14px_-10px_rgba(74,52,38,0.45)]',
  done: 'text-[#2f4a3a] bg-[linear-gradient(180deg,#f6fcf8_0%,#e7f5ed_100%)] ring-1 ring-emerald-200 shadow-[inset_0_1px_0_#fff,0_1px_2px_rgba(6,95,70,0.08),0_6px_14px_-10px_rgba(6,95,70,0.4)]',
  wine: 'text-[#fbf6ec] bg-[linear-gradient(135deg,#8a2630_0%,#5c1a22_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_6px_14px_-8px_rgba(122,32,40,0.85)]',
};

/** The shelf's grid: three tiles a row, two on a phone under 380px — there three would leave a name 4 letters
 *  („წირ. დას.“), and the names should wrap rather than shrink. */
export const SHELF_GRID = 'grid grid-cols-2 min-[380px]:grid-cols-3 gap-2';

/** The tile's own classes; `checked` leaves room for the ✓ on the right. */
export const tileClass = (tone: TileTone, checked: boolean) =>
  `w-full h-11 rounded-[13px] flex items-center gap-1.5 pl-2 text-left cursor-pointer transition ${checked ? 'pr-[38px]' : 'pr-2.5'} ${TONE[tone]}`;

/** The icon at the tile's left. */
export const TileIcon: React.FC<{ children: React.ReactNode; light?: boolean }> = ({ children, light }) => (
  <span className={`shrink-0 flex items-center ${light ? 'text-[#f3d9a4]' : 'text-[#7a2028]'} [&>svg]:w-[17px] [&>svg]:h-[17px] [&>svg]:stroke-[1.9]`}>{children}</span>
);

let ruler: CanvasRenderingContext2D | null = null;
/** A line's fit by the text's real width in this span's font (the tile is narrower on a 360px phone than on a 430px one). */
const widthFit = (el: HTMLElement, width: number): Fits => {
  ruler ||= document.createElement('canvas').getContext('2d');
  const cs = getComputedStyle(el);
  if (!ruler || !width) return lettersFit(LINE_LETTERS.tight);
  ruler.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  return s => ruler!.measureText(s).width <= width - 0.5;
};

/** The name, shortened only as much as two lines beside the icon need. */
export const TileName: React.FC<{ label: string; room: LabelRoom }> = ({ label, room }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState(0);
  const [fonts, setFonts] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    // a web font (ხუცური) arriving late changes the widths
    let live = true;
    document.fonts?.ready.then(() => { if (live) setFonts(f => f + 1); });
    return () => { live = false; ro.disconnect(); };
  }, []);
  const text = useMemo(
    () => shortLabel(label, ref.current && width ? widthFit(ref.current, width) : lettersFit(LINE_LETTERS[room])),
    [label, room, width, fonts]
  );
  return <span ref={ref} className="min-w-0 flex-1 line-clamp-2 break-words text-[12.5px] leading-[1.15] font-bold">{text}</span>;
};

/** The ✓ as it was before the tiles were halved: a 28px ring in a 40px corner, now in the middle of the tile's height. */
export const TileCheck: React.FC<{
  on: boolean; onClick: () => void; label: string; title: string; disabled?: boolean; dark?: boolean;
}> = ({ on, onClick, label, title, disabled, dark }) => (
  <button type="button" onClick={onClick} disabled={disabled} aria-pressed={on} aria-label={label} title={title}
    className="group absolute top-1/2 -translate-y-1/2 right-0 w-10 h-10 flex items-center justify-center cursor-pointer transition active:scale-90 disabled:cursor-default">
    <span className={`w-7 h-7 rounded-full flex items-center justify-center transition ${
      on ? 'bg-emerald-500 text-white shadow-sm'
        : dark ? 'bg-white/12 ring-1 ring-white/35 text-[#fbf6ec] group-hover:bg-white/20'
          : 'ring-1 ring-[#dccdb4] text-[#bcae9c] group-hover:text-[#7a2028] group-hover:ring-[#7a2028]/40'
    }`}>
      <Check className="w-[15px] h-[15px] stroke-[3]" />
    </span>
  </button>
);
