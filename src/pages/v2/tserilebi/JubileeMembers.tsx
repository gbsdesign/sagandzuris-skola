import React, { useMemo, useState } from 'react';
import { Loader2, MessageCircle, Plus, Search, UserPlus, X } from 'lucide-react';
import { Avatar, cx, FOCUS, Press, RoundButton } from '../../../components/ui2';
import { offerUndo } from '../../../components/ui/kit';
import type { SchoolClass } from '../../../hooks/useClasses';
import { addJubileeMember, removeJubileeMember, type ChatPerson } from '../../../utils/jubileeChat';
import { errorText } from '../../../utils/errorText';

// A birthday chat's people, unfolded under its head in place of the program (2026-11-24, the user: „იუბილეების ჩათი … პროგრამა კი
// არა ჩათის წევრების სია … დამატების და წაშლის ფუნქციით ასევე პირადში გადასვლის და მიწერის უფლებით ოღონდ … მარტო ადმინებს და
// მასწავლებლებს“). Everyone in the chat sees the list; its teachers and admins add and take out; the 💬 (a private chat) only for them.

const fold = (s: string) => s.toLocaleLowerCase('ka').trim();

export const JubileeMembers: React.FC<{
  cls: SchoolClass;
  me: string;
  /** the chat's teachers and admins: add, take out */
  canEdit: boolean;
  /** opens a private chat with this person (only for teachers and admins); none = no 💬 */
  onWrite?: (p: ChatPerson) => Promise<void> | void;
  /** may this person be written to privately (a teacher writes only to members, an admin to anyone) */
  writable?: (p: ChatPerson, teacher: boolean) => boolean;
  /** who may be added: everyone the editor knows */
  candidates: ChatPerson[];
}> = ({ cls, me, canEdit, onWrite, writable, candidates }) => {
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

  const people = useMemo(() => [
    ...cls.teachers.map(p => ({ ...p, teacher: true })),
    ...cls.members.map(p => ({ ...p, teacher: false })),
  ], [cls.teachers, cls.members]);

  const inChat = useMemo(() => new Set([...cls.memberIds, ...cls.teacherIds]), [cls.memberIds, cls.teacherIds]);
  const found = useMemo(() => {
    const n = fold(q);
    const seen = new Set<string>();
    return candidates.filter(p => {
      if (!p.uid || inChat.has(p.uid) || p.uid === cls.jubilee?.uid || seen.has(p.uid)) return false;
      seen.add(p.uid);
      return !n || fold(p.name).includes(n);
    }).slice(0, 40);
  }, [candidates, q, inChat, cls.jubilee?.uid]);

  const run = async (key: string, job: () => Promise<unknown>) => {
    setErr('');
    setBusy(key);
    try {
      await job();
    } catch (e) {
      setErr('ვერ მოხერხდა: ' + errorText(e));
    } finally {
      setBusy('');
    }
  };

  const add = (p: ChatPerson) => run('add:' + p.uid, () => addJubileeMember(cls, p));
  const remove = (p: ChatPerson) => run('rm:' + p.uid, async () => {
    await removeJubileeMember(cls, p.uid);
    offerUndo(`${p.name} ჩათიდან ამოვიდა`, () => addJubileeMember({ ...cls, memberIds: cls.memberIds.filter(x => x !== p.uid), members: cls.members.filter(m => m.uid !== p.uid) }, p));
  });

  return (
    <div className="flex flex-col gap-2 rounded-tile bg-surf p-2">
      <div className="flex min-h-9 items-center gap-2 pl-2">
        <span className="min-w-0 flex-1 text-meta font-bold text-mut">ჩათის წევრები · {people.length}</span>
        {canEdit && (
          <Press
            onClick={() => { setAdding(v => !v); setQ(''); }}
            aria-expanded={adding}
            className={cx(
              'flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-meta font-bold transition active:scale-95',
              adding ? 'bg-wine text-white' : 'bg-tint text-wine', FOCUS,
            )}
          >
            {adding ? <X aria-hidden="true" className="size-4" /> : <UserPlus aria-hidden="true" className="size-4" />}
            {adding ? 'დახურვა' : 'დამატება'}
          </Press>
        )}
      </div>

      {err && <p role="alert" className="px-2 text-meta text-danger">{err}</p>}

      {adding && (
        <div className="flex flex-col gap-1 rounded-field bg-page p-1.5">
          <label className="relative block">
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-mut" />
            <input
              type="search"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="ვის დაამატებ? სახელი…"
              aria-label="ძებნა"
              autoFocus
              className="h-tap w-full min-w-0 rounded-full bg-surf pr-3 pl-9 text-body text-ink outline-none placeholder:text-faint focus-visible:outline-2 focus-visible:outline-wine/60"
            />
          </label>
          {found.length === 0 ? (
            <p className="px-2 py-3 text-center text-meta text-mut">{q ? 'ვერავინ მოიძებნა.' : 'დასამატებელი აღარავინაა.'}</p>
          ) : found.map(p => (
            <div key={p.uid} className="flex min-h-12 items-center gap-2.5 px-1.5">
              <Avatar name={p.name} photo={p.photoURL} size={32} />
              <span className="min-w-0 flex-1 truncate text-body">{p.name}</span>
              <RoundButton label={`${p.name} — დამატება`} size={36} tone="wine" disabled={!!busy} onClick={() => { void add(p); }}>
                {busy === 'add:' + p.uid ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Plus aria-hidden="true" />}
              </RoundButton>
            </div>
          ))}
        </div>
      )}

      <ul className="flex flex-col">
        {people.map(p => {
          const write = onWrite && p.uid !== me && (!writable || writable(p, p.teacher));
          const out = canEdit && !p.teacher && p.uid !== me;
          return (
            <li key={p.uid} className="flex min-h-12 items-center gap-2.5 px-1.5">
              <Avatar name={p.name} photo={p.photoURL} size={32} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body leading-tight">{p.name}</span>
                {(p.teacher || p.uid === me) && (
                  <span className="text-cap leading-tight text-mut">{p.uid === me ? 'შენ' : 'ხელმძღვანელი'}</span>
                )}
              </span>
              {write && (
                <RoundButton label={`${p.name} — პირადში მიწერა`} size={36} tone="page" disabled={!!busy}
                  className="[&_svg]:text-wine" onClick={() => { void run('dm:' + p.uid, async () => { await onWrite!(p); }); }}>
                  {busy === 'dm:' + p.uid ? <Loader2 aria-hidden="true" className="animate-spin" /> : <MessageCircle aria-hidden="true" />}
                </RoundButton>
              )}
              {out && (
                <RoundButton label={`${p.name} — ჩათიდან ამოშლა`} size={36} tone="page" disabled={!!busy} onClick={() => { void remove(p); }}>
                  {busy === 'rm:' + p.uid ? <Loader2 aria-hidden="true" className="animate-spin" /> : <X aria-hidden="true" />}
                </RoundButton>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default JubileeMembers;
