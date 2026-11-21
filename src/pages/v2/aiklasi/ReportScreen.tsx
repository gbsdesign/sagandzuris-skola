import React, { useMemo, useState } from 'react';
import { Info, Pencil } from 'lucide-react';
import { useAuth, useNavigation } from '../../../context';
import {
  Avatar, Button, Helper, Note, RoundButton, Row, Rows, SectionLabel, Small, Stats, TopBar, type SmallTone,
} from '../../../components/ui2';
import { askConfirm } from '../../../components/ui/kit';
import { pieceName } from '../../../components/learn/LearnReview';
import type { ClassMember, SchoolClass } from '../../../hooks/useClasses';
import { useAccess } from '../../../hooks/useAccess';
import { useAssignments, useAttendanceState, useClassStudents } from '../../../hooks/useTeaching';
import { markAiErred, removeAiPass } from '../../../hooks/useConfirmations';
import { georgiaToday } from '../../../utils/psalter';
import { shortDate } from '../../../utils/dateNames';
import { errorText } from '../../../utils/errorText';
import {
  classWeek, rangeLabel, statusWord, stuckLine, weekReport, type AiPassSeen, type ClassWeek, type WeekRow, type WeekStatus,
} from '../../../utils/weekReport';
import { AI_NOTE } from '../klasi/nav';
import { LetterSheet } from './LetterSheet';

// „კვირის შეჯამება“ (boards x-idea-kvira · x-idea-kvira-2; the AI teacher's x-ai-angarishi is its lower part): the class's
// week on one screen for its teachers and admins, with or without the AI teacher — who practised, the lessons' attendance,
// the assignments done; then „ყურადღება“ and „კარგად მიდის“, a tap on a name = a ready letter (LetterSheet, which also leads
// to the student's page). While the AI teacher is on: „რა შენიშნა AI-მ“ — each member's lessons with it (a tap opens the
// student's page) — and its judgements, each with „AI შეცდა“: a pass is taken off as on the student's page (removeAiPass), a
// „stuck“ stops counting for that week (students.aiErred, markAiErred — the Monday notice skips it too).
// Counted by utils/weekReport.ts `classWeek`; the Monday notice comes from the reminders Worker (x-idea-kvira-0).

const TONE: Record<WeekStatus, SmallTone> = { good: 'leaf', help: 'gold', skip: 'mut' };
const ROMAN: Record<string, string> = { '1': 'I', '2': 'II', '3': 'III' };

type Members = { uid: string; name: string; data?: Record<string, any> }[];

export const ReportScreen: React.FC<{ cls: SchoolClass }> = ({ cls }) => {
  const aiOn = useAccess().on('aiTeacher');
  const records = useClassStudents(cls);
  const { days: attendance, ready } = useAttendanceState(cls.id);
  const assignments = useAssignments(cls.id);
  const today = georgiaToday();

  const members = useMemo(
    () => cls.members.map(m => ({ uid: m.uid, name: m.name, data: records[m.uid]?.data })),
    [cls.members, records],
  );
  const loaded = cls.memberIds.every(uid => records[uid]) && ready;
  const week = useMemo(
    () => classWeek({ members, attendance, assignments, today, ai: aiOn }),
    [members, attendance, assignments, today, aiOn],
  );

  return <ReportView cls={cls} week={week} members={members} loaded={loaded} aiOn={aiOn} />;
};

/** The screen itself, drawn from the counted week. */
export const ReportView: React.FC<{
  cls: SchoolClass;
  week: ClassWeek;
  members: Members;
  loaded: boolean;
  aiOn: boolean;
}> = ({ cls, week, members, loaded, aiOn }) => {
  const { handleGoBack, openMapItem, openStudent } = useNavigation();
  const [open, setOpen] = useState<string | null>(null);
  const [problem, setProblem] = useState('');

  const memberOf = (uid: string): ClassMember => cls.members.find(m => m.uid === uid) || { uid, name: 'მოსწავლე' };
  const row = open ? week.rows.find(r => r.uid === open) ?? null : null;

  const people = (list: WeekRow[]) => (
    <Rows>
      {list.map(r => (
        <Row
          key={r.uid}
          lead={<Avatar name={r.name} photo={memberOf(r.uid).photoURL} />}
          title={r.short}
          sub={r.line}
          wrap
          onClick={() => setOpen(r.uid)}
        />
      ))}
    </Rows>
  );

  return (
    <div className="flex w-full flex-col gap-3 pb-6">
      <TopBar
        title="კვირის შეჯამება"
        sub={`${cls.name} · ${rangeLabel(week)}`}
        onBack={handleGoBack}
        right={aiOn ? <RoundButton label="მითითება AI-ს" onClick={() => openMapItem(AI_NOTE)}><Pencil /></RoundButton> : undefined}
      />
      <Stats items={[
        { value: loaded ? `${week.practised} / ${week.members}` : '—', label: 'ივარჯიშა' },
        { value: week.attendance === null ? '—' : `${week.attendance}%`, label: 'დასწრება' },
        { value: loaded && week.workDone !== null ? week.workDone : '—', label: 'ნამუშევარი' },
      ]} />

      {loaded && week.attention.length > 0 && (
        <>
          <SectionLabel label="ყურადღება" />
          {people(week.attention)}
        </>
      )}
      {loaded && week.good.length > 0 && (
        <>
          <SectionLabel label="კარგად მიდის" />
          {people(week.good)}
        </>
      )}
      {!cls.members.length && <Note className="py-4 text-center">კლასში ჯერ მოსწავლე არ არის.</Note>}
      {!loaded && cls.members.length > 0 && <Note className="py-4 text-center">იტვირთება…</Note>}

      <Note>მოდის ორშაბათ დილით. ითვლება აპის ჩანაწერებიდან.</Note>

      {aiOn && loaded && cls.members.length > 0 && (
        <AiPart cls={cls} members={members} week={week} setProblem={setProblem} onOpen={uid => openStudent(uid, cls.id)} />
      )}
      {problem && <p role="alert" className="px-1.5 text-meta font-semibold text-danger">{problem}</p>}

      {row && (
        <LetterSheet
          cls={cls}
          row={row}
          member={memberOf(row.uid)}
          onClose={() => setOpen(null)}
          onStudent={() => { setOpen(null); openStudent(row.uid, cls.id); }}
        />
      )}
    </div>
  );
};

/** „რა შენიშნა AI-მ“: each member's week with the AI teacher (x-ai-angarishi) and its judgements, each with „AI შეცდა“. */
const AiPart: React.FC<{
  cls: SchoolClass;
  members: Members;
  week: ClassWeek;
  setProblem: (text: string) => void;
  onOpen: (uid: string) => void;
}> = ({ cls, members, week, setProblem, onOpen }) => {
  const { user } = useAuth();
  // the AI teacher's own lines over the same seven days
  const ai = useMemo(() => weekReport(members, week.to), [members, week.to]);
  const photo = (uid: string) => cls.members.find(m => m.uid === uid)?.photoURL;
  const stuck = week.rows.filter(r => r.stuck);
  const erred = week.rows.filter(r => r.erred);
  const passes = week.rows.flatMap(r => r.passes.map(p => ({ r, p })));
  const where = (s: NonNullable<WeekRow['stuck']>) => `${stuckLine(s)}${s.piece ? ` · ${pieceName(s.piece)}` : ''}`;

  const markStuck = (r: WeekRow, wrong: boolean) => {
    setProblem('');
    markAiErred(r.uid, wrong ? week.to : null, user?.uid ?? '').catch(e => setProblem('ვერ შეინახა: ' + errorText(e)));
  };
  const passOff = async (r: WeekRow, p: AiPassSeen) => {
    const ok = await askConfirm({
      title: `AI შეცდა — ${pieceName(p.variantId)} · ${ROMAN[p.voice]} ხმა?`,
      text: `${r.first}ს ჩათვლა მოეხსნება: მარგალიტი ისევ „გაპრიალებული“ იქნება და გამოცდას ხელახლა ჩააბარებს.`,
      ok: 'მოხსნა',
    });
    if (!ok) return;
    setProblem('');
    removeAiPass(r.uid, p.variantId, p.voice).catch(e => setProblem('ვერ მოიხსნა: ' + errorText(e)));
  };
  const button = (label: string, onClick: () => void) => (
    <Button kind="quiet" size="md" className="px-3" onClick={onClick}>{label}</Button>
  );

  const active = ai.rows.filter(r => r.status !== 'skip');
  const skipped = ai.rows.filter(r => r.status === 'skip');

  return (
    <>
      <SectionLabel label="რა შენიშნა AI-მ" right={<Small>{ai.totals.lessons} გაკვეთილი · {ai.totals.practice}</Small>} />
      {/* those who had no lesson with it are one line, not a row each (a quiet week was the whole class twice on this page) */}
      {active.length > 0 && <Rows>
        {active.map(r => (
          <Row
            key={r.uid}
            lead={<Avatar name={r.name} photo={photo(r.uid)} />}
            title={r.name.split(' ')[0]}
            sub={r.line}
            right={<Small tone={TONE[r.status]} bold>{statusWord(r.status)}</Small>}
            onClick={() => onOpen(r.uid)}
          />
        ))}
      </Rows>}
      {skipped.length > 0 && (
        <Note>{active.length
          ? `ავტომატურ სასწავლო პროგრამასთან ამ კვირაში არ უვარჯიშია: ${skipped.map(r => r.name.split(' ')[0]).join(', ')}.`
          : 'ავტომატურ სასწავლო პროგრამასთან ამ კვირაში არავის უვარჯიშია.'}</Note>
      )}
      {active.length > 0 && <Helper icon={<Info />}>შეეხე სახელს: მოუსმენ საუკეთესო ჩანაწერს და ნახავ, რა უთხრა AI-მ.</Helper>}
      {(stuck.length > 0 || erred.length > 0 || passes.length > 0) && (
        <>
          <SectionLabel label="AI-ს შეფასება" />
          <Rows>
            {stuck.map(r => (
              <Row key={`s-${r.uid}`} wrap title={r.short} sub={where(r.stuck!)} right={button('AI შეცდა', () => markStuck(r, true))} />
            ))}
            {erred.map(r => (
              <Row key={`w-${r.uid}`} wrap title={r.short} sub={`${where(r.erred!)} — AI შეცდა, აღარ ითვლება`}
                right={button('დაბრუნება', () => markStuck(r, false))} />
            ))}
            {passes.map(({ r, p }) => (
              <Row key={`p-${r.uid}-${p.variantId}-${p.voice}`} wrap title={r.short}
                sub={`ჩათვალა AI-მ: ${pieceName(p.variantId)} · ${ROMAN[p.voice]} ხმა · ${shortDate(p.at)}`}
                right={button('AI შეცდა', () => { void passOff(r, p); })} />
            ))}
          </Rows>
          <Helper icon={<Info />}>თუ AI შეცდა, დააჭირე „AI შეცდა“ — მის შეფასებას აღარ ჩავთვლით. ჩათვლის მოხსნას მოსწავლეც ხედავს.</Helper>
        </>
      )}
    </>
  );
};
