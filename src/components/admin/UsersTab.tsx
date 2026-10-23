import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronRight, GraduationCap, Hourglass, ListChecks, Search, Shield, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context';
import { SchoolClass } from '../../hooks/useClasses';
import { PsalterGroup } from '../../hooks/usePsalter';
import { agoLabel } from '../../hooks/useTeaching';
import { ALL_FEATURES } from '../../utils/memberAccess';
import { Avatar, Card, FIELD, Pill } from '../ui/kit';
import { abilitiesText, interestsText } from '../../utils/profileFields';
import { AccessRecord, DecisionRecord } from './AccessRequests';
import { PersonSheet, ROLE_ICON, roleName, roleOf } from './PersonSheet';

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

export type Filter = 'all' | 'pending' | 'week' | 'month' | 'habits' | 'teacher' | 'admin' | 'refused';
const within = (iso: string, days: number) => !!iso && Date.now() - new Date(iso).getTime() < days * 86400_000;

/** Who each filter holds; the panel's big numbers and the list's chips count with the same tests. */
export const filterTests = (staff: StaffRecord[], access: Record<string, AccessRecord>, isSuperAdmin: boolean) => {
  // staff never wait, so a status only counts for members
  const statusOf = (u: UserRecord) => (isSuperAdmin && roleOf(u, staff) === 'member' ? access[u.userId]?.status : undefined);
  const test: Record<Filter, (u: UserRecord) => boolean> = {
    all: () => true,
    pending: u => statusOf(u) === 'pending',
    refused: u => statusOf(u) === 'rejected',
    week: u => within(u.lastActiveAt, 7),
    month: u => within(u.lastActiveAt, 30),
    habits: u => Object.entries(u.habitLog).some(([d, l]) => l.length > 0 && within(d, 7)),
    teacher: u => roleOf(u, staff) === 'teacher',
    admin: u => ['admin', 'superadmin'].includes(roleOf(u, staff)),
  };
  return { statusOf, test };
};

const CHIPS: { id: Filter; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'pending', label: 'ელოდება', Icon: Hourglass },
  { id: 'month', label: 'აქტიური თვეში', Icon: CalendarDays },
  { id: 'habits', label: 'ჩვევებს ინიშნავს', Icon: ListChecks },
  { id: 'teacher', label: 'მასწავლებლები', Icon: GraduationCap },
  { id: 'admin', label: 'ადმინები', Icon: Shield },
  { id: 'refused', label: 'შეფერხებული', Icon: ShieldAlert },
];

// "მომხმარებლები": everyone who signed in, in one list with one search. The panel's big numbers on top choose the
// main filters (they live in AdminPanelPage); the chips here hold the rest, each with how many it holds, and a
// second tap on a chip goes back to everyone. Members waiting to be let in stand on top (superadmins).
// A tap on a person opens their one window (PersonSheet).
export const UsersTab: React.FC<{
  users: UserRecord[];
  staff: StaffRecord[];
  classes: SchoolClass[];
  groups: PsalterGroup[];
  access: Record<string, AccessRecord>;
  decisions: Record<string, DecisionRecord>;
  loading: boolean;
  filter: Filter;
  onFilter: (f: Filter) => void;
  /** filters already shown as the panel's big numbers: they get no chip */
  tiles: Filter[];
  onMessage: (text: string, type: 'success' | 'error') => void;
}> = ({ users, staff, classes, groups, access, decisions, loading, filter, onFilter, tiles, onMessage }) => {
  const { isSuperAdmin } = useAuth();
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const { statusOf, test } = filterTests(staff, access, isSuperAdmin);
  const count = (f: Filter) => users.filter(test[f]).length;
  const FILTERS = CHIPS
    .filter(f => !tiles.includes(f.id))
    .map(f => ({ ...f, n: count(f.id) }))
    .filter(f => f.n > 0 || !['pending', 'refused'].includes(f.id));
  const active = tiles.includes(filter) || FILTERS.some(f => f.id === filter) ? filter : 'all';

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    const wait = (u: UserRecord) => statusOf(u) === 'pending';
    return users
      .filter(u => !s || `${u.name} ${u.displayName} ${u.email} ${u.city} ${u.region} ${u.phone}`.toLowerCase().includes(s))
      .filter(test[active])
      // the waiting first (oldest request first), then the most recently active
      .sort((a, b) => Number(wait(b)) - Number(wait(a))
        || (wait(a) ? (access[a.userId]?.requestedAt || '').localeCompare(access[b.userId]?.requestedAt || '') : 0)
        || (b.lastActiveAt || '').localeCompare(a.lastActiveAt || ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, q, active, staff, access, isSuperAdmin]);

  const open = openId ? users.find(u => u.userId === openId) : undefined;

  return (
    <Card className="space-y-4">
      <div className="relative">
        <Search className="w-4 h-4 text-[#b3a594] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="სახელი, ელფოსტა ან ქალაქი" aria-label="ძებნა" className={`${FIELD} pl-10`} />
      </div>
      {/* phones: one row that slides sideways (the labels are long); wider screens: wrapped rows */}
      <div className="-mx-4 sm:mx-0 px-4 sm:px-0 py-0.5 flex gap-1.5 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,#000_calc(100%-28px),transparent)] sm:flex-wrap sm:overflow-visible sm:[mask-image:none]">
        {FILTERS.map(({ id, label, Icon, n }) => {
          const on = active === id;
          return (
            <button key={id} type="button" onClick={() => onFilter(on ? 'all' : id)} aria-pressed={on}
              className={`shrink-0 whitespace-nowrap h-9 px-3.5 rounded-full text-[13px] font-bold cursor-pointer transition inline-flex items-center gap-1.5 ${on ? 'bg-[#7a2028]/[0.1] text-[#7a2028] ring-1 ring-[#7a2028]/30' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] hover:ring-[#7a2028]/30'}`}>
              {id === 'pending' ? <span className="w-2 h-2 rounded-full bg-amber-500" aria-hidden /> : <Icon className={`w-3.5 h-3.5 ${on ? '' : 'text-[#8a7a6a]'}`} />}
              {label}
              <span className={`tabular-nums ${on ? 'text-[#7a2028]/70' : 'text-[#8a7a6a]'}`}>{n}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-[#8a7a6a]">იტვირთება…</p>
      ) : shown.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#8a7a6a]">{q.trim() ? 'ვერ მოიძებნა.' : active === 'pending' ? 'მოლოდინში არავინ არის.' : 'აქ ჯერ არავინ არის.'}</p>
      ) : (
        <ul className="divide-y divide-[#f1e8d9] -mx-1">
          {shown.map(u => {
            const role = roleOf(u, staff);
            const status = statusOf(u);
            const a = access[u.userId];
            const limited = a && status === 'approved' && a.features !== 'all' ? a.features.filter(x => ALL_FEATURES.includes(x)).length : null;
            return (
              <li key={u.userId} className="px-1">
                <button type="button" onClick={() => setOpenId(u.userId)} className="w-full flex items-center gap-3 py-3 text-left cursor-pointer group">
                  <Avatar name={u.name} photo={u.photoURL} size={44} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-[#2a2017] truncate group-hover:text-[#7a2028]">{u.name}</span>
                      {status === 'pending' && <Pill tone="amber"><Hourglass /> ელოდება</Pill>}
                      {status === 'rejected' && <Pill tone="wine"><ShieldAlert /> შეფერხებული</Pill>}
                      {role !== 'member' && <Pill tone={role === 'superadmin' ? 'solid' : role === 'admin' ? 'brown' : 'wine'}>{ROLE_ICON[role]} {roleName(u, role)}</Pill>}
                      {limited !== null && <Pill tone="muted">წვდომა {limited}/{ALL_FEATURES.length}</Pill>}
                      {u.kidsMode?.on && <Pill tone="amber">საბავშვო</Pill>}
                    </span>
                    <span className="block text-xs text-[#8a7a6a] truncate">
                      {u.email || 'ელფოსტა არ არის'} · {status === 'pending' ? `მოთხოვნა ${agoLabel(a?.requestedAt)}` : agoLabel(u.lastActiveAt)}
                    </span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#b3a594] shrink-0" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {open && (
        <PersonSheet
          key={`${open.userId}-${access[open.userId]?.status || ''}`}
          person={open}
          staff={staff}
          classes={classes}
          groups={groups}
          access={access[open.userId]}
          decision={decisions[open.userId]}
          onClose={() => setOpenId(null)}
          onMessage={onMessage}
        />
      )}
    </Card>
  );
};
