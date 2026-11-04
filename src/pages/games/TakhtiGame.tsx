import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Crown, Users, Wifi } from 'lucide-react';
import { useAuth } from '../../context';
import { useMyClasses, useTeachingClasses } from '../../hooks/useClasses';
import { Card, Tabs, askConfirm } from '../../components/ui/kit';
import { RoomSetup, meOf } from '../../components/games/RoomSetup';
import { ARMY_PTS, ARMY_TIE, WINE_PTS } from '../../utils/oriTakhti';
import { useOpenRequest } from '../../utils/searchOpen';
import { takhtiRooms, useTakhtiRoom } from '../../utils/gameRoomFirestore';
import { TakhtiRoom } from './takhti/Room';
import { TakhtiTable } from './takhti/Table';

// „ორი ტახტი“ (games hub; rebuilt 2026-11-04 on the school's own rules — one divides, the other chooses, utils/oriTakhti.ts):
// online, a class's room, each king on his own phone (utils/takhtiRoom.ts; the opener may play too, the rest of the class may
// watch); hybrid, one phone between the two kings (pages/games/takhti/Table.tsx); the print kit
// (pages/games/takhti/printKit.ts — the hub's button draws the PDF in the browser). The tab is kept on the device (`sg-takhti-tab`).

type Tab = 'online' | 'table';
const TAB_KEY = 'sg-takhti-tab';
const readTab = (): Tab | null => { try { const v = localStorage.getItem(TAB_KEY); return v === 'online' || v === 'table' ? v : null; } catch { return null; } };

const Rules: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <Card className="!p-4">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="w-full flex items-center justify-between gap-2 min-h-10 text-[14px] font-bold text-[#4a3426] cursor-pointer">
        წესები მოკლედ
        <ChevronDown className={`w-4 h-4 text-[#7a2028] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ol className="mt-2 space-y-2 text-[13px] leading-snug text-[#4a3426] list-decimal pl-5">
          <li><b>შეხვედრა.</b> ხუთი ბარათი ამოტრიალდება. ერთი მეფე მათ ორ წილად ყოფს (ორივეში ერთი ბარათი მაინც), მეორე წილს ირჩევს, დანარჩენი გამყოფს რჩება. შემდეგ შეხვედრაზე როლები იცვლება; სულ რვა შეხვედრაა.</li>
          <li><b>ელჩი.</b> ვისაც ელჩი ერგო, ის მეორე წილიდან ერთ ბარათს თავისთან გადმოიბირებს (ელჩს — არა). ჯერ ამრჩევის ელჩები, მერე გამყოფის.</li>
          <li><b>ციხე</b> იმდენი ქულაა, რამდენიც აწერია (1–3).</li>
          <li><b>ლაშქარი.</b> ბოლოს უფრო ძლიერ ლაშქარს (ძალების ჯამი) {ARMY_PTS} ქულა აქვს, ტოლობისას — {ARMY_TIE}-{ARMY_TIE}.</li>
          <li><b>ღვინო.</b> ვაზი და ჭურჭელი (ქვევრი, ჭური, ხელადა…) ერთად ერთი ღვინოა — {WINE_PTS} ქულა. მარტო ვაზი ან მარტო ჭურჭელი არაფერია.</li>
          <li><b>წიგნი</b> იმდენი ქულაა, რამდენი სხვა სახის ბარათიც გაქვს: ციხე, ლაშქარი, ღვინო, ელჩი — 0-დან 4-მდე.</li>
          <li><b>ტახტი.</b> ვისაც მეტი ქულა აქვს, იმის ქალაქში დგება ერთიანი საქართველოს ტახტი. ტოლობისას — უფრო ძლიერი ლაშქრისა, მერე ციხეების მეტი ქულისა.</li>
        </ol>
      )}
    </Card>
  );
};

const TakhtiGame: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const uid = user?.uid || '';
  const member = useMyClasses(uid);
  const { classes: teaching } = useTeachingClasses(uid || null);
  const mine = useMemo(
    () => [...member, ...teaching.filter(t => !member.some(m => m.id === t.id))].sort((a, b) => a.name.localeCompare(b.name, 'ka')),
    [member, teaching],
  );
  const session = useTakhtiRoom();
  const [roomOpen, setRoomOpen] = useState(false);
  const showRoom = roomOpen && !!session;
  const [tabPick, setTabPick] = useState<Tab | null>(readTab);
  const tab: Tab = tabPick ?? (uid ? 'online' : 'table');
  const setTab = (t: Tab) => { setTabPick(t); try { localStorage.setItem(TAB_KEY, t); } catch { /* private mode */ } };
  const joinWish = useRef<{ key: string; at: number } | null>(null);
  const opened = useRef('');
  const [nudge, setNudge] = useState(0);
  useEffect(() => { takhtiRooms.setVisible(showRoom); }, [showRoom]);
  useEffect(() => () => takhtiRooms.setVisible(false), []);

  /** into a room (an invitation, a row of the list, a new room): one room at a time on this phone */
  const enter = async (classId: string, roomId: string) => {
    if (!user) return;
    const cur = takhtiRooms.get();
    if (cur && (cur.classId !== classId || cur.roomId !== roomId) && cur.room?.host === uid && cur.room.status !== 'over') {
      const ok = await askConfirm({ title: 'შენს ოთახს ტოვებ?', text: 'შენი ტელეფონი ითვლის თამაშს: სანამ არ დაბრუნდები, თამაში ვერ გაგრძელდება. ოთახი ამ გვერდზე დაგხვდება.', ok: 'გადასვლა' });
      if (!ok) return;
    }
    takhtiRooms.open(classId, roomId, meOf(user, mine.find(c => c.id === classId)));
    joinWish.current = { key: `${classId}/${roomId}`, at: Date.now() };
    setRoomOpen(true);
    if (tab !== 'online') setTab('online');
  };
  // the hub's variant buttons ask for a tab; an invitation names its room („classId/roomId“)
  useOpenRequest('takhti', id => {
    if (id === 'online' || id === 'table') { setTab(id); return; }
    const [classId, roomId] = id.split('/');
    if (classId && roomId) void enter(classId, roomId);
  });
  // an invitation joins the lobby once the room is known (named as the class's list names me — it may take up to 4 s) while a
  // place is free; the opener of a new room plays too unless they say no in the lobby
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
    if (!s.room || s.room.status !== 'lobby' || s.joins.some(j => j.uid === s.me.uid) || s.joins.length >= 2) return;
    const mineNew = s.room.host === s.me.uid && Date.now() - s.room.createdAt < 20_000 && opened.current !== s.roomId;
    if (s.room.host !== s.me.uid || mineNew) { opened.current = s.roomId; void takhtiRooms.join(meOf(user, cls)); }
  }, [session, mine, nudge, user]);

  if (showRoom && session) {
    return (
      <TakhtiRoom
        snap={session}
        who={user ? meOf(user, mine.find(c => c.id === session.classId)) : undefined}
        className={mine.find(c => c.id === session.classId)?.name ?? ''}
        onHide={() => setRoomOpen(false)}
      />
    );
  }

  return (
    <div className="w-full max-w-2xl space-y-4">
      <section className="rounded-3xl p-4 sm:p-5 bg-gradient-to-br from-[#3b2a1c] to-[#2b1e14] text-[#fbf6ec] shadow-[0_8px_24px_-12px_rgba(43,30,20,0.6)]">
        <p className="font-serif-ge text-[17px] font-bold leading-snug">ორი ტახტი</p>
        <p className="mt-1.5 text-[12.5px] leading-snug text-[#fbf6ec]/85">
          ორი მეფე — დასავლეთისა ქუთაისში და აღმოსავლეთისა თბილისში — ლიხის ქედზე რვაჯერ ხვდება და ქვეყნის ძღვენს ინაწილებს:
          ერთი ყოფს, მეორე ირჩევს. ციხეები, ლაშქარი, ვაზი და ქვევრი, წიგნები და ელჩები — ვისი კარიც უფრო დიდებული გამოვა, იმის
          ქალაქში დადგება ერთიანი საქართველოს ტახტი. ბარათების განმარტებები ჯერ მასწავლებელს არ შეუმოწმებია.
        </p>
        <p className="mt-2 text-[12.5px] leading-snug text-[#fbf6ec]/85">
          {tab === 'online'
            ? 'ონლაინ: ორივე თავის ტელეფონზე თამაშობს და ორივე კარს ხედავს; ბარათებს და ქულებს ტელეფონი ითვლის. დანარჩენ კლასს ყურება შეუძლია.'
            : 'ჰიბრიდული: ერთი ტელეფონი ორ მეფეს შორის დევს — ვისი სვლაცაა, ის ეხება; ბარათებს ტელეფონი შლის და ყველაფერს ითვლის.'}
        </p>
      </section>

      <Tabs cols={2} value={tab} onChange={setTab} items={[{ id: 'online', label: 'ონლაინ', Icon: Wifi }, { id: 'table', label: 'ჰიბრიდული', Icon: Users }]} />

      {tab === 'online' ? (
        <RoomSetup
          game="takhti"
          Icon={Crown}
          user={user}
          isAdmin={isAdmin}
          classes={mine}
          session={session}
          closeMine={takhtiRooms.host.close}
          hostLine="ოთახს შენ ხსნი და შენც თამაშობ (ან მხოლოდ უძღვები). კლასის წევრებს მოწვევა მიუვათ ჩატში და ტელეფონზე; თამაშობს ორი, დანარჩენები უყურებენ."
          other="ჰიბრიდული — ერთი ტელეფონით, ორ ტახტს შორის"
          onEnter={(c, r) => { void enter(c, r); }}
          onResume={() => setRoomOpen(true)}
        />
      ) : <TakhtiTable />}

      <Rules />
    </div>
  );
};

export default TakhtiGame;
