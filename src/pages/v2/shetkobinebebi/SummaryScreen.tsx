import React, { useState } from 'react';
import { Calendar, Clock, Gift, MessageCircle, RefreshCw } from 'lucide-react';
import { useNavigation } from '../../../context';
import { Dot, Note, Row, Rows, SectionLabel, Sheet, TopBar, Val, WrapChips } from '../../../components/ui2';
import { NotifyItems, NotifyPrefs, useNotifyPrefs } from '../../../utils/notifyPrefs';
import { SampleCard, SwitchLine } from './parts';

// „დილის შეჯამება“ (board x-ultra-shejameba-3): a sample of the summary, the hour, and what goes into it. Saved at once.

const HOURS = Array.from({ length: 13 }, (_, i) => {
  const m = 6 * 60 + i * 30;
  const t = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  return { id: t, label: t };
});

const ITEMS: { id: keyof NotifyItems; title: string; icon: React.ReactNode }[] = [
  { id: 'lesson', title: 'კლასის გაკვეთილი', icon: <Calendar /> },
  { id: 'chat', title: 'ახალი წერილები', icon: <MessageCircle /> },
  { id: 'day', title: 'დღის გაკვეთილი', icon: <RefreshCw /> },
  { id: 'birthdays', title: 'დაბადების დღეები', icon: <Gift /> },
  { id: 'feast', title: 'დღესასწაული', icon: <Calendar /> },
];

export const SummaryScreen: React.FC = () => {
  const { handleGoBack } = useNavigation();
  const { prefs, loaded, save } = useNotifyPrefs();
  return <SummaryView prefs={prefs} loaded={loaded} onSave={p => save(p)} onBack={handleGoBack} />;
};

export const SummaryView: React.FC<{ prefs: NotifyPrefs; loaded: boolean; onSave: (p: NotifyPrefs) => void; onBack: () => void }> = ({ prefs, loaded, onSave, onBack }) => {
  const [pick, setPick] = useState(false);
  const save = async (p: NotifyPrefs) => onSave(p);

  return (
    <div className="flex flex-col">
      <TopBar title="დილის შეჯამება" onBack={onBack} />
      <main className="flex flex-col gap-2 pt-0.5 pb-5">
        {/* what comes, as the phone shows it (made-up words) — it stood on „შეტყობინებები“ until that page took the reminders in */}
        <SampleCard />
        <Rows aria-busy={!loaded} className="mt-2">
          <Row lead={<Dot icon={<Clock />} />} title="რომელ საათზე" right={<Val tone="mut">{prefs.at}</Val>} onClick={() => setPick(true)} />
        </Rows>
        <SectionLabel label="რა შევიდეს" className="mt-2" />
        <Rows>
          {ITEMS.map(it => (
            <SwitchLine
              key={it.id}
              icon={it.icon}
              title={it.title}
              label={it.title}
              on={prefs.items[it.id]}
              onChange={on => save({ ...prefs, items: { ...prefs.items, [it.id]: on } })}
            />
          ))}
        </Rows>
        <Note>თუ დღეს არცერთი არ არის, შეჯამება არ მოდის.</Note>
      </main>
      <Sheet open={pick} title="რომელ საათზე" onClose={() => setPick(false)}>
        <WrapChips
          label="საათი"
          items={HOURS}
          value={[prefs.at]}
          onChange={next => {
            const t = next.find(x => x !== prefs.at);
            if (t) { save({ ...prefs, at: t }); setPick(false); }
          }}
        />
      </Sheet>
    </div>
  );
};
