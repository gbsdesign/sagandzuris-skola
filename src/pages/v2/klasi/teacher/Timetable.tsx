import React, { useEffect, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { CalendarDays, Check, Plus, Trash2 } from 'lucide-react';
import { db } from '../../../../firebase';
import type { LessonSlot, SchoolClass } from '../../../../hooks/useClasses';
import { WEEKDAYS_GE } from '../../../../utils/dateNames';
import { useFlash } from '../../../../components/ui/kit';
import { Button, Card, Dot, Field, Note, Row, Rows, Sheet, WrapChips, cx } from '../../../../components/ui2';

// x-klasi-tskhrili: the lessons, a row each (day, time, place); a tap opens one to change or delete. „შენახვა“ writes the
// whole list as the old ScheduleSheet did (sorted, empty starts dropped); with `edit` false it is only the list.

// Monday first, as a week is read in Georgia
const ORDER = [1, 2, 3, 4, 5, 6, 0];
const sortSlots = (list: LessonSlot[]) =>
  [...list].sort((a, b) => ORDER.indexOf(a.day) - ORDER.indexOf(b.day) || a.start.localeCompare(b.start));

export const slotTime = (s: LessonSlot) => `${s.start}${s.end ? ` – ${s.end}` : ''}`;
const slotLine = (s: LessonSlot) => [slotTime(s), s.note?.trim()].filter(Boolean).join(' · ');

const TimeField: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <label className="flex min-w-0 flex-1 flex-col gap-1.5">
    <span className="pl-1.5 text-meta font-semibold text-mut">{label}</span>
    <input
      type="time"
      value={value}
      onChange={e => onChange(e.target.value)}
      className={cx(
        'h-[52px] w-full min-w-0 rounded-full bg-surf px-[18px] text-lead text-ink',
        'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine/60',
      )}
    />
  </label>
);

export const TimetableSheet: React.FC<{ cls: SchoolClass; open: boolean; onClose: () => void; edit: boolean }> = ({ cls, open, onClose, edit }) => {
  const msg = useFlash();
  const [rows, setRows] = useState<LessonSlot[]>(cls.schedule);
  // the lesson being changed: its place in `rows`, or none (the list)
  const [at, setAt] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  // a fresh copy each time it opens
  useEffect(() => { if (open) { setRows(cls.schedule); setAt(null); msg.clear(); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (p: Partial<LessonSlot>) => setRows(r => r.map((x, j) => (j === at ? { ...x, ...p } : x)));
  const dirty = JSON.stringify(rows) !== JSON.stringify(cls.schedule);
  const ordered = rows.map((s, i) => ({ s, i })).sort((a, b) => ORDER.indexOf(a.s.day) - ORDER.indexOf(b.s.day) || a.s.start.localeCompare(b.s.start));

  const add = () => {
    const last = rows[rows.length - 1];
    setRows(r => [...r, { day: last ? last.day : 1, start: '18:00', end: '19:30' }]);
    setAt(rows.length);
  };
  const remove = () => {
    setRows(r => r.filter((_, j) => j !== at));
    setAt(null);
  };
  const save = async () => {
    const clean = sortSlots(rows.filter(r => r.start)).map(r => ({ day: r.day, start: r.start, ...(r.end ? { end: r.end } : {}), ...(r.note?.trim() ? { note: r.note.trim() } : {}) }));
    setSaving(true);
    try {
      await updateDoc(doc(db, 'classes', cls.id), { schedule: clean, updatedAt: new Date().toISOString() });
      onClose();
    } catch {
      msg.fail('ცხრილი ვერ შეინახა.');
    } finally {
      setSaving(false);
    }
  };

  const one = at !== null ? rows[at] : undefined;
  if (one) {
    return (
      <Sheet open={open} onClose={onClose} title="გაკვეთილი">
        <Card className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="pl-1.5 text-meta font-semibold text-mut">დღე</span>
            <WrapChips
              label="დღე"
              items={ORDER.map(d => ({ id: String(d), label: WEEKDAYS_GE[d] }))}
              value={[String(one.day)]}
              onChange={next => patch({ day: Number(next.find(x => x !== String(one.day)) ?? one.day) })}
            />
          </div>
          <div className="flex gap-2.5">
            <TimeField label="დაწყება" value={one.start} onChange={v => patch({ start: v })} />
            <TimeField label="დასრულება" value={one.end || ''} onChange={v => patch({ end: v })} />
          </div>
          <Field label="ადგილი" value={one.note || ''} onChange={v => patch({ note: v })} placeholder="არასავალდებულო" />
        </Card>
        <Button kind="ghost" full icon={<Trash2 />} className="text-danger" onClick={remove}>გაკვეთილის წაშლა</Button>
        <Button full icon={<Check />} onClick={() => setAt(null)}>მზადაა</Button>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onClose={onClose} title="გაკვეთილების ცხრილი">
      {rows.length === 0 ? (
        <Note>გაკვეთილები ჯერ არ არის ჩაწერილი.</Note>
      ) : (
        <Rows>
          {ordered.map(({ s, i }) => (
            <Row
              key={i}
              lead={<Dot icon={<CalendarDays />} />}
              title={WEEKDAYS_GE[s.day]}
              sub={slotLine(s)}
              wrap
              onClick={edit ? () => setAt(i) : undefined}
              right={edit ? 'chev' : null}
            />
          ))}
        </Rows>
      )}
      {edit && <Button kind="ghost" full icon={<Plus />} onClick={add}>გაკვეთილის დამატება</Button>}
      {msg.flash && <p className="px-1.5 text-meta text-danger">{msg.flash.text}</p>}
      {edit && (
        <Button full icon={<Check />} disabled={!dirty || saving} onClick={save}>{saving ? 'ინახება…' : 'შენახვა'}</Button>
      )}
    </Sheet>
  );
};
