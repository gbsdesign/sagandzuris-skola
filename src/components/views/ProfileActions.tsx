import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context';
import { Btn, askConfirm } from '../ui/kit';
import { PWAInstallButton } from '../PWAInstallButton';

/** The profile page's last row: install the app (when the browser offers it) and leave the account — the one
 *  place for signing out (the header lost its ⏏ in 2026-10), and it asks first so a stray tap never logs out. */
export const ProfileActions: React.FC = () => {
  const { user, signOutUser } = useAuth();
  const leave = async () => {
    const yes = await askConfirm({ title: 'გამოხვიდე ანგარიშიდან?', text: user?.email || undefined, ok: 'გამოსვლა' });
    if (yes) await signOutUser();
  };
  return (
    <div className="flex flex-wrap items-center justify-end gap-3 px-1 pt-2">
      <PWAInstallButton />
      <Btn kind="ghost" icon={<LogOut />} onClick={leave}>გამოსვლა</Btn>
    </div>
  );
};
