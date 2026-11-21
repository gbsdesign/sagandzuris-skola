import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { BEFORE_OPTIONS, GOAL_OPTIONS, MINUTE_OPTIONS, type Before, type Goal, type Minutes } from '../../utils/aiPlan';
import { Button, SectionLabel, TopBar, WrapChips, type ChipItem } from '../ui2';
import { Bottom, TeacherSays } from './parts';

// „გაცნობა“ (the AI teacher's step 2, board ai-gacnoba): three questions, three taps — sung before, minutes a day, the
// goal. The answers make the plan (utils/aiPlan.ts); nothing is saved here, the caller keeps `onDone`'s value. On top it
// always says that the teacher is a program, not a person.

export interface IntroAnswers { before?: Before; minutes?: Minutes; goal?: Goal }

const SAY = 'გამარჯობა! მე ავტომატური სასწავლო პროგრამა ვარ. გალობას ნაბიჯ-ნაბიჯ გასწავლი. ჯერ სამი რამ მითხარი.';

const BEFORE_ITEMS: ChipItem<Before>[] = BEFORE_OPTIONS.map(o => ({ id: o.id, label: o.label }));
const MINUTE_ITEMS: ChipItem<`${Minutes}`>[] = MINUTE_OPTIONS.map(m => ({ id: `${m}`, label: `${m}` }));
const GOAL_ITEMS: ChipItem<Goal>[] = GOAL_OPTIONS.map(o => ({ id: o.id, label: o.label }));

/** one answer out of pills that wrap onto more lines (the kit's WrapChips, kept to a single choice) */
const OneOf = <T extends string>({ label, items, value, onPick }: {
  label: string; items: ChipItem<T>[]; value: T | undefined; onPick: (v: T) => void;
}): React.ReactElement => (
  <>
    <SectionLabel label={label} />
    <WrapChips label={label} items={items} value={value ? [value] : []} className="-my-0.5"
      onChange={next => { const v = next.find(x => x !== value); if (v) onPick(v); }} />
  </>
);

export const IntroView: React.FC<{
  value: IntroAnswers;
  onChange: (v: IntroAnswers) => void;
  onBack: () => void;
  onNext: () => void;
}> = ({ value, onChange, onBack, onNext }) => {
  const ready = !!value.before && !!value.minutes && !!value.goal;
  return (
    <>
      <TopBar title="გაცნობა" sub="ავტომატური სასწავლო პროგრამა" onBack={onBack} className="px-4" />
      <div className="flex flex-col gap-3 px-4 pt-0.5 pb-4">
        <TeacherSays text={SAY} sub="პროგრამა ვარ, არა ადამიანი">{SAY}</TeacherSays>
        <OneOf label="გიგალობია ადრე?" items={BEFORE_ITEMS} value={value.before} onPick={before => onChange({ ...value, before })} />
        <OneOf label="რამდენი წუთი გაქვს დღეში?" items={MINUTE_ITEMS} value={value.minutes ? `${value.minutes}` : undefined}
          onPick={m => onChange({ ...value, minutes: Number(m) as Minutes })} />
        <OneOf label="რა გინდა?" items={GOAL_ITEMS} value={value.goal} onPick={goal => onChange({ ...value, goal })} />
      </div>
      <Bottom>
        <Button full icon={<ChevronRight />} disabled={!ready} onClick={onNext}>გაგრძელება</Button>
      </Bottom>
    </>
  );
};

/** The introduction with its answers kept here; `start` holds the old answers when the member comes back to change them. */
export const Intro: React.FC<{
  start?: IntroAnswers;
  onBack: () => void;
  onDone: (a: { before: Before; minutes: Minutes; goal: Goal }) => void;
}> = ({ start, onBack, onDone }) => {
  const [value, setValue] = useState<IntroAnswers>(() => ({ ...start }));
  const next = () => {
    const { before, minutes, goal } = value;
    if (before && minutes && goal) onDone({ before, minutes, goal });
  };
  return <IntroView value={value} onChange={setValue} onBack={onBack} onNext={next} />;
};
