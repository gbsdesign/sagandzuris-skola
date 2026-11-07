import React from 'react';
import type { Drill } from '../../../data/vocalDrills';
import { chordQuiz, higherQuiz, intervalQuiz, lettersQuiz, rhythmPlay, rhythmQuiz } from '../../../utils/earTrainer';
import { QuizRun, RhythmBlocks, type QuizQ } from './Quiz';
import { DictRun } from './Dict';
import { SingRun } from './Sing';
import { MeasureRun } from './Measure';
import { RhythmCopyRun, TempoRun } from './Taps';
import { ListenRun, SchoolsRun, TonesRun } from './Listen';
import { OpenRun } from './Open';

// „სავარჯიშო“ of a path drill whose exercise the app runs itself (`trainer`) or that happens elsewhere (`open`); the
// drill sheet (ManeraLessonSheet) shows it in place of the timed steps.

const rhythmQ = (): QuizQ => {
  const r = rhythmQuiz(Math.random);
  return { play: rhythmPlay(r.pattern).play, options: ['ა', 'ბ', 'გ'], right: r.right, patterns: r.options };
};

export const TrainerView: React.FC<{ drill: Drill; onClose: (then?: () => void) => void }> = ({ drill, onClose }) => {
  const id = drill.id;
  if (drill.open) return <OpenRun drillId={id} spec={drill.open} onClose={onClose} />;
  const t = drill.trainer;
  if (!t) return null;
  switch (t.kind) {
    case 'higher':
      return <QuizRun drillId={id} pitched cols={3} make={b => higherQuiz(b, Math.random)} intro="ორი ნოტი ჟღერს. მეორე პირველზე დაბალია, იგივეა თუ მაღალი?" />;
    case 'interval-id':
      return <QuizRun drillId={id} pitched make={b => intervalQuiz(b, t.set, Math.random)} intro="ჯერ ორი ნოტი ერთმანეთის მერე, მერე ერთად. რომელი ინტერვალია?" />;
    case 'chord-id':
      return <QuizRun drillId={id} cols={1} make={() => chordQuiz(t.kinds, Math.random)} intro="ნამდვილი საგალობლის აკორდი: ჯერ ერთად, მერე ქვემოდან ზემოთ. რომელია?" />;
    case 'letters':
      return <QuizRun drillId={id} make={() => lettersQuiz(Math.random)} intro="ძველი ასო ან სიტყვა — აირჩიე, როგორ იკითხება." />;
    case 'rhythm-dict':
      return (
        <QuizRun drillId={id} cols={1} make={rhythmQ} intro="ოთხი წკაპუნი, მერე რიტმი. რომელი სურათია?"
          renderOption={(q, i) => <span className="flex items-center gap-3 w-full"><b className="w-5 shrink-0">{q.options[i]}</b><RhythmBlocks pattern={q.patterns![i]} /></span>} />
      );
    case 'dict':
      return <DictRun drillId={id} notes={t.notes} two={t.two} intro={t.two ? 'ორი ხმა ჟღერს: ერთი დგას, მეორე მოძრაობს. დაწერე მოძრავის მიმართულება.' : 'საგალობლის რამდენიმე ნოტი ჟღერს. დაწერე, საით მიდის ყოველი ნაბიჯი.'} />;
    case 'echo':
      return <SingRun drillId={id} spec={t} intro={t.from === 'turn' ? 'სამი სწრაფი ნოტი ჟღერს — გაიმეორე ერთ „ა“-ზე, შეუწყვეტლად.' : t.notes === 1 ? 'ნოტი ჟღერს — მერე შენ იმღერე „ა“-ზე. ოქტავით მაღლა ან დაბლაც სწორია.' : `${t.notes} ნოტი ჟღერს — მერე შენ გაიმეორე „ლა“-ზე.`} />;
    case 'interval-sing':
      return <SingRun drillId={id} spec={t} intro={t.strict ? 'ფუძე ნოტი ჟღერს — იმღერე ინტერვალი რაც შეიძლება სუფთად. აპი ცენტებს გაჩვენებს.' : 'ფუძე ნოტი ჟღერს — იმღერე მითითებული ინტერვალის ბოლო ნოტი.'} />;
    case 'home':
      return <SingRun drillId={id} spec={t} intro="დასაწყისში ბანი ჟღერს — ეს სახლია. ფრაზის მერე იმღერე სახლის ნოტი." />;
    case 'chord-sing':
      return <SingRun drillId={id} spec={t} intro="აკორდი ჟღერს — იმღერე მხოლოდ ის ხმა, რომელსაც აპი გთხოვს." />;
    case 'read':
      return <SingRun drillId={id} spec={t} intro={t.notes === 1 ? '„დო“ ჟღერს — წაიკითხე ნოტი ხაზებზე და იმღერე.' : '„დო“ ჟღერს — წაიკითხე სამი ნოტი და იმღერე რიგით.'} />;
    case 'hold':
      return <MeasureRun drillId={id} spec={t} intro={t.mode === 'steady' ? 'ნოტი ჟღერს — შეუერთდი და დაიჭირე. ხაზი მწვანე ზოლში უნდა დარჩეს.' : t.mode === 'straight' ? 'იმღერე სწორი, მშვიდი ბგერა — აპი რხევას გაზომავს.' : 'ერთ ნოტზე: ჩუმად → ძლიერად → ჩუმად.'} />;
    case 'siren':
      return <MeasureRun drillId={id} spec={t} intro="„უ“-ზე: დაბლიდან ზემოთ და უკან, ერთი უწყვეტი ხაზით." />;
    case 'breath':
      return <MeasureRun drillId={id} spec={t} intro="ტელეფონი სახიდან ერთი მტკაველის მოშორებით. ჩაისუნთქე და „სსს“ — თანაბრად, დიდხანს. აპი წამებს დაითვლის." />;
    case 'drone-hold':
      return <MeasureRun drillId={id} spec={t} earphones intro="ჯერ ბანის ნოტი ჟღერს. დაიჭირე „ო“-ზე — ზედა ხმა იმოძრავებს, შენ ბანზე დარჩი." />;
    case 'along':
      return <MeasureRun drillId={id} spec={t} earphones intro={t.shift === 0 ? 'მთქმელი ჟღერს — იმღერე მასთან ერთად, მის რიტმში.' : `მელოდია ჟღერს — იმღერე იგივე ${t.shift === -5 ? 'კვარტით' : 'კვინტით'} დაბლა, მასთან ერთად.`} />;
    case 'rhythm-copy':
      return <RhythmCopyRun drillId={id} intro="ოთხი წკაპუნი, მერე რიტმი. მერე დაუკარი იგივე დიდ ღილაკზე." />;
    case 'tempo':
      return <TempoRun drillId={id} intro="დააჭირე ყოველ წკაპუნზე. წკაპუნი გაჩუმდება — შენ გააგრძელე იმავე ტემპით, 9 დარტყმა." />;
    case 'listen':
      return <ListenRun drillId={id} />;
    case 'tones':
      return <TonesRun drillId={id} />;
    case 'schools':
      return <SchoolsRun drillId={id} />;
  }
};
