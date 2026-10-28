import React, { useMemo, useState } from 'react';
import { Loader2, Plus, Search } from 'lucide-react';
import { useAuth } from '../../context';
import { SchoolClass } from '../../hooks/useClasses';
import { useDirectory, shownName } from '../../utils/directory';
import { addClassMember } from '../admin/ClassesAdmin';
import { Avatar } from './ChatPanel';
import { FIELD, Sheet } from '../ui/kit';

/** „წევრის დამატება“ (the „+“ on the class page's members card): one search over the people list; a tap on a name puts
 *  that person into the class at once and closes the window. Taking out is in the member's own window. */
export const AddMemberSheet: React.FC<{ cls: SchoolClass; onMessage: (text: string, type: 'success' | 'error') => void; onClose: () => void }> = ({ cls, onMessage, onClose }) => {
  const { isTeacher, isAdmin } = useAuth();
  const { people, loading } = useDirectory(isTeacher || isAdmin);
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState<string | null>(null);
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
    try {
      const failed = await addClassMember(cls, p);
      onMessage(failed ? `${p.name} დაემატა, მაგრამ მისი გზა ვერ განახლდა.` : `${p.name} დაემატა კლასს.`, failed ? 'error' : 'success');
      onClose();
    } catch {
      onMessage('წევრი ვერ დაემატა.', 'error');
      setAdding(null);
    }
  };

  return (
    <Sheet open onClose={onClose} title="წევრის დამატება">
      <div className="relative mb-3">
        <Search className="w-4 h-4 text-[#b3a594] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="მოძებნე სახელით" aria-label="ძებნა" className={`${FIELD} pl-10`} />
      </div>
      {loading ? (
        <p className="py-8 flex justify-center text-[#8a7a6a]"><Loader2 className="w-5 h-5 animate-spin" /></p>
      ) : (
        <ul className="divide-y divide-[#f1e8d9]">
          {shown.map(p => (
            <li key={p.uid}>
              <button type="button" onClick={() => add(p)} disabled={!!adding}
                className="w-full min-h-14 flex items-center gap-3 px-2 py-2 rounded-xl text-left cursor-pointer hover:bg-[#fbf6ec] disabled:opacity-60 transition-colors">
                <Avatar name={p.name} photoURL={p.photoURL} className="w-9 h-9 text-sm" />
                <span className="flex-1 min-w-0 text-[15px] font-semibold text-[#2a2017] truncate">{p.name}</span>
                {adding === p.uid ? <Loader2 className="w-5 h-5 animate-spin text-[#7a2028]" /> : <Plus className="w-5 h-5 text-[#7a2028]" />}
              </button>
            </li>
          ))}
          {shown.length === 0 && <li className="py-6 text-center text-sm text-[#8a7a6a]">ვერ მოიძებნა.</li>}
        </ul>
      )}
    </Sheet>
  );
};
