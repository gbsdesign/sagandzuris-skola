import React, { useMemo, useRef, useState } from 'react';
import { Download, ListChecks } from 'lucide-react';
import { useAuth } from '../../../context';
import { Button, Chips, Helper, RoundButton, Rows, SectionLabel, TopBar } from '../../../components/ui2';
import { CHIPS, exportPeople, within, type Filter, type UserRecord } from '../../../components/admin/UsersTab';
import { roleName, roleOf } from '../../../components/admin/PersonSheet';
import { teachSummary, useLastLessons } from '../../../components/admin/TeacherOverview';
import { ALL_FEATURES } from '../../../utils/memberAccess';
import { whyLabel } from '../../../utils/duplicates';
import { SearchBox } from '../klasi/teacher/SearchBox';
import { useAdmin } from './ctx';
import { peopleItem, personItem } from './nav';
import { PersonRow, Screen, agoWords, dayWords } from './parts';
import { FILTER_NAMES } from './Home';

/** A person's grey line in a list: why they want a look, their class (or e-mail), when they were here. */
export const usePersonLine = () => {
  const { d, statusOf, twins, twinIds } = useAdmin();
  return (u: UserRecord): React.ReactNode => {
    const status = statusOf(u);
    const a = d.access[u.userId];
    if (status === 'pending') return <span className="font-semibold text-gold-ink">ელოდება დაშვებას · {agoWords(a?.requestedAt)}</span>;
    if (status === 'rejected') return <span className="font-semibold text-danger">შეფერხებული · {agoWords(a?.decidedAt)}</span>;
    const role = roleOf(u, d.staff);
    const classes = d.classes.filter(c => c.memberIds.includes(u.userId)).map(c => c.name).join(', ');
    const limited = a && status === 'approved' && a.features !== 'all' ? a.features.filter(x => ALL_FEATURES.includes(x)).length : null;
    const rest = [
      role !== 'member' ? roleName(u, role) : '',
      classes || u.email || 'ელფოსტა არ არის',
      agoWords(u.lastActiveAt),
      limited !== null ? `წვდომა ${limited}/${ALL_FEATURES.length}` : '',
      u.kidsMode?.on ? 'საბავშვო' : '',
      d.left.uids.has(u.userId) ? 'გასული' : '',
    ].filter(Boolean).join(' · ');
    return twinIds.has(u.userId) ? <><span className="font-semibold text-gold-ink">{whyLabel(twins.get(u.userId))} · </span>{rest}</> : rest;
  };
};

// the first letter a name is grouped under
const letterOf = (u: UserRecord) => (Array.from(u.name.trim())[0] || '#').toUpperCase();

/** x-savse-adamianebi — everyone (or one filter) by the alphabet: a search, the filters as chips with their counts, groups
 *  „ა · 41“ and an index at the right; „მონიშვნა“ ticks several; superadmins take the shown list as a table. */
export const PeopleScreen: React.FC<{ filter: Filter; openUid: string | null }> = ({ filter, openUid }) => {
  const { isSuperAdmin } = useAuth();
  const { d, test, statusOf, go, back, wide, say } = useAdmin();
  const [q, setQ] = useState('');
  const line = usePersonLine();

  const count = (f: Filter) => d.users.filter(test[f]).length;
  const chips = (['all', ...(isSuperAdmin ? ['pending' as Filter] : []), 'week', ...CHIPS.map(c => c.id)] as Filter[])
    .map(f => ({ f, n: count(f) }))
    .filter(x => x.f === 'all' || x.n > 0 || x.f === filter);
  const active: Filter = chips.some(c => c.f === filter) ? filter : 'all';

  const s = q.trim().toLowerCase();
  const shown = useMemo(() => {
    const list = d.users
      .filter(u => !s || `${u.name} ${u.displayName} ${u.email} ${u.city} ${u.region} ${u.phone}`.toLowerCase().includes(s))
      .filter(test[active]);
    if (active === 'pending') {
      return list.sort((a, b) => (d.access[a.userId]?.requestedAt || '').localeCompare(d.access[b.userId]?.requestedAt || ''));
    }
    if (s) return list.sort((a, b) => (b.lastActiveAt || '').localeCompare(a.lastActiveAt || ''));
    return list.sort((a, b) => a.name.localeCompare(b.name, 'ka'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.users, s, active, test]);

  // the teachers' overview: under „მასწავლებლები“ / „ადმინები“ a row of one who teaches says what they lead
  const teachView = active === 'teacher' || active === 'admin';
  const last = useLastLessons(d.classes.filter(c => c.teacherIds.length).map(c => c.id), teachView);
  const subOf = (u: UserRecord) => {
    if (teachView) {
      const t = teachSummary(u.userId, d.classes, last, roleOf(u, d.staff) === 'teacher');
      if (t) {
        const text = t.mine.length ? `${t.mine.length} კლასი · ${t.members} წევრი${t.known ? ` · ბოლო გაკვეთილი ${t.day ? dayWords(t.day) : 'ჯერ არა'}` : ''}` : 'კლასი არ აქვს';
        return <span className={t.stale ? 'font-semibold text-gold-ink' : undefined}>{text}</span>;
      }
    }
    return line(u);
  };

  // groups by the first letter, when the list is long enough to need them
  const grouped = !s && active !== 'pending' && shown.length > 12;
  const groups = useMemo(() => {
    const m = new Map<string, UserRecord[]>();
    for (const u of shown) { const k = letterOf(u); m.set(k, [...(m.get(k) || []), u]); }
    return [...m.entries()];
  }, [shown]);

  const open = (uid: string) => go(personItem(uid), wide && !!openUid);
  const row = (u: UserRecord) => (
    <PersonRow key={u.userId} u={u} sub={subOf(u)} current={openUid === u.userId} onClick={() => open(u.userId)}
      lead={within(u.lastActiveAt, 7) ? <span className="sr-only">აქტიური ამ კვირაში</span> : undefined} />
  );

  return (
    <Screen>
      <TopBar title="ადამიანები" sub={`სულ ${d.loading ? '—' : count('all')}`} onBack={back}
        right={<RoundButton label="მონიშვნა" onClick={() => go('pick')}><ListChecks /></RoundButton>} />
      <SearchBox value={q} onChange={setQ} placeholder="სახელი, ელფოსტა ან ქალაქი" />
      <Chips label="ფილტრი" value={active} onChange={f => go(peopleItem(f), true)}
        items={chips.map(c => ({ id: c.f, label: `${c.f === 'all' ? 'ყველა' : FILTER_NAMES[c.f] || c.f} · ${c.n}` }))} />

      {d.loading ? <Helper>იტვირთება…</Helper> : shown.length === 0 ? (
        <Helper>{s ? 'ვერ მოიძებნა.' : active === 'pending' ? 'მოლოდინში არავინ არის.' : 'აქ ჯერ არავინ არის.'}</Helper>
      ) : grouped ? (
        <div className="flex items-start gap-1">
          <div className="flex min-w-0 flex-1 flex-col gap-2.5">
            {groups.map(([letter, list], i) => (
              <React.Fragment key={letter}>
                <SectionLabel label={`${letter} · ${list.length}`} className="scroll-mt-4" />
                <span id={`adm-letter-${i}`} className="-mt-2.5 block scroll-mt-12" aria-hidden="true" />
                <Rows>{list.map(row)}</Rows>
              </React.Fragment>
            ))}
          </div>
          {groups.length > 4 && <LetterIndex letters={groups.map(g => g[0])} />}
        </div>
      ) : (
        <Rows>{shown.map(row)}</Rows>
      )}

      {isSuperAdmin && !d.loading && shown.length > 0 && (
        <Button kind="ghost" full icon={<Download className="text-wine" />}
          onClick={() => exportPeople(shown, d.staff, d.classes, statusOf, d.left.uids, say)}>
          ცხრილად ჩამოტვირთვა · {shown.length}
        </Button>
      )}
    </Screen>
  );
};

/** The alphabet at the list's right: one tall strip — a finger runs along it and the list follows the letter under it. */
const LetterIndex: React.FC<{ letters: string[] }> = ({ letters }) => {
  const box = useRef<HTMLDivElement>(null);
  const jump = (y: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    const i = Math.min(letters.length - 1, Math.max(0, Math.floor(((y - r.top) / r.height) * letters.length)));
    document.getElementById(`adm-letter-${i}`)?.scrollIntoView({ block: 'start' });
  };
  return (
    <div ref={box} role="navigation" aria-label="ანბანი"
      onPointerDown={e => { (e.target as HTMLElement).releasePointerCapture?.(e.pointerId); jump(e.clientY); }}
      onPointerMove={e => { if (e.buttons) jump(e.clientY); }}
      className="sticky top-3 flex w-6 shrink-0 cursor-pointer touch-none flex-col items-center py-1 select-none">
      {letters.map((l, i) => (
        <button key={l} type="button" tabIndex={-1} aria-label={`ასო ${l}`}
          onClick={() => document.getElementById(`adm-letter-${i}`)?.scrollIntoView({ block: 'start' })}
          className="w-full text-center text-cap leading-4 font-semibold text-mut">{l}</button>
      ))}
    </div>
  );
};
