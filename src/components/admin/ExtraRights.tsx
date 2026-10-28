import React from 'react';
import { KeyRound } from 'lucide-react';
import { setCentreEveryone, setCentreMember, useCentreDownloadSettings } from '../../hooks/useCentreDownload';
import { setSongTextEditor, useSongTextEditors } from '../../hooks/useSongTexts';
import { Avatar, Switch, Toggle } from '../ui/kit';
import { FAIL } from './CentreDownload';
import { Fold } from './Fold';
import { changed } from './changed';
import type { UserRecord } from './UsersTab';

type Msg = (text: string, type: 'success' | 'error') => void;

// „დამატებითი უფლებები“ in ⚙ „სკოლა“ (2026-10-28: the two look-alike cards „ფოლკლორის ცენტრის ჩანაწერები“ and
// „სიმღერების ტექსტები“ made one): who has a right beyond a member's — saving the Folklore Centre's recordings and
// writing a song's words. One member at a time is turned on in their own window (CentreDownloadSwitch, SongTextSwitch).
export const ExtraRightsFold: React.FC<{ users: UserRecord[]; onMessage: Msg }> = ({ users, onMessage }) => {
  const centre = useCentreDownloadSettings();
  const writers = useSongTextEditors();
  const saving = users.filter(u => centre.uids.includes(u.userId));
  const writing = users.filter(u => writers.includes(u.userId));
  const summary = `ჩამოწერა: ${centre.everyone ? 'ყველა წევრს' : `${saving.length} წევრს`} · ტექსტები: ${writing.length ? `ადმინებს და ${writing.length} წევრს` : 'ადმინებს'}`;

  return (
    <Fold icon={<KeyRound />} title="დამატებითი უფლებები" summary={summary}>
      <div className="space-y-4">
        <div>
          <Head title="ცენტრის ჩანაწერების ჩამოწერა" sub="მასწავლებლებს და ადმინებს ყოველთვის აქვთ" />
          <Toggle
            on={centre.everyone}
            onChange={v => {
              setCentreEveryone(v).then(
                () => changed('right', `ცენტრის ჩანაწერების ჩამოწერა ყველა წევრს ${v ? 'ჩაირთო' : 'გამოირთო'}`, '', () => setCentreEveryone(!v)),
                () => onMessage(FAIL, 'error'));
            }}
            label="ყველა წევრს"
          />
          {!centre.everyone && (
            <People people={saving} off="ჩამოწერის გამორთვა" onOff={u => setCentreMember(u.userId, false).then(
              () => changed('right', `${nameOf(u)} — ცენტრის ჩანაწერების ჩამოწერა გამოირთო`, u.userId, () => setCentreMember(u.userId, true)),
              () => onMessage(FAIL, 'error'))} />
          )}
        </div>
        <div>
          <Head title="სიმღერის ტექსტის ჩაწერა" sub="ადმინებს ყოველთვის შეუძლიათ" />
          {writing.length > 0
            ? <People people={writing} off="ტექსტის ჩაწერის გამორთვა" onOff={u => setSongTextEditor(u.userId, false).then(
              () => changed('right', `${nameOf(u)} — სიმღერის ტექსტის ჩაწერა გამოირთო`, u.userId, () => setSongTextEditor(u.userId, true)),
              () => onMessage(FAIL, 'error'))} />
            : <p className="py-1 text-[13px] text-[#8a7a6a]">წევრებიდან ჯერ არავის.</p>}
        </div>
        <p className="text-[12px] text-[#8a7a6a]">ცალკე წევრს ჩართავ მის ფანჯარაში („წევრები“ → სახელი).</p>
      </div>
    </Fold>
  );
};

const Head: React.FC<{ title: string; sub: string }> = ({ title, sub }) => (
  <p className="pb-1 border-b border-[#e8dcc8]">
    <span className="block text-[13px] font-bold text-[#75685a]">{title}</span>
    <span className="block text-[12px] text-[#8a7a6a]">{sub}</span>
  </p>
);

const nameOf = (u: UserRecord) => u.name || u.displayName || u.email;

const People: React.FC<{ people: UserRecord[]; off: string; onOff: (u: UserRecord) => void }> = ({ people, off, onOff }) => (
  <ul>
    {people.map(u => (
      <li key={u.userId} className="flex items-center gap-3 py-1">
        <Avatar name={u.name || u.displayName} photo={u.photoURL} size={36} />
        <span className="flex-1 min-w-0 text-[15px] font-semibold text-[#2a2017] truncate">{nameOf(u)}</span>
        <Switch on label={off} onChange={() => onOff(u)} />
      </li>
    ))}
  </ul>
);
