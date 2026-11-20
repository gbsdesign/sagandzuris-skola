import React, { useMemo, useState } from 'react';
import { Archive, ArchiveRestore, Check, ChevronDown, GraduationCap, Loader2, Plus, UserPlus, Users } from 'lucide-react';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAuth, useNavigation } from '../../../context';
import { Avatar, Button, Dot, Field, Helper, RoundButton, Row, Rows, SectionLabel, Sheet, Small, TopBar } from '../../../components/ui2';
import { archiveClass } from '../../../components/admin/ClassesAdmin';
import { useClassAttendance, useGroupReading } from '../../../components/admin/StatsTab';
import type { SchoolClass } from '../../../hooks/useClasses';
import type { PsalterGroup } from '../../../hooks/usePsalter';
import { KATHISMA_COUNT } from '../../../utils/psalter';
import { logChange } from '../../../utils/adminLog';
import { errorText } from '../../../utils/errorText';
import { shortDate } from '../../../utils/dateNames';
import { triggerHaptic } from '../../../utils/haptics';
import { SearchBox } from '../klasi/teacher/SearchBox';
import { useAdmin, useKeptText } from './ctx';
import { peopleItem } from './nav';
import { Screen } from './parts';

const SHORT = 3;
// „თამარ ჯ.“ — a teacher's first name and the first letter of the second
const shortName = (name: string) => {
  const [a, b] = name.trim().split(/\s+/);
  return b ? `${a} ${Array.from(b)[0]}.` : a || '';
};

/** x-admini-klasebi · x-savse-klasebi — the classes, one line each; with many: a search, today's lessons on top and the
 *  rest folded after three. „+“ = a new class (x-akhali-klasi: the name only, then its page). The archive is one more line. */
export const ClassesScreen: React.FC<{ archive: boolean }> = ({ archive }) => {
  const { user } = useAuth();
  const { openClass } = useNavigation();
  const { d, go, back, say } = useAdmin();
  const [q, setQ] = useKeptText('classes');
  const [more, setMore] = useState(false);
  const [naming, setNaming] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [restoring, setRestoring] = useState<string | null>(null);

  // a new class: made with its name, then everything else is set on its page (rules: admins only)
  const create = async () => {
    const name = (naming || '').trim();
    if (!name) { setErr('კლასს სახელი სჭირდება.'); return; }
    setSaving(true);
    setErr('');
    try {
      const ref = doc(collection(db, 'classes'));
      const now = new Date().toISOString();
      await setDoc(ref, {
        name, logo: '', teacherIds: [], teachers: [], memberIds: [], members: [], program: [], classMode: false, defaultShortcuts: [],
        createdAt: now, createdBy: user?.email || '', updatedAt: now,
      });
      triggerHaptic(30);
      logChange('class', `კლასი „${name}“ შეიქმნა`, ref.id);
      setNaming(null);
      openClass(ref.id);
    } catch (e) {
      setErr('კლასი ვერ შეიქმნა: ' + errorText(e));
    } finally {
      setSaving(false);
    }
  };

  const restore = async (c: SchoolClass) => {
    setRestoring(c.id);
    try {
      const n = await archiveClass(c, false, d.classes);
      triggerHaptic(30);
      say(`კლასი „${c.name}“ დაბრუნდა.${n ? ` ${n} წევრის ჩანაწერი ვერ განახლდა — პანელის შემდეგ გახსნაზე გასწორდება.` : ''}`, 'success');
      logChange('archive', `კლასი „${c.name}“ არქივიდან დაბრუნდა`, c.id);
    } catch (e) {
      say('კლასი ვერ დაბრუნდა: ' + errorText(e), 'error');
    } finally {
      setRestoring(null);
    }
  };

  const today = new Date().getDay();
  const startToday = (c: SchoolClass) => c.schedule.filter(s => s.day === today).map(s => s.start).sort()[0] || '';
  const s = q.trim().toLowerCase();
  const found = useMemo(() => d.classes.filter(c => !s || `${c.name} ${c.teachers.map(t => t.name).join(' ')}`.toLowerCase().includes(s)),
    [d.classes, s]);
  const todays = found.filter(startToday).sort((a, b) => startToday(a).localeCompare(startToday(b)));
  const rest = found.filter(c => !startToday(c));
  const many = d.classes.length > 6;
  const groupOf = (c: SchoolClass) => d.groups.find(g => g.id === c.psalterGroupId);
  const row = (c: SchoolClass, withTime?: boolean) => (
    <ClassRow key={c.id} c={c} group={groupOf(c)} time={withTime ? startToday(c) : ''} onOpen={() => openClass(c.id)} />
  );

  if (archive) {
    return (
      <Screen>
        <TopBar title="არქივი" sub="დამალული კლასები — არაფერი წაშლილა" onBack={back} />
        {d.archived.length === 0 ? <Helper>არქივში კლასი არ არის.</Helper> : (
          <Rows>
            {d.archived.map(c => (
              <Row key={c.id} lead={<Avatar name={c.name} photo={c.logo || undefined} />} title={c.name}
                sub={`${c.members.length} წევრი${c.archivedAt ? ` · ${shortDate(c.archivedAt)}` : ''}`}
                right={<Button kind="soft" size="md" disabled={restoring === c.id} onClick={() => void restore(c)}
                  icon={restoring === c.id ? <Loader2 className="animate-spin" /> : <ArchiveRestore />}>დაბრუნება</Button>} />
            ))}
          </Rows>
        )}
        <Helper>არქივში კლასი და მისი ფსალმუნთა ჯგუფი არავის უჩანს. ჩატი, დასწრება და დავალებები შენახულია — „დაბრუნება“ ყველაფერს აბრუნებს.</Helper>
      </Screen>
    );
  }

  const care = !d.ready || d.broken ? [] : [
    { id: 'class', icon: <UserPlus />, text: `${d.membersWithoutClass} წევრი კლასის გარეშეა`, n: d.membersWithoutClass, open: () => go(peopleItem('noClass')) },
    { id: 'lead', icon: <GraduationCap />, text: `${d.classesWithoutTeacher} კლასს მასწავლებელი არ ჰყავს`, n: d.classesWithoutTeacher, open: () => setQ('') },
    { id: 'teach', icon: <GraduationCap />, text: `${d.teachersWithoutClass} მასწავლებელს კლასი ან ჯგუფი არ აქვს`, n: d.teachersWithoutClass, open: () => go('teachers') },
  ].filter(x => x.n > 0);

  return (
    <Screen>
      <TopBar title="კლასები" sub={many ? `სულ ${d.classes.length}` : undefined} onBack={back}
        right={<RoundButton label="ახალი კლასი" onClick={() => { setErr(''); setNaming(''); }}><Plus /></RoundButton>} />
      {care.map(x => (
        <Rows key={x.id} className="bg-tint">
          <Row lead={<Dot icon={x.icon} color="tint" className="bg-transparent" />} title={x.text} wrap onClick={x.open} />
        </Rows>
      ))}
      {d.loadingClasses ? <Helper>იტვირთება…</Helper> : d.classesFailed ? (
        <Helper className="text-danger">კლასები ვერ ჩაიტვირთა — შეამოწმე ინტერნეტი და გახსენი თავიდან.</Helper>
      ) : d.classes.length === 0 ? (
        <Helper>{d.archived.length ? 'გამოყენებაში კლასი არ არის — დააბრუნე არქივიდან ან შექმენი ახალი.' : 'კლასი ჯერ არ შექმნილა. შექმენი პირველი და დაამატე წევრები.'}</Helper>
      ) : many ? (
        <>
          <SearchBox value={q} onChange={setQ} placeholder="კლასი ან მასწავლებელი" />
          {todays.length > 0 && <><SectionLabel label={`დღეს აქვთ გაკვეთილი · ${todays.length}`} /><Rows>{todays.map(c => row(c, true))}</Rows></>}
          {rest.length > 0 && (
            <>
              <SectionLabel label={`${todays.length ? 'დანარჩენი' : 'კლასები'} · ${rest.length}`} />
              <Rows>{(more || s ? rest : rest.slice(0, SHORT)).map(c => row(c))}</Rows>
              {!more && !s && rest.length > SHORT && (
                <Button kind="ghost" full icon={<ChevronDown />} onClick={() => setMore(true)}>კიდევ {rest.length - SHORT} კლასი</Button>
              )}
            </>
          )}
          {found.length === 0 && <Helper>ვერ მოიძებნა.</Helper>}
        </>
      ) : (
        <Rows>{d.classes.map(c => row(c))}</Rows>
      )}
      {d.archived.length > 0 && (
        <Rows><Row lead={<Dot icon={<Archive />} />} title={`არქივი · ${d.archived.length}`} sub="დამალული კლასები" onClick={() => go('classes~archive')} /></Rows>
      )}

      <Sheet open={naming !== null} onClose={() => setNaming(null)} title="ახალი კლასი">
        <Field label="კლასის სახელი" value={naming || ''} onChange={setNaming} placeholder="მაგ. გურჯაანის ჯგუფი" autoFocus
          onKeyDown={e => { if (e.key === 'Enter') void create(); }}
          hint="ლოგოს, მასწავლებლებს, ცხრილს, პროგრამას და წევრებს მერე დაამატებ — კლასის გვერდზე." />
        {err && <p role="alert" className="px-1.5 text-meta text-danger">{err}</p>}
        <Button full icon={saving ? <Loader2 className="animate-spin" /> : <Check />} onClick={() => void create()} disabled={saving || !(naming || '').trim()}>
          შექმნა და გახსნა
        </Button>
      </Sheet>
    </Screen>
  );
};

/** One class: its mark, name, and one grey line — members, attendance, its teacher (or that it has none), the psalter. */
const ClassRow: React.FC<{ c: SchoolClass; group?: PsalterGroup; time: string; onOpen: () => void }> = ({ c, group, time, onOpen }) => {
  const { rate, last } = useClassAttendance(c);
  const reading = useGroupReading(group ?? NO_GROUP);
  const teacher = c.teachers.length
    ? c.teachers.map(t => shortName(t.name)).join(', ')
    : <span className="font-semibold text-gold-ink">მასწავლებელი არ ჰყავს</span>;
  const facts = [
    time ? '' : `${c.members.length} წევრი`,
    rate !== null ? `დასწრება ${rate}%` : last ? `ბოლო გაკვეთილი ${shortDate(`${last}T12:00:00`)}` : '',
    group && reading ? `კანონი ${reading.avg.toFixed(1)}/${KATHISMA_COUNT}` : '',
  ].filter(Boolean).join(' · ');
  return (
    <Row lead={<Avatar name={c.name} photo={c.logo || undefined} />} title={c.name} onClick={onOpen}
      sub={<>{teacher}{time ? ` · ${time}` : ''}{facts ? ` · ${facts}` : ''}</>}
      right={time ? <span className="flex shrink-0 items-center gap-2"><Small><Users className="mr-1 inline size-3.5" />{c.members.length}</Small></span> : undefined} />
  );
};

// a class with no group still calls the hook (hooks run in the same order every time); this one reads nothing
const NO_GROUP = { id: '', cycleDays: 1, shiftDays: 0, startDate: '9999-12-31' } as unknown as PsalterGroup;
