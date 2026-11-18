import React from 'react';
import { BarChart3, ChevronRight, Play } from 'lucide-react';
import { useAuth } from '../../context';
import { useViewing } from '../../context/AuthContext';
import { useAccess } from '../../hooks/useAccess';
import { Hero, Press, Row, Rows, cx } from '../ui2';
import { openAiLesson, openMyVoice } from './open';
import { useAiNote } from './useAiNote';
import { tenOf, weekBars } from '../../utils/aiPlan';

// The ways into the AI teacher's day lesson: one wine line at the top of „საგანძურის გზა“ (the canvas's gza) and the
// card on top of „ოსტატობა“ (ostatoba). Shown while the switch „AI მასწავლებელი“ allows (admins first), for a member's
// own page only — never on a student's page a teacher opened.

const useLessonShown = () => {
  const { user } = useAuth();
  const access = useAccess();
  const viewing = useViewing();
  return !!user && !viewing && access.on('aiTeacher');
};

/** „დღის გაკვეთილი · 10 წუთი — AI მასწავლებელთან“, one line */
export const TodayLessonStrip: React.FC<{ className?: string }> = ({ className }) => {
  if (!useLessonShown()) return null;
  return (
    <Press onClick={openAiLesson} className={cx(
      'flex h-[76px] w-full shrink-0 items-center gap-3.5 rounded-card bg-wine pr-3.5 pl-4 text-left text-white cursor-pointer transition active:scale-[0.99]',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine/60', className,
    )}>
      <span aria-hidden="true" className="flex size-tap shrink-0 items-center justify-center rounded-full bg-white text-wine [&_svg]:size-[18px]">
        <Play fill="currentColor" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-lead font-bold">დღის გაკვეთილი · 10 წუთი</span>
        <span className="block truncate text-meta text-white/85">AI მასწავლებელთან</span>
      </span>
      <ChevronRight aria-hidden="true" className="size-[18px] shrink-0" />
    </Press>
  );
};

/** The card on top of „ოსტატობა“ */
export const TodayLessonHero: React.FC<{ className?: string }> = ({ className }) => {
  if (!useLessonShown()) return null;
  return (
    <Hero className={className} kicker="დღის გაკვეთილი · 10 წუთი" title="AI მასწავლებელთან" sub="გახურება · გამეორება · ახალი ფრაზა · გალობა"
      action={{ label: 'დაიწყე', icon: <Play fill="currentColor" />, onClick: openAiLesson }} />
  );
};

/** „ჩემი ხმა“ under the card of „ოსტატობა“: the AI teacher's diary, the voice's range and its notebook */
export const MyVoiceLink: React.FC<{ className?: string }> = ({ className }) => {
  const shown = useLessonShown();
  const ai = useAiNote();
  if (!shown) return null;
  const week = weekBars(ai.note?.takes, ai.today, 1)[0];
  const sub = week?.tries ? `ამ კვირას: 10 ნოტიდან ${tenOf(week.share)} ზუსტად` : 'დღიური · ხმის ზომა · AI-ს რვეული';
  return (
    <Rows className={className}>
      <Row lead={<BarChart3 />} title="ჩემი ხმა" sub={sub} onClick={() => openMyVoice('diary')} />
    </Rows>
  );
};
