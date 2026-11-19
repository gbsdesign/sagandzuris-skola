import React, { useMemo } from 'react';
import { Info } from 'lucide-react';
import { Helper, Rows, SectionLabel, Small, TopBar } from '../../../components/ui2';
import { roleOf } from '../../../components/admin/PersonSheet';
import { teachSummary, useLastLessons } from '../../../components/admin/TeacherOverview';
import type { UserRecord } from '../../../components/admin/UsersTab';
import { useAdmin } from './ctx';
import { personItem } from './nav';
import { PersonRow, Screen, dayWords } from './parts';

type Line = { u: UserRecord; t: NonNullable<ReturnType<typeof teachSummary>>; admin: boolean };

/** x-admini-mastsavleblebi — who teaches: on top those who want a look (no class, or no lesson for two weeks), then the
 *  rest; each row says what they lead, the right end when the last lesson was marked. A tap opens the person. */
export const TeachersScreen: React.FC = () => {
  const { d, test, go, back } = useAdmin();
  // every teacher, and the admins who lead a class too (an admin without one needs none)
  const people = useMemo(() => d.users.filter(u => test.teacher(u) || (test.admin(u) && d.classes.some(c => c.teacherIds.includes(u.userId)))),
    [d.users, d.classes, test]);
  const last = useLastLessons(d.classes.filter(c => c.teacherIds.length).map(c => c.id), people.length > 0);

  const lines = people
    .map(u => {
      const admin = roleOf(u, d.staff) !== 'teacher';
      const t = teachSummary(u.userId, d.classes, last, !admin);
      return t ? { u, t, admin } : null;
    })
    .filter((x): x is Line => !!x)
    .sort((a, b) => a.u.name.localeCompare(b.u.name, 'ka'));
  const care = lines.filter(x => x.t.stale);
  const rest = lines.filter(x => !x.t.stale);

  const row = ({ u, t, admin }: Line) => {
    const what = !t.mine.length ? 'კლასი არ აქვს'
      : t.mine.length === 1 ? `${t.mine[0].name} · ${t.members}` : `${t.mine.length} კლასი · ${t.members} მოსწავლე`;
    const right = !t.mine.length ? <Small tone="gold">—</Small>
      : !t.known ? <Small>…</Small>
      : <Small tone={t.stale ? 'gold' : 'ink'}>{t.day ? dayWords(t.day) : 'ჯერ არა'}</Small>;
    return (
      <PersonRow key={u.userId} u={u} sub={admin ? `ადმინი · ${what}` : what} right={right} onClick={() => go(personItem(u.userId))} />
    );
  };

  return (
    <Screen>
      <TopBar title="მასწავლებლები" sub={d.loading ? undefined : `სულ ${lines.length}`} onBack={back} />
      {d.loading ? <Helper>იტვირთება…</Helper> : lines.length === 0 ? (
        <Helper>მასწავლებელი ჯერ არავინ არის. როლს ადამიანის გვერდზე მისცემ — „როლი და უფლებები“.</Helper>
      ) : (
        <>
          {care.length > 0 && <><SectionLabel label={`ყურადღება · ${care.length}`} /><Rows>{care.map(row)}</Rows></>}
          {rest.length > 0 && <><SectionLabel label={care.length ? 'ყველა' : `ყველა · ${rest.length}`} /><Rows>{rest.map(row)}</Rows></>}
          <Helper icon={<Info />}>მარჯვნივ წერია, როდის ჩაიწერა ბოლო გაკვეთილი. ოქროსფრად — კლასი არ აქვს ან ორ კვირაზე მეტია გაკვეთილი არ ჩაუწერია.</Helper>
        </>
      )}
    </Screen>
  );
};
