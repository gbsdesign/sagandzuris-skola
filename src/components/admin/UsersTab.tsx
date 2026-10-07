import React, { useMemo, useState } from 'react';
import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { ChevronDown, Search, ShieldCheck, GraduationCap, Crown, User as UserIcon } from 'lucide-react';
import { db } from '../../firebase';
import { useAuth, SUPER_ADMIN_EMAIL, MAX_EXTRA_SUPERADMINS, ROLE_LABEL, Role } from '../../context';
import { HABIT_ITEMS } from '../../data/habitsAndManera';
import { SchoolClass } from '../../hooks/useClasses';
import { PsalterGroup } from '../../hooks/usePsalter';
import { agoLabel } from '../../hooks/useTeaching';
import { computeMonthlyStats } from '../../hooks/useMonthlyStudyStats';
import { Avatar, Card, FIELD, Pill } from '../ui/kit';
import { abilitiesText, interestsText } from '../../utils/profileFields';

export interface UserRecord {
  userId: string;
  email: string;
  displayName: string;
  name: string;
  photoURL: string;
  firstName: string;
  lastName: string;
  city: string;
  region: string;
  phone: string;
  voices: string[];
  abilities: string;   // „შესაძლებლობები“, as text (utils/profileFields)
  interests: string;
  birth: string;
  workSchedule: Record<string, string>;
  completedSessions: Record<string, boolean>;
  habitLog: Record<string, string[]>;
  plays: Record<string, number>;
  lastActiveAt: string;
  createdAt: string;
  kidsMode?: { on?: boolean };
}

export interface StaffRecord {
  email: string;
  role: 'superadmin' | 'admin' | 'teacher';
  userId?: string;
  name?: string;
  addedBy?: string;
  addedAt?: string;
}

export const toUser = (id: string, d: any): UserRecord => {
  const p = d.profile || {};
  const firstName = p.firstName || d.firstName || '';
  const lastName = p.lastName || d.lastName || '';
  const email = d.email || p.email || '';
  return {
    userId: id,
    email,
    displayName: d.displayName || '',
    name: [firstName, lastName].filter(Boolean).join(' ') || d.displayName || email || 'უსახელო მომხმარებელი',
    photoURL: d.photoURL || '',
    firstName,
    lastName,
    city: p.city || d.city || '',
    region: p.region || d.region || '',
    phone: p.phone || '',
    voices: Array.isArray(p.voices) ? p.voices : [],
    abilities: abilitiesText(p),
    interests: interestsText(p),
    birth: p.birthDate?.year ? `${p.birthDate.day || 1}/${p.birthDate.month || 1}/${p.birthDate.year}` : '',
    workSchedule: p.workSchedule || {},
    completedSessions: d.completedSessions || {},
    habitLog: d.habitLog || {},
    plays: d.plays || {},
    lastActiveAt: d.lastActiveAt || d.updatedAt || '',
    createdAt: d.createdAt || '',
    kidsMode: d.kidsMode,
  };
};

const ROLE_ICON: Record<Role, React.ReactNode> = {
  superadmin: <Crown />, admin: <ShieldCheck />, teacher: <GraduationCap />, member: <UserIcon />, guest: <UserIcon />,
};
const VOICE: Record<string, string> = { '1': 'მთქმელი', '2': 'მოძახილი', '3': 'ბანი' };
type Filter = 'all' | 'teacher' | 'admin' | 'member' | 'active';

// "მომხმარებლები და როლები": everyone who signed in; search, filter, details and the role.
// Who may give which role: the owner — up to three superadmins; superadmins — admins; admins — teachers.
export const UsersTab: React.FC<{
  users: UserRecord[];
  staff: StaffRecord[];
  classes: SchoolClass[];
  groups: PsalterGroup[];
  loading: boolean;
  onMessage: (text: string, type: 'success' | 'error') => void;
}> = ({ users, staff, classes, groups, loading, onMessage }) => {
  const { user, isOwner, isSuperAdmin } = useAuth();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const roleOf = (u: UserRecord): Role => {
    const e = u.email.toLowerCase();
    if (e === SUPER_ADMIN_EMAIL) return 'superadmin';
    return staff.find(s => s.email === e)?.role || 'member';
  };
  const extraSupers = staff.filter(s => s.role === 'superadmin' && s.email !== SUPER_ADMIN_EMAIL).length;

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return users
      .filter(u => !s || `${u.name} ${u.displayName} ${u.email} ${u.city} ${u.region}`.toLowerCase().includes(s))
      .filter(u => {
        const r = roleOf(u);
        if (filter === 'teacher') return r === 'teacher';
        if (filter === 'admin') return r === 'admin' || r === 'superadmin';
        if (filter === 'member') return r === 'member';
        if (filter === 'active') return u.lastActiveAt && Date.now() - new Date(u.lastActiveAt).getTime() < 7 * 86400_000;
        return true;
      })
      .sort((a, b) => (b.lastActiveAt || '').localeCompare(a.lastActiveAt || ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, q, filter, staff]);

  // which roles I may give to / take from someone who now has `current`
  const canManage = (current: Role) =>
    current === 'superadmin' ? isOwner : current === 'admin' ? isSuperAdmin : true;
  const choices = (current: Role): Role[] => {
    if (!canManage(current)) return [];
    const list: Role[] = ['member', 'teacher'];
    if (isSuperAdmin) list.push('admin');
    if (isOwner) list.push('superadmin');
    return list;
  };

  const setRole = async (u: UserRecord, next: Role) => {
    const email = u.email.toLowerCase();
    if (!email) { onMessage('ამ მომხმარებელს ელფოსტა არ აქვს — როლს ვერ მივანიჭებ.', 'error'); return; }
    if (next === 'superadmin' && extraSupers >= MAX_EXTRA_SUPERADMINS) {
      onMessage(`სუპერადმინი შენს გარდა მაქსიმუმ ${MAX_EXTRA_SUPERADMINS} შეიძლება იყოს.`, 'error');
      return;
    }
    const label = ROLE_LABEL[next];
    if (!window.confirm(`${u.name} — ${next === 'member' ? 'როლის მოხსნა (ჩვეულებრივი წევრი)' : `როლი: ${label}`}?`)) return;
    setBusy(u.userId);
    try {
      if (next === 'member') await deleteDoc(doc(db, 'admins', email));
      else await setDoc(doc(db, 'admins', email), {
        email, role: next, userId: u.userId, name: u.name, addedBy: user?.email || '', addedAt: new Date().toISOString(),
      });
      onMessage(`${u.name}: ${next === 'member' ? 'როლი მოიხსნა' : `ახლა ${label}ა`}.`, 'success');
    } catch {
      onMessage('როლი ვერ შეიცვალა — ამის უფლება არ გაქვს.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'all', label: `ყველა · ${users.length}` },
    { id: 'active', label: 'აქტიური' },
    { id: 'teacher', label: 'მასწავლებლები' },
    { id: 'admin', label: 'ადმინები' },
    { id: 'member', label: 'წევრები' },
  ];

  return (
    <Card className="space-y-4">
      <div className="relative">
        <Search className="w-4 h-4 text-[#b3a594] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="ძებნა სახელით, ელფოსტით ან ქალაქით" className={`${FIELD} pl-10`} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map(f => (
          <button key={f.id} type="button" onClick={() => setFilter(f.id)}
            className={`h-9 px-3.5 rounded-full text-[13px] font-bold cursor-pointer transition ${filter === f.id ? 'bg-[#4a3426] text-[#fbf6ec]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426]'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-[#8a7a6a]">იტვირთება…</p>
      ) : shown.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#8a7a6a]">ვერ მოიძებნა.</p>
      ) : (
        <ul className="divide-y divide-[#f1e8d9] -mx-1">
          {shown.map(u => {
            const role = roleOf(u);
            const isOpen = open === u.userId;
            const userClasses = classes.filter(c => c.memberIds.includes(u.userId));
            const teaches = classes.filter(c => c.teacherIds.includes(u.userId));
            const userGroups = groups.filter(g => g.memberIds.includes(u.userId) || g.teacherIds.includes(u.userId));
            const work = computeMonthlyStats(u.workSchedule, u.completedSessions);
            const week = Object.entries(u.habitLog).filter(([d]) => Date.now() - new Date(d).getTime() < 7 * 86400_000).reduce((a, [, l]) => a + l.length, 0);
            const opts = choices(role);
            return (
              <li key={u.userId} className="px-1">
                <button type="button" onClick={() => setOpen(isOpen ? null : u.userId)} className="w-full flex items-center gap-3 py-3 text-left cursor-pointer group">
                  <Avatar name={u.name} photo={u.photoURL} size={44} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-[#2a2017] truncate group-hover:text-[#7a2028]">{u.name}</span>
                      {role !== 'member' && <Pill tone={role === 'superadmin' ? 'solid' : role === 'admin' ? 'brown' : 'wine'}>{ROLE_ICON[role]} {u.email.toLowerCase() === SUPER_ADMIN_EMAIL ? 'მფლობელი' : ROLE_LABEL[role]}</Pill>}
                      {u.kidsMode?.on && <Pill tone="amber">საბავშვო</Pill>}
                    </span>
                    <span className="block text-xs text-[#8a7a6a] truncate">{u.email || 'ელფოსტა არ არის'} · {agoLabel(u.lastActiveAt)}</span>
                  </span>
                  <ChevronDown className={`w-4 h-4 text-[#b3a594] shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                  <div className="mb-3 p-4 rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] space-y-4 text-sm sg-in">
                    <dl className="grid grid-cols-2 gap-x-5 gap-y-3">
                      <Info label="ხმა" value={u.voices.map(v => VOICE[v] || v).join(', ') || '—'} />
                      <Info label="შესაძლებლობები" value={u.abilities || '—'} />
                      <Info label="ინტერესები" value={u.interests || '—'} />
                      <Info label="სამუშაო ამ თვეში" value={work.planned ? `${work.worked}/${work.planned} სთ (${work.percent}%)` : 'განრიგი არ აქვს'} />
                      <Info label="ჩვევები 7 დღეში" value={`${week} მონიშვნა (${HABIT_ITEMS.length} ჩვევიდან)`} />
                      <Info label="ადგილი" value={[u.city, u.region].filter(Boolean).join(', ') || '—'} />
                      <Info label="დაბადება" value={u.birth || '—'} />
                      <Info label="კლასი" value={userClasses.map(c => c.name).join(', ') || '—'} />
                      <Info label="ფსალმუნთა ჯგუფი" value={userGroups.map(g => g.name).join(', ') || '—'} />
                      {teaches.length > 0 && <Info label="ასწავლის" value={teaches.map(c => c.name).join(', ')} />}
                      <Info label="ბოლო აქტივობა" value={u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleString('ka-GE') : '—'} />
                    </dl>

                    <div className="pt-3 border-t border-[#e8dcc8]">
                      <p className="text-xs font-bold text-[#75685a] mb-2">როლი</p>
                      {opts.length === 0 ? (
                        <p className="text-[13px] text-[#8a7a6a]">{u.email.toLowerCase() === SUPER_ADMIN_EMAIL ? 'სკოლის მფლობელი — როლი არ იცვლება.' : 'ამ როლის შეცვლის უფლება არ გაქვს.'}</p>
                      ) : (
                        <div className="grid grid-cols-2 min-[460px]:grid-cols-4 gap-1.5">
                          {opts.map(r => (
                            <button key={r} type="button" disabled={busy === u.userId || r === role} onClick={() => setRole(u, r)}
                              className={`h-11 px-2 rounded-xl text-[13px] font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition [&>svg]:w-4 [&>svg]:h-4 ${r === role ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] hover:ring-[#7a2028]/40'} disabled:cursor-default`}>
                              {ROLE_ICON[r]} {ROLE_LABEL[r]}
                            </button>
                          ))}
                        </div>
                      )}
                      {isOwner && <p className="mt-2 text-[11.5px] text-[#8a7a6a]">სუპერადმინი შენს გარდა: {extraSupers}/{MAX_EXTRA_SUPERADMINS}</p>}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
};

const Info: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="min-w-0">
    <dt className="text-xs text-[#8a7a6a]">{label}</dt>
    <dd className="font-semibold text-[#2a2017] break-words">{value}</dd>
  </div>
);
