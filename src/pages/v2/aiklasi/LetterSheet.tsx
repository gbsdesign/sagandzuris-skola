import React, { useMemo, useState } from 'react';
import { CheckCircle2, MessageCircle, Pencil, Send, UserRound } from 'lucide-react';
import { useAuth, useNavigation } from '../../../context';
import { Area, Button, Card, Helper, SectionLabel, Sheet } from '../../../components/ui2';
import { pieceName } from '../../../components/learn/LearnReview';
import type { ClassMember, SchoolClass } from '../../../hooks/useClasses';
import { openAdminThread, openThread, sendThreadText } from '../../../hooks/useDirectChat';
import { errorText } from '../../../utils/errorText';
import { longDay, readyLetter, type WeekRow } from '../../../utils/weekReport';

// x-idea-kvira-2 — „ერთი შეხებით — მზა წერილი“: a member's row in the week's report opens a ready letter built from their week
// (utils/weekReport `readyLetter`). „გაგზავნა“ puts it into the private chat with them (the class's teacher's chat, an admin's
// through the administration's), „ჯერ შევცვლი“ opens it for editing first. Nothing is ever sent by itself.

export const LetterSheet: React.FC<{
  cls: SchoolClass;
  row: WeekRow;
  member: ClassMember;
  onClose: () => void;
  onStudent: () => void;
}> = ({ cls, row, member, onClose, onStudent }) => {
  const { user } = useAuth();
  const { openDm } = useNavigation();
  const ready = useMemo(() => readyLetter(row, {
    repeat: row.repeat ? pieceName(row.repeat) : null,
    stuck: row.stuck?.piece ? pieceName(row.stuck.piece) : null,
  }), [row]);
  const [text, setText] = useState(ready);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState('');

  const send = async () => {
    if (!user || !text.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const mine = cls.teachers.find(t => t.uid === user.uid);
      const me = { uid: user.uid, name: mine?.name || user.displayName || '', photoURL: mine?.photoURL || user.photoURL || '' };
      const other = { uid: member.uid, name: member.name || row.name, photoURL: member.photoURL || '' };
      // the class's teacher writes in their own chat with the member; an admin who does not teach it, as the administration
      const id = cls.teacherIds.includes(user.uid) ? await openThread(me, other, cls.id) : await openAdminThread(other);
      await sendThreadText(id, { ...me, teacher: true }, text);
      setSentTo(id);
      setEditing(false);
    } catch (e) {
      setError('წერილი ვერ გაიგზავნა: ' + errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open title={row.short} onClose={onClose}>
      <p className="-mt-1 px-1 text-body text-mut">{row.last ? `ბოლო ვარჯიში: ${longDay(row.last)}` : 'ჯერ არ უვარჯიშია'}</p>
      <SectionLabel label="მზა წერილი" />
      {editing ? (
        <Area label="წერილი" hideLabel value={text} onChange={setText} rows={4} maxLength={2000} autoFocus />
      ) : (
        <Card><p className="text-lead leading-normal whitespace-pre-line wrap-break-word">{text}</p></Card>
      )}
      {error && <p className="px-1.5 text-meta font-semibold text-danger">{error}</p>}
      {sentTo ? (
        <>
          <Helper icon={<CheckCircle2 />}>გაიგზავნა — {row.first} პირად ჩათში ნახავს.</Helper>
          <Button kind="ghost" full icon={<MessageCircle />} onClick={() => { onClose(); openDm(sentTo); }}>ჩათის გახსნა</Button>
        </>
      ) : (
        <>
          <Button full icon={<Send />} disabled={busy || !text.trim()} onClick={() => { void send(); }}>
            {busy ? 'იგზავნება…' : 'გაგზავნა'}
          </Button>
          {!editing && <Button kind="ghost" full icon={<Pencil />} onClick={() => setEditing(true)}>ჯერ შევცვლი</Button>}
        </>
      )}
      <Button kind="quiet" size="md" full icon={<UserRound />} onClick={onStudent}>მოსწავლის გვერდი</Button>
    </Sheet>
  );
};
