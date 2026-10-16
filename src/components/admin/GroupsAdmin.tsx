import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { BookOpen, Check, ChevronRight, ExternalLink, Plus } from 'lucide-react';
import { db } from '../../firebase';
import { useNavigation } from '../../context';
import { KATHISMA_COUNT } from '../../utils/psalter';
import { PsalterGroup } from '../../hooks/usePsalter';
import { Btn, Card, CardTitle, Sheet } from '../ui/kit';
import { Person } from '../people/PeoplePicker';
import { CreateGroupSheet, openPsalterGroup } from '../../pages/PsalterPage';
import { LeaderChips } from './LeaderChips';
import { useGroupReading } from './StatsTab';

// Every psalter group and who leads it (admins name the teachers; teachers run the group). The list looks like the
// classes list; a tap opens the group's own window.
export const GroupsAdmin: React.FC<{ groups: PsalterGroup[]; staff: Person[]; onMessage: (t: string, type: 'success' | 'error') => void }> = ({ groups, staff, onMessage }) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const open = groups.find(g => g.id === openId);

  return (
    <Card>
      <CardTitle icon={<BookOpen />} title="ფსალმუნთა ჯგუფები"
        info={`ჯგუფს მისი მასწავლებელი მართავს. „კათისმა“ — ბოლო 6 ციკლში საშუალოდ რამდენი იკითხებოდა (${KATHISMA_COUNT}-დან).`} />
      {groups.length === 0 ? (
        <p className="text-sm text-[#8a7a6a]">ჯგუფი ჯერ არ შექმნილა.</p>
      ) : (
        <ul className="divide-y divide-[#f1e8d9] -mx-1">
          {groups.map(g => <GroupRow key={g.id} group={g} onOpen={() => setOpenId(g.id)} />)}
        </ul>
      )}
      <Btn kind="soft" full icon={<Plus />} className="mt-3 sm:w-auto" onClick={() => setCreating(true)}>ახალი ჯგუფი</Btn>
      {open && <GroupSheet key={open.id} group={open} staff={staff} onClose={() => setOpenId(null)} onMessage={onMessage} />}
      <CreateGroupSheet open={creating} onClose={() => setCreating(false)} />
    </Card>
  );
};

const GroupIcon: React.FC = () => (
  <span className="w-11 h-11 rounded-full bg-[#7a2028] text-[#fbf6ec] flex items-center justify-center shrink-0"><BookOpen className="w-5 h-5" /></span>
);

/** A group in the list: name, members and leaders, how it reads. */
const GroupRow: React.FC<{ group: PsalterGroup; onOpen: () => void }> = ({ group: g, onOpen }) => {
  const reading = useGroupReading(g);
  return (
    <li className="px-1">
      <button type="button" onClick={onOpen} className="w-full flex items-center gap-3 py-3 text-left cursor-pointer group">
        <GroupIcon />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-[#2a2017] truncate group-hover:text-[#7a2028]">{g.name}</span>
          <span className="block text-xs text-[#8a7a6a] truncate">
            {g.members.length} წევრი · {g.teachers.length ? g.teachers.map(t => t.name).join(', ') : <span className="text-[#9a3324]">ხელმძღვანელი არ ჰყავს</span>}
          </span>
        </span>
        {reading && (
          <span className="shrink-0 text-right leading-tight">
            <span className="block text-sm font-bold tabular-nums text-[#4a3426]">{reading.avg.toFixed(1)}/{KATHISMA_COUNT}</span>
            <span className="block text-[11px] text-[#8a7a6a]">კათისმა</span>
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-[#b3a594] shrink-0" />
      </button>
    </li>
  );
};

/** The group's own window: its leaders, how it reads, the way to its page. */
const GroupSheet: React.FC<{ group: PsalterGroup; staff: Person[]; onClose: () => void; onMessage: (t: string, type: 'success' | 'error') => void }> = ({ group: g, staff, onClose, onMessage }) => {
  const { navigateTo } = useNavigation();
  const reading = useGroupReading(g);
  const [leaders, setLeaders] = useState<string[]>(g.teacherIds);
  const [busy, setBusy] = useState(false);
  const dirty = leaders.length !== g.teacherIds.length || leaders.some(u => !g.teacherIds.includes(u));
  // former leaders who are no longer staff stay choosable while they lead the group
  const people = [...staff, ...g.teachers.filter(t => !staff.some(s => s.uid === t.uid))];

  const save = async () => {
    const teachers = leaders.map(u => people.find(p => p.uid === u)).filter(Boolean).map(p => ({ uid: p!.uid, name: p!.name, photoURL: p!.photoURL || '' }));
    setBusy(true);
    try {
      await updateDoc(doc(db, 'psalterGroups', g.id), { teacherIds: teachers.map(t => t.uid), teachers, updatedAt: new Date().toISOString() });
      onMessage(`„${g.name}“: ხელმძღვანელები განახლდა.`, 'success');
      onClose();
    } catch {
      onMessage('ვერ შეინახა.', 'error');
      setBusy(false);
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={g.name}
      wide
      footer={dirty ? (
        <div className="flex gap-2">
          <Btn kind="ghost" size="lg" onClick={() => setLeaders(g.teacherIds)} disabled={busy}>გაუქმება</Btn>
          <Btn size="lg" icon={<Check />} className="flex-1" onClick={save} disabled={busy}>შენახვა</Btn>
        </div>
      ) : undefined}
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <GroupIcon />
          <p className="flex-1 min-w-0 text-[13px] text-[#4a3426]">
            {g.members.length} წევრი{reading && ` · ბოლო 6 ციკლი: საშუალოდ ${reading.avg.toFixed(1)}/${KATHISMA_COUNT}, სრულად — ${reading.full}`}
          </p>
        </div>
        <Btn kind="ghost" size="sm" icon={<ExternalLink />} onClick={() => { openPsalterGroup(g.id); navigateTo('psalter'); }}>ჯგუფის გვერდი</Btn>
        <section className="pt-4 border-t border-[#e8dcc8]">
          <h4 className="mb-2.5 text-[13px] font-bold text-[#75685a]">ხელმძღვანელი</h4>
          <LeaderChips people={people} selected={leaders} onChange={setLeaders} />
        </section>
      </div>
    </Sheet>
  );
};
