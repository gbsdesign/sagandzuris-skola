import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Landmark, Users, Wifi } from 'lucide-react';
import { useAuth } from '../../context';
import { useMyClasses, useTeachingClasses } from '../../hooks/useClasses';
import { Card, Tabs, askConfirm } from '../../components/ui/kit';
import { RoomSetup, meOf } from '../../components/games/RoomSetup';
import { useOpenRequest } from '../../utils/searchOpen';
import { kariRooms, useKariRoom } from '../../utils/gameRoomFirestore';
import { ACTS, ROLES, type Role } from '../../utils/mepisKari';
import { KariRoom } from './kari/Room';
import { KariTable } from './kari/Table';
import { ACT_DOES, ROLE_LOOK } from './kari/look';
import { HowTo } from '../../components/games/HowTo';

// „მეფის კარი“ on phones (games hub, 2026-11-04): the printed Coup of the school (src/print/games/mepis-kari.js) gets
// its two app variants. Online: a class's room, everybody on their own phone with two hidden cards, the bluff in the game's
// call (utils/kariRoom.ts over utils/mepisKari.ts; the opener may play too). Hybrid: the printed cards in hand, one phone
// keeps the coins, the turns and the order (pages/games/kari/Table.tsx). The tab is kept on the device (`sg-kari-tab`).

type Tab = 'online' | 'table';

/** how a game goes on phones, in steps (2026-11-04, the games' review: the dark card and the table's card said it twice) */
const HOW: Record<Tab, string[]> = {
  online: [
    'ყველა თავის ტელეფონზე ხედავს თავის ორ ბარათს; თეთრს და რიგს ტელეფონი ითვლის.',
    'შენს სვლაზე ერთ მოქმედებას აცხადებ; სხვებს შეუძლიათ თქვან „არ მჯერა!“ ან დაგიბლოკონ.',
    'ბლეფი თამაშის ზარში მიდის. იგებს, ვინც ბოლოს კარზე დარჩება.',
  ],
  table: [
    'ყველას ხელში დაბეჭდილი ბარათებია; ტელეფონი მაგიდის შუაშია ან ერთს უჭირავს.',
    'ვისი სვლაცაა, ის მოქმედებას აცხადებს; ტელეფონზე აჭერენ, რასაც მაგიდა ამბობს.',
    'თუ თქვეს „არ მჯერა!“, მოთამაშემ ბარათი უნდა აჩვენოს — ტელეფონი იკითხავს, აჩვენა თუ არა.',
    'თეთრს, რიგს და წესრიგს ტელეფონი ითვლის. იგებს, ვინც ბოლოს კარზე დარჩება.',
  ],
};
const TAB_KEY = 'sg-kari-tab';
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
        <div className="mt-2 space-y-3 text-[13px] leading-snug text-[#4a3426]">
          <p>ორი ფარული ბარათი ორი გავლენაა კარზე. ვინც ორივეს დაკარგავს, კარს ტოვებს; ბოლო დარჩენილი იმარჯვებს. შენს სვლაზე ერთ მოქმედებას აცხადებ — კარისკაცის მოქმედებას ბარათის გარეშეც, ბლეფით.</p>
          <ul className="space-y-1.5">
            {ACTS.map((a, i) => {
              const role = a.claim >= 0 ? ROLES[a.claim as Role] : null;
              const look = a.claim >= 0 ? ROLE_LOOK[a.claim as Role] : null;
              return (
                <li key={i} className="flex flex-wrap items-baseline gap-x-1.5">
                  <b>{a.name}</b><span className="text-[#75685a]">{ACT_DOES[i]}</span>
                  {role && look && <span className="text-[12px] font-bold" style={{ color: look.color }}>· {role.name}</span>}
                  {a.blockers.length > 0 && <span className="text-[12px] text-[#75685a]">· ბლოკავს {a.blockers.map(r => ROLES[r].name).join(' ან ')}</span>}
                </li>
              );
            })}
          </ul>
          <p><b>„არ მჯერა!“</b> — როცა ვინმე კარისკაცს აცხადებს, მოქმედებისთვის ან ბლოკისთვის. ბარათი აქვს — აჩვენებს, ახალს იღებს და ეჭვის მთქმელი გავლენას კარგავს; არ აქვს — თვითონ კარგავს, მოქმედება ჩაიშალა და გადახდილი თეთრი ბრუნდება.</p>
          <p>რიგი: განცხადება → ეჭვი → ბლოკი → ეჭვი ბლოკზე → შედეგი. 10 თეთრით სვლის დასაწყისში დარბაზი სავალდებულოა.</p>
        </div>
      )}
    </Card>
  );
};

const KariGame: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const uid = user?.uid || '';
  const member = useMyClasses(uid);
  const { classes: teaching } = useTeachingClasses(uid || null);
  const mine = useMemo(
    () => [...member, ...teaching.filter(t => !member.some(m => m.id === t.id))].sort((a, b) => a.name.localeCompare(b.name, 'ka')),
    [member, teaching],
  );
  const session = useKariRoom();
  const [roomOpen, setRoomOpen] = useState(false);
  const showRoom = roomOpen && !!session;
  const [tabPick, setTabPick] = useState<Tab | null>(readTab);
  const tab: Tab = tabPick ?? (uid ? 'online' : 'table');
  const setTab = (t: Tab) => { setTabPick(t); try { localStorage.setItem(TAB_KEY, t); } catch { /* private mode */ } };
  const joinWish = useRef<{ key: string; at: number } | null>(null);
  const opened = useRef('');
  const [nudge, setNudge] = useState(0);
  useEffect(() => { kariRooms.setVisible(showRoom); }, [showRoom]);
  useEffect(() => () => kariRooms.setVisible(false), []);

  /** into a room (an invitation, a row of the list, a new room): one room at a time on this phone */
  const enter = async (classId: string, roomId: string) => {
    if (!user) return;
    const cur = kariRooms.get();
    if (cur && (cur.classId !== classId || cur.roomId !== roomId) && cur.room?.host === uid && cur.room.status !== 'over') {
      const ok = await askConfirm({ title: 'შენს ოთახს ტოვებ?', text: 'შენი ტელეფონი ითვლის თამაშს: სანამ არ დაბრუნდები, დაგვიანებულს ვერავინ უპასუხებს. ოთახი ამ გვერდზე დაგხვდება.', ok: 'გადასვლა' });
      if (!ok) return;
    }
    kariRooms.open(classId, roomId, meOf(user, mine.find(c => c.id === classId)));
    joinWish.current = { key: `${classId}/${roomId}`, at: Date.now() };
    setRoomOpen(true);
    if (tab !== 'online') setTab('online');
  };
  // the hub's variant buttons ask for a tab; an invitation names its room („classId/roomId“)
  useOpenRequest('kari', id => {
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
    if (s.room.host !== s.me.uid || mineNew) { opened.current = s.roomId; void kariRooms.join(meOf(user, cls)); }
  }, [session, mine, nudge, user]);

  if (showRoom && session) {
    return (
      <KariRoom
        snap={session}
        who={user ? meOf(user, mine.find(c => c.id === session.classId)) : undefined}
        className={mine.find(c => c.id === session.classId)?.name ?? ''}
        onHide={() => setRoomOpen(false)}
      />
    );
  }

  return (
    <div className="w-full max-w-2xl space-y-4">
      <Card tone="wine" className="!p-4 sm:!p-5">
        <p className="font-serif-ge text-[17px] font-bold leading-snug">მეფის კარი</p>
        <p className="mt-1.5 text-[12.5px] leading-snug text-[#fbf6ec]/85">
          თამარ მეფის კარი: ხაზინადარი, მანდატური, სპასალარი, მსახურთუხუცესი და რუსუდან დედოფალი. ორი ფარული ბარათი გაქვს —
          მათ ძალას იყენებ ან იტყუები, სხვები კი ან გენდობიან, ან იტყვიან: „არ მჯერა!“ ბოლო, ვინც კარზე დარჩება, იმარჯვებს.
        </p>
      </Card>

      <Tabs cols={2} value={tab} onChange={setTab} items={[{ id: 'online', label: 'ონლაინ', Icon: Wifi }, { id: 'table', label: 'ჰიბრიდული', Icon: Users }]} />
      <HowTo key={tab} id={`kari-${tab}`} steps={HOW[tab]} />

      {tab === 'online' ? (
        <RoomSetup
          game="kari"
          Icon={Landmark}
          user={user}
          isAdmin={isAdmin}
          classes={mine}
          session={session}
          closeMine={kariRooms.host.close}
          hostLine="ოთახს შენ ხსნი და შენც თამაშობ (ან მხოლოდ უძღვები). კლასის წევრებს მოწვევა მიუვათ ჩატში და ტელეფონზე; თამაშობს 2–8."
          other="ჰიბრიდული — დაბეჭდილი ბარათებით და ერთი ტელეფონით"
          onEnter={(c, r) => { void enter(c, r); }}
          onResume={() => setRoomOpen(true)}
        />
      ) : <KariTable />}

      <Rules />
    </div>
  );
};

export default KariGame;
