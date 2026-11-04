import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { ACTS, COUP, MUST_COUP, ROLES, type Role } from '../../../utils/mepisKari';
import { ACT_DOES, ACT_ICON, ROLE_LOOK } from './look';

// The pieces of a turn, shared by the online room and the one phone: the seven actions (a courtier's ones marked — held, or
// a bluff), the clock of a step on the story's card, and the device's choice to keep my cards face down on screen.

/** the actions of the player on turn: a disabled one says why; `held` — my own cards (online), to mark a claim true or a bluff */
export const ActionPad: React.FC<{ coins: number; held?: readonly number[]; chosen: number; onChoose: (act: number) => void }> = ({ coins, held, chosen, onChoose }) => {
  const must = coins >= MUST_COUP;
  return (
    <section className="space-y-2" aria-label="მოქმედებები">
      {must && <p className="rounded-2xl bg-[#7a2028]/[0.08] px-3.5 py-2.5 text-[13px] font-bold leading-snug text-[#7a2028]">{MUST_COUP} თეთრი ან მეტი — დარბაზი სავალდებულოა.</p>}
      <ul className="grid grid-cols-2 gap-2">
        {ACTS.map((a, act) => {
          const Ic = ACT_ICON[act];
          const short = coins < a.cost;
          const off = short || (must && act !== COUP);
          const on = chosen === act;
          const claim = a.claim >= 0 ? (a.claim as Role) : null;
          const look = claim !== null ? ROLE_LOOK[claim] : null;
          const have = claim !== null && held?.includes(claim);
          return (
            <li key={act} className={act === ACTS.length - 1 ? 'col-span-2' : ''}>
              <button
                type="button"
                disabled={off}
                onClick={() => onChoose(on ? -1 : act)}
                aria-pressed={on}
                className={`w-full h-full min-h-[76px] rounded-2xl px-3 py-2.5 text-left flex items-start gap-2.5 transition cursor-pointer active:scale-[0.98] disabled:cursor-default disabled:opacity-40 ${on ? 'bg-[#7a2028] text-[#fbf6ec] ring-2 ring-[#7a2028]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] hover:ring-[#7a2028]/40'}`}
              >
                <span className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center ${on ? 'bg-white/15 text-[#f0d9a8]' : 'bg-[#7a2028]/[0.08] text-[#7a2028]'}`}><Ic className="w-[18px] h-[18px]" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-bold leading-tight">{a.name}</span>
                  <span className={`mt-0.5 block text-[12px] leading-snug ${on ? 'text-[#fbf6ec]/85' : 'text-[#75685a]'}`}>{short ? `საჭიროა ${a.cost} თეთრი` : ACT_DOES[act]}</span>
                  {claim !== null && look && (
                    <span className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] font-bold leading-tight">
                      <span className="inline-flex items-center gap-1" style={{ color: on ? '#f0d9a8' : look.color }}><look.Icon className="w-3.5 h-3.5" />{ROLES[claim].name}</span>
                      {held && (have
                        ? <span className={`inline-flex items-center gap-0.5 ${on ? 'text-[#c8ecd4]' : 'text-[#24603d]'}`}><Check className="w-3.5 h-3.5" />გყავს</span>
                        : <span className={on ? 'text-[#fbf6ec]/70' : 'text-[#9a8b7b]'}>ბლეფი</span>)}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

/** the clock of a step, on the story's wine card */
export const StepClock: React.FC<{ left: number; total: number }> = ({ left, total }) => {
  const r = 42, c = 2 * Math.PI * r;
  const urgent = left <= 5;
  return (
    <div className="relative w-14 h-14 shrink-0" role="timer" aria-label={`დარჩა ${Math.ceil(left)} წამი`}>
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="9" />
        {left > 0 && <circle cx="50" cy="50" r={r} fill="none" stroke={urgent ? '#ffb4a8' : '#f0d9a8'} strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - left / total)} style={{ transition: 'stroke-dashoffset 0.25s linear' }} />}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[16px] font-bold tabular-nums">{Math.ceil(left)}</span>
    </div>
  );
};

const HIDE_KEY = 'sg-kari-hide';
/** my cards kept face down on screen until touched (a classroom where a neighbour sees the screen); kept on the device */
export const useHideCards = () => {
  const [hide, setHide] = useState(() => { try { return localStorage.getItem(HIDE_KEY) === '1'; } catch { return false; } });
  const [peek, setPeek] = useState(false);
  useEffect(() => { if (!peek) return; const t = setTimeout(() => setPeek(false), 4000); return () => clearTimeout(t); }, [peek]);
  const toggle = () => setHide(h => { try { localStorage.setItem(HIDE_KEY, h ? '0' : '1'); } catch { /* private mode */ } return !h; });
  return { hidden: hide && !peek, hide, toggle, peek: () => setPeek(true) };
};
