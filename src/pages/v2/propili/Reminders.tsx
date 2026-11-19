import React, { useState } from 'react';
import { Bell, CheckCheck, Clock, Moon, RefreshCw, Sun } from 'lucide-react';
import { useNavigation } from '../../../context';
import { Button, Card, Chips, Dot, Note, Row, Rows, SectionLabel, Sheet, ToggleRow, TopBar, Two } from '../../../components/ui2';
import { useRemindersState } from '../../../components/app/RemindersCard';
import { hourClock } from '../../../data/prayers';
import { REMIND_TIMES } from '../../../utils/learnReminder';
import { useNotifyPrefs } from '../../../utils/notifyPrefs';
import { SwitchLine } from '../shetkobinebebi/parts';

// x-shekhsenebebi — „შეხსენებები“ (settings mapItem `reminders`): every reminder the phone can give, on one screen. The
// seven prayer hours fold into one row (a tap opens their switches), the habits with a time likewise; the review is one
// switch whose words open its hour. Under „ახალი“ the morning summary and the quiet hours (the notices' settings,
// pages/v2/shetkobinebebi — the words open them whole). A tinted line on top while the phone may not show notices.
// The logic is the old window's (components/app/RemindersCard `useRemindersState`).

type Win = null | 'hours' | 'habits' | 'learn';

export const RemindersScreen: React.FC = () => {
  const { handleGoBack, openMapItem } = useNavigation();
  const r = useRemindersState();
  const { prefs, loaded, save } = useNotifyPrefs();
  const [win, setWin] = useState<Win>(null);
  const close = () => setWin(null);

  const hoursOn = r.prayerHours.filter(h => (r.hours[h.id] || []).length > 0).length;
  const habitsOn = r.timed.filter(h => (h.alerts?.length ?? 0) > 0).length;
  const hoursSub = `${r.prayerHours.length} დრო · ${hoursOn ? `ჩართულია ${hoursOn}` : 'ყველა გამორთულია'}`;
  const habitsSub = !r.timed.length ? 'საათი არცერთს არ აქვს'
    : `${r.timed.length} ჩვევას აქვს საათი · ${habitsOn ? `ჩართულია ${habitsOn}` : 'გამორთულია'}`;

  return (
    <div className="flex flex-col">
      <TopBar title="შეხსენებები" onBack={handleGoBack} />
      <main className="flex flex-col gap-3 pt-0.5 pb-5">
        {r.perm !== 'granted' && (
          <Card pad="none" className="flex items-center gap-3 bg-tint py-3 pr-3 pl-3.5">
            <Dot icon={<Bell />} />
            <Two wrap title="შეტყობინებები გამორთულია" sub={r.note || (r.perm === 'denied'
              ? 'ჩართე ტელეფონის პარამეტრებში — მანამდე შეხსენება მხოლოდ გახსნილ აპში ჩანს'
              : 'შეხსენება მხოლოდ გახსნილ აპში ჩანს')} />
            {r.perm === 'default' && <Button size="md" onClick={() => void r.allow()}>ჩართვა</Button>}
          </Card>
        )}

        <Rows>
          <Row lead={<Dot icon={<Clock />} />} title="შვიდგზის ლოცვა" sub={hoursSub} onClick={() => setWin('hours')} />
          <Row lead={<Dot icon={<CheckCheck />} />} title="ჩვევები" sub={habitsSub} onClick={() => setWin('habits')} />
          <SwitchLine icon={<RefreshCw />} title="გალობის გამეორება" sub={r.learnAt ? `${r.learnAt}-ზე` : undefined}
            label="გალობის გამეორება" on={!!r.learnAt} onChange={on => void r.toggleLearn(on)} onOpen={() => setWin('learn')} />
        </Rows>

        <SectionLabel label="ახალი" className="mt-2" />
        <Rows aria-busy={!loaded}>
          <SwitchLine icon={<Sun />} title="დილის შეჯამება" sub={`ერთი შეტყობინება ${prefs.at}-ზე`} label="დილის შეჯამება"
            on={prefs.summary} onChange={on => void save({ ...prefs, summary: on })} onOpen={() => openMapItem('notify~summary')} />
          <SwitchLine icon={<Moon />} title="ჩუმი საათები" sub={`${prefs.from} – ${prefs.to}`} label="ჩუმი საათები"
            on={prefs.quiet} onChange={on => void save({ ...prefs, quiet: on })} onOpen={() => openMapItem('notify')} />
        </Rows>
      </main>

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
    </div>
  );
};
