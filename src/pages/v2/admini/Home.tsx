import React, { useMemo, useState } from 'react';
import { ChevronRight, CircleCheck, ListFilter, SlidersHorizontal, Sparkles, WifiOff } from 'lucide-react';
import { useAuth } from '../../../context';
import {
  Button, Dot, Helper, Pill, Press, Row, Rows, SectionLabel, Sheet, Small, TopBar, cx, FOCUS_IN,
} from '../../../components/ui2';
import { openAssistant, useAssistantAllowed } from '../damkhmare/open';
import { CHIPS, type Filter, type UserRecord } from '../../../components/admin/UsersTab';
import { SearchBox } from '../klasi/teacher/SearchBox';
import { useAdmin } from './ctx';
import { peopleItem, personItem, schoolItem } from './nav';
import { PersonRow, Screen } from './parts';
import { usePersonLine } from './People';

/** The filters the panel offers, in the old chips' order; „ყველა“, „აქტიური კვირაში“ and „ელოდება“ were its big numbers. */
export const FILTER_NAMES: Partial<Record<Filter, string>> = {
  all: 'ყველა', week: 'აქტიური კვირაში', pending: 'ელოდება დაშვებას',
  ...Object.fromEntries(CHIPS.map(c => [c.id, c.label])),
};

/** x-admini — the panel: four numbers, what wants a look, the members with a search and „ფილტრი“. */
export const AdminHome: React.FC = () => {
  const { isOwner, isSuperAdmin } = useAuth();
  const { d, test, go, back } = useAdmin();
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState(false);
  const line = usePersonLine();
  // „სკოლის AI დამხმარე“ (pages/v2/damkhmare): only while the school's „AI მასწავლებელი“ switch is open
  const assistant = useAssistantAllowed();

  const usersIn = !d.loading && !d.failed.users;
  const count = (f: Filter) => d.users.filter(test[f]).length;
  const numbers: { label: string; n: number | null; tone?: 'gold'; open: () => void }[] = [
    { label: 'წევრი', n: usersIn ? count('all') : null, open: () => go(peopleItem()) },
    { label: 'აქტიური', n: usersIn && d.staffLoaded ? count('week') : null, open: () => go(peopleItem('week')) },
    isSuperAdmin
      ? { label: 'ელოდება', n: usersIn && d.accessLoaded && !d.failed.access ? d.waiting : null, tone: d.waiting > 0 ? 'gold' : undefined, open: () => go(peopleItem('pending')) }
      : { label: 'მასწავლებელი', n: usersIn && d.staffLoaded ? count('teacher') : null, open: () => go('teachers') },
    { label: 'კლასი', n: d.loadingClasses || d.classesFailed ? null : d.classes.length, open: () => go('classes') },
  ];

  // what waits for the admin, each with its way there (only once every list came, so no number flashes wrong)
  const care = !d.ready || d.broken ? [] : [
    ...(isSuperAdmin ? [{ id: 'pending', label: 'ელოდება დაშვებას', n: d.waiting, open: () => go(peopleItem('pending')) }] : []),
    { id: 'noClass', label: 'კლასის გარეშე', n: d.membersWithoutClass, open: () => go(peopleItem('noClass')) },
    { id: 'away', label: '30+ დღე არ შემოსულა', n: count('away'), open: () => go(peopleItem('away')) },
    { id: 'twins', label: 'შესაძლო ორმაგი', n: count('twins'), open: () => go(peopleItem('twins')) },
    { id: 'incomplete', label: 'პროფილი არასრული', n: count('incomplete'), open: () => go(peopleItem('incomplete')) },
    { id: 'lead', label: 'კლასს მასწავლებელი არ ჰყავს', n: d.classesWithoutTeacher, open: () => go('classes') },
    { id: 'teach', label: 'მასწავლებელს კლასი არ აქვს', n: d.teachersWithoutClass, open: () => go('teachers') },
  ].filter(x => x.n > 0);

  // the list under the search: the waiting first, then the most recently here; a search looks through everyone
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    const wait = (u: UserRecord) => test.pending(u);
    const list = d.users
      .filter(u => (s ? `${u.name} ${u.displayName} ${u.email} ${u.city} ${u.region} ${u.phone}`.toLowerCase().includes(s) : test.all(u)))
      .sort((a, b) => Number(wait(b)) - Number(wait(a)) || (b.lastActiveAt || '').localeCompare(a.lastActiveAt || ''));
    return s ? list.slice(0, 50) : list.slice(0, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.users, q, test]);

  const filterRows = (['all', 'week', ...(isSuperAdmin ? ['pending' as Filter] : []), ...CHIPS.map(c => c.id)] as Filter[])
    .map(f => ({ f, n: count(f) }))
    .filter(x => x.f === 'all' || x.n > 0);

  return (
    <Screen>
      <TopBar title="ადმინის პანელი" sub={isOwner ? 'მფლობელი' : isSuperAdmin ? 'სუპერადმინი' : 'ადმინი'} onBack={back}
        right={<Button kind="ghost" size="md" icon={<SlidersHorizontal className="text-wine" />} onClick={() => go(schoolItem())}>სკოლა</Button>} />

      <div className="flex shrink-0 divide-x divide-line overflow-hidden rounded-card bg-surf">
        {numbers.map(x => (
          <Press key={x.label} onClick={x.open}
            className={cx('flex min-h-[76px] min-w-0 flex-1 cursor-pointer flex-col items-center justify-center px-1 py-3 text-center transition-colors active:bg-soft', FOCUS_IN)}>
            <span className={cx('text-title leading-tight font-bold tabular-nums', x.tone === 'gold' && 'text-gold-ink')}>{x.n ?? '—'}</span>
            <span className="mt-0.5 max-w-full truncate text-meta text-mut">{x.label}</span>
          </Press>
        ))}
      </div>

      {d.broken ? (
        <Helper icon={<WifiOff />} className="text-danger">ზოგი მონაცემი ვერ ჩაიტვირთა — შეამოწმე ინტერნეტი და გახსენი თავიდან.</Helper>
      ) : care.length > 0 ? (
        <>
          <SectionLabel label="ყურადღება" />
          <Rows>
            {care.map(x => (
              <Row key={x.id} title={x.label} onClick={x.open}
                right={<span className="flex shrink-0 items-center gap-2"><Pill className="h-7 px-2.5">{x.n}</Pill><ChevIcon /></span>} />
            ))}
          </Rows>
        </>
      ) : d.ready && (
        <Helper icon={<CircleCheck className="text-leaf" />}>ყველაფერი რიგზეა — არაფერი გელოდება.</Helper>
      )}

      {assistant && (
        <Rows>
          <Row lead={<Dot icon={<Sparkles />} />} title="AI დამხმარე" sub="სთხოვე სიტყვებით — კლასი, წერილები, გეგმა" onClick={() => openAssistant()} />
        </Rows>
      )}

      <SectionLabel label={`წევრები · ${usersIn ? count('all') : '—'}`} className="pt-1"
        right={<Button kind="quiet" size="md" className="-my-2 px-3" onClick={() => go('pick')}>მონიშვნა</Button>} />
      <div className="flex shrink-0 items-center gap-2">
        <div className="min-w-0 flex-1"><SearchBox value={q} onChange={setQ} placeholder="წევრის ძებნა" /></div>
        <Button kind="ghost" icon={<ListFilter className="text-wine" />} onClick={() => setFilters(true)}>ფილტრი</Button>
      </div>
      {d.loading ? (
        <Helper>იტვირთება…</Helper>
      ) : shown.length === 0 ? (
        <Helper>{q.trim() ? 'ვერ მოიძებნა.' : 'აქ ჯერ არავინ არის.'}</Helper>
      ) : (
        <Rows>
          {shown.map(u => <PersonRow key={u.userId} u={u} sub={line(u)} onClick={() => go(personItem(u.userId))} />)}
          {!q.trim() && count('all') > shown.length && (
            <Row title={`ყველა წევრი · ${count('all')}`} sub="ანბანით, ფილტრებით" onClick={() => go(peopleItem())} />
          )}
        </Rows>
      )}

      <Sheet open={filters} onClose={() => setFilters(false)} title="ფილტრი">
        <Rows>
          {filterRows.map(({ f, n }) => (
            <Row key={f} title={FILTER_NAMES[f] || f}
              right={<span className="flex shrink-0 items-center gap-2"><Small>{n}</Small><ChevIcon /></span>}
              onClick={() => { setFilters(false); go(f === 'teacher' ? 'teachers' : peopleItem(f)); }} />
          ))}
        </Rows>
      </Sheet>
    </Screen>
  );
};

export const ChevIcon: React.FC = () => <ChevronRight aria-hidden="true" className="size-[18px] shrink-0 text-mut" strokeWidth={2} />;
