import React, { useState } from 'react';
import { BellOff, Moon, PhoneCall, Sun } from 'lucide-react';
import { useAuth, useNavigation } from '../../../context';
import { Button, Helper, Note, Rows, SectionLabel, Sheet, TopBar } from '../../../components/ui2';
import { NotifyPrefs, useNotifyPrefs } from '../../../utils/notifyPrefs';
import { SampleCard, SwitchLine, TimeInput } from './parts';

// „შეტყობინებები“ (board x-ultra-shejameba): a sample of the morning summary, then how the notices come — the summary,
// the quiet hours and whether a call rings in them. Every change is saved at once.

const bound = (): boolean => typeof Notification !== 'undefined' && Notification.permission === 'granted';

export const NotifyScreen: React.FC = () => {
  const { handleGoBack, openMapItem } = useNavigation();
  const { user } = useAuth();
  const { prefs, loaded, save } = useNotifyPrefs();
  // the phone has no leave to show notices (or none was asked yet): the settings would change nothing there
  return (
    <NotifyView
      prefs={prefs}
      loaded={loaded}
      onChange={p => void save({ ...prefs, ...p })}
      onBack={handleGoBack}
      onSummary={() => openMapItem('notify~summary')}
      silent={!!user && !bound()}
    />
  );
};

export const NotifyView: React.FC<{
  prefs: NotifyPrefs; loaded: boolean; onChange: (p: Partial<NotifyPrefs>) => void; onBack: () => void; onSummary: () => void; silent: boolean;
}> = ({ prefs, loaded, onChange: change, onBack, onSummary, silent }) => {
  const [hours, setHours] = useState(false);
  return (
    <div className="flex flex-col">
      <TopBar title="შეტყობინებები" onBack={onBack} />
      <main className="flex flex-col gap-2 pt-0.5 pb-5">
        <SampleCard />
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
        {silent && (
          <Helper icon={<BellOff />}>ამ ტელეფონზე შეტყობინებები ჯერ არ არის ჩართული — ჩართე ტელეფონის პარამეტრებში.</Helper>
        )}
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
