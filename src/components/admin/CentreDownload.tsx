import React from 'react';
import { CloudDownload } from 'lucide-react';
import { setCentreEveryone, setCentreMember, useCentreDownloadSettings } from '../../hooks/useCentreDownload';
import { Avatar, Switch, Toggle } from '../ui/kit';
import { Fold } from './Fold';
import type { UserRecord } from './UsersTab';

// Who may save the Folklore Centre's recordings (MP3 / offline): one switch for every member in „სკოლა“, and one per
// member in the person's window. Staff always may. Data: settings/centreDownload (hooks/useCentreDownload.ts).

type Msg = (text: string, type: 'success' | 'error') => void;
const FAIL = 'ვერ შეინახა — სცადე თავიდან';

/** The person's window: this member's switch (shown on, and locked, while every member is allowed). */
export const CentreDownloadSwitch: React.FC<{ uid: string; onMessage: Msg }> = ({ uid, onMessage }) => {
  const s = useCentreDownloadSettings();
  const on = s.everyone || s.uids.includes(uid);
  return (
    <Toggle
      on={on}
      disabled={s.everyone}
      onChange={v => { setCentreMember(uid, v).catch(() => onMessage(FAIL, 'error')); }}
      label="ჩამოწერის ღილაკი"
      hint={s.everyone ? 'ახლა ყველა წევრს აქვს ჩართული („სკოლა“ ჩანართში)' : 'ამ წევრს ცენტრის ჩანაწერებთან გამოუჩნდება'}
    />
  );
};

/** „სკოლა“ tab: every member at once, and the members allowed one by one. */
export const CentreDownloadFold: React.FC<{ users: UserRecord[]; onMessage: Msg }> = ({ users, onMessage }) => {
  const s = useCentreDownloadSettings();
  const picked = users.filter(u => s.uids.includes(u.userId));
  return (
    <Fold
      icon={<CloudDownload />}
      title="ფოლკლორის ცენტრის ჩანაწერები"
      summary={s.everyone ? 'ჩამოწერა ჩართულია ყველა წევრისთვის' : `ჩამოწერა ჩართულია: ${picked.length} წევრი`}
      info="ჩამოწერის და ოფლაინის ღილაკი ცენტრის ჩანაწერებთან. მასწავლებლებს და ადმინებს ყოველთვის აქვთ. ცალკე წევრს ჩართავ მის ფანჯარაში („წევრები“ ჩანართი)."
    >
      <Toggle
        on={s.everyone}
        onChange={v => { setCentreEveryone(v).catch(() => onMessage(FAIL, 'error')); }}
        label="ყველა წევრს"
        hint={s.everyone ? 'ყველა წევრს უჩანს ჩამოწერის ღილაკი' : 'მხოლოდ ქვემოთ ჩამოთვლილ წევრებს'}
      />
      {!s.everyone && picked.length > 0 && (
        <ul className="mt-1 border-t border-[#e8dcc8]">
          {picked.map(u => (
            <li key={u.userId} className="flex items-center gap-3 py-1.5">
              <Avatar name={u.name || u.displayName} photo={u.photoURL} size={36} />
              <span className="flex-1 min-w-0 text-[15px] font-semibold text-[#2a2017] truncate">{u.name || u.displayName || u.email}</span>
              <Switch on label="ჩამოწერის გამორთვა" onChange={() => { setCentreMember(u.userId, false).catch(() => onMessage(FAIL, 'error')); }} />
            </li>
          ))}
        </ul>
      )}
    </Fold>
  );
};
