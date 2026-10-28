import React, { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { shownName, useDirectory } from '../../utils/directory';
import { Avatar } from '../ui/kit';

export interface Leader { uid: string; name: string; photoURL?: string }

// Who leads a class: the school's teachers and admins as chips, tapped on or off (the class's ✎ window; its psalter
// group follows the class's teachers).
export const LeaderChips: React.FC<{
  people: Leader[];
  selected: string[];
  onChange: (uids: string[]) => void;
}> = ({ people, selected, onChange }) =>
  people.length === 0 ? (
    <p className="text-[13px] text-[#8a7a6a]">მასწავლებელი ჯერ არავინაა — „წევრებში“ ადამიანის ფანჯარაში მიანიჭე როლი „მასწავლებელი“.</p>
  ) : (
    <div className="flex flex-wrap gap-2">
      {people.map(p => {
        const on = selected.includes(p.uid);
        return (
          <button key={p.uid} type="button" aria-pressed={on}
            onClick={() => onChange(on ? selected.filter(x => x !== p.uid) : [...selected, p.uid])}
            className={`inline-flex items-center gap-2 h-11 pl-1.5 pr-3.5 rounded-full text-sm font-semibold cursor-pointer transition-colors ${on ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] hover:ring-[#7a2028]/40'}`}>
            <Avatar name={p.name} photo={p.photoURL} size={32} />
            {p.name}
            {on && <Check className="w-4 h-4" />}
          </button>
        );
      })}
    </div>
  );

/** Admins: who may lead a class — every teacher and admin on the staff list, named as the directory names them.
 *  `loading` stays true until both lists have come (a window saving the teachers waits for it). */
export const useLeaders = (enabled: boolean) => {
  const { people, loading: dirLoading } = useDirectory(enabled);
  const [staff, setStaff] = useState<{ uid: string; name: string }[] | null>(null);
  useEffect(() => {
    if (!enabled) { setStaff([]); return; }
    return onSnapshot(collection(db, 'admins'),
      s => setStaff(s.docs.map(d => d.data()).filter(x => x.userId).map(x => ({ uid: String(x.userId), name: String(x.name || '') }))),
      () => setStaff([]));
  }, [enabled]);
  const leaders = useMemo<Leader[]>(() => (staff || [])
    .map(s => {
      const p = people.find(x => x.uid === s.uid);
      return { uid: s.uid, name: p ? shownName(p) : s.name || 'უსახელო', photoURL: p?.photoURL };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'ka')), [staff, people]);
  return { leaders, loading: staff === null || dirLoading };
};
