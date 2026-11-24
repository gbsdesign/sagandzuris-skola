import React, { useState } from 'react';
import { Moon, PhoneCall, Sun } from 'lucide-react';
import { useNavigation } from '../../../context';
import { Button, Note, Rows, SectionLabel, Sheet, TopBar } from '../../../components/ui2';
import { NotifyPrefs, useNotifyPrefs } from '../../../utils/notifyPrefs';
import { RemindersPart } from '../propili/Reminders';
import { SwitchLine, TimeInput } from './parts';
import { CallsHere } from './CallsHere';

// „შეტყობინებები“ — the ONE page of everything the phone tells (settings mapItem `notify`; the old `reminders` opens it
// too; the user's pick of 2026-11-20: the rows „შეხსენებები“ and „შეტყობინებები“ were two pages with two switches
// repeated on both). First what reminds (prayer hours, habits, the review — pages/v2/propili/Reminders), then how the
// notices come (board x-ultra-shejameba): the morning summary, the quiet hours and whether a call rings in them. Every
// change is saved at once. The summary's sample stands on the summary's own screen.

export const NotifyScreen: React.FC = () => {
  const { handleGoBack, openMapItem } = useNavigation();
  const { prefs, loaded, save } = useNotifyPrefs();
  return (
    <NotifyView
      prefs={prefs}
      loaded={loaded}
      onChange={p => void save({ ...prefs, ...p })}
      onBack={handleGoBack}
      onSummary={() => openMapItem('notify~summary')}
      calls={<CallsHere />}
      reminders={<RemindersPart hideAsk />}
    />
  );
};

export const NotifyView: React.FC<{
  prefs: NotifyPrefs; loaded: boolean; onChange: (p: Partial<NotifyPrefs>) => void; onBack: () => void; onSummary: () => void;
  /** „ზარები ამ ტელეფონზე“ first (CallsHere) */
  calls?: React.ReactNode;
  /** the reminders' part on top (its own card while the phone may not show notices, then its rows) */
  reminders?: React.ReactNode;
}> = ({ prefs, loaded, onChange: change, onBack, onSummary, calls, reminders }) => {
  const [hours, setHours] = useState(false);
  return (
    <div className="flex flex-col">
      <TopBar title="შეტყობინებები" onBack={onBack} />
      <main className="flex flex-col gap-2 pt-0.5 pb-5">
        {calls}
        {reminders}
        <SectionLabel label="როგორ მოვიდეს" className="mt-2" />
        <Rows aria-busy={!loaded}>
          <SwitchLine
            icon={<Sun />}
            title="დილის შეჯამება"
            sub={`ერთი შეტყობინება ${prefs.at}-ზე`}
            label="დილის შეჯამება"
            on={prefs.summary}
            onChange={on => change({ summary: on })}
            onOpen={() => onSummary()}
          />
          <SwitchLine
            icon={<Moon />}
            title="ჩუმი საათები"
            sub={`${prefs.from} – ${prefs.to}`}
            label="ჩუმი საათები"
            on={prefs.quiet}
            onChange={on => change({ quiet: on })}
            onOpen={() => setHours(true)}
          />
          {prefs.quiet && (
            <SwitchLine
              icon={<PhoneCall />}
              title="ზარი ჩუმ საათებშიც გაივლის"
              label="ზარი ჩუმ საათებშიც"
              on={prefs.calls}
              onChange={on => change({ calls: on })}
              wrap
            />
          )}
        </Rows>
        <Note>სასწრაფო რამ — ზარი და მასწავლებლის განცხადება — მაშინვე მოვა.</Note>
      </main>
      <Sheet open={hours} title="ჩუმი საათები" onClose={() => setHours(false)}>
        <Rows>
          <div className="flex min-h-14 items-center gap-2.5 py-2 pr-3 pl-4">
            <span className="min-w-0 flex-1 text-lead font-bold">დაწყება</span>
            <TimeInput value={prefs.from} onChange={v => change({ from: v })} label="ჩუმი საათების დაწყება" />
          </div>
          <div className="flex min-h-14 items-center gap-2.5 py-2 pr-3 pl-4">
            <span className="min-w-0 flex-1 text-lead font-bold">დასრულება</span>
            <TimeInput value={prefs.to} onChange={v => change({ to: v })} label="ჩუმი საათების დასრულება" />
          </div>
        </Rows>
        <Button onClick={() => setHours(false)}>მზადაა</Button>
      </Sheet>
    </div>
  );
};
