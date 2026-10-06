import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { BookOpen, Plus, UserCog, ChevronRight } from 'lucide-react';
import { db } from '../../firebase';
import { useNavigation } from '../../context';
import { PsalterGroup } from '../../hooks/usePsalter';
import { Btn, Card, CardTitle, IconBtn } from '../ui/kit';
import { PeoplePicker, Person } from '../people/PeoplePicker';
import { CreateGroupSheet, openPsalterGroup } from '../../pages/PsalterPage';

// Every psalter group, and who leads it (admins name the teachers; teachers run the group).
export const GroupsAdmin: React.FC<{ groups: PsalterGroup[]; staff: Person[]; onMessage: (t: string, type: 'success' | 'error') => void }> = ({ groups, staff, onMessage }) => {
  const { navigateTo } = useNavigation();
  const [editing, setEditing] = useState<PsalterGroup | null>(null);
  const [creating, setCreating] = useState(false);

  const setTeachers = async (g: PsalterGroup, uids: string[]) => {
    const teachers = uids.map(u => staff.find(s => s.uid === u) || g.teachers.find(t => t.uid === u)).filter(Boolean).map(p => ({ uid: p!.uid, name: p!.name, photoURL: p!.photoURL || '' }));
    try {
      await updateDoc(doc(db, 'psalterGroups', g.id), { teacherIds: teachers.map(t => t.uid), teachers, updatedAt: new Date().toISOString() });
      onMessage(`„${g.name}“: ხელმძღვანელები განახლდა.`, 'success');
    } catch {
      onMessage('ვერ შეინახა.', 'error');
    }
  };

  return (
    <Card>
      <CardTitle icon={<BookOpen />} title={`ფსალმუნთა ჯგუფები · ${groups.length}`} hint="ჯგუფს მისი მასწავლებელი მართავს"
        right={<Btn size="sm" icon={<Plus />} onClick={() => setCreating(true)}>ახალი</Btn>} />
      {groups.length === 0 ? (
        <p className="text-sm text-[#8a7a6a]">ჯგუფი ჯერ არ შექმნილა.</p>
      ) : (
        <ul className="space-y-2">
          {groups.map(g => (
            <li key={g.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white ring-1 ring-[#e8dcc8]">
              <span className="w-10 h-10 rounded-xl bg-[#7a2028] text-[#fbf6ec] flex items-center justify-center shrink-0"><BookOpen className="w-5 h-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-[#2a2017] truncate">{g.name}</span>
                <span className={`block text-xs truncate ${g.teachers.length ? 'text-[#8a7a6a]' : 'text-[#9a3324]'}`}>
                  {g.members.length} წევრი · {g.teachers.length ? g.teachers.map(t => t.name).join(', ') : 'ხელმძღვანელი არ ჰყავს'}
                </span>
              </span>
              <IconBtn label="ხელმძღვანელის მიბმა" onClick={() => setEditing(g)}><UserCog /></IconBtn>
              <IconBtn label="გახსნა" onClick={() => { openPsalterGroup(g.id); navigateTo('psalter'); }}><ChevronRight /></IconBtn>
            </li>
          ))}
        </ul>
      )}
      <PeoplePicker
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? `„${editing.name}“ — ხელმძღვანელი` : ''}
        people={staff}
        selected={editing?.teacherIds || []}
        doneLabel="მიბმა"
        empty="მასწავლებელი ჯერ არავინაა — მიანიჭე როლი „მომხმარებლებში“."
        onDone={uids => editing && setTeachers(editing, uids)}
      />
      <CreateGroupSheet open={creating} onClose={() => setCreating(false)} />
    </Card>
  );
};
