import React from 'react';
import { Check } from 'lucide-react';
import { Avatar } from '../ui/kit';

export interface Leader { uid: string; name: string; photoURL?: string }

// Who leads a class or a psalter group: the school's teachers and admins as chips, tapped on or off.
// The same chips in the class window and the group window.
export const LeaderChips: React.FC<{
  people: Leader[];
  selected: string[];
  onChange: (uids: string[]) => void;
}> = ({ people, selected, onChange }) =>
  people.length === 0 ? (
    <p className="text-[13px] text-[#8a7a6a]">მასწავლებელი ჯერ არავინაა — „მომხმარებლებში“ ადამიანის ფანჯარაში მიანიჭე როლი „მასწავლებელი“.</p>
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
