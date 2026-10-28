import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronRight, Download, GraduationCap, Hourglass, ListChecks, MoonStar, School, Search, Shield, ShieldAlert, UserRoundPen, X } from 'lucide-react';
import { useAuth } from '../../context';
import { SchoolClass } from '../../hooks/useClasses';
import { agoLabel } from '../../hooks/useTeaching';
import { ALL_FEATURES } from '../../utils/memberAccess';
import { Avatar, Btn, Card, FIELD, Pill } from '../ui/kit';
import { abilitiesText, interestsText, profileComplete, showPhone } from '../../utils/profileFields';
import { personActivity, PersonActivity } from '../../utils/personActivity';
import { downloadCsv } from '../../utils/csv';
import type { KidsMode } from '../../data/sections';
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
  kidsMode?: Partial<KidsMode>;
  /** the teachers who may read this record (the teachers of the member's classes) */
  teacherIds: string[];
  /** everything „პირველი გაცნობა“ asks for is filled in (utils/profileFields) */
  profileDone: boolean;
  /** the person's window's short picture: pearls, learned parts, habits this week, exercises */
  activity: PersonActivity;
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
    teacherIds: Array.isArray(d.teacherIds) ? d.teacherIds : [],
    profileDone: profileComplete(d),
    activity: personActivity(d),
  };
};

export type Filter = 'all' | 'pending' | 'week' | 'month' | 'habits' | 'teacher' | 'admin' | 'refused' | 'noClass' | 'incomplete' | 'away';
const within = (iso: string, days: number) => !!iso && Date.now() - new Date(iso).getTime() < days * 86400_000;

/** Who each filter holds; the panel's big numbers and the list's chips count with the same tests. */
export const filterTests = (staff: StaffRecord[], access: Record<string, AccessRecord>, isSuperAdmin: boolean, classes: SchoolClass[]) => {
  // staff never wait, so a status only counts for members
  const statusOf = (u: UserRecord) => (isSuperAdmin && roleOf(u, staff) === 'member' ? access[u.userId]?.status : undefined);
  // „აქტიური“ counts the school's members: not the staff, not those waiting or refused
  const member = (u: UserRecord) => roleOf(u, staff) === 'member' && !['pending', 'rejected'].includes(statusOf(u) || '');
  const inClass = new Set(classes.flatMap(c => c.memberIds));
  const test: Record<Filter, (u: UserRecord) => boolean> = {
    all: () => true,
    pending: u => statusOf(u) === 'pending',
    refused: u => statusOf(u) === 'rejected',
    week: u => member(u) && within(u.lastActiveAt, 7),
    month: u => member(u) && within(u.lastActiveAt, 30),
    habits: u => Object.entries(u.habitLog).some(([d, l]) => l.length > 0 && within(d, 7)),
    teacher: u => roleOf(u, staff) === 'teacher',
    admin: u => ['admin', 'superadmin'].includes(roleOf(u, staff)),
    // the school's members nobody has put into a class yet
    noClass: u => member(u) && !inClass.has(u.userId),
    // stuck on „პირველი გაცნობა“ (staff are never asked it)
    incomplete: u => roleOf(u, staff) === 'member' && statusOf(u) !== 'rejected' && !u.profileDone,
    // members who have not opened the app for a month (or never since the records began)
    away: u => member(u) && !within(u.lastActiveAt, 30),
  };
  return { statusOf, member, test };
};

// „ელოდება“ has no chip: its place is the panel's big number (superadmins; others never see who waits)
const CHIPS: { id: Filter; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'month', label: 'აქტიური თვეში', Icon: CalendarDays },
  { id: 'habits', label: 'ჩვევებს ინიშნავს', Icon: ListChecks },
  { id: 'teacher', label: 'მასწავლებლები', Icon: GraduationCap },
  { id: 'admin', label: 'ადმინები', Icon: Shield },
  { id: 'refused', label: 'შეფერხებული', Icon: ShieldAlert },
  { id: 'noClass', label: 'კლასის გარეშე', Icon: School },
  { id: 'incomplete', label: 'პროფილი არასრული', Icon: UserRoundPen },
  { id: 'away', label: '30+ დღე არ შემოსულა', Icon: MoonStar },
];

// „წევრები“: everyone who signed in, in one list with one search. The panel's big numbers on top choose the
// main filters (they live in AdminPanelPage); the chips here hold the rest, each with how many it holds (an empty one
// is left out), and a second tap on a chip goes back to everyone. Members waiting to be let in stand on top (superadmins).
// A tap on a person opens their one window (PersonSheet; the panel keeps which one is open, so the search can open it).
// Superadmins can take the list as it is shown (search and filter) as a table for Excel / Google Sheets.
export const UsersTab: React.FC<{
  users: UserRecord[];
  staff: StaffRecord[];
  classes: SchoolClass[];
  access: Record<string, AccessRecord>;
  decisions: Record<string, DecisionRecord>;
  loading: boolean;
  filter: Filter;
  onFilter: (f: Filter) => void;
  /** filters already shown as the panel's big numbers: they get no chip */
  tiles: Filter[];
  openId: string | null;
  onOpen: (uid: string | null) => void;
  onMessage: (text: string, type: 'success' | 'error') => void;
}> = ({ users, staff, classes, access, decisions, loading, filter, onFilter, tiles, openId, onOpen, onMessage }) => {
  const { isSuperAdmin } = useAuth();
  const [q, setQ] = useState('');
  const setOpenId = onOpen;

  const { statusOf, test } = filterTests(staff, access, isSuperAdmin, classes);
  const classNames = (uid: string) => classes.filter(c => c.memberIds.includes(uid)).map(c => c.name).join(', ');
  const count = (f: Filter) => users.filter(test[f]).length;
  // a chip that holds nobody is left out — unless it is the one open, so it can be tapped shut
  const FILTERS = CHIPS
    .filter(f => !tiles.includes(f.id))
    .map(f => ({ ...f, n: count(f.id) }))
    .filter(f => f.n > 0 || f.id === filter);
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
  }, [users, q, active, staff, access, isSuperAdmin, classes]);

  const open = openId ? users.find(u => u.userId === openId) : undefined;

  // the list on screen as a table: phones in the local form (a leading „+“ reads as a formula in Excel)
  const exportTable = () => {
    const VOICE: Record<string, string> = { '1': 'I', '2': 'II', '3': 'III' };
    const day = (iso: string) => (iso ? iso.slice(0, 10) : '');
    const rows = shown.map(u => {
      const role = roleOf(u, staff);
      const status = statusOf(u);
      return [
        u.firstName || u.name, u.lastName, u.email, showPhone(u.phone).replace(/^\+995 /, ''), u.region, u.city, u.birth,
        u.voices.map(v => VOICE[v] || v).join(' '), classNames(u.userId), roleName(u, role),
        status === 'pending' ? 'ელოდება' : status === 'rejected' ? 'შეფერხებული' : '', day(u.lastActiveAt), day(u.createdAt),
      ];
    });
    downloadCsv(`sagandzuri-wevrebi-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['სახელი', 'გვარი', 'ელფოსტა', 'ტელეფონი', 'რეგიონი', 'ქალაქი / სოფელი', 'დაბადება', 'ხმა', 'კლასი', 'როლი', 'სტატუსი', 'ბოლოს შემოვიდა', 'პირველად შემოვიდა'],
      ...rows,
    ]);
    onMessage(`ცხრილი ჩამოიტვირთა: ${rows.length} ადამიანი. მასში ტელეფონებია — არ გაუზიარო სხვას.`, 'success');
  };

  return (
    <Card className="space-y-4">
      <div className="relative">
        <Search className="w-4 h-4 text-[#b3a594] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="სახელი, ელფოსტა ან ქალაქი" aria-label="ძებნა"
          className={`${FIELD} pl-10 pr-11 [&::-webkit-search-cancel-button]:hidden`} />
        {q && (
          <button type="button" onClick={() => setQ('')} aria-label="გასუფთავება" className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-[#a89886] hover:text-[#4a3426] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {/* the chips wrap into a second row instead of sliding out of sight; below 400px their icons step aside (as the
          bar's ⚙ does), so two fit in a row */}
      {FILTERS.length > 0 && <div className="flex flex-wrap gap-1.5">
        {FILTERS.map(({ id, label, Icon, n }) => {
          const on = active === id;
          return (
            <button key={id} type="button" onClick={() => onFilter(on ? 'all' : id)} aria-pressed={on}
              className={`shrink-0 whitespace-nowrap h-9 px-3 min-[400px]:px-3.5 rounded-full text-[13px] font-bold cursor-pointer transition inline-flex items-center gap-1.5 ${on ? 'bg-[#7a2028]/[0.1] text-[#7a2028] ring-1 ring-[#7a2028]/30' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] hover:ring-[#7a2028]/30'}`}>
              <Icon className={`hidden min-[400px]:block w-3.5 h-3.5 ${on ? '' : 'text-[#8a7a6a]'}`} />
              {label}
              <span className={`tabular-nums ${on ? 'text-[#7a2028]/70' : 'text-[#8a7a6a]'}`}>{n}</span>
            </button>
          );
        })}
      </div>}

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
                  {/* a green dot: here in the last week */}
                  <span className="relative shrink-0">
                    <Avatar name={u.name} photo={u.photoURL} size={44} />
                    {within(u.lastActiveAt, 7) && <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" aria-label="აქტიური ამ კვირაში" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    {/* one line each, so every row is as tall as the next: the name gives way, the signs stay whole */}
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className="min-w-0 font-semibold text-[#2a2017] truncate group-hover:text-[#7a2028]">{u.name}</span>
                      {status === 'pending' && <Pill tone="amber" className="shrink-0"><Hourglass /> ელოდება</Pill>}
                      {status === 'rejected' && <Pill tone="wine" className="shrink-0"><ShieldAlert /> შეფერხებული</Pill>}
                      {/* the role as its round sign, so the name keeps the room (the word is in the person's window) */}
                      {role !== 'member' && (
                        <span title={roleName(u, role)} aria-label={roleName(u, role)}
                          className={`shrink-0 w-6 h-6 rounded-full inline-flex items-center justify-center [&>svg]:w-3.5 [&>svg]:h-3.5 ${role === 'superadmin' ? 'bg-[#4a3426] text-[#fbf6ec]' : role === 'admin' ? 'bg-[#4a3426]/10 text-[#4a3426]' : 'bg-[#7a2028]/10 text-[#7a2028]'}`}>
                          {ROLE_ICON[role]}
                        </span>
                      )}
                    </span>
                    {/* the class says more than the e-mail; one without a class shows the e-mail */}
                    <span className="block text-xs text-[#8a7a6a] truncate">
                      {classNames(u.userId) || u.email || 'ელფოსტა არ არის'} · {status === 'pending' ? `მოთხოვნა ${agoLabel(a?.requestedAt)}` : agoLabel(u.lastActiveAt)}
                      {limited !== null && ` · წვდომა ${limited}/${ALL_FEATURES.length}`}
                      {u.kidsMode?.on && ' · საბავშვო'}
                    </span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#b3a594] shrink-0" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {isSuperAdmin && !loading && shown.length > 0 && (
        <div className="pt-1 flex justify-center">
          <Btn kind="ghost" size="sm" icon={<Download />} onClick={exportTable}
            title="სახელი, ტელეფონი, რეგიონი, ხმა, კლასი, როლი — ის სია, რაც ახლა ჩანს (ძებნით და ფილტრით)">
            ცხრილად ჩამოტვირთვა · {shown.length}
          </Btn>
        </div>
      )}

      {open && (
        <PersonSheet
          key={`${open.userId}-${access[open.userId]?.status || ''}`}
          person={open}
          users={users}
          staff={staff}
          classes={classes}
          access={access[open.userId]}
          decision={decisions[open.userId]}
          onClose={() => setOpenId(null)}
          onMessage={onMessage}
        />
      )}
    </Card>
  );
};
