import React, { useState } from 'react';
import { BookOpen, Check, Dumbbell } from 'lucide-react';
import { Dot, Note, Row, Rows, SectionLabel, Small, TopBar } from '../../../components/ui2';
import { useAuth, useNavigation } from '../../../context';
import { useMyClasses, type SchoolClass } from '../../../hooks/useClasses';
import { doneCount, useClassLessons, useMyLessonProgress, type Lesson } from '../../../hooks/useLessons';
import { LessonView } from '../../../components/mastery/ClassLessons';
import { DrillSheet } from '../../../components/mastery/ManeraLessonSheet';
import { useManera } from '../../../components/views/ManeraPanel';
import { EXTRA_DRILL_IDS, LESSON_LIBRARY, MASTERY_LEVELS } from '../../../data/masteryPath';
import { MANERA_ITEMS } from '../../../data/habitsAndManera';
import { findDrill } from '../../../data/vocalDrills';
import { useMasteryPath } from '../../../components/mastery/useMasteryPath';
import { ScoreTag } from './parts';
import { useLightLook } from './useLightLook';

// „ოსტატობა“'s two lists in the new look, each a step of page `gz` (./nav): the lessons — my classes' own lessons first (a
// teacher builds them step by step; one opens in the class's lesson window), then the eleven tips and the new talks by level
// with my teachers' marks —, and the extra exercises the path left out.

/** the class's lesson window is still the old one: the light look while it is open */
const OldLesson: React.FC<React.ComponentProps<typeof LessonView>> = props => {
  useLightLook(true);
  return <LessonView {...props} />;
};

/** one class's lessons for me, a row each with how far I am */
const ClassLessonRows: React.FC<{ cls: SchoolClass; named: boolean }> = ({ cls, named }) => {
  const { user } = useAuth();
  const lessons = useClassLessons(cls.id);
  const member = !!user && cls.memberIds.includes(user.uid);
  const mine = useMyLessonProgress(member ? cls.id : null, user?.uid);
  const [open, setOpen] = useState<Lesson | null>(null);
  if (!lessons?.length) return null;
  return (
    <>
      <SectionLabel label={named ? `კლასი · ${cls.name}` : 'კლასის გაკვეთილები'} />
      <Rows>
        {lessons.map(l => {
          const n = doneCount(l, mine);
          const all = l.steps.length;
          const complete = member && all > 0 && n === all;
          return (
            <Row key={l.id} wrap title={l.title || 'უსათაურო'} sub={member ? `${n} / ${all} ნაბიჯი` : `${all} ნაბიჯი`}
              lead={complete ? <Dot icon={<Check strokeWidth={2.5} />} color="leaf" /> : <Dot icon={<BookOpen />} />}
              onClick={() => setOpen(l)} />
          );
        })}
      </Rows>
      {open && <OldLesson cls={cls} lesson={open} done={mine} member={member} onClose={() => setOpen(null)} />}
    </>
  );
};

export const LessonsScreen: React.FC = () => {
  const { handleGoBack } = useNavigation();
  const { user } = useAuth();
  const classes = useMyClasses(user?.uid);
  const { marks } = useManera();
  const [drill, setDrill] = useState<string | null>(null);
  const markOf = (id: string) => {
    if (!id.startsWith('tip-')) return null;
    const i = MANERA_ITEMS.findIndex(t => `tip-${t.num}` === id);
    return i >= 0 ? marks[i] : null;
  };
  return (
    <div className="flex w-full flex-col gap-3 pb-4">
      <TopBar title="გაკვეთილები" onBack={handleGoBack} />
      {classes.map(c => <ClassLessonRows key={c.id} cls={c} named={classes.length > 1} />)}
      {LESSON_LIBRARY.map(g => (
        <React.Fragment key={g.level}>
          <SectionLabel label={`დონე ${g.level} · ${MASTERY_LEVELS[g.level].name}`} />
          <Rows>
            {g.ids.map(id => {
              const d = findDrill(id);
              if (!d) return null;
              const m = markOf(id);
              return (
                <Row key={id} wrap lead={<Dot icon={<BookOpen />} />} title={d.title} sub={m?.note ? `„${m.note}“` : undefined}
                  right={m ? <ScoreTag v={m.v} /> : undefined} onClick={() => setDrill(id)} />
              );
            })}
          </Rows>
        </React.Fragment>
      ))}
      {marks.some(Boolean) && <Note>% — მასწავლებლის შეფასება.</Note>}
      <DrillSheet drillId={drill} startTab="lesson" onClose={() => setDrill(null)} />
    </div>
  );
};

export const ExtraScreen: React.FC = () => {
  const { handleGoBack } = useNavigation();
  const scores = useMasteryPath().record.scores;
  const [drill, setDrill] = useState<string | null>(null);
  return (
    <div className="flex w-full flex-col gap-3 pb-4">
      <TopBar title="დამატებითი სავარჯიშოები" onBack={handleGoBack} />
      <Rows>
        {EXTRA_DRILL_IDS.map(id => {
          const d = findDrill(id);
          if (!d) return null;
          const score = scores[id];
          return (
            <Row key={id} wrap lead={<Dot icon={<Dumbbell />} />} title={d.title} onClick={() => setDrill(id)}
              right={score !== undefined ? <ScoreTag v={score} /> : <Small className="tabular-nums">{d.exercise.minutes} წთ</Small>} />
          );
        })}
      </Rows>
      <Note>სავარჯიშოები, რომლებიც გზაზე არ შედის — მასწავლებელმა შეიძლება დაგავალოს.</Note>
      <DrillSheet drillId={drill} onClose={() => setDrill(null)} />
    </div>
  );
};
