import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, LayoutGrid, Users, Wifi } from 'lucide-react';
import { useAuth } from '../../context';
import { useMyClasses, useTeachingClasses } from '../../hooks/useClasses';
import { Card, Tabs, askConfirm } from '../../components/ui/kit';
import { RoomSetup, meOf } from '../../components/games/RoomSetup';
import { useOpenRequest } from '../../utils/searchOpen';
import { lurjiRooms, useLurjiRoom } from '../../utils/gameRoomFirestore';
import { FLOOR } from '../../utils/lurjiSupra';
import { LurjiRoom } from './lurji/Room';
import { LurjiTable } from './lurji/Table';

// „ლურჯი სუფრა“ on phones (games hub, 2026-11-04): the printed Azul of the school (public/games/print/lurji-supra.pdf) gets its
// two app variants. Online: a class's room, everybody takes on their own phone (utils/lurjiRoom.ts over utils/lurjiSupra.ts; the
// opener may play too). Hybrid: one phone goes round the table (pages/games/lurji/Table.tsx). The tab is kept on the device
// (`sg-lurji-tab`).

type Tab = 'online' | 'table';
const TAB_KEY = 'sg-lurji-tab';
const readTab = (): Tab | null => { try { const v = localStorage.getItem(TAB_KEY); return v === 'online' || v === 'table' ? v : null; } catch { return null; } };

const Rules: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <Card className="!p-4">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="w-full flex items-center justify-between gap-2 min-h-10 text-[14px] font-bold text-[#4a3426] cursor-pointer">
        წესები მოკლედ
        <ChevronDown className={`w-4 h-4 text-[#1f3a5f] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ol className="mt-2 space-y-2 text-[13px] leading-snug text-[#4a3426] list-decimal pl-5">
          <li><b>დილა.</b> ყოველ ლანგარზე 4 ბეჭედია, უსტაბაშის ნიშანი — მეიდანზე.</li>
          <li><b>აღება.</b> შენს სვლაზე იღებ ერთი ორნამენტის ყველა ბეჭედს: ლანგრიდან (დანარჩენი მეიდანზე ჩამოიყრება) ან მეიდნიდან. დღეში ვინც პირველი აიღებს მეიდნიდან, ნიშანსაც იღებს — ხვალ ის იწყებს, ოღონდ ნიშანი საღებავის ერთ უჯრას იკავებს.</li>
          <li><b>ზოლზე დადება.</b> ბეჭდებს ერთ ზოლზე დებ, მარჯვნიდან; ზოლში ერთი ორნამენტია. ზოლზე ვერ დადებ ორნამენტს, რომელიც სუფრის იმავე რიგში უკვე დაბეჭდილია. რაც არ ეტევა, საღებავზე იღვრება: {FLOOR.map(n => `−${n}`).join(' ')}.</li>
          <li><b>საღამო.</b> სავსე ზოლის ერთი ბეჭედი სუფრაზე, თავის ადგილას გადადის. მარტოს — 1 ქულა; გვერდით მდგომებთან — ჯაჭვის სიგრძე ჰორიზონტალურად და ვერტიკალურად. მერე საღებავი აკლებს, ქება 0-ზე ქვემოთ არ ჩადის.</li>
          <li><b>დასასრული.</b> იმ საღამოს, როცა ვინმეს სუფრის რიგი შეივსება. ბონუსები: სრული რიგი +2, სრული სვეტი +7, ერთი ორნამენტის ხუთივე ბეჭედი +10. ტოლობისას იგებს, ვისაც მეტი სრული რიგი აქვს.</li>
        </ol>
      )}
    </Card>
  );
};

const LurjiGame: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const uid = user?.uid || '';
  const member = useMyClasses(uid);
  const { classes: teaching } = useTeachingClasses(uid || null);
  const mine = useMemo(
    () => [...member, ...teaching.filter(t => !member.some(m => m.id === t.id))].sort((a, b) => a.name.localeCompare(b.name, 'ka')),
    [member, teaching],
  );
  const session = useLurjiRoom();
  const [roomOpen, setRoomOpen] = useState(false);
  const showRoom = roomOpen && !!session;
  const [tabPick, setTabPick] = useState<Tab | null>(readTab);
  const tab: Tab = tabPick ?? (uid ? 'online' : 'table');
  const setTab = (t: Tab) => { setTabPick(t); try { localStorage.setItem(TAB_KEY, t); } catch { /* private mode */ } };
  const joinWish = useRef<{ key: string; at: number } | null>(null);
  const opened = useRef('');
  const [nudge, setNudge] = useState(0);
  useEffect(() => { lurjiRooms.setVisible(showRoom); }, [showRoom]);
  useEffect(() => () => lurjiRooms.setVisible(false), []);

  /** into a room (an invitation, a row of the list, a new room): one room at a time on this phone */
  const enter = async (classId: string, roomId: string) => {
    if (!user) return;
    const cur = lurjiRooms.get();
    if (cur && (cur.classId !== classId || cur.roomId !== roomId) && cur.room?.host === uid && cur.room.status !== 'over') {
      const ok = await askConfirm({ title: 'შენს ოთახს ტოვებ?', text: 'შენი ტელეფონი ითვლის თამაშს: სანამ არ დაბრუნდები, თამაში ვერ გაგრძელდება. ოთახი ამ გვერდზე დაგხვდება.', ok: 'გადასვლა' });
      if (!ok) return;
    }
    lurjiRooms.open(classId, roomId, meOf(user, mine.find(c => c.id === classId)));
    joinWish.current = { key: `${classId}/${roomId}`, at: Date.now() };
    setRoomOpen(true);
    if (tab !== 'online') setTab('online');
  };
  // the hub's variant buttons ask for a tab; an invitation names its room („classId/roomId“)
  useOpenRequest('lurji', id => {
    if (id === 'online' || id === 'table') { setTab(id); return; }
    const [classId, roomId] = id.split('/');
    if (classId && roomId) void enter(classId, roomId);
  });
  // an invitation joins the lobby once the room is known (named as the class's list names me — it may take up to 4 s);
  // the opener of a new room plays too unless they say no in the lobby
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
    if (!s.room || s.room.status !== 'lobby' || s.joins.some(j => j.uid === s.me.uid)) return;
    const mineNew = s.room.host === s.me.uid && Date.now() - s.room.createdAt < 20_000 && opened.current !== s.roomId;
    if (s.room.host !== s.me.uid || mineNew) { opened.current = s.roomId; void lurjiRooms.join(meOf(user, cls)); }
  }, [session, mine, nudge, user]);

  if (showRoom && session) {
    return (
      <LurjiRoom
        snap={session}
        who={user ? meOf(user, mine.find(c => c.id === session.classId)) : undefined}
        className={mine.find(c => c.id === session.classId)?.name ?? ''}
        onHide={() => setRoomOpen(false)}
      />
    );
  }

  return (
    <div className="w-full max-w-2xl space-y-4">
      <section className="rounded-3xl p-4 sm:p-5 bg-gradient-to-br from-[#1f3a5f] to-[#162b48] text-[#fbf6ec] shadow-[0_8px_24px_-12px_rgba(31,58,95,0.6)]">
        <p className="font-serif-ge text-[17px] font-bold leading-snug">ლურჯი სუფრა</p>
        <p className="mt-1.5 text-[12.5px] leading-snug text-[#fbf6ec]/85">
          ერეკლე II-ის თბილისი: მეიდანზე მღებავების ამქრის ოსტატები ეჯიბრებიან, ვინ დაბეჭდავს ყველაზე ლამაზ ლურჯ სუფრას. ლანგრებიდან
          ბეჭდებს იღებ, დაზგის ზოლებს ავსებ, საღამოს სუფრაზე ბეჭდავ — გვერდიგვერდ დაბეჭდილი ორნამენტები ქებას მოგიტანს, ზედმეტი კი საღებავს დაღვრის.
        </p>
        <p className="mt-2 text-[12.5px] leading-snug text-[#fbf6ec]/85">
          {tab === 'online'
            ? 'ონლაინ: ყველა თავის ტელეფონზე იღებს ბეჭდებს და ყველას სუფრას ხედავს; ქებას ტელეფონი ითვლის. ოთახის გამხსნელიც თამაშობს.'
            : 'ჰიბრიდული: ერთი ტელეფონი ხელიდან ხელში გადადის — ვისი სვლაცაა, ის იღებს; ლანგრებს ავსებს და ქებას ტელეფონი ითვლის.'}
        </p>
      </section>

      <Tabs cols={2} value={tab} onChange={setTab} items={[{ id: 'online', label: 'ონლაინ', Icon: Wifi }, { id: 'table', label: 'ჰიბრიდული', Icon: Users }]} />

      {tab === 'online' ? (
        <RoomSetup
          game="lurji"
          Icon={LayoutGrid}
          user={user}
          isAdmin={isAdmin}
          classes={mine}
          session={session}
          closeMine={lurjiRooms.host.close}
          hostLine="ოთახს შენ ხსნი და შენც თამაშობ (ან მხოლოდ უძღვები). კლასის წევრებს მოწვევა მიუვათ ჩატში და ტელეფონზე; თამაშობს 2–4."
          other="ჰიბრიდული — ერთი ტელეფონით, ხელიდან ხელში"
          onEnter={(c, r) => { void enter(c, r); }}
          onResume={() => setRoomOpen(true)}
        />
      ) : <LurjiTable />}

      <Rules />
    </div>
  );
};

export default LurjiGame;
