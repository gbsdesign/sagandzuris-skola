import React, { useEffect, useState } from 'react';
import { Bell, BookOpen, Plus, RotateCcw, X } from 'lucide-react';
import { HABIT_GROUPS, HabitMenu } from '../../../data/habitsAndManera';
import { Button, Choice, Dot, Field, Row, Rows, SectionLabel, Seg, Sheet, Val, WrapChips, RoundButton } from '../../../components/ui2';
import { askConfirm } from '../../../components/ui/kit';
import { useMyHabits } from '../../../hooks/useMyHabits';
import { ALERT_CHOICES, MAX_ALERTS, MENUS, MENU_LABELS, addHabit, removedHabits, restoreHabit, setHabitAlerts, setHabitTime } from '../../../utils/myHabits';
import { askNotificationPermission } from '../../../utils/prayerReminders';
import { alertWord } from '../../../components/views/HabitPlanEditor';

// The sheet „ახალი ჩვევა“ (board x-chveva-akhali): a name, how often, what a tap opens and a reminder. A removed habit
// comes back from the foot of the same sheet, and „საწყის სიაზე დაბრუნება“ puts the school's list back (as the old panel did).

export type Mine = ReturnType<typeof useMyHabits>;
export type MenuChoice = HabitMenu | 'none';

const groupTitle = (g: { id: string; title: string }) => (g.id === 'daily' ? 'ყოველდღე' : g.title);
/** the board's short words for the four groups */
const SHORT: Record<string, string> = { daily: 'ყოველდღე', weekly: 'კვირაში', monthly: 'თვეში', sacraments: 'საიდუმლო' };
export const groupWord = (id: string) => SHORT[id] ?? groupTitle(HABIT_GROUPS.find(g => g.id === id) ?? { id, title: id });

/** a time of day typed in the phone's own picker, in the kit's pill */
export const TimeBox: React.FC<{ value: string; onChange: (v: string) => void; label: string; disabled?: boolean }> = ({ value, onChange, label, disabled }) => (
  <input
    type="time"
    aria-label={label}
    value={value}
    disabled={disabled}
    onChange={e => onChange(e.target.value)}
    className="h-10 w-28 shrink-0 rounded-full bg-page px-3.5 text-center text-body font-semibold text-ink tabular-nums outline-none focus-visible:outline-2 focus-visible:outline-wine/60 disabled:opacity-40 [&::-webkit-calendar-picker-indicator]:hidden"
  />
);

/** „რა გაიხსნას შეხებისას“: the habit's prayer menu as a list to pick from */
export const MenuSheet: React.FC<{ open: boolean; value: MenuChoice; onPick: (m: MenuChoice) => void; onClose: () => void }> = ({ open, value, onPick, onClose }) => (
  <Sheet open={open} title="რა გაიხსნას შეხებისას" onClose={onClose}>
    <Rows role="radiogroup" aria-label="რა გაიხსნას შეხებისას">
      {(['none', ...MENUS] as MenuChoice[]).map(m => (
        <Choice key={m} on={value === m} title={m === 'none' ? 'არაფერი' : MENU_LABELS[m]} onClick={() => { onPick(m); onClose(); }} />
      ))}
    </Rows>
  </Sheet>
);

/** the reminder: a time, and the minutes before it to ring (up to three) — the first ring asks the browser's leave */
const ReminderSheet: React.FC<{
  open: boolean; time: string; alerts: number[]; onTime: (t: string) => void; onAlerts: (a: number[]) => void; onClose: () => void;
}> = ({ open, time, alerts, onTime, onAlerts, onClose }) => {
  const [blocked, setBlocked] = useState(false);
  const change = async (next: number[]) => {
    if (next.length > MAX_ALERTS) return;
    onAlerts(next);
    if (next.length > alerts.length) {
      const leave = await askNotificationPermission();
      setBlocked(leave === 'denied' || leave === 'unsupported');
    }
  };
  return (
    <Sheet open={open} title="შეხსენება" onClose={onClose}>
      <Rows>
        <Row
          lead={<Dot icon={<Bell />} />}
          title="საათი"
          right={
            <span className="flex items-center gap-1">
              <TimeBox value={time} onChange={onTime} label="საათი" />
              {time && <RoundButton label="საათის მოხსნა" size={36} tone="plain" onClick={() => onTime('')}><X /></RoundButton>}
            </span>
          }
        />
      </Rows>
      {time && (
        <>
          <SectionLabel label="რამდენი ხნით ადრე დარეკოს" />
          <WrapChips
            label="შეხსენებები"
            items={ALERT_CHOICES.map(m => ({ id: String(m), label: alertWord(m) }))}
            value={alerts.map(String)}
            onChange={next => void change(next.map(Number))}
          />
          {blocked && <p className="px-1.5 text-meta text-danger">შეტყობინებები ამ ბრაუზერში დაბლოკილია — ჩართე საიტის პარამეტრებში.</p>}
        </>
      )}
      <Button onClick={onClose}>მზადაა</Button>
    </Sheet>
  );
};

export const NewHabitSheet: React.FC<{ open: boolean; onClose: () => void; mine: Mine; group?: string }> = ({ open, onClose, mine, group: first = 'daily' }) => {
  const { setup, save } = mine;
  const [label, setLabel] = useState('');
  const [group, setGroup] = useState(first);
  const [menu, setMenu] = useState<MenuChoice>('none');
  const [time, setTime] = useState('');
  const [alerts, setAlerts] = useState<number[]>([0]);
  const [pick, setPick] = useState<'menu' | 'remind' | null>(null);
  // every opening starts empty
  useEffect(() => {
    if (!open) return;
    setLabel(''); setGroup(first); setMenu('none'); setTime(''); setAlerts([0]); setPick(null);
  }, [open, first]);
  const ok = label.trim().length > 0;
  const removed = removedHabits(setup);

  const add = () => {
    if (!ok) return;
    const id = `my_${Date.now().toString(36)}`;
    // one save: the habit, then its time and its reminders
    let next = addHabit(setup, label, group, menu, id);
    if (time) {
      next = setHabitTime(next, id, { from: time });
      if (alerts.length) next = setHabitAlerts(next, id, alerts);
    }
    save(next).catch(() => {});
    onClose();
  };
  const reset = async () => {
    if (!(await askConfirm({ title: 'ყველაფერი დაბრუნდეს სკოლის სიაზე?', ok: 'დიახ', danger: true }))) return;
    save(null).catch(() => {});
    onClose();
  };

  return (
    <>
      <Sheet open={open} title="ახალი ჩვევა" onClose={onClose}>
        <form className="flex flex-col gap-3" onSubmit={e => { e.preventDefault(); add(); }}>
          <Field label="სახელი" value={label} onChange={setLabel} placeholder="მაგ. საღმრთო წერილის კითხვა" maxLength={60} autoFocus />
          <SectionLabel label="რამდენად ხშირად" />
          <Seg
            label="რამდენად ხშირად"
            items={HABIT_GROUPS.map(g => ({ id: g.id, label: groupWord(g.id) }))}
            value={group}
            onChange={setGroup}
          />
          <Rows>
            <Row wrap lead={<Dot icon={<BookOpen />} />} title="რა გაიხსნას შეხებისას" right={<Val>{menu === 'none' ? 'არაფერი' : MENU_LABELS[menu]}</Val>} onClick={() => setPick('menu')} />
            <Row lead={<Dot icon={<Bell />} />} title="შეხსენება" right={<Val>{time || 'არ არის'}</Val>} onClick={() => setPick('remind')} />
          </Rows>
          <Button type="submit" full icon={<Plus />} disabled={!ok}>დამატება</Button>
        </form>

        {removed.length > 0 && (
          <>
            <SectionLabel label="წაშლილი — შეხებით დაბრუნდება" />
            <Rows>
              {removed.map(h => (
                <Row key={h.id} lead={<Dot icon={<RotateCcw />} />} title={h.label} onClick={() => save(restoreHabit(setup, h.id)).catch(() => {})} />
              ))}
            </Rows>
          </>
        )}
        {mine.changed && <Button kind="quiet" size="md" icon={<RotateCcw />} onClick={() => void reset()}>საწყის სიაზე დაბრუნება</Button>}
      </Sheet>
      <MenuSheet open={open && pick === 'menu'} value={menu} onPick={setMenu} onClose={() => setPick(null)} />
      <ReminderSheet
        open={open && pick === 'remind'}
        time={time}
        alerts={alerts}
        onTime={setTime}
        onAlerts={setAlerts}
        onClose={() => setPick(null)}
      />
    </>
  );
};
