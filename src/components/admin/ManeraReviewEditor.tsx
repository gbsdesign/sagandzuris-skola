import React, { useEffect, useState } from 'react';
import { deleteField, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { Check, ChevronDown, MessageSquareText, Trash2 } from 'lucide-react';
import { db } from '../../firebase';
import { useAuth } from '../../context';
import { MANERA_ITEMS } from '../../data/habitsAndManera';
import { triggerHaptic } from '../../utils/haptics';
import { ManeraMark, ManeraScore, markDate, readManeraReview } from '../views/ManeraPanel';
import { Btn, FIELD, Flash, useFlash } from '../ui/kit';

const STEPS = [0, 25, 50, 75, 100];

// A student's "მანერა" marked by a teacher (teacher panel → the student's window) or an admin (admin panel → the
// person's window): per tip a percent and an optional note, saved in students/{uid}.maneraReview with who wrote
// it and when. The student only reads them (ManeraContent); firestore.rules keep the field out of their hands.
export const ManeraReviewEditor: React.FC<{ uid: string }> = ({ uid }) => {
  const { user } = useAuth();
  const note = useFlash();
  const [review, setReview] = useState<Record<string, ManeraMark> | null>(null);
  const [denied, setDenied] = useState(false);
  const [openNum, setOpenNum] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ v: number | null; note: string }>({ v: null, note: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => onSnapshot(
    doc(db, 'students', uid),
    snap => setReview(readManeraReview(snap.data()?.maneraReview)),
    () => setDenied(true),
  ), [uid]);

  if (denied) return <p className="py-6 text-center text-sm text-[#8a7a6a]">ამ მოსწავლის მონაცემები ჯერ არ ჩანს.</p>;
  if (!review) return <p className="py-6 text-center text-sm text-[#8a7a6a]">იტვირთება…</p>;

  const openTip = (num: string) => {
    triggerHaptic(8);
    if (openNum === num) { setOpenNum(null); return; }
    const m = review[num];
    setDraft({ v: m?.v ?? null, note: m?.note ?? '' });
    setOpenNum(num);
  };

  const write = async (num: string, value: object) => {
    setBusy(true);
    try {
      await updateDoc(doc(db, 'students', uid), { [`maneraReview.${num}`]: value });
      setOpenNum(null);
      note.ok('შეინახა.');
    } catch {
      note.fail('ვერ შეინახა — მოსწავლის მონაცემებზე წვდომა ჯერ არ არის.');
    } finally {
      setBusy(false);
    }
  };
  const save = (num: string) => {
    if (draft.v === null) return;
    const text = draft.note.trim();
    void write(num, {
      v: draft.v,
      ...(text ? { note: text } : {}),
      by: user?.displayName || 'მასწავლებელი',
      byUid: user?.uid || '',
      at: Date.now(),
    });
  };
  const clear = (num: string) => {
    if (!window.confirm('ამ რჩევის შეფასება და შენიშვნა წაიშალოს?')) return;
    void write(num, deleteField());
  };

  const given = MANERA_ITEMS.filter(it => review[it.num]).length;

  return (
    <div className="space-y-3 text-[#2a2017]">
      <Flash flash={note.flash} onClose={note.clear} />
      <p className="px-1 text-[13px] text-[#8a7a6a]">
        შეფასებულია {given} / {MANERA_ITEMS.length}. შეეხე რჩევას — დაუწერე პროცენტი და, სურვილისამებრ, შენიშვნა. მოსწავლე მხოლოდ კითხულობს.
      </p>
      <ul className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] divide-y divide-[#f1e8d9] overflow-hidden">
        {MANERA_ITEMS.map(item => {
          const m = review[item.num];
          const open = openNum === item.num;
          return (
            <li key={item.num}>
              <button
                type="button"
                onClick={() => openTip(item.num)}
                aria-expanded={open}
                className={`w-full min-h-12 flex items-center gap-2.5 px-3 py-2 text-left cursor-pointer transition-colors ${open ? 'bg-[#fbf6ec]' : 'hover:bg-[#fbf6ec]/60'}`}
              >
                <span className="w-5 shrink-0 text-center text-xs font-bold text-[#c4b49c] tabular-nums">{item.num}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] font-semibold leading-snug">{item.title}</span>
                  {m?.at && <span className="block text-[11.5px] text-[#8a7a6a]">{m.by || 'მასწავლებელი'} · {markDate(m.at)}</span>}
                </span>
                {m?.note && <MessageSquareText aria-label="შენიშვნა" className="w-4 h-4 shrink-0 text-[#b3a594]" />}
                <ManeraScore v={m?.v} />
                <ChevronDown className={`w-4 h-4 shrink-0 text-[#b3a594] transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>

              {open && (
                <div className="px-3 pb-3.5 pt-1 bg-[#fbf6ec] space-y-3 sg-in">
                  <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={`${item.title} — შეფასება`}>
                    {STEPS.map(q => (
                      <button
                        key={q}
                        type="button"
                        role="radio"
                        aria-checked={draft.v === q}
                        onClick={() => { triggerHaptic(8); setDraft(d => ({ ...d, v: q })); }}
                        className={`h-10 rounded-full text-[13px] font-bold tabular-nums cursor-pointer transition-colors ${
                          draft.v === q ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] hover:ring-[#7a2028]/40'
                        }`}
                      >
                        {q}%
                      </button>
                    ))}
                  </div>
                  <textarea
                    className={`${FIELD} !h-24 py-2.5 resize-none`}
                    value={draft.note}
                    onChange={e => setDraft(d => ({ ...d, note: e.target.value }))}
                    placeholder="შენიშვნა (სურვილისამებრ): რა გამოსდის, რაზე იმუშაოს"
                    aria-label={`${item.title} — შენიშვნა`}
                  />
                  <div className="flex items-center gap-2">
                    {m && (
                      <Btn kind="danger" size="sm" icon={<Trash2 />} disabled={busy} onClick={() => clear(item.num)}>წაშლა</Btn>
                    )}
                    <Btn size="sm" icon={<Check />} className="ml-auto" disabled={busy || draft.v === null} onClick={() => save(item.num)}>
                      {draft.v === null ? 'აირჩიე პროცენტი' : 'შენახვა'}
                    </Btn>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
