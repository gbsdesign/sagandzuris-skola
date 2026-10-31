import React, { useState } from 'react';
import { DoorOpen, Play, type LucideIcon } from 'lucide-react';
import type { User } from 'firebase/auth';
import type { SchoolClass } from '../../hooks/useClasses';
import { sendGameMessage } from '../../hooks/useClassChat';
import { createRoom, type Me, type RoomGame, type RoomSnap } from '../../utils/gameRoom';
import { roomsBackend, useClassRooms, type ClassRoom } from '../../utils/gameRoomFirestore';
import { notifyGameInvite } from '../../utils/groupPush';
import { ROOM_GAME_INFO } from '../../data/roomGames';
import { Btn, Card, askConfirm } from '../ui/kit';
import { Chip } from './Chip';

// The online part of a room game's page (2026-10-30 with „სამშვილდის ღამე“, every room game since 2026-10-31): my room (back
// into it), this game's rooms open in my classes, and a new room — its opener hosts it and does not play; the class gets the
// invitation in its chat and on the phone (utils/groupPush.ts → the reminders Worker's /game-invite) and the strip on top of
// the app (components/games/GameInvites.tsx).

/** how I am named in a class (its roster), else by my account */
export const meOf = (user: User, cls?: SchoolClass): Me => {
  const p = cls?.members.find(m => m.uid === user.uid) || cls?.teachers.find(m => m.uid === user.uid);
  return { uid: user.uid, name: p?.name || user.displayName || 'მოთამაშე', photoURL: p?.photoURL || user.photoURL || '' };
};

/** the class last picked for a room (this device, every game) */
const PICKED = 'sg-samshvilde-class';
const pickedClass = () => { try { return localStorage.getItem(PICKED) || ''; } catch { return ''; } };

const firstName = (full: string) => full.trim().split(/\s+/)[0] || '';

export const RoomSetup: React.FC<{
  game: RoomGame; Icon: LucideIcon; user: User | null; isAdmin: boolean; classes: SchoolClass[];
  /** this phone's room of this game's store (null: none) */
  session: RoomSnap | null;
  /** closes my own room of this store (a new one replaces it) */
  closeMine: () => Promise<void>;
  /** the new room's line: what the host does, how many play */
  hostLine: string;
  /** the variant without a room, named when one is not in a class */
  other: string;
  onEnter: (classId: string, roomId: string) => void; onResume: () => void;
}> = ({ game, Icon, user, isAdmin, classes, session, closeMine, hostLine, other, onEnter, onResume }) => {
  const uid = user?.uid || '';
  const info = ROOM_GAME_INFO[game];
  const list = useClassRooms(classes.map(c => c.id)).filter(r => r.game === game);
  const [pick, setPick] = useState(pickedClass);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const cls = classes.find(c => c.id === pick) ?? classes[0];
  const choose = (id: string) => { setPick(id); try { localStorage.setItem(PICKED, id); } catch { /* a private window */ } };
  const nameOf = (classId: string) => classes.find(c => c.id === classId)?.name || '';
  const over = game === 'samshvilde' ? 'დასრულდა — მატიანე' : 'დასრულდა — შედეგები';
  const statusOf = (r: ClassRoom) => (r.status === 'lobby' ? 'ელოდება მოთამაშეებს' : r.status === 'live' ? `თამაში მიდის · ${r.uids.length} მოთამაშე` : over);

  if (!user) {
    return <Card className="!p-4"><p className="text-[13.5px] leading-snug text-[#4a3426]">ონლაინ სათამაშოდ შედი საიტზე: ოთახს კლასის წევრი ხსნის და თავის კლასს იწვევს.</p></Card>;
  }
  if (!classes.length) {
    return (
      <Card className="!p-4">
        <p className="text-[13.5px] leading-snug text-[#4a3426]">ონლაინ თამაში კლასის წევრებისთვისაა: {info.host} ოთახს ხსნის და კლასს იწვევს. როცა კლასში დაგამატებენ, აქ გამოჩნდება. მანამდე ითამაშე {other}.</p>
      </Card>
    );
  }

  const here = session?.roomId;
  const mineHere = session?.room;
  const others = list.filter(r => r.id !== here && (r.status !== 'over' || r.host === uid || r.uids.includes(uid)));

  const create = async () => {
    if (!cls || busy) return;
    if (session?.room && session.room.host === uid && session.room.status !== 'over') {
      if (!(await askConfirm({ title: 'შენი ოთახი დაიხუროს?', text: 'ერთ ჯერზე ერთ ოთახს უძღვები: ძველი დაიხურება და ახალი გაიხსნება.', ok: 'ახალი ოთახი' }))) return;
      await closeMine();
    }
    setBusy(true);
    setErr('');
    try {
      const me = meOf(user, cls);
      const roomId = await createRoom(roomsBackend, cls.id, me, game);
      onEnter(cls.id, roomId);
      sendGameMessage(cls.id, { ...me, teacher: isAdmin }, roomId, game).catch(e => console.warn('game invite chat: ', e?.code || e));
      void notifyGameInvite(cls.id, roomId);
    } catch (e) {
      console.warn('game room: ', (e as { code?: string })?.code || e);
      setErr('ოთახი ვერ გაიხსნა — შეამოწმე ინტერნეტი და სცადე თავიდან.');
    }
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      {session && mineHere && (
        <Card className="!p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1 basis-52">
              <p className="text-[14px] font-bold text-[#4a3426]">{mineHere.host === uid ? 'შენი ოთახი' : 'შენ ამ ოთახში ხარ'}{nameOf(session.classId) ? ` · ${nameOf(session.classId)}` : ''}</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-[#75685a]">{mineHere.status === 'lobby' ? 'ელოდება მოთამაშეებს' : mineHere.status === 'live' ? 'თამაში მიდის' : over}</p>
            </div>
            <Btn onClick={onResume} icon={<Play />}>დაბრუნება</Btn>
          </div>
        </Card>
      )}

      {others.length > 0 && (
        <section className="space-y-2">
          <p className="px-1 text-[13px] font-bold text-[#4a3426]">ღია ოთახები შენს კლასებში</p>
          <ul className="space-y-2">
            {others.map(r => {
              const mine = r.host === uid || r.uids.includes(uid);
              return (
                <li key={r.id} className="flex items-center gap-3 rounded-3xl bg-white ring-1 ring-[#e8dcc8] p-3 pl-3.5">
                  <span className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center ${game === 'samshvilde' ? 'bg-[#1b1830] text-[#e2c27a]' : 'bg-[#7a2028] text-[#fbf6ec]'}`}><Icon className="w-5 h-5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-bold leading-tight text-[#4a3426] [overflow-wrap:anywhere]">{r.host === uid ? 'შენი ოთახი' : `${info.host}: ${firstName(r.hostName) || r.hostName}`}</p>
                    <p className="mt-0.5 text-[12.5px] leading-snug text-[#75685a]">{nameOf(r.classId)} · {statusOf(r)}</p>
                  </div>
                  <Btn size="sm" kind={r.status === 'lobby' && !mine ? 'primary' : 'ghost'} onClick={() => onEnter(r.classId, r.id)} className="shrink-0">
                    {mine ? 'დაბრუნება' : r.status === 'lobby' ? 'შესვლა' : 'ყურება'}
                  </Btn>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <Card className="!p-4 space-y-3">
        <p className="text-[13px] font-bold text-[#4a3426] flex items-center gap-1.5"><DoorOpen className="w-4 h-4 text-[#7a2028]" /> ახალი ოთახი</p>
        <p className="text-[12.5px] leading-snug text-[#75685a]">{hostLine}</p>
        {classes.length > 1 ? (
          <div className="flex flex-wrap gap-2" role="group" aria-label="კლასი">
            {classes.map(c => <Chip key={c.id} on={cls?.id === c.id} onClick={() => choose(c.id)}>{c.name} · {c.members.length}</Chip>)}
          </div>
        ) : cls && <p className="text-[13px] text-[#4a3426]">კლასი: <b>{cls.name}</b> · {cls.members.length} წევრი</p>}
        <Btn size="lg" full disabled={!cls || busy} onClick={create} icon={<Icon />} className="!h-14 !text-[16px]">
          {busy ? 'იხსნება…' : cls ? 'ოთახის გახსნა და მოწვევა' : 'აირჩიე კლასი'}
        </Btn>
        {err && <p className="text-[13px] font-bold text-red-700" role="alert">{err}</p>}
      </Card>
    </div>
  );
};
