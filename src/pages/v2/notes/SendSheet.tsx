// „გაუგზავნე კლასს ან მოსწავლეს“ of the notes page's „მეტი“ (2026-11-21, the user: „კლასთან და მოსწავლესთან გაგზავნის ღილაკი“ —
// teachers and admins only, a letter in the chat). The classes I lead (an admin: every class), each folding open to „მთელ კლასს“
// and its members; one tap sends this chant (its name and its link — the chat opens the link as these notes) with an optional
// short word. A member's letter goes to the teacher's private chat with them, or (an admin who does not teach the class) to the
// administration's chat with them — the same writes as the assistant's (damkhmare/act.ts); firestore.rules decide each one.
import React, { useState } from 'react';
import { Check, ChevronDown, Users } from 'lucide-react';
import { Avatar, cx, Field, Rows, Row, SectionLabel, Sheet, Small } from '../../../components/ui2';
import { useAuth } from '../../../context/AuthContext';
import { useManagedClasses, type SchoolClass } from '../../../hooks/useClasses';
import { sendLetters, sendToClass, type Me } from '../damkhmare/act';
import { useBackClose } from '../../notes/QrTools';

type State = 'busy' | 'done' | 'fail';

/** The letter: the chant, the teacher's word if any, the link the chat opens as the notes. */
export const chantLetter = (title: string, sub: string, url: string, word: string) =>
  [`🎼 „${title}“${sub ? ` — ${sub}` : ''}`, word.trim(), url].filter(Boolean).join('\n');

export const SendSheet: React.FC<{
  title: string;
  /** the chant's grey line (book, page, №) */
  sub: string;
  url: string;
  /** the notes page's toast */
  say: (msg: string) => void;
  onClose: () => void;
}> = ({ title, sub, url, say, onClose }) => {
  const back = useBackClose('sgSend', onClose);
  const { user } = useAuth();
  const { classes, loading } = useManagedClasses();
  const [word, setWord] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [sent, setSent] = useState<Record<string, State>>({});
  if (!user) return null;
  // one class: open at once
  const shown = open ?? (classes.length === 1 ? classes[0].id : null);

  const nameIn = (c: SchoolClass) =>
    c.teachers.find(t => t.uid === user.uid)?.name || c.members.find(m => m.uid === user.uid)?.name || user.displayName || 'მასწავლებელი';
  const meIn = (c: SchoolClass): Me => ({
    uid: user.uid, name: nameIn(c), photoURL: user.photoURL || '', email: user.email || undefined,
  });

  const go = async (key: string, run: () => Promise<boolean>) => {
    if (sent[key] === 'busy' || sent[key] === 'done') return;
    setSent(s => ({ ...s, [key]: 'busy' }));
    let ok = false;
    try { ok = await run(); } catch (e) { console.warn('send chant: ', (e as { code?: string })?.code || e); }
    setSent(s => ({ ...s, [key]: ok ? 'done' : 'fail' }));
    say(ok ? 'გაიგზავნა' : 'ვერ გაიგზავნა — სცადე თავიდან');
  };
  const text = chantLetter(title, sub, url, word);
  const toClass = (c: SchoolClass) => go(`c:${c.id}`, async () => { await sendToClass(meIn(c), c.id, text); return true; });
  const toMember = (c: SchoolClass, m: SchoolClass['members'][number]) =>
    go(`m:${c.id}:${m.uid}`, async () => {
      const via = c.teacherIds.includes(user.uid) ? c.id : null;
      const r = await sendLetters(meIn(c), [{ uid: m.uid, name: m.name, photo: m.photoURL, via }], text);
      return r.sent > 0;
    });

  const end = (key: string) => {
    const s = sent[key];
    if (s === 'busy') return <Small tone="mut">იგზავნება…</Small>;
    if (s === 'done') return <Small tone="leaf" bold><Check aria-hidden="true" className="mr-0.5 inline size-4" />გაიგზავნა</Small>;
    if (s === 'fail') return <Small tone="danger">ხელახლა</Small>;
    return <Small tone="wine" bold>გაგზავნა</Small>;
  };

  return (
    <Sheet open title="გაგზავნა" onClose={back} back={false}>
      <div className="shrink-0 px-2 text-center">
        <div className="text-head font-bold wrap-break-word">{title}</div>
        {sub && <div className="text-meta text-mut wrap-break-word">{sub}</div>}
      </div>
      <Field
        label="შენი სიტყვა (თუ გინდა)"
        value={word}
        onChange={setWord}
        maxLength={300}
        placeholder="მაგ.: ისწავლეთ კვირამდე"
        hint="ჩათში მივა საგალობლის სახელი და ღილაკი — დააჭერენ და ნოტები გაეხსნებათ."
      />
      <SectionLabel label="ვის გაუგზავნო" />
      {loading && classes.length === 0 && <p role="status" className="px-4 text-body text-mut">იტვირთება…</p>}
      {!loading && classes.length === 0 && <p className="px-4 text-body text-mut">შენ ჯერ კლასი არ გყავს.</p>}
      {classes.map(c => {
        const on = shown === c.id;
        const members = c.members.filter(m => m.uid !== user.uid);
        return (
          <Rows key={c.id}>
            <Row
              lead={<Avatar name={c.name} photo={c.logo || undefined} size={40} />}
              title={c.name}
              sub={`${members.length} მოსწავლე`}
              aria-expanded={on}
              right={<ChevronDown aria-hidden="true" className={cx('size-[18px] shrink-0 text-mut transition-transform', on && 'rotate-180')} />}
              onClick={() => setOpen(on ? '' : c.id)}
            />
            {on && (
              <>
                <Row
                  lead={<span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-tint text-wine"><Users className="size-5" /></span>}
                  title="მთელ კლასს"
                  sub="კლასის ჩათში"
                  right={end(`c:${c.id}`)}
                  onClick={() => void toClass(c)}
                />
                {members.map(m => (
                  <Row
                    key={m.uid}
                    lead={<Avatar name={m.name} photo={m.photoURL} size={40} />}
                    title={m.name}
                    right={end(`m:${c.id}:${m.uid}`)}
                    onClick={() => void toMember(c, m)}
                  />
                ))}
              </>
            )}
          </Rows>
        );
      })}
    </Sheet>
  );
};
