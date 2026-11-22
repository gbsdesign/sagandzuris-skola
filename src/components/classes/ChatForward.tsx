import React, { useMemo, useState } from 'react';
import { Check, Users } from 'lucide-react';
import { useAuth } from '../../context';
import { useMyAllClasses } from '../../hooks/useShellCounts';
import { classChatBase, forwardMessage, messagePreview, type ChatAuthor, type ChatMessage } from '../../hooks/useClassChat';
import { dmBase, isStaffSide, noteSent, otherOf, useInbox, type DirectThread } from '../../hooks/useDirectChat';
import type { SchoolClass } from '../../hooks/useClasses';
import { Button, Sheet, cx } from '../ui2';
import { Avatar } from './ChatPanel';
import { triggerHaptic } from '../../utils/haptics';

// „გადაგზავნა“ of any message (a voice, a text, a photo, a file; at first only my voice messages) (2026-11-22, the user: „ჩემს მიერ ჩაწერილ ვოისებს ქონდეს გადაზიარების ფუნქცია რომ
// კლასებში ან სხვა მოსწავლეს გადავუგზავნო“): my classes' chats and my private chats, several at once; the classmates' old chats
// (closed) are not offered.

type Target =
  | { key: string; kind: 'class'; title: string; photo: string; cls: SchoolClass }
  | { key: string; kind: 'dm'; title: string; photo: string; thread: DirectThread };

export const ForwardSheet: React.FC<{ m: ChatMessage | null; fromBase: string; onClose: () => void; onDone: (n: number) => void }> = ({
  m, fromBase, onClose, onDone,
}) => {
  const { user, isAdmin } = useAuth();
  const uid = user?.uid || '';
  const classes = useMyAllClasses();
  const { threads } = useInbox(uid || null, isAdmin);
  const [picked, setPicked] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const targets = useMemo<Target[]>(() => [
    ...classes.filter(c => !c.archived).map(c => ({ key: classChatBase(c.id), kind: 'class' as const, title: c.name, photo: c.logo || '', cls: c })),
    ...threads.filter(t => t.kind !== 'peer').map(t => {
      const o = otherOf(t, uid);
      return { key: dmBase(t.id), kind: 'dm' as const, title: o.name || 'უსახელო', photo: o.photoURL, thread: t };
    }),
  ].filter(t => t.key !== fromBase), [classes, threads, uid, fromBase]);

  const word = q.trim().toLowerCase();
  const shown = word ? targets.filter(t => t.title.toLowerCase().includes(word)) : targets;

  const close = () => { if (busy) return; setPicked([]); setQ(''); setErr(''); onClose(); };
  const toggle = (k: string) => setPicked(p => (p.includes(k) ? p.filter(x => x !== k) : [...p, k]));

  const send = async () => {
    if (!m || !user || !picked.length) return;
    setBusy(true);
    setErr('');
    let sent = 0;
    for (const key of picked) {
      const t = targets.find(x => x.key === key);
      if (!t) continue;
      try {
        if (t.kind === 'class') {
          const me = t.cls.members.find(x => x.uid === uid) || t.cls.teachers.find(x => x.uid === uid);
          const author: ChatAuthor = {
            uid, name: me?.name || user.displayName || '', photoURL: me?.photoURL || user.photoURL || '', teacher: isAdmin || t.cls.teacherIds.includes(uid),
          };
          await forwardMessage(fromBase, m, t.key, author);
        } else {
          const th = t.thread;
          const staff = isAdmin && isStaffSide(th, uid);
          const author: ChatAuthor = {
            uid, name: th.names[uid] || user.displayName || '', photoURL: th.photos[uid] || user.photoURL || '',
            teacher: (th.kind === 'teach' && th.teacherUid === uid) || staff,
          };
          await forwardMessage(fromBase, m, t.key, author);
          await noteSent(th, uid, messagePreview(m)).catch(() => {});
        }
        sent++;
      } catch (e) {
        console.warn('forward: ', (e as { code?: string })?.code || e);
      }
    }
    setBusy(false);
    if (sent < picked.length) { setErr(sent ? `${picked.length - sent} ჩათში ვერ გაიგზავნა.` : 'ვერ გაიგზავნა — სცადე თავიდან.'); return; }
    triggerHaptic(20);
    setPicked([]);
    setQ('');
    onDone(sent);
  };

  return (
    <Sheet open={!!m} onClose={close} title="გადაგზავნა">
      <div className="flex flex-col gap-2 pb-1">
        {m && <p className="truncate rounded-field bg-soft px-3 py-2 text-meta font-semibold text-ink">{messagePreview(m)}</p>}
        {targets.length > 6 && (
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="ძებნა"
            aria-label="ძებნა"
            className="min-h-tap rounded-field bg-surf px-3.5 text-lead text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-wine/35"
          />
        )}
        {targets.length === 0 && <p className="py-4 text-center text-body text-mut">გადასაგზავნი ჩათი არ არის.</p>}
        <ul className="flex max-h-[50dvh] flex-col gap-1 overflow-y-auto overscroll-contain">
          {shown.map(t => {
            const on = picked.includes(t.key);
            return (
              <li key={t.key}>
                <button
                  type="button"
                  onClick={() => toggle(t.key)}
                  aria-pressed={on}
                  className={cx('flex min-h-tap-lg w-full cursor-pointer items-center gap-3 rounded-field px-3 text-left transition active:scale-[0.99]', on ? 'bg-tint' : 'bg-surf')}
                >
                  {t.kind === 'class' && !t.photo
                    ? <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-soft text-wine"><Users className="size-[18px]" /></span>
                    : <Avatar name={t.title} photoURL={t.photo} className="size-9 shrink-0 text-sm" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-lead font-semibold text-ink">{t.title}</span>
                    <span className="block text-cap text-mut">{t.kind === 'class' ? 'კლასის ჩათი' : 'პირადი ჩათი'}</span>
                  </span>
                  <span className={cx('flex size-6 shrink-0 items-center justify-center rounded-full', on ? 'bg-wine text-white' : 'ring-2 ring-line')}>
                    {on && <Check className="size-4" />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {err && <p className="text-meta text-danger">{err}</p>}
        <Button full disabled={!picked.length || busy} onClick={() => void send()}>
          {busy ? 'იგზავნება…' : picked.length ? `გაგზავნა · ${picked.length}` : 'აირჩიე ჩათი'}
        </Button>
      </div>
    </Sheet>
  );
};
