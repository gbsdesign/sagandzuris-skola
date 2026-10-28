import React, { useState } from 'react';
import { Check, Megaphone, RefreshCw, Send } from 'lucide-react';
import { useAuth } from '../../context';
import { SchoolClass } from '../../hooks/useClasses';
import { classChatBase, sendTextMessage } from '../../hooks/useClassChat';
import { logChange } from '../../utils/adminLog';
import { askConfirm, Btn } from '../ui/kit';
import { ClassLogo } from '../classes/ClassLogo';
import { Fold } from './Fold';

type Msg = (text: string, type: 'success' | 'error') => void;
const MAX = 2000;

// ⚙ „სკოლა“ → „განცხადება კლასებს“ (stage IV, 2026-10-28): one text written once, sent into the chat of every class in
// use (or of the ones ticked), as the admin's own message — the same as writing it in each chat by hand.
export const Announce: React.FC<{ classes: SchoolClass[]; onMessage: Msg }> = ({ classes, onMessage }) => {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [off, setOff] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const to = classes.filter(c => !off.has(c.id));
  const toggle = (id: string) => setOff(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const send = async () => {
    const t = text.trim();
    if (!t || !user || !to.length) return;
    if (!(await askConfirm({
      title: `გავუგზავნო ${to.length} კლასს?`,
      text: 'ტექსტი შენი სახელით ჩაჯდება თითო კლასის ჩათში — ყველა წევრი და მასწავლებელი ნახავს.',
      ok: 'გაგზავნა',
    }))) return;
    setSending(true);
    let failed = 0;
    for (const c of to) {
      const me = c.teachers.find(m => m.uid === user.uid) || c.members.find(m => m.uid === user.uid);
      try {
        await sendTextMessage(classChatBase(c.id), { uid: user.uid, name: me?.name || user.displayName || 'ადმინისტრაცია', photoURL: me?.photoURL || user.photoURL || '', teacher: true }, t);
      } catch {
        failed++;
      }
    }
    setSending(false);
    const sent = to.length - failed;
    if (sent) logChange('class', `განცხადება ${sent} კლასს: „${t.slice(0, 120)}${t.length > 120 ? '…' : ''}“`);
    if (failed) onMessage(`გაიგზავნა ${sent} კლასში, ${failed} კლასში ვერ — შეამოწმე ინტერნეტი.`, 'error');
    else { onMessage(`განცხადება გაიგზავნა ${sent} კლასის ჩათში.`, 'success'); setText(''); }
  };

  return (
    <Fold icon={<Megaphone />} title="განცხადება კლასებს" summary="ერთი ტექსტი ყველა კლასის ჩათში">
      {classes.length === 0 ? (
        <p className="py-1 text-[13px] text-[#8a7a6a]">გამოყენებაში კლასი ჯერ არ არის.</p>
      ) : (
        <div className="space-y-3">
          <textarea value={text} onChange={e => setText(e.target.value.slice(0, MAX))} rows={4}
            placeholder="მაგ: კვირას წირვის შემდეგ საერთო რეპეტიცია გვაქვს ტაძრის ეზოში." aria-label="განცხადების ტექსტი"
            className="w-full px-3.5 py-3 rounded-2xl bg-white ring-1 ring-[#e8dcc8] focus:ring-2 focus:ring-[#7a2028]/40 text-[15px] leading-relaxed text-[#2a2017] placeholder:text-[#b3a594] outline-none resize-y transition" />
          <div>
            <p className="mb-1.5 text-[13px] font-bold text-[#75685a]">ვის · {to.length}/{classes.length}</p>
            <div className="flex flex-wrap gap-1.5">
              {classes.map(c => {
                const on = !off.has(c.id);
                return (
                  <button key={c.id} type="button" aria-pressed={on} onClick={() => toggle(c.id)}
                    className={`h-10 pl-1 pr-3 rounded-full inline-flex items-center gap-2 text-[13px] font-semibold cursor-pointer transition ${on ? 'bg-[#7a2028]/[0.08] text-[#7a2028] ring-1 ring-[#7a2028]/30' : 'bg-white text-[#8a7a6a] ring-1 ring-[#e8dcc8]'}`}>
                    <ClassLogo name={c.name} logo={c.logo} className={`w-8 h-8 text-xs ${on ? '' : 'opacity-50'}`} />
                    <span className="max-w-[11rem] truncate">{c.name}</span>
                    {on && <Check className="w-4 h-4 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
          <Btn full icon={sending ? <RefreshCw className="animate-spin" /> : <Send />} onClick={send} disabled={sending || !text.trim() || !to.length}>
            {sending ? 'იგზავნება…' : `გაგზავნა · ${to.length} კლასს`}
          </Btn>
        </div>
      )}
    </Fold>
  );
};
