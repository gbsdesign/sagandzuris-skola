import React, { useMemo, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { Users, Clock, Sparkles, ClipboardCheck, Route, Baby, Lock } from 'lucide-react';
import { db } from '../../firebase';
import { useAuth } from '../../context';
import { SchoolClass } from '../../hooks/useClasses';
import { StudentRecord, WEEKDAYS_SHORT, agoLabel, useAttendance } from '../../hooks/useTeaching';
import { computeMonthlyStats } from '../../hooks/useMonthlyStudyStats';
import { HABIT_ITEMS } from '../../data/habitsAndManera';
import { dayKey, lastDays } from '../../utils/habitsWeek';
import { DEFAULT_KIDS_SECTIONS, KidsMode, SECTIONS, SectionId } from '../../data/sections';
import { MemberPathEditor } from '../admin/MemberPathEditor';
import { Avatar, Btn, Card, CardTitle, Empty, Pill, Sheet, Stat, Toggle } from '../ui/kit';

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
  return { profile, work, week, habitTicks, path, kids, lastActive: data?.lastActiveAt || data?.updatedAt };
};

// "მოსწავლის მიმოხილვა": every member at a glance — independent work this month, habits this week,
// attendance and the last visit; a tap opens the details, the path and the kids' mode.
export const StudentsOverview: React.FC<{ cls: SchoolClass; records: Record<string, StudentRecord> }> = ({ cls, records }) => {
  const attendance = useAttendance(cls.id, 8);
  const [open, setOpen] = useState<string | null>(null);
  const rows = useMemo(
    () => cls.members.map(m => ({ m, rec: records[m.uid], s: summarize(records[m.uid]?.data) })),
    [cls.members, records]
  );
  if (!cls.members.length) return <Empty icon={<Users />} title="კლასში ჯერ წევრები არ არიან" text="დაამატე წევრები ჩანართში „კლასი“." />;

  const avgWork = Math.round(rows.reduce((a, r) => a + r.s.work.percent, 0) / rows.length);
  const activeWeek = rows.filter(r => r.s.lastActive && Date.now() - new Date(r.s.lastActive).getTime() < 7 * 86400_000).length;
  const lastLesson = attendance[0];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat value={`${avgWork}%`} label="სამუშაო, საშუალოდ" tone="wine" />
        <Stat value={`${activeWeek}/${rows.length}`} label="აქტიური 7 დღეში" tone="green" />
        <Stat value={lastLesson ? `${lastLesson.present.length}/${rows.length}` : '—'} label="ბოლო გაკვეთილზე" />
      </div>

      <Card>
        <CardTitle icon={<Users />} title="მოსწავლეები" hint="შეეხე მოსწავლეს დეტალებისთვის" />
        <ul className="space-y-2">
          {rows.map(({ m, rec, s }) => {
            const came = attendance.filter(d => d.present.includes(m.uid)).length;
            const pending = !rec || (!rec.data && !rec.denied);
            return (
              <li key={m.uid}>
                <button type="button" onClick={() => setOpen(m.uid)}
                  className="w-full text-left p-3 rounded-2xl bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/35 cursor-pointer transition active:scale-[0.995]">
                  <div className="flex items-center gap-3">
                    <Avatar name={m.name} photo={m.photoURL} size={42} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="font-semibold text-[#2a2017] truncate">{m.name}</span>
                        {s.kids?.on && <Pill tone="amber"><Baby /> საბავშვო</Pill>}
                      </span>
                      <span className="block text-xs text-[#8a7a6a]">
                        {rec?.denied ? 'მონაცემები ჯერ არ ჩანს — ვაკავშირებ…' : pending ? 'იტვირთება…' : `ბოლოს: ${agoLabel(s.lastActive)}`}
                        {(s.profile.voices || []).length > 0 && ` · ${(s.profile.voices as string[]).map(v => VOICE[v] || v).join(', ')}`}
                      </span>
                    </span>
                  </div>
                  {rec?.data && (
                    <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
                      <Mini icon={<Clock />} value={s.work.planned ? `${s.work.worked}/${s.work.planned}` : '—'} label="სთ ამ თვეში" warn={s.work.planned > 0 && s.work.percent < 40} />
                      <Mini icon={<Sparkles />} value={String(s.habitTicks)} label="ჩვევა 7 დღეში" />
                      <Mini icon={<ClipboardCheck />} value={attendance.length ? `${came}/${attendance.length}` : '—'} label="დასწრება" warn={attendance.length > 0 && came / attendance.length < 0.5} />
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      <StudentSheet cls={cls} uid={open} record={open ? records[open] : undefined} onClose={() => setOpen(null)} attendance={attendance} />
    </div>
  );
};

const Mini: React.FC<{ icon: React.ReactNode; value: string; label: string; warn?: boolean }> = ({ icon, value, label, warn }) => (
  <span className={`rounded-xl px-2 py-1.5 ${warn ? 'bg-amber-50' : 'bg-[#fbf6ec]'}`}>
    <span className={`flex items-center justify-center gap-1 text-sm font-bold tabular-nums [&>svg]:w-3.5 [&>svg]:h-3.5 ${warn ? 'text-amber-800' : 'text-[#4a3426]'}`}>{icon}{value}</span>
    <span className="block text-[10.5px] leading-tight text-[#8a7a6a]">{label}</span>
  </span>
);

const StudentSheet: React.FC<{
  cls: SchoolClass;
  uid: string | null;
  record?: StudentRecord;
  attendance: { date: string; present: string[] }[];
  onClose: () => void;
}> = ({ cls, uid, record, attendance, onClose }) => {
  const { user } = useAuth();
  const [view, setView] = useState<'info' | 'path'>('info');
  const [error, setError] = useState('');
  if (!uid) return null;
  const m = cls.members.find(x => x.uid === uid);
  const s = summarize(record?.data);
  const kids: KidsMode = { on: false, sections: DEFAULT_KIDS_SECTIONS, ...(s.kids || {}) };
  const came = attendance.filter(d => d.present.includes(uid)).length;
  const maxDay = Math.max(1, ...s.week.map(w => w.n));
  const schedule = Object.entries((s.profile.workSchedule || {}) as Record<string, string>).filter(([, h]) => h);

  const setKids = async (next: KidsMode) => {
    setError('');
    try {
      await updateDoc(doc(db, 'students', uid), { kidsMode: { ...next, by: user?.uid || '', at: new Date().toISOString() } });
    } catch {
      setError('ვერ შეინახა — მოსწავლის მონაცემებზე წვდომა ჯერ არ არის.');
    }
  };

  return (
    <Sheet open onClose={() => { setView('info'); onClose(); }} title={m?.name || 'მოსწავლე'} wide>
      <div className="grid grid-cols-2 gap-1 p-1 mb-4 rounded-2xl bg-white ring-1 ring-[#e8dcc8]">
        {(['info', 'path'] as const).map(v => (
          <button key={v} type="button" onClick={() => setView(v)}
            className={`h-10 rounded-xl text-sm font-bold cursor-pointer ${view === v ? 'bg-[#7a2028] text-[#fbf6ec]' : 'text-[#4a3426]'}`}>
            {v === 'info' ? 'მიმოხილვა' : 'საგანძურის გზა'}
          </button>
        ))}
      </div>

      {view === 'path' ? (
        <MemberPathEditor uid={uid} name={m?.name || 'მოსწავლე'} onError={t => setError(t)} />
      ) : !record?.data ? (
        <p className="py-8 text-center text-sm text-[#8a7a6a]">{record?.denied ? 'ამ მოსწავლის მონაცემები ჯერ არ ჩანს.' : 'იტვირთება…'}</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 min-[460px]:grid-cols-4 gap-2">
            <Stat value={s.work.planned ? `${s.work.percent}%` : '—'} label={`სამუშაო ${MONTHS[new Date().getMonth()]}`} tone="wine" />
            <Stat value={s.work.planned ? `${s.work.worked}/${s.work.planned}` : '—'} label="შესრულებული სთ" />
            <Stat value={String(s.work.missed)} label="გამოტოვებული სთ" tone={s.work.missed > 2 ? 'amber' : 'plain'} />
            <Stat value={attendance.length ? `${came}/${attendance.length}` : '—'} label="დასწრება (ბოლო)" tone="green" />
          </div>

          <div className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] p-3.5">
            <p className="text-[13px] font-bold text-[#75685a] mb-2">ჩვევები 7 დღეში · {s.habitTicks} მონიშვნა</p>
            <div className="flex items-end gap-1.5">
              {s.week.map(({ d, n }) => (
                <div key={d.toISOString()} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10.5px] font-bold tabular-nums text-[#4a3426]">{n || ''}</span>
                  <div className="w-full h-14 flex items-end">
                    <div className={`w-full rounded-md ${n ? 'bg-[#7a2028]' : 'bg-[#efe5d4]'}`} style={{ height: `${Math.max(8, (n / Math.max(maxDay, HABIT_ITEMS.length / 2)) * 100)}%` }} title={`${n}`} />
                  </div>
                  <span className="text-[10.5px] font-semibold text-[#8a7a6a]">{WEEKDAYS_SHORT[d.getDay()]}</span>
                </div>
              ))}
            </div>
          </div>

          <dl className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] divide-y divide-[#f1e8d9] text-sm">
            <Row label="ბოლო აქტივობა">{agoLabel(s.lastActive)}</Row>
            <Row label="ხმა">{(s.profile.voices || []).map((v: string) => VOICE[v] || v).join(', ') || '—'}</Row>
            <Row label="სტატუსი">{([] as string[]).concat(s.profile.experienceLevel || []).join(', ') || '—'}</Row>
            <Row label="გზაზე">{s.path} საგალობელი/სიმღერა</Row>
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
