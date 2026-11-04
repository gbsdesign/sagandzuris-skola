import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Route, Users, Wifi } from 'lucide-react';
import { useAuth } from '../../context';
import { useMyClasses, useTeachingClasses } from '../../hooks/useClasses';
import { Card, Tabs, askConfirm } from '../../components/ui/kit';
import { RoomSetup, meOf } from '../../components/games/RoomSetup';
import { useOpenRequest } from '../../utils/searchOpen';
import { qaravaniRooms, useQaravaniRoom } from '../../utils/gameRoomFirestore';
import { MAX_Q } from '../../utils/qaravani';
import { QaravaniRoom } from './qaravani/Room';
import { QaravaniTable } from './qaravani/Table';

// „ქარავანი“ on phones (games hub, 2026-11-04): the printed kit №3 (public/games/print/qaravani.pdf — a Ticket to Ride: Europe on a
// map of Georgia at the end of the XIX century) gets its two app variants. Online: a class's room, every caravan on its own phone
// with its own cards and letters (utils/qaravaniRoom.ts over utils/qaravani.ts; the opener may play too, the rest of the class
// may watch). Hybrid: one phone passed round the table (pages/games/qaravani/Table.tsx). The map is the kit's own
// (data/qaravaniMap.ts, made by scripts/build-qaravani-map.mjs) and loads only with this page. The tab is kept on the device
// (`sg-qaravani-tab`).

type Tab = 'online' | 'table';
const TAB_KEY = 'sg-qaravani-tab';
const readTab = (): Tab | null => { try { const v = localStorage.getItem(TAB_KEY); return v === 'online' || v === 'table' ? v : null; } catch { return null; } };

const RULES: readonly [string, string][] = [
  ['სვლა', 'სვლაში ერთ რამეს აკეთებ: იღებ 2 ბარათს, იკავებ გზას, იღებ წერილებს ან აშენებ ქარვასლას.'],
  ['ბარათები', 'ღიადან ან დასტიდან — როგორც გინდა. ღიად აღებული ორთქლმავალი ამ სვლის ერთადერთი ბარათია. ღია ხუთიდან სამი ორთქლმავალი რომ აღმოჩნდეს, ხუთივე იყრება და ახალი იშლება.'],
  ['გზა', 'გადადე გზის ფერის იმდენი ბარათი, რამდენი უჯრაც მას აქვს — ორთქლმავალი ნებისმიერ ფერს ცვლის, ნაცრისფერი გზა ნებისმიერი ერთი ფერით იკავება. ქულა მაშინვე ემატება: 1, 2, 4, 7, 10, 15, 18 ან 21. გზა შენს სხვა გზებს შეიძლება არ ებმოდეს.'],
  ['მთის და გემის გზა', 'მთაში დასტიდან 3 ბარათი იხსნება: ყოველ შენი ფერის ბარათზე და ორთქლმავალზე კიდევ ერთი ბარათი გჭირდება — ან უარს ამბობ და ბარათები ხელში გრჩება. გემის ყოველ ნიშანზე ორთქლმავალი აუცილებელია.'],
  ['ორმაგი გზა', 'ორივე ზოლს ერთი მოთამაშე ვერ დაიკავებს. 2–3 მოთამაშით მხოლოდ ერთი ზოლი გამოიყენება.'],
  ['წერილები', 'დასაწყისში 4 წერილიდან 2 მაინც დაიტოვე, მერე დასტიდან 3-დან — 1 მაინც. შესრულებული წერილი (ორი ქალაქი შენი უწყვეტი გზით) ქულას მატებს, შეუსრულებელი — აკლებს.'],
  ['ქარვასლა', 'პირველი 1 ბარათი ღირს, მეორე — ერთი ფერის 2, მესამე — ერთი ფერის 3. თამაშის ბოლოს ქალაქიდან გამავალ სხვის ერთ გზას შენად ითვლი წერილებისთვის; უხმარი ქარვასლა +4.'],
  ['დასასრული', 'როცა ვინმეს 2 ან ნაკლები ურემი დარჩება, ყველა — ისიც — კიდევ ერთ სვლას აკეთებს. ყველაზე გრძელი უწყვეტი გზა +10. ტოლობისას იგებს, ვისაც მეტი წერილი შეუსრულდა, მერე — ვინც ნაკლები ქარვასლა ააშენა.'],
];

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
          {RULES.map(([h, t]) => <li key={h}><b>{h}.</b> {t}</li>)}
        </ol>
      )}
    </Card>
  );
};

const QaravaniGame: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const uid = user?.uid || '';
  const member = useMyClasses(uid);
  const { classes: teaching } = useTeachingClasses(uid || null);
  const mine = useMemo(
    () => [...member, ...teaching.filter(t => !member.some(m => m.id === t.id))].sort((a, b) => a.name.localeCompare(b.name, 'ka')),
    [member, teaching],
  );
  const session = useQaravaniRoom();
  const [roomOpen, setRoomOpen] = useState(false);
  const showRoom = roomOpen && !!session;
  const [tabPick, setTabPick] = useState<Tab | null>(readTab);
  const tab: Tab = tabPick ?? (uid ? 'online' : 'table');
  const setTab = (t: Tab) => { setTabPick(t); try { localStorage.setItem(TAB_KEY, t); } catch { /* private mode */ } };
  const joinWish = useRef<{ key: string; at: number } | null>(null);
  const opened = useRef('');
  const [nudge, setNudge] = useState(0);
  useEffect(() => { qaravaniRooms.setVisible(showRoom); }, [showRoom]);
  useEffect(() => () => qaravaniRooms.setVisible(false), []);

  /** into a room (an invitation, a row of the list, a new room): one room at a time on this phone */
  const enter = async (classId: string, roomId: string) => {
    if (!user) return;
    const cur = qaravaniRooms.get();
    if (cur && (cur.classId !== classId || cur.roomId !== roomId) && cur.room?.host === uid && cur.room.status !== 'over') {
      const ok = await askConfirm({ title: 'შენს ოთახს ტოვებ?', text: 'შენი ტელეფონი ითვლის თამაშს: სანამ არ დაბრუნდები, თამაში ვერ გაგრძელდება. ოთახი ამ გვერდზე დაგხვდება.', ok: 'გადასვლა' });
      if (!ok) return;
    }
    qaravaniRooms.open(classId, roomId, meOf(user, mine.find(c => c.id === classId)));
    joinWish.current = { key: `${classId}/${roomId}`, at: Date.now() };
    setRoomOpen(true);
    if (tab !== 'online') setTab('online');
  };
  // the hub's variant buttons ask for a tab; an invitation names its room („classId/roomId“)
  useOpenRequest('qaravani', id => {
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
    if (!s.room || s.room.status !== 'lobby' || s.joins.some(j => j.uid === s.me.uid) || s.joins.length >= MAX_Q) return;
    const mineNew = s.room.host === s.me.uid && Date.now() - s.room.createdAt < 20_000 && opened.current !== s.roomId;
    if (s.room.host !== s.me.uid || mineNew) { opened.current = s.roomId; void qaravaniRooms.join(meOf(user, cls)); }
  }, [session, mine, nudge, user]);

  if (showRoom && session) {
    return (
      <QaravaniRoom
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
        <p className="font-serif-ge text-[17px] font-bold leading-snug">ქარავანი</p>
        <p className="mt-1.5 text-[12.5px] leading-snug text-[#fbf6ec]/85">
          XIX საუკუნის ბოლოა: ქარავნები საქართველოს გზებზე ღვინოს, თაფლს, ჩაის, სულგუნს, სპილენძს და აბრეშუმს ეზიდებიან, ფოთიდან
          თბილისამდე კი პირველი მატარებელი დადის. დაიკავე გზები ქალაქებს შორის, შეასრულე მგზავრების წერილები, ააშენე ქარვასლები —
          და ააწყვე ყველაზე გრძელი გზა.
        </p>
        <p className="mt-2 text-[12.5px] leading-snug text-[#fbf6ec]/85">
          {tab === 'online'
            ? 'ონლაინ: ყველას თავის ტელეფონზე უჭირავს ბარათები და წერილები, რუკა ყველასთვის ერთია; ქულებს, წერილებს და გრძელ გზას ტელეფონი ითვლის.'
            : 'ჰიბრიდული: ერთი ტელეფონი ხელიდან ხელში გადადის — სვლებს შორის მხოლოდ იმას აჩვენებს, ვისი ჯერია, ბოლოს კი ყველაფერს ითვლის.'}
        </p>
      </section>

      <Tabs cols={2} value={tab} onChange={setTab} items={[{ id: 'online', label: 'ონლაინ', Icon: Wifi }, { id: 'table', label: 'ჰიბრიდული', Icon: Users }]} />

      {tab === 'online' ? (
        <RoomSetup
          game="qaravani"
          Icon={Route}
          user={user}
          isAdmin={isAdmin}
          classes={mine}
          session={session}
          closeMine={qaravaniRooms.host.close}
          hostLine="ოთახს შენ ხსნი და შენც თამაშობ (ან მხოლოდ უძღვები). კლასის წევრებს მოწვევა მიუვათ ჩატში და ტელეფონზე; თამაშობს 2–5, დანარჩენები უყურებენ."
          other="ჰიბრიდული — ერთი ტელეფონით, ხელიდან ხელში"
          onEnter={(c, r) => { void enter(c, r); }}
          onResume={() => setRoomOpen(true)}
        />
      ) : <QaravaniTable />}

      <Rules />
    </div>
  );
};

export default QaravaniGame;
