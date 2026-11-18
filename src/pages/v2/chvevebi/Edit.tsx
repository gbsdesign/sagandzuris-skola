import React, { useState } from 'react';
import { CalendarDays, Check, ChevronRight, GripVertical, Plus } from 'lucide-react';
import { useAuth } from '../../../context';
import { useMyHabits } from '../../../hooks/useMyHabits';
import { useDragSort } from '../../../components/ui/useDragSort';
import { Button, Card, Dot, FOCUS, Press, Row, SectionLabel, Small, Two, TopBar, cx } from '../../../components/ui2';
import { HabitsModel, dailyOf, rareOf } from '../../../components/habits/useHabits';
import { MyHabitGroup, reorderGroup } from '../../../utils/myHabits';
import { NewHabitSheet } from './NewHabit';
import { editItem, settingsItem, useHabitsNav } from './nav';

// The list of habits to change (board x-chvevebi-shetsvla): a handle to drag each row, › to its settings, a row to the
// weekly and monthly ones, „+ ახალი ჩვევა“ and the big „მზადაა“.

type Mine = ReturnType<typeof useMyHabits>;
const groupTitle = (g: { id: string; title: string }) => (g.id === 'daily' ? 'ყოველდღე' : g.title);

const DragGroup: React.FC<{ group: MyHabitGroup; mine: Mine; titled: boolean }> = ({ group, mine, titled }) => {
  const { go } = useHabitsNav();
  const ids = group.items.map(h => h.id);
  const { container, order, dragging, grip } = useDragSort(ids, next => mine.save(reorderGroup(mine.setup, group.id, next)).catch(() => {}));
  const byId = new Map(group.items.map(h => [h.id, h]));
  return (
    <section className="flex flex-col gap-2">
      <SectionLabel label={`${titled ? groupTitle(group) : 'ყოველდღე'} · ${ids.length}`} />
      <ul ref={el => { container.current = el; }} className="flex flex-col divide-y divide-line overflow-hidden rounded-card bg-surf">
        {order.map(id => {
          const h = byId.get(id);
          if (!h) return null;
          const g = grip(id);
          return (
            <li key={id} data-sort-id={id} className={cx('relative flex min-h-14 items-center bg-surf', dragging === id && 'z-10 shadow-lift')}>
              <button
                type="button"
                {...g}
                // Alt + ↑ / ↓ moves it too (the plain arrows as well)
                aria-label={`${h.label} — გადაადგილება (Alt + ისრები)`}
                title="გადაათრიე"
                className={cx('flex size-tap shrink-0 items-center justify-center text-faint touch-none select-none', dragging === id ? 'cursor-grabbing text-wine' : 'cursor-grab', FOCUS)}
              >
                <GripVertical className="size-5" aria-hidden="true" />
              </button>
              <Press onClick={() => go(settingsItem(id))} className={cx('flex min-h-14 min-w-0 flex-1 cursor-pointer items-center gap-2 pr-3 text-left text-ink active:bg-soft', FOCUS)}>
                <Two title={h.label} />
                <ChevronRight aria-hidden="true" className="size-[18px] shrink-0 text-mut" strokeWidth={2} />
              </Press>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export const EditScreen: React.FC<{ model: HabitsModel; rare: boolean }> = ({ rare }) => {
  const { user } = useAuth();
  const { go, back } = useHabitsNav();
  const mine = useMyHabits(user?.uid);
  const [adding, setAdding] = useState(false);
  const daily = dailyOf(mine.groups);
  const rareGroups = rareOf(mine.groups).filter(g => g.items.length);
  const rareNames = rareGroups.flatMap(g => g.items.map(h => h.label));
  const shown = (rare ? rareGroups : daily.filter(g => g.items.length));

  return (
    <>
      <TopBar title={rare ? 'კვირაში და თვეში' : 'ჩვევების შეცვლა'} onBack={back} />
      <div className="flex flex-col gap-3 pb-4">
        {!user && <Card>ჩვევების შესაცვლელად შედი ანგარიშში.</Card>}
        {user && shown.map(g => <DragGroup key={g.id} group={g} mine={mine} titled={rare} />)}

        {user && !rare && rareNames.length > 0 && (
          <Card pad="none">
            <Row
              lead={<Dot icon={<CalendarDays />} />}
              title="კვირაში და თვეში"
              sub={`${rareNames.slice(0, 3).join(', ')}${rareNames.length > 3 ? '...' : ''}`}
              right={<Small>{rareNames.length}</Small>}
              onClick={() => go(editItem(true))}
            />
          </Card>
        )}

        {user && (
          <Button kind="ghost" full icon={<Plus />} onClick={() => setAdding(true)}>ახალი ჩვევა</Button>
        )}
        <Button full icon={<Check />} onClick={back} className="mt-2">მზადაა</Button>
      </div>
      <NewHabitSheet open={adding} onClose={() => setAdding(false)} mine={mine} group={rare ? 'weekly' : 'daily'} />
    </>
  );
};
