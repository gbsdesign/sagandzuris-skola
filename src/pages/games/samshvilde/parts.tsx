import React, { useEffect, useRef, useState } from 'react';
import {
  Amphora, Castle, Croissant, DoorOpen, Feather, Gem, Grape, Hammer, Lamp, Minus, Mountain, Music, Paintbrush, Pickaxe, Plus, ScrollText, Shield, Spool,
  Stamp, Undo2, VenetianMask, Wheat,
} from 'lucide-react';
import { ROLES, isSpy, type Player, type RoleId } from '../../../utils/samshvilde';
import { NO, type Hands as Ballots } from '../../../utils/samshvildeOnline';
import { clock } from '../../../utils/amikhseni';
import { bell, openAudio, tick, type AudioRef } from '../../../utils/gameSounds';
import { triggerHaptic } from '../../../utils/haptics';

// The pieces every screen of „სამშვილდის ღამე“ shares: the role and trade icons, the words the host reads, the names to
// tap, the speech clock, the hands counter and the footer with its „უკან“.

type Icon = React.FC<{ className?: string }>;
export const ROLE_ICON: Record<RoleId, Icon> = {
  citizen: Hammer, spy: VenetianMask, boss: Stamp, warden: Castle, guard: Shield, healer: Lamp, elder: DoorOpen, piper: Music,
};
const TRADE_ICON: Record<string, Icon> = {
  მჭედელი: Hammer, მეთუნე: Amphora, მევენახე: Grape, მეწისქვილე: Wheat, მქსოველი: Spool, მეპურე: Croissant,
  მწყემსი: Mountain, ოქრომჭედელი: Gem, ქვისმთლელი: Pickaxe, მგალობელი: Music, მწიგნობარი: Feather, მხატვარი: Paintbrush,
};
export const iconOf = (p: Player): Icon => (p.role === 'citizen' && p.trade && TRADE_ICON[p.trade]) || ROLE_ICON[p.role];

/** the words the host reads out */
export const Words: React.FC<{ dark?: boolean; label?: string; children: React.ReactNode }> = ({ dark, label = 'წაიკითხე ხმამაღლა', children }) => (
  <div className={`rounded-2xl px-4 py-3.5 ${dark ? 'bg-white/[0.06] ring-1 ring-white/10' : 'bg-white ring-1 ring-[#e8dcc8]'}`}>
    <p className={`text-[12px] font-bold ${dark ? 'text-[#e2c27a]' : 'text-[#9a8b7b]'}`}>{label}</p>
    <p className={`mt-1 font-serif-ge text-[20px] font-bold leading-snug ${dark ? 'text-[#f5ecdc]' : 'text-[#4a3426]'}`}>{children}</p>
  </div>
);

/** a short line for the host only */
export const Hint: React.FC<{ dark?: boolean; children: React.ReactNode; className?: string }> = ({ dark, children, className = '' }) => (
  <p className={`text-[13px] leading-snug ${dark ? 'text-[#c9bfae]' : 'text-[#75685a]'} ${className}`}>{children}</p>
);

/** the names to tap: two columns, the chosen one gold at night and wine by day; `note` is a small line under a name
 *  (online: which spies point at it) */
export const NameGrid: React.FC<{
  players: Pick<Player, 'name'>[]; ids: number[]; picked: number[]; onPick: (i: number) => void; dark?: boolean; label?: React.ReactNode;
  note?: (i: number) => React.ReactNode; disabled?: boolean;
}> = ({ players, ids, picked, onPick, dark, label, note, disabled }) => (
  <div>
    {label && <p className={`mb-2 text-[13px] font-bold ${dark ? 'text-[#e2c27a]' : 'text-[#4a3426]'}`}>{label}</p>}
    <div className="grid grid-cols-2 gap-2">
      {ids.map(i => {
        const on = picked.includes(i);
        return (
          <button
            key={i}
            type="button"
            aria-pressed={on}
            disabled={disabled}
            onClick={() => { triggerHaptic(8); onPick(i); }}
            className={`min-h-12 rounded-2xl px-3 py-2 text-[15px] font-bold leading-tight text-center [overflow-wrap:anywhere] cursor-pointer transition active:scale-[0.98] disabled:cursor-default disabled:active:scale-100 ${
              on
                ? dark ? 'bg-[#e2c27a] text-[#241f36] shadow-[0_6px_16px_-8px_rgba(226,194,122,0.8)]' : 'bg-[#7a2028] text-[#fbf6ec] shadow-[0_6px_16px_-8px_rgba(122,32,40,0.8)]'
                : dark ? 'bg-white/[0.07] text-[#ece3d2] ring-1 ring-white/15 hover:bg-white/[0.12]' : 'bg-white text-[#4a3426] ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40'
            }`}
          >
            {players[i].name}
            {note?.(i)}
          </button>
        );
      })}
    </div>
  </div>
);

/** a countdown from a fixed end time (a throttled tab stays honest): ticks at the last three seconds, the bell at the end.
 *  `start(from)` runs it from an earlier start (a clock already over shows 0 and stays silent). */
export const useCountdown = (total: number, audio: AudioRef, sound = true) => {
  const [endAt, setEndAt] = useState(0);
  const [left, setLeft] = useState(total);
  const last = useRef(total);
  const running = endAt > 0 && left > 0;
  useEffect(() => {
    if (!endAt) return;
    if (endAt <= Date.now()) { last.current = 0; setLeft(0); return; }
    const t = setInterval(() => {
      const ms = endAt - Date.now();
      const s = Math.max(0, Math.ceil(ms / 1000));
      if (s !== last.current) {
        last.current = s;
        setLeft(s);
        if (sound && s > 0 && s <= 3) { tick(audio.current); triggerHaptic(20); }
      }
      if (ms <= 0) { clearInterval(t); if (sound) bell(audio.current); triggerHaptic(120); }
    }, 200);
    return () => clearInterval(t);
  }, [endAt, sound, audio]);
  const start = (from?: number) => {
    // the tap that starts the clock opens the sound, so the bell may ring at its end
    openAudio(audio);
    const end = (from ?? Date.now()) + total * 1000;
    const s = Math.min(total, Math.max(0, Math.ceil((end - Date.now()) / 1000)));
    last.current = s;
    setLeft(s);
    setEndAt(end);
  };
  const reset = () => { setEndAt(0); last.current = total; setLeft(total); };
  return { left, running, started: endAt > 0, done: endAt > 0 && left === 0, start, reset };
};

export const Ring: React.FC<{ left: number; total: number; dark?: boolean; size?: 'md' | 'lg' }> = ({ left, total, dark, size = 'lg' }) => {
  const r = 44;
  const c = 2 * Math.PI * r;
  const urgent = left <= Math.min(10, Math.ceil(total / 4));
  return (
    <div className={`relative shrink-0 ${size === 'lg' ? 'w-28 h-28' : 'w-20 h-20'}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={r} fill="none" stroke={dark ? 'rgba(255,255,255,0.12)' : '#f1e8d9'} strokeWidth="8" />
        {left > 0 && <circle cx="50" cy="50" r={r} fill="none" stroke={urgent ? '#c0392b' : dark ? '#e2c27a' : '#7a2028'} strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - left / total)} style={{ transition: 'stroke-dashoffset 0.25s linear' }} />}
      </svg>
      <div className={`absolute inset-0 flex items-center justify-center font-serif-ge font-bold tabular-nums ${size === 'lg' ? 'text-[26px]' : 'text-[20px]'} ${urgent ? 'text-[#c0392b]' : dark ? 'text-[#f5ecdc]' : 'text-[#4a3426]'}`}>
        {total > 59 ? clock(left) : left}
      </div>
    </div>
  );
};

/** raised hands: minus, the number, plus */
export const Hands: React.FC<{ value: number; max: number; onChange: (n: number) => void; label: string }> = ({ value, max, onChange, label }) => (
  <div className="flex items-center gap-1.5 shrink-0">
    <button type="button" aria-label={`${label}: ერთით ნაკლები`} disabled={value <= 0} onClick={() => { triggerHaptic(5); onChange(value - 1); }} className="w-11 h-11 rounded-full ring-1 ring-[#e8dcc8] bg-white flex items-center justify-center text-[#7a2028] disabled:opacity-40 cursor-pointer"><Minus className="w-4 h-4" /></button>
    <span className="w-10 text-center font-serif-ge text-[24px] font-bold tabular-nums text-[#4a3426]" aria-live="polite">{value}</span>
    <button type="button" aria-label={`${label}: ერთით მეტი`} disabled={value >= max} onClick={() => { triggerHaptic(5); onChange(value + 1); }} className="w-11 h-11 rounded-full ring-1 ring-[#e8dcc8] bg-white flex items-center justify-center text-[#7a2028] disabled:opacity-40 cursor-pointer"><Plus className="w-4 h-4" /></button>
  </div>
);

/** the footer: „უკან“ (when there is a step to go back to) and the screen's own button */
export const Foot: React.FC<{ onBack?: () => void; dark?: boolean; children: React.ReactNode }> = ({ onBack, dark, children }) => (
  <div className="flex gap-3">
    {onBack && (
      <button
        type="button"
        onClick={() => { triggerHaptic(10); onBack(); }}
        aria-label="ერთი ნაბიჯით უკან"
        title="უკან"
        className={`w-14 h-14 shrink-0 rounded-full flex items-center justify-center ring-1 cursor-pointer active:scale-[0.97] ${dark ? 'bg-white/[0.06] ring-white/15 text-[#ece3d2] hover:bg-white/[0.12]' : 'bg-white ring-[#e8dcc8] text-[#7a2028] hover:ring-[#7a2028]/40'}`}
      >
        <Undo2 className="w-5 h-5" />
      </button>
    )}
    <div className="min-w-0 flex-1">{children}</div>
  </div>
);

/** the host's own table (every role) — opened only after a confirm */
export const RosterBtn: React.FC<{ dark?: boolean; onClick: () => void }> = ({ dark, onClick }) => (
  <button
    type="button"
    onClick={() => { triggerHaptic(8); onClick(); }}
    aria-label="მემატიანის ცხრილი"
    title="მემატიანის ცხრილი"
    className={`w-11 h-11 -mr-1 shrink-0 rounded-full flex items-center justify-center cursor-pointer ${dark ? 'text-[#e2c27a] hover:bg-white/10' : 'text-[#7a2028] hover:bg-[#7a2028]/[0.07]'}`}
  >
    <ScrollText className="w-5 h-5" />
  </button>
);

/** an online vote's open hands: every candidate (and „არა“ with one accused) with the names of those who raised them */
export const HandsList: React.FC<{ names: string[]; hands: Ballots }> = ({ names, hands }) => {
  const one = hands.candidates.length === 1;
  const rows = [
    ...hands.candidates.map(c => ({ key: String(c), label: one ? `ციხეში · ${names[c]}` : names[c], who: hands.ballots.flatMap((b, i) => (b === c ? [i] : [])) })),
    ...(one ? [{ key: 'no', label: 'არა', who: hands.ballots.flatMap((b, i) => (b === NO ? [i] : [])) }] : []),
  ];
  return (
    <section>
      <p className="mb-2 text-[13px] font-bold text-[#4a3426]">ვინ ვის მისცა ხმა{hands.round === 2 ? ' · ხელახლა' : ''}</p>
      <ul className="space-y-1.5">
        {rows.map(r => (
          <li key={r.key} className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3.5 py-2.5">
            <div className="flex items-center gap-3">
              <span className="min-w-0 flex-1 font-serif-ge text-[16px] font-bold leading-tight text-[#4a3426] [overflow-wrap:anywhere]">{r.label}</span>
              <span className="shrink-0 font-serif-ge text-[20px] font-bold tabular-nums text-[#7a2028]">{r.who.length}</span>
            </div>
            {r.who.length > 0 && <p className="mt-0.5 text-[13px] leading-snug text-[#75685a]">{r.who.map(i => names[i]).join(', ')}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
};

/** the card a player sees when the phone deals: the same look for every role, so nobody reads it from across the room.
 *  `children` (online: whom the player knows) take the place of the spies' „you meet them on the first night“. */
export const RoleCard: React.FC<{ p: Player; children?: React.ReactNode }> = ({ p, children }) => {
  const info = ROLES[p.role];
  const Ic = iconOf(p);
  return (
    <div className="relative rounded-[28px] bg-[#fffaf0] ring-1 ring-[#e8dcc8] shadow-[0_18px_40px_-24px_rgba(74,52,38,0.55)] px-5 pt-6 pb-5 text-center">
      <div className="pointer-events-none absolute inset-2 rounded-[22px] ring-1 ring-[#c9a24a]/45" aria-hidden="true" />
      <p className="text-[12px] font-bold text-[#9a8b7b]">{isSpy(p.role) ? 'ჯაშუშების მხარე' : 'ქალაქის მხარე'}</p>
      <div className="mx-auto mt-3 w-20 h-20 rounded-full flex items-center justify-center bg-[#7a2028]/[0.08] text-[#7a2028]"><Ic className="w-10 h-10" /></div>
      <p className="mt-3 font-serif-ge text-[28px] font-bold leading-tight text-[#7a2028]">{info.name}</p>
      <p className="mt-1 text-[14px] font-bold text-[#4a3426]">{p.trade ? `ხელობა: ${p.trade}` : 'ხელობას გაცნობაზე თვითონ მოიფიქრებ'}</p>
      <p className="mt-3 text-[14px] leading-relaxed text-[#4a3426]">{info.text}</p>
      {children ?? (isSpy(p.role) && <p className="mt-3 rounded-xl bg-[#7a2028]/[0.07] px-3 py-2 text-[13px] leading-snug text-[#7a2028]">სხვა ჯაშუშებს პირველ ღამეს გაიცნობ.</p>)}
    </div>
  );
};
