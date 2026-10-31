import React, { useEffect, useState } from 'react';
import { Check, Crown, Loader2, Play, RotateCcw, Square, Volume2 } from 'lucide-react';
import { placesOf } from '../../../utils/roundGames';
import { clock } from '../../../utils/amikhseni';
import { triggerHaptic } from '../../../utils/haptics';
import type { SnipState } from './useSnippet';

// The quick games' small pieces (pages/games/rounds/): the clock, the piece of a recording, the round's head, who has
// answered, the table of points and the podium.

/** now, every quarter of a second while `on` */
export const useNow = (on = true) => {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!on) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [on]);
  return now;
};

export const TimerRing: React.FC<{ left: number; total: number; size?: 'md' | 'sm' }> = ({ left, total, size = 'md' }) => {
  const r = 44;
  const c = 2 * Math.PI * r;
  const urgent = left <= 5;
  return (
    <div className={`relative shrink-0 ${size === 'sm' ? 'w-16 h-16' : 'w-24 h-24'}`} role="timer" aria-label={`დარჩა ${Math.ceil(left)} წამი`}>
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#f1e8d9" strokeWidth="8" />
        {left > 0 && (
          <circle
            cx="50" cy="50" r={r} fill="none" stroke={urgent ? '#c0392b' : '#7a2028'} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - left / total)} style={{ transition: 'stroke-dashoffset 0.25s linear' }}
          />
        )}
      </svg>
      <div className={`absolute inset-0 flex items-center justify-center font-serif-ge font-bold tabular-nums ${size === 'sm' ? 'text-[17px]' : 'text-[24px]'} ${urgent ? 'text-[#c0392b]' : 'text-[#4a3426]'}`}>
        {clock(Math.ceil(left))}
      </div>
    </div>
  );
};

const SNIP_TEXT: Record<SnipState, string> = {
  idle: 'მოისმინე ნაწყვეტი',
  load: 'იტვირთება…',
  play: 'ისმის…',
  done: 'კიდევ ერთხელ',
  error: 'ვერ ჩაირთო — შეეხე და სცადე ხელახლა',
  blocked: 'შეეხე ▶-ს, რომ მოისმინო',
};

/** the round's piece: ▶ / ■ / ↺ and how far it has played */
export const SnippetBox: React.FC<{ state: SnipState; prog: number; onTap: () => void; note?: string }> = ({ state, prog, onTap, note }) => {
  const busy = state === 'play' || state === 'load';
  const ask = state === 'blocked' || state === 'error';
  return (
    <div className={`flex items-center gap-3 rounded-2xl px-3 py-3 ${ask ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-white ring-1 ring-[#e8dcc8]'}`}>
      <button
        type="button"
        onClick={() => { triggerHaptic(10); onTap(); }}
        aria-label={busy ? 'გაჩერება' : 'ნაწყვეტის მოსმენა'}
        className={`w-12 h-12 shrink-0 rounded-full bg-[#7a2028] text-[#fbf6ec] flex items-center justify-center shadow-[0_4px_12px_-6px_rgba(122,32,40,0.7)] active:scale-[0.96] cursor-pointer ${ask ? 'animate-pulse' : ''}`}
      >
        {state === 'load' ? <Loader2 className="w-5 h-5 animate-spin" /> : busy ? <Square className="w-4 h-4 fill-current" /> : state === 'done' ? <RotateCcw className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5 fill-current" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`text-[13px] font-bold leading-snug ${ask ? 'text-amber-900' : 'text-[#4a3426]'}`}>{SNIP_TEXT[state]}</p>
        <div className="mt-1.5 h-1.5 rounded-full bg-[#f1e8d9] overflow-hidden">
          <div className={`h-full rounded-full bg-[#7a2028] ${state === 'load' ? 'animate-pulse' : ''}`} style={{ width: `${Math.round(prog * 100)}%` }} />
        </div>
        {note && <p className="mt-1 text-[12px] leading-snug text-[#9a8b7b]">{note}</p>}
      </div>
    </div>
  );
};

/** the sound is the host's (everybody in one room): a player's phone stays quiet */
export const HostSoundLine: React.FC = () => (
  <p className="flex items-center gap-2 rounded-2xl bg-[#4a3426]/[0.06] px-3.5 py-2.5 text-[13px] font-bold leading-snug text-[#75685a]">
    <Volume2 className="w-4 h-4 shrink-0" />ნაწყვეტი წამყვანის ტელეფონზე ჟღერს — მოუსმინე.
  </p>
);

export const RoundHead: React.FC<{ at: number; total: number; children?: React.ReactNode }> = ({ at, total, children }) => (
  <div className="flex items-center justify-between gap-3">
    <p className="text-[13px] font-bold tabular-nums text-[#a0703c]">რაუნდი {at + 1} / {total}</p>
    {children}
  </div>
);

/** who has answered this round (not what) */
export const AnsweredList: React.FC<{ names: string[]; answered: boolean[] }> = ({ names, answered }) => {
  const n = answered.filter(Boolean).length;
  return (
    <section>
      <p className={`text-[13.5px] font-bold tabular-nums ${n === names.length ? 'text-[#2f7d4f]' : 'text-[#4a3426]'}`}>უპასუხა: {n} / {names.length}</p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {names.map((name, i) => (
          <li key={i} className={`inline-flex items-center gap-1 min-h-8 px-2.5 py-1 rounded-full text-[13px] font-bold ${answered[i] ? 'bg-[#2f7d4f]/10 text-[#24603d]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#9a8b7b]'}`}>
            {answered[i] && <Check className="w-3.5 h-3.5" aria-label="უპასუხა" />}{name}
          </li>
        ))}
      </ul>
    </section>
  );
};

/** the points so far: a row a player, the best first; `gained` — this round's, `me` — my row */
export const Standings: React.FC<{ names: string[]; scores: number[]; gained?: number[] | null; me?: number; limit?: number }> = ({ names, scores, gained, me = -1, limit }) => {
  const places = placesOf(scores);
  const order = names.map((_, i) => i).sort((a, b) => scores[b] - scores[a] || a - b);
  const shown = limit && order.length > limit ? [...order.slice(0, limit), ...(me >= 0 && order.indexOf(me) >= limit ? [me] : [])] : order;
  return (
    <ol className="space-y-1.5">
      {shown.map(i => (
        <li key={i} className={`flex items-center gap-3 min-h-12 rounded-2xl px-3 ${i === me ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426]'}`}>
          <span className={`w-7 shrink-0 text-center text-[14px] font-bold tabular-nums ${i === me ? 'text-[#e2c27a]' : 'text-[#a0703c]'}`}>{places[i]}</span>
          <span className="min-w-0 flex-1 text-[14px] font-bold leading-tight [overflow-wrap:anywhere]">{names[i]}{i === me && <span className="ml-1 text-[12px] font-bold text-[#e2c27a]">· შენ</span>}</span>
          {gained && gained[i] > 0 && <span className={`shrink-0 text-[12.5px] font-bold tabular-nums ${i === me ? 'text-[#e2c27a]' : 'text-[#2f7d4f]'}`}>+{gained[i]}</span>}
          <span className="shrink-0 min-w-[3.5rem] text-right text-[15px] font-bold tabular-nums">{scores[i]}</span>
        </li>
      ))}
    </ol>
  );
};

/** the end: the first three on their steps */
export const Podium: React.FC<{ names: string[]; scores: number[]; me?: number }> = ({ names, scores, me = -1 }) => {
  const order = names.map((_, i) => i).sort((a, b) => scores[b] - scores[a] || a - b);
  const places = placesOf(scores);
  const top = order.slice(0, 3);
  // the second on the left, the first in the middle, the third on the right
  const steps = top.length === 3 ? [top[1], top[0], top[2]] : top.length === 2 ? [top[1], top[0]] : top;
  const height = (i: number) => (places[i] === 1 ? 'h-24' : places[i] === 2 ? 'h-16' : 'h-12');
  return (
    <div className="flex items-end justify-center gap-2 pt-2" aria-label="გამარჯვებულები">
      {steps.map(i => (
        <div key={i} className="flex-1 max-w-[8.5rem] min-w-0 flex flex-col items-center">
          {places[i] === 1 && <Crown className="w-7 h-7 text-[#c9a227] mb-1" aria-hidden="true" />}
          <p className={`w-full text-center text-[13.5px] font-bold leading-tight [overflow-wrap:anywhere] ${i === me ? 'text-[#7a2028]' : 'text-[#4a3426]'}`}>{names[i]}</p>
          <p className="mt-0.5 text-[12.5px] font-bold tabular-nums text-[#a0703c]">{scores[i]}</p>
          <div className={`mt-1.5 w-full ${height(i)} rounded-t-2xl flex items-start justify-center pt-2 font-serif-ge text-[20px] font-bold ${places[i] === 1 ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-[#e8dcc8] text-[#7a2028]'}`}>
            {places[i]}
          </div>
        </div>
      ))}
    </div>
  );
};

/** a line of a place: „მე-3 ადგილი“ */
export const placeText = (n: number) => (n === 1 ? 'პირველი ადგილი' : `მე-${n} ადგილი`);
