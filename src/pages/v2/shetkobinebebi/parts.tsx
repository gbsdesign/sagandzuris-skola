import React from 'react';
import { Dot, Press, Toggle, Two, cx } from '../../../components/ui2';
import defaultLogo from '../../../assets/images/user_provided_logo_1790330250486.jpg';

// Small parts of the notice settings screens (boards x-ultra-shejameba, -3).

/** a row of a card: the mark and the words open something, the switch at the end turns the setting on or off */
export const SwitchLine: React.FC<{
  icon: React.ReactNode;
  title: React.ReactNode;
  sub?: React.ReactNode;
  on: boolean;
  onChange: (on: boolean) => void;
  /** the words' own tap (opens a deeper screen); without it the whole line turns the switch */
  onOpen?: () => void;
  wrap?: boolean;
  label: string;
}> = ({ icon, title, sub, on, onChange, onOpen, wrap, label }) => {
  if (!onOpen) {
    return (
      <Press
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className="flex min-h-14 w-full cursor-pointer items-center gap-2.5 py-2 pr-3 pl-4 text-left text-ink transition-colors active:bg-soft"
      >
        <Dot icon={icon} />
        <Two title={title} sub={sub} wrap={wrap} />
        <Toggle on={on} onChange={onChange} label={label} className="pointer-events-none" />
      </Press>
    );
  }
  return (
    <div className={cx('flex w-full items-center pr-3 text-ink', sub ? 'min-h-row' : 'min-h-14')}>
      <Press onClick={onOpen} className="flex min-h-14 min-w-0 flex-1 cursor-pointer items-center gap-2.5 py-2 pl-4 text-left transition-colors active:bg-soft">
        <Dot icon={icon} />
        <Two title={title} sub={sub} wrap={wrap} />
      </Press>
      <Toggle on={on} onChange={onChange} label={label} />
    </div>
  );
};

/** the summary as the phone shows it — made-up words, only to show what comes */
export const SampleCard: React.FC = () => (
  <div className="flex shrink-0 flex-col gap-2 rounded-card bg-surf p-4" aria-label="ასე გამოჩნდება შეჯამება">
    <div className="flex items-center gap-2.5">
      <img src={defaultLogo} alt="" aria-hidden="true" className="size-6 shrink-0 rounded-chip object-cover" />
      <span className="min-w-0 flex-1 truncate text-meta font-semibold text-mut">საგანძურის სკოლა</span>
      <span className="shrink-0 text-meta text-mut tabular-nums">09:00</span>
    </div>
    <div className="text-lead font-bold">დილის შეჯამება</div>
    <ul className="flex flex-col gap-1.5 text-body">
      {['გაკვეთილი დღეს 18:00 · სამების ტაძარი', '3 ახალი წერილი კლასის ჩატში', 'გასამეორებელი: 2 საგალობელი'].map(t => (
        <li key={t} className="flex gap-2">
          <span aria-hidden="true" className="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-wine" />
          <span className="min-w-0 wrap-break-word">{t}</span>
        </li>
      ))}
    </ul>
  </div>
);

/** a time of day in a roomy pill, the phone's own picker */
export const TimeInput: React.FC<{ value: string; onChange: (v: string) => void; label: string }> = ({ value, onChange, label }) => (
  <input
    type="time"
    aria-label={label}
    value={value}
    onChange={e => { if (e.target.value) onChange(e.target.value); }}
    className="h-tap w-32 shrink-0 rounded-full bg-page px-4 text-center text-lead font-semibold text-ink tabular-nums outline-none focus-visible:outline-2 focus-visible:outline-wine/60 [&::-webkit-calendar-picker-indicator]:hidden"
  />
);
