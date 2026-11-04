import React from 'react';
import { Amphora, BookOpen, Castle, Crown, Grape, Handshake, Swords, type LucideIcon } from 'lucide-react';
import { CARDS, type TCard } from '../../../data/takhtiCards';
import { CAPITALS } from '../../../utils/oriTakhti';
import { softBreaks } from '../../../utils/tsqvilebi';
import { KIND_INFO, SIDE_COLOR, subOf } from './words';

// „ორი ტახტი“'s pieces on screen: a card as a tile (the kind's colour and mark, the name, its kind and number), a small chip of
// a court's card, a throne's mark.

export const iconOf = (c: TCard): LucideIcon =>
  c.k === 'tsikhe' ? Castle : c.k === 'lashkari' ? Swords : c.k === 'ghvino' ? (c.w === 'vazi' ? Grape : Amphora) : c.k === 'tsigni' ? BookOpen : Handshake;

/** the kind's square with its mark and, for a castle or a warrior, the number */
export const KindMark: React.FC<{ c: TCard; size?: number }> = ({ c, size = 40 }) => {
  const Icon = iconOf(c);
  const k = KIND_INFO[c.k];
  return (
    <span className="relative shrink-0 inline-flex items-center justify-center rounded-xl text-white" style={{ width: size, height: size, background: k.color }} aria-hidden>
      <Icon style={{ width: size * 0.52, height: size * 0.52 }} strokeWidth={2.1} />
      {c.v > 0 && (
        <span className="absolute -bottom-1 -right-1 min-w-[20px] h-[20px] px-1 rounded-full bg-[#fbf6ec] ring-2 ring-white text-[12px] font-black leading-[20px] text-center tabular-nums" style={{ color: k.color }}>{c.v}</span>
      )}
    </span>
  );
};

/** a card of the meeting: a tile — pressed when chosen, faint when out of reach */
export const CardTile: React.FC<{ id: number; on?: boolean; dim?: boolean; onClick?: () => void; hint?: string }> = ({ id, on, dim, onClick, hint }) => {
  const c = CARDS[id];
  const k = KIND_INFO[c.k];
  const body = (
    <>
      <KindMark c={c} />
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[13.5px] font-bold leading-tight text-[#2b1e14] [overflow-wrap:anywhere]">{softBreaks(c.n)}</span>
        <span className="block mt-0.5 text-[12px] font-bold leading-tight" style={{ color: k.color }}>{subOf(c)}</span>
      </span>
    </>
  );
  const cls = `w-full min-h-[56px] flex items-center gap-2.5 rounded-2xl px-2.5 py-2 ring-1 transition ${on ? 'ring-2 ring-[#c9a24b] shadow-[0_6px_16px_-10px_rgba(43,30,20,0.6)]' : 'ring-[#e8dcc8]'} ${dim ? 'opacity-45' : ''}`;
  if (!onClick) return <div className={cls} style={{ background: k.tint }} title={c.note}>{body}</div>;
  return (
    <button type="button" onClick={onClick} aria-pressed={on} aria-label={hint ? `${c.n} — ${hint}` : c.n} title={c.note} className={`${cls} cursor-pointer active:scale-[0.98] hover:ring-[#c9a24b]/70`} style={{ background: k.tint }}>
      {body}
    </button>
  );
};

/** a court's card: a small chip with the name and its number */
export const CardChip: React.FC<{ id: number; fresh?: boolean }> = ({ id, fresh }) => {
  const c = CARDS[id];
  const k = KIND_INFO[c.k];
  const Icon = iconOf(c);
  return (
    <span className={`inline-flex items-center gap-1 h-7 pl-1 pr-2 rounded-full text-[12px] font-bold ring-1 ${fresh ? 'ring-[#c9a24b] ring-2' : 'ring-black/[0.06]'}`} style={{ background: k.tint, color: '#2b1e14' }} title={c.note}>
      <span className="w-5 h-5 rounded-full inline-flex items-center justify-center text-white shrink-0" style={{ background: k.color }}><Icon className="w-3 h-3" strokeWidth={2.4} /></span>
      <span className="whitespace-nowrap">{c.n}{c.v > 0 && <b className="ml-1 tabular-nums" style={{ color: k.color }}>{c.v}</b>}</span>
    </span>
  );
};

/** a throne: the crown in its side's colour */
export const ThroneMark: React.FC<{ side: number; size?: number }> = ({ side, size = 28 }) => (
  <span className="shrink-0 inline-flex items-center justify-center rounded-full text-white" style={{ width: size, height: size, background: SIDE_COLOR[side] }} aria-label={CAPITALS[side]}>
    <Crown style={{ width: size * 0.56, height: size * 0.56 }} strokeWidth={2.2} />
  </span>
);
