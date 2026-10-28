import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { ChevronRight, ShieldCheck } from 'lucide-react';
import { db } from '../../firebase';
import { useAuth, useNavigation } from '../../context';
import { triggerHaptic } from '../../utils/haptics';

/** The profile's way into the admin panel (the header's shield is gone since 2026-10-27): one wine row, admins only.
 *  Superadmins see how many new members wait; a tap with someone waiting opens the panel on them. */
export const AdminEntry: React.FC = () => {
  const { isAdmin, isSuperAdmin } = useAuth();
  const { navigateTo } = useNavigation();
  const [pending, setPending] = useState<string[]>([]);
  const [staffIds, setStaffIds] = useState<string[]>([]);

  // staff never wait (a teacher's role lets them in), so they are not counted — as in the panel
  useEffect(() => {
    if (!isSuperAdmin) return;
    const off1 = onSnapshot(query(collection(db, 'memberAccess'), where('status', '==', 'pending')),
      s => setPending(s.docs.map(d => d.id)), () => setPending([]));
    const off2 = onSnapshot(collection(db, 'admins'),
      s => setStaffIds(s.docs.map(d => d.data().userId).filter((x): x is string => typeof x === 'string' && !!x)), () => setStaffIds([]));
    return () => { off1(); off2(); };
  }, [isSuperAdmin]);
  const waiting = pending.filter(uid => !staffIds.includes(uid)).length;

  if (!isAdmin) return null;
  const open = () => {
    triggerHaptic(10);
    if (waiting > 0) {
      try { localStorage.setItem('sg-admin-tab', 'users'); } catch { /* storage off */ }
    }
    navigateTo('admin');
  };

  return (
    <button type="button" onClick={open}
      className="relative w-full overflow-hidden rounded-3xl px-4 py-3.5 flex items-center gap-3.5 text-left text-[#fbf6ec] bg-gradient-to-r from-[#4a1a20] via-[#7a2028] to-[#9a6a38] shadow-[0_12px_28px_-18px_rgba(94,24,32,0.85)] cursor-pointer active:scale-[0.99] transition">
      <span aria-hidden className="pointer-events-none absolute -top-12 -right-8 w-40 h-40 rounded-full bg-[#f3d9a4]/20 blur-2xl" />
      <span className="relative w-11 h-11 shrink-0 rounded-2xl bg-white/12 ring-1 ring-white/20 flex items-center justify-center">
        <ShieldCheck className="w-5 h-5" />
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="block font-serif-ge text-[16px] font-bold leading-snug">ადმინის პანელი</span>
        <span className="block text-[13px] text-[#fbf6ec]/75 leading-snug">
          {waiting > 0 ? 'ახალი წევრები ელოდება დამატებას' : 'წევრები, კლასები, სკოლის პარამეტრები'}
        </span>
      </span>
      {waiting > 0 && (
        <span className="relative h-7 min-w-7 px-2 rounded-full bg-amber-400 text-[#4a1a20] text-[13px] font-bold tabular-nums flex items-center justify-center">{waiting}</span>
      )}
      <ChevronRight className="relative w-5 h-5 shrink-0 text-[#fbf6ec]/70" />
    </button>
  );
};
