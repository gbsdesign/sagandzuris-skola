import React, { useMemo, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { Users, Clock, Sparkles, ClipboardCheck, Route, Baby, Lock, UserMinus, UserPlus } from 'lucide-react';
import { db } from '../../firebase';
import { useAuth } from '../../context';
import { SchoolClass } from '../../hooks/useClasses';
import { AttendanceDay, StudentRecord, agoLabel } from '../../hooks/useTeaching';
import { AttendanceDays, AttendanceStrip, CameCheck, useClassAttendance } from './AttendancePanel';
import { computeMonthlyStats } from '../../hooks/useMonthlyStudyStats';
import { HABIT_ITEMS } from '../../data/habitsAndManera';
import { dayKey, lastDays } from '../../utils/habitsWeek';
import { DEFAULT_KIDS_SECTIONS, KidsMode, SECTIONS, SectionId } from '../../data/sections';
import { MemberPathEditor } from '../admin/MemberPathEditor';
import { removeClassMember } from '../admin/ClassesAdmin';
import { ManeraReviewEditor } from '../admin/ManeraReviewEditor';
import { Avatar, Btn, Card, CardTitle, Empty, Pill, Sheet, Stat, Toggle } from '../ui/kit';
import { WEEKDAYS_SHORT_GE } from '../../utils/dateNames';
import { abilitiesText, interestsText } from '../../utils/profileFields';
import { syncKidsFlag } from '../../hooks/useDirectChat';

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
  return { profile, work, week, habitTicks, path, kids, abituri: abituriText(data?.abituri), lastActive: data?.lastActiveAt || data?.updatedAt };
};

// the admission theory (hooks/useAbituriProgress): lessons done, the last mock test, practice
const abituriText = (a: any): string => {
  if (!a || typeof a !== 'object') return '';
  const parts: string[] = [];
  const lessons = Array.isArray(a.lessons) ? a.lessons.length : 0;
  if (lessons) parts.push(`${lessons} გაკვეთილი გავლილი`);
  const last = Array.isArray(a.tests) ? a.tests[a.tests.length - 1] : null;
  if (last && typeof last.score === 'number') parts.push(`ბოლო საცდელი ტესტი ${last.score}/${last.max}`);
  const counts = a.drills && typeof a.drills === 'object' ? (Object.values(a.drills) as unknown[]).filter(Array.isArray) as number[][] : [];
  const all = counts.reduce((n, c) => n + (c[1] || 0), 0), right = counts.reduce((n, c) => n + (c[0] || 0), 0);
  if (all) parts.push(`ვარჯიშში ${right}/${all} სწორი`);
  return parts.join(' · ');
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
    if (!window.confirm(`ამოვიღო „${name}“ კლასიდან? მისი ანგარიში და ნასწავლი არ წაიშლება.`)) return;
    try {
      await removeClassMember(cls, uid);
    } catch {
      att.msg.fail('წევრი ვერ ამოიღო.');
    }
  };

  const avgWork = Math.round(rows.reduce((a, r) => a + r.s.work.percent, 0) / rows.length);
  const activeWeek = rows.filter(r => r.s.lastActive && Date.now() - new Date(r.s.lastActive).getTime() < 7 * 86400_000).length;
  const cameAll = attendance.reduce((n, d) => n + d.present.length, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat value={`${avgWork}%`} label="სამუშაო, საშუალოდ" tone="wine" />
        <Stat value={`${activeWeek}/${rows.length}`} label="აქტიური 7 დღეში" tone="green" />
        <Stat value={attendance.length ? `${Math.round((cameAll / (attendance.length * rows.length)) * 100)}%` : '—'} label="დასწრება, საშუალოდ" />
      </div>

      <Card>
        <CardTitle icon={<Users />} title="მოსწავლეები" hint="✓ — მოვიდა · სახელზე შეხება — დეტალები" />
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
                        <span className="mt-1 flex items-center gap-3 text-xs font-semibold tabular-nums text-[#75685a]">
                          <Meta icon={<Clock />} title="დამოუკიდებელი მუშაობა ამ თვეში" warn={s.work.planned > 0 && s.work.percent < 40}>
                            {s.work.planned ? `${s.work.worked}/${s.work.planned} სთ` : '—'}
                          </Meta>
                          <Meta icon={<Sparkles />} title="ჩვევის მონიშვნა 7 დღეში">{s.habitTicks}</Meta>
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
}> = ({ cls, uid, record, attendance, onClose }) => {
  const { user } = useAuth();
  const [view, setView] = useState<'info' | 'path' | 'manera'>('info');
  const [error, setError] = useState('');
  if (!uid) return null;
  const m = cls.members.find(x => x.uid === uid);
  const s = summarize(record?.data);
  const kids: KidsMode = { on: false, sections: DEFAULT_KIDS_SECTIONS, ...(s.kids || {}) };
  const maxDay = Math.max(1, ...s.week.map(w => w.n));
  const schedule = Object.entries((s.profile.workSchedule || {}) as Record<string, string>).filter(([, h]) => h);

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

  return (
    <Sheet open onClose={() => { setView('info'); onClose(); }} title={m?.name || 'მოსწავლე'} wide>
      <div className="grid grid-cols-3 gap-1 p-1 mb-4 rounded-2xl bg-white ring-1 ring-[#e8dcc8]">
        {(['info', 'path', 'manera'] as const).map(v => (
          <button key={v} type="button" onClick={() => setView(v)}
            className={`h-10 rounded-xl text-sm font-bold cursor-pointer ${view === v ? 'bg-[#7a2028] text-[#fbf6ec]' : 'text-[#4a3426]'}`}>
            {v === 'info' ? 'მიმოხილვა' : v === 'path' ? 'გზა' : 'მანერა'}
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
          <div className="grid grid-cols-3 gap-2">
            <Stat value={s.work.planned ? `${s.work.percent}%` : '—'} label={`სამუშაო ${MONTHS[new Date().getMonth()]}`} tone="wine" />
            <Stat value={s.work.planned ? `${s.work.worked}/${s.work.planned}` : '—'} label="შესრულებული სთ" />
            <Stat value={String(s.work.missed)} label="გამოტოვებული სთ" tone={s.work.missed > 2 ? 'amber' : 'plain'} />
          </div>

          <AttendanceStrip uid={uid} last={attendance} />

          <div className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] p-3.5">
            <p className="text-[13px] font-bold text-[#75685a] mb-2">ჩვევები 7 დღეში · {s.habitTicks} მონიშვნა</p>
            <div className="flex items-end gap-1.5">
              {s.week.map(({ d, n }) => (
                <div key={d.toISOString()} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10.5px] font-bold tabular-nums text-[#4a3426]">{n || ''}</span>
                  <div className="w-full h-14 flex items-end">
                    <div className={`w-full rounded-md ${n ? 'bg-[#7a2028]' : 'bg-[#efe5d4]'}`} style={{ height: `${Math.max(8, (n / Math.max(maxDay, HABIT_ITEMS.length / 2)) * 100)}%` }} title={`${n}`} />
                  </div>
                  <span className="text-[10.5px] font-semibold text-[#8a7a6a]">{WEEKDAYS_SHORT_GE[d.getDay()]}</span>
                </div>
              ))}
            </div>
          </div>

          <dl className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] divide-y divide-[#f1e8d9] text-sm">
            <Row label="ბოლო აქტივობა">{agoLabel(s.lastActive)}</Row>
            <Row label="ხმა">{(s.profile.voices || []).map((v: string) => VOICE[v] || v).join(', ') || '—'}</Row>
            <Row label="შესაძლებლობები">{abilitiesText(s.profile) || '—'}</Row>
            <Row label="ინტერესები">{interestsText(s.profile) || '—'}</Row>
            <Row label="გზაზე">{s.path} საგალობელი/სიმღერა</Row>
            {s.abituri && <Row label="აბიტურიენტი">{s.abituri}</Row>}
            <Row label="სამუშაო განრიგი">{schedule.length ? schedule.map(([d, h]) => `${d}: ${h}`).join(' · ') : 'არ არის გაწერილი'}</Row>
          </dl>

          {/* kids' mode: the teacher turns it on; the student can't turn it off */}
          <div className="rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] px-3.5 pb-3">
            <Toggle
              on={kids.on}
              onChange={on => setKids({ ...kids, on })}
              label={<span className="inline-flex items-center gap-1.5"><Lock className="w-4 h-4 text-[#7a2028]" /> საბავშვო რეჟიმი</span>}
              hint="ჩანს მხოლოდ არჩეული განყოფილებები; იმალება გაზიარება, გარე ბმულები, ანგარიშიდან გასვლა და პარამეტრები. გამორთვა მხოლოდ მასწავლებელს შეუძლია."
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
          <Btn kind="ghost" full icon={<Route />} onClick={() => setView('path')}>საგანძურის გზა და ჩათვლა</Btn>
        </div>
      )}
    </Sheet>
  );
};

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex gap-3 px-3.5 py-2.5">
    <dt className="w-32 shrink-0 text-[#8a7a6a]">{label}</dt>
    <dd className="min-w-0 flex-1 font-semibold text-[#2a2017]">{children}</dd>
  </div>
);
