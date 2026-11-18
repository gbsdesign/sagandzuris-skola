import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import type { SchoolClass } from '../../../../hooks/useClasses';
import { errorText } from '../../../../utils/errorText';
import { useLeaders } from '../../../../components/admin/LeaderChips';
import { saveClassTeachers } from '../../../../components/admin/ClassesAdmin';
import { changed } from '../../../../components/admin/changed';
import { useFlash } from '../../../../components/ui/kit';
import { Avatar, Button, Check as Tick, Note, Row, Rows, Sheet } from '../../../../components/ui2';

/** The class's teachers (admins only, as the old ClassTeachersSheet): the school's teachers and admins as rows to tick.
 *  Anyone leading the class shows too, and „შენახვა“ waits for the lists — so a save never drops a teacher unseen. */
export const TeachersSheetV2: React.FC<{ cls: SchoolClass; inUse: SchoolClass[]; open: boolean; onClose: () => void }> = ({ cls, inUse, open, onClose }) => {
  const { leaders, loading } = useLeaders(open);
  const [picked, setPicked] = useState<string[]>(cls.teacherIds);
  const [saving, setSaving] = useState(false);
  const note = useFlash();
  useEffect(() => { if (open) { setPicked(cls.teacherIds); note.clear(); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const people = [...leaders, ...cls.teachers.filter(t => !leaders.some(l => l.uid === t.uid))];
  const dirty = picked.length !== cls.teacherIds.length || picked.some(u => !cls.teacherIds.includes(u));
  const flip = (uid: string) => setPicked(p => (p.includes(uid) ? p.filter(x => x !== uid) : [...p, uid]));

  const save = async () => {
    const before = cls.teachers;
    const next = picked.map(uid => people.find(p => p.uid === uid)).filter((p): p is (typeof people)[number] => !!p)
      .map(p => ({ uid: p.uid, name: p.name, photoURL: p.photoURL || '' }));
    setSaving(true);
    try {
      const n = await saveClassTeachers(cls, next, inUse);
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
    <Sheet open={open} onClose={onClose} title="მასწავლებლები">
      <Note>ვინც აქ მონიშნულია, ის მართავს ამ კლასს და მის ფსალმუნთა ჯგუფს და ხედავს წევრების ჩანაწერებს.</Note>
      {loading && !people.length ? (
        <Note>იტვირთება…</Note>
      ) : people.length === 0 ? (
        <Note>მასწავლებელი ჯერ არავინაა — „წევრებში“ ადამიანის ფანჯარაში მიანიჭე როლი „მასწავლებელი“.</Note>
      ) : (
        <Rows>
          {people.map(p => {
            const on = picked.includes(p.uid);
            return (
              <Row
                key={p.uid}
                role="checkbox"
                aria-checked={on}
                lead={<Avatar name={p.name} photo={p.photoURL} />}
                title={p.name}
                right={<Tick on={on} size={26} />}
                onClick={() => flip(p.uid)}
              />
            );
          })}
        </Rows>
      )}
      {note.flash && <p className="px-1.5 text-meta text-danger">{note.flash.text}</p>}
      {dirty && <Button full icon={<Check />} disabled={saving || loading} onClick={save}>{loading ? 'იტვირთება…' : saving ? 'ინახება…' : 'შენახვა'}</Button>}
    </Sheet>
  );
};
