import React, { useEffect } from 'react';
import { Cake, ChevronRight, Sparkles } from 'lucide-react';
import { useAuth, useNavigation } from '../../context';
import { Birthday, inDaysText, nextBirthday, turning, useBirthdays } from '../../utils/birthdays';
import { useNameDays } from '../../utils/nameDays';
import { useMembership } from '../../utils/memberAccess';
import { triggerHaptic } from '../../utils/haptics';

// The home page's gold line for birthdays and name days („ანგელოზის დღე“): teachers and admins see who has one within
// five days (with the age), members only today's. A tap opens „დაბადების დღეები“. For staff it also shows a phone
// notification 5, 3 and 1 days before (once a day, while the app is opened that day; a push even with the app closed
// needs the reminders Worker).

const STAFF_DAYS = 5;
const NOTIFY_AT = [5, 3, 1];

export const BirthdaysSoon: React.FC<{ className?: string }> = ({ className }) => {
  const { user, isTeacher } = useAuth();
  const { isMember } = useMembership();
  const { navigateTo } = useNavigation();
  const list = useBirthdays(!!user && isMember, isTeacher);
  const names = useNameDays(!!user && isMember);
  const now = new Date();
  type Day = { id: string; b: Pick<Birthday, 'uid' | 'name' | 'month' | 'day'> & Partial<Birthday>; name: boolean };
  const coming = [
    ...(list || []).map((b): Day => ({ id: `b-${b.uid}`, b, name: false })),
    ...(names || []).map((n): Day => ({ id: `n-${n.uid}`, b: n, name: true })),
  ]
    .map(x => ({ ...x, days: nextBirthday(x.b, now).days }))
    .filter(x => (isTeacher ? x.days <= STAFF_DAYS : x.days === 0))
    .sort((a, z) => a.days - z.days);

  // staff: a notification 5, 3 and 1 days before, once per person and day on this device
  const key = coming.map(x => `${x.id}:${x.days}`).join(',');
  useEffect(() => {
    if (!isTeacher || !coming.length || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const today = new Date().toISOString().slice(0, 10);
    void navigator.serviceWorker?.ready.then(reg => {
      for (const { id, b, name, days } of coming) {
        if (!NOTIFY_AT.includes(days)) continue;
        const seen = `sg-bday-note-${name ? id : b.uid}-${today}`;
        try { if (localStorage.getItem(seen)) continue; localStorage.setItem(seen, '1'); } catch { continue; }
        const age = name ? undefined : turning(b as Birthday);
        void reg.showNotification(name ? 'ანგელოზის დღე' : 'დაბადების დღე', {
          body: `${b.name} — ${inDaysText(days)}${age ? `, ხდება ${age}` : ''}`,
          tag: `bday-${id}-${today}`,
          icon: '/pwa-192x192.png',
        });
      }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTeacher, key]);

  if (!coming.length) return null;
  return (
    <button
      type="button"
      onClick={() => { triggerHaptic(8); navigateTo('birthdays'); }}
      className={`w-full max-w-md text-left flex items-center gap-3 rounded-2xl px-3 py-2.5 bg-gradient-to-br from-[#fbf0d8] to-[#f3dfb4] ring-1 ring-[#d9b46a] shadow-[0_8px_18px_-12px_rgba(154,116,56,0.8)] cursor-pointer active:scale-[0.99] transition sg-in ${className || ''}`}
    >
      <span className="w-10 h-10 shrink-0 rounded-xl bg-white/70 ring-1 ring-[#d9b46a]/60 text-[#9a6a1c] flex items-center justify-center">{coming[0].name ? <Sparkles className="w-5 h-5" /> : <Cake className="w-5 h-5" />}</span>
      <span className="flex-1 min-w-0">
        {/* the name and when; the age is on the page */}
        {coming.slice(0, 3).map(({ id, b, name, days }) => (
          <span key={id} className="flex items-baseline gap-1.5 text-[14px] leading-snug text-[#5a3d14]">
            <b className="min-w-0 truncate font-bold">{b.name}</b>
            <span className="shrink-0">· {name ? 'ანგელოზის დღე, ' : ''}{inDaysText(days)}</span>
          </span>
        ))}
        {coming.length > 3 && <span className="block text-xs font-semibold text-[#7a5a26]">და კიდევ {coming.length - 3}</span>}
      </span>
      <ChevronRight className="w-5 h-5 shrink-0 text-[#b08a4a]" />
    </button>
  );
};
