import React, { useState } from 'react';
import { Check, ChevronDown, PenLine, Plus, Trash2 } from 'lucide-react';
import { A_MAX, MINE, MINE_MAX, Q_MAX } from '../../../utils/otkhi';
import { Btn, Card, FIELD, IconBtn, offerUndo } from '../../../components/ui/kit';
import { triggerHaptic } from '../../../utils/haptics';
import { setMine, useMine } from './store';

// The teacher's own questions of „ოთხიდან ერთი“ (a fold under the game's tabs): a question, the right answer and one to
// three wrong ones, a note if wanted. Kept on this phone only; in a game they are the topic „ჩემი კითხვები“.

const EMPTY = { q: '', a: ['', '', '', ''], note: '' };

export const MineEditor: React.FC = () => {
  const mine = useMine();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(EMPTY);
  const wrong = draft.a.slice(1).map(x => x.trim()).filter(Boolean);
  const ready = !!draft.q.trim() && !!draft.a[0].trim() && wrong.length > 0 && mine.length < MINE_MAX;
  const setA = (i: number, v: string) => setDraft(d => ({ ...d, a: d.a.map((x, k) => (k === i ? v : x)) }));

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    triggerHaptic(10);
    const note = draft.note.trim();
    setMine([...mine, {
      id: `m:${Date.now().toString(36)}`, topic: MINE, q: draft.q.trim().slice(0, Q_MAX),
      a: [draft.a[0].trim(), ...wrong].map(x => x.slice(0, A_MAX)),
      ...(note ? { note: note.slice(0, Q_MAX) } : {}),
    }]);
    setDraft(EMPTY);
  };
  const remove = (id: string) => {
    const before = mine;
    setMine(mine.filter(x => x.id !== id));
    offerUndo('კითხვა წაიშალა', () => setMine(before));
  };

  return (
    <>
      <Card className="!p-0 overflow-hidden">
        <button
          type="button"
          onClick={() => { triggerHaptic(5); setOpen(o => !o); }}
          aria-expanded={open}
          className="w-full flex items-center gap-3 px-4 min-h-14 py-3 text-left cursor-pointer hover:bg-[#fbf6ec]/60"
        >
          <PenLine className="w-5 h-5 shrink-0 text-[#7a2028]" />
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-bold text-[#4a3426]">ჩემი კითხვები</span>
            <span className="block text-[12.5px] leading-snug text-[#9a8b7b]">{mine.length ? `${mine.length} კითხვა · თამაშში თემად ჩანს` : 'დაწერე შენი კითხვები შენი კლასისთვის'}</span>
          </span>
          <ChevronDown className={`w-5 h-5 shrink-0 text-[#9a8b7b] transition ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="px-4 pb-4 pt-3 space-y-3 border-t border-[#f1e8d9]">
            {mine.length > 0 && (
              <ul className="rounded-2xl ring-1 ring-[#e8dcc8] bg-white overflow-hidden divide-y divide-[#f1e8d9]">
                {mine.map(x => (
                  <li key={x.id} className="flex items-start gap-2 pl-3 pr-1.5 py-2">
                    <span className="min-w-0 flex-1 py-0.5">
                      <span className="block text-[14px] leading-snug text-[#4a3426] break-words">{x.q}</span>
                      <span className="mt-0.5 flex items-start gap-1 text-[13px] font-bold leading-snug text-[#24603d] break-words"><Check className="w-3.5 h-3.5 shrink-0 mt-0.5" />{x.a[0]}</span>
                      <span className="mt-0.5 block text-[12.5px] leading-snug text-[#9a8b7b] break-words">{x.a.slice(1).join(' · ')}</span>
                    </span>
                    <IconBtn label="კითხვის წაშლა" tone="danger" onClick={() => remove(x.id)}><Trash2 /></IconBtn>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={add} className="space-y-2">
              <textarea value={draft.q} onChange={e => setDraft(d => ({ ...d, q: e.target.value }))} rows={3} maxLength={Q_MAX} placeholder="კითხვა" aria-label="კითხვა" className={`${FIELD} !h-auto py-2.5 leading-snug resize-none`} />
              <p className="pt-1 text-[12.5px] font-bold text-[#24603d]">სწორი პასუხი</p>
              <input value={draft.a[0]} onChange={e => setA(0, e.target.value)} maxLength={A_MAX} placeholder="სწორი პასუხი" aria-label="სწორი პასუხი" className={FIELD} />
              <p className="pt-1 text-[12.5px] font-bold text-[#75685a]">არასწორი პასუხები · ერთი მაინც</p>
              {[1, 2, 3].map(i => (
                <input key={i} value={draft.a[i]} onChange={e => setA(i, e.target.value)} maxLength={A_MAX} placeholder={`არასწორი პასუხი ${i}`} aria-label={`არასწორი პასუხი ${i}`} className={FIELD} />
              ))}
              <input value={draft.note} onChange={e => setDraft(d => ({ ...d, note: e.target.value }))} maxLength={Q_MAX} placeholder="განმარტება (არასავალდებულო)" aria-label="განმარტება" className={FIELD} />
              <Btn type="submit" full icon={<Plus />} disabled={!ready}>დამატება</Btn>
            </form>
            <p className="text-[12px] leading-snug text-[#9a8b7b]">ინახება მხოლოდ ამ მოწყობილობაზე. თამაშში პასუხები არეული რიგით ჩნდება.</p>
          </div>
        )}
      </Card>
      <p className="px-1 text-[12px] leading-snug text-[#9a8b7b]">
        კითხვები აპის ტექსტებიდან (კალენდარი, საღმრთო ისტორია, გალობის წინაპრები, სიმღერების არქივი, მთქმელები…) ხელოვნურმა ინტელექტმა შეადგინა და მასწავლებელს ჯერ არ შეუმოწმებია.
        ტელეფონს ახსოვს უკვე დასმული კითხვები, ამიტომ შემდეგ თამაშში ჯერ ახლები მოვა.
      </p>
    </>
  );
};
