import React, { useEffect, useMemo, useState } from 'react';
import { Check as CheckIcon, Plus, Trash2 } from 'lucide-react';
import { Avatar, Button, Card, Check, Choice, Field, Note, Row, Rows, Sheet, WrapChips, cx } from '../../../components/ui2';
import type { LessonSlot } from '../../../hooks/useClasses';
import { WEEKDAYS_GE } from '../../../utils/dateNames';
import { MAX_PEOPLE, MAX_SLOTS, type AssistantScope, type PlanPerson } from '../../../utils/aiAssistant';

// The plan's rows open these: who gets it (people the person may reach, ticked), which class, the new class's lessons.

/** Who: the plan's people ticked first, then everyone else the person may reach; a search over names; at most MAX_PEOPLE. */
export const PeopleSheet: React.FC<{
  open: boolean;
  title: string;
  scope: AssistantScope;
  chosen: PlanPerson[];
  onClose: (next: PlanPerson[]) => void;
}> = ({ open, title, scope, chosen, onClose }) => {
  const [picked, setPicked] = useState<string[]>([]);
  const [q, setQ] = useState('');
  // the order is fixed when it opens: a tick does not make the list jump
  const [order, setOrder] = useState<string[]>([]);
  useEffect(() => {
    if (!open) return;
    const first = chosen.map(p => p.uid);
    setPicked(first);
    setOrder([...first, ...scope.people.map(p => p.uid).filter(u => !first.includes(u))]);
    setQ('');
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const byUid = useMemo(() => new Map(scope.people.map(p => [p.uid, p])), [scope.people]);
  const className = (id: string) => scope.classes.find(c => c.id === id)?.name ?? '';
  const needle = q.trim().toLowerCase();
  const shown = order.map(u => byUid.get(u)).filter((p): p is NonNullable<typeof p> => !!p)
    .filter(p => !needle || p.name.toLowerCase().includes(needle));
  const full = picked.length >= MAX_PEOPLE;
  const done = () => onClose(picked.map(u => byUid.get(u)).filter((p): p is NonNullable<typeof p> => !!p)
    .map(p => ({ uid: p.uid, name: p.name, photo: p.photo, via: p.via })));

  return (
    <Sheet open={open} onClose={done} title={title}>
      {scope.people.length > 8 && <Field label="ძებნა" type="search" value={q} onChange={setQ} placeholder="სახელი" />}
      <Note>{`არჩეულია ${picked.length}${full ? ` — ერთად მაქსიმუმ ${MAX_PEOPLE}` : ''}`}</Note>
      <Rows role="group" aria-label={title}>
        {shown.map(p => {
          const on = picked.includes(p.uid);
          return (
            <Choice
              key={p.uid}
              multi
              on={on}
              disabled={!on && full}
              title={p.name}
              sub={p.classIds.map(className).filter(Boolean).join(', ') || 'კლასის გარეშე'}
              onClick={() => setPicked(s => (on ? s.filter(u => u !== p.uid) : [...s, p.uid]))}
            />
          );
        })}
      </Rows>
      {!shown.length && <Note>ვერავინ მოიძებნა.</Note>}
      <Button full icon={<CheckIcon />} onClick={done}>მზადაა</Button>
    </Sheet>
  );
};

/** Which class chat. */
export const ClassSheet: React.FC<{
  open: boolean;
  scope: AssistantScope;
  value: string;
  onClose: () => void;
  onPick: (id: string) => void;
}> = ({ open, scope, value, onClose, onPick }) => (
  <Sheet open={open} onClose={onClose} title="რომელ კლასს">
    <Rows role="radiogroup" aria-label="კლასი">
      {scope.classes.map(c => (
        <Row
          key={c.id}
          role="radio"
          aria-checked={c.id === value}
          lead={<Avatar name={c.name} />}
          title={c.name}
          sub={`${c.size} წევრი`}
          right={<Check on={c.id === value} size={26} />}
          onClick={() => { onPick(c.id); onClose(); }}
        />
      ))}
    </Rows>
  </Sheet>
);

// Monday first, as a week is read in Georgia
const ORDER = [1, 2, 3, 4, 5, 6, 0];

const TimeField: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <label className="flex min-w-0 flex-1 flex-col gap-1.5">
    <span className="pl-1.5 text-meta font-semibold text-mut">{label}</span>
    <input
      type="time"
      value={value}
      onChange={e => onChange(e.target.value)}
      className={cx(
        'h-[52px] w-full min-w-0 rounded-full bg-page px-[18px] text-lead text-ink',
        'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine/60',
      )}
    />
  </label>
);

/** The new class's lessons: a day and the hours each, at most MAX_SLOTS. */
export const SlotsSheet: React.FC<{
  open: boolean;
  slots: LessonSlot[];
  onClose: (next: LessonSlot[]) => void;
}> = ({ open, slots, onClose }) => {
  const [rows, setRows] = useState<LessonSlot[]>([]);
  useEffect(() => { if (open) setRows(slots); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const patch = (i: number, p: Partial<LessonSlot>) => setRows(r => r.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const done = () => onClose(rows.filter(r => r.start).map(r => ({ day: r.day, start: r.start, ...(r.end ? { end: r.end } : {}) })));

  return (
    <Sheet open={open} onClose={done} title="ცხრილი">
      {!rows.length && <Note>გაკვეთილები ჯერ არ არის.</Note>}
      {rows.map((s, i) => (
        <Card key={i} className="flex flex-col gap-3">
          <WrapChips
            label="დღე"
            items={ORDER.map(d => ({ id: String(d), label: WEEKDAYS_GE[d] }))}
            value={[String(s.day)]}
            onChange={next => patch(i, { day: Number(next.find(x => x !== String(s.day)) ?? s.day) })}
          />
          <div className="flex gap-2.5">
            <TimeField label="დაწყება" value={s.start} onChange={v => patch(i, { start: v })} />
            <TimeField label="დასრულება" value={s.end || ''} onChange={v => patch(i, { end: v })} />
          </div>
          <Button kind="quiet" size="md" icon={<Trash2 />} className="self-start text-danger" onClick={() => setRows(r => r.filter((_, j) => j !== i))}>
            წაშლა
          </Button>
        </Card>
      ))}
      {rows.length < MAX_SLOTS && (
        <Button kind="ghost" full icon={<Plus />} onClick={() => setRows(r => [...r, { day: r[r.length - 1]?.day ?? 1, start: '18:00', end: '20:00' }])}>
          გაკვეთილის დამატება
        </Button>
      )}
      <Button full icon={<CheckIcon />} onClick={done}>მზადაა</Button>
    </Sheet>
  );
};
