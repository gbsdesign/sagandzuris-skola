import React, { useMemo, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { Waiting } from '../../../../components/shell/PageSkeleton';
import { useAuth } from '../../../../context';
import type { SchoolClass } from '../../../../hooks/useClasses';
import { shownName, useDirectory } from '../../../../utils/directory';
import { addClassMember } from '../../../../components/admin/ClassesAdmin';
import { Avatar, Note, Press, Rows, Sheet, cx } from '../../../../components/ui2';
import { SearchBox } from './SearchBox';

/** x-tsevris-damateba — adding a member: one search over the people list; a tap on a name (or its +) puts that person
 *  into the class at once, as the old AddMemberSheet did. */
export const AddMemberSheetV2: React.FC<{ cls: SchoolClass; open: boolean; onClose: () => void }> = ({ cls, open, onClose }) => {
  const { isTeacher, isAdmin } = useAuth();
  const { people, loading } = useDirectory(open && (isTeacher || isAdmin));
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const shown = useMemo(() => {
    const needle = q.toLowerCase().trim();
    return people
      .filter(p => !cls.memberIds.includes(p.uid) && !cls.teacherIds.includes(p.uid))
      .map(p => ({ uid: p.uid, name: shownName(p), photoURL: p.photoURL }))
      .filter(p => !needle || p.name.toLowerCase().includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name, 'ka'))
      .slice(0, 60);
  }, [people, q, cls.memberIds, cls.teacherIds]);

  const add = async (p: { uid: string; name: string; photoURL?: string }) => {
    setAdding(p.uid);
    setNote('');
    try {
      const failed = await addClassMember(cls, p);
      setQ('');
      setAdding(null);
      // the member is in; only their path could not be set — said, the window staying open
      if (failed) setNote(`${p.name} დაემატა, მაგრამ მისი გზა ვერ განახლდა.`);
      else onClose();
    } catch {
      setNote('წევრი ვერ დაემატა.');
      setAdding(null);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="წევრის დამატება">
      <SearchBox value={q} onChange={setQ} placeholder="მოძებნე სახელით" autoFocus />
      {note && <p className="px-1.5 text-meta text-danger">{note}</p>}
      {loading ? (
        <Waiting field={false} rows={4} quiet />
      ) : shown.length === 0 ? (
        <Note>ვერ მოიძებნა.</Note>
      ) : (
        <Rows>
          {shown.map(p => (
            <Press
              key={p.uid}
              onClick={() => add(p)}
              disabled={!!adding}
              aria-label={`${p.name} — დამატება`}
              className={cx('flex min-h-14 w-full cursor-pointer items-center gap-3 py-2 pr-3 pl-4 text-left text-ink transition-colors active:bg-soft disabled:opacity-60')}
            >
              <Avatar name={p.name} photo={p.photoURL} />
              <span className="min-w-0 flex-1 truncate text-lead font-bold">{p.name}</span>
              <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-tint text-wine">
                {adding === p.uid ? <Loader2 className="size-[18px] animate-spin" /> : <Plus className="size-[18px]" />}
              </span>
            </Press>
          ))}
        </Rows>
      )}
    </Sheet>
  );
};
