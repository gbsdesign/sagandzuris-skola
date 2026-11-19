import React from 'react';
import { Check, ChevronRight, ExternalLink, IdCard, Play, TriangleAlert } from 'lucide-react';
import { Bar, Button, Duo, Hero, Press, SectionLabel, Small, TopBar, cx, FOCUS_IN } from '../../../components/ui2';
import { OfflineButton } from '../../../components/offline/OfflineButton';
import { useNavigation } from '../../../context';
import { DOCUMENTS, UNIVERSITY_PAGE } from '../../../data/abituriProgram';
import type { AbituriProgressApi, AbituriWho } from '../../../hooks/useAbituriProgress';
import { examStates, nextStep, type ExamId } from '../../../utils/abituriPrep';
import { triggerHaptic } from '../../../utils/haptics';
import { myPieces } from '../../abituri/MyPrep';
import { useLessons } from '../../abituri/shared';
import { EXAMS, Page } from './parts';

// x-abituri — „აბიტურიენტს“'s first screen in the new look: one main thing on top (the next step, the old „ჩემი
// მომზადება“'s button), then the four parts once — a row each with where I am — and the yearly-rules line. The old page
// showed the parts twice (the card's list and the 2×2 tabs). The rules are utils/abituriPrep.ts (examStates, nextStep).

/** the step's words: „ისწავლე: მხოლოდშობილო“ → the verb for the button and the thing as the title */
const splitStep = (label: string) => {
  const at = label.indexOf(': ');
  return at > 0 ? { verb: label.slice(0, at), what: label.slice(at + 2) } : { verb: 'დაწყება', what: label };
};

const WhoHero: React.FC<{ onPick: (who: AbituriWho) => void }> = ({ onPick }) => (
  <Hero kicker="I გამოცდა · სიმღერა" title="რომელი სიმღერები ისწავლო?" sub="ვაჟებსა და გოგონებს სხვადასხვა პროგრამა აქვთ">
    <Duo className="mt-3">
      {([['boys', 'ვაჟების'], ['girls', 'გოგონების']] as [AbituriWho, string][]).map(([id, label]) => (
        <Button key={id} kind="ghost" size="md" onClick={() => onPick(id)}>{label}</Button>
      ))}
    </Duo>
  </Hero>
);

export const Front: React.FC<{ api: AbituriProgressApi; go: (tab: ExamId, at?: string) => void }> = ({ api, go }) => {
  const { handleGoBack } = useNavigation();
  const { progress } = api;
  const { lessons } = useLessons();
  const input = { progress, pieces: myPieces(progress.who), lessons, docsCount: DOCUMENTS.length };
  const states = examStates(input);
  const step = nextStep(input);
  const overall = Math.round((states.reduce((n, s) => n + s.share, 0) / states.length) * 100);
  const { verb, what } = splitStep(step.label);
  const stepExam = EXAMS.find(e => e.id === step.tab);

  return (
    <Page>
      <TopBar title="აბიტურიენტს" onBack={handleGoBack} right={<OfflineButton kind="abituri" />} />

      {progress.who ? (
        <Hero
          kicker={`შემდეგი ნაბიჯი · ${stepExam?.step ?? ''}`}
          title={what}
          action={{ label: verb, icon: <Play aria-hidden="true" className="fill-current" />, onClick: () => go(step.tab, step.id) }}
        />
      ) : <WhoHero onPick={who => { triggerHaptic(10); api.setWho(who); }} />}

      <SectionLabel label="ჩემი მომზადება" right={overall > 0 ? <Small className="tabular-nums">{overall}%</Small> : undefined} />
      <ol aria-label="ჩემი მომზადება" className="flex shrink-0 flex-col divide-y divide-line overflow-hidden rounded-card bg-surf">
        {EXAMS.map((ex, i) => {
          const st = states[i];
          return (
            <li key={ex.id}>
              <Press
                onClick={() => go(ex.id)}
                aria-label={`${ex.step}: ${ex.title} — ${st.note}${st.done ? ', მზადაა' : ''}`}
                className={cx('flex min-h-[76px] w-full cursor-pointer items-center gap-3 py-2.5 pr-3 pl-4 text-left text-ink transition-colors active:bg-soft', FOCUS_IN)}
              >
                <span aria-hidden="true" className={cx(
                  'flex size-10 shrink-0 items-center justify-center rounded-full text-body font-bold [&_svg]:size-[18px]',
                  st.done ? 'bg-leaf text-white' : 'bg-tint text-wine',
                )}>
                  {st.done ? <Check /> : ex.mark || <IdCard />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="sg-fit truncate text-lead font-bold">{ex.title}</span>
                  <span className="sg-fit truncate text-meta text-mut">{st.note}</span>
                  <Bar value={st.share} tone={st.done ? 'leaf' : 'wine'} h={5} className="mt-1" />
                </span>
                <ChevronRight aria-hidden="true" className="size-[18px] shrink-0 text-mut" strokeWidth={2} />
              </Press>
            </li>
          );
        })}
      </ol>

      <a
        href={UNIVERSITY_PAGE}
        target="_blank"
        rel="noopener noreferrer"
        className={cx('flex min-h-tap shrink-0 items-center gap-2.5 rounded-tile px-1.5 py-1 text-meta', FOCUS_IN)}
      >
        <TriangleAlert aria-hidden="true" className="size-4 shrink-0 text-mut" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-mut">წესები ყოველ წელს იცვლება</span>
          <span className="font-bold text-wine">უნივერსიტეტის გვერდი</span>
        </span>
        <ExternalLink aria-hidden="true" className="size-4 shrink-0 text-wine" />
      </a>
    </Page>
  );
};
