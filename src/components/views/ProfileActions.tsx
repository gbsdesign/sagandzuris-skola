import React, { useState } from 'react';
import { LogOut, Trash2 } from 'lucide-react';
import { useAuth, useViewing } from '../../context/AuthContext';
import { Btn, askConfirm } from '../ui/kit';
import { PWAInstallButton } from '../PWAInstallButton';
import { deleteMyAccount } from '../../utils/deleteAccount';

/** Signing out (asked once) and deleting the account (asked twice) — the card below and the settings page's rows.
 *  `canDelete`: a signed-in person on their own page (never on a teacher's look at a student). */
export const useAccountActions = () => {
  const { user, signOutUser } = useAuth();
  const viewing = useViewing();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const leave = async () => {
    // board x-dadastureba: what happens next, not only who is signed in
    const yes = await askConfirm({
      title: 'გამოხვიდე ანგარიშიდან?',
      text: `ხელახლა შესასვლელად Google ან ელფოსტა დაგჭირდება. რაც ისწავლე, ანგარიშში რჩება.${user?.email ? ` (${user.email})` : ''}`,
      ok: 'გამოსვლა',
    });
    if (yes) await signOutUser();
  };
  const remove = async () => {
    setError('');
    const first = await askConfirm({
      title: 'წაიშალოს შენი ანგარიში?',
      text: 'წაიშლება შენი პროფილი, საგანძურის გზა, ნასწავლი, ჩანაწერები და პარამეტრები. ჩათებში დაწერილი შეტყობინებები სხვებს დარჩებათ.',
      ok: 'გაგრძელება',
      danger: true,
    });
    if (!first) return;
    const sure = await askConfirm({ title: 'ნამდვილად წავშალო?', text: 'ამის დაბრუნება ვეღარ მოხერხდება.', ok: 'წაშლა', danger: true });
    if (!sure) return;
    setBusy(true);
    const why = await deleteMyAccount();
    setBusy(false);
    if (why) { setError(why); return; }
    await signOutUser();
  };
  return { leave, remove, busy, error, canDelete: !!user && !viewing };
};

/** The profile page's last row: install the app (when the browser offers it) and leave the account — the one
 *  place for signing out (the header lost its ⏏ in 2026-10), and it asks first so a stray tap never logs out.
 *  Under it, small, „ანგარიშის წაშლა“ (utils/deleteAccount.ts; the App Store asks for it) — asked twice. */
export const ProfileActions: React.FC = () => {
  const { leave, remove, busy, error, canDelete } = useAccountActions();
  return (
    <div className="px-1 pt-2 space-y-3">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <PWAInstallButton />
        <Btn kind="ghost" icon={<LogOut />} onClick={leave}>გამოსვლა</Btn>
      </div>
      {canDelete && (
        <div className="flex flex-col items-end gap-1.5">
          <Btn kind="danger" size="sm" icon={<Trash2 />} onClick={() => void remove()} disabled={busy}>
            {busy ? 'იშლება…' : 'ანგარიშის წაშლა'}
          </Btn>
          {error && <p role="alert" className="text-[13px] font-semibold text-[#9b2c2c] text-right">{error}</p>}
        </div>
      )}
    </div>
  );
};
