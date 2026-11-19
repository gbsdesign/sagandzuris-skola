import React, { useEffect, useState } from 'react';
import {
  BookOpenCheck, CalendarCheck, Check, Copy, DoorOpen, Dumbbell, Ellipsis, Gem, GraduationCap, IdCard, KeyRound, ListChecks,
  MessageCircle, Pencil, Phone, Plus, ShieldAlert, ShieldCheck, Undo2, Users, X, Disc3, Baby,
} from 'lucide-react';
import { ROLE_LABEL, useNavigation } from '../../../context';
import {
  Avatar, Button, Card, Choice, Dot, Duo, Helper, Note, Pill, RoundButton, Row, Rows, SectionLabel, Sheet, Stats, Tiles, TopBar,
  ToggleRow, WrapChips, Area,
} from '../../../components/ui2';
import { hideNav } from '../../../design/newLook';
import { usePersonActions, roleName, VOICE, useAttendanceOf } from '../../../components/admin/PersonSheet';
import type { UserRecord } from '../../../components/admin/UsersTab';
import { FAIL } from '../../../components/admin/CentreDownload';
import { changed } from '../../../components/admin/changed';
import { StudentProfileCard } from '../../../components/views/StudentProfileCard';
import { setCentreMember, useCentreDownloadSettings } from '../../../hooks/useCentreDownload';
import { setSongTextEditor, useSongTextEditors } from '../../../hooks/useSongTexts';
import { setChurchContactViewer, useChurchContactViewers } from '../../../hooks/useChurchExtras';
import { openAdminThread } from '../../../hooks/useDirectChat';
import { SECTIONS } from '../../../data/sections';
import { ALL_FEATURES, FEATURE_GROUPS, type FeatureId } from '../../../utils/memberAccess';
import { NOTE_MAX, saveAdminNote, useAdminNote } from '../../../utils/adminNotes';
import { showPhone } from '../../../utils/profileFields';
import { shortDate } from '../../../utils/dateNames';
import { errorText } from '../../../utils/errorText';
import type { SchoolClass } from '../../../hooks/useClasses';
import { useAdmin } from './ctx';
import { personItem, type PersonSub } from './nav';
import { FactRow, PersonRow, Screen, agoWords } from './parts';
import { MemberAlbumsV2 } from './Albums';

const telOf = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

/** x-adamiani · x-adamiani-elodeba and their inner pages: one person of the school. */
export const PersonRoute: React.FC<{ uid: string; sub: PersonSub | null; msg: React.ReactNode }> = ({ uid, sub, msg }) => {
  const { d, back } = useAdmin();
  const u = d.users.find(x => x.userId === uid);
  if (!u) {
    return (
      <Screen>
        <TopBar title="ადამიანი" onBack={back} />
        {msg}
        <Helper>{d.loading ? 'იტვირთება…' : 'ეს ადამიანი სიაში ვერ მოიძებნა.'}</Helper>
      </Screen>
    );
  }
  // a decision (let in, refused) starts the window afresh, as the old one did
  return <PersonInner key={`${uid}-${d.access[uid]?.status || ''}`} u={u} sub={sub} msg={msg} />;
};

type P = ReturnType<typeof usePersonActions>;

const PersonInner: React.FC<{ u: UserRecord; sub: PersonSub | null; msg: React.ReactNode }> = ({ u, sub, msg }) => {
  const { d, go, back, say, fail, twins } = useAdmin();
  const p = usePersonActions({
    person: u, users: d.users, staff: d.staff, classes: d.classes, access: d.access[u.userId], decision: d.decisions[u.userId],
    onClose: back, onMessage: say, fail,
  });
  const leftSince = d.left.since[u.userId] || (d.left.uids.has(u.userId) ? '—' : undefined);
  const head = (title: React.ReactNode, sub2?: React.ReactNode, right?: React.ReactNode) => (
    <><TopBar title={title} sub={sub2} onBack={back} right={right} />{msg}</>
  );
  const props = { u, p, head };
  if (sub === 'data') return <DataSub {...props} />;
  if (sub === 'classes') return <ClassesSub {...props} />;
  if (sub === 'role') return <RoleSub {...props} />;
  if (sub === 'access') return <AccessSub {...props} />;
  if (sub === 'note') return <Screen>{head('ჩანიშვნა', u.name)}<NoteEditor uid={u.userId} nameOf={p.nameOf} by={p.user?.email?.toLowerCase() || ''} /></Screen>;
  if (sub === 'albums') return <Screen>{head('ალბომები', u.name)}<MemberAlbumsV2 uid={u.userId} name={u.name} /></Screen>;
  if (sub === 'edit') {
    return (
      <Screen>
        {head('პროფილის რედაქტირება', u.name)}
        <Card pad="sm"><StudentProfileCard key={u.userId} member={{ uid: u.userId, email: u.email, displayName: u.displayName, photoURL: u.photoURL }} /></Card>
      </Screen>
    );
  }
  const twinList = (twins.get(u.userId) || []).map(t => ({ ...t, person: d.users.find(x => x.userId === t.uid) }))
    .filter((t): t is { uid: string; why: 'phone' | 'name'; person: UserRecord } => !!t.person);
  const twinCard = twinList.length > 0 && (
    <Card className="flex flex-col gap-2 bg-gold-tint">
      <p className="flex items-center gap-2 text-body font-bold text-gold-ink"><Copy className="size-[18px] shrink-0" /> შესაძლო ორმაგი ანგარიში</p>
      <p className="text-meta leading-snug text-gold-ink">ერთი ადამიანია? ზედმეტი მონიშნე გასულად. სხვადასხვა ადამიანია? დააჭირე „სხვა ადამიანია“.</p>
      {twinList.map(t => (
        <div key={t.uid} className="flex flex-col gap-2 rounded-tile bg-surf p-1">
          <PersonRow u={t.person} sub={`${t.why === 'phone' ? 'იგივე ტელეფონი' : 'იგივე სახელი და გვარი'} · ${t.person.email || 'ელფოსტა არ არის'}`}
            onClick={() => go(personItem(t.uid))} className="rounded-tile" />
          <div className="flex flex-wrap gap-2 px-2 pb-2">
            <Button kind="soft" size="md" icon={<Check />} disabled={p.busy} onClick={() => void p.markTwo(t.uid, t.person.name)}>სხვა ადამიანია</Button>
            <Button kind="ghost" size="md" icon={<DoorOpen />} disabled={p.busy} onClick={() => void p.markTwinLeft(t.uid, t.person.name)}>ზედმეტია — გასულად</Button>
          </div>
        </div>
      ))}
    </Card>
  );
  if (p.waiting || p.refused) return <Newcomer {...props} twinCard={twinCard} />;
  return <Admitted {...props} twinCard={twinCard} leftSince={leftSince} />;
};

type SubProps = { u: UserRecord; p: P; head: (title: React.ReactNode, sub?: React.ReactNode, right?: React.ReactNode) => React.ReactNode };

/** x-adamiani — who it is, three numbers, write or call, and four lines that open the rest. */
const Admitted: React.FC<SubProps & { twinCard: React.ReactNode; leftSince?: string }> = ({ u, p, head, twinCard, leftSince }) => {
  const { go, say } = useAdmin();
  const { openDm } = useNavigation();
  const [more, setMore] = useState(false);
  const note = useAdminNote(u.userId).note;
  const att = useAttendanceOf(u.userId, p.memberOf.map(c => c.id));
  const voices = u.voices.map(v => VOICE[v] || v).join(', ');
  const who = [roleName(u, p.role), voices, u.city || u.region].filter(Boolean).join(' · ');
  // writing to them: the administration's chat with this member
  const write = async () => {
    try { openDm(await openAdminThread({ uid: u.userId, name: u.name, photoURL: u.photoURL })); }
    catch (e) { say('ჩათი ვერ გაიხსნა: ' + errorText(e), 'error'); }
  };
  const facts = [u.phone && 'ტელეფონი', voices && 'ხმა', u.interests && 'ინტერესები', u.abilities && 'შესაძლებლობები'].filter(Boolean).join(', ');
  const classes = [...p.teaches, ...p.memberOf.filter(c => !p.teaches.includes(c))].map(c => c.name).join(', ');
  const me = u.userId === p.user?.uid;
  return (
    <Screen>
      {head(u.name, `ბოლოს შემოვიდა: ${agoWords(u.lastActiveAt)}`, <RoundButton label="მეტი" onClick={() => setMore(true)}><Ellipsis /></RoundButton>)}
      <Card className="flex items-center gap-4">
        <Avatar name={u.name} photo={u.photoURL || undefined} size={64} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="text-head font-bold wrap-break-word">{u.name}</h2>
          {who && <p className="text-meta text-mut wrap-break-word">{who}</p>}
          {(leftSince || u.kidsMode?.on) && (
            <span className="flex flex-wrap gap-1.5">
              {leftSince && <Pill icon={<DoorOpen />}>გასული{leftSince !== '—' ? ` · ${shortDate(leftSince)}` : ''}</Pill>}
              {u.kidsMode?.on && <Pill icon={<Baby />}>საბავშვო რეჟიმი</Pill>}
            </span>
          )}
        </div>
      </Card>
      <Stats items={[
        { value: att ? `${att.came} / ${att.held}` : '—', label: 'დასწრება' },
        { value: u.activity.parts, label: 'ნასწავლი' },
        { value: u.activity.habitsWeek, label: 'ჩვევა ამ კვირას' },
      ]} />
      {!me && (
        <Duo>
          <Button icon={<MessageCircle />} onClick={() => void write()}>მიწერე</Button>
          {u.phone ? <Button kind="ghost" icon={<Phone />} href={telOf(u.phone)}>დარეკე</Button>
            : <Button kind="ghost" icon={<Phone />} disabled title="ტელეფონი არ წერია">დარეკე</Button>}
        </Duo>
      )}
      {twinCard}
      <Rows>
        <Row lead={<Dot icon={<IdCard />} />} title="მონაცემები" sub={facts || 'პროფილს ჯერ ავსებს'} onClick={() => go(personItem(u.userId, 'data'))} />
        <Row lead={<Dot icon={<Users />} />} title="კლასები" sub={classes || 'კლასში ჯერ არ არის'} onClick={() => go(personItem(u.userId, 'classes'))} />
        <Row lead={<Dot icon={<ShieldCheck />} />} title="როლი და უფლებები" sub={roleName(u, p.role)} onClick={() => go(personItem(u.userId, 'role'))} />
        <Row lead={<Dot icon={<Pencil />} />} title="ჩანიშვნა" sub={note?.text || 'ხედავენ მხოლოდ ადმინები'} onClick={() => go(personItem(u.userId, 'note'))} />
      </Rows>

      <Sheet open={more} onClose={() => setMore(false)} title={u.name}>
        <Rows>
          <Row lead={<Dot icon={<Pencil />} />} title="პროფილის რედაქტირება" onClick={() => { setMore(false); go(personItem(u.userId, 'edit')); }} />
          {p.role === 'member' && (
            <ToggleRow lead={<Dot icon={<Baby />} />} title="საბავშვო რეჟიმი" on={p.kidsOn} onChange={v => void p.setKids(v)} wrap
              sub={`ჩანს: ${SECTIONS.filter(x => p.kidsSections.includes(x.id)).map(x => x.label).join(', ')}`} />
          )}
          {p.role === 'member' && (leftSince ? (
            <Row lead={<Dot icon={<Undo2 />} />} title="სკოლაში დაბრუნება" sub="სიებში და რიცხვებში ისევ გამოჩნდება" disabled={p.busy}
              onClick={() => { setMore(false); void p.markLeft(false); }} />
          ) : (
            <Row lead={<Dot icon={<DoorOpen />} />} title="გასულად მონიშვნა" wrap
              sub="აპი ისევ ეხსნება, სიებიდან, რიცხვებიდან და დაბადების დღეებიდან კი ქრება" disabled={p.busy}
              onClick={() => { setMore(false); void p.markLeft(true); }} />
          ))}
          {p.manageAccess && (
            <Row lead={<Dot icon={<ShieldAlert />} color="soft" />} title="დამატების შეფერხება" tone="danger" disabled={p.busy}
              sub="ანგარიშიდან გავა, სანამ არ დაუშვებ" onClick={() => { setMore(false); void p.refuse(); }} />
          )}
        </Rows>
      </Sheet>
    </Screen>
  );
};

/** x-adamiani-elodeba — a newcomer: who they are, one question (which class), „უარი“ or „დაშვება“ at the bottom. */
const Newcomer: React.FC<SubProps & { twinCard: React.ReactNode }> = ({ u, p, head, twinCard }) => {
  const { d, go } = useAdmin();
  useEffect(() => hideNav(), []);
  const a = d.access[u.userId];
  const status = p.waiting
    ? `ელოდება · ${agoWords(a?.requestedAt)}${(a?.attempts || 0) > 1 ? ` · შემოვიდა ${a?.attempts}-ჯერ` : ''}`
    : `შეფერხებულია · ${p.tries > 0 ? `შესვლის მცდელობა: ${p.tries}, ბოლოს ${agoWords(a?.lastAttemptAt)}` : agoWords(a?.decidedAt)}`;
  const facts: [string, React.ReactNode][] = ([
    ['სად ცხოვრობს', [u.city, u.region].filter(Boolean).join(', ')],
    ['ხმა', u.voices.map(v => VOICE[v] || v).join(', ')],
    ['შეუძლია', u.abilities],
    ['ტელეფონი', u.phone && <a href={telOf(u.phone)} className="underline decoration-dim underline-offset-2">{showPhone(u.phone)}</a>],
    ['დაბადება', u.birth],
    ['ინტერესები', u.interests],
    ['ელფოსტა', u.email],
  ] as [string, React.ReactNode][]).filter(([, v]) => v);
  const approve = p.none ? 'აირჩიეთ ერთი მაინც' : 'დაშვება';
  return (
    <Screen className="pb-0">
      {head(p.waiting ? 'ახალი წევრი' : 'შეფერხებული წევრი')}
      <Card className="flex items-center gap-4">
        <Avatar name={u.name} photo={u.photoURL || undefined} size={64} />
        <div className="min-w-0 flex-1">
          <h2 className="text-head font-bold wrap-break-word">{u.name}</h2>
          <p className={p.waiting ? 'text-meta text-gold-ink' : 'text-meta text-danger'}>{status}</p>
        </div>
      </Card>
      {facts.length ? <Rows>{facts.map(([k, v]) => <FactRow key={k} label={k}>{v}</FactRow>)}</Rows> : <Helper>პროფილს ჯერ ავსებს.</Helper>}
      {twinCard}
      {d.classes.length > 0 && (
        <>
          <SectionLabel label="რომელ კლასში?" right={<span className="text-meta text-mut">არჩევითი</span>} />
          <WrapChips label="კლასი" value={p.joinId ? [p.joinId] : []}
            onChange={next => p.setJoinId(next.find(x => x !== p.joinId) ?? null)}
            items={d.classes.map(c => ({ id: c.id, label: c.name }))} />
        </>
      )}
      <Rows>
        <Row lead={<Dot icon={<Pencil />} />} title="ჩანიშვნა და წვდომა" sub="იშვიათად გჭირდება" onClick={() => go(personItem(u.userId, 'access'))} />
      </Rows>
      <div className="sticky bottom-0 -mx-4 mt-auto bg-page px-4 pt-2 pb-[max(16px,env(safe-area-inset-bottom))]">
        {p.waiting ? (
          <Duo>
            <Button kind="ghost" icon={<X />} onClick={() => void p.refuse()} disabled={p.busy}>უარი</Button>
            <Button icon={<Check />} onClick={() => void p.decide('approved')} disabled={p.busy || p.none}>{approve}</Button>
          </Duo>
        ) : (
          <Button full icon={<Check />} onClick={() => void p.decide('approved')} disabled={p.busy || p.none}>{approve}</Button>
        )}
      </div>
    </Screen>
  );
};

/** „მონაცემები“ — every detail they gave, what they did in the app, who let them in. */
const DataSub: React.FC<SubProps> = ({ u, p, head }) => {
  const a = u.activity;
  const att = useAttendanceOf(u.userId, p.memberOf.map(c => c.id));
  const facts: [string, React.ReactNode][] = ([
    ['ელფოსტა', u.email],
    ['დაბადება', u.birth],
    ['ადგილი', [u.city, u.region].filter(Boolean).join(', ')],
    ['ტელეფონი', u.phone && <a href={telOf(u.phone)} className="underline decoration-dim underline-offset-2">{showPhone(u.phone)}</a>],
    ['ხმა', u.voices.map(v => VOICE[v] || v).join(', ')],
    ['შესაძლებლობები', u.abilities],
    ['ინტერესები', u.interests],
    ['პირველად შემოვიდა', u.createdAt ? shortDate(u.createdAt) : ''],
  ] as [string, React.ReactNode][]).filter(([, v]) => v);
  const tiles = [
    { icon: <Gem />, n: a.pearls, label: 'მარგალიტი' },
    { icon: <BookOpenCheck />, n: a.parts, label: 'ნასწავლი ნაწილი' },
    { icon: <ListChecks />, n: a.habitsWeek, label: 'ჩვევა ამ კვირაში' },
    { icon: <Dumbbell />, n: a.drills, label: 'სავარჯიშო' },
    ...(att ? [{ icon: <CalendarCheck />, n: `${att.came}/${att.held}`, label: 'დასწრება' }] : []),
  ];
  const nothing = !a.pearls && !a.parts && !a.habitsWeek && !a.drills && !att;
  return (
    <Screen>
      {head('მონაცემები', u.name)}
      {facts.length ? <Rows>{facts.map(([k, v]) => <FactRow key={k} label={k}>{v}</FactRow>)}</Rows> : <Helper>პროფილს ჯერ ავსებს.</Helper>}
      <SectionLabel label="აქტივობა" />
      {nothing ? <Helper>აპში ჯერ არაფერი გაუკეთებია.</Helper> : (
        <Tiles items={tiles.map(t => ({ lead: <Dot icon={t.icon} />, title: String(t.n), sub: t.label }))} />
      )}
      {p.letIn && <Note>{p.letIn}</Note>}
    </Screen>
  );
};

/** „კლასები“ — the classes they teach and the ones they are in; each opens its page; „კლასში დამატება“ adds one more. */
const ClassesSub: React.FC<SubProps> = ({ u, p, head }) => {
  const { openClass } = useNavigation();
  const [adding, setAdding] = useState(false);
  const row = (c: SchoolClass) => (
    <Row key={c.id} lead={<Avatar name={c.name} photo={c.logo || undefined} />} title={c.name} sub={`${c.members.length} წევრი`} onClick={() => openClass(c.id)} />
  );
  return (
    <Screen>
      {head('კლასები', u.name)}
      {p.teaches.length > 0 && <><SectionLabel label="ასწავლის" /><Rows>{p.teaches.map(row)}</Rows></>}
      {p.memberOf.length > 0 && <><SectionLabel label={p.teaches.length ? 'წევრია' : 'კლასები'} /><Rows>{p.memberOf.map(row)}</Rows></>}
      {!p.teaches.length && !p.memberOf.length && <Helper>კლასში ჯერ არ არის.</Helper>}
      {p.notIn.length > 0 && <Button kind="ghost" full icon={<Plus className="text-wine" />} onClick={() => setAdding(true)} disabled={p.busy}>კლასში დამატება</Button>}
      <Sheet open={adding} onClose={() => setAdding(false)} title="კლასში დამატება">
        <Rows>
          {p.notIn.map(c => (
            <Row key={c.id} lead={<Avatar name={c.name} photo={c.logo || undefined} />} title={c.name} sub={`${c.members.length} წევრი`}
              right={<Plus aria-hidden="true" className="size-5 shrink-0 text-wine" />} disabled={p.busy}
              onClick={() => void p.addTo(c).then(ok => { if (ok) setAdding(false); })} />
          ))}
        </Rows>
      </Sheet>
    </Screen>
  );
};

/** „როლი და უფლებები“ — the role (who may give which: PersonSheet's rules), the rights beyond a member's, albums, access. */
const RoleSub: React.FC<SubProps> = ({ u, p, head }) => {
  const { go, say } = useAdmin();
  const centre = useCentreDownloadSettings();
  const writers = useSongTextEditors();
  const viewers = useChurchContactViewers();
  const failSave = () => say(FAIL, 'error');
  const centreOn = centre.everyone || centre.uids.includes(u.userId);
  return (
    <Screen>
      {head('როლი და უფლებები', u.name)}
      {p.admitted && (
        <>
          <SectionLabel label="როლი" />
          {p.choices.length > 0 ? (
            <Rows role="radiogroup" aria-label="როლი">
              {p.choices.map(r => (
                <Choice key={r} title={ROLE_LABEL[r]} on={r === p.role} disabled={p.busy} onClick={() => { if (r !== p.role) void p.setRole(r); }} />
              ))}
            </Rows>
          ) : (
            <Rows><Row lead={<Dot icon={r0(p.role)} />} title={roleName(u, p.role)} sub="ამ როლს შენ ვერ შეცვლი" /></Rows>
          )}
          {p.roleSub && <Note>{p.roleSub}</Note>}
        </>
      )}
      {p.admitted && (p.role === 'member' || p.role === 'teacher') && (
        <>
          <SectionLabel label="დამატებითი უფლებები" />
          <Rows>
            {!p.isStaff && (
              <ToggleRow title="ცენტრის ჩანაწერების ჩამოწერა" on={centreOn} disabled={centre.everyone}
                sub={centre.everyone ? 'ყველა წევრს ჩართული აქვს (სკოლა)' : undefined}
                onChange={v => setCentreMember(u.userId, v).then(
                  () => changed('right', `${u.name} — ცენტრის ჩანაწერების ჩამოწერა ${v ? 'ჩაირთო' : 'გამოირთო'}`, u.userId, () => setCentreMember(u.userId, !v)), failSave)} />
            )}
            <ToggleRow title="სიმღერის ტექსტის ჩაწერა" on={writers.includes(u.userId)}
              onChange={v => setSongTextEditor(u.userId, v).then(
                () => changed('right', `${u.name} — სიმღერის ტექსტის ჩაწერა ${v ? 'ჩაირთო' : 'გამოირთო'}`, u.userId, () => setSongTextEditor(u.userId, !v)), failSave)} />
            <ToggleRow title="ტაძრების კონტაქტების ნახვა" on={viewers.includes(u.userId)}
              onChange={v => setChurchContactViewer(u.userId, v).then(
                () => changed('right', `${u.name} — ტაძრების კონტაქტების ნახვა ${v ? 'ჩაირთო' : 'გამოირთო'}`, u.userId, () => setChurchContactViewer(u.userId, !v)), failSave)} />
          </Rows>
        </>
      )}
      {p.admitted && (p.role === 'member' || p.manageAccess) && (
        <Rows>
          {p.role === 'member' && <Row lead={<Dot icon={<Disc3 />} />} title="ალბომები" sub="რომელ ალბომებს ისმენს და ინახავს" onClick={() => go(personItem(u.userId, 'albums'))} />}
          {p.manageAccess && (
            <Row lead={<Dot icon={<KeyRound />} />} title="წვდომა" sub={p.all ? 'ყველაფერზე' : `${p.picked.size} განყოფილება`} onClick={() => go(personItem(u.userId, 'access'))} />
          )}
        </Rows>
      )}
    </Screen>
  );
};

const r0 = (role: string) => (role === 'teacher' ? <GraduationCap /> : <ShieldCheck />);

/** „ჩანიშვნა და წვდომა“ (a newcomer) / „წვდომა“ (a member; superadmins): what they may open. */
const AccessSub: React.FC<SubProps> = ({ u, p, head }) => {
  const toggle = (id: FeatureId) => {
    const n = new Set(p.picked);
    if (n.has(id)) n.delete(id); else n.add(id);
    p.setAll(false);
    p.setPicked(n);
  };
  return (
    <Screen>
      {head(p.admitted ? 'წვდომა' : 'ჩანიშვნა და წვდომა', u.name)}
      {!p.admitted && <NoteEditor uid={u.userId} nameOf={p.nameOf} by={p.user?.email?.toLowerCase() || ''} />}
      {p.manageAccess ? (
        <>
          <SectionLabel label="წვდომა" />
          <Rows>
            <ToggleRow title="ყველაფერზე წვდომა" sub="ახლაც და რაც მერე დაემატება" on={p.all}
              onChange={on => { p.setAll(on); p.setPicked(new Set(ALL_FEATURES)); }} />
          </Rows>
          {!p.all && FEATURE_GROUPS.map(g => (
            <React.Fragment key={g.title}>
              <SectionLabel label={g.title} />
              <Rows>
                {g.items.map(it => <Choice key={it.id} multi title={it.label} sub={it.text} on={p.picked.has(it.id)} onClick={() => toggle(it.id)} />)}
              </Rows>
            </React.Fragment>
          ))}
          {!p.admitted && <Note>{p.none ? 'აირჩიე ერთი მაინც — მერე „დაშვება“ წინა გვერდზეა.' : 'არჩეული შეინახება „დაშვებისას“ — წინა გვერდზე.'}</Note>}
          {p.admitted && p.dirty && (
            <Duo>
              <Button kind="ghost" onClick={p.resetAccess} disabled={p.busy}>გაუქმება</Button>
              <Button icon={<Check />} onClick={() => void p.decide('approved')} disabled={p.busy || p.none}>{p.none ? 'აირჩიეთ ერთი მაინც' : 'შენახვა'}</Button>
            </Duo>
          )}
          {p.admitted && p.letIn && <Note>{p.letIn}</Note>}
          {p.admitted && (
            <Button kind="quiet" icon={<ShieldAlert />} className="self-start text-danger" onClick={() => void p.refuse()} disabled={p.busy}>დამატების შეფერხება</Button>
          )}
        </>
      ) : <Helper>წვდომას სუპერადმინი ირჩევს.</Helper>}
    </Screen>
  );
};

/** „ჩანიშვნა“: the admins' private note on the person; „შენახვა“ shows only while it differs from the saved one. */
const NoteEditor: React.FC<{ uid: string; nameOf: (email?: string) => string; by: string }> = ({ uid, nameOf, by }) => {
  const { note, loaded } = useAdminNote(uid);
  const saved = note?.text || '';
  const [text, setText] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { setText(saved); }, [saved]);
  const dirty = text.trim() !== saved;
  const save = async () => {
    setBusy(true);
    setErr('');
    try { await saveAdminNote(uid, text, by); } catch (e) { setErr('ვერ შეინახა: ' + errorText(e)); } finally { setBusy(false); }
  };
  return (
    <>
      <Area label="ჩანიშვნა" value={text} onChange={v => setText(v.slice(0, NOTE_MAX))} disabled={!loaded}
        placeholder="მაგ.: დაურეკე ოთხშაბათს · დედამ დაწერა, რომ…" />
      <Note>{note ? `${nameOf(note.by)}${note.at ? ` · ${shortDate(note.at)}` : ''}` : 'ხედავენ მხოლოდ ადმინები'}{dirty ? ` · ${text.length}/${NOTE_MAX}` : ''}</Note>
      {err && <p role="alert" className="px-1.5 text-meta text-danger">{err}</p>}
      {dirty && (
        <Duo>
          <Button kind="ghost" onClick={() => setText(saved)} disabled={busy}>გაუქმება</Button>
          <Button icon={<Check />} onClick={() => void save()} disabled={busy}>{text.trim() ? 'შენახვა' : 'წაშლა'}</Button>
        </Duo>
      )}
    </>
  );
};
