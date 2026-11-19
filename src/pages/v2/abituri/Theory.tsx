import React, { useState } from 'react';
import { ArrowRight, Check as CheckIcon, ClipboardCheck, Dumbbell, Ellipsis, FileText, Play } from 'lucide-react';
import { Button, Card, Check, Dot, Hero, Note, Num, Row, Rows, SectionLabel, Sheet, RoundButton, TopBar } from '../../../components/ui2';
import { useNavigation } from '../../../context';
import { OFFICIAL_PDFS, THEORY_TOPICS } from '../../../data/abituriProgram';
import type { Lesson } from '../../../data/abituriLessons';
import type { AbituriProgressApi } from '../../../hooks/useAbituriProgress';
import { PRACTICE_GOAL, lastTest, solvedOf } from '../../../utils/abituriPrep';
import type { TaskKind } from '../../../utils/theoryDrills';
import { LessonBody } from '../../abituri/LessonBody';
import { DRILLS, Trainer } from '../../abituri/drills/Trainer';
import { MockTest } from '../../abituri/drills/MockTest';
import { useLessons } from '../../abituri/shared';
import { Page, Waiting } from './parts';

// x-teoria — the II exam in the new look: one main button (the next lesson) and the lessons as a list; „ვარჯიში“ and
// „საცდელი ტესტი“ are two lines under them, „რა არის ტესტში — 7 დავალება და ნიმუშები“ moved into „⋯“. A lesson, the trainer
// and the mock test are screens of their own (`mapItem` „theory/<lesson id>“, „theory/trainer[/<kind>]“, „theory/mock“);
// their bodies are the old tab's (pages/abituri/LessonBody.tsx, drills/Trainer.tsx, drills/MockTest.tsx).

// a lesson's own practice: the test's task, or listening for the dictation
const drillOf = (l: Lesson): TaskKind | null => (l.task ? DRILLS[l.task - 1].kind : l.id === 'karnaxi' ? 'dictation' : null);

/** „⋯“: the test's seven tasks (each opens its lesson) and the university's samples */
const TestSheet: React.FC<{ open: boolean; lessons: Lesson[] | null; onLesson: (id: string) => void; onClose: () => void }> = ({
  open, lessons, onLesson, onClose,
}) => {
  const byTask = (task: number) => lessons?.find(l => l.task === task);
  return (
    <Sheet open={open} title="რა არის ტესტში" onClose={onClose}>
      <Note>ტესტი „მუსიკალური ანბანი“ — 7 დავალება, 32 ქულა; მერე კარნახი.</Note>
      <Rows aria-label="ტესტის დავალებები">
        {THEORY_TOPICS.map((t, i) => {
          const l = byTask(i + 1);
          return l
            ? <Row key={t} lead={<Num n={i + 1} />} title={t} wrap onClick={() => { onClose(); onLesson(l.id); }} />
            : <Row key={t} lead={<Num n={i + 1} />} title={t} wrap />;
        })}
      </Rows>
      <Rows>
        <Row lead={<Dot icon={<FileText />} />} title="ტესტის ნიმუში" sub="უნივერსიტეტის PDF" href={OFFICIAL_PDFS.theoryTest} target="_blank" />
        <Row lead={<Dot icon={<FileText />} />} title="კარნახის ნიმუში" sub="უნივერსიტეტის PDF" href={OFFICIAL_PDFS.dictation} target="_blank" />
      </Rows>
    </Sheet>
  );
};

export const TheoryScreen: React.FC<{ api: AbituriProgressApi }> = ({ api }) => {
  const { handleGoBack, openMapItem } = useNavigation();
  const { lessons, failed } = useLessons();
  const [more, setMore] = useState(false);
  const done = api.progress.lessons;
  const lessonsDone = lessons ? lessons.filter(l => done.includes(l.id)).length : 0;
  const next = lessons?.find(l => !done.includes(l.id)) ?? null;
  const solved = Math.min(solvedOf(api.progress), PRACTICE_GOAL);
  const test = lastTest(api.progress);
  const open = (id: string) => openMapItem(`theory/${id}`);

  return (
    <Page>
      <TopBar
        title="თეორია"
        sub="II გამოცდა · ტესტი და კარნახი"
        onBack={handleGoBack}
        right={<RoundButton label="მეტი" onClick={() => setMore(true)}><Ellipsis aria-hidden="true" strokeWidth={1.75} /></RoundButton>}
      />
      {lessons && (next ? (
        <Hero
          kicker={`გაკვეთილი ${lessons.indexOf(next) + 1} / ${lessons.length}`}
          title={next.title}
          sub={`ვარჯიში ${solved} / ${PRACTICE_GOAL}${test ? ` · ტესტი ${test.score} / ${test.max}` : ''}`}
          action={{ label: lessonsDone ? 'გააგრძელე' : 'დაიწყე', icon: <Play aria-hidden="true" className="fill-current" />, onClick: () => open(next.id) }}
        />
      ) : (
        <Hero
          kicker={`გაკვეთილი ${lessons.length} / ${lessons.length}`}
          title="ყველა გაკვეთილი გავლილია"
          sub={`ვარჯიში ${solved} / ${PRACTICE_GOAL}${test ? ` · ტესტი ${test.score} / ${test.max}` : ''}`}
          action={{ label: 'ივარჯიშე', icon: <Dumbbell aria-hidden="true" />, onClick: () => open('trainer') }}
        />
      ))}

      <SectionLabel label="გაკვეთილები" />
      {!lessons ? <Waiting failed={failed} /> : (
        <Rows aria-label="გაკვეთილები">
          {lessons.map((l, i) => {
            const isDone = done.includes(l.id);
            return (
              <Row key={l.id} wrap
                lead={isDone ? <Check on /> : <Num n={i + 1} on={next?.id === l.id} />}
                title={l.title}
                aria-label={`გაკვეთილი ${i + 1}: ${l.title}${isDone ? ' — გავლილია' : ''}`}
                onClick={() => open(l.id)} />
            );
          })}
        </Rows>
      )}

      <SectionLabel label="ვარჯიში და ტესტი" />
      <Rows>
        <Row lead={<Dot icon={<Dumbbell />} />} title="ვარჯიში" sub={`ახალი დავალებები · ${solved} / ${PRACTICE_GOAL}`} wrap onClick={() => open('trainer')} />
        <Row lead={<Dot icon={<ClipboardCheck />} />} title="საცდელი ტესტი"
          sub={test ? `ბოლოს: ${test.score} / ${test.max} ქულა` : '7 დავალება · 32 ქულა'} wrap onClick={() => open('mock')} />
      </Rows>

      <TestSheet open={more} lessons={lessons} onLesson={open} onClose={() => setMore(false)} />
    </Page>
  );
};

/** one lesson on a screen of its own: its text, then „გავიარე“, the next lesson and its practice */
export const LessonScreen: React.FC<{ api: AbituriProgressApi; id: string }> = ({ api, id }) => {
  const { handleGoBack, openMapItem } = useNavigation();
  const { lessons, failed } = useLessons();
  const lesson = lessons?.find(l => l.id === id);
  if (!lessons || !lesson) return (
    <Page>
      <TopBar title="თეორია" onBack={handleGoBack} />
      <Waiting failed={failed || !!lessons} what="გაკვეთილი" />
    </Page>
  );
  const i = lessons.indexOf(lesson);
  const next = lessons[i + 1];
  const isDone = api.progress.lessons.includes(lesson.id);
  const kind = drillOf(lesson);
  return (
    <Page>
      <TopBar title={lesson.title} sub={`გაკვეთილი ${i + 1} / ${lessons.length}${lesson.task ? ` · ტესტი №${lesson.task}` : ''}`} onBack={handleGoBack} />
      <Card className="px-4 py-5">
        <LessonBody blocks={lesson.blocks} />
      </Card>
      <Button full kind={isDone ? 'soft' : 'primary'} icon={<CheckIcon aria-hidden="true" />} aria-pressed={isDone}
        onClick={() => api.toggleLesson(lesson.id)}>
        {isDone ? 'გავლილია' : 'გავიარე'}
      </Button>
      {next && (
        <Button full kind={isDone ? 'primary' : 'soft'} icon={<ArrowRight aria-hidden="true" />} onClick={() => openMapItem(`theory/${next.id}`, true)}>
          შემდეგი: {next.title}
        </Button>
      )}
      {kind && (
        <Button kind="quiet" size="md" className="self-center" icon={<Dumbbell aria-hidden="true" />} onClick={() => openMapItem(`theory/trainer/${kind}`)}>
          ივარჯიშე ამ თემაზე
        </Button>
      )}
    </Page>
  );
};

/** the endless practice (the old tab's „② ვარჯიში“) */
export const TrainerScreen: React.FC<{ api: AbituriProgressApi; start?: string }> = ({ api, start }) => {
  const { handleGoBack } = useNavigation();
  const [kind, setKind] = useState<TaskKind | null>(() => (DRILLS.some(d => d.kind === start) ? start as TaskKind : null));
  return (
    <Page>
      <TopBar title="ვარჯიში" sub="ყოველ ჯერზე ახალი დავალებები" onBack={handleGoBack} />
      <Trainer progress={api} kind={kind} setKind={setKind} />
    </Page>
  );
};

/** the mock test in the exam's form (the old tab's „③ საცდელი ტესტი“) */
export const MockScreen: React.FC<{ api: AbituriProgressApi }> = ({ api }) => {
  const { handleGoBack } = useNavigation();
  return (
    <Page>
      <TopBar title="საცდელი ტესტი" sub="როგორც გამოცდაზე: 7 დავალება, 32 ქულა" onBack={handleGoBack} />
      <MockTest progress={api} />
    </Page>
  );
};
