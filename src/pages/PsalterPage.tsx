import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, arrayRemove, collection, doc, updateDoc } from 'firebase/firestore';
import { BookOpen, Plus, Users, Bell, Info, LogOut, Loader2, LayoutGrid, Settings2, PenLine } from 'lucide-react';
import { db } from '../firebase';
import { useAuth, useNavigation } from '../context';
import { Avatar, Bar, Btn, Card, CardTitle, Empty, FIELD, Flash, Label, PageTop, Pill, Sheet, Tabs, Toggle, useFlash } from '../components/ui/kit';
import { KathismaGrid, SlotSheet } from '../components/psalter/GroupBoard';
import { MyKathismaCard } from '../components/psalter/MyKathismaCard';
import { GroupHistory } from '../components/psalter/GroupHistory';
import { GroupManage } from '../components/psalter/GroupManage';
import { useKathismaActions } from '../components/psalter/useKathismaActions';
import { openPsalterGroup, useSelectedGroupId } from '../components/psalter/selectedGroup';
import { PsalterGroup, useGroupNow, useMyPsalterGroups } from '../hooks/usePsalter';
import { KATHISMA_COUNT, cycleOf, georgiaToday, kathismasOf, readCount } from '../utils/psalter';
import { fullName, hasGeorgianName, isGeorgian, saveProfileName, useProfileName } from '../utils/memberName';
import { pushSupported, setGroupPush, useGroupPush } from '../utils/groupPush';

export { openPsalterGroup };

// "ფსალმუნთა ჯგუფი" (from the home page's „მედავითნეობა“): the group reads the whole Psalter in every
// cycle; each member has a kathisma, the board shows all twenty, the teacher manages the group.
export const PsalterPage: React.FC = () => {
  const { user, isTeacher, isAdmin } = useAuth();
  const { handleGoBack } = useNavigation();
  const { groups, loading } = useMyPsalterGroups(user?.uid);
  const selectedId = useSelectedGroupId();
  const group = groups.find(g => g.id === selectedId) || groups[0] || null;
  const [creating, setCreating] = useState(false);

  return (
    <div className="w-full max-w-2xl mx-auto px-1 py-4 sm:py-6 space-y-5 pb-14 text-[#2a2017]">
      <PageTop
        title="ფსალმუნთა ჯგუფი"
        subtitle={group ? group.name : 'მედავითნეობა — ერთად ვკითხულობთ ფსალმუნს'}
        onBack={handleGoBack}
        right={isTeacher && groups.length > 0 ? <Btn size="sm" kind="ghost" icon={<Plus />} onClick={() => setCreating(true)}>ახალი</Btn> : undefined}
      />

      {!user ? (
        <Empty icon={<BookOpen />} title="ფსალმუნთა ჯგუფი" text="ჯგუფში ყოველი წევრი თავის კანონს კითხულობს და ერთად მთელ ფსალმუნს ასრულებენ. შედი ანგარიშში, რომ შენი ჯგუფი ნახო." />
      ) : loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-[#7a2028]" /></div>
      ) : groups.length === 0 ? (
        <>
          <Empty
            icon={<BookOpen />}
            title="ჯერ ფსალმუნთა ჯგუფში არ ხარ"
            text={isTeacher ? 'შექმენი ჯგუფი, დაამატე წევრები და გაუნაწილე 20 კანონი.' : 'მასწავლებელი დაგამატებს ჯგუფში — მერე აქ გამოჩნდება შენი კანონი.'}
            action={isTeacher ? <Btn icon={<Plus />} onClick={() => setCreating(true)}>ჯგუფის შექმნა</Btn> : undefined}
          />
          <HowItWorks />
        </>
      ) : (
        <>
          {groups.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {groups.map(g => (
                <button key={g.id} type="button" onClick={() => openPsalterGroup(g.id)}
                  className={`shrink-0 h-10 px-4 rounded-full text-sm font-bold cursor-pointer transition ${g.id === group?.id ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426]'}`}>
                  {g.name}
                </button>
              ))}
            </div>
          )}
          {group && <GroupView key={group.id} group={group} canLead={isAdmin || group.teacherIds.includes(user.uid)} />}
        </>
      )}

      <CreateGroupSheet open={creating} onClose={() => setCreating(false)} />
    </div>
  );
};

const GroupView: React.FC<{ group: PsalterGroup; canLead: boolean }> = ({ group, canLead }) => {
  const { user } = useAuth();
  const uid = user!.uid;
  const [view, setView] = useState<'group' | 'manage'>('group');
  const { cycle, slots, owners } = useGroupNow(group, uid);
  const actions = useKathismaActions(group, cycle);
  const [picked, setPicked] = useState<number | null>(null);
  const isMember = group.memberIds.includes(uid);
  const read = readCount(slots);

  if (!cycle) return null;

  return (
    <div className="space-y-4">
      {canLead && (
        <Tabs cols={2} value={view} onChange={setView} items={[
          { id: 'group', label: 'ჯგუფი', Icon: LayoutGrid },
          { id: 'manage', label: 'მართვა', Icon: Settings2 },
        ]} />
      )}

      {view === 'manage' && canLead ? (
        <GroupManage key={group.id} group={group} onDeleted={() => setView('group')} />
      ) : (
        <>
          {isMember && <NameNotice group={group} />}
          <MyKathismaCard group={group} uid={uid} />

          <Card>
            <CardTitle
              icon={<LayoutGrid />}
              title="ამ ციკლის კითხვა"
              hint={read === KATHISMA_COUNT ? 'მთელი ფსალმუნი წაკითხულია — დიდება ღმერთს!' : `წაიკითხეს ${read} / ${KATHISMA_COUNT} · დარჩა ${KATHISMA_COUNT - read}`}
              right={<span className="font-serif-ge text-2xl font-bold text-[#7a2028] tabular-nums">{read}<span className="text-base text-[#b3a594]">/20</span></span>}
            />
            <div className="mb-4"><Bar value={read} max={KATHISMA_COUNT} tone={read === KATHISMA_COUNT ? 'green' : 'wine'} /></div>
            <KathismaGrid group={group} slots={slots} owners={owners} uid={uid} onPick={setPicked} />
            <Flash flash={actions.message} onClose={actions.clearMessage} />
          </Card>

          <MembersCard group={group} owners={owners} />
          {isMember && <RemindersCard />}
          <GroupHistory group={group} current={cycle} />
          <HowItWorks />
          {isMember && !canLead && <LeaveGroup group={group} />}

          <SlotSheet
            group={group}
            cycle={cycle}
            k={picked}
            slot={picked ? slots[picked] : undefined}
            owners={picked ? owners[picked] || [] : []}
            uid={uid}
            isLeader={canLead}
            isMember={isMember}
            actions={actions}
            onClose={() => setPicked(null)}
          />
        </>
      )}
    </div>
  );
};

/** The group prays for its members by name: ask for it in Georgian when it isn't yet. */
const NameNotice: React.FC<{ group: PsalterGroup }> = ({ group }) => {
  const { user } = useAuth();
  const profile = useProfileName(user?.uid);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState({ firstName: '', lastName: '', churchName: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (profile) setName(profile); }, [profile]);
  const entry = group.members.find(m => m.uid === user?.uid);
  if (!profile || !entry || (hasGeorgianName(profile) && isGeorgian(entry.name))) return null;

  const save = async () => {
    if (!hasGeorgianName(name)) { setError('სახელი და გვარი ქართული ასოებით ჩაწერე.'); return; }
    if (name.churchName && !isGeorgian(name.churchName)) { setError('მოსახსენებელი სახელიც ქართულად.'); return; }
    setSaving(true);
    try {
      await saveProfileName(user!.uid, name, user!.photoURL || '');
      setOpen(false);
    } catch {
      setError('ვერ შეინახა. სცადე ხელახლა.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-amber-50 ring-1 ring-amber-200 text-left cursor-pointer hover:bg-amber-100/70 transition">
        <span className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0"><PenLine className="w-5 h-5" /></span>
        <span className="flex-1 min-w-0">
          <span className="block font-bold text-amber-950 text-sm">ჩაწერე სახელი და გვარი ქართულად</span>
          <span className="block text-[13px] text-amber-900/80">ჯგუფი წევრებს სახელით მოიხსენიებს — ახლა შენ „{entry.name}“ ხარ.</span>
        </span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="სახელი მოსახსენებლად"
        footer={<Btn full size="lg" onClick={save} disabled={saving}>{saving ? 'ინახება…' : 'შენახვა'}</Btn>}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div><Label>სახელი</Label><input className={FIELD} value={name.firstName} onChange={e => setName(n => ({ ...n, firstName: e.target.value }))} placeholder="ნინო" /></div>
            <div><Label>გვარი</Label><input className={FIELD} value={name.lastName} onChange={e => setName(n => ({ ...n, lastName: e.target.value }))} placeholder="ბერიძე" /></div>
          </div>
          <div><Label hint="თუ განსხვავდება">ნათლობის სახელი</Label><input className={FIELD} value={name.churchName} onChange={e => setName(n => ({ ...n, churchName: e.target.value }))} placeholder={name.firstName || 'ნინო'} /></div>
          {hasGeorgianName(name) && <p className="text-[13px] text-[#75685a]">ჯგუფში ასე გამოჩნდები: <b>{fullName(name)}</b></p>}
          {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
        </div>
      </Sheet>
    </>
  );
};

const MembersCard: React.FC<{ group: PsalterGroup; owners: Record<number, string[]> }> = ({ group, owners }) => (
  <Card>
    <CardTitle icon={<Users />} title={`წევრები · ${group.members.length}`} hint={group.teachers.length ? `ხელმძღვანელი: ${group.teachers.map(t => t.name).join(', ')}` : undefined} />
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {group.members.map(m => {
        const ks = kathismasOf(owners, m.uid);
        return (
          <li key={m.uid} className="flex items-center gap-3 p-2.5 rounded-2xl bg-white ring-1 ring-[#efe3cf]">
            <Avatar name={m.name} photo={m.photoURL} size={36} />
            <span className="flex-1 min-w-0 text-sm font-semibold text-[#2a2017] truncate">{m.name}</span>
            {ks.length ? <Pill>კ. {ks.join(', ')}</Pill> : <Pill tone="muted">მარაგი</Pill>}
          </li>
        );
      })}
    </ul>
  </Card>
);

const RemindersCard: React.FC = () => {
  const settings = useGroupPush();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const toggle = async (on: boolean) => {
    setBusy(true);
    setError(await setGroupPush({ ...settings, psalter: on }));
    setBusy(false);
  };
  return (
    <Card>
      <CardTitle icon={<Bell />} title="შეხსენებები" hint="ამ მოწყობილობაზე, საიტი დახურულიც რომ იყოს" />
      <Toggle
        on={settings.psalter}
        disabled={busy || !pushSupported()}
        onChange={toggle}
        label="ფსალმუნთა ჯგუფის შეხსენებები"
        hint="საღამოს — თუ დღეს არ წაგიკითხავს; ციკლის ბოლოს — თუ კანონი წაუკითხავია; 1 და 15 რიცხვში — შენი ახალი კანონი; როცა შენს კანონს ვინმე აიღებს ან ჯგუფს დახმარება სჭირდება."
      />
      {!pushSupported() && <p className="mt-1 text-xs text-[#8a7a6a]">ეს ბრაუზერი შეტყობინებებს ვერ მიიღებს. iPhone-ზე ჯერ დაამატე საიტი მთავარ ეკრანზე.</p>}
      {error && <p className="mt-1 text-xs font-semibold text-[#9a3324]">{error}</p>}
    </Card>
  );
};

const HowItWorks: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <Card tone="paper">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 text-left cursor-pointer">
        <span className="w-10 h-10 rounded-2xl bg-[#7a2028]/[0.08] text-[#7a2028] flex items-center justify-center shrink-0"><Info className="w-5 h-5" /></span>
        <span className="flex-1 font-serif-ge font-bold text-[#4a3426]">როგორ მუშაობს ჯგუფი</span>
        <span className="text-sm font-semibold text-[#7a2028]">{open ? 'დახურვა' : 'გახსნა'}</span>
      </button>
      {open && (
        <ul className="mt-3 space-y-2 text-[14px] leading-relaxed text-[#4a3426] list-disc pl-5 marker:text-[#7a2028]">
          <li>ჯგუფი ყოველ ციკლში (1 ან 2 დღე) მთელ ფსალმუნს კითხულობს: 20 კანონს — თითო წევრი თითოს.</li>
          <li>ყოველი თვის 1 და 15 რიცხვში ყველა თავისით გადადის შემდეგ კანონზე (7 → 8, 20 → 1). 10 თვეში ყველა ყველა კანონს გაივლის.</li>
          <li>წაკითხვის შემდეგ დააჭირე „წავიკითხე“ — კანონის ბოლოს ან აქ. შემთხვევით მონიშვნა ციკლის ბოლომდე უქმდება.</li>
          <li>ვერ კითხულობ? დააჭირე „დახმარება მჭირდება“ — ჯგუფი დაინახავს და ვინმე აიღებს.</li>
          <li>ნებისმიერ წევრს შეუძლია სხვისი წაუკითხავი კანონი „აიღოს“. თუ ორი ერთად აიღებს, პირველს ერგება.</li>
          <li>ინტერნეტის გარეშე მონიშვნა ტელეფონში ინახება და კავშირის აღდგენისას იგზავნება. დრო საქართველოს დროით ითვლება.</li>
          <li>ყოველ „დიდებაზე“ კანონის ტექსტში ჯგუფის წევრების სახელები ჩანს მოსახსენებლად.</li>
        </ul>
      )}
    </Card>
  );
};

const LeaveGroup: React.FC<{ group: PsalterGroup }> = ({ group }) => {
  const { user } = useAuth();
  const [error, setError] = useState('');
  const leave = async () => {
    if (!user || !window.confirm(`გახვიდე ჯგუფიდან „${group.name}“? შენი კანონი თავისუფალი გახდება.`)) return;
    const mine = group.members.filter(m => m.uid === user.uid);
    try {
      await updateDoc(doc(db, 'psalterGroups', group.id), {
        memberIds: arrayRemove(user.uid),
        members: arrayRemove(...mine),
        assignment: Object.fromEntries(Object.entries(group.assignment).map(([k, list]) => [k, list.filter(u => u !== user.uid)])),
        updatedAt: new Date().toISOString(),
      });
    } catch {
      setError('ვერ გახვედი. სცადე ხელახლა.');
    }
  };
  return (
    <div className="pt-1 text-center">
      <Btn kind="danger" size="sm" icon={<LogOut />} onClick={leave}>ჯგუფიდან გასვლა</Btn>
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  );
};

/** A teacher starts a group: name and cycle length; members and kathismas come next, under „მართვა“. */
export const CreateGroupSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { user } = useAuth();
  const msg = useFlash();
  const [name, setName] = useState('');
  const [days, setDays] = useState<1 | 2>(2);
  const [saving, setSaving] = useState(false);
  const today = georgiaToday();
  const half = useMemo(() => cycleOf(today, days).half, [today, days]);

  const create = async () => {
    if (!user) return;
    if (!name.trim()) { msg.fail('დაარქვი ჯგუფს სახელი.'); return; }
    setSaving(true);
    try {
      const me = { uid: user.uid, name: user.displayName || 'მასწავლებელი', photoURL: user.photoURL || '' };
      const ref = await addDoc(collection(db, 'psalterGroups'), {
        name: name.trim(),
        teacherIds: [user.uid],
        teachers: [me],
        memberIds: [],
        members: [],
        assignment: {},
        baseHalf: half,
        cycleDays: days,
        startDate: today,
        remindDaily: '20:00',
        remindFinal: '21:00',
        createdAt: new Date().toISOString(),
        createdBy: user.uid,
      });
      openPsalterGroup(ref.id);
      setName('');
      onClose();
    } catch {
      msg.fail('ჯგუფი ვერ შეიქმნა.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="ახალი ფსალმუნთა ჯგუფი"
      footer={<Btn full size="lg" icon={<Plus />} onClick={create} disabled={saving}>{saving ? 'იქმნება…' : 'შექმნა'}</Btn>}>
      <div className="space-y-4">
        <div><Label>სახელი</Label><input className={FIELD} value={name} onChange={e => setName(e.target.value)} placeholder="მაგ: წმ. ნინოს სახელობის ჯგუფი" autoFocus /></div>
        <div>
          <Label hint="ამ დროში 20-ვე კანონი იკითხება">ციკლი</Label>
          <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-white ring-1 ring-[#e8dcc8]">
            {([1, 2] as const).map(n => (
              <button key={n} type="button" onClick={() => setDays(n)}
                className={`h-11 rounded-xl text-sm font-bold cursor-pointer ${days === n ? 'bg-[#7a2028] text-[#fbf6ec]' : 'text-[#4a3426]'}`}>{n} დღე</button>
            ))}
          </div>
        </div>
        <p className="text-[13px] text-[#8a7a6a]">შექმნის შემდეგ „მართვაში“ დაამატე წევრები და გაუნაწილე კანონები.</p>
        <Flash flash={msg.flash} onClose={msg.clear} />
      </div>
    </Sheet>
  );
};
