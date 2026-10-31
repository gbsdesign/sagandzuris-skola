import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Users, Wifi } from 'lucide-react';
import { useAuth } from '../../../context';
import { useMyClasses, useTeachingClasses } from '../../../hooks/useClasses';
import { newHybrid, parseHybrid, ROUND_COUNTS, type HybridState, type Sound } from '../../../utils/roundGames';
import { roundRooms, useRoundRoom } from '../../../utils/gameRoomFirestore';
import { useOpenRequest } from '../../../utils/searchOpen';
import { Card, Tabs, askConfirm } from '../../../components/ui/kit';
import { RoomSetup, meOf } from '../../../components/games/RoomSetup';
import type { RoundFace } from './face';
import { RoundsRoom, type RoundSnap } from './RoundsRoom';
import type { RoundsOpts } from './RoundsLobby';
import { HybridGame, HybridSetup, readHybridConf, type HybridConf } from './RoundsHybrid';

// A quick game's page in the games hub (pages/games/rounds/, 2026-10-31): what the game is, then two tabs — „ონლაინ“ (a room
// in a class: the opener hosts, everyone answers on their own phone) and „ჰიბრიდული“ (one phone, the class in teams). The
// hub's variant buttons ask for a tab; an invitation (the strip, a chat card, a phone notice) names its room. Settings and
// a paused one-phone game stay on the device.

type Mode = 'online' | 'table';
interface Conf { mode?: Mode; count: number; sound: Sound; hybrid: HybridConf }

const load = (key: string): unknown => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const save = (key: string, value: unknown) => {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
};
const readConf = (key: string): Conf => {
  const o = (load(key) ?? {}) as Partial<Conf>;
  return {
    mode: o.mode === 'online' || o.mode === 'table' ? o.mode : undefined,
    count: ROUND_COUNTS.includes(Number(o.count)) ? Number(o.count) : 8,
    sound: o.sound === 'host' ? 'host' : 'all',
    hybrid: readHybridConf(o.hybrid),
  };
};

export const RoundsPage: React.FC<{ face: RoundFace }> = ({ face }) => {
  const KEY = `sg-${face.game}`;
  const GAME_KEY = `sg-${face.game}-game`;
  const [conf, setConf] = useState(() => readConf(KEY));
  const setC = (patch: Partial<Conf>) => setConf(c => { const next = { ...c, ...patch }; save(KEY, next); return next; });

  // ——— online: my classes (as a member or their teacher), this phone's room of this game, its screen
  const { user, isAdmin } = useAuth();
  const uid = user?.uid || '';
  const member = useMyClasses(uid);
  const { classes: teaching } = useTeachingClasses(uid || null);
  const mine = useMemo(
    () => [...member, ...teaching.filter(t => !member.some(m => m.id === t.id))].sort((a, b) => a.name.localeCompare(b.name, 'ka')),
    [member, teaching],
  );
  const store = useRoundRoom();
  // the store holds one room of every quick game: here only this game's
  const session: RoundSnap | null = store && (store.room === undefined || store.room === null || store.room.game === face.game) ? store : null;
  const [roomOpen, setRoomOpen] = useState(false);
  const showRoom = roomOpen && !!session;
  const joinWish = useRef<{ key: string; at: number } | null>(null);
  const [nudge, setNudge] = useState(0);
  const mode: Mode = conf.mode ?? (uid ? 'online' : 'table');
  useEffect(() => { roundRooms.setVisible(showRoom); }, [showRoom]);
  useEffect(() => () => roundRooms.setVisible(false), []);

  /** into a room (an invitation, a row of the list, a new room): one quick game's room at a time on this phone */
  const enter = async (classId: string, roomId: string) => {
    if (!user) return;
    const cur = roundRooms.get();
    if (cur && (cur.classId !== classId || cur.roomId !== roomId) && cur.room?.host === uid && cur.room.status !== 'over') {
      const ok = await askConfirm({ title: 'შენს ოთახს ტოვებ?', text: 'შენ ხარ წამყვანი: სანამ არ დაბრუნდები, იქ თამაში შეჩერებულია. ოთახი ამ გვერდზე დაგხვდება.', ok: 'გადასვლა' });
      if (!ok) return;
    }
    roundRooms.open(classId, roomId, meOf(user, mine.find(c => c.id === classId)));
    joinWish.current = { key: `${classId}/${roomId}`, at: Date.now() };
    setRoomOpen(true);
    if (conf.mode !== 'online') setC({ mode: 'online' });
  };
  useOpenRequest(face.game, id => {
    if (id === 'online' || id === 'table') { setC({ mode: id }); return; }
    const [classId, roomId] = id.split('/');
    if (classId && roomId) void enter(classId, roomId);
  });
  // an invitation's „შესვლა“ joins the lobby once the room is known (not the host's own, not twice), named as the class's
  // list names me — an invitation opened at once waits up to 4 s for that list
  useEffect(() => {
    const s = session;
    const w = joinWish.current;
    if (!s || !user || s.room === undefined || w?.key !== `${s.classId}/${s.roomId}`) return;
    const cls = mine.find(c => c.id === s.classId);
    const wait = 4000 - (Date.now() - w.at);
    if (!cls && wait > 0) {
      const t = setTimeout(() => setNudge(n => n + 1), wait);
      return () => clearTimeout(t);
    }
    joinWish.current = null;
    if (s.room && s.room.status === 'lobby' && s.room.host !== s.me.uid && !s.joins.some(j => j.uid === s.me.uid)) void roundRooms.join(meOf(user, cls));
  }, [session, mine, nudge, user]);

  // ——— one phone: the game is kept after every step (a finished one is let go)
  const [game, setGame] = useState<HybridState | null>(() => { const g = parseHybrid(load(GAME_KEY)); return g && g.game === face.game && g.phase !== 'end' ? g : null; });
  const [open, setOpen] = useState(false);
  const [empty, setEmpty] = useState(false);
  useEffect(() => save(GAME_KEY, game && game.phase !== 'end' ? game : null), [game, GAME_KEY]);
  const startHybrid = async () => {
    if (game && game.phase !== 'end' && !(await askConfirm({ title: 'ახალი თამაში დაიწყოს?', text: 'შეჩერებული თამაში წაიშლება.', ok: 'ახალი თამაში' }))) return;
    const rounds = face.draw(conf.hybrid.count);
    const h = rounds.length ? newHybrid(face.game, conf.hybrid.names.slice(0, conf.hybrid.teams).map(n => n.trim()), rounds) : null;
    if (!h) { setEmpty(true); return; }
    setEmpty(false);
    face.remember(rounds);
    setGame(h);
    setOpen(true);
  };
  const again = () => {
    if (!game) return;
    const rounds = face.draw(game.rounds.length);
    const h = rounds.length ? newHybrid(face.game, game.teams, rounds) : null;
    if (!h) return;
    face.remember(rounds);
    setGame(h);
  };

  if (showRoom && session) {
    return (
      <RoundsRoom
        snap={session}
        face={face}
        who={user ? meOf(user, mine.find(c => c.id === session.classId)) : undefined}
        className={mine.find(c => c.id === session.classId)?.name ?? ''}
        opts={{ count: conf.count, sound: conf.sound }}
        setOpts={(o: RoundsOpts) => setC(o)}
        onHide={() => setRoomOpen(false)}
      />
    );
  }
  if (open && game) {
    return <HybridGame face={face} h={game} setH={setGame} onClose={() => setOpen(false)} onAgain={again} />;
  }

  return (
    <div className="w-full max-w-2xl space-y-4">
      <Card tone="wine" className="!p-4 sm:!p-5">
        <p className="font-serif-ge text-[17px] font-bold leading-snug">{face.title}</p>
        <p className="mt-1.5 text-[12.5px] leading-snug text-[#fbf6ec]/85">{face.intro}</p>
        <p className="mt-2 text-[12.5px] leading-snug text-[#fbf6ec]/85">{mode === 'online' ? face.online : face.hybrid}</p>
      </Card>

      <Tabs
        cols={2}
        value={mode}
        onChange={m => setC({ mode: m })}
        items={[{ id: 'online', label: 'ონლაინ', Icon: Wifi }, { id: 'table', label: 'ჰიბრიდული', Icon: Users }]}
      />

      {mode === 'online' ? (
        <RoomSetup
          game={face.game}
          Icon={face.Icon}
          user={user}
          isAdmin={isAdmin}
          classes={mine}
          session={session}
          closeMine={roundRooms.host.close}
          hostLine="შენ იქნები წამყვანი: არ თამაშობ, რაუნდებს უძღვები. კლასის წევრებს მოწვევა მიუვათ ჩატში და ტელეფონზე; ვინც შემოვა, ის თამაშობს (40-მდე)."
          other="ჰიბრიდული, ერთი ტელეფონით"
          onEnter={(c, r) => { void enter(c, r); }}
          onResume={() => setRoomOpen(true)}
        />
      ) : (
        <HybridSetup
          face={face}
          conf={conf.hybrid}
          setConf={h => setC({ hybrid: h })}
          paused={game}
          empty={empty}
          onStart={() => { void startHybrid(); }}
          onResume={() => setOpen(true)}
        />
      )}
    </div>
  );
};
