import React, { useState, useSyncExternalStore } from 'react';
import { GripVertical, Info, Plus, Shuffle, Users, X } from 'lucide-react';
import { useManagedClasses, type SchoolClass } from '../../hooks/useClasses';
import { MAX_NAMES, MAX_NAME_LEN, cleanName } from '../../utils/gatvla';
import { shuffle } from '../../utils/amikhseni';
import { Btn, FIELD, askConfirm } from '../ui/kit';
import { triggerHaptic } from '../../utils/haptics';
import { Chip } from './Chip';
import { useNewLook } from '../../design/newLook';
import { Button, FOCUS_IN, Helper, RoundButton, SectionLabel, cx } from '../ui2';
import { useDragSort } from '../ui/useDragSort';

// Who sits in the circle (2026-11-01, the one-phone games of „ექო“ and „მფრინავი ნოტები“: the phone passed on, a turn each):
// names typed in, or a class's members in one tap (the classes this person leads), in the circle's order — „არევა“ shuffles
// it; in the new look a name's handle drags it to its seat (board x-otakhi-tsre). Kept on this phone (`sg-circle`), the same
// list for every circle game.

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
  const nl = useNewLook();
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
  const { container, order, dragging, grip } = useDragSort(list, set);
  // the new look (board x-otakhi-tsre): a numbered row a name, the field to add one, the classes in one tap
  if (nl) {
    const quiet = 'inline-flex h-tap cursor-pointer items-center gap-1 rounded-full px-2.5 text-meta font-bold text-wine active:bg-tint [&_svg]:size-3.5';
    return (
      <div className="flex flex-col gap-3">
        <SectionLabel
          label={`${label} · ${list.length}`}
          right={list.length > 0 ? (
            <span className="flex shrink-0 items-center">
              {list.length > 2 && <button type="button" onClick={() => { triggerHaptic(8); set(shuffle([...list])); }} className={quiet}><Shuffle />არევა</button>}
              <button type="button" onClick={() => { void clear(); }} className={quiet}>გასუფთავება</button>
            </span>
          ) : undefined}
        />
        {list.length > 0 && (
          <div ref={el => { container.current = el; }} role="list" className="flex shrink-0 flex-col divide-y divide-line overflow-hidden rounded-card bg-surf">
            {order.map((n, i) => (
              <div key={n} role="listitem" data-sort-id={n} className={cx('relative flex min-h-14 items-center gap-3 bg-surf py-1 pl-4', dragging === n && 'z-10 shadow-lift')}>
                <span className="w-5 shrink-0 text-meta font-bold text-mut tabular-nums">{i + 1}</span>
                <span className="min-w-0 flex-1 text-lead font-bold wrap-break-word">{n}</span>
                <RoundButton size={36} tone="plain" label={`${n} — წაშლა`} onClick={() => { triggerHaptic(5); set(list.filter(x => x !== n)); }}><X strokeWidth={2} /></RoundButton>
                <button
                  type="button"
                  {...grip(n)}
                  aria-label={`${n} — გადაადგილება (ისრები)`}
                  title="გადაათრიე"
                  className={cx('flex size-tap shrink-0 items-center justify-center text-faint touch-none select-none', dragging === n ? 'cursor-grabbing text-wine' : 'cursor-grab', FOCUS_IN)}
                >
                  <GripVertical className="size-5" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
        <form className="flex items-center gap-2" onSubmit={e => { e.preventDefault(); add(draft); }}>
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="სახელი"
            aria-label="სახელი"
            maxLength={MAX_NAME_LEN}
            autoComplete="off"
            className="h-tap-lg w-full min-w-0 flex-1 rounded-full bg-surf px-[18px] text-lead text-ink outline-none placeholder:text-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine/60"
          />
          <Button type="submit" kind="ghost" icon={<Plus />} disabled={!cleanName(draft) || list.length >= MAX_NAMES} className="shrink-0">დამატება</Button>
        </form>
        {classes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {classes.map(c => <Button key={c.id} kind="soft" size="md" icon={<Plus />} onClick={() => addClass(c)}>{c.name} · {c.members.length}</Button>)}
          </div>
        )}
        <Helper icon={<Info />}>{hint ?? 'ეს ერთი ტელეფონით თამაშისთვისაა: ჩაწერე, ვინ ზის წრეში — ტელეფონი ხელიდან ხელში ამ რიგით გადადის.'}</Helper>
      </div>
    );
  }
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
            <li key={n} className="inline-flex items-center h-9 pl-2.5 pr-0 rounded-full bg-[#fbf6ec] ring-1 ring-[#e8dcc8] text-[13.5px] font-bold text-[#4a3426]">
              <span className="mr-1.5 text-[11.5px] tabular-nums text-[#9a8b7b]">{i + 1}</span>{n}
              <button type="button" onClick={() => { triggerHaptic(5); set(list.filter(x => x !== n)); }} aria-label={`${n} — წაშლა`} className="w-9 h-9 rounded-full flex items-center justify-center text-[#9a8b7b] hover:text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer"><X className="w-4 h-4" /></button>
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
