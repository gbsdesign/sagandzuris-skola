import React, { useState, useSyncExternalStore } from 'react';
import { Plus, Shuffle, Users, X } from 'lucide-react';
import { useManagedClasses, type SchoolClass } from '../../hooks/useClasses';
import { MAX_NAMES, MAX_NAME_LEN, cleanName } from '../../utils/gatvla';
import { shuffle } from '../../utils/amikhseni';
import { Btn, FIELD, askConfirm } from '../ui/kit';
import { triggerHaptic } from '../../utils/haptics';
import { Chip } from './Chip';

// Who sits in the circle (2026-11-01, the one-phone games of „ექო“ and „მფრინავი ნოტები“: the phone passed on, a turn each):
// names typed in, or a class's members in one tap (the classes this person leads), in the circle's order — „არევა“ shuffles
// it. Kept on this phone (`sg-circle`), the same list for every circle game.

const KEY = 'sg-circle';
const read = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null') as unknown;
    return Array.isArray(v) ? [...new Set(v.map(x => cleanName(String(x))).filter(Boolean))].slice(0, MAX_NAMES) : [];
  } catch { return []; }
};
let names: string[] | null = null;
const subs = new Set<() => void>();
const get = () => (names ??= read());
const set = (next: string[]) => {
  names = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode */ }
  subs.forEach(f => f());
};
export const useCircleNames = () => useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f); }; }, get);

export const CircleNames: React.FC<{ hint?: string; label?: string }> = ({ hint, label = 'წრეში' }) => {
  const list = useCircleNames();
  const [draft, setDraft] = useState('');
  const { classes } = useManagedClasses();
  const add = (raw: string) => {
    const n = cleanName(raw);
    setDraft('');
    if (!n || list.includes(n) || list.length >= MAX_NAMES) return;
    triggerHaptic(5);
    set([...list, n]);
  };
  const addClass = (c: SchoolClass) => {
    triggerHaptic(10);
    set([...new Set([...list, ...c.members.map(m => cleanName(m.name)).filter(Boolean)])].slice(0, MAX_NAMES));
  };
  const clear = async () => { if (await askConfirm('ყველა სახელი წაიშალოს?')) set([]); };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13.5px] font-bold text-[#4a3426] flex items-center gap-1.5"><Users className="w-4 h-4 text-[#7a2028]" /> {label} · {list.length}</p>
        {list.length > 0 && (
          <div className="flex items-center gap-1">
            {list.length > 2 && (
              <button type="button" onClick={() => { triggerHaptic(8); set(shuffle([...list])); }} className="h-9 px-2.5 rounded-full inline-flex items-center gap-1 text-[12.5px] font-bold text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer">
                <Shuffle className="w-3.5 h-3.5" />არევა
              </button>
            )}
            <button type="button" onClick={clear} className="h-9 px-2.5 rounded-full text-[12.5px] font-bold text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer">გასუფთავება</button>
          </div>
        )}
      </div>
      {list.length > 0 ? (
        <ol className="flex flex-wrap gap-1.5">
          {list.map((n, i) => (
            <li key={n} className="inline-flex items-center h-9 pl-2 pr-1 rounded-full bg-[#fbf6ec] ring-1 ring-[#e8dcc8] text-[13.5px] font-bold text-[#4a3426]">
              <span className="mr-1.5 text-[11.5px] tabular-nums text-[#9a8b7b]">{i + 1}</span>{n}
              <button type="button" onClick={() => { triggerHaptic(5); set(list.filter(x => x !== n)); }} aria-label={`${n} — წაშლა`} className="w-7 h-7 ml-0.5 rounded-full flex items-center justify-center text-[#9a8b7b] hover:text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer"><X className="w-3.5 h-3.5" /></button>
            </li>
          ))}
        </ol>
      ) : <p className="text-[12.5px] leading-snug text-[#9a8b7b]">{hint ?? 'ჩაწერე, ვინ ზის წრეში — რიგითაც ასე წავლენ.'}</p>}
      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); add(draft); }}>
        <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="სახელი" aria-label="სახელი" maxLength={MAX_NAME_LEN} autoComplete="off" className={FIELD} />
        <Btn type="submit" icon={<Plus />} disabled={!cleanName(draft) || list.length >= MAX_NAMES} className="shrink-0">დამატება</Btn>
      </form>
      {classes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {classes.map(c => <Chip key={c.id} on={false} onClick={() => addClass(c)}>+ {c.name} · {c.members.length}</Chip>)}
        </div>
      )}
    </div>
  );
};
