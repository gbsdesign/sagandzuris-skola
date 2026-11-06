import type { AbituriProgress } from '../hooks/useAbituriProgress';

// „ჩემი მომზადება“ on the admission page (2026-11-06): where the student stands in each exam and the one next step.
// Pure — the page feeds it the progress record, the lesson list (when loaded) and the pieces of the I exam.

export type ExamId = 'program' | 'theory' | 'colloquium' | 'admission';
export interface Piece { key: string; title: string }
export interface LessonRef { id: string; title: string }

export interface PrepInput {
  progress: AbituriProgress;
  /** the I exam's pieces for me: the chants and my song list (empty while the list isn't chosen) */
  pieces: Piece[];
  /** the theory lessons, null while loading */
  lessons: LessonRef[] | null;
  /** the registration's documents */
  docsCount: number;
}

export interface ExamState { id: ExamId; share: number; note: string; done: boolean }
export interface NextStep { tab: ExamId; id?: string; label: string }

/** enough practice tasks for the theory step to count as done */
export const PRACTICE_GOAL = 50;
/** a mock test at this share of its points = ready */
export const TEST_GOAL = 0.8;
/** right answers in „გამოიცანი სმენით“ for the colloquium to count as done */
export const QUIZ_GOAL = 30;

const clamp = (x: number) => Math.max(0, Math.min(1, x));

export const solvedOf = (p: AbituriProgress) =>
  Object.entries(p.drills).filter(([k]) => k !== 'colloquium' && k !== 'motif').reduce((n, [, [, all]]) => n + all, 0);
export const quizRight = (p: AbituriProgress) => p.drills.colloquium?.[0] ?? 0;
export const lastTest = (p: AbituriProgress) => p.tests[p.tests.length - 1];

export const examStates = ({ progress: p, pieces, lessons, docsCount }: PrepInput): ExamState[] => {
  const known = pieces.filter(x => p.pieces.includes(x.key)).length;
  const lessonsDone = lessons ? lessons.filter(l => p.lessons.includes(l.id)).length : 0;
  const solved = solvedOf(p);
  const test = lastTest(p);
  const testShare = test ? clamp(test.score / test.max) : 0;
  const theory = lessons
    ? (lessonsDone / lessons.length + clamp(solved / PRACTICE_GOAL) + clamp(testShare / TEST_GOAL)) / 3
    : 0;
  const right = quizRight(p);
  const docs = p.docs.filter(i => i < docsCount).length;
  return [
    {
      id: 'program',
      share: pieces.length ? known / pieces.length : 0,
      note: pieces.length ? `ვიცი ${known} / ${pieces.length}` : 'აირჩიე შენი სია',
      done: pieces.length > 0 && known === pieces.length,
    },
    {
      id: 'theory',
      share: theory,
      note: lessons
        ? [`გაკვეთილი ${lessonsDone} / ${lessons.length}`, solved ? `ვარჯიში ${solved}` : '', test ? `ტესტი ${test.score} / ${test.max}` : ''].filter(Boolean).join(' · ')
        : 'გაკვეთილები, ვარჯიში, ტესტი',
      done: !!lessons && lessonsDone === lessons.length && solved >= PRACTICE_GOAL && testShare >= TEST_GOAL,
    },
    {
      id: 'colloquium',
      share: clamp(right / QUIZ_GOAL),
      note: right ? `გამოცნობილი ${right} / ${QUIZ_GOAL}` : 'გამოიცანი სმენით',
      done: right >= QUIZ_GOAL,
    },
    {
      id: 'admission',
      share: docsCount ? docs / docsCount : 0,
      note: docs ? `საბუთი ${docs} / ${docsCount}` : 'საბუთები და რეგისტრაცია',
      done: docsCount > 0 && docs === docsCount,
    },
  ];
};

/** The one thing to do next: the exam I am furthest behind in (ties in the exams' order), its own first open step. */
export const nextStep = (input: PrepInput): NextStep => {
  const states = examStates(input);
  const open = states.filter(s => !s.done);
  if (!open.length) return { tab: 'program', label: 'ყველაფერი მზადაა — გაიმეორე პროგრამა' };
  const least = open.reduce((a, b) => (b.share < a.share ? b : a));
  const { progress: p, pieces, lessons } = input;
  switch (least.id) {
    case 'program': {
      const piece = pieces.find(x => !p.pieces.includes(x.key));
      return piece ? { tab: 'program', id: `piece-${piece.key}`, label: `ისწავლე: ${piece.title}` } : { tab: 'program', label: 'გალობა-სიმღერა' };
    }
    case 'theory': {
      const lesson = lessons?.find(l => !p.lessons.includes(l.id));
      if (lesson) return { tab: 'theory', id: `lesson-${lesson.id}`, label: `${p.lessons.length ? 'გააგრძელე' : 'დაიწყე'}: ${lesson.title}` };
      if (solvedOf(p) < PRACTICE_GOAL) return { tab: 'theory', id: 'trainer', label: 'ივარჯიშე თეორიაში' };
      return { tab: 'theory', id: 'mock', label: 'დაწერე საცდელი ტესტი' };
    }
    case 'colloquium':
      return { tab: 'colloquium', id: 'quiz', label: 'გამოიცანი სმენით' };
    default:
      return { tab: 'admission', id: 'docs', label: 'მოამზადე საბუთები' };
  }
};
