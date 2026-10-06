import React, { useMemo, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, updateDoc, arrayUnion } from 'firebase/firestore';
import { Settings2, Users, Shuffle, Save, Trash2, UserPlus, UserMinus, Pencil, AlertTriangle, LayoutGrid } from 'lucide-react';
import { db } from '../../firebase';
import { useAuth } from '../../context';
import { Avatar, Btn, Card, CardTitle, FIELD, Flash, IconBtn, Label, Pill, useFlash } from '../ui/kit';
import { PeoplePicker, Person } from '../people/PeoplePicker';
import { useDirectory, shownName, shownPrayerName } from '../../utils/directory';
import { hasGeorgianName } from '../../utils/memberName';
import { KATHISMA_PSALMS, autoDistribute, cycleOf, georgiaToday, kathismasOf, ownersIn, rebase } from '../../utils/psalter';
import { ALL_KATHISMAS, GroupMember, PsalterGroup, firstName } from '../../hooks/usePsalter';

const TIMES = ['', '18:00', '19:00', '20:00', '21:00', '22:00'];

// The teacher's side of a psalter group: settings, members, and who reads which kathisma.
export const GroupManage: React.FC<{ group: PsalterGroup; onDeleted: () => void }> = ({ group, onDeleted }) => {
  const { user, isTeacher } = useAuth();
  const msg = useFlash();
  const { people, loading } = useDirectory(isTeacher);
  const [picking, setPicking] = useState(false);
  const [editK, setEditK] = useState<number | null>(null);
  const half = cycleOf(georgiaToday(), group.cycleDays).half;
  const [owners, setOwners] = useState<Record<number, string[]>>(() => ownersIn(group.assignment, group.baseHalf, half));
  const [dirty, setDirty] = useState(false);
  const [settings, setSettings] = useState({ name: group.name, cycleDays: group.cycleDays, remindDaily: group.remindDaily, remindFinal: group.remindFinal });
  const [saving, setSaving] = useState(false);
  const ref = doc(db, 'psalterGroups', group.id);

  const memberPeople: Person[] = group.members.map(m => ({ uid: m.uid, name: m.name, photoURL: m.photoURL }));
  const directory: Person[] = people.map(p => ({
    uid: p.uid,
    name: shownName(p),
    photoURL: p.photoURL,
    sub: hasGeorgianName(p) ? undefined : 'ქართული სახელი პროფილში ჯერ არ აქვს',
  }));

  const unowned = ALL_KATHISMAS.filter(k => !(owners[k] || []).length);
  const load = useMemo(() => Object.fromEntries(group.memberIds.map(u => [u, kathismasOf(owners, u).length])), [owners, group.memberIds]);
  const reserve = group.members.filter(m => !load[m.uid]);

  const saveMembers = async (uids: string[]) => {
    const keep = group.members.filter(m => uids.includes(m.uid));
    const added: GroupMember[] = uids
      .filter(u => !group.memberIds.includes(u))
      .map(u => {
        const p = people.find(x => x.uid === u);
        return { uid: u, name: p ? shownName(p) : 'წევრი', prayer: p ? shownPrayerName(p) : '', photoURL: p?.photoURL || '' };
      });
    const removed = group.memberIds.filter(u => !uids.includes(u));
    const nextOwners = Object.fromEntries(ALL_KATHISMAS.map(k => [k, (owners[k] || []).filter(u => !removed.includes(u))]));
    try {
      await updateDoc(ref, {
        members: [...keep, ...added],
        memberIds: [...keep, ...added].map(m => m.uid),
        // a member who leaves frees their kathisma until the teacher names someone else
        ...(removed.length ? { assignment: rebase(nextOwners), baseHalf: half } : {}),
        updatedAt: new Date().toISOString(),
      });
      if (removed.length) setOwners(nextOwners);
      msg.ok(`წევრები განახლდა${added.length ? ` · დაემატა ${added.length}` : ''}${removed.length ? ` · გავიდა ${removed.length}` : ''}.`);
    } catch {
      msg.fail('წევრები ვერ შეინახა.');
    }
  };

  const removeMember = (m: GroupMember) => {
    if (!window.confirm(`ამოვიყვანო ${m.name} ჯგუფიდან? მისი კანონი თავისუფალი გახდება.`)) return;
    void saveMembers(group.memberIds.filter(u => u !== m.uid));
  };

  const addMyself = async () => {
    if (!user) return;
    const p = people.find(x => x.uid === user.uid);
    const me: GroupMember = { uid: user.uid, name: p ? shownName(p) : user.displayName || 'მასწავლებელი', prayer: p ? shownPrayerName(p) : '', photoURL: user.photoURL || '' };
    await updateDoc(ref, { members: arrayUnion(me), memberIds: arrayUnion(user.uid), updatedAt: new Date().toISOString() })
      .then(() => msg.ok('შენც ჯგუფის წევრი ხარ — ახლა კანონი მიიღე განაწილებაში.'))
      .catch(() => msg.fail('ვერ დაემატე.'));
  };

  const saveAssignment = async () => {
    setSaving(true);
    try {
      await updateDoc(ref, { assignment: rebase(owners), baseHalf: half, updatedAt: new Date().toISOString() });
      setDirty(false);
      msg.ok('განაწილება შენახულია. 1 და 15 რიცხვში ყველა თავისით გადავა შემდეგ კანონზე.');
    } catch {
      msg.fail('განაწილება ვერ შეინახა.');
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async () => {
    if (!settings.name.trim()) { msg.fail('ჯგუფს სახელი სჭირდება.'); return; }
    try {
      await updateDoc(ref, { ...settings, name: settings.name.trim(), updatedAt: new Date().toISOString() });
      msg.ok('პარამეტრები შენახულია.');
    } catch {
      msg.fail('ვერ შეინახა.');
    }
  };

  const removeGroup = async () => {
    if (!window.confirm(`წავშალო ჯგუფი „${group.name}“ მთელი ისტორიით? ამის დაბრუნება შეუძლებელია.`)) return;
    try {
      const cycles = await getDocs(collection(db, 'psalterGroups', group.id, 'cycles'));
      await Promise.all(cycles.docs.map(d => deleteDoc(d.ref)));
      await deleteDoc(ref);
      onDeleted();
    } catch {
      msg.fail('ჯგუფი ვერ წაიშალა.');
    }
  };

  const settingsChanged =
    settings.name !== group.name || settings.cycleDays !== group.cycleDays || settings.remindDaily !== group.remindDaily || settings.remindFinal !== group.remindFinal;

  return (
    <div className="space-y-4">
      <Flash flash={msg.flash} onClose={msg.clear} />

      {/* members */}
      <Card>
        <CardTitle
          icon={<Users />}
          title={`წევრები · ${group.members.length}`}
          hint="დაამატე რეგისტრირებული მომხმარებლები; ვინც ჯგუფიდან გავა, მისი კანონი თავისუფალი ხდება."
        />
        <div className="flex flex-wrap gap-2 mb-3">
          <Btn icon={<UserPlus />} onClick={() => setPicking(true)}>წევრების დამატება</Btn>
          {user && !group.memberIds.includes(user.uid) && <Btn kind="ghost" onClick={addMyself}>მეც ვკითხულობ</Btn>}
        </div>
        {group.members.length === 0 ? (
          <p className="text-sm text-[#8a7a6a]">ჯგუფში ჯერ არავინაა.</p>
        ) : (
          <ul className="divide-y divide-[#efe3cf]">
            {group.members.map(m => {
              const ks = kathismasOf(owners, m.uid);
              return (
                <li key={m.uid} className="flex items-center gap-3 py-2.5">
                  <Avatar name={m.name} photo={m.photoURL} size={38} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold text-[#2a2017] truncate">{m.name}</span>
                    <span className="block text-xs text-[#8a7a6a]">
                      {ks.length ? `კანონი ${ks.join(', ')}` : 'მარაგში'}
                      {!/^[ა-ჿ\s-]+$/.test(m.name) && <span className="text-[#9a3324]"> · სახელი ქართულად არ წერია</span>}
                    </span>
                  </span>
                  <IconBtn label="ჯგუფიდან ამოყვანა" tone="danger" onClick={() => removeMember(m)}><UserMinus /></IconBtn>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* distribution */}
      <Card>
        <CardTitle
          icon={<LayoutGrid />}
          title="კანონების განაწილება"
          hint="ვინ რომელ კანონს კითხულობს ამ ნახევარ თვეში. ერთ კანონს შეიძლება ორი კითხულობდეს, ერთს — ორი კანონი ერგებოდეს."
        />
        {(unowned.length > 0 || reserve.length > 0) && (
          <div className="mb-3 p-3 rounded-2xl bg-amber-50 ring-1 ring-amber-200 text-[13px] text-amber-900 space-y-1">
            {unowned.length > 0 && (
              <p className="flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> უპატრონო კანონები: <b>{unowned.join(', ')}</b> — დაუნიშნე ვინმეს (შეიძლება ერთს ორი კანონი).</p>
            )}
            {reserve.length > 0 && <p>მარაგში: {reserve.map(m => firstName(m.name)).join(', ')} — ეხმარებიან აღებით, ან დაუნიშნე კანონი მეორე მკითხველად.</p>}
          </div>
        )}
        <div className="flex flex-wrap gap-2 mb-3">
          <Btn kind="ghost" icon={<Shuffle />} disabled={!group.members.length} onClick={() => {
            const ids = [...group.members].sort((a, b) => a.name.localeCompare(b.name, 'ka')).map(m => m.uid);
            if (Object.values(owners).some(l => l.length) && !window.confirm('არსებული განაწილება შეიცვლება. გავაგრძელო?')) return;
            setOwners(autoDistribute(ids));
            setDirty(true);
          }}>ავტომატური განაწილება</Btn>
          <Btn icon={<Save />} disabled={!dirty || saving} onClick={saveAssignment}>{saving ? 'ინახება…' : 'შენახვა'}</Btn>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ALL_KATHISMAS.map(k => {
            const list = owners[k] || [];
            return (
              <li key={k}>
                <button
                  type="button"
                  onClick={() => setEditK(k)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-2xl text-left cursor-pointer transition ${list.length ? 'bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40' : 'bg-amber-50/60 ring-1 ring-dashed ring-amber-300 border border-dashed border-amber-300'}`}
                >
                  <span className="w-10 h-10 rounded-xl bg-[#7a2028]/[0.08] text-[#7a2028] font-serif-ge font-bold text-lg flex items-center justify-center tabular-nums shrink-0">{k}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[#2a2017] truncate">
                      {list.length ? list.map(u => group.members.find(m => m.uid === u)?.name || 'წევრი').join(', ') : 'არავინ'}
                    </span>
                    <span className="block text-xs text-[#8a7a6a]">ფს. {KATHISMA_PSALMS[k - 1]}</span>
                  </span>
                  <Pencil className="w-4 h-4 text-[#b3a594] shrink-0" />
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* settings */}
      <Card>
        <CardTitle icon={<Settings2 />} title="პარამეტრები" />
        <div className="space-y-4">
          <div>
            <Label>ჯგუფის სახელი</Label>
            <input className={FIELD} value={settings.name} onChange={e => setSettings(s => ({ ...s, name: e.target.value }))} />
          </div>
          <div>
            <Label hint="ამ დროში 20-ვე კანონი უნდა წაიკითხონ">ციკლის ხანგრძლივობა</Label>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-white ring-1 ring-[#e8dcc8]">
              {([1, 2] as const).map(n => (
                <button key={n} type="button" onClick={() => setSettings(s => ({ ...s, cycleDays: n }))}
                  className={`h-11 rounded-xl text-sm font-bold cursor-pointer transition-colors ${settings.cycleDays === n ? 'bg-[#7a2028] text-[#fbf6ec]' : 'text-[#4a3426] hover:bg-[#7a2028]/5'}`}>
                  {n === 1 ? '1 დღე' : '2 დღე'}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>ყოველდღიური შეხსენება</Label>
              <select className={FIELD} value={settings.remindDaily} onChange={e => setSettings(s => ({ ...s, remindDaily: e.target.value }))}>
                {TIMES.map(t => <option key={t} value={t}>{t || 'გამორთული'}</option>)}
              </select>
            </div>
            <div>
              <Label>ციკლის ბოლოს</Label>
              <select className={FIELD} value={settings.remindFinal} onChange={e => setSettings(s => ({ ...s, remindFinal: e.target.value }))}>
                {TIMES.map(t => <option key={t} value={t}>{t || 'გამორთული'}</option>)}
              </select>
            </div>
          </div>
          <p className="text-xs text-[#8a7a6a] leading-relaxed">შეხსენება მიდის მხოლოდ მათთან, ვისაც კანონი ჯერ წაკითხული არ აქვს. დრო საქართველოს დროით ითვლება.</p>
          <Btn icon={<Save />} disabled={!settingsChanged} onClick={saveSettings}>შენახვა</Btn>
        </div>
      </Card>

      <div className="pt-1">
        <Btn kind="danger" icon={<Trash2 />} onClick={removeGroup}>ჯგუფის წაშლა</Btn>
      </div>

      <PeoplePicker
        open={picking}
        onClose={() => setPicking(false)}
        title="ჯგუფის წევრები"
        people={directory}
        selected={group.memberIds}
        loading={loading}
        onDone={saveMembers}
        empty="ჯერ არავინ დარეგისტრირებულა."
      />
      <PeoplePicker
        open={editK !== null}
        onClose={() => setEditK(null)}
        title={editK ? `კანონი ${editK} — ვინ კითხულობს` : ''}
        people={memberPeople}
        selected={editK ? owners[editK] || [] : []}
        doneLabel="არჩევა"
        empty="ჯერ წევრები დაამატე."
        onDone={uids => { if (editK) { setOwners(o => ({ ...o, [editK]: uids })); setDirty(true); } }}
      />
    </div>
  );
};
