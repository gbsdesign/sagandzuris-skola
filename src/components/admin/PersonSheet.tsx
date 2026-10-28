import React, { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, setDoc, updateDoc } from 'firebase/firestore';
import {
  ArrowLeft, BookOpenCheck, CalendarCheck, Check, ChevronRight, Crown, Dumbbell, Gem, GraduationCap, Hourglass, ListChecks,
  MessageCircle, Pencil, Plus, ShieldAlert, ShieldCheck, User as UserIcon, X,
} from 'lucide-react';
import { db } from '../../firebase';
import { useAuth, useNavigation, SUPER_ADMIN_EMAIL, MAX_EXTRA_SUPERADMINS, ROLE_LABEL, Role } from '../../context';
import { SchoolClass } from '../../hooks/useClasses';
import { agoLabel } from '../../hooks/useTeaching';
import { openAdminThread, syncKidsFlag } from '../../hooks/useDirectChat';
import { DEFAULT_KIDS_SECTIONS, SECTIONS } from '../../data/sections';
import { ALL_FEATURES, FeatureId } from '../../utils/memberAccess';
import { showPhone } from '../../utils/profileFields';
import { shortDate } from '../../utils/dateNames';
import { askConfirm, Avatar, Btn, Flash, IconBtn, Pill, Sheet, Toggle, useFlash } from '../ui/kit';
import { StudentProfileCard } from '../views/StudentProfileCard';
import { ClassLogo } from '../classes/ClassLogo';
import { AccessPicker, AccessRecord, DecisionRecord, saveAccess } from './AccessRequests';
import { CentreDownloadSwitch } from './CentreDownload';
import { SongTextSwitch } from './SongTextEditors';
import { addClassMember, removeClassMember } from './ClassesAdmin';
import { changed } from './changed';
import { logChange } from '../../utils/adminLog';
import type { StaffRecord, UserRecord } from './UsersTab';
import { errorText } from '../../utils/errorText';

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

// One person's window ("ერთი ფანჯარა"): who they are — the details they gave — a short picture of what they do in the
// app, their classes (each opens its page; „კლასში დამატება“ puts them into one more), their role and who gave it, the kids'
// mode, what they may open (superadmins), letting them in — with a class in the same step — or refusing, writing to them,
// and editing their profile, which opens inside this same window. Their learning in detail is followed on the class page.
export const PersonSheet: React.FC<{
  person: UserRecord;
  /** everyone, to name who gave a role or let someone in (the records keep an e-mail) */
  users: UserRecord[];
  staff: StaffRecord[];
  classes: SchoolClass[];
  access?: AccessRecord;      // superadmins only; none: a member from before approvals
  decision?: DecisionRecord;
  onClose: () => void;
  onMessage: (text: string, type: 'success' | 'error') => void;
}> = ({ person: u, users, staff, classes, access, decision, onClose, onMessage }) => {
  const { user, isOwner, isSuperAdmin } = useAuth();
  const { openClass, openDm } = useNavigation();
  const note = useFlash();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  // the role buttons open from the role's ✎ (a rare change)
  const [roleOpen, setRoleOpen] = useState(false);
  // „კლასში დამატება“ unfolds the classes they are not in
  const [adding, setAdding] = useState(false);
  // a newcomer's class, chosen before „დაშვება“ (one or none)
  const [joinId, setJoinId] = useState<string | null>(null);

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
    } catch {
      note.fail('ვერ შეინახა — შეამოწმეთ ინტერნეტი ან უფლებები.');
      setBusy(false);
      return;
    }
    // let in with a class: they are written into it in the same step
    const join = status === 'approved' && !admitted ? classes.find(c => c.id === joinId) : undefined;
    if (join) {
      try {
        await addClassMember(join, { uid: u.userId, name: u.name, photoURL: u.photoURL });
      } catch (e) {
        onMessage(`${u.name} დაემატა, მაგრამ კლასში „${join.name}“ ვერ ჩაიწერა: ${errorText(e)}`, 'error');
        onClose();
        return;
      }
    }
    logChange('access', status === 'rejected' ? `${u.name} — დამატება შეფერხდა`
      : admitted ? `${u.name} — წვდომა შეიცვალა` : `${u.name} დაემატა სკოლაში${join ? ` და ჩაიწერა კლასში „${join.name}“` : ''}`, u.userId);
    onMessage(status === 'rejected' ? `${u.name}: დამატება შეფერხდა.`
      : admitted ? `${u.name}: წვდომა შეინახა.`
      : join ? `${u.name} დაემატა და ჩაიწერა კლასში „${join.name}“.` : `${u.name} დაემატა.`, 'success');
    onClose();
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
    // no „დარწმუნებული ხარ?“: the change is made at once and „გაუქმება“ puts the old record back for a few seconds
    const before = given ? Object.fromEntries(Object.entries(given).filter(([, v]) => v !== undefined)) : null;
    const ref = doc(db, 'admins', email);
    setBusy(true);
    try {
      if (next === 'member') await deleteDoc(ref);
      else await setDoc(ref, {
        email, role: next, userId: u.userId, name: u.name, addedBy: user?.email || '', addedAt: new Date().toISOString(),
      });
      setRoleOpen(false);
      changed('role', `${u.name} — ${next === 'member' ? `როლი მოიხსნა (იყო ${ROLE_LABEL[role]})` : `როლი: ${ROLE_LABEL[next]}`}`, u.userId,
        () => (before ? setDoc(ref, before) : deleteDoc(ref)));
    } catch (e) {
      note.fail('როლი ვერ შეიცვალა: ' + errorText(e));
    } finally {
      setBusy(false);
    }
  };

  // who gave the role and who let them in, by name when the e-mail is someone's here
  const nameOf = (email?: string) => (email ? users.find(x => x.email.toLowerCase() === email.toLowerCase())?.name || email : '');
  const given = staff.find(s => s.email === u.email.toLowerCase());
  const roleSub = given?.addedBy ? `მიანიჭა: ${nameOf(given.addedBy)}${given.addedAt ? ` · ${shortDate(given.addedAt)}` : ''}` : undefined;
  const letIn = decision?.by ? `დაუშვა: ${nameOf(decision.by)}${decision.at ? ` · ${shortDate(decision.at)}` : ''}` : undefined;

  // their classes: each opens its page; the window closes on the way there
  const memberOf = classes.filter(c => c.memberIds.includes(u.userId));
  const teaches = classes.filter(c => c.teacherIds.includes(u.userId));
  const notIn = classes.filter(c => !c.memberIds.includes(u.userId));
  const goClass = (c: SchoolClass) => { onClose(); openClass(c.id); };
  const addTo = async (c: SchoolClass) => {
    setBusy(true);
    try {
      const me = { uid: u.userId, name: u.name, photoURL: u.photoURL || '' };
      const failed = await addClassMember(c, me);
      if (failed) note.fail(`ჩაიწერა კლასში „${c.name}“, მაგრამ პროგრამა გზაზე ვერ დაემატა — კლასის გვერდიდან სცადე თავიდან.`);
      setAdding(false);
      changed('member', `${u.name} ჩაიწერა კლასში „${c.name}“`, c.id,
        () => removeClassMember({ ...c, memberIds: [...c.memberIds, me.uid], members: [...c.members, me] }, me.uid));
    } catch (e) {
      note.fail(`კლასში ვერ ჩაიწერა: ${errorText(e)}`);
    } finally {
      setBusy(false);
    }
  };

  // writing to them: the administration's chat with this member
  const write = async () => {
    setBusy(true);
    try {
      const id = await openAdminThread({ uid: u.userId, name: u.name, photoURL: u.photoURL });
      onClose();
      openDm(id);
    } catch (e) {
      note.fail('ჩათი ვერ გაიხსნა: ' + errorText(e));
      setBusy(false);
    }
  };

  // the kids' mode (a teacher switches it on the class page too): only the sections chosen for children show
  const kidsOn = !!u.kidsMode?.on;
  const kidsSections = u.kidsMode?.sections?.length ? u.kidsMode.sections : DEFAULT_KIDS_SECTIONS;
  const setKids = async (on: boolean) => {
    const save = async (v: boolean) => {
      await updateDoc(doc(db, 'students', u.userId), {
        kidsMode: { on: v, sections: kidsSections, by: user?.uid || '', at: new Date().toISOString() },
      });
      // classmates' message lists leave a child in the kids' mode out
      void syncKidsFlag(u.userId, v);
    };
    try {
      await save(on);
      changed('kids', `${u.name} — საბავშვო რეჟიმი ${on ? 'ჩაირთო' : 'გამოირთო'}`, u.userId, () => save(!on));
    } catch (e) {
      note.fail('ვერ შეინახა: ' + errorText(e));
    }
  };

  // the details, each once; empty ones are left out
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
    ) : u.userId !== user?.uid ? (
      <Btn kind="soft" size="lg" icon={<MessageCircle />} full onClick={write} disabled={busy}>მიწერა</Btn>
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
          {/* the window's own messages, in sight however far it was scrolled */}
          {note.flash && <div className="sticky top-0 z-10"><Flash flash={note.flash} onClose={note.clear} /></div>}

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

          {admitted && <Activity person={u} classIds={memberOf.map(c => c.id)} />}

          {admitted && (
            <Part title="კლასები">
              {teaches.length > 0 && (
                <ClassChips label={memberOf.length ? 'ასწავლის' : undefined} list={teaches} onPick={goClass} teacher />
              )}
              {memberOf.length > 0 && (
                <ClassChips label={teaches.length ? 'წევრია' : undefined} list={memberOf} onPick={goClass} />
              )}
              {!teaches.length && !memberOf.length && <p className="text-[13px] text-[#8a7a6a]">კლასში ჯერ არ არის.</p>}
              {notIn.length > 0 && (
                <>
                  <button type="button" onClick={() => setAdding(a => !a)} aria-expanded={adding} disabled={busy}
                    className="mt-2.5 h-10 px-3.5 rounded-full bg-[#7a2028]/[0.08] hover:bg-[#7a2028]/[0.14] text-[#7a2028] text-[13px] font-bold inline-flex items-center gap-1.5 cursor-pointer transition disabled:opacity-50">
                    <Plus className="w-4 h-4" /> კლასში დამატება
                  </button>
                  {adding && (
                    <ul className="mt-2 rounded-2xl ring-1 ring-[#e8dcc8] bg-white divide-y divide-[#f1e8d9] sg-in">
                      {notIn.map(c => (
                        <li key={c.id}>
                          <button type="button" onClick={() => addTo(c)} disabled={busy}
                            className="w-full min-h-12 px-3 py-1.5 flex items-center gap-3 text-left cursor-pointer hover:bg-[#7a2028]/[0.04] disabled:opacity-50">
                            <ClassLogo name={c.name} logo={c.logo} className="w-9 h-9 text-xs shrink-0" />
                            <span className="flex-1 min-w-0">
                              <span className="block text-[14px] font-semibold text-[#2a2017] leading-snug break-words">{c.name}</span>
                              <span className="block text-[12px] text-[#8a7a6a]">{c.members.length} წევრი</span>
                            </span>
                            <Plus className="w-4 h-4 shrink-0 text-[#7a2028]" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </Part>
          )}

          {/* letting a newcomer in: a class can be chosen first, so they find their work at once */}
          {(waiting || refused) && classes.length > 0 && (
            <Part title="კლასი" sub="არჩევითი — დაშვებისას ამ კლასში ჩაიწერება">
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="კლასი">
                {classes.map(c => {
                  const on = joinId === c.id;
                  return (
                    <button key={c.id} type="button" role="radio" aria-checked={on} onClick={() => setJoinId(on ? null : c.id)}
                      className={`h-10 pl-1 pr-3.5 rounded-full text-[13px] font-bold inline-flex items-center gap-2 cursor-pointer transition ${on ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] hover:ring-[#7a2028]/40'}`}>
                      <ClassLogo name={c.name} logo={c.logo} className="w-8 h-8 text-[11px] shrink-0" />
                      <span className="max-w-[12rem] truncate">{c.name}</span>
                      {on && <Check className="w-4 h-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </Part>
          )}

          {admitted && (
            <Part title="როლი" sub={roleSub}>
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

          {/* the rights beyond a member's, one short row each (the folklore centre's recordings are staff's anyway) */}
          {admitted && (role === 'member' || role === 'teacher') && (
            <Part title="დამატებითი უფლებები">
              {!isStaff && <CentreDownloadSwitch uid={u.userId} name={u.name} onMessage={note.say} />}
              <SongTextSwitch uid={u.userId} name={u.name} onMessage={note.say} />
            </Part>
          )}

          {admitted && role === 'member' && (
            <Part title="საბავშვო რეჟიმი">
              <Toggle on={kidsOn} onChange={setKids} label="მხოლოდ ბავშვების განყოფილებები"
                hint={`ჩანს: ${SECTIONS.filter(x => kidsSections.includes(x.id)).map(x => x.label).join(', ')}`} />
            </Part>
          )}

          {manageAccess && (
            <Part title="წვდომა" sub={admitted ? letIn : undefined}>
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

/** Class chips in the person's window: logo, name, „›“; a tap opens the class page. */
const ClassChips: React.FC<{ label?: string; list: SchoolClass[]; onPick: (c: SchoolClass) => void; teacher?: boolean }> = ({ label, list, onPick, teacher }) => (
  <div className="mb-1.5">
    {label && <p className="mb-1 text-[12px] text-[#8a7a6a]">{label}</p>}
    <div className="flex flex-wrap gap-1.5">
      {list.map(c => (
        <button key={c.id} type="button" onClick={() => onPick(c)} title={`${c.name} — კლასის გვერდი`}
          className="h-10 pl-1 pr-2.5 rounded-full bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40 text-[13px] font-bold text-[#4a3426] inline-flex items-center gap-2 cursor-pointer transition active:scale-[0.98]">
          <ClassLogo name={c.name} logo={c.logo} className="w-8 h-8 text-[11px] shrink-0" />
          {teacher && <GraduationCap className="w-4 h-4 shrink-0 text-[#7a2028]" aria-label="ასწავლის" />}
          <span className="max-w-[13rem] truncate">{c.name}</span>
          <ChevronRight className="w-4 h-4 shrink-0 text-[#b3a594]" />
        </button>
      ))}
    </div>
  </div>
);

/** Attendance in the person's classes: the last 8 lessons of each, how many they came to. */
const useAttendanceOf = (uid: string, classIds: string[]) => {
  const [byClass, setByClass] = useState<Record<string, string[][]>>({});
  const key = classIds.join(',');
  useEffect(() => {
    if (!classIds.length) { setByClass({}); return; }
    const offs = classIds.map(id => onSnapshot(
      query(collection(db, 'classes', id, 'attendance'), orderBy('date', 'desc'), limit(8)),
      s => setByClass(m => ({ ...m, [id]: s.docs.map(d => (Array.isArray(d.data().present) ? d.data().present : [])) })),
      () => setByClass(m => ({ ...m, [id]: [] }))
    ));
    return () => offs.forEach(off => off());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const lessons = classIds.flatMap(id => byClass[id] || []);
  return lessons.length ? { held: lessons.length, came: lessons.filter(p => p.includes(uid)).length } : null;
};

/** The short picture: what they did in the app, from their own record (nothing new is stored). */
const Activity: React.FC<{ person: UserRecord; classIds: string[] }> = ({ person, classIds }) => {
  const a = person.activity;
  const att = useAttendanceOf(person.userId, classIds);
  const tiles: [React.ReactNode, React.ReactNode, string][] = [
    [<Gem />, a.pearls, 'მარგალიტი'],
    [<BookOpenCheck />, a.parts, 'ნასწავლი ნაწილი'],
    [<ListChecks />, a.habitsWeek, 'ჩვევა ამ კვირაში'],
    [<Dumbbell />, a.drills, 'სავარჯიშო'],
    ...(att ? [[<CalendarCheck />, `${att.came}/${att.held}`, 'დასწრება'] as [React.ReactNode, React.ReactNode, string]] : []),
  ];
  const nothing = !a.pearls && !a.parts && !a.habitsWeek && !a.drills && !att;
  return (
    <Part title="აქტივობა">
      {nothing ? (
        <p className="text-[13px] text-[#8a7a6a]">აპში ჯერ არაფერი გაუკეთებია.</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {tiles.map(([icon, n, label]) => (
            <div key={label} className="rounded-2xl bg-[#fbf6ec] ring-1 ring-[#efe4d3] px-2.5 py-2 min-w-0">
              <span className="flex items-center gap-1.5 text-[#7a2028] [&>svg]:w-4 [&>svg]:h-4 [&>svg]:shrink-0">
                {icon}
                <span className="text-[18px] font-bold tabular-nums text-[#2a2017] leading-none">{n}</span>
              </span>
              <span className="mt-1 block text-[12px] leading-tight text-[#8a7a6a]">{label}</span>
            </div>
          ))}
        </div>
      )}
    </Part>
  );
};
