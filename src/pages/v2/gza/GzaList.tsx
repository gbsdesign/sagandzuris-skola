import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CircleCheck, Gem, Library, Music, Shirt, Users } from 'lucide-react';
import { useAuth, useNavigation } from '../../../context';
import { Card, Dot, Hero, PageHead, Row, Rows, RoundButton, Sheet, Small } from '../../../components/ui2';
import { TodayLessonStrip } from '../../../components/aiLesson/TodayLesson';
import { PATH_ORBS, useSamosiSummary } from '../../../components/views/PathOrbs';
import { ChvevebiContent } from '../../../components/views/ChvevebiPanel';
import { useIndependentWork } from '../../../components/views/IndependentWorkCard';
import { useNewWork } from '../../../components/teacher/MyClassWork';
import { useAllMyClasses } from '../../../components/classes/ClassPicker';
import { ClassLogo } from '../../../components/classes/ClassLogo';
import { askSignIn } from '../../../components/access/SignInPrompt';
import { useHabitsToday } from '../../../components/habits/useHabits';
import { useAccess } from '../../../hooks/useAccess';
import { useLibraryProgress } from '../../../hooks/useBooksRead';
import { useMyAttendance, useTeachingAttendance } from '../../../hooks/useAttendanceShare';
import { moveItem, ordered, usePathOrder } from '../../../utils/pathOrder';
import { useSamosiSrc } from '../../../utils/samosiDye';
import { useKabaSettings } from '../../../utils/kabaArt';
import { SAMOSI_COLORS, SAMOSI_DEFAULT_COLOR, SAMOSI_TOTAL, samosiThumb } from '../../../data/samosiData';
import { sectionOfPage } from '../../../data/sections';
import { PathRow, PinRound, Ring, RingText } from './parts';
import { useIsNewMember, useLearnCount } from './useGza';

// „საგანძურის გზა“ in the new look (board x-gza; a new member x-carieli-gza). The five round buttons became five rows — a
// ring with its number, the name and a grey line, „›“ (the canvas's note: „ხუთი წრე ხუთ ხაზად იქცა“); the AI teacher's day
// lesson leads them. A new member gets one card „პირველი ნაბიჯი“ instead, and the same five as one plain list with zeros,
// until a phrase is learned or a voice marked. Each row keeps its own switch and the member's order (a long press).

export type GzaRowId = 'samosi' | 'learn' | 'work' | 'library' | 'klasi';

export interface GzaRow {
  id: GzaRowId;
  title: string;
  sub: string;
  /** the ring's wine share, 0…1 */
  share: number;
  /** inside the ring: the number, or the chokha / the class's logo */
  center: React.ReactNode;
  /** a new member's list: the number at the right */
  count?: string;
  /** a red count before „›“ */
  badge?: number;
  /** none = a row that only says something (a new member without a class) */
  onClick?: () => void;
}

const NEW_ICON: Record<GzaRowId, React.ReactNode> = {
  samosi: <Shirt strokeWidth={2} />,
  learn: <Gem strokeWidth={2} />,
  work: <CircleCheck strokeWidth={2} />,
  library: <Library strokeWidth={2} />,
  klasi: <Users strokeWidth={2} />,
};


/** The list as the board draws it — everything by props. */
export const GzaListView: React.FC<{
  isNew: boolean;
  rows: GzaRow[];
  /** the round 📌 at the right of the name */
  pin?: React.ReactNode;
  /** the AI teacher's line on top (not for a new member) */
  lesson?: React.ReactNode;
  /** the habits' card, when its own row is switched off but the habits are open (as the old page had it) */
  extra?: React.ReactNode;
  onFirstStep: () => void;
  /** the member's order of the rows: a long press on one opens it */
  order?: { labels: { id: string; label: string }[]; move: (id: string, dir: -1 | 1) => void };
  /** several classes: the window of them */
}> = ({ isNew, rows, pin, lesson, extra, onFirstStep, order }) => {
  const [ordering, setOrdering] = useState(false);
  return (
    <div className="flex w-full flex-col pb-4">
      <PageHead title="საგანძურის გზა" right={pin} />
      <div className="flex flex-col gap-2.5 pt-0.5">
        {isNew ? (
          <div className="flex flex-col gap-3">
            <Hero kicker="პირველი ნაბიჯი" title="ისწავლე ერთი ფრაზა" sub="აირჩიე საგალობელი — და გზა დაიწყება"
              action={{ label: 'საგალობლები', icon: <Music strokeWidth={2} />, onClick: onFirstStep }} />
            <Rows>
              {rows.map(r => (
                <Row key={r.id} lead={<Dot icon={NEW_ICON[r.id]} />} title={r.title} sub={r.sub} onClick={r.onClick}
                  right={r.count ? <Small>{r.count}</Small> : null} />
              ))}
            </Rows>
          </div>
        ) : (
          <>
            {lesson}
            {rows.map(r => (
              <PathRow key={r.id} title={r.title} sub={r.sub} badge={r.badge} onClick={r.onClick}
                onLong={order && order.labels.length > 1 ? () => setOrdering(true) : undefined}
                ring={<Ring share={r.share}>{r.center}</Ring>} />
            ))}
          </>
        )}
        {extra}
      </div>

      {order && (
        <Sheet open={ordering} title="რიგის შეცვლა" onClose={() => setOrdering(false)}>
          <Rows>
            {order.labels.map((o, i) => (
              <Row key={o.id} title={o.label} right={(
                <span className="flex shrink-0 gap-2">
                  <RoundButton size={36} tone="page" label={`${o.label} — ზემოთ`} disabled={i === 0} onClick={() => order.move(o.id, -1)}>
                    <ChevronUp strokeWidth={2} />
                  </RoundButton>
                  <RoundButton size={36} tone="page" label={`${o.label} — ქვემოთ`} disabled={i === order.labels.length - 1} onClick={() => order.move(o.id, 1)}>
                    <ChevronDown strokeWidth={2} />
                  </RoundButton>
                </span>
              )} />
            ))}
          </Rows>
        </Sheet>
      )}
    </div>
  );
};

/** The chokha in its chosen colour, inside the ring. */
const ChokhaThumb: React.FC<{ color: string }> = ({ color }) => {
  const dye = color !== SAMOSI_DEFAULT_COLOR ? SAMOSI_COLORS.find(c => c.id === color)?.hex ?? null : null;
  const src = useSamosiSrc(samosiThumb('chokha'), dye);
  return src ? <img src={src} alt="" draggable={false} className="size-[34px] object-contain" /> : null;
};

/** The list with the member's own numbers. `onOpen` opens one of the path's own pages (its mapItem). */
export const GzaList: React.FC<{ onOpen: (item: 'samosi' | 'sagandzuri' | 'chvevebi') => void }> = ({ onOpen }) => {
  const access = useAccess();
  const { user } = useAuth();
  const { navigateTo, openClass, openMapItem } = useNavigation();
  const myClasses = useAllMyClasses();
  const { stats, count, confirmed } = useLearnCount();
  const isNew = useIsNewMember(stats, confirmed);
  const samosi = useSamosiSummary();
  const kaba = useKabaSettings();
  const library = useLibraryProgress();
  const habits = useHabitsToday();
  const work = useIndependentWork();
  const newWork = useNewWork();
  // „კლასი“: a member sees their own attendance, a teacher their classes' average
  const teaching = myClasses.filter(c => !!user && c.teacherIds.includes(user.uid));
  const ownShare = useMyAttendance(user?.uid, myClasses.filter(c => !teaching.includes(c)).map(c => c.id));
  const classShare = useTeachingAttendance(teaching);
  const attendance = teaching.length ? classShare : ownShare;
  const { order, save } = usePathOrder(user?.uid);

  // every row has its own switch (data/sections EXTRA_SWITCHES); the library's follows the library, the class's the member's
  // „კლასი“ — and a class (a new member sees „ჯერ კლასში არ ხარ“ instead)
  const shown = PATH_ORBS.filter(o => (o.id === 'library' ? access.section('biblioteka') !== 'hidden'
    : o.id === 'klasi' ? access.can('classes') && (myClasses.length > 0 || isNew)
    : access.on(o.id)));
  const ids = ordered(shown.map(o => o.id), order.orbs);
  const habitsAccess = access.section('chvevebi');
  const habitsOnRow = habitsAccess === 'open' && ids.includes('work');

  const toLibrary = () => (access.section('biblioteka') === 'locked' ? askSignIn('ბიბლიოთეკა') : navigateTo('biblioteka'));
  const toHabits = () => (habitsAccess === 'locked' ? askSignIn('ჩვევები') : onOpen('chvevebi'));
  const toClass = myClasses.length === 0 ? undefined
    : () => (myClasses.length === 1 ? openClass(myClasses[0].id) : openMapItem('klasebi'));

  const habitsTotal = habits.done + habits.left;
  const workLeft = work.today.filter(s => !s.done).length;
  const first = myClasses[0];
  const rowOf = (id: GzaRowId): GzaRow => {
    switch (id) {
      case 'samosi':
        return {
          id, title: 'სამოსი', sub: kaba.published ? 'ჩოხა და ქართული კაბა' : 'ჩემი ჩოხა',
          share: samosi.count / SAMOSI_TOTAL, center: <ChokhaThumb color={samosi.color} />,
          count: `${samosi.count} / ${SAMOSI_TOTAL}`, onClick: () => onOpen('samosi'),
        };
      case 'learn':
        return {
          id, title: 'საგანძური',
          sub: isNew || !stats.total ? 'რასაც ისწავლი, აქ შეინახება'
            : stats.voiceSlots ? `${stats.voices} / ${stats.voiceSlots} ხმა ნასწავლია` : `${stats.learned} / ${stats.total} ნასწავლია`,
          share: count.total ? count.learned / count.total : 0,
          center: <RingText>{count.total ? `${count.learned}/${count.total}` : '0'}</RingText>,
          count: `${count.learned}`, badge: newWork.count || undefined, onClick: () => onOpen('sagandzuri'),
        };
      case 'work':
        return {
          id, title: 'ჩვევები',
          sub: !habits.done ? 'დღეს ჯერ არ მონიშნულა' : habits.left ? `დღეს დარჩა ${habits.left}` : 'დღეს ყველა მონიშნულია',
          share: habitsTotal ? habits.done / habitsTotal : 0,
          center: <RingText>{`${habits.done}/${habitsTotal}`}</RingText>,
          count: `${habits.done} / ${habitsTotal}`, badge: workLeft || undefined, onClick: toHabits,
        };
      case 'library':
        return {
          id, title: 'ბიბლიოთეკა', sub: isNew ? 'წაკითხული წიგნები' : 'წაკითხული წიგნი',
          share: library.total ? library.done / library.total : 0, center: <RingText>{`${library.done}`}</RingText>,
          count: `${library.done}`, onClick: toLibrary,
        };
      case 'klasi':
        return {
          id, title: 'კლასი',
          sub: !first ? 'ჯერ კლასში არ ხარ' : myClasses.length > 1 ? `${first.name} და კიდევ ${myClasses.length - 1}` : first.name,
          share: attendance ? attendance.came / attendance.of : 0,
          center: attendance ? <RingText>{`${attendance.came}/${attendance.of}`}</RingText>
            : myClasses.length === 1 ? <ClassLogo name={first.name} logo={first.logo} className="size-[34px] text-meta" />
            : <Users aria-hidden="true" className="size-5 text-wine" strokeWidth={1.75} />,
          count: attendance ? `${attendance.came} / ${attendance.of}` : undefined, onClick: toClass,
        };
    }
  };

  return (
    <GzaListView
      isNew={isNew}
      rows={ids.map(rowOf)}
      pin={<PinRound id={`section:${sectionOfPage('gz')}`} />}
      lesson={<TodayLessonStrip />}
      extra={habitsAccess === 'open' && !habitsOnRow ? <Card pad="sm"><ChvevebiContent /></Card> : undefined}
      onFirstStep={() => navigateTo('galoba')}
      order={{
        labels: ids.map(id => ({ id, label: PATH_ORBS.find(o => o.id === id)?.label ?? id })),
        move: (id, dir) => save('orbs', moveItem(ids, id as GzaRowId, dir)),
      }}
    />
  );
};
