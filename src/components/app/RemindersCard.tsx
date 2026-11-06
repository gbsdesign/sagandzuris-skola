import React, { useEffect, useState } from 'react';
import { Bell, BellOff, ChevronRight } from 'lucide-react';
import { Knob, Sheet } from '../ui/kit';
import { useAuth } from '../../context';
import { useMyHabits } from '../../hooks/useMyHabits';
import { PRAYER_HOURS, hourClock } from '../../data/prayers';
import { setHabitAlerts } from '../../utils/myHabits';
import { REMIND_TIMES, getRemindTime, setRemindTime } from '../../utils/learnReminder';
import {
  REMINDER_OFFSETS, askNotificationPermission, notificationsSupported, setHourReminders, useReminders,
} from '../../utils/prayerReminders';
import { triggerHaptic } from '../../utils/haptics';

// „შეხსენებები“ on the profile (2026-11-06, the user's pick: „ყველა შეხსენება ერთ ადგილას“): one row under პარამეტრები and one
// window with every reminder the phone can give — the seven prayer hours, the habits that have a time, the learning
// mode's review — each with a switch. Nothing new is stored: the hours' reminders stay on the device (prayerReminders), a
// habit's in its own setup (habitSetup.alerts), the review's hour on the device (learnReminder). A habit without a time is
// named too, with where to set one.

const ROW = 'w-full min-h-12 px-3.5 py-2 flex items-center gap-3 text-left cursor-pointer hover:bg-[#7a2028]/[0.04] disabled:cursor-default disabled:opacity-60';

const Group: React.FC<{ title: string; hint?: string; children: React.ReactNode }> = ({ title, hint, children }) => (
  <section>
    <h3 className="px-1 pb-1.5 text-[12.5px] font-bold text-[#a08a76]">{title}</h3>
    <div className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] divide-y divide-[#f1e8d9] overflow-hidden">{children}</div>
    {hint && <p className="px-1 pt-1.5 text-[12px] leading-snug text-[#8a7a6a]">{hint}</p>}
  </section>
);

const SwitchRow: React.FC<{ on: boolean; onChange: (on: boolean) => void; title: string; sub?: string; disabled?: boolean }> = ({ on, onChange, title, sub, disabled }) => (
  <button type="button" role="switch" aria-checked={on} disabled={disabled} onClick={() => { triggerHaptic(10); onChange(!on); }} className={ROW}>
    <span className="flex-1 min-w-0">
      <span className="block text-[14px] font-bold leading-snug text-[#2a2017]">{title}</span>
      {sub && <span className="block text-[12px] leading-snug text-[#8a7a6a]">{sub}</span>}
    </span>
    <Knob on={on} />
  </button>
);

/** Everything in one window. */
const RemindersSheet: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user } = useAuth();
  const hours = useReminders();
  const mine = useMyHabits(user?.uid);
  const [learnAt, setLearnAt] = useState(getRemindTime);
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>(() => (notificationsSupported() ? Notification.permission : 'unsupported'));
  const [note, setNote] = useState('');

  // turning anything on asks the phone for notifications once
  const allow = async () => {
    const p = await askNotificationPermission();
    setPerm(p);
    if (p === 'unsupported') setNote('ეს ბრაუზერი შეტყობინებებს ვერ აჩვენებს. iPhone-ზე ჯერ საიტი მთავარ ეკრანზე დაამატე და იქიდან გახსენი.');
    else if (p !== 'granted') setNote('შეტყობინებები დაბლოკილია — ჩართე ტელეფონის პარამეტრებში ამ საიტისთვის.');
    else setNote('');
    return p === 'granted';
  };
  const turning = async (on: boolean) => (on ? allow() : true);

  const habits = mine.groups.flatMap(g => g.items);
  const timed = habits.filter(h => h.time?.from);
  const untimed = habits.length - timed.length;

  return (
    <Sheet open onClose={onClose} title="შეხსენებები">
      <div className="space-y-5">
        {perm !== 'granted' && (
          <div className="rounded-2xl bg-[#fff8e6] ring-1 ring-[#ecd9a8] px-3.5 py-3 flex items-center gap-3">
            <BellOff className="w-5 h-5 shrink-0 text-[#b07d12]" />
            <span className="flex-1 min-w-0 text-[13px] leading-snug text-[#5a4630]">
              {note || 'ტელეფონზე შეტყობინებები ჯერ ჩართული არ არის — ჩართვის გარეშე შეხსენებები მხოლოდ გახსნილ აპში ჩანს.'}
            </span>
            {perm === 'default' && (
              <button type="button" onClick={allow} className="shrink-0 h-9 px-3.5 rounded-full bg-[#7a2028] text-[#fbf6ec] text-[13px] font-bold cursor-pointer active:scale-95 transition">ჩართვა</button>
            )}
          </div>
        )}

        <Group title="შვიდგზის ლოცვა" hint="შეხსენება 5 წუთით ადრე მოდის; წუთების შეცვლა ლოცვის გვერდზე შეიძლება.">
          {[...PRAYER_HOURS].sort((a, b) => a.hour - b.hour).map(h => {
            const active = hours[h.id] || [];
            return (
              <SwitchRow key={h.id} title={`${hourClock(h)} · ${h.label}`} on={active.length > 0}
                sub={active.length ? `${[...active].sort((a, b) => b - a).join(', ')} წუთით ადრე` : undefined}
                onChange={async on => { if (await turning(on)) setHourReminders(h.id, on ? [REMINDER_OFFSETS[1]] : []); }} />
            );
          })}
        </Group>

        <Group title="ჩვევები" hint={timed.length > 0 && untimed > 0 ? `კიდევ ${untimed} ჩვევას დრო არ აქვს — ჩვევის ✎-ში დააყენე და აქაც გამოჩნდება.` : undefined}>
          {timed.length === 0 ? (
            <p className="px-3.5 py-3 text-[13px] leading-snug text-[#8a7a6a]">ჯერ არცერთ ჩვევას არ აქვს საათი. ჩვევის ✎-ში დააყენე და შეხსენება აქ გამოჩნდება.</p>
          ) : timed.map(h => {
            const on = (h.alerts?.length ?? 0) > 0;
            return (
              <SwitchRow key={h.id} title={h.label} on={on}
                sub={`${h.time!.from}${on ? ` · ${h.alerts!.map(a => (a === 0 ? 'ზუსტად დროზე' : `${a} წთ ადრე`)).join(', ')}` : ''}`}
                onChange={async next => { if (await turning(next)) void mine.save(setHabitAlerts(mine.setup, h.id, next ? [0] : [])); }} />
            );
          })}
        </Group>

        <Group title="გალობის გამეორება" hint="იმ დღეს, როცა ნასწავლი ფრაზა გასამეორებელია, ამ საათზე შეგახსენებს.">
          <SwitchRow title="გამეორების შეხსენება" on={!!learnAt} sub={learnAt ? `${learnAt}-ზე` : undefined}
            onChange={async on => { if (await turning(on)) { const v = on ? REMIND_TIMES[0] : ''; setRemindTime(v); setLearnAt(v); } }} />
          {learnAt && (
            <div className="px-3.5 py-2.5 flex flex-wrap gap-1.5" role="radiogroup" aria-label="საათი">
              {REMIND_TIMES.map(t => (
                <button key={t} type="button" role="radio" aria-checked={learnAt === t} onClick={() => { triggerHaptic(8); setRemindTime(t); setLearnAt(t); }}
                  className={`h-10 px-3.5 rounded-full text-[13px] font-bold tabular-nums cursor-pointer transition ${learnAt === t ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-[#fbf6ec] ring-1 ring-[#e8dcc8] text-[#4a3426] hover:ring-[#7a2028]/40'}`}>
                  {t}
                </button>
              ))}
            </div>
          )}
        </Group>
      </div>
    </Sheet>
  );
};

/** The profile's row: how many reminders are on, a tap opens the window. */
export const RemindersCard: React.FC = () => {
  const { user } = useAuth();
  const hours = useReminders();
  const mine = useMyHabits(user?.uid);
  const [open, setOpen] = useState(false);
  const [learnOn, setLearnOn] = useState(() => !!getRemindTime());
  useEffect(() => { if (!open) setLearnOn(!!getRemindTime()); }, [open]);
  const n = Object.values(hours).filter(a => a.length).length
    + mine.groups.flatMap(g => g.items).filter(h => h.time?.from && h.alerts?.length).length
    + (learnOn ? 1 : 0);
  return (
    <>
      <button type="button" onClick={() => { triggerHaptic(10); setOpen(true); }}
        className="w-full rounded-2xl bg-white ring-1 ring-[#2a2017]/[0.07] shadow-[0_1px_2px_rgba(42,32,23,0.05),0_10px_28px_-18px_rgba(42,32,23,0.35)] px-4 py-3 flex items-center gap-3.5 text-left cursor-pointer transition hover:ring-[#7a2028]/25 active:scale-[0.99]">
        <span aria-hidden className={`w-11 h-11 shrink-0 rounded-2xl ring-1 flex items-center justify-center ${n ? 'bg-[#7a2028] ring-[#7a2028] text-[#fbf6ec]' : 'bg-[#7a2028]/[0.07] ring-[#7a2028]/10 text-[#7a2028]'}`}>
          <Bell className="w-5 h-5" strokeWidth={1.9} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-serif-ge text-[15px] font-bold text-[#4a3426]">შეხსენებები</span>
          <span className="block text-[13px] text-[#8a7a6a] leading-snug">
            {n ? `ჩართულია ${n} · ლოცვის საათები, ჩვევები, გამეორება` : 'ლოცვის საათები, ჩვევები, გამეორება — ერთ ადგილას'}
          </span>
        </span>
        <ChevronRight className="w-5 h-5 shrink-0 text-[#a08a76]" />
      </button>
      {open && <RemindersSheet onClose={() => setOpen(false)} />}
    </>
  );
};
