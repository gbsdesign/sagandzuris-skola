import React, { useMemo, useRef, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Check, GripVertical, Plus, X } from 'lucide-react';
import {
  NAME_LISTS,
  NameListId,
  NameSection,
  categoryChoices,
  compareNames,
  genderKey,
  genderOf,
  guessGender,
  inGroupOrder,
  insertSorted,
  isCategoryList,
  nameCount,
  nameParts,
  splitNames,
  useCommemoration,
} from '../utils/commemoration';
import { CLERGY_TITLES, Gender } from '../data/georgianNames';
import { triggerHaptic } from '../utils/haptics';
import { useAuth } from '../context';
import { GroupMember, GroupPrayerName, PsalterGroup, firstName, groupPrayerText, useGroupPrayerNames, useMyPsalterGroups } from '../hooks/usePsalter';
import { Btn, Sheet, Toggle } from '../components/ui/kit';

type Genders = Record<string, Gender>;

// the student's mark for a name, kept only where it differs from what the app guesses
const withGender = (genders: Genders, entry: string, picked: Gender | undefined): Genders => {
  const key = genderKey(entry);
  const mark = picked && picked !== guessGender(entry) ? picked : undefined;
  if (genders[key] === mark) return genders;
  const rest = Object.fromEntries(Object.entries(genders).filter(([k]) => k !== key));
  return mark ? { ...rest, [key]: mark } : rest;
};

// what a list sends back to be saved
type ListPatch = { names?: string[]; sections?: NameSection[]; custom?: string[]; genders?: Genders };

// "მოსახსენებელი": the names a student prays for. Their order here is the order they are read in prayers.
export const CommemorationPage: React.FC = () => {
  const { lists, save } = useCommemoration();
  const { user, isAdmin, isTeacher } = useAuth();
  const fromGroups = useGroupPrayerNames(user?.uid);
  const { groups } = useMyPsalterGroups(user?.uid);
  const [tapped, setTapped] = useState<string | null>(null);

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
  const person = tapped ? fromGroups.find(p => p.uid === tapped) : undefined;

  const update = (patch: Partial<typeof lists>) => save({ ...lists, ...patch });
  const saveList = (id: NameListId) => (p: ListPatch) =>
    update({
      ...(p.names ? { [id]: p.names } : {}),
      ...(p.sections && isCategoryList(id) ? { sections: { ...lists.sections, [id]: p.sections } } : {}),
      ...(p.custom ? { customCategories: p.custom } : {}),
      ...(p.genders ? { genders: p.genders } : {}),
    });

  return (
    <div className="w-full max-w-2xl mx-auto mb-6 px-1 space-y-4">
      {/* one switch, no instructions: names are added, dragged by their handle and tapped to fix */}
      <div className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3.5 sm:px-4">
        <Toggle
          on={lists.autoSort}
          label="თავისით დალაგება"
          // turning it on leaves the names where they are (the group's people too); only new ones take their place
          onChange={on => update(on ? { autoSort: true, groupOrder: inGroupOrder(fromGroups, lists).map(p => p.uid) } : { autoSort: false })}
        />
      </div>
      {NAME_LISTS.map(list => {
        const id = list.id;
        return (
          <NameList
            key={id}
            title={list.title}
            count={nameCount(lists, id)}
            names={lists[id]}
            genders={lists.genders}
            ordered={lists.autoSort}
            onSave={saveList(id)}
            cats={isCategoryList(id) ? { sections: lists.sections[id], custom: lists.customCategories } : undefined}
            {...(id === 'group'
              ? {
                  auto: inGroupOrder(fromGroups, lists),
                  onAutoOrder: (groupOrder: string[]) => update({ groupOrder }),
                  // a leader renames a member; with the order on anyone marks a member a man or a woman
                  onAutoTap: (uid: string) => (lists.autoSort || behind.has(uid) ? () => setTapped(uid) : undefined),
                }
              : {})}
          />
        );
      })}
      {person && (
        <GroupNameSheet
          person={person}
          leader={behind.get(person.uid)}
          genders={lists.genders}
          ordered={lists.autoSort}
          onGenders={genders => update({ genders })}
          onClose={() => setTapped(null)}
        />
      )}
    </div>
  );
};

/** კაცი / ქალი for one name: what the app guessed until the student picks. */
const GenderPick: React.FC<{ value: Gender | undefined; onPick: (g: Gender) => void }> = ({ value, onPick }) => (
  <div className="inline-flex shrink-0 h-11 p-1 rounded-xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8]" role="radiogroup" aria-label="კაცი თუ ქალი">
    {(
      [
        ['m', 'კაცი'],
        ['f', 'ქალი'],
      ] as const
    ).map(([g, label]) => (
      <button
        key={g}
        type="button"
        role="radio"
        aria-checked={value === g}
        onClick={() => {
          triggerHaptic(8);
          onPick(g);
        }}
        className={`h-9 px-4 rounded-lg text-[14px] font-semibold cursor-pointer transition-colors ${
          value === g ? 'bg-[#7a2028] text-[#fbf6ec]' : 'text-[#6b5544] hover:text-[#7a2028]'
        }`}
      >
        {label}
      </button>
    ))}
  </div>
);

/** A group member tapped: a group leader corrects how the member is named at „დიდებაი“ — in every group of theirs
 *  that member is in; with the order on, anyone marks the member a man or a woman. */
const GroupNameSheet: React.FC<{
  person: GroupPrayerName;
  leader?: { member: GroupMember; groups: PsalterGroup[] };
  genders: Genders;
  ordered: boolean;
  onGenders: (genders: Genders) => void;
  onClose: () => void;
}> = ({ person, leader, genders, ordered, onGenders, onClose }) => {
  const before = leader ? (leader.member.prayer || firstName(leader.member.name)).trim() : person.name;
  const [name, setName] = useState(before);
  const [picked, setPicked] = useState<Gender | undefined>(genders[genderKey(person.name)]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    const prayer = name.trim().replace(/\s+/g, ' ') || before;
    const nextGenders = ordered ? withGender(genders, prayer, picked) : genders;
    if (nextGenders !== genders) onGenders(nextGenders);
    if (!leader || prayer === before) return onClose();
    setBusy(true);
    setError('');
    try {
      await Promise.all(
        leader.groups.map(g =>
          updateDoc(doc(db, 'psalterGroups', g.id), {
            members: g.members.map(m => (m.uid === leader.member.uid ? { ...m, prayer } : m)),
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
      title={leader ? 'სახელი ლოცვაში' : person.name}
      footer={
        <Btn full disabled={busy} onClick={save}>
          შენახვა
        </Btn>
      }
    >
      <div className="space-y-3">
        {leader && (
          <>
            <p className="text-[12.5px] leading-snug text-[#8a7a6a]">ასე მოიხსენიებს ჯგუფი ამ წევრს „დიდებაი“-ზე. ცვლილება ჯგუფის ყველა წევრს გამოუჩნდება.</p>
            <label className="block space-y-1">
              <span className="block text-[12.5px] font-semibold text-[#75685a]">
                {leader.member.name}
                {leader.groups.length > 1 && <span className="font-normal text-[#b5a48c]"> · {leader.groups.length} ჯგუფში</span>}
              </span>
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') void save();
                }}
                className="w-full h-11 px-3.5 rounded-xl bg-white ring-1 ring-[#e8dcc8] focus:ring-2 focus:ring-[#7a2028]/40 outline-none text-[15px] font-medium text-[#2a2017]"
              />
            </label>
          </>
        )}
        {ordered && <GenderPick value={picked ?? guessGender(name || person.name)} onPick={setPicked} />}
        {error && <p className="text-[13px] font-semibold text-[#9a3324]">{error}</p>}
      </div>
    </Sheet>
  );
};

type Cats = { sections: NameSection[]; custom: string[] };

// what the name sheet is doing: placing freshly written names, or one name tapped in the list
type Pending = { kind: 'add'; names: string[] } | { kind: 'edit'; name: string; from: string | null; index: number };

// names written after „მეზობლები:“ go under that category (tidy places them); the rest take their place here
const insertNames = (list: string[], fresh: string[], cmp: (a: string, b: string) => number) => {
  const cut = fresh.findIndex(n => n.endsWith(':'));
  return cut < 0 ? insertSorted(list, fresh, cmp) : [...insertSorted(list, fresh.slice(0, cut), cmp), ...fresh.slice(cut)];
};

const NameList: React.FC<{
  title: string;
  count: number;
  names: string[];
  genders: Genders;
  // „დალაგება“ is on
  ordered: boolean;
  onSave: (patch: ListPatch) => void;
  auto?: GroupPrayerName[];
  // the group's people dragged into a new order (their uids)
  onAutoOrder?: (uids: string[]) => void;
  // a group name the reader may tap gives back what tapping it does
  onAutoTap?: (uid: string) => (() => void) | undefined;
  cats?: Cats;
}> = ({ title, count, names, genders, ordered, onSave, auto, onAutoOrder, onAutoTap, cats }) => {
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<Pending | null>(null);

  // new names go to the end — or, with the order on, each to its place
  const put = (list: string[], fresh: string[], g = genders) => (ordered ? insertNames(list, fresh, (a, b) => compareNames(a, b, g)) : [...list, ...fresh]);

  const add = () => {
    // several names at once — "ნუნუ ნანა ნიკა" — become separate names
    const fresh = splitNames(draft).filter(n => cats || !n.endsWith(':'));
    if (!fresh.length) return;
    triggerHaptic(10);
    setDraft('');
    // „მეზობლები: ანა დათო“ already says where the names go
    if (cats && !fresh[0].endsWith(':')) setPending({ kind: 'add', names: fresh });
    else onSave({ names: put(names, fresh) });
  };

  // puts names under a category (or none), taking the edited one out of where it was
  const place = (category: string | null, placed: string[], custom: string[], nextGenders: Genders) => {
    if (!pending) return;
    const done = (plain: string[], sections: NameSection[]) => {
      onSave(cats ? { names: plain, sections: sections.filter(s => s.names.length), custom, genders: nextGenders } : { names: plain, genders: nextGenders });
      setPending(null);
    };
    let plain = [...names];
    let sections = (cats?.sections || []).map(s => ({ ...s, names: [...s.names] }));
    if (pending.kind === 'edit') {
      const { from, index } = pending;
      if (from === category && (!ordered || (placed.join(' ') === pending.name && nextGenders === genders))) {
        // same place: the name changes where it stands
        const at = (list: string[]) => [...list.slice(0, index), ...placed, ...list.slice(index + 1)];
        if (category === null) plain = at(plain);
        else sections = sections.map(s => (s.title === category ? { ...s, names: at(s.names) } : s));
        return done(plain, sections);
      }
      if (from === null) plain.splice(index, 1);
      else sections = sections.map(s => (s.title === from ? { ...s, names: s.names.filter((_, j) => j !== index) } : s));
    }
    if (category === null) plain = put(plain, placed, nextGenders);
    else if (sections.some(s => s.title === category)) sections = sections.map(s => (s.title === category ? { ...s, names: put(s.names, placed, nextGenders) } : s));
    else sections = [...sections, { title: category, names: placed }];
    done(plain, sections);
  };

  // with the order on: names the app can't tell a man from a woman wait at the end until marked
  const unknown = ordered
    ? [...(auto || []).map(p => p.name), ...names, ...(cats?.sections.flatMap(s => s.names) || [])].filter(n => !genderOf(n, genders))
    : [];

  return (
    <section className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] p-3.5 sm:p-4 space-y-3">
      <h2 className="font-serif-ge text-[16px] font-bold text-[#7a2028]">
        {title} <span className="text-[13px] font-semibold text-[#b5a48c]">{count || ''}</span>
      </h2>

      {/* the psalter group's members fill in by themselves */}
      {auto && auto.length > 0 && (
        <div className="rounded-xl bg-[#7a2028]/[0.04] ring-1 ring-[#7a2028]/10 px-3 py-2.5">
          <p className="text-[11.5px] font-bold text-[#7a2028] mb-1.5">ფსალმუნთა ჯგუფიდან — თავისით</p>
          <Rows
            names={auto.map(groupPrayerText)}
            label={i => (
              <>
                <span className="font-semibold">{auto[i].name}</span>{' '}
                <span className="text-[12.5px] text-[#8a7a6a]">{auto[i].short && `(${auto[i].short})`}</span>
              </>
            )}
            onMove={(from, to) => onAutoOrder?.(moved(auto, from, to).map(p => p.uid))}
            onTap={i => onAutoTap?.(auto[i].uid)?.()}
            canTap={i => !!onAutoTap?.(auto[i].uid)}
          />
        </div>
      )}

      <Rows names={names} onChange={next => onSave({ names: next })} onTap={i => setPending({ kind: 'edit', name: names[i], from: null, index: i })} />

      {cats?.sections.map(s => (
        <div key={s.title} className="space-y-1.5">
          <p className="px-1 pt-1 text-[12.5px] font-bold text-[#7a2028]">
            {s.title} <span className="font-semibold text-[#b5a48c]">{s.names.length}</span>
          </p>
          <Rows
            names={s.names}
            onChange={next => onSave({ sections: cats.sections.map(x => (x.title === s.title ? { ...x, names: next } : x)).filter(x => x.names.length) })}
            onTap={i => setPending({ kind: 'edit', name: s.names[i], from: s.title, index: i })}
          />
        </div>
      ))}

      {unknown.length > 0 && (
        <p className="px-1 text-[12px] leading-snug text-[#9a6a2a]">
          ვერ ვიცანი, კაცია თუ ქალი: <span className="font-semibold">{[...new Set(unknown.map(n => nameParts(n).bare))].join(', ')}</span>. დააჭირე
          სახელს და მონიშნე.
        </p>
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

      {pending && <NameSheet pending={pending} cats={cats} genders={genders} ordered={ordered} onClose={() => setPending(null)} onPlace={place} />}
    </section>
  );
};

/** The small window that asks which category new names go under — or lets one name be corrected: its spelling,
 *  (on the lists that have them) its category, and with the order on, man or woman and a clergy title. */
const NameSheet: React.FC<{
  pending: Pending;
  cats?: Cats;
  genders: Genders;
  ordered: boolean;
  onClose: () => void;
  onPlace: (category: string | null, names: string[], custom: string[], genders: Genders) => void;
}> = ({ pending, cats, genders, ordered, onClose, onPlace }) => {
  const editing = pending.kind === 'edit';
  const [name, setName] = useState(editing ? pending.name : '');
  const [chosen, setChosen] = useState<string | null>(editing ? pending.from : null);
  const [picked, setPicked] = useState<Gender | undefined>(editing ? genders[genderKey(pending.name)] : undefined);
  const [fresh, setFresh] = useState('');
  const [own, setOwn] = useState(cats?.custom || []);
  const choices = categoryChoices(own);

  const names = editing ? splitNames(name) : pending.names;
  const { title, bare } = nameParts(name);
  const titles = [...CLERGY_TITLES.map(t => t.title), ...(title && !CLERGY_TITLES.some(t => t.title === title) ? [title] : [])];
  // the gender mark goes with the one name being corrected
  const nextGenders = () => (ordered && editing && names.length === 1 && genderKey(names[0]) ? withGender(genders, names[0], picked) : genders);
  const done = (category: string | null, custom = own) => onPlace(category, names, custom, nextGenders());

  const pick = (category: string | null) => {
    triggerHaptic(10);
    // fresh names go straight in; an edited one waits for „შენახვა“
    if (editing) setChosen(category);
    else done(category);
  };
  const addCategory = () => {
    const t = fresh.trim().replace(/\s+/g, ' ');
    if (!t) return;
    const next = choices.includes(t) ? own : [...own, t];
    setOwn(next);
    setFresh('');
    if (editing) setChosen(t);
    else done(t, next);
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
          <Btn full disabled={!names.length} onClick={() => done(chosen)}>
            შენახვა
          </Btn>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {editing ? (
          <div className="space-y-2.5">
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && names.length) done(chosen);
              }}
              aria-label="სახელი"
              className="w-full h-11 px-3.5 rounded-xl bg-white ring-1 ring-[#e8dcc8] focus:ring-2 focus:ring-[#7a2028]/40 outline-none text-[15px] font-medium text-[#2a2017]"
            />
            {ordered && <div className="flex flex-wrap gap-2">
              <GenderPick value={picked ?? guessGender(name)} onPick={setPicked} />
              <select
                value={title}
                onChange={e => setName(e.target.value ? `${e.target.value} ${bare}` : bare)}
                aria-label="წოდება"
                className="flex-1 min-w-[10rem] h-11 px-3 rounded-xl bg-white ring-1 ring-[#e8dcc8] focus:ring-2 focus:ring-[#7a2028]/40 outline-none text-[15px] font-medium text-[#2a2017] cursor-pointer"
              >
                <option value="">ერისკაცი</option>
                {titles.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>}
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {names.map((n, i) => (
              <span key={`${i}-${n}`} className="h-8 px-3 rounded-full bg-[#7a2028]/[0.06] text-[14px] font-semibold text-[#7a2028] inline-flex items-center">
                {n}
              </span>
            ))}
          </div>
        )}

        {cats && (
          <>
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
          </>
        )}
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
  onTap: (i: number) => void;
  canTap?: (i: number) => boolean;
  label?: (i: number) => React.ReactNode;
  onMove?: (from: number, to: number) => void;
}> = ({ names, onChange, onTap, canTap, label, onMove }) => {
  const [drag, setDrag] = useState<{ from: number; to: number } | null>(null);
  const listRef = useRef<HTMLOListElement>(null);

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
            {!canTap || canTap(i) ? (
              <button
                type="button"
                onClick={() => onTap(i)}
                title="შესწორება"
                className="min-w-0 h-9 px-1 truncate text-[15px] font-medium text-[#2a2017] cursor-pointer"
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
