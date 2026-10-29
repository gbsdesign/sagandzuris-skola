import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { bindAdminDevice, pushSupported } from './groupPush';

// An admin's phone notices from the reminders Worker (worker/reminders):
// • `waiting` (superadmins): a newcomer asks to be let in — their name, a tap opens their window in the panel;
// • `weekly` (admins): Monday 10:00, the school's week in one line (new members, active, classes without a lesson).
// The choice is kept in adminPush/{uid} (the Worker reads it); this device is bound to the admin with the Worker's
// /account (`admin: true`), so the notices come to every device where it was switched on.

export interface AdminPush { waiting: boolean; weekly: boolean }
const OFF: AdminPush = { waiting: false, weekly: false };

export const useAdminPush = (uid?: string | null) => {
  const [v, setV] = useState<AdminPush>(OFF);
  useEffect(() => {
    if (!uid) { setV(OFF); return; }
    return onSnapshot(doc(db, 'adminPush', uid),
      s => setV({ waiting: !!s.data()?.waiting, weekly: !!s.data()?.weekly }),
      () => setV(OFF));
  }, [uid]);
  return v;
};

/** Saves the choice and binds this device. Returns an error text, or '' when done. */
export const setAdminPush = async (next: AdminPush): Promise<string> => {
  const user = auth.currentUser;
  if (!user) return 'ჯერ შედი ანგარიშში.';
  const any = next.waiting || next.weekly;
  if (any) {
    if (!pushSupported()) return 'ეს ბრაუზერი შეტყობინებებს ვერ მიიღებს. iPhone-ზე ჯერ დაამატე საიტი მთავარ ეკრანზე და იქიდან გახსენი.';
    const err = await bindAdminDevice(true);
    if (err) return err;
  }
  try {
    await setDoc(doc(db, 'adminPush', user.uid), { ...next, at: new Date().toISOString() });
  } catch {
    return 'ვერ შეინახა — შეამოწმე ინტერნეტი.';
  }
  if (!any) void bindAdminDevice(false);
  return '';
};
