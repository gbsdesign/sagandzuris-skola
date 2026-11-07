import React, { useMemo, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { Users, Clock, Sparkles, ClipboardCheck, Baby, Lock, UserMinus, UserPlus, Loader2, MessageCircle, ChevronDown, Dumbbell } from 'lucide-react';
import { db } from '../../firebase';
import { useAuth, useNavigation } from '../../context';
import type { ClassMember, SchoolClass } from '../../hooks/useClasses';
import { AttendanceDay, StudentRecord, agoLabel, useClassStudents } from '../../hooks/useTeaching';
import { AttendanceDays, AttendanceStrip, CameCheck, useClassAttendance } from './AttendancePanel';
import { computeMonthlyStats } from '../../hooks/useMonthlyStudyStats';
import { HABIT_ITEMS } from '../../data/habitsAndManera';
import { dayKey, lastDays } from '../../utils/habitsWeek';
import { DEFAULT_KIDS_SECTIONS, KidsMode, SECTIONS, SectionId } from '../../data/sections';
import { MemberPathEditor } from '../admin/MemberPathEditor';
import { removeClassMember } from '../admin/ClassesAdmin';
import { ManeraReviewEditor } from '../admin/ManeraReviewEditor';
import { askConfirm, Avatar, Btn, Card, CardTitle, Empty, Pill, Sheet, Stat, Toggle } from '../ui/kit';
import { WEEKDAYS_SHORT_GE } from '../../utils/dateNames';
import { abilitiesText, interestsText } from '../../utils/profileFields';
import { syncKidsFlag } from '../../hooks/useDirectChat';
import { Avatar as Face } from '../classes/ChatPanel';
import { DrillReview } from '../mastery/DrillReview';
import { pathSummary, recordFromDoc } from '../../utils/masteryPath';
import { LearnReview } from '../learn/LearnReview';
import { MedavitneReview } from '../learn/MedavitneReview';

const VOICE = { '1': 'მთქმელი', '2': 'მოძახილი', '3': 'ბანი' } as Record<string, string>;
const MONTHS = ['იანვარში', 'თებერვალში', 'მარტში', 'აპრილში', 'მაისში', 'ივნისში', 'ივლისში', 'აგვისტოში', 'სექტემბერში', 'ოქტომბერში', 'ნოემბერში', 'დეკემბერში'];

const summarize = (data: Record<string, any> | undefined) => {
  const profile = data?.profile || {};
  const work = computeMonthlyStats(profile.workSchedule || {}, data?.completedSessions || {});
  const log: Record<string, string[]> = data?.habitLog || {};
  const week = lastDays(7).map(d => ({ d, n: (log[dayKey(d)] || []).length }));
  const habitTicks = week.reduce((a, x) => a + x.n, 0);
  const path = Object.keys(data?.selectedChantVariants || {}).length;
  const kids: KidsMode | undefined = data?.kidsMode;
  // „ოსტატობის გზა“'s level and its exercises passed (utils/masteryPath.ts, from the record alone)
  const mastery = pathSummary(recordFromDoc(data));
  return { profile, work, week, habitTicks, path, kids, mastery, abituri: abituriText(data?.abituri), lastActive: data?.lastActiveAt || data?.updatedAt };
};

// the admission theory (hooks/useAbituriProgress): lessons done, the last mock test, practice
const abituriText = (a: any): string => {
  if (!a || typeof a !== 'object') return '';
  const parts: string[] = [];
  const pieces = Array.isArray(a.pieces) ? a.pieces.length : 0;
  if (pieces) parts.push(`${pieces} ნაწარმოები იცის`);
  const lessons = Array.isArray(a.lessons) ? a.lessons.length : 0;
  if (lessons) parts.push(`${lessons} გაკვეთილი გავლილი`);
  const last = Array.isArray(a.tests) ? a.tests[a.tests.length - 1] : null;
  if (last && typeof last.score === 'number') parts.push(`ბოლო საცდელი ტესტი ${last.score}/${last.max}`);
  const counts = a.drills && typeof a.drills === 'object' ? (Object.values(a.drills) as unknown[]).filter(Array.isArray) as number[][] : [];
  const all = counts.reduce((n, c) => n + (c[1] || 0), 0), right = counts.reduce((n, c) => n + (c[0] || 0), 0);
  if (all) parts.push(`ვარჯიშში ${right}/${all} სწორი`);
  return parts.join(' · ');
};

/** The class's three figures: independent work this month on average, members active in the last 7 days, and the
 *  attendance at the latest lessons on average (null before any lesson is marked). */
const classFigures = (sums: ReturnType<typeof summarize>[], attendance: AttendanceDay[]) => {
  const n = sums.length;
  const came = attendance.reduce((a, d) => a + d.present.length, 0);
  return {
    work: n ? Math.round(sums.reduce((a, s) => a + s.work.percent, 0) / n) : 0,
    active: sums.filter(s => s.lastActive && Date.now() - new Date(s.lastActive).getTime() < 7 * 86400_000).length,
    attendance: attendance.length && n ? Math.round((came / (attendance.length * n)) * 100) : null,
  };
};

// The class tab: every member at a glance — independent work this month, habits this week, attendance and
// the last visit. The ✓ on a card marks who came (the day above the list), the button beside it takes the
// member out of the class; a tap on the card opens the details, the path and the kids' mode; „მართვა“ opens
// the class's window (members, program, home buttons).
export const StudentsOverview: React.FC<{ cls: SchoolClass; records: Record<string, StudentRecord>; onEditClass: () => void }> = ({ cls, records, onEditClass }) => {
  const att = useClassAttendance(cls);
  const attendance = att.last;
  const [open, setOpen] = useState<string | null>(null);
  const rows = useMemo(
    () => cls.members.map(m => ({ m, rec: records[m.uid], s: summarize(records[m.uid]?.data) })),
    [cls.members, records]
  );
  if (!cls.members.length) return (
    <Empty icon={<Users />} title="კლასში ჯერ წევრები არ არიან" text="წევრებს კლასის მართვის ფანჯარაში დაამატებ."
      action={<Btn icon={<UserPlus />} onClick={onEditClass}>წევრების დამატება</Btn>} />
  );

  const remove = async (uid: string, name: string) => {
    if (!(await askConfirm({ title: `ამოვიღო „${name}“ კლასიდან?`, text: 'მისი ანგარიში და ნასწავლი არ წაიშლება.', ok: 'ამოღება', danger: true }))) return;
    try {
      await removeClassMember(cls, uid);
    } catch {
      att.msg.fail('წევრი ვერ ამოიღო.');
    }
  };

  const f = classFigures(rows.map(r => r.s), attendance);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat value={`${f.work}%`} label="სამუშაო, საშუალოდ" tone="wine" />
        <Stat value={`${f.active}/${rows.length}`} label="აქტიური 7 დღეში" tone="green" />
        <Stat value={f.attendance === null ? '—' : `${f.attendance}%`} label="დასწრება, საშუალოდ" />
      </div>

      <Card>
        <CardTitle icon={<Users />} title="მოსწავლეები" />
        <AttendanceDays a={att} total={rows.length} />
        <ul className="-mx-2 divide-y divide-[#f1e8d9]">
          {rows.map(({ m, rec, s }) => {
            const came = attendance.filter(d => d.present.includes(m.uid)).length;
            const pending = !rec || (!rec.data && !rec.denied);
            const here = att.present.includes(m.uid);
            return (
              <li key={m.uid} className="py-1">
                <div className={`flex items-center gap-1.5 pl-2 pr-1 py-1.5 rounded-xl transition-colors ${here ? 'bg-emerald-50' : 'hover:bg-[#fbf6ec]'}`}>
                  <button type="button" onClick={() => setOpen(m.uid)} className="flex-1 min-w-0 flex items-center gap-3 text-left cursor-pointer">
                    <Avatar name={m.name} photo={m.photoURL} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="text-[15px] font-semibold text-[#2a2017] truncate">{m.name}</span>
                        {s.kids?.on && <Pill tone="amber"><Baby /> საბავშვო</Pill>}
                      </span>
                      <span className="block text-xs text-[#8a7a6a] truncate">
                        {rec?.denied ? 'მონაცემები ჯერ არ ჩანს — ვაკავშირებ…' : pending ? 'იტვირთება…' : `ბოლოს: ${agoLabel(s.lastActive)}`}
                        {(s.profile.voices || []).length > 0 && ` · ${(s.profile.voices as string[]).map(v => VOICE[v] || v).join(', ')}`}
                      </span>
                      {rec?.data && (
                        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold tabular-nums text-[#75685a]">
                          <Meta icon={<Clock />} title="დამოუკიდებელი მუშაობა ამ თვეში" warn={s.work.planned > 0 && s.work.percent < 40}>
                            {s.work.planned ? `${s.work.worked}/${s.work.planned} სთ` : '—'}
                          </Meta>
                          <Meta icon={<Sparkles />} title="ჩვევის მონიშვნა 7 დღეში">{s.habitTicks}</Meta>
                          <Meta icon={<Dumbbell />} title={`ოსტატობის გზა: დონე ${s.mastery.level}, ${s.mastery.passed}/${s.mastery.total} სავარჯიშო`}>დ{s.mastery.level} · {s.mastery.passed}/{s.mastery.total}</Meta>
                          <Meta icon={<ClipboardCheck />} title="დასწრება ბოლო გაკვეთილებზე" warn={attendance.length > 0 && came / attendance.length < 0.5}>
                            {attendance.length ? `${came}/${attendance.length}` : '—'}
                          </Meta>
                        </span>
                      )}
                    </span>
                  </button>
                  <button type="button" onClick={() => remove(m.uid, m.name)} aria-label={`${m.name} — კლასიდან ამოღება`} title="კლასიდან ამოღება"
                    className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-[#cdbb9f] hover:bg-red-50 hover:text-red-700 cursor-pointer transition">
                    <UserMinus className="w-[17px] h-[17px]" />
                  </button>
                  <CameCheck on={here} name={m.name} onToggle={() => att.toggle(m.uid)} />
                </div>
              </li>
            );
          })}
        </ul>
        {/* members, the program and the home buttons: the class's window */}
        <button type="button" onClick={onEditClass}
          className="mt-2 w-full h-11 rounded-xl border border-dashed border-[#dccbb0] inline-flex items-center justify-center gap-2 text-[13px] font-bold text-[#7a2028] hover:bg-[#7a2028]/[0.04] cursor-pointer transition">
          <UserPlus className="w-4 h-4" /> წევრის დამატება
        </button>
      </Card>

      <StudentSheet cls={cls} uid={open} record={open ? records[open] : undefined} onClose={() => setOpen(null)} attendance={attendance} />
    </div>
  );
};

/** The class page's members as its teachers see them (ClassPage): the day's attendance on top, ✓ on each member (one
 *  tap, saved at once) beside 💬, the class's three figures at the bottom; a name opens the member's window with what
 *  the teacher panel has for them, plus „მიწერა“ and „ამოღება“. `shown`: the members the search left. The members'
 *  records are read only while it is shown. */
export const ClassRoll: React.FC<{
  cls: SchoolClass;
  shown: ClassMember[];
  me?: string;
  onWrite?: (m: ClassMember) => void;
  writing?: string | null;
  /** shown after the figures (the class page: its teachers) */
  top?: React.ReactNode;
  /** shown right above the names (the class page: the search) */
  search?: React.ReactNode;
}> = ({ cls, shown, me, onWrite, writing, top, search }) => {
  const records = useClassStudents(cls);
  const att = useClassAttendance(cls);
  // a name opens the member's own page — their path and profile, the teacher's part under them (pages/StudentPage.tsx)
  const { openStudent, navigateTo } = useNavigation();
  const f = classFigures(cls.members.map(m => summarize(records[m.uid]?.data)), att.last);
  // until every member's record has come, the figures would read 0
  const loading = cls.members.some(m => !records[m.uid]);

  // the order (2026-11-05, the user's „დახვეწე“): the class's three figures as tiles on top, its teachers, the attendance
  // block, the search, then the names — each with 💬 and the day's ✓
  return (
    <>
      <div className="mb-3 grid grid-cols-3 rounded-2xl bg-white ring-1 ring-[#e8dcc8] divide-x divide-[#f1e8d9] text-center">
        <RollFigure value={loading ? '—' : `${f.work}%`} label="სამუშაო" sub="ამ თვეში" title="დამოუკიდებელი მუშაობა ამ თვეში, საშუალოდ" />
        <RollFigure value={loading ? '—' : `${f.active}/${cls.members.length}`} label="აქტიური" sub="7 დღეში" title="აქტიური ბოლო 7 დღეში" />
        <RollFigure value={f.attendance === null ? '—' : `${f.attendance}%`} label="დასწრება" sub="საშუალოდ" title="დასწრება ბოლო გაკვეთილებზე, საშუალოდ" />
      </div>
      {top}
      <AttendanceDays a={att} total={cls.members.length} />
      {search}
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-x-3 gap-y-0.5">
        {shown.map(m => {
          const here = att.present.includes(m.uid);
          return (
            <li key={m.uid} className={`min-h-[52px] flex items-center gap-1 pl-1.5 pr-1 py-1 rounded-2xl transition-colors ${here ? 'bg-emerald-50' : m.uid === me ? 'bg-[#7a2028]/[0.05]' : 'hover:bg-[#fbf6ec]'}`}>
              <button type="button" onClick={() => (m.uid === me ? navigateTo('gz') : openStudent(m.uid, cls.id))} title={`${m.name} — გზა და პროფილი`}
                className="flex-1 min-w-0 min-h-11 flex items-center gap-2.5 text-left cursor-pointer">
                <Face name={m.name} photoURL={m.photoURL} className="w-9 h-9 text-[15px] shrink-0" />
                <span className="flex-1 min-w-0 line-clamp-2 break-words text-[14.5px] leading-snug font-semibold text-[#2a2017]">
                  {m.name}
                  {m.uid === me && <span className="ml-1.5 text-[13px] font-normal text-[#8a7a6a]">(შენ)</span>}
                </span>
              </button>
              {onWrite && m.uid !== me && (
                <button type="button" onClick={() => onWrite(m)} disabled={writing === m.uid}
                  title={`პირადი მიწერა: ${m.name}`} aria-label={`პირადი მიწერა: ${m.name}`}
                  className="w-9 h-9 shrink-0 rounded-full text-[#7a2028] hover:bg-[#7a2028]/[0.07] flex items-center justify-center cursor-pointer active:scale-95 transition disabled:opacity-60">
                  {writing === m.uid ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : <MessageCircle className="w-[18px] h-[18px]" />}
                </button>
              )}
              <CameCheck on={here} name={m.name} onToggle={() => att.toggle(m.uid)} />
            </li>
          );
        })}
      </ul>
      {shown.length === 0 && <p className="px-1.5 py-3 text-sm text-[#8a7a6a]">ვერ მოიძებნა.</p>}
    </>
  );
};

/** One of the class's three figures on top of the roll: the number, what it is, and over what time. */
const RollFigure: React.FC<{ value: string; label: string; sub: string; title: string }> = ({ value, label, sub, title }) => (
  <div title={title} className="px-1.5 py-2.5">
    <p className="text-[18px] font-bold tabular-nums leading-tight text-[#4a3426]">{value}</p>
    <p className="mt-0.5 text-[12.5px] font-bold text-[#6a5a4a] leading-tight">{label}</p>
    <p className="text-[11.5px] font-semibold text-[#a4927c] leading-tight">{sub}</p>
  </div>
);

/** One small figure on a student's row: icon + value (the meaning in `title`); amber when it lags. */
const Meta: React.FC<{ icon: React.ReactNode; title: string; warn?: boolean; children: React.ReactNode }> = ({ icon, title, warn, children }) => (
  <span title={title} className={`inline-flex items-center gap-1 [&>svg]:w-3.5 [&>svg]:h-3.5 [&>svg]:opacity-70 ${warn ? 'text-amber-700' : ''}`}>{icon}{children}</span>
);

const StudentSheet: React.FC<{
  cls: SchoolClass;
  uid: string | null;
  record?: StudentRecord;
  attendance: AttendanceDay[];
  onClose: () => void;
  // the class page's own actions on the member (ClassRoll): a private message, out of the class (true when taken out)
  onWrite?: (m: ClassMember) => void;
  onRemove?: (m: ClassMember) => Promise<boolean>;
  /** on the student's own page (StudentTools): a card at its bottom instead of a window */
  inline?: boolean;
}> = ({ cls, uid, record, attendance, onClose, onWrite, onRemove, inline = false }) => {
  const { user } = useAuth();
  const [view, setView] = useState<'info' | 'path' | 'manera'>('info');
  const [error, setError] = useState('');
  const [more, setMore] = useState(false);
  if (!uid) return null;
  const m = cls.members.find(x => x.uid === uid);
  const close = () => { setView('info'); onClose(); };
  const s = summarize(record?.data);
  const kids: KidsMode = { on: false, sections: DEFAULT_KIDS_SECTIONS, ...(s.kids || {}) };
  const maxDay = Math.max(1, ...s.week.map(w => w.n));
  const schedule = Object.entries((s.profile.workSchedule || {}) as Record<string, string>).filter(([, h]) => h);
  const came = attendance.filter(d => d.present.includes(uid)).length;

  const setKids = async (next: KidsMode) => {
    setError('');
    try {
      await updateDoc(doc(db, 'students', uid), { kidsMode: { ...next, by: user?.uid || '', at: new Date().toISOString() } });
      // classmates' message lists leave a child in the kids' mode out
      void syncKidsFlag(uid, !!next.on);
    } catch {
      setError('ვერ შეინახა — მოსწავლის მონაცემებზე წვდომა ჯერ არ არის.');
    }
  };

  // „მიწერა“ at the bottom; „კლასიდან ამოღება“ apart from it, small, at the end of the overview (2026-11-05: side by side
  // the two were easy to mix up)
  const actions = m && onWrite && m.uid !== user?.uid ? (
    <Btn kind="soft" full icon={<MessageCircle />} onClick={() => onWrite(m)}>მიწერა</Btn>
  ) : undefined;
  const removal = m && onRemove ? (
    <div className="pt-1 flex justify-center">
      <button type="button" onClick={async () => { if (await onRemove(m)) close(); }}
        className="h-10 px-4 rounded-full inline-flex items-center gap-1.5 text-[13px] font-bold text-[#a3242b] hover:bg-red-50 cursor-pointer transition-colors">
        <UserMinus className="w-4 h-4" /> კლასიდან ამოღება
      </button>
    </div>
  ) : null;
  // a function, not a component made in render (that would remount the editors inside on every render)
  const frame = (children: React.ReactNode) => inline ? (
    <section className="rounded-3xl bg-white/70 ring-1 ring-[#e8dcc8] px-4 min-[400px]:px-5 py-4 space-y-4" aria-label="მასწავლებლისთვის">
      <h2 className="flex items-center gap-2 font-serif-ge text-lg font-bold text-[#4a3426]"><Lock className="w-5 h-5 text-[#7a2028]" /> მასწავლებლისთვის</h2>
      <p className="-mt-2 text-[13px] text-[#8a7a6a]">ეს ნაწილი მოსწავლეს არ უჩანს.</p>
      <div>{children}</div>
      {actions}
    </section>
  ) : (
    <Sheet open onClose={close} title={m?.name || 'მოსწავლე'} wide footer={actions}>{children}</Sheet>
  );

  return frame(
    <>
      <div className="grid grid-cols-3 gap-1 p-1 mb-4 rounded-2xl bg-white ring-1 ring-[#e8dcc8]">
        {(['info', 'path', 'manera'] as const).map(v => (
          <button key={v} type="button" onClick={() => setView(v)}
            className={`h-10 rounded-xl text-sm font-bold cursor-pointer ${view === v ? 'bg-[#7a2028] text-[#fbf6ec]' : 'text-[#4a3426]'}`}>
            {v === 'info' ? 'მიმოხილვა' : v === 'path' ? 'გზა' : 'ოსტატობა'}
          </button>
        ))}
      </div>

      {view === 'path' ? (
        <MemberPathEditor uid={uid} name={m?.name || 'მოსწავლე'} onError={t => setError(t)} />
      ) : view === 'manera' ? (
        <ManeraReviewEditor uid={uid} />
      ) : !record?.data ? (
        <p className="py-8 text-center text-sm text-[#8a7a6a]">{record?.denied ? 'ამ მოსწავლის მონაცემები ჯერ არ ჩანს.' : 'იტვირთება…'}</p>
      ) : (
        <div className="space-y-4">
          <p className="-mt-1 text-[13px] text-[#75685a]">
            {(s.profile.voices || []).map((v: string) => VOICE[v] || v).join(', ') || 'ხმა არ არის მითითებული'} · {agoLabel(s.lastActive)}
          </p>

          {/* three small figures; the rest waits in „მეტი“ */}
          <div className="grid grid-cols-3 rounded-2xl bg-white ring-1 ring-[#e8dcc8] divide-x divide-[#f1e8d9] text-center">
            <Figure value={s.work.planned ? `${s.work.percent}%` : '—'} label="სამუშაო" warn={s.work.missed > 2} />
            <Figure value={attendance.length ? `${came}/${attendance.length}` : '—'} label="დასწრება" />
            <Figure value={String(s.habitTicks)} label="ჩვევა 7 დღეში" />
          </div>

          <AttendanceStrip uid={uid} last={attendance} />

          <DrillReview uid={uid} drillDone={record.data.drillDone} drillScore={record.data.drillScore} data={record.data} />
          <LearnReview uid={uid} learning={record.data.learning} parts={record.data.learnParts} shine={record.data.pearlShine} />
          <MedavitneReview uid={uid} shine={record.data.pearlShine} />

          <div className="rounded-2xl bg-white ring-1 ring-[#e8dcc8]">
            <button type="button" aria-expanded={more} onClick={() => setMore(o => !o)}
              className="w-full min-h-11 px-3.5 flex items-center justify-between gap-2 text-sm font-bold text-[#4a3426] cursor-pointer">
              მეტი
              <ChevronDown className={`w-4 h-4 text-[#8a7a6a] transition-transform ${more ? 'rotate-180' : ''}`} />
            </button>
            {more && (
              <div className="border-t border-[#f1e8d9]">
                <div className="p-3.5">
                  <p className="text-[13px] font-bold text-[#75685a] mb-2">ჩვევები 7 დღეში · {s.habitTicks} მონიშვნა</p>
                  <div className="flex items-end gap-1.5">
                    {s.week.map(({ d, n }) => (
                      <div key={d.toISOString()} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[11.5px] font-bold tabular-nums text-[#4a3426]">{n || ''}</span>
                        <div className="w-full h-14 flex items-end">
                          <div className={`w-full rounded-md ${n ? 'bg-[#7a2028]' : 'bg-[#efe5d4]'}`} style={{ height: `${Math.max(8, (n / Math.max(maxDay, HABIT_ITEMS.length / 2)) * 100)}%` }} title={`${n}`} />
                        </div>
                        <span className="text-[11.5px] font-semibold text-[#8a7a6a]">{WEEKDAYS_SHORT_GE[d.getDay()]}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <dl className="border-t border-[#f1e8d9] divide-y divide-[#f1e8d9] text-sm">
                  <Row label={`სამუშაო ${MONTHS[new Date().getMonth()]}`}>{s.work.planned ? `${s.work.worked}/${s.work.planned} სთ · გამოტოვებული ${s.work.missed}` : '—'}</Row>
                  <Row label="სამუშაო განრიგი">{schedule.length ? schedule.map(([d, h]) => `${d}: ${h}`).join(' · ') : 'არ არის გაწერილი'}</Row>
                  <Row label="შესაძლებლობები">{abilitiesText(s.profile) || '—'}</Row>
                  <Row label="ინტერესები">{interestsText(s.profile) || '—'}</Row>
                  <Row label="გზაზე">{s.path} საგალობელი/სიმღერა</Row>
                  {s.abituri && <Row label="აბიტურიენტი">{s.abituri}</Row>}
                </dl>
              </div>
            )}
          </div>

          {/* kids' mode: the teacher turns it on; the student can't turn it off */}
          <div className="rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] px-3.5 pb-3">
            <Toggle
              on={kids.on}
              onChange={on => setKids({ ...kids, on })}
              label={<span className="inline-flex items-center gap-1.5"><Lock className="w-4 h-4 text-[#7a2028]" /> საბავშვო რეჟიმი</span>}
            />
            {kids.on && (
              <div className="pt-1">
                <p className="text-xs font-bold text-[#75685a] mb-2">რა ჩანს</p>
                <div className="flex flex-wrap gap-1.5">
                  {SECTIONS.filter(x => x.page).map(sec => {
                    const on = kids.sections.includes(sec.id);
                    return (
                      <button key={sec.id} type="button"
                        onClick={() => setKids({ ...kids, sections: on ? kids.sections.filter(x => x !== sec.id) : [...kids.sections, sec.id as SectionId] })}
                        className={`h-9 px-3 rounded-full text-[13px] font-semibold cursor-pointer transition ${on ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426]'}`}>
                        {sec.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
          {removal}
        </div>
      )}
    </>
  );
};

/** The teacher's part at the bottom of a student's own page (pages/StudentPage.tsx; 2026-11-04 — it was the member's
 *  window): their takes to hear and „ჩათვლა“, figures, attendance, the path's chants, the manera's marks, the
 *  kids' mode, „მიწერა“ and „ამოღება“. */
export const StudentTools: React.FC<{
  cls: SchoolClass;
  uid: string;
  onWrite?: (m: ClassMember) => void;
  onRemove?: (m: ClassMember) => Promise<boolean>;
}> = ({ cls, uid, onWrite, onRemove }) => {
  const records = useClassStudents(cls);
  const att = useClassAttendance(cls);
  return <StudentSheet inline cls={cls} uid={uid} record={records[uid]} attendance={att.last} onClose={() => {}} onWrite={onWrite} onRemove={onRemove} />;
};

/** One of the member's window's three small figures. */
const Figure: React.FC<{ value: string; label: string; warn?: boolean }> = ({ value, label, warn }) => (
  <div className="px-2 py-2.5">
    <p className={`text-[17px] font-bold tabular-nums leading-tight ${warn ? 'text-amber-700' : 'text-[#4a3426]'}`}>{value}</p>
    <p className="text-[12px] font-semibold text-[#8a7a6a] mt-0.5">{label}</p>
  </div>
);

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex gap-3 px-3.5 py-2.5">
    <dt className="w-32 shrink-0 text-[#8a7a6a]">{label}</dt>
    <dd className="min-w-0 flex-1 font-semibold text-[#2a2017]">{children}</dd>
  </div>
);
