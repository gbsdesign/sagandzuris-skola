import React, { useMemo, useRef, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Check, GripVertical, Plus, X } from 'lucide-react';
import { CategoryListId, Commemoration, NAME_LISTS, NameSection, categoryChoices, inGroupOrder, nameCount, splitNames, useCommemoration } from '../utils/commemoration';
import { triggerHaptic } from '../utils/haptics';
import { useAuth } from '../context';
import { GroupMember, GroupPrayerName, PsalterGroup, firstName, groupPrayerText, useGroupPrayerNames, useMyPsalterGroups } from '../hooks/usePsalter';
import { PinButton } from '../components/home/ShortcutShelf';
import { Btn, Sheet } from '../components/ui/kit';

// "მოსახსენებელი": the names a student prays for. Their order here is the order they are read in prayers.
export const CommemorationPage: React.FC = () => {
  const { lists, save } = useCommemoration();
  const { user, isAdmin, isTeacher } = useAuth();
  const fromGroups = useGroupPrayerNames(user?.uid);
  const { groups } = useMyPsalterGroups(user?.uid);
  const [renaming, setRenaming] = useState<string | null>(null);

  // the group members I may rename (admins anywhere, a teacher in their own groups), and in which of those groups
  const behind = useMemo(() => {
    const out = new Map<string, { member: GroupMember; groups: PsalterGroup[] }>();
    if (!user) return out;
    for (const g of groups) {
      if (!g.memberIds.includes(user.uid) || !(isAdmin || (isTeacher && g.teacherIds.includes(user.uid)))) continue;
      for (const m of g.members) {
        if (m.uid === user.uid) continue;
        const seen = out.get(m.uid);
        if (seen) seen.groups.push(g);
        else out.set(m.uid, { member: m, groups: [g] });
      }
    }
    return out;
  }, [groups, user, isAdmin, isTeacher]);
  const renamed = renaming ? behind.get(renaming) : undefined;

  const update = (patch: Partial<Commemoration>) => save({ ...lists, ...patch });

  return (
    <div className="w-full max-w-2xl mx-auto mb-6 px-1 space-y-4">
      <div className="grid grid-cols-[2.25rem_1fr_2.25rem] items-center gap-2">
        <h1 className="col-start-2 text-center font-serif-ge text-xl sm:text-2xl font-bold text-[#7a2028]">მოსახსენებელი</h1>
        <PinButton id="special:commemoration" />
      </div>
      <p className="text-center text-[13px] leading-relaxed text-[#6b5544]">
        ჩაწერე სახელები (რამდენიმეც ერთად) — თითოეული ცალკე დალაგდება. ლოცვებში ისინი გამოჩნდება იქ, სადაც „(სახელი)“ წერია, ამავე რიგით.
        რიგის შესაცვლელად სახელი ჩაავლე <GripVertical className="inline w-3.5 h-3.5 -mt-0.5" /> ნიშნით და გადაიტანე, შესასწორებლად — სახელს დააჭირე.
      </p>
      {NAME_LISTS.map(list =>
        list.id === 'group' ? (
          <NameList
            key={list.id}
            title={list.title}
            hint={list.hint}
            count={nameCount(lists, 'group')}
            names={lists.group}
            onChange={group => update({ group })}
            auto={inGroupOrder(fromGroups, lists.groupOrder)}
            onAutoOrder={groupOrder => update({ groupOrder })}
            onAutoTap={uid => (behind.has(uid) ? () => setRenaming(uid) : undefined)}
          />
        ) : (
          <NameList
            key={list.id}
            title={list.title}
            hint={list.hint}
            count={nameCount(lists, list.id)}
            names={lists[list.id]}
            onChange={names => update({ [list.id]: names })}
            cats={{
              sections: lists.sections[list.id],
              custom: lists.customCategories,
              onChange: (names, sections, custom) =>
                update({ [list.id]: names, sections: { ...lists.sections, [list.id as CategoryListId]: sections }, customCategories: custom }),
            }}
          />
        )
      )}
      {renamed && (
        <GroupNameSheet name={(renamed.member.prayer || firstName(renamed.member.name)).trim()} people={[renamed]} onClose={() => setRenaming(null)} />
      )}
    </div>
  );
};

/** A group leader corrects how a member is named at „დიდებაი“ — in every group of theirs that member is in. */
const GroupNameSheet: React.FC<{ name: string; people: { member: GroupMember; groups: PsalterGroup[] }[]; onClose: () => void }> = ({ name, people, onClose }) => {
  const [names, setNames] = useState(() => Object.fromEntries(people.map(p => [p.member.uid, name])));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    const changes = people
      .map(p => ({ ...p, prayer: (names[p.member.uid] || '').trim().replace(/\s+/g, ' ') }))
      .filter(p => p.prayer && p.prayer !== name);
    if (!changes.length) return onClose();
    setBusy(true);
    setError('');
    // each group is written once, with all of its renamed members
    const touched = new Map<string, PsalterGroup>();
    for (const c of changes) for (const g of c.groups) touched.set(g.id, g);
    try {
      await Promise.all(
        [...touched.values()].map(g =>
          updateDoc(doc(db, 'psalterGroups', g.id), {
            members: g.members.map(m => {
              const c = changes.find(x => x.member.uid === m.uid);
              return c ? { ...m, prayer: c.prayer } : m;
            }),
            updatedAt: new Date().toISOString(),
          })
        )
      );
      onClose();
    } catch {
      setError('ვერ შეინახა — სცადე თავიდან.');
      setBusy(false);
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="სახელი ლოცვაში"
      footer={
        <Btn full disabled={busy} onClick={save}>
          შენახვა
        </Btn>
      }
    >
      <div className="space-y-3">
        <p className="text-[12.5px] leading-snug text-[#8a7a6a]">ასე მოიხსენიებს ჯგუფი ამ წევრს „დიდებაი“-ზე. ცვლილება ჯგუფის ყველა წევრს გამოუჩნდება.</p>
        {people.map(p => (
          <label key={p.member.uid} className="block space-y-1">
            <span className="block text-[12.5px] font-semibold text-[#75685a]">
              {p.member.name}
              {p.groups.length > 1 && <span className="font-normal text-[#b5a48c]"> · {p.groups.length} ჯგუფში</span>}
            </span>
            <input
              autoFocus={people[0] === p}
              value={names[p.member.uid] || ''}
              onChange={e => setNames({ ...names, [p.member.uid]: e.target.value })}
              onKeyDown={e => {
                if (e.key === 'Enter') void save();
              }}
              className="w-full h-11 px-3.5 rounded-xl bg-white ring-1 ring-[#e8dcc8] focus:ring-2 focus:ring-[#7a2028]/40 outline-none text-[15px] font-medium text-[#2a2017]"
            />
          </label>
        ))}
        {error && <p className="text-[13px] font-semibold text-[#9a3324]">{error}</p>}
      </div>
    </Sheet>
  );
};

type Cats = {
  sections: NameSection[];
  custom: string[];
  onChange: (names: string[], sections: NameSection[], custom: string[]) => void;
};

// what the category sheet is doing: placing freshly written names, or one name tapped in the list
type Pending = { kind: 'add'; names: string[] } | { kind: 'edit'; name: string; from: string | null; index: number };

const NameList: React.FC<{
  title: string;
  hint: string;
  count: number;
  names: string[];
  onChange: (names: string[]) => void;
  auto?: GroupPrayerName[];
  // the group's people dragged into a new order (their uids)
  onAutoOrder?: (uids: string[]) => void;
  // a group name the reader may correct gives back what tapping it does
  onAutoTap?: (uid: string) => (() => void) | undefined;
  cats?: Cats;
}> = ({ title, hint, count, names, onChange, auto, onAutoOrder, onAutoTap, cats }) => {
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<Pending | null>(null);

  const add = () => {
    // several names at once — "ნუნუ ნანა ნიკა" — become separate names
    const fresh = splitNames(draft);
    if (!fresh.length) return;
    triggerHaptic(10);
    setDraft('');
    if (cats) setPending({ kind: 'add', names: fresh });
    else onChange([...names, ...fresh]);
  };

  // puts names under a category (or none), taking the edited one out of where it was
  const place = (category: string | null, placed: string[], custom: string[]) => {
    if (!cats || !pending) return;
    let plain = [...names];
    let sections = cats.sections.map(s => ({ ...s, names: [...s.names] }));
    if (pending.kind === 'edit') {
      const { from, index } = pending;
      if (from === category) {
        // same place: the name changes where it stands
        const at = (list: string[]) => [...list.slice(0, index), ...placed, ...list.slice(index + 1)];
        if (category === null) plain = at(plain);
        else sections = sections.map(s => (s.title === category ? { ...s, names: at(s.names) } : s));
        cats.onChange(plain, sections, custom);
        setPending(null);
        return;
      }
      if (from === null) plain.splice(index, 1);
      else sections = sections.map(s => (s.title === from ? { ...s, names: s.names.filter((_, j) => j !== index) } : s));
    }
    if (category === null) plain = [...plain, ...placed];
    else if (sections.some(s => s.title === category)) sections = sections.map(s => (s.title === category ? { ...s, names: [...s.names, ...placed] } : s));
    else sections = [...sections, { title: category, names: placed }];
    cats.onChange(plain, sections.filter(s => s.names.length), custom);
    setPending(null);
  };

  return (
    <section className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] p-3.5 sm:p-4 space-y-3">
      <div>
        <h2 className="font-serif-ge text-[16px] font-bold text-[#7a2028]">
          {title} <span className="text-[13px] font-semibold text-[#b5a48c]">{count || ''}</span>
        </h2>
        <p className="text-[12px] leading-snug text-[#8a7a6a]">{hint}</p>
      </div>

      {/* the psalter group's members fill in by themselves */}
      {auto && auto.length > 0 && (
        <div className="rounded-xl bg-[#7a2028]/[0.04] ring-1 ring-[#7a2028]/10 px-3 py-2.5">
          <p className="text-[11.5px] font-bold text-[#7a2028] mb-1.5">ფსალმუნთა ჯგუფიდან — თავისით</p>
          <Rows
            names={auto.map(groupPrayerText)}
            label={i => (
              <>
                <span className="font-semibold">{auto[i].name}</span>{' '}
                <span className="text-[12.5px] text-[#8a7a6a]">{auto[i].short && `(${auto[i].short}) `}(ოჯ.)</span>
              </>
            )}
            onMove={(from, to) => onAutoOrder?.(moved(auto, from, to).map(p => p.uid))}
            onTap={i => onAutoTap?.(auto[i].uid)?.()}
            canTap={i => !!onAutoTap?.(auto[i].uid)}
          />
        </div>
      )}

      <Rows names={names} onChange={onChange} onTap={cats ? i => setPending({ kind: 'edit', name: names[i], from: null, index: i }) : undefined} />

      {cats?.sections.map(s => (
        <div key={s.title} className="space-y-1.5">
          <p className="px-1 pt-1 text-[12.5px] font-bold text-[#7a2028]">
            {s.title} <span className="font-semibold text-[#b5a48c]">{s.names.length}</span>
          </p>
          <Rows
            names={s.names}
            onChange={next => cats.onChange(names, cats.sections.map(x => (x.title === s.title ? { ...x, names: next } : x)).filter(x => x.names.length), cats.custom)}
            onTap={i => setPending({ kind: 'edit', name: s.names[i], from: s.title, index: i })}
          />
        </div>
      ))}

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

      {cats && pending && <CategorySheet pending={pending} custom={cats.custom} onClose={() => setPending(null)} onPlace={place} />}
    </section>
  );
};

/** The small window that asks which category the names go under — or lets one name be corrected and moved. */
const CategorySheet: React.FC<{
  pending: Pending;
  custom: string[];
  onClose: () => void;
  onPlace: (category: string | null, names: string[], custom: string[]) => void;
}> = ({ pending, custom, onClose, onPlace }) => {
  const editing = pending.kind === 'edit';
  const [name, setName] = useState(editing ? pending.name : '');
  const [chosen, setChosen] = useState<string | null>(editing ? pending.from : null);
  const [fresh, setFresh] = useState('');
  const [own, setOwn] = useState(custom);
  const choices = categoryChoices(own);

  const names = editing ? splitNames(name) : pending.names;
  const pick = (category: string | null) => {
    triggerHaptic(10);
    // fresh names go straight in; an edited one waits for „შენახვა“
    if (editing) setChosen(category);
    else onPlace(category, names, own);
  };
  const addCategory = () => {
    const title = fresh.trim().replace(/\s+/g, ' ');
    if (!title) return;
    const next = choices.includes(title) ? own : [...own, title];
    setOwn(next);
    setFresh('');
    if (editing) setChosen(title);
    else onPlace(title, names, next);
  };

  const chip = (label: string, value: string | null) => {
    const on = editing && chosen === value;
    return (
      <button
        key={label}
        type="button"
        onClick={() => pick(value)}
        aria-pressed={editing ? on : undefined}
        className={`h-11 px-4 rounded-full text-[14.5px] inline-flex items-center gap-1.5 cursor-pointer transition active:scale-95 ${
          on ? 'bg-[#7a2028] text-[#fbf6ec] font-semibold' : `bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40 ${value === null ? 'font-medium text-[#8a7a6a]' : 'font-semibold text-[#4a3426]'}`
        }`}
      >
        {on && <Check className="w-4 h-4" />}
        {label}
      </button>
    );
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={editing ? 'სახელის შესწორება' : 'რომელ კატეგორიაში ჩავწერო?'}
      footer={
        editing ? (
          <Btn full disabled={!names.length} onClick={() => onPlace(chosen, names, own)}>
            შენახვა
          </Btn>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && names.length) onPlace(chosen, names, own);
            }}
            aria-label="სახელი"
            className="w-full h-11 px-3.5 rounded-xl bg-white ring-1 ring-[#e8dcc8] focus:ring-2 focus:ring-[#7a2028]/40 outline-none text-[15px] font-medium text-[#2a2017]"
          />
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {names.map((n, i) => (
              <span key={`${i}-${n}`} className="h-8 px-3 rounded-full bg-[#7a2028]/[0.06] text-[14px] font-semibold text-[#7a2028] inline-flex items-center">
                {n}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {choices.map(c => chip(c, c))}
          {chip('კატეგორიის გარეშე', null)}
        </div>

        <form
          className="flex gap-2"
          onSubmit={e => {
            e.preventDefault();
            addCategory();
          }}
        >
          <input
            value={fresh}
            onChange={e => setFresh(e.target.value)}
            placeholder="ახალი კატეგორია"
            className="flex-1 min-w-0 h-11 px-3.5 rounded-xl bg-white ring-1 ring-[#e8dcc8] focus:ring-2 focus:ring-[#7a2028]/40 outline-none text-[15px] text-[#2a2017] placeholder:text-[#b5a48c]"
          />
          <button
            type="submit"
            disabled={!fresh.trim()}
            aria-label="კატეგორიის დამატება"
            className="h-11 w-11 shrink-0 rounded-xl bg-[#7a2028] text-[#fbf6ec] inline-flex items-center justify-center disabled:opacity-40 cursor-pointer active:scale-95 transition-transform"
          >
            <Plus className="w-5 h-5" />
          </button>
        </form>
      </div>
    </Sheet>
  );
};

// the list as it looks while one name is dragged from one place to another
const moved = <T,>(list: T[], from: number, to: number) => {
  const next = [...list];
  next.splice(to, 0, ...next.splice(from, 1));
  return next;
};

/** One ordered run of names, side by side: drag ⠿ to reorder, tap a name to correct it, ✕ to remove.
 *  The group's names (onMove) bring their own label, can't be removed here and are tapped only where allowed. */
const Rows: React.FC<{
  names: string[];
  onChange?: (names: string[]) => void;
  onTap?: (i: number) => void;
  canTap?: (i: number) => boolean;
  label?: (i: number) => React.ReactNode;
  onMove?: (from: number, to: number) => void;
}> = ({ names, onChange, onTap, canTap, label, onMove }) => {
  const [drag, setDrag] = useState<{ from: number; to: number } | null>(null);
  const [editing, setEditing] = useState<{ i: number; text: string } | null>(null);
  const listRef = useRef<HTMLOListElement>(null);

  // a tapped name turns into a field (lists without categories); an emptied one keeps its old spelling
  const commit = () => {
    if (!editing) return;
    const text = editing.text.trim().replace(/\s+/g, ' ');
    if (text && text !== names[editing.i]) onChange?.(names.map((n, j) => (j === editing.i ? text : n)));
    setEditing(null);
  };

  const onPointerDown = (i: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ from: i, to: i });
  };

  // the chip under the finger is where the dragged name goes
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const over = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-chip]');
    if (!over || over.parentElement !== listRef.current) return;
    const to = Number(over.dataset.chip);
    if (to !== drag.to) setDrag({ ...drag, to });
  };

  const onPointerUp = () => {
    if (drag && drag.from !== drag.to) {
      if (onMove) onMove(drag.from, drag.to);
      else onChange?.(moved(names, drag.from, drag.to));
      triggerHaptic(10);
    }
    setDrag(null);
  };

  if (!names.length) return null;
  // while dragging, chips keep their own keys so the held one is never re-made
  const ids = drag ? moved(names.map((_, i) => i), drag.from, drag.to) : names.map((_, i) => i);
  return (
    <ol ref={listRef} className="flex flex-wrap gap-1.5 select-none">
      {ids.map((i, pos) => {
        const name = names[i];
        const held = drag?.from === i;
        const tappable = onTap ? (canTap ? canTap(i) : true) : !!onChange;
        return (
          <li
            key={`${i}-${name}`}
            data-chip={pos}
            className={`inline-flex items-center h-10 max-w-full pl-0.5 ${onChange ? 'pr-0.5' : 'pr-3'} rounded-full ring-1 transition-shadow ${
              held ? 'z-10 bg-white ring-[#7a2028]/50 shadow-lg' : 'bg-[#fbf6ec] ring-[#e8dcc8]'
            }`}
          >
            <button
              type="button"
              aria-label={`${name} — გადაადგილება`}
              onPointerDown={onPointerDown(i)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className="w-7 h-9 shrink-0 flex items-center justify-center rounded-full text-[#c4b49c] hover:text-[#7a2028] cursor-grab active:cursor-grabbing touch-none"
            >
              <GripVertical className="w-4 h-4" />
            </button>
            {editing?.i === i ? (
              <input
                autoFocus
                value={editing.text}
                onChange={e => setEditing({ i, text: e.target.value })}
                onBlur={commit}
                onKeyDown={e => {
                  if (e.key === 'Enter') commit();
                  if (e.key === 'Escape') setEditing(null);
                }}
                size={Math.max(4, editing.text.length + 1)}
                aria-label="სახელის შესწორება"
                className="min-w-0 h-8 px-2 rounded-full bg-white ring-2 ring-[#7a2028]/40 outline-none text-[15px] font-medium text-[#2a2017]"
              />
            ) : tappable ? (
              <button
                type="button"
                onClick={() => (onTap ? onTap(i) : setEditing({ i, text: name }))}
                title="შესწორება"
                className={`min-w-0 h-9 px-1 truncate text-[15px] font-medium text-[#2a2017] ${onTap ? 'cursor-pointer' : 'cursor-text'}`}
              >
                {label ? label(i) : name}
              </button>
            ) : (
              <span className="min-w-0 px-1 truncate text-[15px] font-medium text-[#2a2017]">{label ? label(i) : name}</span>
            )}
            {onChange && (
              <button
                type="button"
                onClick={() => onChange(names.filter((_, j) => j !== i))}
                title="წაშლა"
                aria-label={`${name} — წაშლა`}
                className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full text-[#b5a48c] hover:text-[#7a2028] hover:bg-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
};
