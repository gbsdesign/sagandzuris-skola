import React, { useEffect, useState } from 'react';
import { ArrowRight, CircleCheck, ExternalLink, Info, Play, ScrollText } from 'lucide-react';
import { Button, Check, Dot, Helper, Hero, Note, Num, Press, Row, Rows, Sheet, Small, TopBar, cx } from '../../../components/ui2';
import { useNavigation } from '../../../context';
import { LESSONS, LESSON_SOURCES, type Lesson } from '../../../data/medavitneLessons';
import { triggerHaptic } from '../../../utils/haptics';
import { lessonTakeId } from '../../../utils/dayReadings';
import { Finished, StepV2 } from './Steps';
import { BottomBar, Page } from './parts';

// x-medavitne-kursi — the reader's course: one thing on top (start or go on), the eight lessons on one screen; and
// x-medavitne-gakvetili … -davaleba — a lesson a step at a time: its number of steps under the bar, „შემდეგი“ at the bottom.
// The lessons and their progress are the old page's (data/medavitneLessons.ts, useMedavitneProgress).

export const nextLesson = (done: string[]) => LESSONS.find(l => !done.includes(l.id));

export const CourseScreen: React.FC<{ done: string[]; onAccount: boolean; open: (id: string) => void }> = ({ done, onAccount, open }) => {
  const { handleGoBack } = useNavigation();
  const [sources, setSources] = useState(false);
  const next = nextLesson(done);
  const count = LESSONS.filter(l => done.includes(l.id)).length;
  return (
    <Page>
      <TopBar title="მედავითნის კურსი" onBack={handleGoBack} />
      {next ? (
        <Hero
          kicker={`გაკვეთილი ${LESSONS.indexOf(next) + 1} · ${next.minutes} წუთი`}
          title={next.title}
          sub={`ნასწავლი ${count} / ${LESSONS.length}`}
          action={{ label: count ? 'გაგრძელება' : 'დაწყება', icon: <Play aria-hidden="true" className="fill-current" />, onClick: () => open(next.id) }}
        />
      ) : (
        <Hero kicker={`ნასწავლი ${count} / ${LESSONS.length}`} title="ყველა გაკვეთილი ნასწავლია" sub="ახლა კლიროსზე!" />
      )}
      <Rows aria-label="გაკვეთილები">
        {LESSONS.map((l, i) => {
          const isDone = done.includes(l.id);
          return (
            <Row key={l.id} wrap
              lead={isDone ? <Check on /> : <Num n={i + 1} on={next?.id === l.id} />}
              title={l.title}
              aria-label={`გაკვეთილი ${i + 1}: ${l.title}${isDone ? ' — ნასწავლია' : ''}`}
              right={<Small>{l.minutes} წთ</Small>}
              onClick={() => open(l.id)} />
          );
        })}
      </Rows>
      <Helper icon={<Info />}>ტაძრებში წესი ცოტათი განსხვავდება. რასაც აქ ისწავლი, გადაამოწმე მოძღვართან ან რეგენტთან.</Helper>
      {!onAccount && <Note>ნასწავლი ამ მოწყობილობაზე ინახება.</Note>}
      <Rows>
        <Row lead={<Dot icon={<ScrollText />} color="soft" />} title="წყაროები" sub="საიდან არის ტექსტები" onClick={() => setSources(true)} />
      </Rows>
      <Sheet open={sources} title="წყაროები" onClose={() => setSources(false)}>
        <Note>ლოცვების და ფსალმუნების ტექსტები აპის ლოცვანიდან და დავითნიდანაა.</Note>
        <Rows>
          {LESSON_SOURCES.map(s => (
            <Row key={s.url} title={s.title} wrap href={s.url} target="_blank"
              right={<ExternalLink aria-hidden="true" className="size-4 shrink-0 text-mut" />} />
          ))}
        </Rows>
      </Sheet>
    </Page>
  );
};

/** a step's place: thin lines under the bar, the done ones in wine; a tap goes to that step */
const StepDashes: React.FC<{ total: number; at: number; go: (i: number) => void }> = ({ total, at, go }) => (
  <div role="group" aria-label={`ნაბიჯი ${Math.min(at + 1, total)} / ${total}`} className="-my-2.5 flex shrink-0 gap-1.5">
    {Array.from({ length: total }, (_, i) => (
      <Press key={i} onClick={() => go(i)} aria-label={`ნაბიჯი ${i + 1}`} aria-current={i === at ? 'step' : undefined}
        className="flex h-tap flex-1 cursor-pointer items-center focus-visible:outline-2 focus-visible:outline-wine/60">
        <span className={cx('h-[5px] w-full rounded-full transition-colors', i <= at ? 'bg-wine' : 'bg-track')} />
      </Press>
    ))}
  </div>
);

export const LessonScreen: React.FC<{
  lesson: Lesson; learned: boolean; setLearned: (on: boolean) => void; openNext: (() => void) | null; back: () => void;
}> = ({ lesson, learned, setLearned, openNext, back }) => {
  const { navigateTo } = useNavigation();
  const [at, setAt] = useState(0);
  const total = lesson.steps.length;
  const finished = at >= total;
  const n = LESSONS.indexOf(lesson) + 1;
  useEffect(() => { setAt(0); }, [lesson.id]);
  const go = (i: number) => { triggerHaptic(10); setAt(i); window.scrollTo({ top: 0 }); };
  const last = at === total - 1;
  return (
    <Page>
      <TopBar
        title={`გაკვეთილი ${n}`}
        onBack={() => (at ? go(at - 1) : back())}
        right={<Small className="tabular-nums">{finished ? `${total} / ${total}` : `${at + 1} / ${total}`}</Small>}
      />
      <StepDashes total={total} at={Math.min(at, total - 1)} go={go} />
      <div className="flex flex-col gap-3 pt-2">
        {finished
          ? <Finished learned={learned} onLearned={setLearned} />
          : <StepV2 key={`${lesson.id}-${at}`} step={lesson.steps[at]} onPsalter={() => navigateTo('psalter')} sendId={lessonTakeId(lesson.id, at)} />}
      </div>
      <BottomBar>
        {!finished ? (
          <Button full icon={last ? <CircleCheck aria-hidden="true" /> : <ArrowRight aria-hidden="true" />} onClick={() => go(at + 1)}>
            {last ? 'დასრულება' : 'შემდეგი'}
          </Button>
        ) : openNext ? (
          <Button full icon={<ArrowRight aria-hidden="true" />} onClick={openNext}>შემდეგი გაკვეთილი</Button>
        ) : (
          <Button full kind="ghost" onClick={back}>კურსზე დაბრუნება</Button>
        )}
      </BottomBar>
    </Page>
  );
};
