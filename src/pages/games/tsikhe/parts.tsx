import React from 'react';
import { KeyRound, Lock } from 'lucide-react';
import { NUMERALS, mmss, ROOM_MS, piecesOf, type Carved, type TsikheRoom } from '../../../utils/tsikhe';
import { SCRIPT_LABEL, toScript } from '../../../utils/oldScripts';

// The pieces of „ციხის გასაღები“ shared by the run alone and the class's screen: each castle's picture and colour, the trail of
// doors with the key's pieces found, an inscription on the wall, the scroll of the old letters' numbers, the clock and the door
// that swings open.

interface Look { tint: string; sky: string; night?: boolean }
export const ROOM_LOOK: Record<string, Look> = {
  narikala: { tint: '#7a2028', sky: '#f6e7d6' },
  ananuri: { tint: '#24827e', sky: '#e0efe9' },
  kajeti: { tint: '#5b3f8c', sky: '#2c2548', night: true },
  gonio: { tint: '#2b5f8a', sky: '#e0ebf5' },
};
export const lookOf = (id: string): Look => ROOM_LOOK[id] ?? ROOM_LOOK.narikala;

// a row of merlons on a wall's top: x from, x to, y of the top
const merlons = (x0: number, x1: number, y: number, w = 4) => {
  const n = Math.max(2, Math.round((x1 - x0) / (w * 2)));
  const step = (x1 - x0) / n;
  return Array.from({ length: n }, (_, i) => `M${(x0 + i * step).toFixed(1)} ${y} h${(step / 2).toFixed(1)} v-3 h-${(step / 2).toFixed(1)} z`).join(' ');
};

/** a castle: two towers, the keep with its flag, the wall and the gate; each room its colours and its place (hills, a river,
 *  the night of the poem, the sea) */
export const CastleArt: React.FC<{ room: string; className?: string; open?: boolean }> = ({ room, className = '', open = false }) => {
  const k = lookOf(room);
  const stone = k.night ? '#cfc3e4' : '#eadfca';
  const shade = k.night ? '#a898c6' : '#d5c4a6';
  const line = k.night ? '#1d1734' : '#6b5440';
  return (
    <svg viewBox="0 0 120 84" className={className} aria-hidden="true">
      <rect x="0" y="0" width="120" height="84" rx="14" fill={k.sky} />
      {k.night && (
        <g fill="#f3e3a1">
          <path d="M98 12a8 8 0 1 0 7 11a6.5 6.5 0 1 1-7-11z" />
          {[[16, 14], [30, 8], [46, 17], [74, 9], [86, 25], [10, 30]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.1" />)}
        </g>
      )}
      {room === 'ananuri' && <path d="M0 50 L22 26 L38 40 L58 18 L80 38 L98 24 L120 44 V84 H0 Z" fill="#bcd8cf" />}
      {room === 'narikala' && <path d="M0 58 Q30 40 60 50 T120 46 V84 H0 Z" fill="#e8d2b4" />}
      {room === 'gonio' && <circle cx="100" cy="18" r="7" fill="#f2c96b" />}
      {/* the ground */}
      <path d={room === 'gonio' ? 'M0 70 H120 V84 H0 Z' : 'M0 72 Q60 64 120 72 V84 H0 Z'} fill={k.night ? '#3d3466' : room === 'ananuri' ? '#8fbcae' : '#cdb48c'} />
      {/* the wall */}
      <rect x="22" y="44" width="76" height="28" fill={stone} stroke={line} strokeOpacity=".45" strokeWidth=".8" />
      <path d={merlons(22, 98, 44)} fill={stone} stroke={line} strokeOpacity=".45" strokeWidth=".8" />
      {/* the towers */}
      {[[10, 28], [92, 28]].map(([x, y]) => (
        <g key={x}>
          <rect x={x} y={y} width="18" height={72 - y} fill={stone} stroke={line} strokeOpacity=".5" strokeWidth=".8" />
          <path d={merlons(x, x + 18, y, 3)} fill={stone} stroke={line} strokeOpacity=".5" strokeWidth=".8" />
          <rect x={x + 7.5} y={y + 10} width="3" height="7" rx="1.5" fill={line} opacity=".7" />
          <rect x={x} y={y + 24} width="18" height="2.4" fill={shade} />
        </g>
      ))}
      {/* the keep and its flag */}
      <rect x="49" y="18" width="22" height="54" fill={stone} stroke={line} strokeOpacity=".5" strokeWidth=".8" />
      <path d={merlons(49, 71, 18, 3)} fill={stone} stroke={line} strokeOpacity=".5" strokeWidth=".8" />
      <line x1="60" y1="15" x2="60" y2="3" stroke={line} strokeWidth="1" />
      <path d="M60 3.5 L71 6.5 L60 9.5 Z" fill={k.tint} />
      <rect x="56.5" y="26" width="7" height="8" rx="3.5" fill={line} opacity=".7" />
      {/* the gate */}
      <path d="M53 72 V60 a7 7 0 0 1 14 0 V72 Z" fill={open ? '#f3d27a' : k.tint} stroke={line} strokeOpacity=".55" strokeWidth=".8" />
      {!open && <line x1="60" y1="54" x2="60" y2="72" stroke={line} strokeOpacity=".4" strokeWidth=".7" />}
      {room === 'gonio' && <path d="M0 76 q7.5 -4 15 0 t15 0 t15 0 t15 0 t15 0 t15 0 t15 0 t15 0 V84 H0 Z" fill="#5d93c2" opacity=".85" />}
      {room === 'ananuri' && <path d="M0 78 q15 -3 30 0 t30 0 t30 0 t30 0 V84 H0 Z" fill="#4f9ec9" opacity=".8" />}
    </svg>
  );
};

/** the doors in a row: an open one shows its piece of the key, the one on hand its number in the castle's colour */
export const DoorTrail: React.FC<{ room: TsikheRoom; door: number; solved?: boolean; size?: 'md' | 'lg' }> = ({ room, door, solved = false, size = 'md' }) => {
  const pieces = piecesOf(room);
  const tint = lookOf(room.id).tint;
  const box = size === 'lg' ? 'w-14 h-14 text-[24px]' : 'w-11 h-11 text-[19px]';
  return (
    <ol className="flex items-center justify-center gap-1.5" aria-label="კარები">
      {room.doors.map((_, i) => {
        const got = i < door || (i === door && solved);
        const here = i === door && !solved;
        return (
          <li
            key={i}
            className={`${box} rounded-xl flex items-center justify-center font-serif-ge font-bold ${got ? 'bg-[#c9a227] text-white shadow-[0_3px_0_#a3821b]' : here ? 'bg-white' : 'bg-[#efe7d9] text-[#b3a48c]'}`}
            style={here ? { boxShadow: `inset 0 0 0 2.5px ${tint}`, color: tint } : undefined}
            aria-label={got ? `კარი ${i + 1}: ნაწილი „${pieces[i]}“` : `კარი ${i + 1}`}
          >
            {got ? pieces[i] : <span className="text-[14px] tabular-nums">{i + 1}</span>}
          </li>
        );
      })}
      <li
        className={`${box} rounded-full flex items-center justify-center ${door > room.doors.length ? 'bg-[#2f7d4f] text-white' : door === room.doors.length ? 'bg-white' : 'bg-[#efe7d9] text-[#b3a48c]'}`}
        style={door === room.doors.length ? { boxShadow: `inset 0 0 0 2.5px ${tint}`, color: tint } : undefined}
        aria-label="ჭიშკარი"
      >
        {door >= room.doors.length ? <KeyRound className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
      </li>
    </ol>
  );
};

/** an inscription on the wall: the old letters on a stone plate */
export const CarvedPlate: React.FC<{ carved: Carved; big?: boolean }> = ({ carved, big = false }) => {
  const long = [...carved.text].length > 16;
  return (
    <figure className="rounded-2xl px-4 py-4 bg-[linear-gradient(160deg,#efe6d4,#e2d5bd)] shadow-[inset_0_2px_6px_rgba(74,52,38,0.18)] ring-1 ring-[#d3c2a3]">
      <p
        className={`font-serif-ge text-center text-[#4a2a1e] leading-[1.35] tracking-[0.08em] ${big ? (long ? 'text-[40px]' : 'text-[60px]') : long ? 'text-[25px]' : 'text-[36px]'}`}
        style={{ textShadow: '0 1px 0 rgba(255,255,255,0.7)' }}
        lang="ka"
      >
        {toScript(carved.text, carved.script)}
      </p>
      <figcaption className="mt-1.5 text-center text-[12px] font-bold text-[#8a7560]">{SCRIPT_LABEL[carved.script]}</figcaption>
    </figure>
  );
};

/** the scroll's piece: the old letters as numbers, ა 1 … ჩ 1000 */
export const NumeralScroll: React.FC<{ big?: boolean }> = ({ big = false }) => (
  <div className="rounded-2xl px-3 py-3 bg-[#f7ecd2] ring-1 ring-[#e3cf9f]">
    <p className="mb-2 text-center text-[12.5px] font-bold text-[#8a6416]">გრაგნილის ნაგლეჯი · ასო = რიცხვი</p>
    <ul className={`grid gap-1 ${big ? 'grid-cols-14' : 'grid-cols-7'}`}>
      {NUMERALS.map(([l, n]) => (
        <li key={l} className="rounded-lg bg-white/70 py-1 flex flex-col items-center">
          <span className={`font-serif-ge leading-tight text-[#7a2028] ${big ? 'text-[28px]' : 'text-[21px]'}`}>{toScript(l, 'asomtavruli')}</span>
          <span className={`leading-none font-bold tabular-nums text-[#4a3426] ${big ? 'text-[14px]' : 'text-[11.5px]'}`}>{n}</span>
        </li>
      ))}
    </ul>
  </div>
);

/** the clock: amber in the last five minutes, red once the guard has come */
export const ClockPill: React.FC<{ ms: number; big?: boolean }> = ({ ms, big = false }) => {
  const late = ms > ROOM_MS;
  const near = !late && ms > ROOM_MS - 5 * 60_000;
  return (
    <span
      className={`inline-flex items-center rounded-full font-bold tabular-nums ${big ? 'h-12 px-5 text-[26px]' : 'h-9 px-3 text-[15px]'} ${late ? 'bg-[#b23a48] text-white' : near ? 'bg-amber-100 text-amber-900' : 'bg-[#7a2028]/[0.08] text-[#7a2028]'}`}
      role="timer"
      aria-label={`დრო ${mmss(ms)}`}
    >
      {mmss(ms)}
    </span>
  );
};

/** a door that swings open on the piece it gave */
export const OpenedDoor: React.FC<{ piece?: string; tint: string }> = ({ piece, tint }) => (
  <div className="tsikhe-gate relative mx-auto w-[132px] h-[150px] rounded-t-[66px] overflow-hidden ring-4 ring-[#d5c4a6] bg-[radial-gradient(circle_at_50%_55%,#fff4c9,#f3d27a_55%,#c9a227)]">
    <span className="absolute inset-0 flex items-center justify-center">
      {piece
        ? <span className="samosi-pop w-[70px] h-[76px] rounded-2xl bg-[#c9a227] text-white shadow-[0_5px_0_#a3821b] flex items-center justify-center font-serif-ge text-[44px] font-bold">{piece}</span>
        : <KeyRound className="samosi-pop w-16 h-16 text-[#7a5a10]" />}
    </span>
    <span className="tsikhe-leaf-l absolute left-0 top-0 bottom-0 w-1/2 rounded-tl-[66px]" style={{ background: tint }} aria-hidden="true">
      <span className="absolute right-2 top-1/2 w-2.5 h-2.5 rounded-full bg-[#f3d27a]" />
    </span>
    <span className="tsikhe-leaf-r absolute right-0 top-0 bottom-0 w-1/2 rounded-tr-[66px]" style={{ background: tint, filter: 'brightness(0.88)' }} aria-hidden="true">
      <span className="absolute left-2 top-1/2 w-2.5 h-2.5 rounded-full bg-[#f3d27a]" />
    </span>
  </div>
);

/** ★★★ */
export const Stars: React.FC<{ n: number; size?: 'md' | 'lg' }> = ({ n, size = 'md' }) => (
  <span className={`inline-flex ${size === 'lg' ? 'gap-1 text-[30px]' : 'gap-0.5 text-[16px]'}`} aria-label={`${n} ვარსკვლავი`}>
    {[1, 2, 3].map(i => <span key={i} className={i <= n ? 'text-[#c9a227]' : 'text-[#e3d9c8]'} aria-hidden="true">★</span>)}
  </span>
);
