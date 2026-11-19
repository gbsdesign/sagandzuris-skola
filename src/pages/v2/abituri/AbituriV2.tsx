import React from 'react';
import { SongPage } from '../../../components/maps/SongPage';
import { useNavigation } from '../../../context';
import { useAbituriProgress } from '../../../hooks/useAbituriProgress';
import type { ExamId } from '../../../utils/abituriPrep';
import { askSignIn } from '../../../components/access/SignInPrompt';
import { useCanListen } from '../../abituri/shared';
import { Front } from './Front';
import { PracticeScreen, ProgramScreen } from './Program';
import { LessonScreen, MockScreen, TheoryScreen, TrainerScreen } from './Theory';
import { ColloquiumScreen, QuizScreen } from './Colloquium';
import { AdmissionScreen } from './Admission';
import { setPendingFocus } from './parts';

// „აბიტურიენტს“ in the new look (boards x-abituri, x-abituri-gamotsda, x-teoria, x-kolokviumi, x-abituri-registratsia).
// The old page's four tabs are screens of their own, so „უკან“ and the phone's back step between them (`mapItem`):
// none = the front, „program“ (+ „/practice“), „theory“ (+ „/<lesson id>“, „/trainer[/<kind>]“, „/mock“), „colloquium“
// (+ „/quiz“), „admission“. The progress record and every rule are the old page's (useAbituriProgress, utils/abituriPrep).

export const AbituriV2: React.FC = () => {
  const { mapItem, openMapItem } = useNavigation();
  const api = useAbituriProgress();
  const canListen = useCanListen();
  const [screen, rest = '', more] = (mapItem ?? '').split('/');

  // „ჩემი მომზადება“'s step (`at` = the old focus id): the exam's screen, at the right place
  const go = (tab: ExamId, at?: string) => {
    if (tab === 'theory' && at?.startsWith('lesson-')) { openMapItem(`theory/${at.slice('lesson-'.length)}`); return; }
    if (tab === 'theory' && (at === 'trainer' || at === 'mock')) { openMapItem(`theory/${at}`); return; }
    if (tab === 'colloquium' && at === 'quiz') {
      if (canListen) openMapItem('colloquium/quiz');
      else { askSignIn('ჩანაწერები'); openMapItem('colloquium'); }
      return;
    }
    setPendingFocus(at ?? null);
    openMapItem(tab);
  };

  const body = screen === 'program' ? (rest === 'practice' ? <PracticeScreen api={api} /> : <ProgramScreen api={api} />)
    : screen === 'theory' ? (
      rest === 'trainer' ? <TrainerScreen key={more ?? ''} api={api} start={more} />
        : rest === 'mock' ? <MockScreen api={api} />
        : rest ? <LessonScreen key={rest} api={api} id={rest} />
        : <TheoryScreen api={api} />
    )
    : screen === 'colloquium' ? (rest === 'quiz' ? <QuizScreen api={api} /> : <ColloquiumScreen />)
    : screen === 'admission' ? <AdmissionScreen api={api} />
    : <Front api={api} go={go} />;

  return (
    <>
      {body}
      {/* a song from the archive opens over the page */}
      <SongPage />
    </>
  );
};

export default AbituriV2;
