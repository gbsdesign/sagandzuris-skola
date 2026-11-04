import React, { useEffect, useState } from 'react';
import { ClipboardList, Lock, Pin, Send } from 'lucide-react';
import type { SchoolClass } from '../../hooks/useClasses';
import type { PinInput } from '../../hooks/useChatPins';
import { Btn, FIELD, Label, Sheet } from '../ui/kit';
import { NewAssignment } from '../teacher/AssignmentsPanel';
import { Avatar } from './ChatPanel';

// The chat's 📎 for a teacher or an admin (2026-11-04): who it is for (a class's chat; a private chat has its one
// student), then a comment or an assignment — a real one, made in „ახალი დავალება“ for that member alone, whose card then
// goes into the chat. In a class's chat only that member, the class's teachers and the admins see it.

export interface PinPerson { uid: string; name: string; photoURL?: string }

export const PinSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  /** who it may be for: a class's members, or the student of a private chat */
  people: PinPerson[];
  /** the classes an assignment may be made in (a class's chat: its own; a private chat: those of the student) */
  classes: SchoolClass[];
  /** a class's chat (the 🔒 line names who will see it) */
  inClass: boolean;
  onSend: (p: PinInput) => Promise<void>;
}> = ({ open, onClose, people, classes, inClass, onSend }) => {
  const only = people.length === 1 ? people[0] : null;
  const [who, setWho] = useState<PinPerson | null>(only);
  const [what, setWhat] = useState<'note' | 'work' | null>(null);
  const [workCls, setWorkCls] = useState<SchoolClass | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const reset = () => { setWho(only); setWhat(null); setWorkCls(null); setText(''); setErr(''); };
  // opened again: from the start
  useEffect(() => { if (open) reset(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const close = () => { reset(); onClose(); };

  const mine = who ? classes.filter(c => c.memberIds.includes(who.uid)) : [];
  const cls = workCls || (mine.length === 1 ? mine[0] : null);

  const sendNote = async () => {
    if (!who || !text.trim()) return;
    setBusy(true);
    setErr('');
    try {
      await onSend({ kind: 'note', to: who.uid, toName: who.name, text: text.trim() });
      close();
    } catch (e) {
      console.warn('pin: ', e);
      setErr('ვერ გაიგზავნა. სცადეთ თავიდან.');
    } finally {
      setBusy(false);
    }
  };

  const seenBy = who
    ? inClass ? `დაინახავს მხოლოდ ${who.name}, კლასის მასწავლებლები და ადმინები.` : `დაინახავს მხოლოდ ${who.name}.`
    : '';

  return (
    <>
      <Sheet
        open={open && !(what === 'work' && cls)}
        onClose={close}
        title={what === 'note' ? 'კომენტარი' : what === 'work' ? 'რომელ კლასში?' : 'მოსწავლისთვის'}
        footer={what === 'note' ? (
          <Btn full size="lg" icon={<Send />} disabled={busy || !text.trim()} onClick={sendNote}>{busy ? 'იგზავნება…' : 'გაგზავნა'}</Btn>
        ) : undefined}
      >
        <div className="space-y-4">
          {!who ? (
            <div>
              <Label>ვისთვის?</Label>
              <ul className="space-y-1.5">
                {people.map(p => (
                  <li key={p.uid}>
                    <button type="button" onClick={() => setWho(p)}
                      className="w-full flex items-center gap-3 h-14 px-3 rounded-2xl bg-white ring-1 ring-[#e8dcc8] text-left cursor-pointer hover:ring-[#7a2028]/35 transition">
                      <Avatar name={p.name} photoURL={p.photoURL} className="w-9 h-9 text-sm" />
                      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-[#2a2017]">{p.name || 'უსახელო'}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white ring-1 ring-[#e8dcc8]">
                <Avatar name={who.name} photoURL={who.photoURL} className="w-10 h-10 text-base" />
                <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-[#2a2017]">{who.name}</span>
                {!only && <Btn size="sm" kind="ghost" onClick={() => { setWho(null); setWhat(null); }}>შეცვლა</Btn>}
              </div>
              <p className="flex items-start gap-1.5 text-[13px] text-[#75685a]"><Lock className="w-4 h-4 mt-px shrink-0" /> {seenBy}</p>

              {what === null && (
                <div className="grid grid-cols-2 gap-2.5">
                  <button type="button" onClick={() => setWhat('note')}
                    className="flex flex-col items-center justify-center gap-2 h-28 rounded-2xl bg-[#fff8e6] ring-1 ring-amber-200 text-amber-900 cursor-pointer hover:ring-amber-400 transition">
                    <Pin className="w-6 h-6" />
                    <span className="text-[15px] font-bold">კომენტარი</span>
                  </button>
                  <button type="button" onClick={() => setWhat('work')} disabled={!mine.length}
                    className="flex flex-col items-center justify-center gap-2 h-28 rounded-2xl bg-white ring-1 ring-[#e8dcc8] text-[#7a2028] cursor-pointer hover:ring-[#7a2028]/35 transition disabled:opacity-50 disabled:cursor-default">
                    <ClipboardList className="w-6 h-6" />
                    <span className="text-[15px] font-bold">დავალება</span>
                    {!mine.length && <span className="text-[12px] font-semibold text-[#8a7a6a]">კლასი არ აქვს</span>}
                  </button>
                </div>
              )}

              {what === 'note' && (
                <div>
                  <Label>რა უთხრა?</Label>
                  <textarea autoFocus className={`${FIELD} !h-32 py-2.5 resize-none`} value={text} maxLength={2000}
                    onChange={e => setText(e.target.value)} placeholder="მაგ: მესამე მუხლში ბანი უფრო რბილად" />
                  {err && <p className="mt-2 text-sm font-semibold text-red-700">{err}</p>}
                </div>
              )}

              {/* an assignment in which class (a private chat with a member of several) */}
              {what === 'work' && !cls && (
                <div className="flex flex-wrap gap-2">
                  {mine.map(c => (
                    <button key={c.id} type="button" onClick={() => setWorkCls(c)}
                      className="h-11 px-4 rounded-full bg-white ring-1 ring-[#e8dcc8] text-[14px] font-bold text-[#4a3426] cursor-pointer hover:ring-[#7a2028]/35">{c.name}</button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </Sheet>

      {who && cls && (
        <NewAssignment
          open={open && what === 'work'}
          onClose={close}
          cls={cls}
          forWhom={{ uid: who.uid, name: who.name }}
          onDone={() => {}}
          onMade={a => onSend({
            kind: 'work', to: who.uid, toName: who.name, text: a.title,
            work: a.id, wcls: cls.id, vid: a.variantId || '', drill: a.exercise || '', due: a.due, note: a.note,
          }).catch(e => console.warn('pin: ', e))}
        />
      )}
    </>
  );
};
