import React, { useEffect, useState } from 'react';
import {
  BarChart3, Bell, CalendarDays, Check, Crown, Download, GraduationCap, Headphones, Image, Info, KeyRound, LayoutGrid,
  Loader2, MessageCircle, Pencil, Phone, Send, Shield, Sparkles, User, UserPlus,
} from 'lucide-react';
import { useAuth } from '../../../context';
import {
  Area, Avatar, Button, Dot, Field, Helper, Note, Pill, Row, Rows, SectionLabel, Sheet, Toggle, ToggleRow, TopBar, WrapChips,
} from '../../../components/ui2';
import { hideNav } from '../../../design/newLook';
import { sendAnnouncement } from '../../../components/admin/Announce';
import { ROLES } from '../../../components/admin/RolesFold';
import { ALL_ALBUMS, isAlbumOn } from '../../../components/admin/AlbumRights';
import { FAIL } from '../../../components/admin/CentreDownload';
import { changed } from '../../../components/admin/changed';
import type { UserRecord } from '../../../components/admin/UsersTab';
import { AiRulesSheet } from '../../../components/aiLesson/AiRulesSheet';
import { useEveryoneAlbums } from '../../../data/albumAccess';
import { EXTRA_SWITCHES, SECTIONS } from '../../../data/sections';
import { useSections } from '../../../hooks/useSections';
import { setCentreEveryone, setCentreMember, useCentreDownloadSettings } from '../../../hooks/useCentreDownload';
import { setSongTextEditor, useSongTextEditors } from '../../../hooks/useSongTexts';
import { setChurchContactViewer, useChurchContactViewers } from '../../../hooks/useChurchExtras';
import { saveGooglePlacesKey, useGooglePlacesKey } from '../../../hooks/useGooglePhotos';
import { setAdminPush, useAdminPush, type AdminPush } from '../../../utils/adminPush';
import { monthCounts } from '../../../utils/growth';
import { tbilisiToday } from '../../../utils/hangi';
import { useAdmin } from './ctx';
import { schoolItem, type SchoolPart } from './nav';
import { Screen } from './parts';
import { ChevIcon } from './Home';
import { SchoolAlbums } from './Albums';
import { SectionsScreen } from './Sections';
import { ErrorsScreen, LogScreen, NumbersScreen, TopScreen } from './Numbers';
import { kaName } from '../../../utils/georgianName';

/** ⚙ „სკოლა“ (x-skola) and each of its pages: the school's settings, a line each, every line its own page. */
export const SchoolRoute: React.FC<{ part: SchoolPart | null }> = ({ part }) => {
  let body: React.ReactNode;
  switch (part) {
    case 'announce': body = <AnnounceScreen />; break;
    case 'notices': body = <NoticesScreen />; break;
    case 'sections': body = <SectionsScreen />; break;
    case 'rights': body = <RightsScreen />; break;
    case 'albums': body = <AlbumsScreen />; break;
    case 'google': body = <GoogleScreen />; break;
    case 'roles': body = <RolesScreen />; break;
    case 'numbers': body = <NumbersScreen />; break;
    case 'top': body = <TopScreen />; break;
    case 'log': body = <LogScreen />; break;
    case 'errors': body = <ErrorsScreen />; break;
    default: body = <SchoolHome />;
  }
  // a computer: the settings stay a readable column
  return <div className="mx-auto w-full max-w-[720px]">{body}</div>;
};

const ALL_SWITCHES = [...SECTIONS.map(s => s.id), ...EXTRA_SWITCHES.map(s => s.id)];

/** x-skola — the same groups as the old window, a line each. */
const SchoolHome: React.FC = () => {
  const { user, isSuperAdmin } = useAuth();
  const { d, go, back, say } = useAdmin();
  const [aiRules, setAiRules] = useState(false);
  const sections = useSections();
  const push = useAdminPush(user?.uid);
  const albums = useEveryoneAlbums().rights;
  const key = useGooglePlacesKey();
  const centre = useCentreDownloadSettings();
  const writers = useSongTextEditors();
  const viewers = useChurchContactViewers();

  const open = ALL_SWITCHES.filter(id => sections.state[id] === 'open').length;
  const soon = ALL_SWITCHES.filter(id => sections.state[id] === 'soon').length;
  const pushOn = [isSuperAdmin && push.waiting && 'ახალი წევრი', push.weekly && 'ორშაბათი'].filter(Boolean).join(', ');
  const albumsOn = ALL_ALBUMS.filter(a => isAlbumOn(albums[a[0]])).length;
  const rights = [centre.everyone ? 'ჩამოწერა ყველას' : centre.uids.length ? `ჩამოწერა ${centre.uids.length}` : '',
    writers.length ? `ტექსტები ${writers.length}` : '', viewers.length ? `კონტაქტები ${viewers.length}` : ''].filter(Boolean).join(' · ');
  const newThisMonth = monthCounts(d.users.map(u => u.createdAt), tbilisiToday()).pop()?.n ?? 0;
  const row = (part: SchoolPart, icon: React.ReactNode, title: string, sub?: string) => (
    <Row lead={<Dot icon={icon} />} title={title} sub={sub} onClick={() => go(schoolItem(part))} />
  );

  return (
    <Screen>
      <TopBar title="სკოლა" onBack={back} />
      <SectionLabel label="შეტყობინებები" />
      <Rows>
        {row('announce', <MessageCircle />, 'განცხადება კლასებს', d.classes.length ? `ერთად ${d.classes.length} კლასის ჩათში` : 'კლასი ჯერ არ არის')}
        {row('notices', <Bell />, 'შეტყობინება ტელეფონზე', pushOn ? `ჩართულია: ${pushOn}` : 'გამორთულია')}
      </Rows>
      <SectionLabel label="წყობა" />
      <Rows>
        {row('sections', <LayoutGrid />, 'განყოფილებები', `${open} ღია${soon ? ` · ${soon} მალე` : ''}`)}
        {row('rights', <KeyRound />, 'დამატებითი უფლებები', rights || 'წევრებიდან არავის')}
        {row('albums', <Headphones />, 'ალბომები', albumsOn ? `ყველა წევრს: ${albumsOn}` : 'წევრებს ჯერ არცერთი არ უჩანთ')}
        {row('google', <Image />, 'Google-ის ფოტოები', key === undefined ? undefined : key ? 'ჩართულია' : 'გამორთულია')}
        {row('roles', <Shield />, 'ვის რა შეუძლია')}
      </Rows>
      <SectionLabel label="სწავლება და ციფრები" />
      <Rows>
        <Row lead={<Dot icon={<Sparkles />} />} title="ავტომატური სასწავლო პროგრამა" sub="წესები და ბიუჯეტი" onClick={() => setAiRules(true)} />
        {row('numbers', <BarChart3 />, 'სკოლის ზრდა', `ამ თვეში ${newThisMonth} ახალი · ჟურნალები · ასლი`)}
      </Rows>
      <AiRulesSheet open={aiRules} onClose={() => setAiRules(false)} onMessage={say} />
    </Screen>
  );
};

/** The sticky bottom of a page with one main button (the bottom menu steps aside meanwhile). */
const Bottom: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => hideNav(), []);
  return <div className="sticky bottom-0 -mx-4 mt-auto bg-page px-4 pt-2 pb-[max(16px,env(safe-area-inset-bottom))]">{children}</div>;
};

const MAX = 2000;

/** x-skola-gantskhadeba — one text, to which classes, „გაგზავნა“: the admin's own message in each chosen class's chat. */
const AnnounceScreen: React.FC = () => {
  const { user } = useAuth();
  const { d, back, say } = useAdmin();
  const [text, setText] = useState('');
  const [off, setOff] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const to = d.classes.filter(c => !off.has(c.id));
  const send = async () => {
    const sent = await sendAnnouncement(text, to, user, say, () => setSending(true));
    setSending(false);
    if (sent) setText('');
  };
  return (
    <Screen className="min-h-[calc(100dvh-24px)] pb-0">
      <TopBar title="განცხადება კლასებს" onBack={back} />
      {d.classes.length === 0 ? <Helper>გამოყენებაში კლასი ჯერ არ არის.</Helper> : (
        <>
          <Area label="განცხადების ტექსტი" hideLabel value={text} onChange={v => setText(v.slice(0, MAX))} rows={4}
            placeholder="მაგ: კვირას წირვის შემდეგ საერთო რეპეტიცია გვაქვს ტაძრის ეზოში." />
          <SectionLabel label={`ვის · ${to.length} / ${d.classes.length}`} />
          <WrapChips label="ვის" value={to.map(c => c.id)}
            onChange={next => setOff(new Set(d.classes.filter(c => !next.includes(c.id)).map(c => c.id)))}
            items={d.classes.map(c => ({ id: c.id, label: c.name }))} />
          <Note>ერთი ტექსტი მივა ყველა არჩეული კლასის ჩატში — შენი სახელით.{text.length > MAX - 200 ? ` ${text.length}/${MAX}` : ''}</Note>
          <Bottom>
            <Button full icon={sending ? <Loader2 className="animate-spin" /> : <Send />} onClick={() => void send()}
              disabled={sending || !text.trim() || !to.length}>
              {sending ? 'იგზავნება…' : `გაგზავნა ${to.length} კლასს`}
            </Button>
          </Bottom>
        </>
      )}
    </Screen>
  );
};

/** x-skola-shetyobinebebi — the admin's own phone notices: a newcomer waiting (superadmins), Monday's look at the week. */
const NoticesScreen: React.FC = () => {
  const { user, isSuperAdmin } = useAuth();
  const { back, say } = useAdmin();
  const saved = useAdminPush(user?.uid);
  const [busy, setBusy] = useState(false);
  const set = async (next: Partial<AdminPush>) => {
    setBusy(true);
    const err = await setAdminPush({ ...saved, ...next });
    setBusy(false);
    if (err) say(err, 'error');
  };
  return (
    <Screen>
      <TopBar title="ადმინის შეტყობინებები" onBack={back} />
      <Rows>
        {isSuperAdmin && (
          <ToggleRow lead={<Dot icon={<UserPlus />} />} title="ახალი წევრი ელოდება" sub="შეხებით მისი გვერდი იხსნება"
            on={saved.waiting} disabled={busy} onChange={v => void set({ waiting: v })} />
        )}
        <ToggleRow lead={<Dot icon={<CalendarDays />} />} title="ორშაბათის მიმოხილვა" sub="ორშაბათს 10:00"
          on={saved.weekly} disabled={busy} onChange={v => void set({ weekly: v })} />
      </Rows>
      <Note>მიმოხილვაში: ახალი წევრები, აქტიური და კლასები, რომლებსაც კვირაში გაკვეთილი არ ჰქონიათ.</Note>
      <Helper icon={<Info />}>მოვა ყველა მოწყობილობაზე, სადაც ჩართავ. iPhone-ზე — მხოლოდ მთავარ ეკრანზე დამატებული საიტიდან.</Helper>
    </Screen>
  );
};

type RightId = 'centre' | 'texts' | 'church';

/** x-skola-uplebebi — three rights beyond a member's, a line each; a tap shows who has it (and „ყველა წევრს“ where it is). */
const RightsScreen: React.FC = () => {
  const { d, back, say } = useAdmin();
  const centre = useCentreDownloadSettings();
  const writers = useSongTextEditors();
  const viewers = useChurchContactViewers();
  const [open, setOpen] = useState<RightId | null>(null);
  const people = (uids: string[]) => d.users.filter(u => uids.includes(u.userId)).sort((a, b) => a.name.localeCompare(b.name, 'ka'));
  const saving = people(centre.uids);
  const writing = people(writers);
  const seeing = people(viewers);
  const who = (n: number) => `წევრებიდან: ${n ? `${n}` : 'არავის'}`;
  const failSave = () => say(FAIL, 'error');
  const nameOf = (u: UserRecord) => u.name || kaName(u.displayName) || u.email;

  const RIGHTS: { id: RightId; icon: React.ReactNode; title: string; sub: string; note: string; list: UserRecord[]; off: (u: UserRecord) => void }[] = [
    {
      id: 'centre', icon: <Download />, title: 'ცენტრის ჩანაწერების ჩამოწერა', sub: centre.everyone ? 'ყველა წევრს' : who(saving.length),
      note: 'მასწავლებლებს და ადმინებს ყოველთვის აქვთ.', list: centre.everyone ? [] : saving,
      off: u => setCentreMember(u.userId, false).then(
        () => changed('right', `${nameOf(u)} — ცენტრის ჩანაწერების ჩამოწერა გამოირთო`, u.userId, () => setCentreMember(u.userId, true)), failSave),
    },
    {
      id: 'texts', icon: <Pencil />, title: 'სიმღერის ტექსტის ჩაწერა', sub: who(writing.length),
      note: 'ადმინებს ყოველთვის შეუძლიათ.', list: writing,
      off: u => setSongTextEditor(u.userId, false).then(
        () => changed('right', `${nameOf(u)} — სიმღერის ტექსტის ჩაწერა გამოირთო`, u.userId, () => setSongTextEditor(u.userId, true)), failSave),
    },
    {
      id: 'church', icon: <Phone />, title: 'ტაძრების კონტაქტების ნახვა', sub: who(seeing.length),
      note: '„ეკლესია-მონასტრებში“ · ადმინები ყოველთვის ხედავენ.', list: seeing,
      off: u => setChurchContactViewer(u.userId, false).then(
        () => changed('right', `${nameOf(u)} — ტაძრების კონტაქტების ნახვა გამოირთო`, u.userId, () => setChurchContactViewer(u.userId, true)), failSave),
    },
  ];
  const r = RIGHTS.find(x => x.id === open);

  return (
    <Screen>
      <TopBar title="დამატებითი უფლებები" onBack={back} />
      <Rows>
        {RIGHTS.map(x => <Row key={x.id} lead={<Dot icon={x.icon} />} title={x.title} sub={x.sub} wrap onClick={() => setOpen(x.id)} />)}
      </Rows>
      <Helper icon={<Info />}>ადმინებს სამივე ყოველთვის აქვთ; ჩამოწერა — მასწავლებლებსაც.</Helper>
      <Note>ცალკე წევრს უფლებას მის გვერდზე ურთავ: „წევრები“ → სახელი → „როლი და უფლებები“.</Note>

      <Sheet open={!!r} onClose={() => setOpen(null)} title={r?.title || ''}>
        {r && (
          <>
            {r.id === 'centre' && (
              <Rows>
                <ToggleRow title="ყველა წევრს" sub="ახლაც და ვინც მერე მოვა" on={centre.everyone}
                  onChange={v => setCentreEveryone(v).then(
                    () => changed('right', `ცენტრის ჩანაწერების ჩამოწერა ყველა წევრს ${v ? 'ჩაირთო' : 'გამოირთო'}`, '', () => setCentreEveryone(!v)), failSave)} />
              </Rows>
            )}
            <Note>{r.note}</Note>
            {r.id === 'centre' && centre.everyone ? null : r.list.length === 0 ? <Helper>წევრებიდან ჯერ არავის.</Helper> : (
              <>
                <SectionLabel label={`ვის აქვს · ${r.list.length}`} />
                <Rows>
                  {r.list.map(u => (
                    <Row key={u.userId} lead={<Avatar name={u.name} photo={u.photoURL || undefined} />} title={nameOf(u)}
                      right={<Toggle on label={`${nameOf(u)} — გამორთვა`} onChange={() => r.off(u)} />} />
                  ))}
                </Rows>
              </>
            )}
          </>
        )}
      </Sheet>
    </Screen>
  );
};

/** x-skola-albomebi — every album with one value for every member. */
const AlbumsScreen: React.FC = () => {
  const { back } = useAdmin();
  return (
    <Screen>
      <TopBar title="ალბომები" sub="ყველა წევრისთვის" onBack={back} />
      <SchoolAlbums />
    </Screen>
  );
};

/** x-skola-google — Google's Places key, pasted once; never shown back whole. */
const GoogleScreen: React.FC = () => {
  const { back, say } = useAdmin();
  const key = useGooglePlacesKey();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const has = !!key;
  const save = async () => {
    setSaving(true);
    try {
      await saveGooglePlacesKey(value.trim());
      setEditing(false);
      setValue('');
      say('Google-ის გასაღები შეინახა — ტაძრების ფანჯრებში Google Maps-ის ფოტოები და საათებიც ჩანს.', 'success');
    } catch {
      say('გასაღები ვერ შეინახა — სცადე ხელახლა.', 'error');
    } finally {
      setSaving(false);
    }
  };
  const asking = !has || editing;
  return (
    <Screen className={asking ? 'min-h-[calc(100dvh-24px)] pb-0' : undefined}>
      <TopBar title="Google-ის ფოტოები" onBack={back} />
      {key === undefined ? <Helper>იტვირთება…</Helper> : !asking ? (
        <Rows>
          <Row lead={<Dot icon={<Check />} color="leaf" />} title="გასაღები ჩასმულია" sub={`…${key!.slice(-4)} · ტაძრებში ფოტოები და საათები ჩანს`}
            right={<Button kind="soft" size="md" onClick={() => setEditing(true)}>შეცვლა</Button>} />
        </Rows>
      ) : (
        <>
          <Note>ჩასვი Google-ის გასაღები (Places API) და შეინახე.</Note>
          <Field label="გასაღები" value={value} onChange={setValue} placeholder="AIza…" autoComplete="off" spellCheck={false} autoFocus={editing} />
        </>
      )}
      <Helper icon={<Info />}>
        გასაღები Google Cloud-ში მზადდება (Places API (New)). ფოტოები არ ინახება — ყოველ გახსნაზე Google-იდან მოდის ავტორის სახელით;
        თვეში 1 000 ფოტოს ჩვენება უფასოა. საათები, საიტი და ტელეფონი ტაძრის ფანჯრის ღილაკით იტვირთება — თვეში 1 000 დაჭერა უფასოა,
        მერე თითო ≈ 5 თეთრი.
      </Helper>
      {key !== undefined && asking && (
        <Bottom>
          <div className="flex gap-2.5">
            {has && <Button kind="ghost" onClick={() => { setEditing(false); setValue(''); }}>გაუქმება</Button>}
            <Button full icon={saving ? <Loader2 className="animate-spin" /> : <Check />} onClick={() => void save()}
              disabled={saving || value.trim().length < 20} className="min-w-0 flex-1">
              {saving ? 'ინახება…' : 'შენახვა'}
            </Button>
          </div>
        </Bottom>
      )}
    </Screen>
  );
};

// a role's one sentence on its line (the full list opens on a tap) and its mark
const ROLE_LINE: Record<string, { line: string; icon: React.ReactNode }> = {
  owner: { line: 'სკოლის დამფუძნებელი, ერთადერთი', icon: <Crown /> },
  superadmin: { line: 'უშვებს ახალ წევრებს, ნიშნავს ადმინებს', icon: <Shield /> },
  admin: { line: 'კლასები, წევრები და განყოფილებები', icon: <KeyRound /> },
  teacher: { line: 'მხოლოდ თავის კლასებში', icon: <GraduationCap /> },
  member: { line: 'ჩვეულებრივი წევრი', icon: <User /> },
};

/** x-skola-rolebi — five roles, a line each; a tap unfolds everything the role may do. */
const RolesScreen: React.FC = () => {
  const { isOwner, isSuperAdmin } = useAuth();
  const { back } = useAdmin();
  const [open, setOpen] = useState<string | null>(null);
  const mine = isOwner ? 'owner' : isSuperAdmin ? 'superadmin' : 'admin';
  const role = ROLES.find(r => r.id === open);
  return (
    <Screen>
      <TopBar title="ვის რა შეუძლია" onBack={back} />
      <Note>ყოველ როლს შეუძლია ყველაფერი, რაც მის ქვემოთ მდგომს.</Note>
      <Rows>
        {ROLES.map(r => (
          <Row key={r.id} lead={<Dot icon={ROLE_LINE[r.id]?.icon ?? <User />} />} title={r.name} sub={ROLE_LINE[r.id]?.line ?? r.who}
            onClick={() => setOpen(r.id)}
            right={r.id === mine ? <span className="flex shrink-0 items-center gap-2"><Pill>შენ</Pill><ChevIcon /></span> : undefined} />
        ))}
      </Rows>
      <Helper icon={<Info />}>როლი იცვლება წევრების სიაში, ადამიანის გვერდზე — „როლი და უფლებები“.</Helper>
      <Sheet open={!!role} onClose={() => setOpen(null)} title={role?.name || ''}>
        {role && (
          <>
            <Note>{role.who}</Note>
            <ul className="flex shrink-0 flex-col divide-y divide-line overflow-hidden rounded-card bg-surf">
              {role.can.map(line => (
                <li key={line} className="flex items-start gap-3 px-4 py-3 text-body leading-snug">
                  <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-leaf" />
                  <span className="min-w-0 wrap-break-word">{line}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Sheet>
    </Screen>
  );
};
