import React, { useState } from 'react';
import { Bell, CheckCheck, Clock, RefreshCw } from 'lucide-react';
import { Button, Card, Chips, Dot, Note, Row, Rows, SectionLabel, Sheet, ToggleRow, Two } from '../../../components/ui2';
import { useRemindersState } from '../../../components/app/RemindersCard';
import { hourClock } from '../../../data/prayers';
import { REMIND_TIMES } from '../../../utils/learnReminder';
import { SwitchLine } from '../shetkobinebebi/parts';

// x-shekhsenebebi — the reminders' part of the one page „შეტყობინებები“ (settings mapItem `notify`; the old `reminders`
// opens the same page — pages/v2/shetkobinebebi/NotifyScreen): every reminder the phone can give. The seven prayer hours
// fold into one row (a tap opens their switches), the habits with a time likewise; the review is one switch whose words
// open its hour. A tinted line on top while the phone may not show notices. The morning summary and the quiet hours
// stand under it on that page — once, not here too (the user's pick of 2026-11-20: one page, no switch twice).
// The logic is the old window's (components/app/RemindersCard `useRemindersState`).

type Win = null | 'hours' | 'habits' | 'learn';

/** `hideAsk`: the page has its own „ჩართვა“ for this phone (shetkobinebebi/CallsHere), so the permission card stays out */
export const RemindersPart: React.FC<{ hideAsk?: boolean }> = ({ hideAsk }) => {
  const r = useRemindersState();
  const [win, setWin] = useState<Win>(null);
  const close = () => setWin(null);

  const hoursOn = r.prayerHours.filter(h => (r.hours[h.id] || []).length > 0).length;
  const habitsOn = r.timed.filter(h => (h.alerts?.length ?? 0) > 0).length;
  const hoursSub = `${r.prayerHours.length} დრო · ${hoursOn ? `ჩართულია ${hoursOn}` : 'ყველა გამორთულია'}`;
  const habitsSub = !r.timed.length ? 'საათი არცერთს არ აქვს'
    : `${r.timed.length} ჩვევას აქვს საათი · ${habitsOn ? `ჩართულია ${habitsOn}` : 'გამორთულია'}`;

  return (
    <>
      {r.perm !== 'granted' && !hideAsk && (
        <Card pad="none" className="flex items-center gap-3 bg-tint py-3 pr-3 pl-3.5">
          <Dot icon={<Bell />} />
          <Two wrap title="შეტყობინებები გამორთულია" sub={r.note || (r.perm === 'denied'
            ? 'ჩართე ტელეფონის პარამეტრებში — მანამდე შეხსენება მხოლოდ გახსნილ აპში ჩანს'
            : 'შეხსენება მხოლოდ გახსნილ აპში ჩანს')} />
          {r.perm === 'default' && <Button size="md" onClick={() => void r.allow()}>ჩართვა</Button>}
        </Card>
      )}

      <SectionLabel label="შეხსენებები" className="mt-2" />
      <Rows>
        <Row lead={<Dot icon={<Clock />} />} title="შვიდგზის ლოცვა" sub={hoursSub} onClick={() => setWin('hours')} />
        <Row lead={<Dot icon={<CheckCheck />} />} title="ჩვევები" sub={habitsSub} onClick={() => setWin('habits')} />
        <SwitchLine icon={<RefreshCw />} title="გალობის გამეორება" sub={r.learnAt ? `${r.learnAt}-ზე` : undefined}
          label="გალობის გამეორება" on={!!r.learnAt} onChange={on => void r.toggleLearn(on)} onOpen={() => setWin('learn')} />
      </Rows>

      <Sheet open={win === 'hours'} title="შვიდგზის ლოცვა" onClose={close}>
        <Rows>
          {r.prayerHours.map(h => {
            const active = r.hours[h.id] || [];
            return (
              <ToggleRow key={h.id} title={`${hourClock(h)} · ${h.label}`} on={active.length > 0}
                sub={active.length ? `${[...active].sort((a, b) => b - a).join(', ')} წუთით ადრე` : undefined}
                onChange={on => void r.toggleHour(h.id, on)} />
            );
          })}
        </Rows>
        <Note>შეხსენება 5 წუთით ადრე მოდის; წუთების შეცვლა ლოცვის გვერდზე შეიძლება.</Note>
        <Button full onClick={close} className="mt-2">მზადაა</Button>
      </Sheet>

      <Sheet open={win === 'habits'} title="ჩვევები" onClose={close}>
        {r.timed.length === 0 ? (
          <Note>ჯერ არცერთ ჩვევას არ აქვს საათი. ჩვევის ✎-ში დააყენე და შეხსენება აქ გამოჩნდება.</Note>
        ) : (
          <>
            <Rows>
              {r.timed.map(h => {
                const on = (h.alerts?.length ?? 0) > 0;
                return (
                  <ToggleRow key={h.id} title={h.label} on={on}
                    sub={`${h.time!.from}${on ? ` · ${h.alerts!.map(a => (a === 0 ? 'ზუსტად დროზე' : `${a} წთ ადრე`)).join(', ')}` : ''}`}
                    onChange={next => void r.toggleHabit(h.id, next)} />
                );
              })}
            </Rows>
            {r.untimed > 0 && <Note>კიდევ {r.untimed} ჩვევას დრო არ აქვს — ჩვევის ✎-ში დააყენე და აქაც გამოჩნდება.</Note>}
          </>
        )}
        <Button full onClick={close} className="mt-2">მზადაა</Button>
      </Sheet>

      <Sheet open={win === 'learn'} title="გალობის გამეორება" onClose={close}>
        <Note>იმ დღეს, როცა ნასწავლი ფრაზა გასამეორებელია, ამ საათზე შეგახსენებს.</Note>
        <Chips label="საათი" items={REMIND_TIMES.map(t => ({ id: t, label: t }))} value={r.learnAt}
          onChange={t => void r.pickLearn(t)} />
        {r.learnAt && <Button full kind="quiet" onClick={() => { void r.toggleLearn(false); close(); }}>გამორთვა</Button>}
        <Button full onClick={close} className="mt-2">მზადაა</Button>
      </Sheet>
    </>
  );
};
