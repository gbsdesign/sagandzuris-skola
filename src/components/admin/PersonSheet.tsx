import React, { useState } from 'react';
import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { ArrowLeft, Check, Crown, GraduationCap, Hourglass, Pencil, ShieldAlert, ShieldCheck, User as UserIcon, X } from 'lucide-react';
import { db } from '../../firebase';
import { useAuth, SUPER_ADMIN_EMAIL, MAX_EXTRA_SUPERADMINS, ROLE_LABEL, Role } from '../../context';
import { SchoolClass } from '../../hooks/useClasses';
import { agoLabel } from '../../hooks/useTeaching';
import { ALL_FEATURES, FeatureId } from '../../utils/memberAccess';
import { showPhone } from '../../utils/profileFields';
import { askConfirm, Avatar, Btn, Flash, IconBtn, Pill, Sheet, useFlash } from '../ui/kit';
import { StudentProfileCard } from '../views/StudentProfileCard';
import { AccessPicker, AccessRecord, DecisionRecord, saveAccess } from './AccessRequests';
import { CentreDownloadSwitch } from './CentreDownload';
import type { StaffRecord, UserRecord } from './UsersTab';

export const ROLE_ICON: Record<Role, React.ReactNode> = {
  superadmin: <Crown />, admin: <ShieldCheck />, teacher: <GraduationCap />, member: <UserIcon />, guest: <UserIcon />,
};
const VOICE: Record<string, string> = { '1': 'I ხმა', '2': 'II ხმა', '3': 'III ხმა' };

export const isOwnerEmail = (u: UserRecord) => u.email.toLowerCase() === SUPER_ADMIN_EMAIL;
export const roleOf = (u: UserRecord, staff: StaffRecord[]): Role => {
  if (isOwnerEmail(u)) return 'superadmin';
  const e = u.email.toLowerCase();
  return staff.find(s => s.email === e)?.role || 'member';
};
export const roleName = (u: UserRecord, role: Role) => (isOwnerEmail(u) ? 'მფლობელი' : ROLE_LABEL[role]);

const sameFeatures = (a: 'all' | FeatureId[], b: 'all' | FeatureId[]) =>
  a === 'all' || b === 'all' ? a === b : a.length === b.length && a.every(f => b.includes(f));

// One person's window ("ერთი ფანჯარა"): who they are — the details they gave and their classes — their role,
// what they may open (superadmins), letting them in or refusing, and editing their profile, which opens inside
// this same window. Their learning (path, ოსტატობა, work, habits) is followed on the class page.
export const PersonSheet: React.FC<{
  person: UserRecord;
  staff: StaffRecord[];
  classes: SchoolClass[];
  access?: AccessRecord;      // superadmins only; none: a member from before approvals
  decision?: DecisionRecord;
  onClose: () => void;
  onMessage: (text: string, type: 'success' | 'error') => void;
}> = ({ person: u, staff, classes, access, decision, onClose, onMessage }) => {
  const { user, isOwner, isSuperAdmin } = useAuth();
  const note = useFlash();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  // the role buttons open from the role's ✎ (a rare change)
  const [roleOpen, setRoleOpen] = useState(false);

  const role = roleOf(u, staff);
  const isStaff = role !== 'member';
  const manageAccess = isSuperAdmin && !isStaff;   // staff never wait and always see everything
  const waiting = manageAccess && access?.status === 'pending';
  const refused = manageAccess && access?.status === 'rejected';
  const admitted = !waiting && !refused;

  // what they may open: a newcomer starts with everything ticked, a member keeps what they have (features that
  // no longer exist are left out)
  const had = access?.status === 'approved' ? access.features : 'all';
  const start: 'all' | FeatureId[] = had === 'all' ? 'all' : ALL_FEATURES.filter(f => had.includes(f));
  const [all, setAll] = useState(start === 'all');
  const [picked, setPicked] = useState<Set<FeatureId>>(() => new Set(start === 'all' ? ALL_FEATURES : start));
  const chosen: 'all' | FeatureId[] = all ? 'all' : ALL_FEATURES.filter(f => picked.has(f));
  const none = !all && picked.size === 0;
  const dirty = !sameFeatures(chosen, start);
  const resetAccess = () => { setAll(start === 'all'); setPicked(new Set(start === 'all' ? ALL_FEATURES : start)); };

  const decide = async (status: 'approved' | 'rejected') => {
    setBusy(true);
    try {
      await saveAccess(u.userId, user?.email || '', status, chosen);
      onMessage(status === 'rejected' ? `${u.name}: დამატება შეფერხდა.` : admitted ? `${u.name}: წვდომა შეინახა.` : `${u.name} დაემატა.`, 'success');
      onClose();
    } catch {
      note.fail('ვერ შეინახა — შეამოწმეთ ინტერნეტი ან უფლებები.');
      setBusy(false);
    }
  };
  const refuse = async () => {
    if (!(await askConfirm({ title: `${u.name} — დამატების შეფერხება?`, text: 'ის ანგარიშიდან გავა და შემდეგ შესვლებზეც ამას ნახავს, სანამ არ დაუშვებთ. მონაცემები შეინახება.', ok: 'შეფერხება', danger: true }))) return;
    void decide('rejected');
  };

  // roles: the owner names up to three superadmins, superadmins name admins, admins name teachers
  const extraSupers = staff.filter(s => s.role === 'superadmin' && s.email !== SUPER_ADMIN_EMAIL).length;
  const canManage = !isOwnerEmail(u) && (role === 'superadmin' ? isOwner : role === 'admin' ? isSuperAdmin : true);
  const choices: Role[] = canManage
    ? ['member', 'teacher', ...(isSuperAdmin ? ['admin' as const] : []), ...(isOwner ? ['superadmin' as const] : [])]
    : [];
  const setRole = async (next: Role) => {
    const email = u.email.toLowerCase();
    if (!email) { note.fail('ამ მომხმარებელს ელფოსტა არ აქვს — როლს ვერ მივანიჭებ.'); return; }
    if (next === 'superadmin' && extraSupers >= MAX_EXTRA_SUPERADMINS) {
      note.fail(`სუპერადმინი შენს გარდა მაქსიმუმ ${MAX_EXTRA_SUPERADMINS} შეიძლება იყოს.`);
      return;
    }
    if (!(await askConfirm({ title: `${u.name} — ${next === 'member' ? 'როლის მოხსნა (ჩვეულებრივი წევრი)' : `როლი: ${ROLE_LABEL[next]}`}?`, ok: 'შეცვლა' }))) return;
    setBusy(true);
    try {
      if (next === 'member') await deleteDoc(doc(db, 'admins', email));
      else await setDoc(doc(db, 'admins', email), {
        email, role: next, userId: u.userId, name: u.name, addedBy: user?.email || '', addedAt: new Date().toISOString(),
      });
      note.ok(next === 'member' ? 'როლი მოიხსნა.' : `ახლა ${ROLE_LABEL[next]}ა.`);
      setRoleOpen(false);
    } catch {
      note.fail('როლი ვერ შეიცვალა — ამის უფლება არ გაქვს.');
    } finally {
      setBusy(false);
    }
  };

  // the details, each once; empty ones are left out
  const inClasses = classes.filter(c => c.memberIds.includes(u.userId)).map(c => c.name);
  const teaches = classes.filter(c => c.teacherIds.includes(u.userId)).map(c => c.name);
  const facts: [string, React.ReactNode][] = [
    ['დაბადება', u.birth],
    ['ადგილი', [u.city, u.region].filter(Boolean).join(', ')],
    ['ტელეფონი', u.phone && (
      <a href={`tel:${u.phone.replace(/[^\d+]/g, '')}`} className="underline decoration-[#d9c8ac] underline-offset-2 hover:text-[#7a2028]">{showPhone(u.phone)}</a>
    )],
    ['ხმა', u.voices.map(v => VOICE[v] || v).join(', ')],
    ['შესაძლებლობები', u.abilities],
    ['ინტერესები', u.interests],
  ];
  if (admitted) {
    facts.push(['კლასი', inClasses.join(', ') || '—']);
    if (teaches.length) facts.push(['ასწავლის', teaches.join(', ')]);
  }
  const shown = facts.filter(([, v]) => v);
  const tries = Math.max(0, (access?.attempts || 0) - 1);

  const approveLabel = none ? 'აირჩიეთ ერთი მაინც' : 'დაშვება';
  const footer = editing ? undefined
    : waiting ? (
      <div className="flex gap-2">
        <Btn kind="danger" size="lg" icon={<X />} onClick={refuse} disabled={busy}>უარყოფა</Btn>
        <Btn size="lg" icon={<Check />} className="flex-1" onClick={() => decide('approved')} disabled={busy || none}>{approveLabel}</Btn>
      </div>
    ) : refused ? (
      <Btn size="lg" icon={<Check />} full onClick={() => decide('approved')} disabled={busy || none}>{approveLabel}</Btn>
    ) : manageAccess && dirty ? (
      <div className="flex gap-2">
        <Btn kind="ghost" size="lg" onClick={resetAccess} disabled={busy}>გაუქმება</Btn>
        <Btn size="lg" icon={<Check />} className="flex-1" onClick={() => decide('approved')} disabled={busy || none}>{none ? approveLabel : 'შენახვა'}</Btn>
      </div>
    ) : undefined;

  const title = editing ? (
    <span className="flex items-center gap-1">
      <IconBtn label="უკან" className="-ml-2" onClick={() => setEditing(false)}><ArrowLeft /></IconBtn>
      პროფილის რედაქტირება
    </span>
  ) : u.name;

  return (
    <Sheet open onClose={onClose} title={title} footer={footer} wide>
      {editing ? (
        <StudentProfileCard key={u.userId} member={{ uid: u.userId, email: u.email, displayName: u.displayName, photoURL: u.photoURL }} />
      ) : (
        <div className="space-y-4 text-sm">
          <Flash flash={note.flash} onClose={note.clear} />

          <div className="flex items-center gap-3.5">
            <Avatar name={u.name} photo={u.photoURL} size={56} />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-[13px] text-[#4a3426] break-all">{u.email || 'ელფოსტა არ არის'}</p>
              {waiting ? (
                <p className="flex items-start gap-1.5 text-[13px] font-semibold text-[#9a6212]">
                  <Hourglass className="w-4 h-4 shrink-0 mt-px" />
                  <span>ელოდება დადასტურებას · {agoLabel(access?.requestedAt)}{(access?.attempts || 0) > 1 && ` · შემოვიდა ${access?.attempts}-ჯერ`}</span>
                </p>
              ) : refused ? (
                <p className="flex items-start gap-1.5 text-[13px] font-semibold text-[#9b2c2c]">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-px" />
                  <span>შეფერხებულია · {tries > 0 ? `შესვლის მცდელობა: ${tries}, ბოლოს ${agoLabel(access?.lastAttemptAt)}` : agoLabel(access?.decidedAt)}</span>
                </p>
              ) : (
                <p className="text-[13px] text-[#8a7a6a]" title={u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleString('ka-GE') : undefined}>
                  ბოლოს შემოვიდა: {agoLabel(u.lastActiveAt)}
                </p>
              )}
              {u.kidsMode?.on && <Pill tone="amber">საბავშვო რეჟიმი</Pill>}
            </div>
            {/* the one ✎ of the app: a round 36px button beside what it changes */}
            <IconBtn label="პროფილის რედაქტირება" className="self-start" onClick={() => setEditing(true)}>
              <Pencil />
            </IconBtn>
          </div>

          {shown.length > 0 ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              {shown.map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-xs text-[#8a7a6a]">{k}</dt>
                  <dd className="font-semibold text-[#2a2017] break-words">{v}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <Pill tone="amber">პროფილს ჯერ ავსებს</Pill>
          )}

          {admitted && (
            <Part title="როლი">
              <div className="flex items-center gap-2 min-h-9">
                <p className="flex-1 min-w-0 inline-flex items-center gap-1.5 text-[15px] font-bold text-[#2a2017] [&>svg]:w-4 [&>svg]:h-4 [&>svg]:text-[#7a2028]">
                  {ROLE_ICON[role]} {roleName(u, role)}
                </p>
                {choices.length > 0 && (
                  <IconBtn label="როლის შეცვლა" aria-expanded={roleOpen} onClick={() => setRoleOpen(o => !o)} className={roleOpen ? '!bg-[#7a2028]/[0.1] !text-[#7a2028]' : ''}>
                    <Pencil />
                  </IconBtn>
                )}
              </div>
              {roleOpen && choices.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 sg-in">
                  {choices.map(r => (
                    <button key={r} type="button" disabled={busy || r === role} onClick={() => setRole(r)} aria-pressed={r === role}
                      className={`h-11 px-3.5 rounded-xl text-[13px] font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition [&>svg]:w-4 [&>svg]:h-4 ${r === role ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] hover:ring-[#7a2028]/40'} disabled:cursor-default`}>
                      {ROLE_ICON[r]} {ROLE_LABEL[r]}
                    </button>
                  ))}
                </div>
              )}
            </Part>
          )}

          {admitted && !isStaff && (
            <Part title="ფოლკლორის ცენტრის ჩანაწერები" sub="ჩამოწერა და ოფლაინ შენახვა">
              <CentreDownloadSwitch uid={u.userId} onMessage={onMessage} />
            </Part>
          )}

          {manageAccess && (
            <Part title="წვდომა" sub={admitted && decision?.by ? `დაუშვა: ${decision.by}` : undefined}>
              <AccessPicker all={all} picked={picked} onChange={(a, p) => { setAll(a); setPicked(p); }} />
              {admitted && (
                <Btn kind="danger" size="sm" icon={<ShieldAlert />} className="mt-3" onClick={refuse} disabled={busy}>დამატების შეფერხება</Btn>
              )}
            </Part>
          )}
        </div>
      )}
    </Sheet>
  );
};

/** One part of the window under a thin line: a small label and, under it, a muted line. */
const Part: React.FC<{ title: string; sub?: string; children: React.ReactNode }> = ({ title, sub, children }) => (
  <section className="pt-4 border-t border-[#e8dcc8]">
    <div className="mb-2.5">
      <h4 className="text-[13px] font-bold text-[#75685a]">{title}</h4>
      {sub && <p className="text-xs text-[#8a7a6a] break-all">{sub}</p>}
    </div>
    {children}
  </section>
);
