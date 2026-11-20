import React from 'react';
import { BookOpen, GraduationCap, Play } from 'lucide-react';
import { Dot, Hero, Row, Rows, SectionLabel, TopBar } from '../../../components/ui2';
import { useNavigation } from '../../../context';
import { LESSONS, lessonById } from '../../../data/medavitneLessons';
import { useMedavitneProgress } from '../../../hooks/useMedavitneProgress';
import { dayMonthGe, weekdayGe } from '../../../data/churchCalendar';
import { toneName } from '../../../utils/dayReadings';
import { rankLabel } from '../../../utils/dayService';
import { WorshipSwitch } from '../../galoba/WorshipSwitch';
import { useDayBrief } from '../../medavitneoba/DayService';
import { BooksV2, ShelfRows } from './Books';
import { CourseScreen, LessonScreen, nextLesson } from './Course';
import { DayScreen } from './Day';
import { PinRound } from '../gza/parts';
import { Page } from './parts';

// „ღვთისმსახურება“'s „მედავითნე“ side in the new look (board x-medavitne): the switch, then the one big card — the service
// served now („დღის მსახურება“: in the evening the next day's vespers, in the morning the day's own first service) —, the
// course as one row with its next lesson, then the books: the reader's own first, the rest folded. Without the calendar the
// big card is the course's next lesson. The places are the old page's `mapItem`: none / „w“ the front, „day“, „learn“, a
// lesson's id, „w:…“ a book (pages/MedavitneobaPage.tsx).

const Front: React.FC<{ done: string[] }> = ({ done }) => {
  const { openMapItem, handleGoBack } = useNavigation();
  const brief = useDayBrief();
  const next = nextLesson(done);
  const count = LESSONS.filter(l => done.includes(l.id)).length;
  const at = next ? LESSONS.indexOf(next) : -1;
  const learned = `ნასწავლი ${count} / ${LESSONS.length}`;
  return (
    <Page>
      <TopBar title="ღვთისმსახურება" onBack={handleGoBack} right={<PinRound id="section:medavitneobaTopic" />} />
      <WorshipSwitch value="medavitne" />
      {brief ? (
        <Hero
          kicker={brief.now ? `დღის მსახურება · ${brief.now.word}` : 'დღის მსახურება'}
          title={brief.now?.title ?? `${weekdayGe(brief.iso)}, ${dayMonthGe(brief.iso)}`}
          sub={[
            // the evening's service is the next church day's
            brief.now ? `${brief.iso !== brief.today ? 'ხვალ — ' : ''}${weekdayGe(brief.iso)}, ${dayMonthGe(brief.iso)}` : null,
            brief.great?.name, brief.tone ? toneName(brief.tone) : null, brief.ownOrder ? null : rankLabel(brief.rank),
          ].filter(Boolean).join(' · ')}
          action={{ label: 'გახსნა', icon: <BookOpen aria-hidden="true" />, onClick: () => openMapItem('day') }}
        />
      ) : next ? (
        <Hero
          kicker={`სასწავლო · ${count} / ${LESSONS.length} გაკვეთილი`}
          title={next.title}
          sub={at === 0 ? 'პირველი გაკვეთილი' : `გაკვეთილი ${at + 1} · ${next.minutes} წუთი`}
          action={{ label: count ? 'გააგრძელე' : 'დაიწყე', icon: <Play aria-hidden="true" className="fill-current" />, onClick: () => openMapItem(next.id) }}
        />
      ) : (
        <Hero kicker={`სასწავლო · ${count} / ${LESSONS.length} გაკვეთილი`} title="ყველა გაკვეთილი ნასწავლია"
          action={{ label: 'კურსის ნახვა', onClick: () => openMapItem('learn') }} />
      )}
      <Rows>
        <Row lead={<Dot icon={<GraduationCap />} />} title="მედავითნის კურსი" wrap
          sub={!brief ? `${LESSONS.length} გაკვეთილი · ნასწავლი ${count}` : next ? `შემდეგი: ${next.title} · ${learned}` : `ყველა გაკვეთილი ნასწავლია · ${learned}`}
          onClick={() => openMapItem('learn')} />
      </Rows>
      <SectionLabel label="წიგნები მედავითნისთვის" />
      <ShelfRows open={(id, replace) => openMapItem(id, replace)} />
    </Page>
  );
};

/** page `medavitneoba` in the new look */
export const MedavitneV2: React.FC = () => {
  const { mapItem, openMapItem, handleGoBack } = useNavigation();
  const { done, setLearned, onAccount } = useMedavitneProgress();

  if (!mapItem || mapItem === 'w') return <Front done={done} />;
  if (mapItem.startsWith('w:')) return <BooksV2 item={mapItem} />;
  if (mapItem === 'day') return <DayScreen />;
  const course = <CourseScreen done={done} onAccount={onAccount} open={id => openMapItem(id)} />;
  if (mapItem === 'learn') return course;
  const lesson = lessonById(mapItem);
  if (!lesson) return course;
  const next = LESSONS[LESSONS.indexOf(lesson) + 1];
  return (
    <LessonScreen
      lesson={lesson}
      learned={done.includes(lesson.id)}
      setLearned={on => setLearned(lesson.id, on)}
      openNext={next ? () => openMapItem(next.id, true) : null}
      back={handleGoBack}
    />
  );
};

export default MedavitneV2;
