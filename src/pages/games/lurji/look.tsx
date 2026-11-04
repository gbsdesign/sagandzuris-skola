import React, { useEffect, useState } from 'react';
import { FLOOR, ORNS, ORN_NAMES, TOKEN, TRAY_NO, countAt, fits, has, landing, ornAt, type Evening, type LBoard, type LLine, type LurjiGame, type Orn, type Placed } from '../../../utils/lurjiSupra';
import { ORNAMENT } from './ornaments';

// „ლურჯი სუფრა“ on screen: the stamps as the printed kit draws them (pages/games/lurji/ornaments.ts), the wooden trays, the
// meidan, a player's loom and cloth (the board), and the words of a take.

export const ORN_COLOR = ['#2f6db0', '#a87519', '#8e2431', '#272321', '#2e7a4c'] as const;
export const LILA = '#1f3a5f';
export const LILA_DEEP = '#162b48';
const CLOTH = '#f3eee2';
const WHITE = '#fbf7ee';
const WOOD_DARK = '#5b3d22';
const WOOD_LIGHT = '#d4b080';
const GOLD = '#c9a24b';
const FULL_HTML = ORNS.map(o => ORNAMENT[o](WHITE, ORN_COLOR[o]));
const FAINT_HTML = ORNS.map(o => ORNAMENT[o](ORN_COLOR[o], CLOTH));

/** a stamp: its colour, a thin gold frame, the white ornament */
export const Stamp: React.FC<{ o: Orn; size: number; ghost?: boolean }> = ({ o, size, ghost }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={`block shrink-0 ${ghost ? 'opacity-45' : ''}`} aria-hidden="true">
    <rect width="100" height="100" rx="11" fill={ORN_COLOR[o]} />
    {size >= 18 && <rect x="6" y="6" width="88" height="88" rx="7" fill="none" stroke="#e8c877" strokeWidth="2.6" />}
    <g transform="translate(10 10) scale(0.8)" dangerouslySetInnerHTML={{ __html: FULL_HTML[o] }} />
  </svg>
);

/** a place of the cloth still empty: its ornament, faint */
const Place: React.FC<{ o: Orn; size: number }> = ({ o, size }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className="block shrink-0" aria-hidden="true">
    <rect x="1.5" y="1.5" width="97" height="97" rx="11" fill={CLOTH} stroke="#d9c9ad" strokeWidth="3" />
    <g transform="translate(14 14) scale(0.72)" opacity="0.3" dangerouslySetInnerHTML={{ __html: FAINT_HTML[o] }} />
  </svg>
);

/** an empty place of the loom or of the dye */
const Slot: React.FC<{ size: number; label?: string }> = ({ size, label }) => (
  <span className="relative block shrink-0 rounded-[18%] bg-[#f2e8d4] ring-1 ring-inset ring-[#d4b080]/70" style={{ width: size, height: size }} aria-hidden="true">
    {label && <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-[#8a6239]/70 tabular-nums">{label}</span>}
  </span>
);

/** the უსტაბაში's token: gold, its letter in the old capitals */
export const Token: React.FC<{ size: number; ghost?: boolean }> = ({ size, ghost }) => (
  <span
    className={`relative flex shrink-0 items-center justify-center rounded-[18%] font-serif-ge font-bold leading-none text-[#7a2028] ${ghost ? 'opacity-45' : ''}`}
    style={{ width: size, height: size, background: GOLD, fontSize: size * 0.62, boxShadow: `inset 0 0 0 ${Math.max(1.5, size * 0.07)}px #7a2028` }}
    aria-hidden="true"
  >Ⴓ</span>
);

export interface Sel { src: number; o: Orn }

/** the wooden trays: a tap on a stamp picks all of its ornament there */
export const Trays: React.FC<{ g: LurjiGame; cell: number; sel: Sel | null; onPick?: (s: Sel) => void }> = ({ g, cell, sel, onPick }) => {
  // rows that stay even: 5 trays 3 + 2, 7 — 4 + 3, 9 — 5 + 4; as big as the row allows (the board's width), at most 2.55 cells
  const n = g.trays.length, perRow = n <= 5 ? 3 : n <= 7 ? 4 : 5, gap = perRow > 4 ? 6 : 8;
  const width = 10 * cell + 58;
  const size = Math.min(Math.round(cell * 2.55), Math.floor((width - (perRow - 1) * gap) / perRow));
  const stamp = Math.round(size * 0.36);
  return (
    <ul className="mx-auto flex flex-wrap justify-center" style={{ gap, maxWidth: perRow * size + (perRow - 1) * gap }} aria-label="ლანგრები">
      {g.trays.map((t, i) => {
        const empty = !t.length;
        return (
          <li key={i} className="relative shrink-0 rounded-full" style={{ width: size, height: size, background: empty ? 'transparent' : WOOD_DARK }}>
            <span
              className={`absolute rounded-full ${empty ? 'border-2 border-dashed border-[#d4b080]/70' : ''}`}
              style={{ inset: empty ? 0 : size * 0.07, background: empty ? 'rgba(212,176,128,0.12)' : WOOD_LIGHT }}
              aria-hidden="true"
            />
            <span className={`absolute left-1/2 -translate-x-1/2 -top-1 z-10 rounded-full px-1.5 text-[11px] font-bold leading-[16px] ${empty ? 'bg-[#e8dcc8] text-[#9a8b7b]' : 'bg-[#7a2028] text-[#f0d9a8]'}`}>{TRAY_NO[i]}</span>
            {!empty && (
              <span className="absolute inset-0 grid grid-cols-2 place-content-center gap-[3px]" style={{ padding: size * 0.13 }}>
                {t.map((o, k) => {
                  const on = sel?.src === i && sel.o === o;
                  const label = `ლანგარი ${TRAY_NO[i]}: ${countAt(g, i, o)} ${ORN_NAMES[o]}`;
                  return onPick ? (
                    <button
                      key={k}
                      type="button"
                      onClick={() => onPick({ src: i, o })}
                      aria-label={label}
                      aria-pressed={on}
                      className={`rounded-[18%] transition cursor-pointer active:scale-95 ${on ? 'ring-[3px] ring-[#f0d9a8] -translate-y-0.5 shadow-[0_6px_10px_-4px_rgba(0,0,0,0.5)]' : ''} ${sel && !on ? 'opacity-70' : ''}`}
                    ><Stamp o={o} size={stamp} /></button>
                  ) : <span key={k} title={label}><Stamp o={o} size={stamp} /></span>;
                })}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
};

/** the meidan: what the trays left, by ornament, and the token while nobody has taken it */
export const Meidan: React.FC<{ g: LurjiGame; size: number; sel: Sel | null; onPick?: (s: Sel) => void }> = ({ g, size, sel, onPick }) => {
  const groups = ORNS.filter(o => g.meidan[o] > 0);
  return (
    <section className="rounded-2xl px-3 py-2.5 ring-1 ring-[#d9c9ad]" style={{ background: CLOTH }} aria-label="მეიდანი">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12.5px] font-bold text-[#4a3426]">მეიდანი</p>
        {g.token < 0 && <p className="text-[12px] text-[#75685a] flex items-center gap-1.5"><Token size={18} />ნიშანი — პირველს, ვინც აქედან აიღებს</p>}
      </div>
      {groups.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {groups.map(o => {
            const on = sel?.src === -1 && sel.o === o;
            const body = (
              <>
                <span className="flex -space-x-2.5">{Array.from({ length: Math.min(g.meidan[o], 4) }, (_, k) => <Stamp key={k} o={o} size={size} />)}</span>
                <span className="text-[14px] font-bold tabular-nums text-[#4a3426]">×{g.meidan[o]}</span>
              </>
            );
            return onPick ? (
              <button
                key={o}
                type="button"
                onClick={() => onPick({ src: -1, o })}
                aria-label={`მეიდანი: ${g.meidan[o]} ${ORN_NAMES[o]}`}
                aria-pressed={on}
                className={`inline-flex items-center gap-1.5 min-h-11 rounded-xl pl-1.5 pr-2.5 py-1 transition cursor-pointer active:scale-[0.97] ${on ? 'bg-white ring-[3px] ring-[#c9a24b] -translate-y-0.5' : 'bg-white/60 ring-1 ring-[#d9c9ad] hover:bg-white'} ${sel && !on ? 'opacity-70' : ''}`}
              >{body}</button>
            ) : <span key={o} className="inline-flex items-center gap-1.5 min-h-11 rounded-xl pl-1.5 pr-2.5 py-1 bg-white/60 ring-1 ring-[#d9c9ad]">{body}</span>;
          })}
        </div>
      ) : <p className="mt-1 text-[12.5px] text-[#9a8b7b]">ჯერ ცარიელია — ლანგრის ნარჩენი აქ ჩამოიყრება.</p>}
    </section>
  );
};

export interface Pick { o: Orn; count: number; token: boolean; line: number | null; onLine: (k: number) => void }

/** a board: the loom's five lines (filled from the right) beside the cloth, the spilt dye under them. With `pick`, the lines
 *  the stamps in hand may go onto glow and take a tap; the chosen one shows where they would land. `fresh` = this evening's
 *  printed places, with their points. */
export const Loom: React.FC<{ b: LBoard; cell: number; pick?: Pick; fresh?: Placed[]; mini?: boolean }> = ({ b, cell, pick, fresh, mini }) => {
  const gap = mini ? 2 : 3;
  const land = pick && pick.line !== null ? landing(b, pick.line, pick.count, pick.token) : null;
  const lineRow = (k: number) => {
    const L = b.lines[k];
    const ok = !!pick && fits(b, k, pick.o);
    const chosen = pick?.line === k;
    const cells = Array.from({ length: k + 1 }, (_, j) => {
      // j counts from the right: the line fills from there
      const filled = j < L.n;
      const ghost = chosen && land && !filled && j < L.n + land.onLine;
      return (
        <span key={j}>
          {filled ? <Stamp o={L.o as Orn} size={cell} /> : ghost ? <Stamp o={pick!.o} size={cell} ghost /> : <Slot size={cell} />}
        </span>
      );
    }).reverse();
    const row = <span className="flex justify-end" style={{ gap }}>{cells}</span>;
    if (!pick) return <div key={k} style={{ height: cell }}>{row}</div>;
    return (
      <button
        key={k}
        type="button"
        disabled={!ok}
        onClick={() => pick.onLine(k)}
        aria-pressed={chosen}
        aria-label={`ზოლი ${k + 1}`}
        className={`block w-full rounded-[10px] transition cursor-pointer disabled:cursor-default ${chosen ? 'ring-[3px] ring-[#c9a24b] ring-offset-2 ring-offset-white' : ok ? 'ring-2 ring-[#2f6db0]/50 ring-offset-2 ring-offset-white hover:ring-[#2f6db0]' : 'opacity-35'}`}
        style={{ height: cell }}
      >{row}</button>
    );
  };
  const wall = (
    <div className="grid shrink-0" style={{ gridTemplateColumns: `repeat(5, ${cell}px)`, gap }} aria-label="სუფრა">
      {[0, 1, 2, 3, 4].flatMap(r => [0, 1, 2, 3, 4].map(c => {
        const o = ornAt(r, c);
        const f = fresh?.find(p => p.r === r && p.c === c);
        return (
          <span key={`${r}-${c}`} className="relative">
            {has(b.wall, r, c) ? <Stamp o={o} size={cell} /> : <Place o={o} size={cell} />}
            {f && !mini && <span className="absolute -top-1.5 -right-1.5 z-10 min-w-[20px] h-[20px] rounded-full bg-[#2f7d4f] px-1 text-[11px] font-bold leading-[20px] text-white text-center shadow tabular-nums">+{f.pts}</span>}
            {f && mini && <span className="absolute inset-0 rounded-[18%] ring-2 ring-[#2f7d4f]" aria-hidden="true" />}
          </span>
        );
      }))}
    </div>
  );
  // the dye: the token and stamps from the left, then where a pick would spill
  const floor = Array.from({ length: 7 }, (_, j) => {
    const x = b.floor[j];
    if (x !== undefined) return x === TOKEN ? <Token key={j} size={cell} /> : <Stamp key={j} o={x as Orn} size={cell} />;
    if (land && pick) {
      const extra = j - b.floor.length;
      const tokenFirst = pick.token ? 1 : 0;
      if (extra < tokenFirst) return <Token key={j} size={cell} ghost />;
      if (extra - tokenFirst < land.onFloor) return <Stamp key={j} o={pick.o} size={cell} ghost />;
    }
    return <Slot key={j} size={cell} label={mini ? undefined : `−${FLOOR[j]}`} />;
  });
  const floorChosen = pick?.line === -1;
  const floorRow = <span className="flex" style={{ gap }}>{floor}</span>;
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-center" style={{ gap: mini ? 4 : 10 }}>
        <div className="shrink-0 flex flex-col" style={{ gap, width: 5 * cell + 4 * gap }}>{[0, 1, 2, 3, 4].map(lineRow)}</div>
        {wall}
      </div>
      {pick ? (
        <button
          type="button"
          onClick={() => pick.onLine(-1)}
          aria-pressed={floorChosen}
          className={`w-full flex items-center gap-2 rounded-xl px-1.5 py-1.5 transition cursor-pointer ${floorChosen ? 'bg-[#8e2431]/[0.06] ring-[3px] ring-[#c9a24b]' : 'ring-1 ring-[#e8dcc8] hover:ring-[#8e2431]/40'}`}
        >
          {floorRow}
          <span className="min-w-0 text-left text-[12px] font-bold leading-tight text-[#8e2431]">პირდაპირ საღებავზე</span>
        </button>
      ) : (
        <div className="flex items-center gap-2" style={{ paddingLeft: mini ? 0 : 6 }}>
          {floorRow}
          {!mini && <span className="text-[12px] leading-tight text-[#75685a]">დაღვრილი საღებავი</span>}
        </div>
      )}
    </div>
  );
};

/** how big a board's places are on this screen: as big as fit, 30 px on a 390 px phone, at most 40; on a phone on its side
 *  and on a wide screen the board shares the width with the trays (Play's two columns) */
export const useCell = () => {
  const calc = () => {
    if (typeof window === 'undefined') return 30;
    const two = window.innerHeight <= 500 || window.innerWidth >= 1024;
    const col = two ? (Math.min(window.innerWidth, 880) - 32 - 14) / 2 : Math.min(window.innerWidth, 672) - 32;
    return Math.max(24, Math.min(40, Math.floor((col - 24 - 34) / 10)));
  };
  const [cell, setCell] = useState(calc);
  useEffect(() => {
    const on = () => setCell(calc());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return cell;
};

const SOURCE = (from: number) => (from < 0 ? 'მეიდანი' : `ლანგარი ${TRAY_NO[from]}`);
/** a take in words: „ანა: 3 თევზი · ლანგარი ბ → ზოლი 3 · 1 დაიღვარა“ */
export const takeText = (l: LLine, names: string[]) => {
  const where = l.line < 0 ? 'საღებავზე' : `ზოლი ${l.line + 1}`;
  const spilt = l.line >= 0 && l.spilt ? ` · ${l.spilt} დაიღვარა` : '';
  return `${names[l.who]}: ${l.count} ${ORN_NAMES[l.o]} · ${SOURCE(l.from)} → ${where}${spilt}${l.token ? ' · ნიშანი' : ''}`;
};
/** an evening in words: „+5 · საღებავი −2 → 14“ */
export const eveningText = (e: Evening) => {
  const got = e.placed.reduce((a, p) => a + p.pts, 0);
  return [got ? `+${got}` : '', e.floor ? `საღებავი −${e.floor}` : ''].filter(Boolean).join(' · ') || 'ამ საღამოს არაფერი';
};
