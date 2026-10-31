import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { roomPath, type Me, type RoomSnap } from '../../../utils/gameRoom';
import { againRounds, type RoundsState, type RoundsView } from '../../../utils/roundGames';
import { roundRooms } from '../../../utils/gameRoomFirestore';
import { TableScreen } from '../../../components/games/TableScreen';
import { Btn, askConfirm } from '../../../components/ui/kit';
import { dismissRoom } from '../../../components/games/GameInvites';
import { Hint } from '../samshvilde/parts';
import { useGameCall } from '../samshvilde/online/GameCall';
import type { RoundFace } from './face';
import { RoundsLobby, type RoundsOpts } from './RoundsLobby';
import { RoundsHost } from './RoundsHost';
import { RoundsPlayer } from './RoundsPlayer';
import { Podium, Standings } from './parts';
import { useSnippet } from './useSnippet';

// A quick game's room on screen (full screen, over the games page): the lobby, then the host's or the player's game.
// ✕ only hides it — the room goes on and the invitation strip leads back. A room closed by its host leaves its players the
// results they were looking at.

export type RoundSnap = RoomSnap<RoundsState, RoundsView, never>;

const Waiting: React.FC<{ face: RoundFace; title: string; text: string; onClose: () => void; action?: { label: string; onClick: () => void }; spin?: boolean }> = ({
  face, title, text, onClose, action, spin,
}) => (
  <TableScreen title={face.title} onClose={onClose} footer={action && <Btn kind="ghost" size="lg" full onClick={action.onClick}>{action.label}</Btn>}>
    <div className="my-auto flex flex-col items-center text-center gap-2 py-10">
      {spin ? <Loader2 className="w-9 h-9 text-[#7a2028] animate-spin" /> : <face.Icon className="w-9 h-9 text-[#7a2028]" />}
      <p className="mt-2 font-serif-ge text-[22px] font-bold leading-tight text-[#4a3426]">{title}</p>
      <Hint className="max-w-xs">{text}</Hint>
    </div>
  </TableScreen>
);

export const RoundsRoom: React.FC<{
  snap: RoundSnap; face: RoundFace; who?: Me; className: string; program: readonly string[]; opts: RoundsOpts; setOpts: (o: RoundsOpts) => void;
  onHide: () => void;
}> = ({ snap, face, who, className, program, opts, setOpts, onHide }) => {
  const room = snap.room;
  const me = who && who.uid === snap.me.uid ? who : snap.me;
  const gc = useGameCall(roomPath(snap.classId, snap.roomId), me, room?.host ?? '', face.title);
  const snippet = useSnippet(face.clipSeconds);
  // the last view seen: a room closed at the end still shows its results
  const last = useRef<{ view: RoundsView; uids: string[] } | null>(null);
  if (room?.view) last.current = { view: room.view, uids: room.uids };
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setSlow(false);
    const t = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(t);
  }, [snap.roomId]);
  // nothing to play for this host (no recordings): known before the start
  const [empty, setEmpty] = useState(false);

  /** out of the room on this phone (the room itself stays) */
  const leave = () => { dismissRoom(snap.roomId); roundRooms.close(); onHide(); };
  const closeRoom = async () => {
    const over = room?.status === 'over';
    const ok = await askConfirm({
      title: 'ოთახი დაიხუროს?',
      text: over ? 'ოთახი წაიშლება. მოთამაშეებს შედეგები ეკრანზე დარჩებათ.' : 'ოთახი და თამაში წაიშლება ყველასთვის.',
      ok: 'დახურვა',
      danger: !over,
    });
    if (!ok) return;
    await roundRooms.host.close();
    onHide();
  };
  const start = () => {
    snippet.unlock();
    const rounds = face.draw(opts.count, program);
    if (!rounds.length) { setEmpty(true); return; }
    if (roundRooms.host.start({ game: face.game, rounds, sound: opts.sound })) face.remember(rounds);
  };
  const again = () => {
    const s = snap.state;
    if (!s) return;
    const rounds = face.draw(s.rounds.length, program);
    const next = rounds.length ? againRounds(s, rounds) : null;
    if (!next) { setEmpty(true); return; }
    face.remember(rounds);
    roundRooms.host.again(next);
  };

  const error = snap.error && (
    <p className="fixed z-[80] left-1/2 -translate-x-1/2 bottom-[calc(env(safe-area-inset-bottom)+92px)] w-[min(420px,calc(100%-32px))] rounded-2xl bg-[#b3261e] px-4 py-2.5 text-center text-[13px] font-bold text-white shadow-lg" role="alert">
      {snap.error}
    </p>
  );

  if (room === undefined) {
    return <Waiting face={face} spin title="ოთახი იხსნება…" text="ერთი წამი." onClose={onHide} action={slow ? { label: 'დახურვა', onClick: leave } : undefined} />;
  }
  if (room === null) {
    const v = last.current?.view;
    if (v && v.phase === 'end') {
      const mine = last.current!.uids.indexOf(snap.me.uid);
      return (
        <TableScreen title={face.title} onClose={leave} footer={<Btn kind="ghost" size="lg" full onClick={leave}>დახურვა</Btn>}>
          <div className="py-2 space-y-4">
            <p className="rounded-2xl bg-[#4a3426]/[0.06] px-4 py-2.5 text-[13px] font-bold text-[#75685a]">წამყვანმა ოთახი დახურა — შედეგები შენთან რჩება, სანამ ამ ეკრანს დახურავ.</p>
            <Podium names={v.names} scores={v.scores} me={mine} />
            <Standings names={v.names} scores={v.scores} me={mine} />
          </div>
        </TableScreen>
      );
    }
    return <Waiting face={face} title="ოთახი დაიხურა" text="წამყვანმა ოთახი დახურა, ან თამაში აღარ არსებობს." onClose={leave} action={{ label: 'დახურვა', onClick: leave }} />;
  }

  const host = room.host === snap.me.uid;
  if (room.status === 'lobby') {
    return (
      <>
        <RoundsLobby
          face={face}
          room={room}
          joins={snap.joins}
          me={snap.me.uid}
          className={className}
          gc={gc}
          onHide={onHide}
          host={host ? { opts, setOpts, start, kick: roundRooms.host.kick, close: () => { void closeRoom(); }, empty } : undefined}
          player={host ? undefined : { join: () => { snippet.unlock(); return roundRooms.join(me); }, leave: () => { void roundRooms.leave().then(leave); } }}
        />
        {error}
      </>
    );
  }
  if (host) {
    if (!snap.state) {
      return <Waiting face={face} spin title="თამაში იტვირთება…" text="შენი ტელეფონი თამაშს უძღვება — ერთი წამი." onClose={onHide} action={slow ? { label: 'ოთახის დახურვა', onClick: () => { void closeRoom(); } } : undefined} />;
    }
    return (
      <>
        <RoundsHost
          s={snap.state}
          face={face}
          snippet={snippet}
          gc={gc}
          onHide={onHide}
          moves={{ timeUp: roundRooms.host.timeUp, reveal: roundRooms.host.reveal, next: roundRooms.host.next, again, close: () => { void closeRoom(); } }}
        />
        {error}
      </>
    );
  }
  if (!room.view) return <Waiting face={face} spin title="თამაში იწყება…" text="ერთი წამი." onClose={onHide} />;
  const view = room.view;
  return (
    <>
      <RoundsPlayer
        view={view}
        uids={room.uids}
        uid={snap.me.uid}
        mine={snap.mine}
        face={face}
        snippet={snippet}
        gc={gc}
        onAnswer={(pick, ms) => roundRooms.act(view.key, pick, false, ms)}
        onHide={onHide}
        onLeave={leave}
      />
      {error}
    </>
  );
};
