import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Loader2, LogIn, LogOut, Play, Route } from 'lucide-react';
import { roomPath, type Joined, type Me, type MyAct, type RoomDoc } from '../../../utils/gameRoom';
import { qSeat, qView, type QSeat, type QView, type QaravaniSnap } from '../../../utils/qaravaniRoom';
import { MAX_Q, MIN_Q, cartsFor } from '../../../utils/qaravani';
import { qaravaniRooms } from '../../../utils/gameRoomFirestore';
import { TableScreen } from '../../../components/games/TableScreen';
import { Btn, Toggle, askConfirm } from '../../../components/ui/kit';
import { dismissRoom } from '../../../components/games/GameInvites';
import { Hint } from '../samshvilde/parts';
import { CallBtn, CallCard, useGameCall, type GameCall } from '../samshvilde/online/GameCall';
import { People } from '../samshvilde/online/Lobby';
import { firstName } from '../samshvilde/online/bits';
import { useNow } from '../rounds/parts';
import { StepClock } from '../kari/Pads';
import { QaravaniPlay } from './Play';

// „ქარავანი“'s room on screen (full screen, over the games page): the lobby, the map, the end. ✕ only hides it — the room goes on
// and the invitation strip leads back. The opener may play too („მეც ვთამაშობ“: their own join). Every step has its clock and
// the host's phone moves for the late one (two cards from the deck, the cheapest letters, the mountain given up). A room closed
// at the end leaves its players the last map they saw.

const TITLE = 'ქარავანი';
const CALL_HINT = 'ზარში ერთმანეთს ხედავთ და გესმით. ბარათები და წერილები მხოლოდ შენს ტელეფონზე ჩანს.';

const Wait: React.FC<{ title: string; text: string; onClose: () => void; action?: { label: string; onClick: () => void }; spin?: boolean }> = ({ title, text, onClose, action, spin }) => (
  <TableScreen title={TITLE} onClose={onClose} footer={action && <Btn kind="ghost" size="lg" full onClick={action.onClick}>{action.label}</Btn>}>
    <div className="my-auto flex flex-col items-center text-center gap-2 py-10">
      {spin ? <Loader2 className="w-9 h-9 text-[#7a2028] animate-spin" /> : <Route className="w-9 h-9 text-[#7a2028]" />}
      <p className="mt-2 font-serif-ge text-[22px] font-bold leading-tight text-[#4a3426]">{title}</p>
      <Hint className="max-w-xs">{text}</Hint>
    </div>
  </TableScreen>
);

const countLine = (n: number) => (n < MIN_Q ? `კიდევ ${MIN_Q - n} — საჭიროა ${MIN_Q}–${MAX_Q} მოთამაშე`
  : n > MAX_Q ? `${MAX_Q}-ზე მეტია: ${n - MAX_Q} ზედმეტი` : `მზადაა: ${n} ქარავანი`);

const Lobby: React.FC<{
  room: RoomDoc; joins: Joined[]; me: string; className: string; gc: GameCall; onHide: () => void;
  host?: { start: () => void; kick: (uid: string) => void; close: () => void; play: (v: boolean) => void };
  player?: { join: () => Promise<boolean>; leave: () => void };
}> = ({ room, joins, me, className, gc, onHide, host, player }) => {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const n = joins.length;
  const fits = n >= MIN_Q && n <= MAX_Q;
  const joined = joins.some(j => j.uid === me);
  const join = async () => {
    if (!player || busy) return;
    setBusy(true);
    setFailed(!(await player.join()));
    setBusy(false);
  };
  const footer = host
    ? <Btn size="lg" full disabled={!fits} onClick={host.start} icon={<Play />} className="!h-14 !text-[16px]">თამაშის დაწყება</Btn>
    : joined
      ? <Btn kind="ghost" size="lg" full onClick={player?.leave} icon={<LogOut />} className="!h-14 !text-[16px]">ოთახიდან გასვლა</Btn>
      : <Btn size="lg" full disabled={busy || n >= MAX_Q} onClick={join} icon={<LogIn />} className="!h-14 !text-[16px]">{n >= MAX_Q ? 'ადგილი აღარ არის' : 'შესვლა'}</Btn>;
  return (
    <TableScreen title={className ? `ოთახი · ${className}` : 'ოთახი'} right={<CallBtn gc={gc} />} onClose={onHide} footer={footer}>
      <div className="py-2 space-y-4">
        <div className="rounded-3xl bg-gradient-to-br from-[#3b2a1c] to-[#2b1e14] text-[#fbf6ec] px-4 py-4 shadow-[0_14px_30px_-20px_rgba(43,30,20,0.9)]">
          <p className="text-[12px] font-bold text-[#e2c27a] flex items-center gap-1.5"><Route className="w-4 h-4" />{TITLE}</p>
          {host ? (
            <>
              <p className="mt-1 font-serif-ge text-[19px] font-bold leading-snug">კლასს მოწვევა გაეგზავნა — ჩატში და ტელეფონზე.</p>
              <p className="mt-1.5 text-[13px] leading-snug text-[#fbf6ec]/85">შენი ტელეფონი თამაშს ითვლის: დასტას ურევს და ვინც დააგვიანებს, მის ნაცვლად ორ ბარათს იღებს. შენც შეგიძლია ითამაშო — ბარათებს და წერილებს მხოლოდ შენსას დაინახავ.</p>
            </>
          ) : (
            <>
              <p className="mt-1 font-serif-ge text-[19px] font-bold leading-snug inline-flex items-center gap-2">
                {joined ? <><Check className="w-5 h-5 text-[#e2c27a]" />ოთახში ხარ</> : `${firstName(room.hostName)} გიწვევს თამაშში`}
              </p>
              <p className="mt-1.5 text-[13px] leading-snug text-[#fbf6ec]/85">ბარათებს და წერილებს შენს ტელეფონზე ნახავ, გზებს რუკაზე თავად დაიკავებ. სვლას თავისი დრო აქვს.</p>
            </>
          )}
        </div>
        {failed && !joined && <p className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 px-4 py-2.5 text-[13px] font-bold text-amber-800">ვერ შევედი. შეიძლება თამაში უკვე დაიწყო — სცადე თავიდან.</p>}
        {host && <Toggle on={joined} onChange={host.play} label="მეც ვთამაშობ" hint="გამორთე, თუ მხოლოდ უძღვები — მაშინ რუკას ყველა ბარათის გარეშე უყურებ." />}
        <section className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[13.5px] font-bold text-[#4a3426]">მოთამაშეები · {n}</p>
            <p className={`text-[12.5px] font-bold tabular-nums text-right ${fits ? 'text-[#2f7d4f]' : 'text-[#9a6a10]'}`}>{countLine(n)}</p>
          </div>
          <People joins={joins} me={me} onKick={host?.kick} />
          {fits && <Hint>თითოს {cartsFor(n)} ურემი, 3 ქარვასლა, 4 ბარათი და 4 წერილი — მათგან 2 მაინც უნდა დაიტოვოს.{n <= 3 ? ' 2–3 მოთამაშით ორმაგი გზის მხოლოდ ერთი ზოლი გამოიყენება.' : ''}</Hint>}
        </section>
        <CallCard gc={gc} hint={CALL_HINT} />
        {host && (
          <div className="flex justify-center">
            <button type="button" onClick={host.close} className="h-11 px-4 rounded-full text-[13px] font-bold text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer">ოთახის დახურვა</button>
          </div>
        )}
        {!host && <Hint className="text-center">სანამ თამაში დაიწყება, ოთახიდან გასვლა შეგიძლია.</Hint>}
      </div>
    </TableScreen>
  );
};

interface Host { timeUp: (key: string) => void; again: () => void; close: () => void }

/** the game in the room: the step's clock (the host's own; a player's from when the step reached this phone, the host's clock
 *  trusted for 4 s) and the host's phone answering for the late one */
const Game: React.FC<{
  v: QView; seat: QSeat | null; me: number; mine: MyAct | null; gc: GameCall; host?: Host;
  onAct: (pick: number) => void; onHide: () => void; onLeave: () => void;
}> = ({ v, seat, me, mine, gc, host, onAct, onHide, onLeave }) => {
  const seen = useRef({ key: '', start: 0 });
  if (seen.current.key !== v.key) {
    const at = Date.now();
    seen.current = { key: v.key, start: host ? v.t0 : at - Math.min(4000, Math.max(0, at - v.t0)) };
  }
  const over = v.phase.k === 'end';
  const ticking = v.secs > 0 && !over;
  const now = useNow(ticking);
  const left = ticking ? Math.max(0, v.secs - (now - seen.current.start) / 1000) : 0;
  const timeUp = host?.timeUp;
  useEffect(() => {
    if (!timeUp || !v.secs || over) return;
    const t = setTimeout(() => timeUp(v.key), Math.max(0, v.t0 + v.secs * 1000 - Date.now()) + 300);
    return () => clearTimeout(t);
  }, [timeUp, v.key, v.t0, v.secs, over]);
  const sent = mine?.key === v.key && mine.pick !== null;
  // the clock shows for the one the game waits on (at the deal: everyone still choosing)
  const waitsOnMe = v.waiting.includes(me);
  const note = me < 0 && !over ? (
    <p className="rounded-2xl bg-[#4a3426]/[0.06] px-3.5 py-2.5 text-[13px] font-bold leading-snug text-[#75685a]">ამ თამაშში არ ხარ — უყურებ.</p>
  ) : null;
  return (
    <QaravaniPlay
      v={v}
      seat={seat}
      me={me}
      sent={sent}
      clock={ticking && (waitsOnMe || me < 0 || v.phase.k !== 'start') ? <StepClock left={left} total={v.secs} /> : undefined}
      acts={over ? (host ? { again: host.again, close: host.close } : { leave: onLeave }) : me >= 0 ? { pick: onAct } : {}}
      right={<CallBtn gc={gc} />}
      note={note}
      onHide={onHide}
    />
  );
};

export const QaravaniRoom: React.FC<{ snap: QaravaniSnap; who?: Me; className: string; onHide: () => void }> = ({ snap, who, className, onHide }) => {
  const room = snap.room;
  const me = who && who.uid === snap.me.uid ? who : snap.me;
  const gc = useGameCall(roomPath(snap.classId, snap.roomId), me, room?.host ?? '', TITLE);
  // the last map seen: a room closed at the end still shows it
  const last = useRef<{ view: QView; uids: string[]; seat: QSeat | null } | null>(null);
  if (room?.view) last.current = { view: room.view, uids: room.uids, seat: snap.seat };
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setSlow(false);
    const t = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(t);
  }, [snap.roomId]);
  const host = !!room && room.host === snap.me.uid;
  const state = host ? snap.state : null;
  const hostView = useMemo(() => (state ? qView(state) : null), [state]);

  const leave = () => { dismissRoom(snap.roomId); qaravaniRooms.close(); onHide(); };
  const closeRoom = async () => {
    const done = room?.status === 'over';
    const ok = await askConfirm({
      title: 'ოთახი დაიხუროს?',
      text: done ? 'ოთახი წაიშლება. მოთამაშეებს ბოლო რუკა ეკრანზე დარჩებათ.' : 'ოთახი და თამაში წაიშლება ყველასთვის.',
      ok: 'დახურვა',
      danger: !done,
    });
    if (!ok) return;
    await qaravaniRooms.host.close();
    onHide();
  };
  const error = snap.error && (
    <p className="fixed z-[80] left-1/2 -translate-x-1/2 bottom-[calc(env(safe-area-inset-bottom)+92px)] w-[min(420px,calc(100%-32px))] rounded-2xl bg-[#b3261e] px-4 py-2.5 text-center text-[13px] font-bold text-white shadow-lg" role="alert">
      {snap.error}
    </p>
  );

  if (room === undefined) {
    return <Wait spin title="ოთახი იხსნება…" text="ერთი წამი." onClose={onHide} action={slow ? { label: 'დახურვა', onClick: leave } : undefined} />;
  }
  if (room === null) {
    const lv = last.current;
    if (lv && lv.view.phase.k === 'end') {
      return <Game v={lv.view} seat={lv.seat} me={lv.uids.indexOf(snap.me.uid)} mine={null} gc={gc} onAct={() => {}} onHide={leave} onLeave={leave} />;
    }
    return <Wait title="ოთახი დაიხურა" text="მასპინძელმა ოთახი დახურა, ან თამაში აღარ არსებობს." onClose={leave} action={{ label: 'დახურვა', onClick: leave }} />;
  }
  if (room.status === 'lobby') {
    const joined = snap.joins.some(j => j.uid === snap.me.uid);
    return (
      <>
        <Lobby
          room={room}
          joins={snap.joins}
          me={snap.me.uid}
          className={className}
          gc={gc}
          onHide={onHide}
          host={host ? {
            start: () => { qaravaniRooms.host.start({}); },
            kick: qaravaniRooms.host.kick,
            close: () => { void closeRoom(); },
            play: v => { if (v && !joined) void qaravaniRooms.join(me); else if (!v && joined) void qaravaniRooms.leave(); },
          } : undefined}
          player={host ? undefined : { join: () => qaravaniRooms.join(me), leave: () => { void qaravaniRooms.leave().then(leave); } }}
        />
        {error}
      </>
    );
  }
  if (host) {
    if (!state || !hostView) {
      return <Wait spin title="თამაში იტვირთება…" text="შენი ტელეფონი თამაშს ითვლის — ერთი წამი." onClose={onHide} action={slow ? { label: 'ოთახის დახურვა', onClick: () => { void closeRoom(); } } : undefined} />;
    }
    const i = state.uids.indexOf(snap.me.uid);
    const moves: Host = { timeUp: qaravaniRooms.host.timeUp, again: () => qaravaniRooms.host.again(), close: () => { void closeRoom(); } };
    return (
      <>
        <Game v={hostView} seat={i >= 0 ? qSeat(state, i) : null} me={i} mine={snap.mine} gc={gc} host={moves} onAct={p => qaravaniRooms.act(hostView.key, p)} onHide={onHide} onLeave={onHide} />
        {error}
      </>
    );
  }
  if (!room.view) return <Wait spin title="თამაში იწყება…" text="ერთი წამი." onClose={onHide} />;
  const view = room.view;
  return (
    <>
      <Game v={view} seat={snap.seat} me={room.uids.indexOf(snap.me.uid)} mine={snap.mine} gc={gc} onAct={p => qaravaniRooms.act(view.key, p)} onHide={onHide} onLeave={leave} />
      {error}
    </>
  );
};
