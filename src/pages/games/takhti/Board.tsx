import React, { useEffect, useState } from 'react';
import { Castle, Mountain } from 'lucide-react';
import { ARMY_WIN, CAPITALS, PLACES, ROW_COUNT, cardPrice, freeSlots, isGone, isUp, type TakhtiGame } from '../../../utils/oriTakhti';
import { CardBack, CardFace, CoinMark, KNIGHT_PATH, TokenDisc, cardH } from './look';
import { SIDE_COLOR } from './words';

// „ორი ტახტი“'s table: „ლიხის გზა“ with the rider and the tribute tokens, the age's layout (the cards half over each other as
// on the table, the free ones raised, each with its price for the player on turn), the tokens of knowledge on the board.

/** a side-by-side screen: a phone on its side or a computer */
export const useTwoCols = () => {
  const read = () => window.innerHeight <= 500 || window.innerWidth >= 1024;
  const [two, setTwo] = useState(read);
  useEffect(() => {
    const on = () => setTwo(read());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return two;
};

/** a card's width for the age's layout: its widest row across the column, its rows within the height on a short screen */
export const useCardW = (age: 1 | 2 | 3, two: boolean) => {
  const read = () => {
    const W = window.innerWidth, H = window.innerHeight;
    // the full-screen table's 16 px sides; two columns 16 px apart
    const col = two ? (Math.min(W - 32, 1100) - 16) / 2 : Math.min(W - 32, 672);
    const n = Math.max(...PLACES[age].map(p => Math.abs(p.x))) + 1;
    const byW = (col - (n - 1) * 4) / n;
    const byH = two ? (H - 120) / (1.36 * ((ROW_COUNT[age] - 1) / 2 + 1)) : Infinity;
    return Math.max(44, Math.floor(Math.min(byW, byH, two ? 76 : 66)));
  };
  const [w, setW] = useState(read);
  useEffect(() => {
    const on = () => setW(read());
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, [age, two]); // eslint-disable-line react-hooks/exhaustive-deps
  return w;
};

const ZONE = (d: number) => (d === 0 ? '#e9dcc0' : d <= 2 ? '#f7efdc' : d <= 5 ? '#ecd9a6' : d < ARMY_WIN ? '#e7c3bd' : '#2b1e14');

/** „ლიხის გზა“: Kutaisi on the left, Tbilisi on the right, the rider on its cell, the tribute tokens still lying */
export const Track: React.FC<{ g: TakhtiGame; me: number }> = ({ g, me }) => {
  const cells = Array.from({ length: 2 * ARMY_WIN + 1 }, (_, i) => i - ARMY_WIN);
  const pct = (p: number) => ((p + ARMY_WIN + 0.5) / (2 * ARMY_WIN + 1)) * 100;
  const toll = (bit: number, at: number, n: number) => (
    <span className={`absolute -translate-x-1/2 ${g.loot & bit ? 'opacity-25 grayscale' : ''}`} style={{ left: `${pct(at)}%`, top: 0 }} title={g.loot & bit ? 'ხარკი გადახდილია' : `ხარკი ${n} თეთრი`}>
      <CoinMark n={`−${n}`} size={18} neg />
    </span>
  );
  const side = (i: number) => (
    <span className="min-w-0 flex items-center gap-1 text-[12px] font-bold leading-tight" style={{ color: SIDE_COLOR[i] }}>
      <Castle className="w-3.5 h-3.5 shrink-0" />
      <span className="min-w-0 [overflow-wrap:anywhere]">{CAPITALS[i]}<span className="font-normal text-[#75685a]"> · {i === me ? 'შენ' : g.names[i]}</span></span>
    </span>
  );
  return (
    <section className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3 pt-2 pb-2.5" aria-label={`ლიხის გზა: მხედარი ${g.pawn === 0 ? 'შუაშია' : `${Math.abs(g.pawn)} უჯრით ${g.pawn > 0 ? 'თბილისისკენ' : 'ქუთაისისკენ'}`}`}>
      <div className="flex items-center justify-between gap-2">
        {side(0)}
        <span className="shrink-0 text-[11.5px] font-bold text-[#9a8b7b]">ლიხის გზა</span>
        <span className="flex justify-end">{side(1)}</span>
      </div>
      <div className="relative mt-1.5 h-[52px]">
        <div className="absolute inset-x-0 top-[20px] flex h-[22px] overflow-hidden rounded-md ring-1 ring-[#d9c8ac]">
          {cells.map(p => (
            <span key={p} className="flex-1 border-r border-white/70 last:border-r-0 flex items-center justify-center" style={{ background: ZONE(Math.abs(p)) }}>
              {p === 0 && <Mountain className="w-3 h-3 text-[#9a8b7b]" />}
              {Math.abs(p) === ARMY_WIN && <Castle className="w-3 h-3" style={{ color: SIDE_COLOR[p < 0 ? 0 : 1] }} />}
            </span>
          ))}
        </div>
        {/* the tribute tokens over their zones: −2 on the fortress, −5 at the gate, both sides */}
        {toll(1, -4, 2)}{toll(2, -7, 5)}{toll(4, 4, 2)}{toll(8, 7, 5)}
        <span className="absolute top-[14px] -translate-x-1/2 transition-[left] duration-500 ease-out" style={{ left: `${pct(g.pawn)}%` }}>
          <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[#2b1e14] ring-2 ring-[#f1d793] shadow-[0_4px_10px_-4px_rgba(0,0,0,0.6)]">
            <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden style={{ transform: g.pawn > 0 ? 'scaleX(-1)' : undefined }}><path d={KNIGHT_PATH} fill="#f1d793" /></svg>
          </span>
        </span>
      </div>
    </section>
  );
};

/** the age's layout; a tap on a face-up card opens it */
export const Pyramid: React.FC<{ g: TakhtiGame; w: number; focus: number; sel: number | null; onCard: (s: number) => void }> = ({ g, w, focus, sel, onCard }) => {
  const places = PLACES[g.age];
  const maxX = Math.max(...places.map(p => Math.abs(p.x)));
  const h = cardH(w), gap = 4;
  const unit = (w + gap) / 2;
  const W = maxX * 2 * unit + w, H = (ROW_COUNT[g.age] - 1) * h * 0.5 + h;
  const free = new Set(freeSlots(g));
  const who = focus >= 0 ? focus : g.turn;
  return (
    <div className="relative mx-auto" style={{ width: W, height: H }} role="group" aria-label="ეპოქის ბარათები">
      {places.map((p, s) => {
        if (isGone(g, s)) return null;
        const id = g.slots[s];
        const up = id >= 0 && isUp(g, s);
        return (
          <div key={s} className="absolute" style={{ left: (p.x + maxX) * unit, top: p.row * h * 0.5, zIndex: p.row + 1 }}>
            {up
              ? <CardFace id={id} w={w} free={free.has(s)} selected={sel === s} price={free.has(s) && g.phase.k === 'play' ? cardPrice(g, who, id) : null} onClick={() => onCard(s)} />
              : <CardBack age={g.age} w={w} />}
          </div>
        );
      })}
    </div>
  );
};

/** the tokens still on the board */
export const BoardTokens: React.FC<{ g: TakhtiGame; onInfo: (t: number) => void }> = ({ g, onInfo }) => (
  <section className="flex items-center gap-2.5 rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3 py-2">
    <span className="shrink-0 text-[12px] font-bold leading-tight text-[#75685a]">ცოდნის<br />ნიშნები</span>
    <span className="flex flex-1 flex-wrap items-center justify-center gap-2">
      {g.board.length ? g.board.map(t => (
        <button key={t} type="button" onClick={() => onInfo(t)} className="rounded-full cursor-pointer focus-visible:outline-2 focus-visible:outline-[#c9a24b]" aria-label="ცოდნის ნიშანი">
          <TokenDisc t={t} size={34} />
        </button>
      )) : <span className="text-[12.5px] text-[#9a8b7b]">დაფაზე აღარ დარჩა</span>}
    </span>
  </section>
);
