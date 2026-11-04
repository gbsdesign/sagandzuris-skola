import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Crown, Loader2, LogIn, LogOut, Play } from 'lucide-react';
import { roomPath, type Joined, type Me, type MyAct, type RoomDoc } from '../../../utils/gameRoom';
import { takhtiView, type TakhtiSnap, type TakhtiView } from '../../../utils/takhtiRoom';
import { takhtiRooms } from '../../../utils/gameRoomFirestore';
import { TableScreen } from '../../../components/games/TableScreen';
import { Btn, Toggle, askConfirm } from '../../../components/ui/kit';
import { dismissRoom } from '../../../components/games/GameInvites';
import { Hint } from '../samshvilde/parts';
import { CallBtn, CallCard, useGameCall, type GameCall } from '../samshvilde/online/GameCall';
import { People } from '../samshvilde/online/Lobby';
import { firstName } from '../samshvilde/online/bits';
import { useNow } from '../rounds/parts';
import { StepClock } from '../kari/Pads';
import { TakhtiPlay } from './Play';

// „ორი ტახტი“'s room on screen (full screen, over the games page): the lobby, the duel, the end. ✕ only hides it — the room goes
// on and the invitation strip leads back. Two play — the opener may be one of them („მეც ვთამაშობ“: their own join) or only
// hold the game; the opener's phone moves for whoever is late. The rest of the class may watch.

const TITLE = 'ორი ტახტი';
const CALL_HINT = 'ზარში ერთმანეთს ხედავთ და გესმით. ძღვენი, წილები და ორივე კარი ყველა ტელეფონზე ერთნაირად ჩანს.';

const Wait: React.FC<{ title: string; text: string; onClose: () => void; action?: { label: string; onClick: () => void }; spin?: boolean }> = ({ title, text, onClose, action, spin }) => (
  <TableScreen title={TITLE} onClose={onClose} footer={action && <Btn kind="ghost" size="lg" full onClick={action.onClick}>{action.label}</Btn>}>
    <div className="my-auto flex flex-col items-center text-center gap-2 py-10">
      {spin ? <Loader2 className="w-9 h-9 text-[#7a2028] animate-spin" /> : <Crown className="w-9 h-9 text-[#7a2028]" />}
      <p className="mt-2 font-serif-ge text-[22px] font-bold leading-tight text-[#4a3426]">{title}</p>
      <Hint className="max-w-xs">{text}</Hint>
    </div>
  </TableScreen>
);

const countLine = (n: number) => (n < 2 ? `კიდევ ${2 - n} — თამაშობს ორი` : n > 2 ? `ორზე მეტია: ${n - 2} ზედმეტი` : 'მზადაა: ორი ტახტი');

const Lobby: React.FC<{
  room: RoomDoc; joins: Joined[]; me: string; className: string; gc: GameCall; onHide: () => void;
  host?: { start: () => void; kick: (uid: string) => void; close: () => void; play: (v: boolean) => void };
  player?: { join: () => Promise<boolean>; leave: () => void };
}> = ({ room, joins, me, className, gc, onHide, host, player }) => {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const n = joins.length;
  const fits = n === 2;
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
      : <Btn size="lg" full disabled={busy || n >= 2} onClick={join} icon={<LogIn />} className="!h-14 !text-[16px]">{n >= 2 ? 'ორივე ადგილი დაკავებულია' : 'შესვლა'}</Btn>;
  return (
    <TableScreen title={className ? `ოთახი · ${className}` : 'ოთახი'} right={<CallBtn gc={gc} />} onClose={onHide} footer={footer}>
      <div className="py-2 space-y-4">
        <div className="rounded-3xl bg-gradient-to-br from-[#3b2a1c] to-[#2b1e14] text-[#fbf6ec] px-4 py-4 shadow-[0_14px_30px_-20px_rgba(43,30,20,0.9)]">
          <p className="text-[12px] font-bold text-[#e2c27a] flex items-center gap-1.5"><Crown className="w-4 h-4" />{TITLE}</p>
          {host ? (
            <>
              <p className="mt-1 font-serif-ge text-[19px] font-bold leading-snug">კლასს მოწვევა გაეგზავნა — ჩატში და ტელეფონზე.</p>
              <p className="mt-1.5 text-[13px] leading-snug text-[#fbf6ec]/85">შენი ტელეფონი თამაშს ითვლის: ბარათებს შლის, ორივე კარს ინახავს და ქულებს ითვლის; ვინც დააგვიანებს, მის ნაცვლად ფრთხილად ყოფს ან ირჩევს. თამაშობს ორი — შენც შეგიძლია.</p>
            </>
          ) : (
            <>
              <p className="mt-1 font-serif-ge text-[19px] font-bold leading-snug inline-flex items-center gap-2">
                {joined ? <><Check className="w-5 h-5 text-[#e2c27a]" />ოთახში ხარ</> : `${firstName(room.hostName)} გიწვევს თამაშში`}
              </p>
              <p className="mt-1.5 text-[13px] leading-snug text-[#fbf6ec]/85">შენს სვლაზე ძღვენს შენს ტელეფონზე ორ წილად ყოფ, ან წილს ირჩევ. ქულებს ტელეფონი ითვლის.</p>
            </>
          )}
        </div>
        {failed && !joined && <p className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 px-4 py-2.5 text-[13px] font-bold text-amber-800">ვერ შევედი. შეიძლება თამაში უკვე დაიწყო — სცადე თავიდან.</p>}
        {host && <Toggle on={joined} onChange={host.play} label="მეც ვთამაშობ" hint="გამორთე, თუ მხოლოდ უძღვები — მაშინ ორი სხვა თამაშობს და შენ უყურებ." />}
        <section className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[13.5px] font-bold text-[#4a3426]">მოთამაშეები · {n}</p>
            <p className={`text-[12.5px] font-bold tabular-nums text-right ${fits ? 'text-[#2f7d4f]' : 'text-[#9a6a10]'}`}>{countLine(n)}</p>
          </div>
          <People joins={joins} me={me} onKick={host?.kick} />
          {fits && <Hint>ვინ იქნება ქუთაისი, ვინ — თბილისი და ვინ გაყოფს პირველად, ტელეფონი წილისყრით წყვეტს.</Hint>}
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

/** a step's clock: the host's own; a player's from when the step reached this phone (the host's clock trusted for 4 s) */
const useClock = (v: TakhtiView, host: boolean) => {
  const seenAt = useRef({ key: '', start: 0 });
  if (seenAt.current.key !== v.key) {
    const at = Date.now();
    seenAt.current = { key: v.key, start: host ? v.t0 : at - Math.min(4000, Math.max(0, at - v.t0)) };
  }
  const ticking = v.secs > 0 && v.g.phase.k !== 'end';
  const now = useNow(ticking);
  return ticking ? <StepClock left={Math.max(0, v.secs - (now - seenAt.current.start) / 1000)} total={v.secs} /> : undefined;
};

const Game: React.FC<{
  v: TakhtiView; me: number; mine: MyAct | null; gc: GameCall; host?: { timeUp: (key: string) => void; again: () => void; close: () => void };
  onHide: () => void; onLeave: () => void; error: React.ReactNode;
}> = ({ v, me, mine, gc, host, onHide, onLeave, error }) => {
  const clock = useClock(v, !!host);
  const ph = v.g.phase.k;
  // the host's phone moves for whoever is late
  const timeUp = host?.timeUp;
  useEffect(() => {
    if (!timeUp || !v.secs || ph === 'end') return;
    const t = setTimeout(() => timeUp(v.key), Math.max(0, v.t0 + v.secs * 1000 - Date.now()) + 300);
    return () => clearTimeout(t);
  }, [timeUp, v.key, v.t0, v.secs, ph]);
  const sent = mine?.key === v.key && mine.pick !== null;
  const myTurn = ph !== 'end' && me >= 0 && v.g.turn === me;
  const watch = me < 0 && ph !== 'end' && (
    <p className="rounded-2xl bg-[#4a3426]/[0.06] px-3.5 py-2.5 text-[13px] font-bold leading-snug text-[#75685a]">ამ თამაშში არ ხარ — უყურებ.</p>
  );
  const closeBtn = host && ph !== 'end' && (
    <div className="flex justify-center -my-1">
      <button type="button" onClick={host.close} className="h-10 px-4 rounded-full text-[12.5px] font-bold text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer">ოთახის დახურვა</button>
    </div>
  );
  return (
    <>
      <TakhtiPlay
        g={v.g}
        me={me}
        sent={sent}
        clock={clock}
        right={<CallBtn gc={gc} />}
        note={(watch || closeBtn) ? <>{watch}{closeBtn}</> : undefined}
        acts={{
          pick: myTurn ? n => { void takhtiRooms.act(v.key, n); } : undefined,
          again: host?.again,
          close: host?.close,
          leave: host ? undefined : onLeave,
        }}
        onHide={onHide}
      />
      {error}
    </>
  );
};

export const TakhtiRoom: React.FC<{ snap: TakhtiSnap; who?: Me; className: string; onHide: () => void }> = ({ snap, who, className, onHide }) => {
  const room = snap.room;
  const me = who && who.uid === snap.me.uid ? who : snap.me;
  const gc = useGameCall(roomPath(snap.classId, snap.roomId), me, room?.host ?? '', TITLE);
  // the last table seen: a room closed at the end still shows it
  const last = useRef<{ view: TakhtiView; uids: string[] } | null>(null);
  if (room?.view) last.current = { view: room.view, uids: room.uids };
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setSlow(false);
    const t = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(t);
  }, [snap.roomId]);
  const host = !!room && room.host === snap.me.uid;
  const state = host ? snap.state : null;
  const hostView = useMemo(() => (state ? takhtiView(state) : null), [state]);

  const leave = () => { dismissRoom(snap.roomId); takhtiRooms.close(); onHide(); };
  const closeRoom = async () => {
    const over = room?.status === 'over';
    const ok = await askConfirm({
      title: 'ოთახი დაიხუროს?',
      text: over ? 'ოთახი წაიშლება. მოთამაშეებს ბოლო სურათი ეკრანზე დარჩებათ.' : 'ოთახი და თამაში წაიშლება ყველასთვის.',
      ok: 'დახურვა',
      danger: !over,
    });
    if (!ok) return;
    await takhtiRooms.host.close();
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
    if (lv && lv.view.g.phase.k === 'end') return <Game v={lv.view} me={lv.uids.indexOf(snap.me.uid)} mine={null} gc={gc} onHide={leave} onLeave={leave} error={null} />;
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
            start: () => { takhtiRooms.host.start({}); },
            kick: takhtiRooms.host.kick,
            close: () => { void closeRoom(); },
            play: v => { if (v && !joined) void takhtiRooms.join(me); else if (!v && joined) void takhtiRooms.leave(); },
          } : undefined}
          player={host ? undefined : { join: () => takhtiRooms.join(me), leave: () => { void takhtiRooms.leave().then(leave); } }}
        />
        {error}
      </>
    );
  }
  if (host) {
    if (!state || !hostView) {
      return <Wait spin title="თამაში იტვირთება…" text="შენი ტელეფონი თამაშს ითვლის — ერთი წამი." onClose={onHide} action={slow ? { label: 'ოთახის დახურვა', onClick: () => { void closeRoom(); } } : undefined} />;
    }
    const moves = { timeUp: takhtiRooms.host.timeUp, again: () => takhtiRooms.host.again(), close: () => { void closeRoom(); } };
    return <Game v={hostView} me={state.uids.indexOf(snap.me.uid)} mine={snap.mine} gc={gc} host={moves} onHide={onHide} onLeave={onHide} error={error} />;
  }
  if (!room.view) return <Wait spin title="თამაში იწყება…" text="ერთი წამი." onClose={onHide} />;
  return <Game v={room.view} me={room.uids.indexOf(snap.me.uid)} mine={snap.mine} gc={gc} onHide={onHide} onLeave={leave} error={error} />;
};
