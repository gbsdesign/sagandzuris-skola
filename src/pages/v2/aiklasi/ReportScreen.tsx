import React, { useMemo } from 'react';
import { Info, Pencil } from 'lucide-react';
import { useNavigation } from '../../../context';
import { Avatar, Helper, RoundButton, Row, Rows, Small, Stats, TopBar, type AvatarColor, type SmallTone } from '../../../components/ui2';
import type { SchoolClass } from '../../../hooks/useClasses';
import { useClassStudents } from '../../../hooks/useTeaching';
import { georgiaToday } from '../../../utils/psalter';
import { statusWord, weekReport, type WeekStatus } from '../../../utils/weekReport';
import { AI_NOTE } from '../klasi/nav';

// x-ai-angarishi — the AI teacher's week for a class: three numbers, then a row a member with what they did and a word
// (green „კარგად“, amber „დასახმარი“, grey „გამოტოვა“). A tap opens the student's page; the ✎ goes to the instruction.

const COLORS: AvatarColor[] = ['wine', 'sea', 'leaf', 'plum', 'clay', 'gold'];
const TONE: Record<WeekStatus, SmallTone> = { good: 'leaf', help: 'gold', skip: 'mut' };

export const ReportScreen: React.FC<{ cls: SchoolClass }> = ({ cls }) => {
  const { handleGoBack, openMapItem, openStudent } = useNavigation();
  const records = useClassStudents(cls);
  const today = georgiaToday();
  const { rows, totals } = useMemo(
    () => weekReport(cls.members.map(m => ({ uid: m.uid, name: m.name, data: records[m.uid]?.data })), today),
    [cls.members, records, today],
  );

  return (
    <div className="flex w-full flex-col gap-3 pb-6">
      <TopBar
        title="კვირის ანგარიში"
        sub={`AI მასწავლებელი · ${cls.name}`}
        onBack={handleGoBack}
        right={<RoundButton label="მითითება AI-ს" onClick={() => openMapItem(AI_NOTE)}><Pencil /></RoundButton>}
      />
      <Stats items={[
        { value: totals.members, label: 'მოსწავლე' },
        { value: totals.lessons, label: 'გაკვეთილი' },
        { value: totals.practice, label: 'ვარჯიში' },
      ]} />
      <Rows>
        {rows.map((r, i) => {
          const m = cls.members[i];
          return (
            <Row
              key={r.uid}
              lead={<Avatar name={r.name} photo={m?.photoURL} color={COLORS[i % COLORS.length]} />}
              title={r.name.split(' ')[0]}
              sub={r.line}
              right={<Small tone={TONE[r.status]} bold>{statusWord(r.status)}</Small>}
              onClick={() => openStudent(r.uid, cls.id)}
            />
          );
        })}
      </Rows>
      {!rows.length && <p className="py-6 text-center text-body text-mut">კლასში ჯერ მოსწავლე არ არის.</p>}
      <Helper icon={<Info />}>შეეხე სახელს: მოუსმენ საუკეთესო ჩანაწერს და ნახავ, რა უთხრა AI-მ.</Helper>
    </div>
  );
};
