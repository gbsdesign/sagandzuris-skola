import React, { useState } from 'react';
import { arrayRemove, arrayUnion, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { Save, Shuffle, Trash2 } from 'lucide-react';
import { db } from '../../firebase';
import { useAuth } from '../../context';
import { askConfirm, Btn, FIELD, Flash, Label, Sheet, Toggle, useFlash } from '../ui/kit';
import type { SchoolClass } from '../../hooks/useClasses';
import { MAX_CYCLE_DAYS, autoDistribute, cycleOf, georgiaToday, halfIndex, kathismasOf, ownersIn, parseCycleDays, parseShiftDays, rebase } from '../../utils/psalter';
import { ALL_KATHISMAS, GroupMember, PsalterGroup } from '../../hooks/usePsalter';

const TIMES = ['', '18:00', '19:00', '20:00', '21:00', '22:00'];

// The leader's one window for a psalter group (the section's ✎): name, the cycle and its shift days, the two
// reminders, „მეც ვკითხულობ“ and „ავტომატური განაწილება“ (both saved at once), the group's deletion at the bottom.
// Who reads which kanon is named in the kanon's own window; the members are the class's (added and taken out there).
export const GroupSettingsSheet: React.FC<{ open: boolean; onClose: () => void; group: PsalterGroup; cls?: SchoolClass; onDeleted: () => void }> = ({ open, onClose, group, cls, onDeleted }) => {
  const { user } = useAuth();
  const msg = useFlash();
  const blank = () => ({
    name: group.name, cycleDays: String(group.cycleDays), shiftDays: group.shiftDays.join(', '), remindDaily: group.remindDaily, remindFinal: group.remindFinal,
  });
  const [settings, setSettings] = useState(blank);
  const ref = doc(db, 'psalterGroups', group.id);
  const half = cycleOf(georgiaToday(), group.cycleDays, group.shiftDays).half;
  const owners = ownersIn(group.assignment, group.baseHalf, half);
  const reading = !!user && group.memberIds.includes(user.uid);
  const close = () => { setSettings(blank()); msg.clear(); onClose(); };

  // the cycle length and shift days as typed
  const typedCycle = parseCycleDays(settings.cycleDays);
  const typedShift = parseShiftDays(settings.shiftDays);
  const cycleOk = typedCycle !== null, shiftOk = typedShift !== null;
  const cycleDays = typedCycle ?? group.cycleDays;
  const shiftDays = typedShift ?? group.shiftDays;
  const sameDays = shiftDays.join() === group.shiftDays.join();
  const changed =
    settings.name !== group.name || !cycleOk || !shiftOk || cycleDays !== group.cycleDays || !sameDays || settings.remindDaily !== group.remindDaily || settings.remindFinal !== group.remindFinal;

  const saveSettings = async () => {
    if (!settings.name.trim()) { msg.fail('ჯგუფს სახელი სჭირდება.'); return; }
    if (!cycleOk) { msg.fail(`ციკლი 1-დან ${MAX_CYCLE_DAYS} დღემდე შეიძლება.`); return; }
    if (!shiftOk) { msg.fail('გადასვლის რიცხვები 1-დან 28-მდე ჩაწერე, მძიმით: მაგ. 1, 15.'); return; }
    const today = georgiaToday();
    // a new rule may start the current cycle afresh: its „წავიკითხე“ marks then stay with the old one
    if (cycleOf(today, cycleDays, shiftDays).id !== cycleOf(today, group.cycleDays, group.shiftDays).id
      && !(await askConfirm({ title: 'შევინახო?', text: 'მიმდინარე ციკლი ახლიდან დაიწყება და ამ ციკლის „წავიკითხე“ მონიშვნები აღარ გამოჩნდება. ვინ რომელ კანონს კითხულობს დღეს, არ შეიცვლება.', ok: 'შენახვა' }))) return;
    try {
      await updateDoc(ref, {
        name: settings.name.trim(),
        cycleDays,
        shiftDays,
        remindDaily: settings.remindDaily,
        remindFinal: settings.remindFinal,
        // new shift days count periods differently: write today's readers down for the new count
        ...(sameDays ? {} : {
          assignment: rebase(ownersIn(group.assignment, group.baseHalf, halfIndex(today, group.shiftDays))),
          baseHalf: halfIndex(today, shiftDays),
        }),
        updatedAt: new Date().toISOString(),
      });
      msg.ok('შენახულია.');
    } catch {
      msg.fail('ვერ შეინახა.');
    }
  };

  // the leader reads too (or no longer): their kanons go free when they stop
  const setReading = async (on: boolean) => {
    if (!user) return;
    const mineNow = kathismasOf(owners, user.uid);
    if (!on && mineNow.length && !(await askConfirm({ title: 'აღარ კითხულობ?', text: `კანონი ${mineNow.join(', ')} თავისუფალი დარჩება.`, ok: 'დიახ' }))) return;
    const me = group.members.find(m => m.uid === user.uid)
      || { uid: user.uid, name: cls?.teachers.find(t => t.uid === user.uid)?.name || user.displayName || 'მასწავლებელი', prayer: '', photoURL: user.photoURL || '' };
    try {
      await updateDoc(ref, on
        ? { members: arrayUnion(me), memberIds: arrayUnion(user.uid), updatedAt: new Date().toISOString() }
        : {
          members: group.members.filter(m => m.uid !== user.uid),
          memberIds: arrayRemove(user.uid),
          ...(mineNow.length ? { assignment: rebase(Object.fromEntries(ALL_KATHISMAS.map(k => [k, owners[k].filter(u => u !== user.uid)]))), baseHalf: half } : {}),
          updatedAt: new Date().toISOString(),
        });
    } catch {
      msg.fail('ვერ შეინახა.');
    }
  };

  // every reader gets a kanon in turn, by name: the class's members and the leaders who read
  const distribute = async () => {
    const readers: GroupMember[] = [
      ...(cls ? cls.members.map(m => group.members.find(g => g.uid === m.uid) || { uid: m.uid, name: m.name, prayer: '', photoURL: m.photoURL || '' }) : []),
      ...group.members.filter(m => !cls || !cls.memberIds.includes(m.uid)),
    ];
    if (!readers.length) { msg.fail('ჯერ არავინაა, ვისაც კანონი მიეცემა.'); return; }
    if (Object.values(owners).some(l => l.length) && !(await askConfirm({ title: 'განაწილება თავიდან?', text: 'ყველას ახალი კანონი მიეცემა სახელების მიხედვით; არსებული განაწილება შეიცვლება.', ok: 'განაწილება' }))) return;
    const ids = [...readers].sort((a, b) => a.name.localeCompare(b.name, 'ka')).map(m => m.uid);
    try {
      await updateDoc(ref, {
        members: readers,
        memberIds: readers.map(m => m.uid),
        assignment: rebase(autoDistribute(ids)),
        baseHalf: half,
        updatedAt: new Date().toISOString(),
      });
      msg.ok(ids.length < ALL_KATHISMAS.length ? 'განაწილდა — ზოგს ორი კანონი შეხვდა.' : 'განაწილდა.');
    } catch {
      msg.fail('განაწილება ვერ შეინახა.');
    }
  };

  const removeGroup = async () => {
    if (!(await askConfirm({ title: `წავშალო ჯგუფი „${group.name}“ მთელი ისტორიით?`, text: 'ამის დაბრუნება შეუძლებელია.', ok: 'წაშლა', danger: true }))) return;
    try {
      const cycles = await getDocs(collection(db, 'psalterGroups', group.id, 'cycles'));
      await Promise.all(cycles.docs.map(d => deleteDoc(d.ref)));
      await deleteDoc(ref);
      // the class forgets it, so its page offers „შექმნა“ again
      if (cls) await updateDoc(doc(db, 'classes', cls.id), { psalterGroupId: '', updatedAt: new Date().toISOString() }).catch(() => {});
      onDeleted();
    } catch {
      msg.fail('ჯგუფი ვერ წაიშალა.');
    }
  };

  return (
    <Sheet open={open} onClose={close} title="ჯგუფის პარამეტრები"
      footer={changed ? <Btn full icon={<Save />} onClick={saveSettings}>შენახვა</Btn> : undefined}>
      <div className="space-y-4">
        <Flash flash={msg.flash} onClose={msg.clear} />
        <div>
          <Label>ჯგუფის სახელი</Label>
          <input className={FIELD} value={settings.name} onChange={e => setSettings(s => ({ ...s, name: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>ციკლი (დღე)</Label>
            <input
              className={`${FIELD} ${cycleOk ? '' : '!ring-2 !ring-[#9a3324]/50'}`}
              type="number" inputMode="numeric" min={1} max={MAX_CYCLE_DAYS}
              value={settings.cycleDays}
              onChange={e => setSettings(s => ({ ...s, cycleDays: e.target.value }))}
            />
          </div>
          <div>
            <Label>გადასვლის რიცხვები</Label>
            <input
              className={`${FIELD} ${shiftOk ? '' : '!ring-2 !ring-[#9a3324]/50'}`}
              inputMode="text" placeholder="1, 15"
              value={settings.shiftDays}
              onChange={e => setSettings(s => ({ ...s, shiftDays: e.target.value }))}
            />
          </div>
          <div>
            <Label>შეხსენება</Label>
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

        <div className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3.5">
          <Toggle on={reading} onChange={on => void setReading(on)} label="მეც ვკითხულობ" />
        </div>

        <Btn kind="ghost" full icon={<Shuffle />} onClick={distribute}>ავტომატური განაწილება</Btn>

        <div className="pt-2 border-t border-[#e8dcc8]">
          <Btn kind="danger" full icon={<Trash2 />} onClick={removeGroup}>ჯგუფის წაშლა</Btn>
        </div>
      </div>
    </Sheet>
  );
};
