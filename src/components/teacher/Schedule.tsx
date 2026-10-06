import React, { useEffect, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { CalendarClock, Plus, Save, Trash2 } from 'lucide-react';
import { db } from '../../firebase';
import { LessonSlot, SchoolClass } from '../../hooks/useClasses';
import {  } from '../../hooks/useTeaching';
import { Btn, Card, CardTitle, FIELD, Flash, IconBtn, useFlash } from '../ui/kit';
import { WEEKDAYS_GE } from '../../utils/dateNames';

// Monday first, as a week is read in Georgia
const ORDER = [1, 2, 3, 4, 5, 6, 0];
const sortSlots = (list: LessonSlot[]) =>
  [...list].sort((a, b) => ORDER.indexOf(a.day) - ORDER.indexOf(b.day) || a.start.localeCompare(b.start));

/** The next lesson from now: { slot, inDays }. */
export const nextLesson = (slots: LessonSlot[], now: Date = new Date()) => {
  const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  let best: { slot: LessonSlot; inDays: number } | null = null;
  for (const slot of slots) {
    let inDays = (slot.day - now.getDay() + 7) % 7;
    if (inDays === 0 && (slot.end || slot.start) < hm) inDays = 7;
    if (!best || inDays < best.inDays || (inDays === best.inDays && slot.start < best.slot.start)) best = { slot, inDays };
  }
  return best;
};

const whenLabel = (n: number) => (n === 0 ? 'დღეს' : n === 1 ? 'ხვალ' : `${n} დღეში`);

/** A small timetable: weekday, time and place of each lesson; today's and the next one marked. */
export const LessonTable: React.FC<{ slots: LessonSlot[]; title?: string; compact?: boolean }> = ({ slots, title, compact }) => {
  if (!slots.length) return null;
  const today = new Date().getDay();
  const next = nextLesson(slots);
  return (
    <div className={compact ? '' : 'rounded-2xl bg-white ring-1 ring-[#e8dcc8] overflow-hidden'}>
      {title && <p className="px-3.5 pt-3 pb-1 text-[12px] font-bold uppercase tracking-wide text-[#8a7a6a]">{title}</p>}
      <ul className="divide-y divide-[#f1e8d9]">
        {sortSlots(slots).map((s, i) => {
          const isNext = next?.slot === s;
          return (
            <li key={i} className={`flex items-center gap-3 px-3.5 py-2.5 ${s.day === today ? 'bg-[#7a2028]/[0.04]' : ''}`}>
              <span className={`w-20 shrink-0 text-sm font-bold ${s.day === today ? 'text-[#7a2028]' : 'text-[#4a3426]'}`}>{WEEKDAYS_GE[s.day]}</span>
              <span className="text-sm font-semibold tabular-nums text-[#2a2017]">{s.start}{s.end ? `–${s.end}` : ''}</span>
              <span className="flex-1 min-w-0 text-[13px] text-[#8a7a6a] truncate">{s.note}</span>
              {isNext && <span className="shrink-0 h-6 px-2 rounded-full bg-[#7a2028] text-[#fbf6ec] text-[11px] font-bold inline-flex items-center">{whenLabel(next!.inDays)}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

/** The teacher edits the class timetable. */
export const SchedulePanel: React.FC<{ cls: SchoolClass }> = ({ cls }) => {
  const msg = useFlash();
  const [rows, setRows] = useState<LessonSlot[]>(cls.schedule);
  const [saving, setSaving] = useState(false);
  useEffect(() => setRows(cls.schedule), [cls.id, cls.schedule]);
  const dirty = JSON.stringify(rows) !== JSON.stringify(cls.schedule);

  const patch = (i: number, p: Partial<LessonSlot>) => setRows(r => r.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const save = async () => {
    const clean = sortSlots(rows.filter(r => r.start)).map(r => ({ day: r.day, start: r.start, ...(r.end ? { end: r.end } : {}), ...(r.note?.trim() ? { note: r.note.trim() } : {}) }));
    setSaving(true);
    try {
      await updateDoc(doc(db, 'classes', cls.id), { schedule: clean, updatedAt: new Date().toISOString() });
      setRows(clean);
      msg.ok('ცხრილი შენახულია — მოსწავლეები ნახავენ თავის გზაზე და კლასის გვერდზე.');
    } catch {
      msg.fail('ცხრილი ვერ შეინახა.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle icon={<CalendarClock />} title="გაკვეთილების ცხრილი" hint="დღე და საათი, როცა კლასს გაკვეთილი აქვს. ჩანს მოსწავლის გზის გვერდზე და კლასში." />
        <ul className="space-y-2.5">
          {rows.map((r, i) => (
            <li key={i} className="p-3 rounded-2xl bg-[#fbf6ec] ring-1 ring-[#efe3cf] space-y-2">
              <div className="flex gap-2">
                <select className={`${FIELD} flex-1`} value={r.day} onChange={e => patch(i, { day: Number(e.target.value) })} aria-label="დღე">
                  {ORDER.map(d => <option key={d} value={d}>{WEEKDAYS_GE[d]}</option>)}
                </select>
                <IconBtn label="წაშლა" tone="danger" onClick={() => setRows(x => x.filter((_, j) => j !== i))}><Trash2 /></IconBtn>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="time" className={FIELD} value={r.start} onChange={e => patch(i, { start: e.target.value })} aria-label="დაწყება" />
                <input type="time" className={FIELD} value={r.end || ''} onChange={e => patch(i, { end: e.target.value })} aria-label="დასრულება" />
              </div>
              <input className={FIELD} value={r.note || ''} onChange={e => patch(i, { note: e.target.value })} placeholder="ადგილი ან შენიშვნა (არასავალდებულო)" />
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn kind="ghost" icon={<Plus />} onClick={() => setRows(r => [...r, { day: r.length ? r[r.length - 1].day : 1, start: '18:00', end: '19:30' }])}>გაკვეთილის დამატება</Btn>
          <Btn icon={<Save />} disabled={!dirty || saving} onClick={save}>{saving ? 'ინახება…' : 'შენახვა'}</Btn>
        </div>
        <div className="mt-3"><Flash flash={msg.flash} onClose={msg.clear} /></div>
      </Card>
      {cls.schedule.length > 0 && <LessonTable slots={cls.schedule} title="ასე ხედავენ მოსწავლეები" />}
    </div>
  );
};
