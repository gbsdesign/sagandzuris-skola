import React, { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, LogOut, RotateCcw, Send } from 'lucide-react';
import { ACTS, ROLES, type Role } from '../../../utils/mepisKari';
import { DOUBT, PASS, actPick, blockPick, type KariSeat, type KariView } from '../../../utils/kariRoom';
import type { MyAct } from '../../../utils/gameRoom';
import { TableScreen } from '../../../components/games/TableScreen';
import { Btn } from '../../../components/ui/kit';
import { triggerHaptic } from '../../../utils/haptics';
import { CallBtn, type GameCall } from '../samshvilde/online/GameCall';
import { useNow } from '../rounds/parts';
import { Court, Story, type Board } from './Court';
import { ActionPad, StepClock, useHideCards } from './Pads';
import { Chronicle, CoinCount, ROLE_LOOK, RoleCard } from './look';

// A phone in „მეფის კარი“'s room (pages/games/kari/): the story of the step, the court, my own two cards (kept face down on
// screen if I like) and what I may do now — my turn's action and its target, „არ მჯერა!“ or „ვენდობი“, a block, the card I
// turn, the cards I keep. The room's opener plays on the same screen (their phone also answers for whoever is late, and
// may start the court again at the end). One who is out, or not in the game, watches.

export interface KariHost { timeUp: (key: string) => void; again: () => void; close: () => void }

/** the target chips of an action: the living others, with their coins */
const Targets: React.FC<{ v: KariView; me: number; chosen: number; onChoose: (i: number) => void }> = ({ v, me, chosen, onChoose }) => (
  <div className="space-y-1.5">
    <p className="text-[13px] font-bold text-[#4a3426]">ვის?</p>
    <div className="flex flex-wrap gap-2">
      {v.names.map((n, i) => (i === me || !v.cards[i] ? null : (
        <button
          key={i}
          type="button"
          onClick={() => { triggerHaptic(5); onChoose(i); }}
          aria-pressed={chosen === i}
          className={`inline-flex items-center gap-2 min-h-11 pl-3.5 pr-2 rounded-full text-[14px] font-bold ring-1 transition cursor-pointer active:scale-[0.97] ${chosen === i ? 'bg-[#7a2028] text-[#fbf6ec] ring-[#7a2028]' : 'bg-white text-[#4a3426] ring-[#e8dcc8] hover:ring-[#7a2028]/40'}`}
        >
          <span className="[overflow-wrap:anywhere]">{n}</span>
          <span className={`rounded-full px-2 py-0.5 text-[12px] tabular-nums ${chosen === i ? 'bg-white/15' : 'bg-[#e2c27a]/25 text-[#6b4a1f]'}`}>{v.coins[i]}</span>
        </button>
      )))}
    </div>
  </div>
);

export const KariPlay: React.FC<{
  v: KariView; seat: KariSeat | null; me: number; mine: MyAct | null; gc: GameCall; host?: KariHost;
  onAct: (pick: number) => void; onHide: () => void; onLeave: () => void;
}> = ({ v, seat, me, mine, gc, host, onAct, onHide, onLeave }) => {
  const ph = v.phase;
  const alive = me >= 0 && v.cards[me] > 0;
  const sent = mine?.key === v.key && mine.pick !== null;
  const [act, setAct] = useState(-1);
  const [target, setTarget] = useState(-1);
  const [picked, setPicked] = useState<number[]>([]);
  const [all, setAll] = useState(false);
  const cards = useHideCards();
  useEffect(() => { setAct(-1); setTarget(-1); setPicked([]); }, [v.key]);

  // the step's clock: the host's own; a player's from when the step reached this phone (the host's clock trusted for 4 s)
  const seen = useRef({ key: '', start: 0 });
  if (seen.current.key !== v.key) {
    const at = Date.now();
    seen.current = { key: v.key, start: host ? v.t0 : at - Math.min(4000, Math.max(0, at - v.t0)) };
  }
  const ticking = v.secs > 0 && ph.k !== 'end';
  const now = useNow(ticking);
  const left = ticking ? Math.max(0, v.secs - (now - seen.current.start) / 1000) : 0;
  // the host's phone answers for whoever is late
  const timeUp = host?.timeUp;
  useEffect(() => {
    if (!timeUp || !v.secs || ph.k === 'end') return;
    const t = setTimeout(() => timeUp(v.key), Math.max(0, v.t0 + v.secs * 1000 - Date.now()) + 300);
    return () => clearTimeout(t);
  }, [timeUp, v.key, v.t0, v.secs, ph.k]);

  const send = (pick: number) => { triggerHaptic(15); onAct(pick); };
  const myTurn = ph.k === 'turn' && v.turn === me && alive;
  const answering = (ph.k === 'doubt' || ph.k === 'block') && v.waiting.includes(me) && !sent;
  const losing = ph.k === 'lose' && ph.who === me && !sent;
  const swapping = ph.k === 'swap' && v.turn === me && !sent && !!seat?.drawn.length;
  const hand = seat?.hand ?? [];
  const pool: Role[] = swapping ? [...hand, ...(seat?.drawn ?? [])] : hand;
  const need = hand.length;
  const b: Board = v;

  const choose = (a: number) => { setAct(a); setTarget(-1); };
  const needTarget = act >= 0 && ACTS[act].target;
  const ready = act >= 0 && (!needTarget || target >= 0);
  const togglePick = (k: number) => {
    triggerHaptic(5);
    if (losing) { setPicked([k]); return; }
    setPicked(p => (p.includes(k) ? p.filter(x => x !== k) : p.length >= need ? [...p.slice(1), k] : [...p, k]));
  };

  let footer: React.ReactNode = null;
  if (ph.k === 'end') {
    footer = host ? (
      <div className="grid grid-cols-2 gap-2">
        <Btn kind="ghost" size="lg" onClick={host.close} className="!h-14 !px-3 whitespace-nowrap">ოთახის დახურვა</Btn>
        <Btn size="lg" onClick={host.again} icon={<RotateCcw />} className="!h-14 !px-3 whitespace-nowrap">კიდევ ერთხელ</Btn>
      </div>
    ) : <Btn kind="ghost" size="lg" full onClick={onLeave} icon={<LogOut />} className="!h-14">დახურვა</Btn>;
  } else if (myTurn && !sent) {
    footer = (
      <div className="space-y-2">
        {act >= 0 && (
          <p className="text-center text-[13.5px] leading-snug text-[#4a3426]">
            <b>{ACTS[act].name}</b>{target >= 0 ? <> → <b>{v.names[target]}</b></> : needTarget ? ' — აირჩიე, ვის' : ''}
          </p>
        )}
        <Btn size="lg" full disabled={!ready} onClick={() => send(actPick(act, needTarget ? target : -1))} icon={<Send />} className="!h-14 !text-[16px]">
          {act < 0 ? 'აირჩიე მოქმედება' : 'გამოცხადება'}
        </Btn>
      </div>
    );
  } else if (answering && ph.k === 'doubt') {
    footer = (
      <div className="grid grid-cols-2 gap-2">
        <Btn kind="ghost" size="lg" onClick={() => send(PASS)} className="!h-14 !text-[16px]">ვენდობი</Btn>
        <Btn size="lg" onClick={() => send(DOUBT)} className="!h-14 !text-[16px]">არ მჯერა!</Btn>
      </div>
    );
  } else if (answering && ph.k === 'block' && v.claim) {
    const roles = ACTS[v.claim.act].blockers;
    footer = (
      <div className="space-y-2 [@media(max-height:500px)]:flex [@media(max-height:500px)]:gap-2 [@media(max-height:500px)]:space-y-0">
        <p className="text-center text-[13px] font-bold text-[#75685a] [@media(max-height:500px)]:hidden">დაბლოკე, როგორც:</p>
        <div className={`grid gap-2 ${roles.length > 1 ? 'grid-cols-2 [@media(max-height:500px)]:flex-[2]' : 'grid-cols-1 [@media(max-height:500px)]:flex-1'}`}>
          {roles.map(r => {
            const look = ROLE_LOOK[r];
            return (
              <button key={r} type="button" onClick={() => send(blockPick(r))} className="min-h-14 rounded-full px-3 inline-flex items-center justify-center gap-2 text-[15px] font-bold text-white cursor-pointer active:scale-[0.98] transition" style={{ background: look.color }}>
                <look.Icon className="w-5 h-5 shrink-0" />{ROLES[r].name}{hand.includes(r) && <span className="text-[12px] font-bold opacity-85">· გყავს</span>}
              </button>
            );
          })}
        </div>
        <Btn kind="ghost" size="lg" full onClick={() => send(PASS)} className="!h-12 [@media(max-height:500px)]:!h-14 [@media(max-height:500px)]:!w-auto [@media(max-height:500px)]:flex-1">არ ვბლოკავ</Btn>
      </div>
    );
  } else if (losing) {
    footer = <Btn size="lg" full disabled={picked.length !== 1} onClick={() => send(picked[0])} className="!h-14 !text-[16px]">{picked.length ? 'ბარათის გადაბრუნება' : 'აირჩიე ბარათი'}</Btn>;
  } else if (swapping) {
    const mask = picked.reduce((m, k) => m | (1 << k), 0);
    footer = <Btn size="lg" full disabled={picked.length !== need} onClick={() => send(mask)} className="!h-14 !text-[16px]">დატოვება · {picked.length}/{need}</Btn>;
  } else if (sent && ph.k !== 'turn') {
    footer = <p className="text-center text-[13px] font-bold text-[#75685a]">გაგზავნილია — ელოდება სხვებს</p>;
  }

  const story = <Story b={b} me={me} clock={ticking ? <StepClock left={left} total={v.secs} /> : undefined} />;
  const mineCards = seat && me >= 0 && (alive || v.shown[me].length > 0) && (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13.5px] font-bold text-[#4a3426] flex items-center gap-2">
          {swapping ? `დაიტოვე ${need}` : losing ? 'რომელს გადააბრუნებ?' : 'შენი ბარათები'}
          {alive && <CoinCount n={v.coins[me]} />}
        </p>
        {alive && !swapping && !losing && (
          <button type="button" onClick={() => { triggerHaptic(5); cards.toggle(); }} className="h-9 px-2.5 rounded-full inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer">
            {cards.hide ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}{cards.hide ? 'ჩანდეს' : 'დამალვა'}
          </button>
        )}
      </div>
      <div className={`grid grid-cols-2 gap-2 ${pool.length + v.shown[me].length > 2 ? 'sm:grid-cols-4' : ''}`}>
        {pool.map((r, k) => (
          <RoleCard
            key={`${v.key}-${k}`}
            role={r}
            hidden={cards.hidden && !swapping && !losing}
            picked={(swapping || losing) && picked.includes(k)}
            label={swapping && k >= hand.length ? 'ახალი' : undefined}
            onClick={swapping || losing ? () => togglePick(k) : cards.hidden ? cards.peek : undefined}
          />
        ))}
        {v.shown[me].map((r, k) => <RoleCard key={`s${k}`} role={r} lost />)}
      </div>
    </section>
  );
  const watch = (me < 0 || !alive) && ph.k !== 'end' && (
    <p className="rounded-2xl bg-[#4a3426]/[0.06] px-3.5 py-2.5 text-[13px] font-bold leading-snug text-[#75685a]">
      {me < 0 ? 'ამ თამაშში არ ხარ — უყურებ.' : 'კარი დატოვე — თამაშს ბოლომდე უყურებ.'}
    </p>
  );
  const finale = ph.k === 'end' && v.hands && (
    <section className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3.5 py-3 space-y-1.5">
      <p className="text-[13px] font-bold text-[#4a3426]">ვის რა ჰყავდა</p>
      <ul className="space-y-1">
        {v.names.map((n, i) => (
          <li key={i} className="flex flex-wrap items-center gap-1.5 text-[13px] leading-snug text-[#4a3426]">
            <b className="mr-0.5">{n}</b>
            {(v.hands![i] ?? []).map((r, k) => {
              const look = ROLE_LOOK[r];
              const lost = k < v.shown[i].length;
              return <span key={k} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-bold ${lost ? 'line-through opacity-60' : ''}`} style={{ background: look.soft, color: look.color }}><look.Icon className="w-3.5 h-3.5" />{ROLES[r].name}</span>;
            })}
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <TableScreen title="მეფის კარი" right={<CallBtn gc={gc} />} onClose={onHide} footer={footer}>
      <div className="py-2 space-y-3.5">
        {story}
        {watch}
        {myTurn && !sent && (
          <>
            <ActionPad coins={v.coins[me]} held={hand} chosen={act} onChoose={choose} />
            {needTarget && <Targets v={v} me={me} chosen={target} onChoose={setTarget} />}
          </>
        )}
        {(swapping || losing) && mineCards}
        <Court b={b} me={me} />
        {!(swapping || losing) && mineCards}
        {finale}
        <Chronicle log={v.log} names={v.names} n={v.n} all={all} onAll={() => setAll(a => !a)} />
        {host && ph.k !== 'end' && (
          <div className="flex justify-center">
            <button type="button" onClick={host.close} className="h-11 px-4 rounded-full text-[13px] font-bold text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer">ოთახის დახურვა</button>
          </div>
        )}
      </div>
    </TableScreen>
  );
};
