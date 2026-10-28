import React from 'react';
import { setCentreMember, useCentreDownloadSettings } from '../../hooks/useCentreDownload';
import { Toggle } from '../ui/kit';

// Who may save the Folklore Centre's recordings (MP3 / offline): one switch for every member in ⚙ „სკოლა“ →
// „დამატებითი უფლებები“ (ExtraRights.tsx), and one per member in the person's window. Staff always may.
// Data: settings/centreDownload (hooks/useCentreDownload.ts).

type Msg = (text: string, type: 'success' | 'error') => void;
export const FAIL = 'ვერ შეინახა — სცადე თავიდან';

/** The person's window: this member's switch (shown on, and locked, while every member is allowed). */
export const CentreDownloadSwitch: React.FC<{ uid: string; onMessage: Msg }> = ({ uid, onMessage }) => {
  const s = useCentreDownloadSettings();
  const on = s.everyone || s.uids.includes(uid);
  return (
    <Toggle
      on={on}
      disabled={s.everyone}
      onChange={v => { setCentreMember(uid, v).catch(() => onMessage(FAIL, 'error')); }}
      label="ცენტრის ჩანაწერების ჩამოწერა"
      hint={s.everyone ? 'ყველა წევრს ჩართული აქვს (⚙ „სკოლა“)' : undefined}
    />
  );
};
