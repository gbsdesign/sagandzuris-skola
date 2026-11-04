import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Crown, Users, Wifi } from 'lucide-react';
import { useAuth } from '../../context';
import { useMyClasses, useTeachingClasses } from '../../hooks/useClasses';
import { Card, Tabs, askConfirm } from '../../components/ui/kit';
import { RoomSetup, meOf } from '../../components/games/RoomSetup';
import { useOpenRequest } from '../../utils/searchOpen';
import { takhtiRooms, useTakhtiRoom } from '../../utils/gameRoomFirestore';
import { TakhtiRoom } from './takhti/Room';
import { TakhtiTable } from './takhti/Table';

// „ორი ტახტი“ on phones (games hub, 2026-11-04): the printed duel of the school (public/games/print/ori-takhti.pdf) gets its
// two app variants. Online: a class's room, each throne on its own phone (utils/takhtiRoom.ts over utils/oriTakhti.ts; the
// opener may play too, the rest of the class may watch). Hybrid: one phone between the two thrones
// (pages/games/takhti/Table.tsx). The tab is kept on the device (`sg-takhti-tab`).

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
          <li><b>ძეგლები.</b> დასაწყისში თითო ტახტი ოთხ ძეგლს ირჩევს: ოთხიდან ერთს იღებს პირველი, ორს — მეორე, ბოლო პირველს რჩება; მერე ახალ ოთხს მეორე იწყებს.</li>
          <li><b>სვლა.</b> იღებ ერთ ამოწეულ ბარათს — რომელსაც არაფერი ფარავს — და ან აშენებ (ფასს იხდი), ან ყიდი (2 თეთრი და 1 ყოველ შენს ყვითელზე), ან ძეგლის ქვეშ დებ და ძეგლს აშენებ. აღებულის ქვეშ ბარათი შეიძლება ამოტრიალდეს.</li>
          <li><b>ფასი.</b> ნედლეულს და ხელოსნობას შენი ყავისფერი და ნაცრისფერი ბარათები გაძლევს. რაც გაკლია, ბანკიდან ყიდულობ: 2 თეთრი და კიდევ იმდენი, რამდენსაც იმავეს მეტოქე აწარმოებს. ოსტატის ნიშანი წინა ეპოქის ბარათიდან ბარათს უფასოს ხდის.</li>
          <li><b>ლაშქარი.</b> ყოველი ფარი მხედარს ლიხის გზაზე ერთი უჯრით მეტოქის დედაქალაქისკენ აჩოჩებს; ხარკის ნიშანთან მეტოქე ბანკს 2 ან 5 თეთრს უხდის. მხედარი დედაქალაქში შევიდა — მაშინვე გამარჯვებაა.</li>
          <li><b>სიბრძნე.</b> ორი ერთნაირი სიბრძნე — დაფიდან ერთი ცოდნის ნიშანი შენია. ექვსი სხვადასხვა სიბრძნე — მაშინვე გამარჯვებაა.</li>
          <li><b>ეპოქის ბოლო.</b> ახალ ეპოქას ირჩევს, ვინ დაიწყოს, ის, ვისი დედაქალაქისკენაც დგას მხედარი. სულ შვიდი ძეგლი შენდება — მერვე თამაშიდან გადის.</li>
          <li><b>დასასრული.</b> მესამე ეპოქის ბოლოს ქულები ითვლება: ლურჯი, მწვანე და ყვითელი ბარათები, ამქრები, ძეგლები, ნიშნები, ყოველ 3 თეთრზე 1 და ლაშქარი (2, 5 ან 10). ტოლობისას ლურჯი ბარათების ქულები წყვეტს.</li>
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
          დასავლეთის ტახტი ქუთაისშია, აღმოსავლეთისა — თბილისში. სამი ეპოქის განმავლობაში ორივე თავის სამეფოს აშენებს: ბარათებს
          პირამიდიდან იღებს, ძეგლებს აგებს, სიბრძნეს აგროვებს და მხედარს ლიხის გზაზე მეტოქის დედაქალაქისკენ აჩოჩებს. გაიმარჯვებ
          ლაშქრით, სიბრძნით ან ბოლოს — დიდების ქულებით.
        </p>
        <p className="mt-2 text-[12.5px] leading-snug text-[#fbf6ec]/85">
          {tab === 'online'
            ? 'ონლაინ: ორივე თავის ტელეფონზე თამაშობს და ორივე სამეფოს ხედავს; ფასს, ხარკს და ქულებს ტელეფონი ითვლის. დანარჩენ კლასს ყურება შეუძლია.'
            : 'ჰიბრიდული: ერთი ტელეფონი ორ ტახტს შორის დევს — ვისი სვლაცაა, ის ეხება; ეპოქებს ტელეფონი შლის და ყველაფერს ითვლის.'}
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
