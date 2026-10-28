import React, { useEffect, useState } from 'react';
import { Check, RefreshCw } from 'lucide-react';
import { SchoolClass } from '../../hooks/useClasses';
import { errorText } from '../../utils/errorText';
import { LeaderChips, useLeaders } from '../admin/LeaderChips';
import { saveClassTeachers } from '../admin/ClassesAdmin';
import { changed } from '../admin/changed';
import { Btn, Flash, Sheet, useFlash } from '../ui/kit';

// The class page's ✎ → „მასწავლებლები“ (admins only; 2026-10-28, stage IV — it was the admin panel's own window): the
// school's teachers and admins as chips. Anyone leading the class now shows too, even when no longer on the staff list,
// and „შენახვა“ waits for the lists — so a save never drops a teacher unseen. The members' access and the class's
// psalter group follow (saveClassTeachers); the change can be undone for a few seconds and is logged.
export const ClassTeachersSheet: React.FC<{ cls: SchoolClass; inUse: SchoolClass[]; open: boolean; onClose: () => void }> = ({ cls, inUse, open, onClose }) => {
  const { leaders, loading } = useLeaders(open);
  const [picked, setPicked] = useState<string[]>(cls.teacherIds);
  const [saving, setSaving] = useState(false);
  const note = useFlash();
  useEffect(() => { if (open) { setPicked(cls.teacherIds); note.clear(); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const people = [...leaders, ...cls.teachers.filter(t => !leaders.some(l => l.uid === t.uid))];
  const dirty = picked.length !== cls.teacherIds.length || picked.some(u => !cls.teacherIds.includes(u));

  const save = async () => {
    const before = cls.teachers;
    const next = picked.map(uid => people.find(p => p.uid === uid)).filter((p): p is (typeof people)[number] => !!p)
      .map(p => ({ uid: p.uid, name: p.name, photoURL: p.photoURL || '' }));
    setSaving(true);
    try {
      const n = await saveClassTeachers(cls, next, inUse);
      // a member's record that could not be set is said here, the window staying open; else it closes
      if (n) note.fail(`შეინახა, მაგრამ ${n} წევრის ჩანაწერი ვერ განახლდა — ადმინის პანელის შემდეგ გახსნაზე გასწორდება.`);
      else onClose();
      const names = next.map(t => t.name).join(', ');
      changed('class', `კლასი „${cls.name}“ — ${names ? `მასწავლებელი: ${names}` : 'მასწავლებელი აღარ ჰყავს'}`, cls.id,
        () => saveClassTeachers({ ...cls, teacherIds: next.map(t => t.uid), teachers: next }, before, inUse));
    } catch (e) {
      note.fail('ვერ შეინახა: ' + errorText(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="მასწავლებლები"
      footer={dirty ? (
        <Btn size="lg" full icon={saving ? <RefreshCw className="animate-spin" /> : <Check />} onClick={save} disabled={saving || loading}>
          {loading ? 'იტვირთება…' : 'შენახვა'}
        </Btn>
      ) : undefined}>
      <div className="space-y-3">
        {note.flash && <Flash flash={note.flash} onClose={note.clear} />}
        <p className="text-[13px] text-[#75685a] leading-snug">ვინც აქ მონიშნულია, ის მართავს ამ კლასს და მის ფსალმუნთა ჯგუფს და ხედავს წევრების ჩანაწერებს.</p>
        {loading && !people.length
          ? <p className="py-2 text-[13px] text-[#8a7a6a]">იტვირთება…</p>
          : <LeaderChips people={people} selected={picked} onChange={setPicked} />}
      </div>
    </Sheet>
  );
};
