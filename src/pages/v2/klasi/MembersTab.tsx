import React, { useState } from 'react';
import { Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight, Search, UserPlus, X } from 'lucide-react';
import { useAuth, useNavigation } from '../../../context';
import { Avatar, Button, Card, Field, Press, RoundButton, Row, Rows, SectionLabel, Small, Two } from '../../../components/ui2';
import { cx } from '../../../components/ui2/cx';
import type { ClassMember, SchoolClass } from '../../../hooks/useClasses';
import { localIso, useClassStudents } from '../../../hooks/useTeaching';
import { useSyncAttendanceShares } from '../../../hooks/useAttendanceShare';
import { openThread, type Person } from '../../../hooks/useDirectChat';
import { useClassAttendance, type ClassAttendance } from '../../../components/teacher/AttendancePanel';
import { classFigures, summarize } from '../../../components/teacher/StudentsOverview';
import { MONTHS_GE, WEEKDAYS_GE } from '../../../utils/dateNames';
import { triggerHaptic } from '../../../utils/haptics';
import { AddMemberSheetV2 } from './teacher/AddMember';

/** Writing privately inside the class: a member to one of its teachers, a teacher to a member (the old page's `writeTo`). */
export const useWriteTo = (cls: SchoolClass) => {
  const { user } = useAuth();
  const { openDm } = useNavigation();
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState('');
  const person = (p: ClassMember): Person => ({ uid: p.uid, name: p.name || '', photoURL: p.photoURL || '' });
  const meHere = (): Person => {
    const p = cls.members.find(m => m.uid === user?.uid) || cls.teachers.find(m => m.uid === user?.uid);
    return { uid: user!.uid, name: p?.name || user!.displayName || '', photoURL: p?.photoURL || user!.photoURL || '' };
  };
  const writeTo = async (other: ClassMember, otherIsTeacher: boolean) => {
    if (!user) return;
    setError('');
    setOpening(other.uid);
    try {
      const id = otherIsTeacher ? await openThread(person(other), meHere(), cls.id) : await openThread(meHere(), person(other), cls.id);
      openDm(id);
    } catch (e) {
      console.warn('dm: ', e);
      setError('პირადი ჩათი ვერ გაიხსნა. სცადეთ მოგვიანებით.');
    } finally {
      setOpening(null);
    }
  };
  return { writeTo, opening, error };
};

// ‹ › over the class's lesson days: the next such day before / after the given one, never in the future
const stepDay = (cls: SchoolClass, iso: string, dir: 1 | -1): string => {
  const days = new Set(cls.schedule.map(s => s.day));
  const [y, m, d] = iso.split('-').map(Number);
  const at = new Date(y, m - 1, d);
  const today = localIso();
  for (let i = 0; i < 21; i++) {
    at.setDate(at.getDate() + dir);
    const next = localIso(at);
    if (next > today) return iso;
    if (!days.size || days.has(at.getDay())) return next;
  }
  return iso;
};
const dayWords = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  const wd = new Date(y, m - 1, d).getDay();
  return `${WEEKDAYS_GE[wd].slice(0, 3)}, ${d} ${MONTHS_GE[m - 1]}`;
};

/** x-tsevrebi — the attendance card (the class's teachers and admins). */
const AttendanceCard: React.FC<{ cls: SchoolClass; a: ClassAttendance }> = ({ cls, a }) => {
  const total = cls.members.length;
  const all = total > 0 && a.present.length >= total;
  const newest = a.date >= localIso();
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <RoundButton label="წინა გაკვეთილი" onClick={() => a.setDate(stepDay(cls, a.date, -1))}><ChevronLeft /></RoundButton>
        <div className="flex min-w-0 flex-1 flex-col items-center text-center">
          <span className="text-meta text-mut">დასწრება{a.marked ? ` · ${a.present.length} / ${total}` : ''}</span>
          <span className="max-w-full truncate text-lead font-bold">{a.date === localIso() ? 'დღეს' : dayWords(a.date)}</span>
        </div>
        <RoundButton label="შემდეგი გაკვეთილი" disabled={newest} onClick={() => a.setDate(stepDay(cls, a.date, 1))}><ChevronRight /></RoundButton>
      </div>
      <Button full kind={all ? 'ghost' : 'primary'} icon={all ? <X /> : <CheckCheck />} onClick={() => (all ? a.clear() : a.allCame())}>
        {all ? 'მონიშვნის მოხსნა' : 'ყველა მოვიდა'}
      </Button>
      <p className="text-center text-meta text-mut">ან მონიშნე სათითაოდ სახელის გასწვრივ</p>
      {a.msg.flash && <p role="alert" className={cx('text-center text-meta', a.msg.flash.type === 'error' ? 'text-danger' : 'text-leaf-ink')}>{a.msg.flash.text}</p>}
    </Card>
  );
};

/** The round at a member's right for the chosen day: green once they came. */
const CameButton: React.FC<{ on: boolean; name: string; onToggle: () => void }> = ({ on, name, onToggle }) => (
  <Press aria-pressed={on} aria-label={`${name} — მოვიდა`} title={on ? 'მოვიდა' : 'მონიშნე: მოვიდა'} onClick={onToggle}
    className="flex size-tap shrink-0 cursor-pointer items-center justify-center rounded-full transition active:scale-95 focus-visible:outline-2 focus-visible:outline-wine/60">
    <span className={cx('flex size-[30px] items-center justify-center rounded-full', on ? 'bg-leaf text-white' : 'border-[1.5px] border-dim')}>
      {on && <Check className="size-[58%]" strokeWidth={2.6} aria-hidden="true" />}
    </span>
  </Press>
);

type Roll = { att: ClassAttendance; line: string; voiceOf: (uid: string) => string };

/** The teachers who lead use the roll (attendance + figures); the hooks live here so members never read the records. */
const WithRoll: React.FC<{ cls: SchoolClass; children: (r: Roll) => React.ReactNode }> = ({ cls, children }) => {
  const records = useClassStudents(cls);
  const att = useClassAttendance(cls);
  // each member's own share of the last lessons, for their path's „კლასი“ button
  useSyncAttendanceShares(cls, records, att.last, att.ready);
  const f = classFigures(cls.members.map(m => summarize(records[m.uid]?.data)), att.last);
  const loading = cls.members.some(m => !records[m.uid]);
  // said in whole words (the bare „აქტიური 6 · დასწრება 75% · სამუშაო 0%“ was a riddle): who opened the app this week, who came
  // to the last lessons, the month's own practice against each one's plan
  const line = `ამ კვირაში აპში შემოვიდა ${loading ? '—' : `${f.active} / ${cls.members.length}`} · გაკვეთილებზე დადის ${f.attendance === null ? '—' : `${f.attendance}%`} · დამოუკიდებელი სამუშაო ${loading ? '—' : `${f.work}%`}`;
  // a member's (first) voice from their profile, for a big class's roll folded by voices (x-savse-klasi)
  const voiceOf = (uid: string) => {
    const v = (records[uid]?.data as { profile?: { voices?: unknown } } | undefined)?.profile?.voices;
    return Array.isArray(v) && v.length ? String(v[0]) : '';
  };
  return <>{children({ att, line, voiceOf })}</>;
};

/** x-tsevrebi — the „წევრები“ tab. */
export const MembersTab: React.FC<{ cls: SchoolClass; canEdit: boolean }> = ({ cls, canEdit }) =>
  canEdit
    ? <WithRoll cls={cls}>{roll => <MembersView cls={cls} canEdit roll={roll} />}</WithRoll>
    : <MembersView cls={cls} canEdit={false} />;

const MembersView: React.FC<{ cls: SchoolClass; canEdit: boolean; roll?: Roll }> = ({ cls, canEdit, roll }) => {
  const { user } = useAuth();
  const { openStudent, navigateTo } = useNavigation();
  const { writeTo, opening, error } = useWriteTo(cls);
  const [finding, setFinding] = useState(false);
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const me = user?.uid;
  const needle = q.trim().toLowerCase();
  const found = finding && needle ? cls.members.filter(m => (m.name || '').toLowerCase().includes(needle)) : cls.members;
  const iAmMember = !!me && cls.memberIds.includes(me);
  // a big class's roll (the class's leaders): folded by voices, so marking who came stays short (x-savse-klasi)
  const big = canEdit && !!roll && !needle && cls.members.length > BIG_CLASS;
  const memberRow = (m: ClassMember) => {
    const body = (
      <>
        <Avatar name={m.name} photo={m.photoURL} />
        <Two title={m.name} sub={m.uid === me ? 'შენ' : undefined} wrap />
      </>
    );
    if (!canEdit) return <div key={m.uid} className="flex min-h-row w-full items-center gap-2.5 py-2 pr-3 pl-4 text-ink">{body}</div>;
    return (
      <div key={m.uid} className="flex min-h-row w-full items-center gap-1 text-ink">
        <Press onClick={() => (m.uid === me ? navigateTo('gz') : openStudent(m.uid, cls.id))} title={`${m.name} — გზა და პროფილი`}
          className="flex min-h-row min-w-0 flex-1 cursor-pointer items-center gap-2.5 py-2 pl-4 text-left transition-colors active:bg-soft">
          {body}
        </Press>
        {roll && <CameButton on={roll.att.present.includes(m.uid)} name={m.name} onToggle={() => { triggerHaptic(10); roll.att.toggle(m.uid); }} />}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2.5">
      {canEdit && roll && <AttendanceCard cls={cls} a={roll.att} />}

      <div className="flex items-center gap-2 px-1.5 pt-1">
        <h2 className="min-w-0 flex-1 truncate text-head font-bold">წევრები · {cls.members.length}</h2>
        {cls.members.length > 1 && (
          <RoundButton label={finding ? 'ძებნის დახურვა' : 'ძებნა'} size={36} onClick={() => { setFinding(f => !f); setQ(''); }}>
            {finding ? <X /> : <Search />}
          </RoundButton>
        )}
        {canEdit && <RoundButton label="წევრის დამატება" size={36} onClick={() => setAdding(true)}><UserPlus /></RoundButton>}
      </div>
      {roll && <p className="px-1.5 text-meta text-mut">{roll.line}</p>}
      {finding && <Field label="ძებნა სახელით" value={q} onChange={setQ} type="search" autoFocus placeholder="სახელი…" />}
      {error && <p role="alert" className="px-1.5 text-meta text-danger">{error}</p>}

      <Rows>
        {/* the class's teachers first; a member's tap on one opens their private chat */}
        {!needle && cls.teachers.map(t => {
          const write = iAmMember && t.uid !== me;
          const body = (
            <>
              <Avatar name={t.name} photo={t.photoURL} />
              <Two title={t.name} sub={t.uid === me ? 'მასწავლებელი · შენ' : 'მასწავლებელი'} wrap />
            </>
          );
          const look = 'flex min-h-row w-full items-center gap-2.5 py-2 pr-3 pl-4 text-ink';
          return write ? (
            <Press key={t.uid} onClick={() => writeTo(t, true)} disabled={opening === t.uid} aria-label={`მიწერა: ${t.name}`}
              className={cx(look, 'cursor-pointer text-left transition-colors active:bg-soft disabled:opacity-50')}>
              {body}
              <ChevronRight aria-hidden="true" className="size-[18px] shrink-0 text-mut" strokeWidth={2} />
            </Press>
          ) : <div key={t.uid} className={look}>{body}</div>;
        })}
        {!big && found.map(memberRow)}
        {needle && found.length === 0 && <p className="px-4 py-3.5 text-body text-mut">ვერ მოიძებნა.</p>}
      </Rows>
      {big && roll && <ByVoice cls={cls} roll={roll} row={memberRow} />}
      {cls.members.length === 0 && <Small tone="mut" className="px-1.5">კლასში ჯერ წევრი არ არის.</Small>}
      {canEdit && <AddMemberSheetV2 cls={cls} open={adding} onClose={() => setAdding(false)} />}
    </div>
  );
};

// more members than this: the roll folds by voices
const BIG_CLASS = 12;
// a voice group shows this many names before „კიდევ N“
const FIRST_NAMES = 3;
const VOICE_GROUPS: { id: string; label: string }[] = [
  { id: '1', label: 'I ხმა' }, { id: '2', label: 'II ხმა' }, { id: '3', label: 'III ხმა' }, { id: '', label: 'ხმა არ წერია' },
];

/** x-savse-klasi — a big class's members by voice: the open group shows three names and „კიდევ N“, every other group is one
 *  line („II ხმა · 17 · 16 მოვიდა“) that opens it. „ყველა მოვიდა“ on the card above, then only who did not come is tapped. */
const ByVoice: React.FC<{ cls: SchoolClass; roll: Roll; row: (m: ClassMember) => React.ReactNode }> = ({ cls, roll, row }) => {
  const groups = VOICE_GROUPS
    .map(g => ({ ...g, list: cls.members.filter(m => roll.voiceOf(m.uid) === g.id || (!g.id && !['1', '2', '3'].includes(roll.voiceOf(m.uid)))) }))
    .filter(g => g.list.length > 0);
  // none chosen yet: the first voice (the records come in one by one, so it is not fixed at the start)
  const [open, setOpen] = useState<string | null>(null);
  const [whole, setWhole] = useState(false);
  const came = (list: ClassMember[]) => list.filter(m => roll.att.present.includes(m.uid)).length;
  const shown = groups.find(g => g.id === open) ?? groups[0];
  if (!shown) return null;
  const order = shown.list;
  const rest = groups.filter(g => g !== shown);
  return (
    <>
      <SectionLabel label={`${shown.label} · ${shown.list.length}${roll.att.marked ? ` · ${came(shown.list)} მოვიდა` : ''}`} />
      <Rows>{(whole ? order : order.slice(0, FIRST_NAMES)).map(row)}</Rows>
      {!whole && order.length > FIRST_NAMES && (
        <Button kind="ghost" full icon={<ChevronDown />} onClick={() => setWhole(true)}>კიდევ {order.length - FIRST_NAMES}</Button>
      )}
      {rest.length > 0 && (
        <Rows>
          {rest.map(g => (
            <Row key={g.id || 'none'} title={`${g.label} · ${g.list.length}`} sub={roll.att.marked ? `${came(g.list)} მოვიდა` : 'შეხებით გაიშლება'}
              onClick={() => { setOpen(g.id); setWhole(false); }} />
          ))}
        </Rows>
      )}
    </>
  );
};
