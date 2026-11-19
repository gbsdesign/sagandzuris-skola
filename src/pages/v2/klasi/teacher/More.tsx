import React, { useState } from 'react';
import { Archive, BookOpen, CalendarDays, Church, ClipboardCheck, ListChecks, Pencil, Sparkles, UserPlus, Users } from 'lucide-react';
import { useAuth, useNavigation } from '../../../../context';
import { useNotes } from '../../../../context/NotesContext';
import { useAllClasses, type LessonSlot, type SchoolClass } from '../../../../hooks/useClasses';
import { useClassGroup } from '../../../../components/psalter/ClassPsalter';
import { openPsalterGroup } from '../../../../components/psalter/selectedGroup';
import { useGroupNow } from '../../../../hooks/usePsalter';
import { KATHISMA_COUNT, readCount } from '../../../../utils/psalter';
import { archiveClass } from '../../../../components/admin/ClassesAdmin';
import { changed } from '../../../../components/admin/changed';
import { askConfirm } from '../../../../components/ui/kit';
import { errorText } from '../../../../utils/errorText';
import { Dot, Row, Rows, Sheet } from '../../../../components/ui2';
import { AI_NOTE, AI_REPORT, CLASS_ORDER } from '../nav';
import { useAccess } from '../../../../hooks/useAccess';
import { NewGroupSheet } from '../../psalmuni/NewGroup';
import { AddMemberSheetV2 } from './AddMember';
import { NameLogoSheet } from './NameLogo';
import { TeachersSheetV2 } from './Teachers';
import { TimetableSheet, slotTime } from './Timetable';

// x-klasi-meti — the teacher's rare jobs in one list, each with a grey line saying what is now. A row opens its own
// window in place of this one (one at a time); closing it comes back here.

const DAY_SHORT = ['კვ', 'ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ'];
const ORDER = [1, 2, 3, 4, 5, 6, 0];

const timetableLine = (slots: LessonSlot[]) => {
  if (!slots.length) return 'ჯერ არ არის';
  const sorted = [...slots].sort((a, b) => ORDER.indexOf(a.day) - ORDER.indexOf(b.day) || a.start.localeCompare(b.start));
  const same = sorted.every(s => slotTime(s) === slotTime(sorted[0]));
  return same
    ? `${sorted.map(s => DAY_SHORT[s.day]).join(', ')} · ${slotTime(sorted[0])}`
    : sorted.map(s => `${DAY_SHORT[s.day]} ${slotTime(s)}`).join(', ');
};

type Sub = 'name' | 'time' | 'member' | 'teachers' | 'group';

/** the psalter group's line: how many kanons are read in this cycle */
const useGroupLine = (cls: SchoolClass) => {
  const { user } = useAuth();
  const group = useClassGroup(cls.psalterGroupId);
  const { slots, loading } = useGroupNow(group, user?.uid);
  return { group, line: group ? (loading ? 'იტვირთება…' : `წაკითხულია ${readCount(slots)} / ${KATHISMA_COUNT}`) : 'ჯერ არ არის — შექმნა' };
};

export const ClassMoreSheet: React.FC<{ cls: SchoolClass; open: boolean; onClose: () => void }> = ({ cls, open, onClose }) => {
  const { isAdmin } = useAuth();
  const aiOn = useAccess().on('aiTeacher');
  const { openMapItem, navigateTo, handleGoBack } = useNavigation();
  const { openProgram } = useNotes();
  const { classes: inUse } = useAllClasses(isAdmin);
  const { group, line: groupLine } = useGroupLine(cls);
  const [sub, setSub] = useState<Sub | null>(null);
  const [problem, setProblem] = useState('');

  const back = () => setSub(null);
  const closeAll = () => { setSub(null); setProblem(''); onClose(); };

  const toArchive = async () => {
    if (!(await askConfirm({
      title: `გადავიტანო „${cls.name}“ არქივში?`,
      text: 'კლასი და მისი ფსალმუნთა ჯგუფი ყველას დაემალება — არაფერი წაიშლება.',
      ok: 'არქივში', danger: true,
    }))) return;
    try {
      // a member's record that could not be set is put right the next time the admin panel opens
      await archiveClass(cls, true, inUse);
      changed('archive', `კლასი „${cls.name}“ არქივში გადავიდა`, cls.id, () => archiveClass(cls, false, inUse));
      closeAll();
      handleGoBack();
    } catch (e) {
      setProblem('კლასი ვერ გადავიდა არქივში: ' + errorText(e));
    }
  };

  const mainOpen = open && !sub;
  return (
    <>
      <Sheet open={mainOpen} onClose={closeAll} title="მეტი">
        <Rows>
          <Row lead={<Dot icon={<Church />} />} title="დღევანდელი წირვა" sub="პროგრამა ტაძრისთვის" onClick={() => { closeAll(); openProgram(); }} />
          <Row lead={<Dot icon={<Pencil />} />} title="სახელი და ლოგო" onClick={() => setSub('name')} />
          <Row lead={<Dot icon={<CalendarDays />} />} title="გაკვეთილების ცხრილი" sub={timetableLine(cls.schedule)} onClick={() => setSub('time')} />
          <Row lead={<Dot icon={<ListChecks />} />} title="სასწავლო პროგრამა" sub={`${cls.program.length} საგალობელი`} onClick={() => { closeAll(); openMapItem(CLASS_ORDER); }} />
          <Row lead={<Dot icon={<ClipboardCheck />} />} title="კვირის შეჯამება" sub="ვინ ივარჯიშა · დასწრება · მზა წერილი" onClick={() => { closeAll(); openMapItem(AI_REPORT); }} />
          {aiOn && (
            <Row lead={<Dot icon={<Sparkles />} />} title="AI მასწავლებელი" sub="მითითება AI-ს" onClick={() => { closeAll(); openMapItem(AI_NOTE); }} />
          )}
          <Row lead={<Dot icon={<UserPlus />} />} title="წევრის დამატება" onClick={() => setSub('member')} />
          {isAdmin && (
            <Row lead={<Dot icon={<Users />} />} title="მასწავლებლები" sub={cls.teachers.length ? `${cls.teachers.length} მასწავლებელი` : 'ჯერ არ ჰყავს'} onClick={() => setSub('teachers')} />
          )}
          <Row
            lead={<Dot icon={<BookOpen />} />}
            title="ფსალმუნთა ჯგუფი"
            sub={groupLine}
            onClick={() => { if (group) { closeAll(); openPsalterGroup(group.id); navigateTo('psalter'); } else setSub('group'); }}
          />
          {isAdmin && <Row lead={<Dot icon={<Archive />} />} tone="danger" title="არქივში გადატანა" onClick={toArchive} />}
        </Rows>
        {problem && <p className="px-1.5 text-meta text-danger">{problem}</p>}
      </Sheet>
      <NameLogoSheet cls={cls} open={open && sub === 'name'} onClose={back} />
      <TimetableSheet cls={cls} open={open && sub === 'time'} onClose={back} edit />
      <AddMemberSheetV2 cls={cls} open={open && sub === 'member'} onClose={back} />
      {isAdmin && <TeachersSheetV2 cls={cls} inUse={inUse} open={open && sub === 'teachers'} onClose={back} />}
      <NewGroupSheet cls={cls} open={open && sub === 'group'} onClose={back} />
    </>
  );
};
