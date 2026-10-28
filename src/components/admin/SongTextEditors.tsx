import React from 'react';
import { TextAlignStart } from 'lucide-react';
import { setSongTextEditor, useSongTextEditors } from '../../hooks/useSongTexts';
import { Avatar, Switch, Toggle } from '../ui/kit';
import { Fold } from './Fold';
import type { UserRecord } from './UsersTab';

// Who may write the folk songs' words (✎ on a song's page): admins always; a member or teacher when an admin turns it
// on in the person's window. Data: settings/songTextEditors (hooks/useSongTexts.ts).

type Msg = (text: string, type: 'success' | 'error') => void;
const FAIL = 'ვერ შეინახა — სცადე თავიდან';

/** The person's window: this person's switch. */
export const SongTextSwitch: React.FC<{ uid: string; onMessage: Msg }> = ({ uid, onMessage }) => {
  const uids = useSongTextEditors();
  return (
    <Toggle
      on={uids.includes(uid)}
      onChange={v => { setSongTextEditor(uid, v).catch(() => onMessage(FAIL, 'error')); }}
      label="სიმღერის ტექსტის ჩაწერა"
      hint="სიმღერის გვერდზე ✎ ღილაკით წერს და ასწორებს ტექსტს"
    />
  );
};

/** „სკოლა“ tab: who may write the words now. */
export const SongTextEditorsFold: React.FC<{ users: UserRecord[]; onMessage: Msg }> = ({ users, onMessage }) => {
  const uids = useSongTextEditors();
  const picked = users.filter(u => uids.includes(u.userId));
  return (
    <Fold
      icon={<TextAlignStart />}
      title="სიმღერების ტექსტები"
      summary={`ტექსტის ჩაწერა: ადმინები${picked.length ? ` და ${picked.length} წევრი` : ''}`}
      info="სიმღერის გვერდზე ✎ ღილაკით ტექსტის ჩაწერა და შესწორება. ადმინებს ყოველთვის შეუძლიათ. წევრს ჩართავ მის ფანჯარაში („წევრები“ ჩანართი)."
    >
      {picked.length > 0 ? (
        <ul className="border-t border-[#e8dcc8]">
          {picked.map(u => (
            <li key={u.userId} className="flex items-center gap-3 py-1.5">
              <Avatar name={u.name || u.displayName} photo={u.photoURL} size={36} />
              <span className="flex-1 min-w-0 text-[15px] font-semibold text-[#2a2017] truncate">{u.name || u.displayName || u.email}</span>
              <Switch on label="ტექსტის ჩაწერის გამორთვა" onChange={() => { setSongTextEditor(u.userId, false).catch(() => onMessage(FAIL, 'error')); }} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-[#8a7a6a]">ჯერ მხოლოდ ადმინებს შეუძლიათ.</p>
      )}
    </Fold>
  );
};
