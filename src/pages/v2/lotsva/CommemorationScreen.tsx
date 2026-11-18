import React, { useRef, useState } from 'react';
import { Check, ChevronRight, GripVertical, MoreHorizontal, Plus, X } from 'lucide-react';
import { useAuth, useNavigation } from '../../../context';
import { NAME_LISTS, NameListId, guessGender, nameCount, nameParts } from '../../../utils/commemoration';
import { Gender } from '../../../data/georgianNames';
import { GroupMember, GroupPrayerName, PsalterGroup, groupPrayerText } from '../../../hooks/usePsalter';
import {
  Cats, Genders, ListPatch, Pending, moved, useCommemorationPage, useGroupNameEdit, useNameList, useNameSheet,
} from '../../CommemorationPage';
import { offerUndo } from '../../../components/ui/kit';
import { triggerHaptic } from '../../../utils/haptics';
import { Button, Card, Field, Note, Pill, Press, RoundButton, Row, Rows, Seg, Sheet, Small, ToggleRow, TopBar } from '../../../components/ui2';
import { cx, FOCUS, FOCUS_IN } from '../../../components/ui2/cx';
import { PinRound } from '../gza/parts';

/** x-mosakhsenebeli — „მოსახსენებელი“ in the new look: the five cards became two tabs (ცოცხალნი · მიცვალებულნი), one field and
 *  one round + to add; the other lists (უძლურნი, განსაცდელში მყოფნი, the psalter group's people), „თავისით დალაგება“, moving
 *  names and the home button live in the ⋯ sheet. All rules are the old page's (CommemorationPage.tsx hooks). */

type Tab = 'living' | 'deceased';
const TAB_KEY = 'sg-commem-tab';
const EXTRA: { id: NameListId; title: string }[] = [
  { id: 'sick', title: 'უძლურნი' },
  { id: 'trial', title: 'განსაცდელში მყოფნი' },
  { id: 'group', title: 'ჯგუფის წევრები' },
];
const fullTitle = (id: NameListId) => NAME_LISTS.find(l => l.id === id)?.title ?? '';

export const CommemorationScreen: React.FC = () => {
  const { handleGoBack } = useNavigation();
  const { user } = useAuth();
  const page = useCommemorationPage();
  const { lists } = page;
  const [tab, setTabState] = useState<Tab>(() => { try { return sessionStorage.getItem(TAB_KEY) === 'deceased' ? 'deceased' : 'living'; } catch { return 'living'; } });
  const setTab = (t: Tab) => { setTabState(t); try { sessionStorage.setItem(TAB_KEY, t); } catch { /* the visit only */ } };
  const [more, setMore] = useState(false);
  const [extra, setExtra] = useState<NameListId | null>(null);
  // „რიგის შეცვლა“: each name gets its ⠿ handle to be dragged
  const [reorder, setReorder] = useState(false);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 pb-4">
      <TopBar
        title="მოსახსენებელი"
        onBack={handleGoBack}
        right={<RoundButton label="მეტი" onClick={() => setMore(true)}><MoreHorizontal strokeWidth={1.75} /></RoundButton>}
      />
      <Seg<Tab>
        label="რომელი სია"
        items={[
          { id: 'living', label: `ცოცხალნი · ${nameCount(lists, 'living')}` },
          { id: 'deceased', label: `მიცვალებულნი · ${nameCount(lists, 'deceased')}` },
        ]}
        value={tab}
        onChange={setTab}
      />
      <ListEditor key={tab} {...page.listProps(tab)} reorder={reorder} />

      <Sheet open={more} title="მოსახსენებელი" onClose={() => setMore(false)}>
        <Rows>
          {EXTRA.map(l => (
            <Row
              key={l.id}
              title={l.title}
              sub={l.id === 'group' ? 'ფსალმუნთა ჯგუფიდან და ჩემი ჩაწერილი' : fullTitle(l.id)}
              right={<span className="flex items-center gap-1"><Small>{nameCount(lists, l.id) || ''}</Small><Chev /></span>}
              onClick={() => { setMore(false); setExtra(l.id); }}
            />
          ))}
        </Rows>
        <Rows>
          <ToggleRow title="თავისით დალაგება" sub="ახალი სახელი თავის ადგილას ჩადგება" on={lists.autoSort} onChange={page.setAutoSort} />
          <ToggleRow title="რიგის შეცვლა" sub="სახელს ⠿ გამოუჩნდება — გადაათრიე" on={reorder} onChange={setReorder} />
          {user && <Row title="მთავარ გვერდზე" sub="ღილაკი მთავარ გვერდზე" right={<PinRound id="special:commemoration" />} />}
        </Rows>
      </Sheet>

      <Sheet open={!!extra} title={extra ? fullTitle(extra) : ''} onClose={() => setExtra(null)}>
        {extra && <ListEditor key={extra} {...page.listProps(extra)} reorder={reorder} />}
      </Sheet>

      {page.person && (
        <GroupNameSheet
          person={page.person}
          leader={page.leaderOf(page.person.uid)}
          genders={lists.genders}
          ordered={lists.autoSort}
          onGenders={genders => page.update({ genders })}
          onClose={page.closePerson}
        />
      )}
    </div>
  );
};

const Chev: React.FC = () => <ChevronRight aria-hidden="true" strokeWidth={2} className="size-[18px] shrink-0 text-mut" />;

/** One list: its names as chips (the categories' under their names), the names the app can't tell a man from a woman,
 *  then the field and the round +. */
const ListEditor: React.FC<{
  names: string[];
  genders: Genders;
  ordered: boolean;
  onSave: (patch: ListPatch) => void;
  auto?: GroupPrayerName[];
  onAutoOrder?: (uids: string[]) => void;
  onAutoTap?: (uid: string) => (() => void) | undefined;
  cats?: Cats;
  reorder: boolean;
}> = ({ names, genders, ordered, onSave, auto, onAutoOrder, onAutoTap, cats, reorder }) => {
  const { draft, setDraft, pending, setPending, add, place, unknown } = useNameList({ names, genders, ordered, onSave, auto, cats });
  const empty = !names.length && !(auto?.length) && !(cats?.sections.length);
  return (
    <>
      <Card className="flex flex-col gap-3">
        {/* the psalter group's people fill in by themselves */}
        {auto && auto.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <Small tone="wine" className="px-1">ფსალმუნთა ჯგუფიდან — თავისით</Small>
            <NameChips
              names={auto.map(groupPrayerText)}
              reorder={reorder}
              label={i => <><span className="font-bold">{auto[i].name}</span>{auto[i].short && <span className="font-normal text-mut"> ({auto[i].short})</span>}</>}
              onMove={(from, to) => onAutoOrder?.(moved(auto, from, to).map(p => p.uid))}
              onTap={i => onAutoTap?.(auto[i].uid)?.()}
              canTap={i => !!onAutoTap?.(auto[i].uid)}
            />
          </div>
        )}
        <NameChips
          names={names}
          reorder={reorder}
          onChange={next => onSave({ names: next })}
          onTap={i => setPending({ kind: 'edit', name: names[i], from: null, index: i })}
        />
        {cats?.sections.map(s => (
          <div key={s.title} className="flex flex-col gap-1.5">
            <Small tone="wine" className="px-1">{s.title} <span className="font-semibold text-mut">{s.names.length}</span></Small>
            <NameChips
              names={s.names}
              reorder={reorder}
              onChange={next => onSave({ sections: cats.sections.map(x => (x.title === s.title ? { ...x, names: next } : x)).filter(x => x.names.length) })}
              onTap={i => setPending({ kind: 'edit', name: s.names[i], from: s.title, index: i })}
            />
          </div>
        ))}
        {empty && <p className="px-1 text-body text-mut">სახელი ჯერ არ არის — ჩაწერე ქვემოთ.</p>}
        {unknown.length > 0 && (
          <p className="px-1 text-meta leading-snug text-gold-ink">
            ვერ ვიცანი, კაცია თუ ქალი: <span className="font-semibold">{[...new Set(unknown.map(n => nameParts(n).bare))].join(', ')}</span>. დააჭირე
            სახელს და მონიშნე.
          </p>
        )}
      </Card>

      <form className="flex shrink-0 items-center gap-2" onSubmit={e => { e.preventDefault(); add(); }}>
        <label className="flex h-tap-lg min-w-0 flex-1 items-center rounded-full bg-surf px-[18px] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-wine/60">
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="სახელი"
            aria-label="ახალი სახელი"
            className="h-full min-w-0 flex-1 bg-transparent text-lead text-ink outline-none placeholder:text-faint"
          />
        </label>
        <RoundButton type="submit" label="სახელის დამატება" size={48} tone="wine" disabled={!draft.trim()}><Plus strokeWidth={2} /></RoundButton>
      </form>

      {pending && <NameSheet pending={pending} cats={cats} genders={genders} ordered={ordered} onClose={() => setPending(null)} onPlace={place} />}
    </>
  );
};

/** A run of names as chips that wrap: a tap on a name corrects it, ✕ takes it off (with „გაუქმება“); with „რიგის შეცვლა“
 *  on, ⠿ drags it to another place. The group's names (onMove) bring their own label and can't be taken off here. */
const NameChips: React.FC<{
  names: string[];
  reorder: boolean;
  onChange?: (names: string[]) => void;
  onTap: (i: number) => void;
  canTap?: (i: number) => boolean;
  label?: (i: number) => React.ReactNode;
  onMove?: (from: number, to: number) => void;
}> = ({ names, reorder, onChange, onTap, canTap, label, onMove }) => {
  const [drag, setDrag] = useState<{ from: number; to: number } | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const latest = useRef(names);
  latest.current = names;
  if (!names.length) return null;

  const grab = (i: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ from: i, to: i });
  };
  // the chip under the finger is where the dragged name goes
  const over = (e: React.PointerEvent) => {
    if (!drag) return;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-chip]');
    if (!el || el.parentElement !== listRef.current) return;
    const to = Number(el.dataset.chip);
    if (to !== drag.to) setDrag({ ...drag, to });
  };
  const drop = () => {
    if (drag && drag.from !== drag.to) {
      if (onMove) onMove(drag.from, drag.to);
      else onChange?.(moved(names, drag.from, drag.to));
      triggerHaptic(10);
    }
    setDrag(null);
  };
  const remove = (i: number) => {
    if (!onChange) return;
    const name = names[i];
    onChange(names.filter((_, j) => j !== i));
    offerUndo(`„${name}“ წაიშალა`, () => {
      const now = latest.current;
      onChange([...now.slice(0, i), name, ...now.slice(i)]);
    });
  };
  // while dragging, chips keep their own keys so the held one is never made anew
  const ids = drag ? moved(names.map((_, i) => i), drag.from, drag.to) : names.map((_, i) => i);
  return (
    <ul ref={listRef} className="flex flex-wrap gap-2 select-none">
      {ids.map((i, pos) => {
        const name = names[i];
        const held = drag?.from === i;
        const tappable = !canTap || canTap(i);
        const text = label ? label(i) : name;
        return (
          <li
            key={`${i}-${name}`}
            data-chip={pos}
            title={name}
            className={cx(
              'flex min-h-tap max-w-full min-w-0 items-center rounded-full transition-shadow',
              held ? 'z-10 bg-surf shadow-lift ring-2 ring-wine/50' : 'bg-page',
              !reorder && 'pl-1.5',
              !onChange && 'pr-2.5',
            )}
          >
            {reorder && (
              <button
                type="button"
                aria-label={`${name} — გადაადგილება`}
                onPointerDown={grab(i)}
                onPointerMove={over}
                onPointerUp={drop}
                onPointerCancel={drop}
                className="flex h-tap w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-l-full text-mut active:cursor-grabbing"
              >
                <GripVertical className="size-4" />
              </button>
            )}
            {tappable ? (
              <Press onClick={() => onTap(i)} className={cx('min-h-tap min-w-0 cursor-pointer rounded-full px-2.5 py-2 text-left text-body leading-snug font-semibold wrap-break-word', FOCUS_IN)}>
                {text}
              </Press>
            ) : (
              <span className="min-w-0 px-2.5 py-2 text-body leading-snug font-semibold wrap-break-word">{text}</span>
            )}
            {onChange && (
              <Press
                onClick={() => remove(i)}
                aria-label={`${name} — წაშლა`}
                title="წაშლა"
                className={cx('relative mr-1 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-mut active:bg-soft before:absolute before:-inset-1 before:rounded-full', FOCUS)}
              >
                <X className="size-4" />
              </Press>
            )}
          </li>
        );
      })}
    </ul>
  );
};

/** კაცი / ქალი for one name: what the app guessed until the student picks. */
const GenderSeg: React.FC<{ value: Gender | undefined; onPick: (g: Gender) => void }> = ({ value, onPick }) => (
  <Seg<Gender>
    label="კაცი თუ ქალი"
    items={[{ id: 'm', label: 'კაცი' }, { id: 'f', label: 'ქალი' }]}
    value={(value ?? '') as Gender}
    onChange={g => { triggerHaptic(8); onPick(g); }}
  />
);

// a pill to pick a category with
const catChip = (on: boolean, plain: boolean) => cx(
  'flex h-tap cursor-pointer items-center gap-1.5 rounded-full px-4 text-body whitespace-nowrap transition active:scale-[0.97] [&_svg]:size-4',
  on ? 'bg-wine font-bold text-white' : plain ? 'bg-surf font-medium text-mut' : 'bg-surf font-semibold text-ink',
  FOCUS,
);

/** Which category fresh names go under — or one name corrected: its spelling, its category, man or woman, a clergy title. */
const NameSheet: React.FC<{
  pending: Pending;
  cats?: Cats;
  genders: Genders;
  ordered: boolean;
  onClose: () => void;
  onPlace: (category: string | null, names: string[], custom: string[], genders: Genders) => void;
}> = ({ pending, cats, genders, ordered, onClose, onPlace }) => {
  const { editing, name, setName, chosen, picked, setPicked, fresh, setFresh, choices, names, title, bare, titles, done, pick, addCategory } =
    useNameSheet(pending, cats, genders, ordered, onPlace);
  const chip = (label: string, value: string | null) => {
    const on = editing && chosen === value;
    return (
      <Press key={label} onClick={() => pick(value)} aria-pressed={editing ? on : undefined} className={catChip(on, value === null)}>
        {on && <Check aria-hidden="true" />}
        {label}
      </Press>
    );
  };
  return (
    <Sheet open title={editing ? 'სახელის შესწორება' : 'რომელ კატეგორიაში ჩავწერო?'} onClose={onClose}>
      {editing ? (
        <>
          <Field
            label="სახელი"
            autoFocus
            value={name}
            onChange={setName}
            onKeyDown={e => { if (e.key === 'Enter' && names.length) done(chosen); }}
          />
          {ordered && (
            <>
              <GenderSeg value={picked ?? guessGender(name)} onPick={setPicked} />
              <label className="flex flex-col gap-1.5">
                <span className="pl-1.5 text-meta font-semibold text-mut">წოდება</span>
                <select
                  value={title}
                  onChange={e => setName(e.target.value ? `${e.target.value} ${bare}` : bare)}
                  className={cx('h-[52px] w-full cursor-pointer rounded-full bg-surf px-[18px] text-lead text-ink', FOCUS)}
                >
                  <option value="">ერისკაცი</option>
                  {titles.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
            </>
          )}
        </>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {names.map((n, i) => <Pill key={`${i}-${n}`}>{n}</Pill>)}
        </div>
      )}

      {cats && (
        <>
          <div className="flex flex-wrap gap-2">
            {choices.map(c => chip(c, c))}
            {chip('კატეგორიის გარეშე', null)}
          </div>
          <form className="flex items-center gap-2" onSubmit={e => { e.preventDefault(); addCategory(); }}>
            <label className="flex h-tap-lg min-w-0 flex-1 items-center rounded-full bg-surf px-[18px] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-wine/60">
              <input
                value={fresh}
                onChange={e => setFresh(e.target.value)}
                placeholder="ახალი კატეგორია"
                aria-label="ახალი კატეგორია"
                className="h-full min-w-0 flex-1 bg-transparent text-lead text-ink outline-none placeholder:text-faint"
              />
            </label>
            <RoundButton type="submit" label="კატეგორიის დამატება" size={48} tone="wine" disabled={!fresh.trim()}><Plus strokeWidth={2} /></RoundButton>
          </form>
        </>
      )}

      {editing && <Button full disabled={!names.length} onClick={() => done(chosen)}>შენახვა</Button>}
    </Sheet>
  );
};

/** A group member tapped: a group leader corrects how the member is named at „დიდებაი“ (in every group of theirs that
 *  member is in); with the order on, anyone marks the member a man or a woman. */
const GroupNameSheet: React.FC<{
  person: GroupPrayerName;
  leader?: { member: GroupMember; groups: PsalterGroup[] };
  genders: Genders;
  ordered: boolean;
  onGenders: (genders: Genders) => void;
  onClose: () => void;
}> = ({ person, leader, genders, ordered, onGenders, onClose }) => {
  const { name, setName, picked, setPicked, busy, error, save } = useGroupNameEdit(person, leader, genders, ordered, onGenders, onClose);
  return (
    <Sheet open title={leader ? 'სახელი ლოცვაში' : person.name} onClose={onClose}>
      {leader && (
        <>
          <Note>ასე მოიხსენიებს ჯგუფი ამ წევრს „დიდებაი“-ზე. ცვლილება ჯგუფის ყველა წევრს გამოუჩნდება.</Note>
          <Field
            label={`${leader.member.name}${leader.groups.length > 1 ? ` · ${leader.groups.length} ჯგუფში` : ''}`}
            autoFocus
            value={name}
            onChange={setName}
            onKeyDown={e => { if (e.key === 'Enter') void save(); }}
          />
        </>
      )}
      {ordered && <GenderSeg value={picked ?? guessGender(name || person.name)} onPick={setPicked} />}
      {error && <p className="px-1.5 text-meta font-semibold text-danger">{error}</p>}
      <Button full disabled={busy} onClick={() => void save()}>შენახვა</Button>
    </Sheet>
  );
};
