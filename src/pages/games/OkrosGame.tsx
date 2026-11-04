import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Map as MapIcon, Users, Wifi } from 'lucide-react';
import { useAuth } from '../../context';
import { useMyClasses, useTeachingClasses } from '../../hooks/useClasses';
import { Card, Tabs, askConfirm } from '../../components/ui/kit';
import { RoomSetup, meOf } from '../../components/games/RoomSetup';
import { useOpenRequest } from '../../utils/searchOpen';
import { okrosRooms, useOkrosRoom } from '../../utils/gameRoomFirestore';
import { MAX_OK, WORKS } from '../../utils/okrosKhana';
import { OkrosRoom } from './okros/Room';
import { OkrosTable } from './okros/Table';
import { WorkCard } from './okros/look';

// „ოქროს ხანა“ on phones (games hub, 2026-11-04): the school's own board game of the Golden Age (rules utils/okrosKhana.ts; the
// printed kit №1, public/games/print/okros-khana.pdf, draws the same map) gets its two app variants. Online: a class's room,
// every house on its own phone (utils/okrosRoom.ts; the opener may play too, the rest of the class may watch). Hybrid: one phone
// in the middle of the table (pages/games/okros/Table.tsx). The tab is kept on the device (`sg-okros-tab`).

type Tab = 'online' | 'table';
const TAB_KEY = 'sg-okros-tab';
const readTab = (): Tab | null => { try { const v = localStorage.getItem(TAB_KEY); return v === 'online' || v === 'table' ? v : null; } catch { return null; } };

const RULES: readonly [string, string][] = [
  ['სვლა', 'ჯერ იარე — ორ კუთხემდე, ან დარჩი. მერე აიღე იმ კუთხის ნივთი: ორი, შენი მამულით +1, მეფესთან +1. თბილისის ბაზარზე — რომელი ორიც გინდა. ხელში ათამდე ეტევა.'],
  ['საქმე', 'მერე იქვე ერთი საქმე: მამული, წვლილი დიდ საქმეში ან სუფრა — ან სვლის დასრულება.'],
  ['მამული', 'ხე + ქვა + პური → 2 ქულა. კუთხეში ორი მამულის ადგილია, თითო სახლს იქ ერთი; თბილისში მამული არ შენდება. თითო სახლს ხუთი მამული აქვს.'],
  ['მეფის დიდი საქმე', 'ღიად სამი საქმე დევს, თითო თავის კუთხეში. ვინც იქ დგას, მას საჭირო ნივთებს აძლევს: ყოველი ნივთი 1 ქულაა, მეფის კუთხეში 2. ვინც ბოლო ნივთს მიიტანს, საქმის ბარათს იღებს (+2–4) და ახალი საქმე ამოდის.'],
  ['სუფრა', 'საკუთარ მამულში: ღვინო + პური → 3 ქულა, მეფესთან 5. ვინც იმავე კუთხეშია, სტუმარია და 1 ქულას იღებს.'],
  ['წელიწადი', 'ყოველ წელს ყველა ერთხელ დადის, მერე მატიანე მეფეს სხვა კუთხეში გზავნის. ორი სახლი — 12 წელი, სამი — 10, ოთხი — 9.'],
  ['დასასრული', 'ბოლო წლის მერე იგებს, ვისაც მეტი ქულა აქვს; ტოლობისას — ვინც მეტი საქმე დაასრულა, მერე — ვინც მეტი მამული ააშენა.'],
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

/** the king's twelve works, each with its region, what it needs and a line about it */
const Works: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <Card className="!p-4">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="w-full flex items-center justify-between gap-2 min-h-10 text-[14px] font-bold text-[#4a3426] cursor-pointer">
        მეფის 12 დიდი საქმე
        <ChevronDown className={`w-4 h-4 text-[#7a2028] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {WORKS.map(w => <WorkCard key={w.id} o={{ id: w.id, got: [0, 0, 0, 0, 0] }} king={-1} note />)}
        </ul>
      )}
    </Card>
  );
};

const OkrosGame: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const uid = user?.uid || '';
  const member = useMyClasses(uid);
  const { classes: teaching } = useTeachingClasses(uid || null);
  const mine = useMemo(
    () => [...member, ...teaching.filter(t => !member.some(m => m.id === t.id))].sort((a, b) => a.name.localeCompare(b.name, 'ka')),
    [member, teaching],
  );
  const session = useOkrosRoom();
  const [roomOpen, setRoomOpen] = useState(false);
  const showRoom = roomOpen && !!session;
  const [tabPick, setTabPick] = useState<Tab | null>(readTab);
  const tab: Tab = tabPick ?? (uid ? 'online' : 'table');
  const setTab = (t: Tab) => { setTabPick(t); try { localStorage.setItem(TAB_KEY, t); } catch { /* private mode */ } };
  const joinWish = useRef<{ key: string; at: number } | null>(null);
  const opened = useRef('');
  const [nudge, setNudge] = useState(0);
  useEffect(() => { okrosRooms.setVisible(showRoom); }, [showRoom]);
  useEffect(() => () => okrosRooms.setVisible(false), []);

  /** into a room (an invitation, a row of the list, a new room): one room at a time on this phone */
  const enter = async (classId: string, roomId: string) => {
    if (!user) return;
    const cur = okrosRooms.get();
    if (cur && (cur.classId !== classId || cur.roomId !== roomId) && cur.room?.host === uid && cur.room.status !== 'over') {
      const ok = await askConfirm({ title: 'შენს ოთახს ტოვებ?', text: 'შენი ტელეფონი ითვლის თამაშს: სანამ არ დაბრუნდები, თამაში ვერ გაგრძელდება. ოთახი ამ გვერდზე დაგხვდება.', ok: 'გადასვლა' });
      if (!ok) return;
    }
    okrosRooms.open(classId, roomId, meOf(user, mine.find(c => c.id === classId)));
    joinWish.current = { key: `${classId}/${roomId}`, at: Date.now() };
    setRoomOpen(true);
    if (tab !== 'online') setTab('online');
  };
  // the hub's variant buttons ask for a tab; an invitation names its room („classId/roomId“)
  useOpenRequest('okros', id => {
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
    if (!s.room || s.room.status !== 'lobby' || s.joins.some(j => j.uid === s.me.uid) || s.joins.length >= MAX_OK) return;
    const mineNew = s.room.host === s.me.uid && Date.now() - s.room.createdAt < 20_000 && opened.current !== s.roomId;
    if (s.room.host !== s.me.uid || mineNew) { opened.current = s.roomId; void okrosRooms.join(meOf(user, cls)); }
  }, [session, mine, nudge, user]);

  if (showRoom && session) {
    return (
      <OkrosRoom
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
        <p className="font-serif-ge text-[17px] font-bold leading-snug">ოქროს ხანა</p>
        <p className="mt-1.5 text-[12.5px] leading-snug text-[#fbf6ec]/85">
          XII საუკუნეა, საქართველოს ოქროს ხანა. შენი დიდებული სახლის მხედარი კუთხიდან კუთხეში დადის: აგროვებს ხეს, ქვას, პურს,
          ღვინოს და ოქროს, აშენებს მამულებს, შლის სუფრებს და მეფის დიდ საქმეებს ეხმარება — ციხეებს, ხიდს, სასახლეს, აკადემიას. მეფე
          ყოველ წელს სხვა კუთხეშია და იქ ყველაფერი მეტს იძლევა.
        </p>
        <p className="mt-2 text-[12.5px] leading-snug text-[#fbf6ec]/85">
          {tab === 'online'
            ? 'ონლაინ: ყველა თავის ტელეფონზე თამაშობს, რუკა და საქმეები ყველასთვის ერთია; ქულებს ტელეფონი ითვლის.'
            : 'ჰიბრიდული: ერთი ტელეფონი მაგიდის შუაშია — ვისი ჯერიცაა, ის ირჩევს; ნივთებს და ქულებს ტელეფონი ითვლის.'}
        </p>
        <p className="mt-2 text-[12px] leading-snug text-[#fbf6ec]/70">საქმეების ისტორიული ცნობები Claude-მა დაწერა — მასწავლებელს ჯერ არ შეუმოწმებია.</p>
      </section>

      <Tabs cols={2} value={tab} onChange={setTab} items={[{ id: 'online', label: 'ონლაინ', Icon: Wifi }, { id: 'table', label: 'ჰიბრიდული', Icon: Users }]} />

      {tab === 'online' ? (
        <RoomSetup
          game="okros"
          Icon={MapIcon}
          user={user}
          isAdmin={isAdmin}
          classes={mine}
          session={session}
          closeMine={okrosRooms.host.close}
          hostLine="ოთახს შენ ხსნი და შენც თამაშობ (ან მხოლოდ უძღვები). კლასის წევრებს მოწვევა მიუვათ ჩატში და ტელეფონზე; თამაშობს 2–4, დანარჩენები უყურებენ."
          other="ჰიბრიდული — ერთი ტელეფონით, მაგიდის შუაში"
          onEnter={(c, r) => { void enter(c, r); }}
          onResume={() => setRoomOpen(true)}
        />
      ) : <OkrosTable />}

      <Rules />
      <Works />
    </div>
  );
};

export default OkrosGame;
