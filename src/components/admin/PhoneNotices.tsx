import React, { useState } from 'react';
import { BellRing } from 'lucide-react';
import { useAuth } from '../../context';
import { AdminPush, setAdminPush, useAdminPush } from '../../utils/adminPush';
import { Toggle } from '../ui/kit';
import { Fold } from './Fold';

type Msg = (text: string, type: 'success' | 'error') => void;

// ⚙ „სკოლა“ → „ტელეფონზე შეტყობინებები“: an admin's own phone notices (utils/adminPush.ts, sent by the reminders Worker).
// A newcomer waiting to be let in is for superadmins (they decide); Monday's short look at the week is for every admin.
export const PhoneNotices: React.FC<{ onMessage: Msg }> = ({ onMessage }) => {
  const { user, isSuperAdmin } = useAuth();
  const saved = useAdminPush(user?.uid);
  const [busy, setBusy] = useState(false);
  const on = [isSuperAdmin && saved.waiting && 'ახალი წევრი', saved.weekly && 'ორშაბათის მიმოხილვა'].filter(Boolean);

  const set = async (next: Partial<AdminPush>) => {
    setBusy(true);
    const err = await setAdminPush({ ...saved, ...next });
    setBusy(false);
    if (err) onMessage(err, 'error');
  };

  return (
    <Fold icon={<BellRing />} title="ტელეფონზე შეტყობინებები" summary={on.length ? `ჩართულია: ${on.join(', ')}` : 'გამორთულია'}>
      {isSuperAdmin && (
        <Toggle on={saved.waiting} disabled={busy} onChange={v => set({ waiting: v })}
          label="ახალი წევრი ელოდება"
          hint="როცა ვინმე ითხოვს დამატებას — მისი სახელი; შეხებით მისი ფანჯარა იხსნება" />
      )}
      <Toggle on={saved.weekly} disabled={busy} onChange={v => set({ weekly: v })}
        label="ორშაბათის მიმოხილვა"
        hint="ორშაბათს 10:00 — ახალი წევრები, აქტიური და კლასები, რომლებსაც კვირაში გაკვეთილი არ ჰქონიათ" />
      <p className="pt-1 text-[12px] text-[#8a7a6a] leading-snug">მოვა ყველა მოწყობილობაზე, სადაც ჩართავ. iPhone-ზე — მხოლოდ მთავარ ეკრანზე დამატებული საიტიდან.</p>
    </Fold>
  );
};
