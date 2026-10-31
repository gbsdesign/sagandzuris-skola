import React, { useEffect, useRef, useState } from 'react';
import { roomPath, type Me } from '../../../../utils/gameRoom';
import type { SamSnap } from '../../../../utils/samshvildeRoom';
import { rooms } from '../../../../utils/gameRoomFirestore';
import type { PubView } from '../../../../utils/samshvildeOnline';
import { closeAudio } from '../../../../utils/gameSounds';
import { askConfirm } from '../../../../components/ui/kit';
import { dismissRoom } from '../../../../components/games/GameInvites';
import { EndScreen } from '../EndScreen';
import { useGameCall } from './GameCall';
import { Lobby, type LobbyOpts } from './Lobby';
import { HostGame } from './HostGame';
import { PlayerGame } from './PlayerGame';
import { Waiting } from './bits';

// The online room on screen (full screen, over the games page): the lobby, then the host's or the player's game, the end.
// ✕ only hides it — the room goes on and the invitation strip leads back. A room closed by its host leaves its players the
// chronicle they were looking at. `who` is me as my class's list names me (it may come after the room was opened).

export const OnlineRoom: React.FC<{ snap: SamSnap; who?: Me; className: string; opts: LobbyOpts; setOpts: (o: LobbyOpts) => void; onHide: () => void }> = ({
  snap, who, className, opts, setOpts, onHide,
}) => {
  const audio = useRef<AudioContext | null>(null);
  useEffect(() => () => closeAudio(audio), []);
  const room = snap.room;
  const me = who && who.uid === snap.me.uid ? who : snap.me;
  const gc = useGameCall(roomPath(snap.classId, snap.roomId), me, room?.host ?? '');
  // the last view seen: a room closed at the end still shows its chronicle
  const last = useRef<{ view: PubView; uids: string[] } | null>(null);
  if (room?.view) last.current = { view: room.view, uids: room.uids };
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setSlow(false);
    const t = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(t);
  }, [snap.roomId]);

  /** out of the room on this phone (the room itself stays) */
  const leave = () => { dismissRoom(snap.roomId); rooms.close(); onHide(); };
  const closeRoom = async () => {
    const over = room?.status === 'over';
    const ok = await askConfirm({
      title: 'ოთახი დაიხუროს?',
      text: over ? 'ოთახი წაიშლება. მოთამაშეებს მატიანე ეკრანზე დარჩებათ.' : 'ოთახი და თამაში წაიშლება ყველასთვის.',
      ok: 'დახურვა',
      danger: !over,
    });
    if (!ok) return;
    await rooms.host.close();
    onHide();
  };

  const error = snap.error && (
    <p className="fixed z-[80] left-1/2 -translate-x-1/2 bottom-[calc(env(safe-area-inset-bottom)+92px)] w-[min(420px,calc(100%-32px))] rounded-2xl bg-[#b3261e] px-4 py-2.5 text-center text-[13px] font-bold text-white shadow-lg" role="alert">
      {snap.error}
    </p>
  );

  if (room === undefined) {
    return <Waiting spin title="ოთახი იხსნება…" text="ერთი წამი." onClose={onHide} action={slow ? { label: 'დახურვა', onClick: leave } : undefined} />;
  }
  if (room === null) {
    const final = last.current?.view.final;
    if (final) {
      return (
        <EndScreen
          g={final}
          me={last.current!.uids.indexOf(snap.me.uid)}
          onClose={leave}
          closeLabel="დახურვა"
          note={<p className="rounded-2xl bg-[#4a3426]/[0.06] px-4 py-2.5 text-[13px] font-bold text-[#75685a]">მემატიანემ ოთახი დახურა — მატიანე შენთან რჩება, სანამ ამ ეკრანს დახურავ.</p>}
        />
      );
    }
    return <Waiting title="ოთახი დაიხურა" text="მემატიანემ ოთახი დახურა, ან თამაში აღარ არსებობს." onClose={leave} action={{ label: 'დახურვა', onClick: leave }} />;
  }

  const host = room.host === snap.me.uid;
  if (room.status === 'lobby') {
    return (
      <>
        <Lobby
          room={room}
          joins={snap.joins}
          me={snap.me.uid}
          className={className}
          gc={gc}
          error=""
          onHide={onHide}
          host={host ? {
            opts, setOpts,
            start: () => { rooms.host.start(opts); },
            kick: rooms.host.kick,
            close: () => { void closeRoom(); },
          } : undefined}
          player={host ? undefined : { join: () => rooms.join(me), leave: () => { void rooms.leave().then(leave); } }}
        />
        {error}
      </>
    );
  }
  if (host) {
    if (!snap.state) {
      return <Waiting spin title="თამაში იტვირთება…" text="შენი ტელეფონი თამაშს უძღვება — ერთი წამი." onClose={onHide} action={slow ? { label: 'ოთახის დახურვა', onClick: () => { void closeRoom(); } } : undefined} />;
    }
    return (
      <>
        <HostGame
          s={snap.state}
          canBack={snap.canBack}
          audio={audio}
          gc={gc}
          onHide={onHide}
          moves={{
            next: rooms.host.next, acts: rooms.host.acts, accuse: rooms.host.accuse, clock: rooms.host.clock, back: rooms.host.back, again: rooms.host.again,
            close: () => { void closeRoom(); },
          }}
        />
        {error}
      </>
    );
  }
  if (!room.view) return <Waiting spin title="თამაში იწყება…" text="ერთი წამი." onClose={onHide} />;
  return (
    <>
      <PlayerGame
        view={room.view}
        uids={room.uids}
        uid={snap.me.uid}
        seat={snap.seat}
        mine={snap.mine}
        gc={gc}
        audio={audio}
        onAct={(pick, end) => rooms.act(room.view!.key, pick, end)}
        onHide={onHide}
        onLeave={leave}
      />
      {error}
    </>
  );
};
