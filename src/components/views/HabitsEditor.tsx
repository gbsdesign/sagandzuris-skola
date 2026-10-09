import React, { useState } from 'react';
import { BookOpen, Check, ChevronDown, GripVertical, Link2, Plus, RotateCcw, ScrollText, Trash2 } from 'lucide-react';
import { HABIT_GROUPS, HabitGroupType, HabitMenu } from '../../data/habitsAndManera';
import {
  MENUS,
  MENU_LABELS,
  addHabit,
  removeHabit,
  removedHabits,
  reorderGroup,
  restoreHabit,
  MyHabitGroup,
  setHabitLinks,
  setHabitMenu,
  setHabitNote,
} from '../../utils/myHabits';
import { HabitExtras } from './HabitLinks';
import { useMyHabits } from '../../hooks/useMyHabits';
import { useDragSort } from '../ui/useDragSort';
import { Btn, FIELD, IconBtn, Sheet } from '../ui/kit';

// "✏️" on the habits: the member's own list — drag a habit by its grip within its group, take one away,
// add one of their own, and choose what it opens: its prayers (the book button), other buttons found by the
// search or a site's address, and a note of its own. Saved at once (utils/myHabits).

type Mine = ReturnType<typeof useMyHabits>;
type Choice = HabitMenu | 'none';

const groupTitle = (g: Pick<HabitGroupType, 'id' | 'title'>) => (g.id === 'daily' ? 'ყოველდღე' : g.title);

const CHIP = 'min-h-10 px-3.5 py-2 rounded-xl text-[13.5px] font-semibold ring-1 cursor-pointer transition-colors active:scale-[0.97]';
const chip = (on: boolean) => `${CHIP} ${on ? 'bg-[#7a2028] text-[#fbf6ec] ring-[#7a2028]' : 'bg-[#fbf6ec] text-[#4a3426] ring-[#e8dcc8] hover:ring-[#7a2028]/40'}`;

const EditGroup: React.FC<{ group: MyHabitGroup; mine: Mine; onMenu: (id: string) => void }> = ({ group, mine, onMenu }) => {
  const ids = group.items.map(h => h.id);
  const { container, order, dragging, grip } = useDragSort(ids, next => mine.save(reorderGroup(mine.setup, group.id, next)).catch(() => {}));
  const [asking, setAsking] = useState<string | null>(null);
  const byId = new Map(group.items.map(h => [h.id, h]));

  return (
    <section>
      <h4 className="px-1 pb-1.5 font-serif-ge text-[15px] font-bold text-[#7a2028]">{groupTitle(group)}</h4>
      {order.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#e0d0b6] px-4 py-3 text-[13px] text-[#a08a76]">ამ ჯგუფში ჩვევა აღარ არის</p>
      ) : (
        <ul ref={el => { container.current = el; }} className="rounded-2xl ring-1 ring-[#e8dcc8] bg-white divide-y divide-[#f1e8d9]">
          {order.map(id => {
            const h = byId.get(id);
            if (!h) return null;
            const lifted = dragging === id;
            return (
              <li
                key={id}
                data-sort-id={id}
                className={`relative bg-white first:rounded-t-2xl last:rounded-b-2xl transition-shadow ${
                  lifted ? 'z-10 rounded-xl shadow-[0_12px_28px_-10px_rgba(74,52,38,0.45)] ring-2 ring-[#7a2028]/35' : ''
                }`}
              >
                <div className="flex items-center gap-1 pr-1.5">
                  <button
                    type="button"
                    {...grip(id)}
                    aria-label={`${h.label} — გადაადგილება (ისრებითაც)`}
                    title="გადაათრიე"
                    className={`w-11 self-stretch min-h-[60px] shrink-0 flex items-center justify-center rounded-l-2xl text-[#b9a68c] hover:text-[#7a2028] outline-none focus-visible:bg-[#7a2028]/[0.06] ${
                      lifted ? 'cursor-grabbing text-[#7a2028]' : 'cursor-grab'
                    }`}
                  >
                    <GripVertical className="w-5 h-5" />
                  </button>
                  <div className="flex-1 min-w-0 py-2">
                    <span className="block text-[15px] font-medium leading-snug text-[#2a2017]">{h.label}</span>
                    <button
                      type="button"
                      onClick={() => onMenu(id)}
                      className="mt-0.5 -ml-2 inline-flex items-center gap-1.5 min-h-8 px-2 rounded-full text-left text-[12.5px] font-semibold text-[#7a2028] hover:bg-[#7a2028]/[0.06] cursor-pointer transition-colors"
                    >
                      {h.menu && (
                        <>
                          <BookOpen className="w-3.5 h-3.5 shrink-0" />
                          {/* the menu's name only when it isn't the habit's own */}
                          {MENU_LABELS[h.menu] === h.label ? 'ლოცვა' : MENU_LABELS[h.menu]}
                        </>
                      )}
                      {h.links?.length ? (
                        <span className="inline-flex items-center gap-1">
                          <Link2 className="w-3.5 h-3.5 shrink-0" />
                          {h.links.length}
                        </span>
                      ) : null}
                      {h.note && <ScrollText className="w-3.5 h-3.5 shrink-0" aria-label="ჩანაწერი" />}
                      {!h.menu && !h.links?.length && !h.note && <span className="text-[#a08a76]">ლოცვა, ღილაკები, ჩანაწერი</span>}
                      <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-70" />
                    </button>
                  </div>
                  <IconBtn tone="danger" label={`${h.label} — წაშლა`} onClick={() => setAsking(asking === id ? null : id)}>
                    <Trash2 />
                  </IconBtn>
                </div>
                {asking === id && (
                  <div className="flex flex-wrap items-center gap-2 px-3 pb-3 pl-11 animate-in fade-in duration-150">
                    <span className="flex-1 text-[13px] font-semibold text-[#6a5646]">წაიშალოს?</span>
                    <Btn size="sm" kind="danger" onClick={() => { setAsking(null); mine.save(removeHabit(mine.setup, id)).catch(() => {}); }}>
                      წაშლა
                    </Btn>
                    <Btn size="sm" kind="ghost" onClick={() => setAsking(null)}>
                      არა
                    </Btn>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
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

const AddHabit: React.FC<{ onAdd: (label: string, group: string, menu: Choice) => void }> = ({ onAdd }) => {
  const [label, setLabel] = useState('');
  const [group, setGroup] = useState('daily');
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
        <div className="flex flex-wrap gap-2">
          {HABIT_GROUPS.map(g => (
            <button key={g.id} type="button" aria-pressed={group === g.id} onClick={() => setGroup(g.id)} className={chip(group === g.id)}>
              {groupTitle(g)}
            </button>
          ))}
        </div>
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

export const HabitsEditor: React.FC<{
  mine: Mine;
  sheet: string | null;
  openSheet: (id: string) => void;
  closeSheet: () => void;
  onDone: () => void;
}> = ({ mine, sheet, openSheet, closeSheet, onDone }) => {
  const { setup, groups, save, changed } = mine;
  const removed = removedHabits(setup);
  const [resetAsk, setResetAsk] = useState(false);
  const menuFor = sheet?.startsWith('menu:') ? groups.flatMap(g => g.items).find(h => h.id === sheet.slice(5)) : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] px-3.5 py-3">
        <p className="flex-1 min-w-[10rem] text-[13px] leading-snug text-[#6a5646]">
          <GripVertical className="inline w-4 h-4 -mt-0.5 text-[#b9a68c]" /> გადაათრიე ·{' '}
          <ChevronDown className="inline w-3.5 h-3.5 -mt-0.5 text-[#7a2028]" /> ლოცვა, ღილაკები, ჩანაწერი
        </p>
        <Btn size="sm" icon={<Check />} onClick={onDone}>
          მზადაა
        </Btn>
      </div>

      {/* the daily habits beside the weekly and monthly ones; one column on a phone */}
      <div className="@container">
        <div className="grid gap-4 @lg:grid-cols-2 items-start">
          {[groups.filter(g => g.goal.per === 'day'), groups.filter(g => g.goal.per !== 'day')].map((col, i) => (
            <div key={i} className="space-y-4">
              {col.map(g => (
                <EditGroup key={g.id} group={g} mine={mine} onMenu={id => openSheet(`menu:${id}`)} />
              ))}
            </div>
          ))}
        </div>
      </div>

      <Btn kind="ghost" full icon={<Plus />} onClick={() => openSheet('add')}>
        ჩვევის დამატება
      </Btn>

      {removed.length > 0 && (
        <section>
          <h4 className="px-1 pb-1.5 text-[13px] font-bold text-[#8a7a6a]">წაშლილი — შეხებით დაბრუნდება</h4>
          <div className="flex flex-wrap gap-2">
            {removed.map(h => (
              <button
                key={h.id}
                type="button"
                onClick={() => save(restoreHabit(setup, h.id)).catch(() => {})}
                className={`${CHIP} inline-flex items-center gap-1.5 bg-white text-[#4a3426] ring-[#e8dcc8] hover:ring-[#7a2028]/40 hover:text-[#7a2028]`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {h.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {changed && (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          {resetAsk ? (
            <>
              <span className="text-[13px] font-semibold text-[#6a5646]">ყველაფერი დაბრუნდეს სკოლის სიაზე?</span>
              <Btn size="sm" kind="danger" onClick={() => { setResetAsk(false); save(null).catch(() => {}); }}>
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

      <Sheet
        open={Boolean(menuFor)}
        onClose={closeSheet}
        title={menuFor?.label ?? ''}
        footer={<Btn full icon={<Check />} onClick={closeSheet}>მზადაა</Btn>}
      >
        {menuFor && (
          <div className="space-y-5">
            <section>
              <h4 className="flex items-center gap-1.5 px-0.5 pb-2 text-[13px] font-bold text-[#6a5646]">
                <BookOpen className="w-4 h-4 text-[#7a2028]" />
                ლოცვის ღილაკი
              </h4>
              <MenuChoices value={menuFor.menu ?? 'none'} onPick={m => save(setHabitMenu(setup, menuFor.id, m)).catch(() => {})} />
            </section>
            <HabitExtras
              key={menuFor.id}
              habit={menuFor}
              onLinks={links => save(setHabitLinks(setup, menuFor.id, links)).catch(() => {})}
              onNote={note => save(setHabitNote(setup, menuFor.id, note)).catch(() => {})}
            />
          </div>
        )}
      </Sheet>

      <Sheet open={sheet === 'add'} onClose={closeSheet} title="ახალი ჩვევა">
        {sheet === 'add' && (
          <AddHabit onAdd={(label, group, menu) => { save(addHabit(setup, label, group, menu)).catch(() => {}); closeSheet(); }} />
        )}
      </Sheet>
    </div>
  );
};
