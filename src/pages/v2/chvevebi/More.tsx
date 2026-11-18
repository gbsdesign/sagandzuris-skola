import React, { useState } from 'react';
import { CalendarDays, CalendarRange, Grid3x3, Info, MoreHorizontal, Pencil } from 'lucide-react';
import { useAuth } from '../../../context';
import { Card, Dot, Para, RoundButton, Row, Rows, Seg, Sheet } from '../../../components/ui2';
import { HabitsView, editItem, useHabitsNav, viewItem } from './nav';

// The habits' „⋯“ (board x-chvevebi: „კვირა, თვე, წელი და ჩვევების შეცვლა „მეტშია““) and the views' switch at the top of
// the week, the month and the year (x-chvevebi-kvira / -tve / -tseli).

/** what the habits are for — the old ⓘ „განმარტება“, word for word */
const ABOUT = [
  'ნიადაგი არის ის, რაშიც მყარად არის „ჩაფლული“ საძირკველი, ხოლო საძირკველზე დგას შენობა — ანუ მგალობლის შემოქმედება.',
  'სწორი ნიადაგის მომზადების გარეშე ვერ დამყარდება ვერც საძირკველი და ვერც მგალობლის შემოქმედება. ქვემოთ მოცემულია ჩვევები, რომლებიც საჭიროა სწორი სულიერი ნიადაგის მოსამზადებლად.',
];

/** „⋯“ at the bar's right: on the day it holds the other views; on a view only the change and the note */
export const HabitsMore: React.FC<{ views?: boolean }> = ({ views }) => {
  const { user } = useAuth();
  const { go } = useHabitsNav();
  const [open, setOpen] = useState<'menu' | 'about' | null>(null);
  const to = (item: string) => { setOpen(null); go(item); };
  return (
    <>
      <RoundButton label="მეტი" onClick={() => setOpen('menu')}>
        <MoreHorizontal aria-hidden="true" strokeWidth={1.75} />
      </RoundButton>
      <Sheet open={open === 'menu'} title="ჩვევები" onClose={() => setOpen(null)}>
        <Card pad="none">
          <Rows>
            {views && (
              <>
                <Row lead={<Dot icon={<CalendarRange />} />} title="კვირა" onClick={() => to(viewItem('week'))} />
                <Row lead={<Dot icon={<CalendarDays />} />} title="თვე" onClick={() => to(viewItem('month'))} />
                <Row lead={<Dot icon={<Grid3x3 />} />} title="წელი" onClick={() => to(viewItem('year'))} />
              </>
            )}
            {user && <Row lead={<Dot icon={<Pencil />} />} title="ჩვევების შეცვლა" onClick={() => to(editItem())} />}
            <Row lead={<Dot icon={<Info />} />} title="განმარტება" onClick={() => setOpen('about')} />
          </Rows>
        </Card>
      </Sheet>
      <Sheet open={open === 'about'} title="განმარტება" onClose={() => setOpen(null)}>
        <div className="flex flex-col gap-3">
          {ABOUT.map(p => <Para key={p.slice(0, 12)}>{p}</Para>)}
        </div>
      </Sheet>
    </>
  );
};

const VIEW_ITEMS: { id: HabitsView; label: string }[] = [
  { id: 'day', label: 'დღე' },
  { id: 'week', label: 'კვირა' },
  { id: 'month', label: 'თვე' },
  { id: 'year', label: 'წელი' },
];

/** „დღე · კვირა · თვე · წელი“ on the week, the month and the year: another view takes this step's place; „დღე“ goes back to
 *  the day it came from (the views open only from the day's „⋯“) */
export const ViewSwitch: React.FC<{ value: Exclude<HabitsView, 'day'> }> = ({ value }) => {
  const { swap, back } = useHabitsNav();
  return (
    <Seg
      label="ჩვევების ხედი"
      items={VIEW_ITEMS}
      value={value}
      onChange={v => (v === 'day' ? back() : swap(viewItem(v)))}
    />
  );
};
