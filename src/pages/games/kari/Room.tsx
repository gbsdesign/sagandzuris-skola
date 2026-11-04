import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Landmark, Loader2, LogIn, LogOut, Play } from 'lucide-react';
import { roomPath, type Joined, type Me, type RoomDoc } from '../../../utils/gameRoom';
import { kariSeat, kariView, type KariSnap, type KariView } from '../../../utils/kariRoom';
import { MAX_KARI, MIN_KARI, deckSize } from '../../../utils/mepisKari';
import { kariRooms } from '../../../utils/gameRoomFirestore';
import { TableScreen } from '../../../components/games/TableScreen';
import { Btn, Toggle, askConfirm } from '../../../components/ui/kit';
import { dismissRoom } from '../../../components/games/GameInvites';
import { Hint } from '../samshvilde/parts';
import { CallBtn, CallCard, useGameCall, type GameCall } from '../samshvilde/online/GameCall';
import { People } from '../samshvilde/online/Lobby';
import { firstName } from '../samshvilde/online/bits';
import { KariPlay } from './Play';

// „მეფის კარი“'s room on screen (full screen, over the games page): the lobby, the court, the end. ✕ only hides it — the
// room goes on and the invitation strip leads back. The opener may play too („მეც ვთამაშობ“: their own join). A room
// closed at the end leaves its players the last court they saw.

const CALL_HINT = 'ზარში ერთმანეთს ხედავთ და გესმით — ბლეფს ხმაც სჭირდება. ბარათები მხოლოდ შენს ტელეფონზე ჩანს.';

const Wait: React.FC<{ title: string; text: string; onClose: () => void; action?: { label: string; onClick: () => void }; spin?: boolean }> = ({ title, text, onClose, action, spin }) => (
  <TableScreen title="მეფის კარი" onClose={onClose} footer={action && <Btn kind="ghost" size="lg" full onClick={action.onClick}>{action.label}</Btn>}>
    <div className="my-auto flex flex-col items-center text-center gap-2 py-10">
      {spin ? <Loader2 className="w-9 h-9 text-[#7a2028] animate-spin" /> : <Landmark className="w-9 h-9 text-[#7a2028]" />}
      <p className="mt-2 font-serif-ge text-[22px] font-bold leading-tight text-[#4a3426]">{title}</p>
      <Hint className="max-w-xs">{text}</Hint>
    </div>
  </TableScreen>
);

const countLine = (n: number) => (n < MIN_KARI ? `კიდევ ${MIN_KARI - n} — საჭიროა ${MIN_KARI}–${MAX_KARI} მოთამაშე`
  : n > MAX_KARI ? `${MAX_KARI}-ზე მეტია: ${n - MAX_KARI} ზედმეტი` : `მზადაა: ${n} მოთამაშე`);

const KariLobby: React.FC<{
  room: RoomDoc; joins: Joined[]; me: string; className: string; gc: GameCall; onHide: () => void;
  host?: { start: () => void; kick: (uid: string) => void; close: () => void; play: (v: boolean) => void };
  player?: { join: () => Promise<boolean>; leave: () => void };
}> = ({ room, joins, me, className, gc, onHide, host, player }) => {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const n = joins.length;
  const fits = n >= MIN_KARI && n <= MAX_KARI;
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
      : <Btn size="lg" full disabled={busy} onClick={join} icon={<LogIn />} className="!h-14 !text-[16px]">შესვლა</Btn>;
  return (
    <TableScreen title={className ? `ოთახი · ${className}` : 'ოთახი'} right={<CallBtn gc={gc} />} onClose={onHide} footer={footer}>
      <div className="py-2 space-y-4">
        <div className="rounded-3xl bg-gradient-to-br from-[#7a2028] to-[#5e1820] text-[#fbf6ec] px-4 py-4 shadow-[0_14px_30px_-20px_rgba(122,32,40,0.9)]">
          <p className="text-[12px] font-bold text-[#f0d9a8] flex items-center gap-1.5"><Landmark className="w-4 h-4" />მეფის კარი</p>
          {host ? (
            <>
              <p className="mt-1 font-serif-ge text-[19px] font-bold leading-snug">კლასს მოწვევა გაეგზავნა — ჩატში და ტელეფონზე.</p>
              <p className="mt-1.5 text-[13px] leading-snug text-[#fbf6ec]/85">შენი ტელეფონი თამაშს ითვლის: დასტას ურევს და ვინც დააგვიანებს, მის ნაცვლად პასუხობს. შენც შეგიძლია ითამაშო — ბარათებს მხოლოდ შენსას დაინახავ.</p>
            </>
          ) : (
            <>
              <p className="mt-1 font-serif-ge text-[19px] font-bold leading-snug inline-flex items-center gap-2">
                {joined ? <><Check className="w-5 h-5 text-[#f0d9a8]" />ოთახში ხარ</> : `${firstName(room.hostName)} გიწვევს თამაშში`}
              </p>
              <p className="mt-1.5 text-[13px] leading-snug text-[#fbf6ec]/85">ორ ფარულ ბარათს შენს ტელეფონზე ნახავ. მოქმედებას, ბლოკს და „არ მჯერა!“-ს ტელეფონზე დააჭერ, ბლეფს კი ზარში ითამაშებ.</p>
            </>
          )}
        </div>
        {failed && !joined && <p className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 px-4 py-2.5 text-[13px] font-bold text-amber-800">ვერ შევედი. შეიძლება თამაში უკვე დაიწყო — სცადე თავიდან.</p>}
        {host && <Toggle on={joined} onChange={host.play} label="მეც ვთამაშობ" hint="გამორთე, თუ მხოლოდ უძღვები — მაშინ კარს ყველა ბარათის გარეშე უყურებ." />}
        <section className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[13.5px] font-bold text-[#4a3426]">მოთამაშეები · {n}</p>
            <p className={`text-[12.5px] font-bold tabular-nums text-right ${fits ? 'text-[#2f7d4f]' : 'text-[#9a6a10]'}`}>{countLine(n)}</p>
          </div>
          <People joins={joins} me={me} onKick={host?.kick} />
          {fits && <Hint>{n === 2 ? 'ორნი: დამწყებს 1 თეთრი აქვს, მეორეს — 2.' : `დასტაში ${deckSize(n)} ბარათია${n >= 7 ? ' — 7–8 მოთამაშეზე თითო კარისკაცი მეტია' : ''}. თითოს 2 ბარათი და 2 თეთრი.`}</Hint>}
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

export const KariRoom: React.FC<{ snap: KariSnap; who?: Me; className: string; onHide: () => void }> = ({ snap, who, className, onHide }) => {
  const room = snap.room;
  const me = who && who.uid === snap.me.uid ? who : snap.me;
  const gc = useGameCall(roomPath(snap.classId, snap.roomId), me, room?.host ?? '', 'მეფის კარი');
  // the last court seen: a room closed at the end still shows it
  const last = useRef<{ view: KariView; uids: string[] } | null>(null);
  if (room?.view) last.current = { view: room.view, uids: room.uids };
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setSlow(false);
    const t = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(t);
  }, [snap.roomId]);
  const host = !!room && room.host === snap.me.uid;
  const state = host ? snap.state : null;
  const hostView = useMemo(() => (state ? kariView(state) : null), [state]);

  const leave = () => { dismissRoom(snap.roomId); kariRooms.close(); onHide(); };
  const closeRoom = async () => {
    const over = room?.status === 'over';
    const ok = await askConfirm({
      title: 'ოთახი დაიხუროს?',
      text: over ? 'ოთახი წაიშლება. მოთამაშეებს ბოლო კარი ეკრანზე დარჩებათ.' : 'ოთახი და თამაში წაიშლება ყველასთვის.',
      ok: 'დახურვა',
      danger: !over,
    });
    if (!ok) return;
    await kariRooms.host.close();
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
      return <KariPlay v={lv.view} seat={null} me={lv.uids.indexOf(snap.me.uid)} mine={null} gc={gc} onAct={() => {}} onHide={leave} onLeave={leave} />;
    }
    return <Wait title="ოთახი დაიხურა" text="მასპინძელმა ოთახი დახურა, ან თამაში აღარ არსებობს." onClose={leave} action={{ label: 'დახურვა', onClick: leave }} />;
  }
  if (room.status === 'lobby') {
    const joined = snap.joins.some(j => j.uid === snap.me.uid);
    return (
      <>
        <KariLobby
          room={room}
          joins={snap.joins}
          me={snap.me.uid}
          className={className}
          gc={gc}
          onHide={onHide}
          host={host ? {
            start: () => { kariRooms.host.start({}); },
            kick: kariRooms.host.kick,
            close: () => { void closeRoom(); },
            play: v => { if (v && !joined) void kariRooms.join(me); else if (!v && joined) void kariRooms.leave(); },
          } : undefined}
          player={host ? undefined : { join: () => kariRooms.join(me), leave: () => { void kariRooms.leave().then(leave); } }}
        />
        {error}
      </>
    );
  }
  const moves = host ? { timeUp: kariRooms.host.timeUp, again: () => kariRooms.host.again(), close: () => { void closeRoom(); } } : undefined;
  if (host) {
    if (!state || !hostView) {
      return <Wait spin title="თამაში იტვირთება…" text="შენი ტელეფონი თამაშს ითვლის — ერთი წამი." onClose={onHide} action={slow ? { label: 'ოთახის დახურვა', onClick: () => { void closeRoom(); } } : undefined} />;
    }
    const i = state.uids.indexOf(snap.me.uid);
    return (
      <>
        <KariPlay v={hostView} seat={i >= 0 ? kariSeat(state, i) : null} me={i} mine={snap.mine} gc={gc} host={moves} onAct={p => kariRooms.act(hostView.key, p)} onHide={onHide} onLeave={onHide} />
        {error}
      </>
    );
  }
  if (!room.view) return <Wait spin title="თამაში იწყება…" text="ერთი წამი." onClose={onHide} />;
  const view = room.view;
  return (
    <>
      <KariPlay v={view} seat={snap.seat} me={room.uids.indexOf(snap.me.uid)} mine={snap.mine} gc={gc} onAct={p => kariRooms.act(view.key, p)} onHide={onHide} onLeave={leave} />
      {error}
    </>
  );
};
