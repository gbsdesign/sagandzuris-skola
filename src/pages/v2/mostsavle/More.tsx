import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { Baby, Eye, GraduationCap, UserMinus } from 'lucide-react';
import { db } from '../../../firebase';
import { useAccess } from '../../../hooks/useAccess';
import { useAuth } from '../../../context';
import { Button, Card, Dot, Note, Row, Rows, SectionLabel, Sheet, TopBar, ToggleRow, WrapChips } from '../../../components/ui2';
import { DEFAULT_KIDS_SECTIONS, KidsMode, SECTIONS, SectionId } from '../../../data/sections';
import { syncKidsFlag } from '../../../hooks/useDirectChat';
import { computeMonthlyStats } from '../../../hooks/useMonthlyStudyStats';
import { dayKey, lastDays } from '../../../utils/habitsWeek';
import { abilitiesText, interestsText } from '../../../utils/profileFields';
import { abituriText } from '../../../components/teacher/StudentsOverview';
import { DrillReview } from '../../../components/mastery/DrillReview';
import { LearnReview } from '../../../components/learn/LearnReview';
import { MedavitneReview } from '../../../components/learn/MedavitneReview';
import { PathPageBody } from '../../../components/views/PathPageBody';
import { StudentProfileCard } from '../../../components/views/StudentProfileCard';
import { ChemiSamosi } from '../../../components/views/ChemiSamosi';
import { ShortcutShelf } from '../../../components/home/ShortcutShelf';
import type { StudentData } from './useStudent';
import { useBackToClose } from '../../../utils/backToClose';

// „მეტი“ of the student's page (board x-mostsavle-meti): the facts the old StudentTools / profile showed (habits, the
// working hours, abilities, interests), the kids' mode, „ნახე მისი თვალით“ (the old body of the page: their path and their
// profile inside ViewAsStudent), the takes and reviews the member sent, and „კლასიდან ამოღება“ at the end.
// Attendance and the chants learned are on the page itself, so they are not repeated here.

const Fact: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex gap-3 px-4 py-3">
    <dt className="w-28 shrink-0 text-meta wrap-break-word text-mut">{label}</dt>
    <dd className="min-w-0 flex-1 text-body font-semibold wrap-break-word">{children}</dd>
  </div>
);

export const MoreSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  s: StudentData;
  /** none while the student is in no class of the viewer */
  onRemove?: () => void;
  onError: (t: string) => void;
}> = ({ open, onClose, s, onRemove, onError }) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState(false);
  const [eyes, setEyes] = useState(false);
  const d = s.data || {};
  const profile = d.profile || {};
  const log: Record<string, string[]> = d.habitLog || {};
  const week = lastDays(7).reduce((a, day) => a + (log[dayKey(day)] || []).length, 0);
  const work = computeMonthlyStats(profile.workSchedule || {}, d.completedSessions || {});
  const schedule = Object.entries((profile.workSchedule || {}) as Record<string, string>).filter(([, h]) => h);
  const abituri = abituriText(d.abituri);
  const kids: KidsMode = { on: false, sections: DEFAULT_KIDS_SECTIONS, ...(d.kidsMode || {}) };
  const pages = SECTIONS.filter(x => x.page);

  const setKids = async (next: KidsMode) => {
    try {
      await updateDoc(doc(db, 'students', s.uid), { kidsMode: { ...next, by: user?.uid || '', at: new Date().toISOString() } });
      // classmates' message lists leave a child in the kids' mode out
      void syncKidsFlag(s.uid, !!next.on);
    } catch {
      onError('ვერ შეინახა — მოსწავლის მონაცემებზე წვდომა ჯერ არ არის.');
    }
  };

  return (
    <>
      <Sheet open={open} onClose={onClose} title={s.name}>
        <Card pad="none">
          <dl className="divide-y divide-line">
            <Fact label="ჩვევები">7 დღეში · {week} მონიშვნა</Fact>
            <Fact label="განრიგი">{schedule.length ? schedule.map(([k, h]) => `${k}: ${h}`).join(' · ') : 'არ არის გაწერილი'}</Fact>
            {work.planned > 0 && <Fact label="სამუშაო">{work.worked}/{work.planned} სთ · გამოტოვებული {work.missed}</Fact>}
            <Fact label="შესაძლებლობები">{abilitiesText(profile) || '—'}</Fact>
            <Fact label="ინტერესები">{interestsText(profile) || '—'}</Fact>
            {abituri && <Fact label="აბიტურიენტი">{abituri}</Fact>}
          </dl>
        </Card>

        <Rows>
          <ToggleRow
            lead={<Dot icon={<Baby />} />}
            title="საბავშვო რეჟიმი"
            sub="ნაკლები გვერდი · AI-ს გარეშე"
            on={kids.on}
            onChange={on => setKids({ ...kids, on })}
          />
        </Rows>
        {kids.on && (
          <>
            <SectionLabel label="რა ჩანს" />
            <WrapChips
              label="რა ჩანს საბავშვო რეჟიმში"
              items={pages.map(x => ({ id: x.id, label: x.label }))}
              value={kids.sections}
              onChange={sections => setKids({ ...kids, sections: sections as SectionId[] })}
            />
          </>
        )}

        <Rows>
          <Row lead={<Dot icon={<Eye />} />} title="ნახე მისი თვალით" sub="მისი გზა და პროფილი, როგორც მას უჩანს"
            onClick={() => { onClose(); setEyes(true); }} />
          <Row lead={<Dot icon={<GraduationCap />} />} title="გამოგზავნილი ჩანაწერები" sub="ვარჯიში · სწავლა · მედავითნეობა"
            onClick={() => setReviews(true)} />
        </Rows>

        {onRemove && (
          <Button kind="ghost" full icon={<UserMinus />} onClick={onRemove} className="text-danger">კლასიდან ამოღება</Button>
        )}
      </Sheet>

      <Sheet open={reviews} onClose={() => setReviews(false)} title="გამოგზავნილი ჩანაწერები">
        <Note>აქ ჩანს, რაც მოსწავლემ გამოგზავნა: მოსასმენი ჩანაწერები და „ჩათვლა“. ცარიელია, სანამ არაფერი გამოუგზავნია.</Note>
        <DrillReview uid={s.uid} drillDone={d.drillDone} drillScore={d.drillScore} data={d} />
        <LearnReview uid={s.uid} learning={d.learning} parts={d.learnParts} shine={d.pearlShine} />
        <MedavitneReview uid={s.uid} shine={d.pearlShine} />
      </Sheet>

      {eyes && <HisEyes name={s.name} uid={s.uid} photoURL={s.photoURL} onClose={() => setEyes(false)} />}
    </>
  );
};

/** The old page's body, whole: their „საგანძურის გზა“ and their profile as their own app shows them. Everything here reads
 *  and writes the student's record (it stands inside ViewAsStudent on the page). Under the kit's sheets (z-80). */
const HisEyes: React.FC<{ name: string; uid: string; photoURL: string; onClose: () => void }> = ({ name, uid, photoURL, onClose }) => {
  const access = useAccess();
  // a full-screen layer, not a Sheet: the phone's back closes it (and only it)
  useBackToClose(true, onClose);
  return createPortal(
    <div className="fixed inset-0 z-[70] overflow-y-auto overscroll-contain bg-page px-4 pt-[env(safe-area-inset-top)] pb-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <TopBar title={name} sub="ხედავ ისე, როგორც მას უჩანს" onBack={onClose} />
        <PathPageBody />
        <div className="mx-auto w-full max-w-lg">
          <StudentProfileCard
            member={{ uid, email: '', displayName: name, photoURL }}
            slot={<>
              {access.on('samosi') && <ChemiSamosi side={
                <span className="block">
                  <span className="block text-lead font-bold">სამოსი</span>
                  <span className="block text-meta text-mut">ჩოხა და ქართული კაბა — ნაწილ-ნაწილ</span>
                </span>
              } />}
              <ShortcutShelf variant="profile" />
            </>}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
};
