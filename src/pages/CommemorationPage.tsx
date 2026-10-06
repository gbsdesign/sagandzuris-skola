import React, { useRef, useState } from 'react';
import { ArrowUpToLine, GripVertical, Plus, X } from 'lucide-react';
import { NAME_LISTS, NameListId, splitNames, useCommemoration } from '../utils/commemoration';
import { triggerHaptic } from '../utils/haptics';
import { useAuth } from '../context';
import { useGroupPrayerNames } from '../hooks/usePsalter';
import { PinButton } from '../components/home/ShortcutShelf';

// "მოსახსენებელი": the names a student prays for. Their order here is the order they are read in prayers.
export const CommemorationPage: React.FC = () => {
  const { lists, save } = useCommemoration();
  const { user } = useAuth();
  const fromGroups = useGroupPrayerNames(user?.uid);

  const update = (id: NameListId, names: string[]) => save({ ...lists, [id]: names });

  return (
    <div className="w-full max-w-2xl mx-auto mb-6 px-1 space-y-4">
      <div className="grid grid-cols-[2.25rem_1fr_2.25rem] items-center gap-2">
        <h1 className="col-start-2 text-center font-serif-ge text-xl sm:text-2xl font-bold text-[#7a2028]">მოსახსენებელი</h1>
        <PinButton id="special:commemoration" />
      </div>
      <p className="text-center text-[13px] leading-relaxed text-[#6b5544]">
        ჩაწერე სახელები (რამდენიმეც ერთად) — თითოეული ცალკე დალაგდება. ლოცვებში ისინი გამოჩნდება იქ, სადაც „(სახელი)“ წერია, ამავე რიგით.
        რიგის შესაცვლელად სახელი ჩაავლე <GripVertical className="inline w-3.5 h-3.5 -mt-0.5" /> ნიშნით და გადაიტანე.
      </p>
      {NAME_LISTS.map(list => (
        <NameList key={list.id} title={list.title} hint={list.hint} names={lists[list.id]} onChange={names => update(list.id, names)} auto={list.id === 'group' ? fromGroups : undefined} />
      ))}
    </div>
  );
};

const NameList: React.FC<{ title: string; hint: string; names: string[]; onChange: (names: string[]) => void; auto?: string[] }> = ({
  title,
  hint,
  names,
  onChange,
  auto,
}) => {
  const [draft, setDraft] = useState('');
  const [drag, setDrag] = useState<{ from: number; to: number; dy: number } | null>(null);
  const rows = useRef<(HTMLLIElement | null)[]>([]);
  const start = useRef<{ y: number; heights: number[] } | null>(null);

  const add = () => {
    // several names at once — "ნუნუ ნანა ნიკა" — become separate names
    const fresh = splitNames(draft);
    if (!fresh.length) return;
    onChange([...names, ...fresh]);
    setDraft('');
    triggerHaptic(10);
  };

  const move = (from: number, to: number) => {
    if (from === to) return;
    const next = [...names];
    const [name] = next.splice(from, 1);
    next.splice(to, 0, name);
    onChange(next);
    triggerHaptic(10);
  };

  const onPointerDown = (i: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    start.current = { y: e.clientY, heights: rows.current.map(r => r?.getBoundingClientRect().height ?? 44) };
    setDrag({ from: i, to: i, dy: 0 });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag || !start.current) return;
    const dy = e.clientY - start.current.y;
    // walk over the neighbouring rows the pointer has passed half of
    const h = start.current.heights;
    let to = drag.from;
    let rest = dy;
    while (rest > 0 && to < names.length - 1 && rest > h[to + 1] / 2) rest -= h[++to];
    while (rest < 0 && to > 0 && -rest > h[to - 1] / 2) rest += h[--to];
    setDrag({ ...drag, to, dy });
  };

  const onPointerUp = () => {
    if (drag) move(drag.from, drag.to);
    setDrag(null);
    start.current = null;
  };

  // where each row sits while one is being dragged
  const shift = (i: number) => {
    if (!drag || !start.current) return 0;
    const h = start.current.heights[drag.from] + 6;
    if (i === drag.from) return drag.dy;
    if (drag.from < drag.to && i > drag.from && i <= drag.to) return -h;
    if (drag.from > drag.to && i < drag.from && i >= drag.to) return h;
    return 0;
  };

  return (
    <section className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] p-3.5 sm:p-4 space-y-3">
      <div>
        <h2 className="font-serif-ge text-[16px] font-bold text-[#7a2028]">
          {title} <span className="text-[13px] font-semibold text-[#b5a48c]">{names.length || ''}</span>
        </h2>
        <p className="text-[12px] leading-snug text-[#8a7a6a]">{hint}</p>
      </div>

      {/* the psalter group's members fill in by themselves */}
      {auto && auto.length > 0 && (
        <div className="rounded-xl bg-[#7a2028]/[0.04] ring-1 ring-[#7a2028]/10 px-3 py-2.5">
          <p className="text-[11.5px] font-bold text-[#7a2028] mb-1.5">ფსალმუნთა ჯგუფიდან — თავისით</p>
          <div className="flex flex-wrap gap-1.5">
            {auto.map(n => (
              <span key={n} className="h-8 px-3 rounded-full bg-white ring-1 ring-[#e8dcc8] text-[14px] font-semibold text-[#2a2017] inline-flex items-center">{n}</span>
            ))}
          </div>
        </div>
      )}

      {names.length > 0 && (
        <ol className="space-y-1.5 select-none">
          {names.map((name, i) => {
            const dragging = drag?.from === i;
            return (
              <li
                key={`${i}-${name}`}
                ref={el => {
                  rows.current[i] = el;
                }}
                style={{ transform: `translateY(${shift(i)}px)`, transition: dragging ? 'none' : 'transform 150ms' }}
                className={`relative flex items-center gap-1.5 h-11 pl-1 pr-1.5 rounded-xl ring-1 ${
                  dragging ? 'z-10 bg-[#fbf6ec] ring-[#7a2028]/40 shadow-lg' : 'bg-[#fbf6ec]/60 ring-[#e8dcc8]'
                }`}
              >
                <button
                  type="button"
                  aria-label={`${name} — გადაადგილება`}
                  onPointerDown={onPointerDown(i)}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg text-[#b5a48c] hover:text-[#7a2028] cursor-grab active:cursor-grabbing touch-none"
                >
                  <GripVertical className="w-4.5 h-4.5" />
                </button>
                <span className="w-5 shrink-0 text-[12px] font-bold text-[#b5a48c] tabular-nums">{i + 1}</span>
                <span className="flex-1 min-w-0 truncate text-[15px] font-medium text-[#2a2017]">{name}</span>
                {i > 0 && (
                  <button
                    type="button"
                    onClick={() => move(i, 0)}
                    title="თავში გადატანა"
                    aria-label={`${name} — თავში`}
                    className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg text-[#b5a48c] hover:text-[#7a2028] hover:bg-white cursor-pointer"
                  >
                    <ArrowUpToLine className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onChange(names.filter((_, j) => j !== i))}
                  title="წაშლა"
                  aria-label={`${name} — წაშლა`}
                  className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg text-[#b5a48c] hover:text-[#7a2028] hover:bg-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            );
          })}
        </ol>
      )}

      <form
        className="flex gap-2"
        onSubmit={e => {
          e.preventDefault();
          add();
        }}
      >
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="ახალი სახელი"
          className="flex-1 min-w-0 h-11 px-3.5 rounded-xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] focus:ring-2 focus:ring-[#7a2028]/40 outline-none text-[15px] text-[#2a2017] placeholder:text-[#b5a48c]"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="h-11 px-4 rounded-xl bg-[#7a2028] text-[#fbf6ec] text-sm font-bold inline-flex items-center gap-1.5 disabled:opacity-40 cursor-pointer active:scale-95 transition-transform"
        >
          <Plus className="w-4 h-4" />
          დამატება
        </button>
      </form>
    </section>
  );
};
