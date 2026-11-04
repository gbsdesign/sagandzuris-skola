import React, { useState } from 'react';
import { ChevronDown, PenLine, Plus, Trash2 } from 'lucide-react';
import { A_MAX, MINE, MINE_MAX, Q_MAX } from '../../../utils/raSadRodis';
import { Btn, Card, FIELD, IconBtn, offerUndo } from '../../../components/ui/kit';
import { triggerHaptic } from '../../../utils/haptics';
import { setMine, useMine } from './store';

// The teacher's own questions of „რა? სად? როდის?“ (kept on the device; a topic of their own in both tabs), and the line on
// where the written ones come from — under both tabs of the game's page.

export const RsrMineEditor: React.FC = () => {
  const mine = useMine();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ q: '', a: '', note: '' });

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.q.trim(), answer = draft.a.trim(), note = draft.note.trim();
    if (!text || !answer || mine.length >= MINE_MAX) return;
    triggerHaptic(10);
    setMine([...mine, { id: `m:${Date.now().toString(36)}`, topic: MINE, q: text.slice(0, Q_MAX), a: answer.slice(0, A_MAX), ...(note ? { note: note.slice(0, Q_MAX) } : {}) }]);
    setDraft({ q: '', a: '', note: '' });
  };
  const remove = (id: string) => {
    const before = mine;
    setMine(mine.filter(x => x.id !== id));
    offerUndo('კითხვა წაიშალა', () => setMine(before));
  };

  return (
    <>
      <Card className="!p-0 overflow-hidden">
        <button type="button" onClick={() => { triggerHaptic(5); setOpen(o => !o); }} aria-expanded={open} className="w-full flex items-center gap-3 px-4 min-h-14 py-3 text-left cursor-pointer hover:bg-[#fbf6ec]/60">
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
                      <span className="mt-0.5 block text-[13px] font-bold leading-snug text-[#7a2028] break-words">{x.a}</span>
                    </span>
                    <IconBtn label="კითხვის წაშლა" tone="danger" onClick={() => remove(x.id)}><Trash2 /></IconBtn>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={add} className="space-y-2">
              <textarea value={draft.q} onChange={e => setDraft(d => ({ ...d, q: e.target.value }))} rows={3} maxLength={Q_MAX} placeholder="კითხვა" aria-label="კითხვა" className={`${FIELD} !h-auto py-2.5 leading-snug resize-none`} />
              <input value={draft.a} onChange={e => setDraft(d => ({ ...d, a: e.target.value }))} maxLength={A_MAX} placeholder="პასუხი" aria-label="პასუხი" className={FIELD} />
              <input value={draft.note} onChange={e => setDraft(d => ({ ...d, note: e.target.value }))} maxLength={Q_MAX} placeholder="განმარტება (არასავალდებულო)" aria-label="განმარტება" className={FIELD} />
              <Btn type="submit" full icon={<Plus />} disabled={!draft.q.trim() || !draft.a.trim() || mine.length >= MINE_MAX}>დამატება</Btn>
            </form>
            <p className="text-[12px] leading-snug text-[#9a8b7b]">ინახება მხოლოდ ამ მოწყობილობაზე. ონლაინ თამაშში პასუხის სხვა ფორმა ფრჩხილებში ჩაწერე — ესეც ჩაითვლება.</p>
          </div>
        )}
      </Card>
      <p className="px-1 text-[12px] leading-snug text-[#9a8b7b]">
        კითხვები (ისტორია, გმირები, მწერლობა, კინო, სუფრა, ძეგლები, ბუნება, სპორტი, წმინდანები, საღმრთო ისტორია, გალობა…) ხელოვნურმა ინტელექტმა შეადგინა და მასწავლებელს ჯერ არ შეუმოწმებია.
        ტელეფონს ახსოვს უკვე დასმული კითხვები, ამიტომ შემდეგ თამაშში ჯერ ახლები მოვა.
      </p>
    </>
  );
};
