import React, { useEffect, useMemo, useState } from 'react';
import { Check, Search, UserPlus } from 'lucide-react';
import { Avatar, Btn, FIELD, Sheet } from '../ui/kit';

export interface Person {
  uid: string;
  name: string;
  photoURL?: string;
  sub?: string; // a second line: e-mail for admins, "no Georgian name" for groups, …
}

// Choose people from a list (search by name): used to add members to a class or psalter group, and to
// pick the readers of a kathisma. People already in are shown ticked and can be unticked when `multi`.
export const PeoplePicker: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  people: Person[];
  selected: string[];
  onDone: (uids: string[]) => void;
  doneLabel?: string;
  loading?: boolean;
  empty?: string;
}> = ({ open, onClose, title, people, selected, onDone, doneLabel = 'შენახვა', loading, empty = 'სია ცარიელია.' }) => {
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<string[]>(selected);
  useEffect(() => { if (open) { setPicked(selected); setQ(''); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = s ? people.filter(p => `${p.name} ${p.sub || ''}`.toLowerCase().includes(s)) : people;
    // the chosen ones first
    return [...list].sort((a, b) => Number(picked.includes(b.uid)) - Number(picked.includes(a.uid)));
  }, [people, q, picked]);

  const toggle = (uid: string) => setPicked(p => (p.includes(uid) ? p.filter(x => x !== uid) : [...p, uid]));
  const added = picked.filter(u => !selected.includes(u)).length;
  const removed = selected.filter(u => !picked.includes(u)).length;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex items-center gap-3">
          <span className="flex-1 text-[13px] text-[#8a7a6a]">
            არჩეულია <b className="text-[#4a3426]">{picked.length}</b>
            {added > 0 && <span className="text-emerald-700"> · +{added}</span>}
            {removed > 0 && <span className="text-red-700"> · −{removed}</span>}
          </span>
          <Btn icon={<UserPlus />} onClick={() => { onDone(picked); onClose(); }} disabled={!added && !removed}>{doneLabel}</Btn>
        </div>
      }
    >
      <div className="relative mb-3">
        <Search className="w-4 h-4 text-[#b3a594] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="მოძებნე სახელით" className={`${FIELD} pl-10`} autoFocus />
      </div>
      {loading ? (
        <p className="py-10 text-center text-sm text-[#8a7a6a]">იტვირთება…</p>
      ) : shown.length === 0 ? (
        <p className="py-10 text-center text-sm text-[#8a7a6a]">{people.length ? 'ვერ მოიძებნა.' : empty}</p>
      ) : (
        <ul className="-mx-2 divide-y divide-[#efe3cf]">
          {shown.map(p => {
            const on = picked.includes(p.uid);
            return (
              <li key={p.uid}>
                <button
                  type="button"
                  onClick={() => toggle(p.uid)}
                  aria-pressed={on}
                  className={`w-full flex items-center gap-3 px-2 py-2.5 rounded-xl text-left cursor-pointer transition-colors ${on ? 'bg-[#7a2028]/[0.05]' : 'hover:bg-white/70'}`}
                >
                  <Avatar name={p.name} photo={p.photoURL} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold text-[#2a2017] truncate">{p.name}</span>
                    {p.sub && <span className="block text-xs text-[#8a7a6a] truncate">{p.sub}</span>}
                  </span>
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${on ? 'bg-[#7a2028] text-white' : 'ring-1 ring-[#d9c8ac] bg-white'}`}>
                    {on && <Check className="w-4 h-4 stroke-[3]" />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
};
