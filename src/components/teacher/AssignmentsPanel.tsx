import React, { useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { ClipboardList, Plus, Trash2, Music, Users } from 'lucide-react';
import { useAuth } from '../../context';
import { SchoolClass } from '../../hooks/useClasses';
import { Assignment, StudentRecord, createAssignment, deleteAssignment, dueLabel, daysUntil, localIso, shortDate, useAssignments } from '../../hooks/useTeaching';
import { CatalogEntry, CATEGORY_LABEL, PathItem, Voice, findCatalogEntry, sortPathItems, usesVoices, voicesOf } from '../../utils/pathItems';
import { filterValidVariants } from '../../utils/variantValidation';
import { writePath } from '../admin/MemberPathEditor';
import { CatalogPicker } from '../admin/CatalogPicker';
import { Btn, Card, CardTitle, Empty, FIELD, Flash, IconBtn, Label, Pill, Sheet, useFlash } from '../ui/kit';

const VOICE_LABEL: Record<string, string> = { '1': 'I ხმა', '2': 'II ხმა', '3': 'III ხმა' };

/** Who an assignment is for, and how many of them already marked its voices on their path. */
const progressOf = (a: Assignment, cls: SchoolClass, records: Record<string, StudentRecord>) => {
  const targets = a.studentIds.length ? a.studentIds.filter(u => cls.memberIds.includes(u)) : cls.memberIds;
  const done = targets.filter(uid => {
    if (!a.variantId) return false;
    const item = records[uid]?.data?.selectedChantVariants?.[a.variantId];
    if (!item) return false;
    const marked = voicesOf(item, a.variantId);
    return a.voices.length ? a.voices.every(v => marked.includes(v as Voice)) : marked.length > 0;
  });
  return { targets, done };
};

// "დავალება": a chant (and which voice) to learn by a date. Students see it on their path, with a
// reminder before the deadline; the chant is put on their path at once.
export const AssignmentsPanel: React.FC<{ cls: SchoolClass; records: Record<string, StudentRecord> }> = ({ cls, records }) => {
  const list = useAssignments(cls.id);
  const [adding, setAdding] = useState(false);
  const msg = useFlash();
  const upcoming = list.filter(a => daysUntil(a.due) >= 0);
  const past = list.filter(a => daysUntil(a.due) < 0).reverse();

  const remove = async (a: Assignment) => {
    if (!window.confirm(`წავშალო დავალება „${a.title}“?`)) return;
    try { await deleteAssignment(cls.id, a.id); } catch { msg.fail('ვერ წაიშალა.'); }
  };

  const Row: React.FC<{ a: Assignment }> = ({ a }) => {
    const { targets, done } = progressOf(a, cls, records);
    const n = daysUntil(a.due);
    const entry = a.variantId ? findCatalogEntry(a.variantId) : undefined;
    return (
      <li className="p-3.5 rounded-2xl bg-white ring-1 ring-[#e8dcc8]">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-[#7a2028]/[0.08] text-[#7a2028] flex items-center justify-center shrink-0"><Music className="w-5 h-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-[#2a2017] leading-snug">{a.title}</p>
            <p className="text-xs text-[#8a7a6a]">{entry ? `${CATEGORY_LABEL[entry.category]} · ${a.code}` : 'დავალება'}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {a.voices.map(v => <Pill key={v}>{VOICE_LABEL[v]}</Pill>)}
              <Pill tone={n < 0 ? 'muted' : n <= 2 ? 'amber' : 'brown'}>{shortDate(a.due)} · {dueLabel(a.due)}</Pill>
              <Pill tone="muted"><Users /> {a.studentIds.length ? `${targets.length} მოსწავლე` : 'მთელი კლასი'}</Pill>
            </div>
            {a.note && <p className="mt-2 text-[13px] text-[#75685a] whitespace-pre-line">{a.note}</p>}
            {a.variantId && (
              <div className="mt-2.5">
                <div className="flex items-center justify-between text-xs text-[#8a7a6a] mb-1">
                  <span>მოსწავლეებმა მონიშნეს</span>
                  <span className="font-bold text-[#4a3426] tabular-nums">{done.length}/{targets.length}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#efe5d4] overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-600" style={{ width: `${targets.length ? (done.length / targets.length) * 100 : 0}%` }} />
                </div>
              </div>
            )}
          </div>
          <IconBtn label="წაშლა" tone="danger" onClick={() => remove(a)}><Trash2 /></IconBtn>
        </div>
      </li>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle
          icon={<ClipboardList />}
          title="დავალებები"
          hint="საგალობელი + ხმა + ვადა. მოსწავლე ხედავს თავის გზაზე; ვადამდე შეხსენება მიდის."
          right={<Btn size="sm" icon={<Plus />} onClick={() => setAdding(true)}>ახალი</Btn>}
        />
        <Flash flash={msg.flash} onClose={msg.clear} />
        {upcoming.length === 0 ? (
          <Empty icon={<ClipboardList />} title="მიმდინარე დავალება არ არის" text="შექმენი პირველი — მაგ. „მხოლოდ-შობილი, II ხმა, პარასკევამდე“." action={<Btn icon={<Plus />} onClick={() => setAdding(true)}>დავალების შექმნა</Btn>} />
        ) : (
          <ul className="space-y-2.5">{upcoming.map(a => <Row key={a.id} a={a} />)}</ul>
        )}
      </Card>
      {past.length > 0 && (
        <Card tone="paper">
          <CardTitle title="ვადაგასული" />
          <ul className="space-y-2.5">{past.slice(0, 10).map(a => <Row key={a.id} a={a} />)}</ul>
        </Card>
      )}
      <NewAssignment open={adding} onClose={() => setAdding(false)} cls={cls} onDone={t => msg.ok(t)} />
    </div>
  );
};

const NewAssignment: React.FC<{ open: boolean; onClose: () => void; cls: SchoolClass; onDone: (text: string) => void }> = ({ open, onClose, cls, onDone }) => {
  const { user } = useAuth();
  const [entry, setEntry] = useState<CatalogEntry | null>(null);
  const [voices, setVoices] = useState<string[]>([]);
  const [due, setDue] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 7); return localIso(d); });
  const [note, setNote] = useState('');
  const [whom, setWhom] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const withVoices = entry ? usesVoices(entry.id) : false;

  const reset = () => { setEntry(null); setVoices([]); setNote(''); setWhom([]); setError(''); };

  const save = async () => {
    if (!user || !entry) { setError('აირჩიე საგალობელი.'); return; }
    if (!due) { setError('მიუთითე ვადა.'); return; }
    setBusy(true);
    setError('');
    try {
      await createAssignment(cls.id, {
        title: entry.title, variantId: entry.id, code: entry.code, voices: withVoices ? voices : [], due, note: note.trim(), studentIds: whom,
      }, user.uid);
      // the chant goes onto each student's path, if it isn't there yet
      const targets = whom.length ? whom : cls.memberIds;
      let failed = 0;
      for (const uid of targets) {
        try {
          const snap = await getDoc(doc(db, 'students', uid));
          const map: Record<string, PathItem> = filterValidVariants((snap.exists() && snap.data().selectedChantVariants) || {});
          if (map[entry.id]) continue;
          const list = [...sortPathItems(Object.values(map)), { ...entry.make(), assignedByClass: cls.id }];
          await writePath(uid, Object.fromEntries(list.map((it, i) => [it.variantId, { ...it, order: i }])));
        } catch {
          failed++;
        }
      }
      onDone(failed ? `დავალება შეიქმნა; ${failed} მოსწავლის გზა ვერ განახლდა.` : 'დავალება შეიქმნა და მოსწავლეების გზაზე დაემატა.');
      reset();
      onClose();
    } catch {
      setError('დავალება ვერ შეიქმნა.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="ახალი დავალება"
      footer={<Btn full size="lg" icon={<Plus />} disabled={busy || !entry} onClick={save}>{busy ? 'იქმნება…' : 'დავალების მიცემა'}</Btn>}>
      <div className="space-y-4">
        <div>
          <Label>საგალობელი</Label>
          {entry ? (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white ring-1 ring-[#e8dcc8]">
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-[#2a2017] truncate">{entry.title}</span>
                <span className="block text-xs text-[#8a7a6a]">{CATEGORY_LABEL[entry.category]} · {entry.code}</span>
              </span>
              <Btn size="sm" kind="ghost" onClick={() => { setEntry(null); setVoices([]); }}>შეცვლა</Btn>
            </div>
          ) : (
            <CatalogPicker onPick={e => setEntry(e)} placeholder="მოძებნე საგალობელი ან სიმღერა" />
          )}
        </div>
        {withVoices && (
          <div>
            <Label hint="რამდენიც გინდა">ხმა</Label>
            <div className="flex flex-wrap gap-2">
              {['1', '2', '3'].map(v => {
                const on = voices.includes(v);
                return (
                  <button key={v} type="button" onClick={() => setVoices(x => (on ? x.filter(y => y !== v) : [...x, v]))}
                    className={`h-11 px-4 rounded-full text-sm font-bold cursor-pointer transition ${on ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426]'}`}>
                    {VOICE_LABEL[v]}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div>
          <Label>ვადა</Label>
          <input type="date" className={FIELD} value={due} min={localIso()} onChange={e => setDue(e.target.value)} />
        </div>
        <div>
          <Label hint={whom.length ? `${whom.length} არჩეული` : 'მთელი კლასი'}>ვისთვის</Label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setWhom([])}
              className={`h-10 px-3.5 rounded-full text-[13px] font-bold cursor-pointer ${!whom.length ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426]'}`}>მთელი კლასი</button>
            {cls.members.map(m => {
              const on = whom.includes(m.uid);
              return (
                <button key={m.uid} type="button" onClick={() => setWhom(w => (on ? w.filter(x => x !== m.uid) : [...w, m.uid]))}
                  className={`h-10 px-3.5 rounded-full text-[13px] font-semibold cursor-pointer ${on ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426]'}`}>{m.name}</button>
              );
            })}
          </div>
        </div>
        <div>
          <Label>შენიშვნა</Label>
          <textarea className={`${FIELD} !h-24 py-2.5 resize-none`} value={note} onChange={e => setNote(e.target.value)} placeholder="მაგ: ყურადღება მიაქციე მესამე მუხლის ბანს" />
        </div>
        {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
      </div>
    </Sheet>
  );
};
