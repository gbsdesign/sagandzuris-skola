import React, { useEffect, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { MapPin, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { db } from '../../firebase';
import { LessonSlot, SchoolClass } from '../../hooks/useClasses';
import { Btn, FIELD, Flash, IconBtn, Sheet, useFlash } from '../ui/kit';
import { WEEKDAYS_GE } from '../../utils/dateNames';
import { CHIP_STATIC, CHIP_STRONG } from '../views/pathStyle';

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
export const LessonTable: React.FC<{ slots: LessonSlot[]; title?: string; compact?: boolean; action?: React.ReactNode }> = ({ slots, title, compact, action }) => {
  if (!slots.length) return null;
  const today = new Date().getDay();
  const next = nextLesson(slots);
  return (
    <div className={compact ? '' : 'rounded-2xl bg-white ring-1 ring-[#e8dcc8] overflow-hidden'}>
      {title && (
        <div className={`flex items-center gap-2 px-3.5 ${action ? 'pt-1.5 pr-1.5' : 'pt-3 pb-1'}`}>
          <p className="flex-1 min-w-0 text-[12px] font-bold uppercase tracking-wide text-[#8a7a6a]">{title}</p>
          {action}
        </div>
      )}
      <ul className="divide-y divide-[#f1e8d9]">
        {sortSlots(slots).map((s, i) => {
          const isNext = next?.slot === s;
          return (
            // on a narrow phone the "N დღეში" badge drops under the time
            <li key={i} className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-2.5 ${s.day === today ? 'bg-[#7a2028]/[0.04]' : ''}`}>
              <span className={`min-w-24 sm:min-w-28 shrink-0 text-sm font-bold ${s.day === today ? 'text-[#7a2028]' : 'text-[#4a3426]'}`}>{WEEKDAYS_GE[s.day]}</span>
              <span className="text-sm font-semibold tabular-nums whitespace-nowrap text-[#2a2017]">{s.start}{s.end ? `–${s.end}` : ''}</span>
              {/* the place: beside the time, or on its own line under it on a narrow phone (never cut) */}
              {s.note && <span className="order-1 basis-full min-[420px]:order-none min-[420px]:basis-auto min-[420px]:flex-1 min-w-0 text-[13px] text-[#8a7a6a] break-words">{s.note}</span>}
              {isNext && <span className="ml-auto shrink-0 h-6 px-2 rounded-full bg-[#7a2028] text-[#fbf6ec] text-[11px] font-bold inline-flex items-center">{whenLabel(next!.inDays)}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

// short weekday names for the chips
const DAY_SHORT = ['კვ', 'ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ'];

/** The timetable as one wrapping line: a lead (an icon, the class name), then chips — "ორშ 19:00–21:00 · 4 დღეში" —
 *  with the next lesson filled in. A place written on every lesson (e.g. "თბ") is shown once, after the chips. */
export const LessonChips: React.FC<{ slots: LessonSlot[]; lead?: React.ReactNode }> = ({ slots, lead }) => {
  if (!slots.length) return null;
  const next = nextLesson(slots);
  const notes = new Set(slots.map(s => s.note?.trim() || ''));
  const shared = notes.size === 1 ? [...notes][0] : '';
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {lead}
      {sortSlots(slots).map((s, i) => {
        const isNext = next?.slot === s;
        const note = shared ? '' : s.note?.trim();
        return (
          <span
            key={i}
            title={`${WEEKDAYS_GE[s.day]}${s.note ? ` — ${s.note}` : ''}`}
            className={`h-7 px-2.5 max-w-full rounded-full text-[12.5px] font-bold tabular-nums whitespace-nowrap inline-flex items-center gap-1 ${isNext ? CHIP_STRONG : CHIP_STATIC}`}
          >
            <span className="shrink-0">{DAY_SHORT[s.day]} {s.start}{s.end ? `–${s.end}` : ''}</span>
            {note && <span className="min-w-0 truncate font-semibold opacity-70">· {note}</span>}
            {isNext && <span className="shrink-0 font-semibold opacity-80">· {whenLabel(next!.inDays)}</span>}
          </span>
        );
      })}
      {shared && (
        <span title={shared} className="min-w-0 inline-flex items-center gap-1 text-xs font-semibold text-[#8a7a6a]">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{shared}</span>
        </span>
      )}
    </div>
  );
};

/** The timetable in one short line (the teacher's class header): "ორშ 19:00", the next lesson filled in;
 *  the full time and place in each pill's title. */
export const LessonPills: React.FC<{ slots: LessonSlot[] }> = ({ slots }) => {
  const next = nextLesson(slots);
  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {sortSlots(slots).map((s, i) => {
        const isNext = next?.slot === s;
        return (
          <span key={i} title={`${WEEKDAYS_GE[s.day]} ${s.start}${s.end ? `–${s.end}` : ''}${s.note ? ` — ${s.note}` : ''}`}
            className={`h-6 px-2 rounded-full inline-flex items-center gap-1 text-[11.5px] font-bold tabular-nums whitespace-nowrap ${isNext ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-[#7a2028]/[0.06] text-[#4a3426]'}`}>
            {DAY_SHORT[s.day]} {s.start}
            {isNext && <span className="font-semibold opacity-80">· {whenLabel(next!.inDays)}</span>}
          </span>
        );
      })}
    </span>
  );
};

/** The timetable being edited and its save (true when saved): shared by the window and the class chat's fold.
 *  A class without lessons starts with one ready to fill in. */
const useScheduleDraft = (cls: SchoolClass) => {
  const msg = useFlash();
  const fresh = () => (cls.schedule.length ? cls.schedule : [{ day: 1, start: '18:00', end: '19:30' }]);
  const [rows, setRows] = useState<LessonSlot[]>(fresh);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    const clean = sortSlots(rows.filter(r => r.start)).map(r => ({ day: r.day, start: r.start, ...(r.end ? { end: r.end } : {}), ...(r.note?.trim() ? { note: r.note.trim() } : {}) }));
    setSaving(true);
    try {
      await updateDoc(doc(db, 'classes', cls.id), { schedule: clean, updatedAt: new Date().toISOString() });
      return true;
    } catch {
      msg.fail('ცხრილი ვერ შეინახა.');
      return false;
    } finally {
      setSaving(false);
    }
  };
  return { msg, rows, setRows, saving, save, reset: () => setRows(fresh()), dirty: JSON.stringify(rows) !== JSON.stringify(cls.schedule) };
};

/** The lessons as fields — day, start and end, place — with 🗑 on each and „გაკვეთილის დამატება“ under them. */
const ScheduleRows: React.FC<{ rows: LessonSlot[]; setRows: React.Dispatch<React.SetStateAction<LessonSlot[]>> }> = ({ rows, setRows }) => {
  const patch = (i: number, p: Partial<LessonSlot>) => setRows(r => r.map((x, j) => (j === i ? { ...x, ...p } : x)));
  return (
    <>
      <ul className="space-y-2.5">
        {rows.map((r, i) => (
          <li key={i} className="p-3 rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] space-y-2">
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
      <Btn kind="ghost" full icon={<Plus />} className="mt-3" onClick={() => setRows(r => [...r, { day: r.length ? r[r.length - 1].day : 1, start: '18:00', end: '19:30' }])}>გაკვეთილის დამატება</Btn>
    </>
  );
};

/** The teacher edits the class timetable in its window (opened from the class tab's header); a save closes it. */
export const ScheduleSheet: React.FC<{ cls: SchoolClass; open: boolean; onClose: () => void }> = ({ cls, open, onClose }) => {
  const d = useScheduleDraft(cls);
  // a fresh copy each time it opens
  useEffect(() => { if (open) d.reset(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Sheet open={open} onClose={onClose} title="გაკვეთილების ცხრილი"
      footer={
        <div className="space-y-2">
          <Flash flash={d.msg.flash} onClose={d.msg.clear} />
          <Btn size="lg" full icon={<Save />} disabled={!d.dirty || d.saving} onClick={async () => { if (await d.save()) onClose(); }}>{d.saving ? 'ინახება…' : 'შენახვა'}</Btn>
        </div>
      }>
        <ScheduleRows rows={d.rows} setRows={d.setRows} />
    </Sheet>
  );
};

/** The class chat's 📅 (ClassChat): the timetable folds open under the chat's title, and its teachers change it right
 *  there — ✏️ turns the lessons into fields, „შენახვა“ saves them. A class without lessons opens straight into them. */
export const ScheduleFold: React.FC<{ cls: SchoolClass; canEdit: boolean; onClose: () => void }> = ({ cls, canEdit, onClose }) => {
  const [editing, setEditing] = useState(false);
  if (canEdit && (editing || !cls.schedule.length)) return <ScheduleEditor cls={cls} onSaved={() => setEditing(false)} onCancel={() => (cls.schedule.length ? setEditing(false) : onClose())} />;
  return cls.schedule.length ? (
    <LessonTable slots={cls.schedule} title="გაკვეთილების ცხრილი"
      action={canEdit ? <IconBtn label="ცხრილის შეცვლა" onClick={() => setEditing(true)}><Pencil /></IconBtn> : undefined} />
  ) : (
    <p className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3.5 py-3 text-sm text-[#8a7a6a]">ცხრილი ჯერ არ არის.</p>
  );
};

const ScheduleEditor: React.FC<{ cls: SchoolClass; onSaved: () => void; onCancel: () => void }> = ({ cls, onSaved, onCancel }) => {
  const d = useScheduleDraft(cls);
  return (
    <div className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] p-3">
      <p className="px-0.5 mb-2.5 text-[12px] font-bold uppercase tracking-wide text-[#8a7a6a]">გაკვეთილების ცხრილი</p>
      <ScheduleRows rows={d.rows} setRows={d.setRows} />
      {d.msg.flash && <div className="mt-3"><Flash flash={d.msg.flash} onClose={d.msg.clear} /></div>}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Btn kind="ghost" onClick={onCancel}>გაუქმება</Btn>
        <Btn icon={<Save />} disabled={!d.dirty || d.saving} onClick={async () => { if (await d.save()) onSaved(); }}>{d.saving ? 'ინახება…' : 'შენახვა'}</Btn>
      </div>
    </div>
  );
};
