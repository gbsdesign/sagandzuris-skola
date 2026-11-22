import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCheck, Gem, MessageCircle, MoreHorizontal, Phone, Shirt, Star } from 'lucide-react';
import { Waiting } from '../../../components/shell/PageSkeleton';
import { ChantSelectionProvider, ViewAsStudent, useNavigation, useRealAuth } from '../../../context';
import { Avatar, Button, Card, Dot, Duo, Row, Rows, RoundButton, Stats, TopBar } from '../../../components/ui2';
import { askConfirm } from '../../../components/ui/kit';
import { useHabitsToday } from '../../../components/habits/useHabits';
import { openAdminThread, openThread, useThread } from '../../../hooks/useDirectChat';
import type { ClassMember } from '../../../hooks/useClasses';
import { removeClassMember } from '../../../components/admin/ClassesAdmin';
import { startChatCall, mayStartChatCall } from '../../../components/calls/callActions';
import { SAMOSI_TOTAL, samosiDone } from '../../../data/samosiData';
import { readManeraReview, markDate } from '../../../components/views/ManeraPanel';
import { parseStudentItem, studentItem } from '../klasi/nav';
import { StudentGza } from './Gza';
import { StudentOstatoba } from './Ostatoba';
import { MoreSheet } from './More';
import { AttendanceSheet, OutfitSheet } from './Sheets';
import { markedCount, monthAttendance, usePathItems, useStudent, voiceLine } from './useStudent';
import type { StudentData } from './useStudent';
import { kaName } from '../../../utils/georgianName';

// A student's page in the new look (boards x-mostsavle, -gza, -ostatoba, -meti). Page `student`; its place is the
// navigation's mapItem — `<uid>|<classId>` the page, `…|gza` the chants learned, `…|ostatoba` the mastery's marks.
// The old pages/StudentPage.tsx shows every permission and data source kept here: a teacher or an admin looks at one
// member; what they change is the student's own record (firestore.rules let a teacher of the student write it).

const Frame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex w-full flex-col gap-3 pb-6">{children}</div>
);

export const StudentScreen: React.FC = () => {
  const { mapItem, handleGoBack } = useNavigation();
  const auth = useRealAuth();
  const at = parseStudentItem(mapItem);
  if (!auth.user || !auth.isTeacher || !at) {
    return <Frame><TopBar title="მოსწავლე" onBack={handleGoBack} /></Frame>;
  }
  return <Loaded key={at.uid} uid={at.uid} classId={at.classId} sub={at.sub} />;
};

const Loaded: React.FC<{ uid: string; classId: string; sub: 'gza' | 'ostatoba' | null }> = ({ uid, classId, sub }) => {
  const { handleGoBack } = useNavigation();
  const s = useStudent(uid, classId);

  if (s.denied) {
    return <Frame><TopBar title="მოსწავლე" onBack={handleGoBack} /><p className="py-8 text-center text-body text-mut">ამ მოსწავლის მონაცემები ჯერ არ ჩანს.</p></Frame>;
  }
  if (!s.data) {
    return <Frame><TopBar title="მოსწავლე" onBack={handleGoBack} /><Waiting field={false} /></Frame>;
  }
  if (sub === 'gza') return <StudentGza s={s} />;
  if (sub === 'ostatoba') return <StudentOstatoba s={s} />;
  return (
    <ViewAsStudent student={{ uid, name: s.name, photoURL: s.photoURL }}>
      <ChantSelectionProvider>
        <Main s={s} />
      </ChantSelectionProvider>
    </ViewAsStudent>
  );
};

type Win = null | 'more' | 'attendance' | 'outfit';

export const Main: React.FC<{ s: StudentData }> = ({ s }) => {
  const { handleGoBack, openMapItem, openDm } = useNavigation();
  const auth = useRealAuth();
  const [win, setWin] = useState<Win>(null);
  const [note, setNote] = useState('');
  const [callId, setCallId] = useState<string | null>(null);
  const wantCall = useRef(false);
  const { thread } = useThread(callId);
  const today = useHabitsToday();

  const items = usePathItems(s.data);
  const voices = markedCount(items);
  const learned = items.filter(it => markedCount([it]) > 0).length;
  const habitsAll = today.done + today.left;
  const att = useMemo(() => {
    const last = s.attendance.slice(0, 8);
    return { came: last.filter(d => d.present.includes(s.uid)).length, total: last.length };
  }, [s.attendance, s.uid]);
  const month = monthAttendance(s.attendance, s.uid);
  const real: string[] = Array.isArray(s.data?.samosiReal) ? s.data!.samosiReal : [];
  const outfit = samosiDone(real);
  const lastMark = Object.values(readManeraReview(s.data?.maneraReview)).reduce((m, x) => Math.max(m, x.at || 0), 0);

  const me = auth.user!;
  const others = s.uid !== me.uid;
  // who they are to the chat: the class member, else what the page knows
  const person = (): ClassMember => s.member || { uid: s.uid, name: s.name, photoURL: s.photoURL };
  const meHere = () => {
    const p = s.cls?.teachers.find(t => t.uid === me.uid);
    return { uid: me.uid, name: p?.name || kaName(me.displayName) || '', photoURL: p?.photoURL || me.photoURL || '' };
  };
  const chatId = async () => {
    const m = person();
    const other = { uid: m.uid, name: m.name || s.name, photoURL: m.photoURL || s.photoURL };
    return s.cls && s.cls.teacherIds.includes(me.uid) ? openThread(meHere(), other, s.cls.id) : openAdminThread(other);
  };
  const write = async () => {
    setNote('');
    try { openDm(await chatId()); } catch (e) {
      console.warn('dm: ', e);
      setNote('პირადი ჩათი ვერ გაიხსნა. სცადეთ მოგვიანებით.');
    }
  };
  // the app's own call into that chat, as the chat's call button starts it (voice)
  const call = async () => {
    setNote('');
    try { wantCall.current = true; setCallId(await chatId()); } catch (e) {
      wantCall.current = false;
      console.warn('dm: ', e);
      setNote('ზარი ვერ დაიწყო. სცადეთ მოგვიანებით.');
    }
  };
  useEffect(() => {
    if (!callId || !thread || !wantCall.current) return;
    wantCall.current = false;
    if (mayStartChatCall(thread, me.uid)) void startChatCall(thread, me, 'audio');
  }, [callId, thread, me]);

  const remove = async () => {
    if (!s.cls) return;
    const m = person();
    if (!(await askConfirm({ title: `ამოვიღო „${m.name || s.name}“ კლასიდან?`, text: 'მისი ანგარიში და ნასწავლი არ წაიშლება.', ok: 'ამოღება', danger: true }))) return;
    try {
      await removeClassMember(s.cls, s.uid);
      setWin(null);
      handleGoBack();
    } catch {
      setNote('წევრი ვერ ამოიღო.');
    }
  };

  const voice = voiceLine(s.data);
  const open = (sub?: 'gza' | 'ostatoba') => openMapItem(studentItem(s.uid, s.classId, sub));

  return (
    <Frame>
      <TopBar
        title="მოსწავლე"
        onBack={handleGoBack}
        right={<RoundButton label="მეტი" onClick={() => setWin('more')}><MoreHorizontal /></RoundButton>}
      />
      <Card className="flex items-center gap-3.5">
        <Avatar name={s.name} photo={s.photoURL} size={64} />
        <div className="min-w-0 flex-1">
          <h2 className="text-title leading-tight font-bold wrap-break-word">{s.name}</h2>
          <div className="text-meta text-mut wrap-break-word">{[s.cls?.name, voice].filter(Boolean).join(' · ')}</div>
        </div>
      </Card>

      <Stats items={[
        { value: `${learned} / ${items.length}`, label: 'საგანძური' },
        { value: `${today.done} / ${habitsAll}`, label: 'ჩვევები' },
        { value: att.total ? `${att.came} / ${att.total}` : '—', label: 'დასწრება' },
      ]} />

      {others && (
        <Duo>
          <Button icon={<MessageCircle />} onClick={write}>მიწერე</Button>
          <Button kind="ghost" icon={<Phone />} onClick={call}>დარეკე</Button>
        </Duo>
      )}
      {note && <p className="px-1.5 text-meta font-semibold text-danger">{note}</p>}

      <Rows>
        <Row lead={<Dot icon={<Gem />} />} title="ნასწავლი საგალობლები"
          sub={items.length ? `${items.length} საგალობელი · ${voices} ხმა` : 'ჯერ არ არის'} onClick={() => open('gza')} />
        <Row lead={<Dot icon={<Star />} />} title="ოსტატობის შეფასება"
          sub={lastMark ? `ბოლოს: ${markDate(lastMark)}` : 'ჯერ არ შეფასებულა'} onClick={() => open('ostatoba')} />
        <Row lead={<Dot icon={<CheckCheck />} />} title="დასწრება"
          sub={month.total ? `ამ თვეში ${month.came} / ${month.total}` : 'ამ თვეში არ მონიშნულა'} onClick={() => setWin('attendance')} />
        <Row lead={<Dot icon={<Shirt />} />} title="სამოსი"
          sub={`${outfit} / ${SAMOSI_TOTAL}`} onClick={() => setWin('outfit')} />
      </Rows>

      <MoreSheet
        open={win === 'more'}
        onClose={() => setWin(null)}
        s={s}
        onRemove={s.cls ? remove : undefined}
        onError={setNote}
      />
      <AttendanceSheet open={win === 'attendance'} onClose={() => setWin(null)} uid={s.uid} days={s.attendance} />
      <OutfitSheet open={win === 'outfit'} onClose={() => setWin(null)} data={s.data} />
    </Frame>
  );
};
