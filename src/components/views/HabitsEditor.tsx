import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, CalendarDays, Check, GripVertical, Hash, Minus, Palette, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { HABIT_GROUPS, HabitGroupType, HabitMenu } from '../../data/habitsAndManera';
import { COUNTER_UNITS, HABIT_ICON_IDS, HABIT_TONES, HabitCounter, HabitLook, MAX_COUNTER_GOAL, TONE_IDS } from '../../data/habitLooks';
import {
  MENUS,
  MENU_LABELS,
  addHabit,
  removeHabit,
  removedHabits,
  reorderGroup,
  restoreHabit,
  MyHabitGroup,
  setHabitAlerts,
  setHabitCounter,
  setHabitGroup,
  setHabitLabel,
  setHabitLinks,
  setHabitLook,
  setHabitMenu,
  setHabitNote,
  setHabitRichNote,
  setHabitSchedule,
  setHabitTime,
} from '../../utils/myHabits';
import { EDIT_LABEL, EDIT_ROW, HabitExtras } from './HabitLinks';
import { ScheduleRows, TimeAlertsRow, newSchedule } from './HabitPlanEditor';
import { useMyHabits } from '../../hooks/useMyHabits';
import { useDragSort } from '../ui/useDragSort';
import { Btn, FIELD, Toggle } from '../ui/kit';
import { HabitBadge, HabitIcon, tint } from '../habits/HabitIcon';

// Changing the member's own list, right on the habits (saved at once, utils/myHabits): ✏️ in a habit's window opens
// its settings there — how often (its group), its colour and icon, a counter, what it opens (its prayers: the book
// button; other buttons found by the search or a site's address), a note of its own — and taking it away. At the end
// of each list on the day: „+ ჩვევის დამატება“ (a removed habit comes back from there too) and „⇅ რიგი“, which gives
// the rows a grip to drag them within their group.

type Mine = ReturnType<typeof useMyHabits>;
type Choice = HabitMenu | 'none';

const groupTitle = (g: Pick<HabitGroupType, 'id' | 'title'>) => (g.id === 'daily' ? 'ყოველდღე' : g.title);

const CHIP = 'min-h-10 px-3.5 py-2 rounded-xl text-[13.5px] font-semibold ring-1 cursor-pointer transition-colors active:scale-[0.97]';
const chip = (on: boolean) => `${CHIP} ${on ? 'bg-[#7a2028] text-[#fbf6ec] ring-[#7a2028]' : 'bg-[#fbf6ec] text-[#4a3426] ring-[#e8dcc8] hover:ring-[#7a2028]/40'}`;

// one group's habits with a grip each; a group's name only when the list holds more than one
const ReorderGroup: React.FC<{ group: MyHabitGroup; mine: Mine; titled: boolean }> = ({ group, mine, titled }) => {
  const ids = group.items.map(h => h.id);
  const { container, order, dragging, grip } = useDragSort(ids, next => mine.save(reorderGroup(mine.setup, group.id, next)).catch(() => {}));
  const byId = new Map(group.items.map(h => [h.id, h]));

  return (
    <section>
      {titled && <h5 className="px-1 pb-1 text-[12.5px] font-bold text-[#8a7a6a]">{groupTitle(group)}</h5>}
      <ul ref={el => { container.current = el; }} className="rounded-2xl ring-1 ring-[#7a2028]/25 bg-white divide-y divide-[#f1e8d9]">
        {order.map(id => {
          const h = byId.get(id);
          if (!h) return null;
          const lifted = dragging === id;
          return (
            <li
              key={id}
              data-sort-id={id}
              className={`relative flex items-center gap-1 pr-3 bg-white first:rounded-t-2xl last:rounded-b-2xl transition-shadow ${
                lifted ? 'z-10 rounded-xl shadow-[0_12px_28px_-10px_rgba(74,52,38,0.45)] ring-2 ring-[#7a2028]/35' : ''
              }`}
            >
              <button
                type="button"
                {...grip(id)}
                aria-label={`${h.label} — გადაადგილება (ისრებითაც)`}
                title="გადაათრიე"
                className={`w-11 self-stretch min-h-[56px] shrink-0 flex items-center justify-center rounded-l-2xl text-[#b9a68c] hover:text-[#7a2028] outline-none focus-visible:bg-[#7a2028]/[0.06] ${
                  lifted ? 'cursor-grabbing text-[#7a2028]' : 'cursor-grab'
                }`}
              >
                <GripVertical className="w-5 h-5" />
              </button>
              <HabitBadge look={mine.looks[id]} size="sm" />
              <span className="flex-1 min-w-0 py-2 pl-2 text-[15px] font-medium leading-snug text-[#2a2017]">{h.label}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

/** „⇅ რიგი“ on a list of the day: its habits with grips, group by group (a habit moves within its group). */
export const HabitsReorder: React.FC<{ mine: Mine; groups: MyHabitGroup[] }> = ({ mine, groups }) => {
  const shown = groups.filter(g => g.items.length);
  return (
    <div className="space-y-3">
      {shown.map(g => (
        <ReorderGroup key={g.id} group={g} mine={mine} titled={shown.length > 1} />
      ))}
    </div>
  );
};

const MenuChoices: React.FC<{ value: Choice; onPick: (m: Choice) => void }> = ({ value, onPick }) => (
  <div className="flex flex-wrap gap-2">
    {(['none', ...MENUS] as Choice[]).map(m => (
      <button key={m} type="button" aria-pressed={value === m} onClick={() => onPick(m)} className={chip(value === m)}>
        {m === 'none' ? 'ლოცვის გარეშე' : MENU_LABELS[m]}
      </button>
    ))}
  </div>
);

const SECTION = 'flex items-center gap-1.5 px-0.5 pb-2 text-[13px] font-bold text-[#6a5646]';

// the habit's colour (round swatches) and its icon, drawn in that colour
const LookPicker: React.FC<{ look: HabitLook; onPick: (look: Partial<HabitLook>) => void }> = ({ look, onPick }) => {
  const c = HABIT_TONES[look.tone].c;
  return (
    <section>
      <h4 className={SECTION}>
        <Palette className="w-4 h-4 text-[#7a2028]" />
        ფერი და ხატულა
      </h4>
      {/* the nine tones in one row */}
      <div className="grid grid-cols-9 gap-1 pb-3 max-w-[24rem]">
        {TONE_IDS.map(t => {
          const on = t === look.tone;
          const tc = HABIT_TONES[t].c;
          return (
            <button
              key={t}
              type="button"
              aria-pressed={on}
              aria-label={HABIT_TONES[t].name}
              title={HABIT_TONES[t].name}
              onClick={() => onPick({ tone: t })}
              className="w-full max-w-9 aspect-square mx-auto rounded-full flex items-center justify-center cursor-pointer transition-transform active:scale-90"
              style={{ background: tc, boxShadow: on ? `0 0 0 2px #fbf6ec, 0 0 0 3.5px ${tc}` : undefined }}
            >
              {on && <Check className="w-4 h-4 text-white stroke-[3]" />}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {HABIT_ICON_IDS.map((i, n) => {
          const on = i === look.icon;
          return (
            <button
              key={i}
              type="button"
              aria-pressed={on}
              aria-label={`ხატულა ${n + 1}`}
              onClick={() => onPick({ icon: i })}
              className="h-11 rounded-xl flex items-center justify-center cursor-pointer transition-colors active:scale-95"
              style={on ? { background: c, color: '#fff' } : { background: tint(c, 0.08), color: c }}
            >
              <HabitIcon icon={i} className="w-5 h-5" />
            </button>
          );
        })}
      </div>
    </section>
  );
};

// a counter: on or off, the day's goal and what is counted
const CounterSettings: React.FC<{ counter: HabitCounter | undefined; onChange: (counter: HabitCounter | 'none') => void }> = ({ counter, onChange }) => {
  const [goal, setGoal] = useState(String(counter?.goal ?? 10));
  const unit = counter?.unit ?? 'ჯერ';
  // a word of one's own („შეკვეთა“, „ლარი“) beside the ready ones
  const [own, setOwn] = useState(COUNTER_UNITS.includes(unit) ? '' : unit);
  const typed = Math.max(1, Math.min(MAX_COUNTER_GOAL, parseInt(goal, 10) || counter?.goal || 10));
  const commit = () => {
    setGoal(String(typed));
    if (counter && typed !== counter.goal) onChange({ goal: typed, unit });
  };
  const commitOwn = () => {
    const word = own.trim();
    setOwn(word);
    if (counter && word && word !== unit) onChange({ goal: typed, unit: word });
  };
  return (
    <section>
      <h4 className={SECTION}>
        <Hash className="w-4 h-4 text-[#7a2028]" />
        მთვლელი
      </h4>
      <Toggle
        on={!!counter}
        onChange={on => onChange(on ? { goal: typed, unit } : 'none')}
        label="რიცხვით ითვლება"
        hint="მაგ. 100-ჯერ ან 5 გვერდი — მიზანს რომ მიაღწევ, ჩვევა თავად მოინიშნება"
      />
      {counter && (
        <div className="mt-2 space-y-3 animate-in fade-in duration-200">
          <label className="flex items-center gap-3">
            <span className="text-[13px] font-bold text-[#6a5646]">მიზანი დღეში</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_COUNTER_GOAL}
              value={goal}
              onChange={e => setGoal(e.target.value)}
              onBlur={commit}
              onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              className={`${FIELD} !w-28 text-center tabular-nums`}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {COUNTER_UNITS.map(u => (
              <button key={u} type="button" aria-pressed={u === unit} onClick={() => { setOwn(''); onChange({ goal: typed, unit: u }); }} className={chip(u === unit)}>
                {u}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={own}
            maxLength={20}
            placeholder="ან ჩაწერე შენი: შეკვეთა, ლარი, კმ…"
            aria-label="რას ითვლის — შენი სიტყვა"
            onChange={e => setOwn(e.target.value)}
            onBlur={commitOwn}
            onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            className={`${FIELD} ${own.trim() && own.trim() === unit ? '!ring-2 !ring-[#7a2028] font-semibold !text-[#7a2028]' : ''}`}
          />
        </div>
      )}
    </section>
  );
};

// "რამდენჯერ": the groups as chips — every day, every week, 2–3 times a month, the sacraments
const GroupChoices: React.FC<{ value: string | undefined; onPick: (group: string) => void }> = ({ value, onPick }) => (
  <div className="flex flex-wrap gap-2">
    {HABIT_GROUPS.map(g => (
      <button key={g.id} type="button" aria-pressed={value === g.id} onClick={() => onPick(g.id)} className={chip(value === g.id)}>
        {groupTitle(g)}
      </button>
    ))}
  </div>
);

const AddHabit: React.FC<{ group: string; onAdd: (label: string, group: string, menu: Choice) => void }> = ({ group: first, onAdd }) => {
  const [label, setLabel] = useState('');
  const [group, setGroup] = useState(first);
  const [menu, setMenu] = useState<Choice>('none');
  const ok = label.trim().length > 0;
  return (
    <form
      className="space-y-5"
      onSubmit={e => { e.preventDefault(); if (ok) onAdd(label, group, menu); }}
    >
      <label className="block">
        <span className="block px-0.5 pb-1.5 text-[13px] font-bold text-[#6a5646]">სახელი</span>
        <input value={label} onChange={e => setLabel(e.target.value)} maxLength={60} placeholder="მაგ. საღმრთო წერილის კითხვა" className={FIELD} autoFocus />
      </label>
      <div>
        <span className="block px-0.5 pb-1.5 text-[13px] font-bold text-[#6a5646]">რამდენჯერ</span>
        <GroupChoices value={group} onPick={setGroup} />
      </div>
      <div>
        <span className="block px-0.5 pb-1.5 text-[13px] font-bold text-[#6a5646]">
          <BookOpen className="inline w-4 h-4 -mt-0.5 mr-1 text-[#7a2028]" />
          რომელი ლოცვა გაიხსნას
        </span>
        <MenuChoices value={menu} onPick={setMenu} />
      </div>
      <Btn type="submit" full size="lg" disabled={!ok} icon={<Plus />}>
        დამატება
      </Btn>
    </form>
  );
};

/** ✏️ in a habit's window: everything about the one habit, and taking it away. */
export const HabitSettings: React.FC<{ mine: Mine; id: string; onRemoved: () => void }> = ({ mine, id, onRemoved }) => {
  const { setup, groups, save } = mine;
  const [asking, setAsking] = useState(false);
  const habit = groups.flatMap(g => g.items).find(h => h.id === id);
  const group = groups.find(g => g.items.some(h => h.id === id))?.id;
  if (!habit) return null;

  return (
    <div className="space-y-6">
      {/* how often, first: moving it to another group changes how all the views count it */}
      <section>
        <h4 className={SECTION}>
          <CalendarDays className="w-4 h-4 text-[#7a2028]" />
          რამდენჯერ
        </h4>
        <GroupChoices value={group} onPick={g => save(setHabitGroup(setup, id, g)).catch(() => {})} />
      </section>
      <LookPicker look={mine.looks[id]} onPick={look => save(setHabitLook(setup, id, look)).catch(() => {})} />
      <CounterSettings key={`counter:${id}`} counter={mine.counters[id]} onChange={c => save(setHabitCounter(setup, id, c)).catch(() => {})} />
      <section>
        <h4 className={SECTION}>
          <BookOpen className="w-4 h-4 text-[#7a2028]" />
          ლოცვის ღილაკი
        </h4>
        <MenuChoices value={habit.menu ?? 'none'} onPick={m => save(setHabitMenu(setup, id, m)).catch(() => {})} />
      </section>
      <HabitExtras
        key={id}
        habit={habit}
        onLinks={links => save(setHabitLinks(setup, id, links)).catch(() => {})}
        onNote={note => save(setHabitNote(setup, id, note)).catch(() => {})}
      />

      <section className="pt-4 border-t border-[#e8dcc8]">
        {asking ? (
          <div className="flex flex-wrap items-center gap-2 animate-in fade-in duration-150">
            <span className="flex-1 min-w-[10rem] text-[13px] font-semibold leading-snug text-[#6a5646]">
              წაიშალოს? მისი მონიშვნები შეინახება და „ჩვევის დამატებიდან“ დაბრუნდება.
            </span>
            <Btn size="sm" kind="danger" onClick={() => { setAsking(false); save(removeHabit(setup, id)).catch(() => {}); onRemoved(); }}>
              წაშლა
            </Btn>
            <Btn size="sm" kind="ghost" onClick={() => setAsking(false)}>
              არა
            </Btn>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAsking(true)}
            className="min-h-10 px-3 -ml-3 rounded-full inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#8a7a6a] hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            ჩვევის წაშლა
          </button>
        )}
      </section>
    </div>
  );
};

// the card's own editor: a short label on the left, the control beside it
const PICK = `${FIELD} !w-auto flex-1 min-w-[10rem] !h-10 !text-[14px] cursor-pointer`;

/** The day's goal as −/+ round a number one may type, and what is counted as a list (a word of one's own, or no counter). */
const CounterRow: React.FC<{ counter: HabitCounter | undefined; onChange: (counter: HabitCounter | 'none') => void }> = ({ counter, onChange }) => {
  const [typed, setTyped] = useState<string | null>(null);
  const [own, setOwn] = useState(false);
  if (!counter) {
    return (
      <button type="button" onClick={() => onChange({ goal: 10, unit: 'ჯერ' })} className={chip(false)}>
        რიცხვით დათვლა
      </button>
    );
  }
  const set = (goal: number) => {
    const n = Math.max(1, Math.min(MAX_COUNTER_GOAL, goal || counter.goal));
    if (n !== counter.goal) onChange({ goal: n, unit: counter.unit });
  };
  const units = COUNTER_UNITS.includes(counter.unit) ? COUNTER_UNITS : [...COUNTER_UNITS, counter.unit];
  const step = 'w-10 h-10 shrink-0 flex items-center justify-center text-[#7a2028] cursor-pointer disabled:opacity-30 disabled:cursor-default active:scale-90 transition-transform';
  return (
    <span className="inline-flex items-center rounded-xl bg-white ring-1 ring-[#e8dcc8]">
      <button type="button" aria-label="მიზანი −1" disabled={counter.goal <= 1} onClick={() => set(counter.goal - 1)} className={step}>
        <Minus className="w-4 h-4 stroke-[2.5]" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={MAX_COUNTER_GOAL}
        aria-label="მიზანი დღეში"
        value={typed ?? counter.goal}
        onChange={e => setTyped(e.target.value)}
        onBlur={() => { if (typed !== null) set(parseInt(typed, 10)); setTyped(null); }}
        onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
        className="w-12 h-10 bg-transparent text-center text-[16px] font-bold tabular-nums text-[#2a2017] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button type="button" aria-label="მიზანი +1" disabled={counter.goal >= MAX_COUNTER_GOAL} onClick={() => set(counter.goal + 1)} className={step}>
        <Plus className="w-4 h-4 stroke-[2.5]" />
      </button>
      {/* what is counted, in the same box: a ready word, one's own, or no counter */}
      <span className="self-stretch w-px my-2 bg-[#e8dcc8]" aria-hidden />
      {own ? (
        <input
          autoFocus
          type="text"
          maxLength={20}
          placeholder="სიტყვა"
          aria-label="რას ითვლის — შენი სიტყვა"
          onBlur={e => { const word = e.target.value.trim(); setOwn(false); if (word && word !== counter.unit) onChange({ goal: counter.goal, unit: word }); }}
          onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
          className="w-24 min-w-0 h-10 px-2.5 bg-transparent text-[14px] text-[#2a2017] outline-none"
        />
      ) : (
        <select
          aria-label="რას ითვლის"
          value={counter.unit}
          onChange={e => {
            const v = e.target.value;
            if (v === 'own') setOwn(true);
            else onChange(v === 'none' ? 'none' : { goal: counter.goal, unit: v });
          }}
          className="h-10 pl-2.5 pr-1 rounded-r-xl bg-transparent text-[14px] font-semibold text-[#2a2017] outline-none cursor-pointer"
        >
          {units.map(u => (
            <option key={u} value={u}>{u}</option>
          ))}
          <option value="own">სხვა…</option>
          <option value="none">გამორთვა</option>
        </select>
      )}
    </span>
  );
};

/** ✏️ on a habit's card: its settings unfolded right under it — its name, colour, icon (a row that scrolls), how often
 *  (a group, or „მორგებული“ days), its time and reminders, its prayers, the counter, other buttons, a formatted
 *  description, taking it away; „მზადაა“ folds it back. Each change is saved at once. */
export const HabitCardEditor: React.FC<{ mine: Mine; id: string; onDone: () => void }> = ({ mine, id, onDone }) => {
  const { setup, groups, save } = mine;
  const [asking, setAsking] = useState(false);
  const icons = useRef<HTMLDivElement>(null);
  const habit = groups.flatMap(g => g.items).find(h => h.id === id);
  const group = groups.find(g => g.items.some(h => h.id === id))?.id;
  const look = mine.looks[id];
  // the chosen icon in sight within its row (the row only — the page stays where it is)
  useEffect(() => {
    const row = icons.current;
    const on = row?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (row && on) row.scrollLeft = on.offsetLeft - (row.clientWidth - on.offsetWidth) / 2;
  }, []);
  if (!habit || !look) return null;
  const c = HABIT_TONES[look.tone].c;
  const keep = (next: Parameters<typeof save>[0]) => void save(next).catch(() => {});
  const plan = habit.schedule;

  return (
    <div className="space-y-3">
      <input
        key={habit.label}
        defaultValue={habit.label}
        maxLength={60}
        aria-label="სათაური"
        placeholder="სათაური"
        onBlur={e => e.target.value.trim() !== habit.label && keep(setHabitLabel(setup, id, e.target.value))}
        onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
        className="w-full h-11 px-0.5 bg-transparent border-b-2 border-[#e8dcc8] focus:border-[#7a2028] text-[18px] font-bold text-[#2a2017] placeholder:text-[#b3a594] outline-none transition-colors"
      />
      <div className="grid grid-cols-9 gap-1.5">
        {TONE_IDS.map(t => {
          const on = t === look.tone;
          const tc = HABIT_TONES[t].c;
          return (
            <button
              key={t}
              type="button"
              aria-pressed={on}
              aria-label={HABIT_TONES[t].name}
              title={HABIT_TONES[t].name}
              onClick={() => keep(setHabitLook(setup, id, { tone: t }))}
              className="w-full max-w-9 aspect-square mx-auto rounded-full flex items-center justify-center cursor-pointer transition-transform active:scale-90"
              style={{ background: tc, boxShadow: on ? `0 0 0 2px #fff, 0 0 0 3.5px ${tc}` : undefined }}
            >
              {on && <Check className="w-4 h-4 text-white stroke-[3]" />}
            </button>
          );
        })}
      </div>
      <div ref={icons} className="-mx-3 px-3 flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {HABIT_ICON_IDS.map((i, n) => {
          const on = i === look.icon;
          return (
            <button
              key={i}
              type="button"
              aria-pressed={on}
              aria-label={`ხატულა ${n + 1}`}
              onClick={() => keep(setHabitLook(setup, id, { icon: i }))}
              className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center cursor-pointer transition-colors active:scale-95"
              style={on ? { background: c, color: '#fff' } : { background: tint(c, 0.08), color: c }}
            >
              <HabitIcon icon={i} className="w-5 h-5" />
            </button>
          );
        })}
      </div>
      <label className={EDIT_ROW}>
        <span className={EDIT_LABEL}>რამდენჯერ</span>
        <select
          value={plan ? 'custom' : group}
          onChange={e =>
            keep(e.target.value === 'custom' ? setHabitSchedule(setup, id, plan ?? newSchedule()) : setHabitGroup(setup, id, e.target.value))
          }
          className={PICK}
        >
          {/* the sacraments are not offered any more; a habit still there keeps its place */}
          {HABIT_GROUPS.filter(g => g.id !== 'sacraments' || (!plan && group === g.id)).map(g => (
            <option key={g.id} value={g.id}>{groupTitle(g)}</option>
          ))}
          <option value="custom">მორგებული…</option>
        </select>
      </label>
      {plan && <ScheduleRows schedule={plan} onChange={s => keep(setHabitSchedule(setup, id, s))} />}
      <TimeAlertsRow
        time={habit.time}
        alerts={habit.alerts ?? []}
        onTime={t => keep(setHabitTime(setup, id, t))}
        onAlerts={a => keep(setHabitAlerts(setup, id, a))}
      />
      <label className={EDIT_ROW}>
        <span className={EDIT_LABEL}>ლოცვა</span>
        <select value={habit.menu ?? 'none'} onChange={e => keep(setHabitMenu(setup, id, e.target.value as Choice))} className={PICK}>
          {(['none', ...MENUS] as Choice[]).map(m => (
            <option key={m} value={m}>{m === 'none' ? 'ლოცვის გარეშე' : MENU_LABELS[m]}</option>
          ))}
        </select>
      </label>
      <div className={EDIT_ROW}>
        <span className={EDIT_LABEL}>მიზანი</span>
        <div className="flex-1 min-w-fit">
          <CounterRow counter={mine.counters[id]} onChange={next => keep(setHabitCounter(setup, id, next))} />
        </div>
      </div>
      <HabitExtras
        compact
        habit={habit}
        onLinks={links => keep(setHabitLinks(setup, id, links))}
        onNote={note => keep(setHabitNote(setup, id, note))}
        onRich={html => keep(setHabitRichNote(setup, id, html))}
      />
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        {asking ? (
          <span className="flex flex-wrap items-center gap-2 animate-in fade-in duration-150">
            <span className="text-[13px] font-semibold text-[#6a5646]">წაიშალოს?</span>
            <Btn size="sm" kind="danger" onClick={() => { setAsking(false); keep(removeHabit(setup, id)); onDone(); }}>
              წაშლა
            </Btn>
            <Btn size="sm" kind="ghost" onClick={() => setAsking(false)}>
              არა
            </Btn>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setAsking(true)}
            className="min-h-10 px-3 -ml-3 rounded-full inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#8a7a6a] hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            წაშლა
          </button>
        )}
        <Btn icon={<Check />} onClick={onDone}>
          მზადაა
        </Btn>
      </div>
    </div>
  );
};

/** „+ ჩვევის დამატება“ at the end of a list: a new habit (its group chosen ahead), or a removed one back. */
export const AddHabitPanel: React.FC<{ mine: Mine; group: string; onDone: () => void }> = ({ mine, group, onDone }) => {
  const { setup, save, changed } = mine;
  const removed = removedHabits(setup);
  const [resetAsk, setResetAsk] = useState(false);

  return (
    <div className="space-y-6">
      <AddHabit group={group} onAdd={(label, g, menu) => { save(addHabit(setup, label, g, menu)).catch(() => {}); onDone(); }} />

      {removed.length > 0 && (
        <section className="pt-4 border-t border-[#e8dcc8]">
          <h4 className={SECTION}>
            <RotateCcw className="w-4 h-4 text-[#7a2028]" />
            წაშლილი — შეხებით დაბრუნდება
          </h4>
          <div className="flex flex-wrap gap-2">
            {removed.map(h => (
              <button
                key={h.id}
                type="button"
                onClick={() => save(restoreHabit(setup, h.id)).catch(() => {})}
                className={`${CHIP} inline-flex items-center gap-1.5 bg-white text-[#4a3426] ring-[#e8dcc8] hover:ring-[#7a2028]/40 hover:text-[#7a2028]`}
              >
                <Plus className="w-3.5 h-3.5" />
                {h.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {changed && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {resetAsk ? (
            <>
              <span className="text-[13px] font-semibold text-[#6a5646]">ყველაფერი დაბრუნდეს სკოლის სიაზე?</span>
              <Btn size="sm" kind="danger" onClick={() => { setResetAsk(false); save(null).catch(() => {}); onDone(); }}>
                დიახ
              </Btn>
              <Btn size="sm" kind="ghost" onClick={() => setResetAsk(false)}>
                არა
              </Btn>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setResetAsk(true)}
              className="min-h-10 px-3 rounded-full inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#8a7a6a] hover:text-[#7a2028] cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              საწყის სიაზე დაბრუნება
            </button>
          )}
        </div>
      )}
    </div>
  );
};
