import React, { useRef, useState } from 'react';
import { Plus, Archive, ArchiveRestore, Upload, Check, RefreshCw, ExternalLink, Pencil, BookOpen, Users, ListMusic, TriangleAlert } from 'lucide-react';
import { arrayRemove, arrayUnion, collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { useAuth, useNavigation } from '../../context';
import { SchoolClass, ProgramItem, imageFileToDataUrl, toClass } from '../../hooks/useClasses';
import { teachersOf, teachersToDrop } from '../../utils/classTeachers';
import { errorText } from '../../utils/errorText';
import { Fold } from './Fold';
import { ClassLogo } from '../classes/ClassLogo';
import { triggerHaptic } from '../../utils/haptics';
import { filterValidVariants } from '../../utils/variantValidation';
import { PathItem, sortPathItems, findCatalogEntry, voicesOf } from '../../utils/pathItems';
import { writePath } from './MemberPathEditor';
import { linkTeachers } from '../../hooks/useTeaching';
import { askConfirm, Avatar, Bar, Btn, IconBtn, Pill, Sheet } from '../ui/kit';
import { LeaderChips } from './LeaderChips';
import { useClassAttendance, useGroupReading } from './StatsTab';
import { GroupMember, PsalterGroup, toGroup } from '../../hooks/usePsalter';
import { KATHISMA_COUNT, cycleOf, georgiaToday, ownersIn, rebase } from '../../utils/psalter';
import { MONTHS_SHORT_GE } from '../../utils/dateNames';

/**
 * Puts the class program on each member's path (missing items are added at the end) and takes back
 * items this class added earlier that left the program, unless the student already marked a voice.
 * Former members only lose such untouched class items.
 */
const syncMemberPaths = async (classId: string, program: ProgramItem[], memberIds: string[], formerIds: string[]) => {
  const programIds = program.map(p => p.id).filter((x): x is string => !!x);
  let failed = 0;
  for (const uid of [...memberIds, ...formerIds]) {
    const keep = memberIds.includes(uid) ? new Set(programIds) : new Set<string>();
    try {
      const snap = await getDoc(doc(db, 'students', uid));
      const map: Record<string, PathItem> = filterValidVariants((snap.exists() && snap.data().selectedChantVariants) || {});
      let list = sortPathItems(Object.values(map));
      const before = list.length;
      list = list.filter(it => !(it.assignedByClass === classId && !keep.has(it.variantId) && voicesOf(it, it.variantId).length === 0));
      let changed = list.length !== before;
      for (const id of keep) {
        if (map[id]) continue;
        const entry = findCatalogEntry(id);
        if (entry) { list.push({ ...entry.make(), assignedByClass: classId }); changed = true; }
      }
      if (changed) await writePath(uid, Object.fromEntries(list.map((it, i) => [it.variantId, { ...it, order: i }])));
    } catch {
      failed++;
    }
  }
  return failed;
};

/** Takes one member out of the class (the teacher's button on their card); the class's untouched items leave their path
 *  and its teachers stop seeing their record. */
export const removeClassMember = async (cls: SchoolClass, uid: string) => {
  await updateDoc(doc(db, 'classes', cls.id), {
    memberIds: cls.memberIds.filter(x => x !== uid),
    members: cls.members.filter(m => m.uid !== uid),
    updatedAt: new Date().toISOString(),
  });
  await syncMemberPaths(cls.id, cls.program, [], [uid]);
  await leaveClassGroup(cls, uid).catch(() => {});
  await dropClassTeachers(cls, uid).catch(() => {});
};

// the class's teachers come off the member's teacherIds unless they lead another class of theirs. An admin sees every
// class; a teacher only their own, so another class's teacher may drop off too — opening that class links them back
// (useClassStudents), and the admin panel puts every list right when it opens
const dropClassTeachers = async (cls: SchoolClass, uid: string) => {
  if (!cls.teacherIds.length) return;
  const all = collection(db, 'classes');
  const me = auth.currentUser?.uid || '';
  const snap = await getDocs(query(all, where('memberIds', 'array-contains', uid)))
    .catch(() => getDocs(query(all, where('teacherIds', 'array-contains', me))));
  const drop = teachersToDrop(uid, cls, snap.docs.map(d => toClass(d.id, d.data())));
  if (drop.length) await updateDoc(doc(db, 'students', uid), { teacherIds: arrayRemove(...drop), teacherVia: cls.id });
};

/** Admins: sets each member's teacherIds to the teachers of the classes (in use) they are in. Returns the failures
 *  (a member without a record has nothing to guard and does not count). */
export const syncStudentTeachers = async (uids: string[], classes: SchoolClass[]) => {
  const res = await Promise.all(uids.map(uid =>
    updateDoc(doc(db, 'students', uid), { teacherIds: teachersOf(uid, classes) })
      .then(() => 0, (e: any) => (String(e?.code || '').includes('not-found') ? 0 : 1))
  ));
  return res.reduce((a: number, b: number) => a + b, 0);
};

/** Admins: puts the class in the archive (on) or brings it back. Nothing is deleted: the class and its psalter group
 *  are hidden from everyone, and its teachers stop seeing its members' records until it comes back.
 *  `inUse` = the classes in use now. Returns the members whose access could not be set. */
export const archiveClass = async (cls: SchoolClass, on: boolean, inUse: SchoolClass[]) => {
  const now = new Date().toISOString();
  await updateDoc(doc(db, 'classes', cls.id), { archived: on, archivedAt: on ? now : '', updatedAt: now });
  if (cls.psalterGroupId) {
    await updateDoc(doc(db, 'psalterGroups', cls.psalterGroupId), { archived: on, updatedAt: now }).catch(() => {});
  }
  const others = inUse.filter(c => c.id !== cls.id);
  return syncStudentTeachers(cls.memberIds, on ? others : [...others, { ...cls, archived: false }]);
};

// the class's psalter group follows the class: a new member joins it (a kanon is named in the kanon's window or by
// „ავტომატური განაწილება“), one taken out leaves it and their kanon goes free
const joinClassGroup = async (cls: SchoolClass, p: { uid: string; name: string; photoURL?: string }) => {
  if (!cls.psalterGroupId) return;
  const me: GroupMember = { uid: p.uid, name: p.name, prayer: '', photoURL: p.photoURL || '' };
  await updateDoc(doc(db, 'psalterGroups', cls.psalterGroupId), { members: arrayUnion(me), memberIds: arrayUnion(p.uid), updatedAt: new Date().toISOString() });
};
const leaveClassGroup = async (cls: SchoolClass, uid: string) => {
  if (!cls.psalterGroupId) return;
  const ref = doc(db, 'psalterGroups', cls.psalterGroupId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const g = toGroup(snap.id, snap.data());
  if (!g.memberIds.includes(uid)) return;
  const half = cycleOf(georgiaToday(), g.cycleDays, g.shiftDays).half;
  const owners = ownersIn(g.assignment, g.baseHalf, half);
  await updateDoc(ref, {
    members: g.members.filter(m => m.uid !== uid),
    memberIds: g.memberIds.filter(x => x !== uid),
    assignment: rebase(Object.fromEntries(Object.entries(owners).map(([k, l]) => [k, l.filter(x => x !== uid)]))),
    baseHalf: half,
    updatedAt: new Date().toISOString(),
  });
};

/** Puts one person into the class (the „+“ on the class page's members card): their path gets the program, and the
 *  class's teachers may see it. Returns the failed paths (0 or 1). */
export const addClassMember = async (cls: SchoolClass, p: { uid: string; name: string; photoURL?: string }) => {
  if (cls.memberIds.includes(p.uid)) return 0;
  await updateDoc(doc(db, 'classes', cls.id), {
    memberIds: [...cls.memberIds, p.uid],
    members: [...cls.members, { uid: p.uid, name: p.name, photoURL: p.photoURL || '' }],
    updatedAt: new Date().toISOString(),
  });
  await linkTeachers(p.uid, cls).catch(() => {});
  await joinClassGroup(cls, p).catch(() => {});
  return syncMemberPaths(cls.id, cls.program, [p.uid], []);
};

const cleanProgram = (program: ProgramItem[]) =>
  program.map(p => ({ ...(p.id ? { id: p.id, code: p.code || '' } : {}), title: p.title.trim(), note: (p.note || '').trim() })).filter(p => p.title);

/** The class's program saved (the teacher's „სასწავლო პროგრამა“) and put on every member's path; returns the failed paths. */
export const saveClassProgram = async (cls: SchoolClass, program: ProgramItem[]) => {
  await updateDoc(doc(db, 'classes', cls.id), { program: cleanProgram(program), updatedAt: new Date().toISOString() });
  return syncMemberPaths(cls.id, program, cls.memberIds, []);
};

export interface AdminStudent {
  userId: string;
  name: string;
  email?: string;
  photoURL?: string;
}

export const CLASS_MODE_HINT = 'წევრები გალობაში ხედავენ მხოლოდ სასწავლო პროგრამის ვერსიებს — დამწყები აღარ იკარგება 1 130 ვერსიაში. „ყველაფრის ჩვენება“ ერთი შეხებით.';

const field = 'w-full h-11 px-3.5 rounded-xl bg-white ring-1 ring-[#e8dcc8] focus:ring-2 focus:ring-[#7a2028]/40 text-sm text-[#2a2017] placeholder:text-[#b3a594] outline-none transition';

type Draft = { id: string | null; name: string; logo: string; teacherIds: string[] };
const EMPTY: Draft = { id: null, name: '', logo: '', teacherIds: [] };

// „28 ოქტ“, with the year when it is another one
const shortDay = (iso?: string) => {
  const d = iso ? new Date(iso) : null;
  if (!d || isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTHS_SHORT_GE[d.getMonth()]}${d.getFullYear() === new Date().getFullYear() ? '' : ` ${d.getFullYear()}`}`;
};

// Classes: the admin's list of every class as a card; a tap opens the class page (the one workplace: members, program,
// mode, paths), ✎ opens a small window for what only admins set — name, logo, its teachers from `staff` — and
// creating a class or putting it in the archive. (The teachers' old members window with its long list of ticks is gone,
// 2026-10-28: a class page's „+“ adds one person at a time, and the members' starting buttons are in the class's ✎.)
// Since 2026-10-28 a class is never deleted: „არქივში“ hides it with its psalter group, „დაბრუნება“ brings it back.
export const ClassesAdmin: React.FC<{
  classes: SchoolClass[];
  /** classes in the archive: a folded list under the cards, each with „დაბრუნება“ */
  archived?: SchoolClass[];
  loading: boolean;
  /** the list did not come: then it never says that no class exists */
  failed?: boolean;
  onMessage: (text: string, type: 'success' | 'error') => void;
  staff?: AdminStudent[];
  /** psalter groups, so a class row shows its own group (a group lives only inside its class) */
  groups?: PsalterGroup[];
}> = ({ classes, archived = [], loading, failed, onMessage, staff = [], groups = [] }) => {
  const { user } = useAuth();
  const { openClass } = useNavigation();
  const tell = onMessage;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const edit = (c?: SchoolClass) => {
    setDraft(c ? { id: c.id, name: c.name, logo: c.logo || '', teacherIds: [...c.teacherIds] } : { ...EMPTY });
  };

  // members whose access to the teachers could not be set: said once, plainly
  const accessNote = (n: number) => (n ? ` ${n} წევრის ჩანაწერი ვერ განახლდა — ადმინის პანელის შემდეგ გახსნაზე გასწორდება.` : '');

  const restore = async (c: SchoolClass) => {
    setRestoring(c.id);
    try {
      const n = await archiveClass(c, false, classes);
      triggerHaptic(30);
      tell(`კლასი „${c.name}“ დაბრუნდა.${accessNote(n)}`, 'success');
    } catch (e) {
      tell('კლასი ვერ დაბრუნდა: ' + errorText(e), 'error');
    } finally {
      setRestoring(null);
    }
  };

  // admin: every class as a card (two columns on wide screens); the open class's window lies over them
  const list = (
    <section className="space-y-3">
      {/* the tab and the big number already say „კლასები“: no title here, only the button */}
      <div className="px-1 flex justify-end">
        <Btn size="sm" kind="soft" icon={<Plus />} onClick={() => edit()}>ახალი კლასი</Btn>
      </div>
      {loading ? (
        <p className="py-6 text-center text-sm text-[#8a7a6a]">იტვირთება…</p>
      ) : failed ? (
        <p className="rounded-3xl bg-red-50 ring-1 ring-red-200 px-4 py-6 text-center text-sm text-red-800">კლასები ვერ ჩაიტვირთა — შეამოწმე ინტერნეტი და გახსენი თავიდან.</p>
      ) : classes.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-[#dccbb0] px-4 py-8 text-center text-sm text-[#8a7a6a]">კლასი ჯერ არ შექმნილა. შექმენი პირველი და დაამატე წევრები.</p>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-3">
          {classes.map(c => <ClassRow key={c.id} cls={c} group={groups.find(g => g.id === c.psalterGroupId)} onOpen={() => openClass(c.id)} onEdit={() => edit(c)} />)}
        </ul>
      )}
      {archived.length > 0 && (
        <Fold icon={<Archive />} title={`არქივი · ${archived.length}`} summary="დამალული კლასები — არაფერი წაშლილა"
          info="არქივში გადატანილი კლასი და მისი ფსალმუნთა ჯგუფი არავის უჩანს და მისი მასწავლებლები ვეღარ ხედავენ წევრების ჩანაწერებს. ჩატი, დასწრება და დავალებები შენახულია — „დაბრუნება“ ყველაფერს უკან აბრუნებს.">
          <ul className="divide-y divide-[#efe4d3]">
            {archived.map(c => (
              <li key={c.id} className="min-h-[60px] py-2 flex items-center gap-3">
                <ClassLogo name={c.name} logo={c.logo} className="w-10 h-10 text-sm shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] font-semibold text-[#4a3426] leading-snug break-words">{c.name}</span>
                  <span className="block text-[12px] text-[#8a7a6a] leading-snug">
                    {c.members.length} წევრი{c.archivedAt ? ` · ${shortDay(c.archivedAt)}` : ''}
                  </span>
                </span>
                <Btn size="sm" kind="ghost" disabled={restoring === c.id} onClick={() => restore(c)}
                  icon={restoring === c.id ? <RefreshCw className="animate-spin" /> : <ArchiveRestore />}>
                  დაბრუნება
                </Btn>
              </li>
            ))}
          </ul>
        </Fold>
      )}
    </section>
  );

  if (!draft) return list;

  const set = (patch: Partial<Draft>) => setDraft(d => (d ? { ...d, ...patch } : d));
  const saved = classes.find(c => c.id === draft.id);
  // the chips: the school's teachers, and anyone already leading this class who is no longer among them (a role taken
  // away, a list still loading) — so saving the name or logo never drops a teacher unseen
  const people = [
    ...staff.map(s => ({ uid: s.userId, name: s.name, photoURL: s.photoURL })),
    ...(saved?.teachers || []).filter(t => !staff.some(s => s.userId === t.uid)),
  ];

  const pickLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      set({ logo: await imageFileToDataUrl(file) });
    } catch {
      tell('ლოგოს სურათი ვერ წაიკითხა.', 'error');
    }
  };

  const save = async () => {
    const name = draft.name.trim();
    if (!name) { tell('კლასს სახელი სჭირდება.', 'error'); return; }
    setSaving(true);
    try {
      const ref = draft.id ? doc(db, 'classes', draft.id) : doc(collection(db, 'classes'));
      // the admin's window: name, logo and teachers; members, program and the rest are set on the class page
      const now = new Date().toISOString();
      const teachers = draft.teacherIds
        .map(uid => people.find(p => p.uid === uid))
        .filter((p): p is (typeof people)[number] => !!p)
        .map(p => ({ uid: p.uid, name: p.name, photoURL: p.photoURL || '' }));
      const teacherIds = teachers.map(t => t.uid);
      await setDoc(ref, {
        name,
        logo: draft.logo,
        teacherIds,
        teachers,
        updatedAt: now,
        ...(draft.id ? {} : { memberIds: [], members: [], program: [], classMode: false, defaultShortcuts: [], createdAt: now, createdBy: user?.email || '' }),
      }, { merge: true });
      // new teachers see the members' records and lead the class's psalter group; the ones taken off no longer do
      let n = 0;
      const before = saved?.teacherIds || [];
      if (saved && (before.length !== teacherIds.length || before.some(t => !teacherIds.includes(t)))) {
        n = await syncStudentTeachers(saved.memberIds, classes.map(c => (c.id === saved.id ? { ...c, teacherIds } : c)));
        if (saved.psalterGroupId) {
          await updateDoc(doc(db, 'psalterGroups', saved.psalterGroupId), { teacherIds, teachers, updatedAt: now }).catch(() => { n++; });
        }
      }
      triggerHaptic(30);
      setDraft(null);
      tell((draft.id ? `კლასი „${name}“ შენახულია.` : `კლასი „${name}“ შეიქმნა — წევრებს და პროგრამას კლასის გვერდზე დაამატებ.`) + accessNote(n), 'success');
    } catch (e) {
      tell('კლასი ვერ შეინახა: ' + errorText(e), 'error');
    } finally {
      setSaving(false);
    }
  };

  const toArchive = async () => {
    if (!saved) return;
    if (!(await askConfirm({
      title: `გადავიტანო „${saved.name}“ არქივში?`,
      text: 'კლასი და მისი ფსალმუნთა ჯგუფი ყველას დაემალება, მასწავლებლები ვეღარ დაინახავენ წევრების ჩანაწერებს. არაფერი წაიშლება — „არქივიდან“ ერთი შეხებით დაბრუნდება.',
      ok: 'არქივში',
    }))) return;
    setSaving(true);
    try {
      const n = await archiveClass(saved, true, classes);
      triggerHaptic(30);
      setDraft(null);
      tell(`კლასი „${saved.name}“ არქივშია — ქვემოთ, „არქივში“ ნახავ.${accessNote(n)}`, 'success');
    } catch (e) {
      tell('კლასი ვერ გადავიდა არქივში: ' + errorText(e), 'error');
    } finally {
      setSaving(false);
    }
  };

  // name, logo, teachers
  const fields = (
    <>
      {/* name + logo */}
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => fileRef.current?.click()} title="ლოგოს ატვირთვა" className="relative shrink-0 cursor-pointer group">
          <ClassLogo name={draft.name || '?'} logo={draft.logo} className="w-20 h-20 text-3xl" />
          <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white ring-1 ring-[#e8dcc8] text-[#7a2028] flex items-center justify-center group-hover:bg-[#7a2028] group-hover:text-white transition-colors">
            <Upload className="w-4 h-4" />
          </span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickLogo} />
        <div className="flex-1 min-w-0 space-y-1.5">
          <label className="block text-xs font-semibold text-[#75685a]">კლასის სახელი</label>
          <input value={draft.name} onChange={e => set({ name: e.target.value })} placeholder="მაგ: გურჯაანის ჯგუფი" className={field} />
          {draft.logo && (
            <button type="button" onClick={() => set({ logo: '' })} className="text-xs text-[#8a7a6a] hover:text-[#7a2028] cursor-pointer">ლოგოს მოშორება</button>
          )}
        </div>
      </div>

      {/* teachers: chosen by admins */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-[#75685a]">მასწავლებელი</label>
        <LeaderChips people={people} selected={draft.teacherIds} onChange={teacherIds => set({ teacherIds })} />
      </div>
    </>
  );

  const saveIcon = saving ? <RefreshCw className="animate-spin" /> : <Check />;

  // the class's own window over the list
  return (
    <>
      {list}
      <Sheet
        open
        onClose={() => setDraft(null)}
        title={saved?.name || 'ახალი კლასი'}
        wide
        footer={
          <div className="flex gap-2">
            {saved && <Btn kind="ghost" size="lg" icon={<Archive />} onClick={toArchive} disabled={saving}>არქივში</Btn>}
            <Btn size="lg" icon={saveIcon} className="flex-1" onClick={save} disabled={saving || !draft.name.trim()}>შენახვა</Btn>
          </div>
        }
      >
        <div className="space-y-5">
          {saved && <Btn kind="ghost" size="sm" icon={<ExternalLink />} onClick={() => openClass(saved.id)}>კლასის გვერდი</Btn>}
          {fields}
        </div>
      </Sheet>
    </>
  );
};

/** The class's psalter group on its card: the kanons read on average in the last cycles (the group is the class's
 *  own, so its name would only repeat the card's). */
const ClassGroupLine: React.FC<{ group: PsalterGroup }> = ({ group }) => {
  const reading = useGroupReading(group);
  return (
    <span title={group.name}>
      <Pill tone="wine"><BookOpen /> {reading ? <span className="tabular-nums">კანონი {reading.avg.toFixed(1)}/{KATHISMA_COUNT}</span> : 'ფსალმუნთა ჯგუფი'}</Pill>
    </span>
  );
};

/** A class in the admin list, as a card: logo and name, its teachers, small chips (members, program, psalter
 *  group) and the attendance bar. A tap opens the class page; ✎ in the corner opens the admin's small window.
 *  A class without a teacher says so on the card. */
const ClassRow: React.FC<{ cls: SchoolClass; group?: PsalterGroup; onOpen: () => void; onEdit: () => void }> = ({ cls, group, onOpen, onEdit }) => {
  const rate = useClassAttendance(cls);
  return (
    <li className="relative">
      <button type="button" onClick={onOpen} title={`${cls.name} — კლასის გვერდი`}
        className="w-full h-full p-4 flex flex-col gap-3 text-left rounded-3xl bg-white/80 ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/35 hover:shadow-[0_8px_22px_-14px_rgba(74,52,38,0.4)] active:scale-[0.99] cursor-pointer transition group">
        <span className="flex items-start gap-3">
          <ClassLogo name={cls.name} logo={cls.logo} className="w-12 h-12 text-base shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block font-serif-ge text-[16px] font-bold leading-snug text-[#2a2017] line-clamp-2 group-hover:text-[#7a2028] transition-colors">{cls.name}</span>
            {cls.teachers.length ? (
              <span className="mt-1 flex items-center gap-1.5 min-w-0">
                <span className="flex -space-x-1.5 shrink-0">
                  {cls.teachers.slice(0, 3).map(t => <Avatar key={t.uid} name={t.name} photo={t.photoURL} size={20} className="ring-2 ring-white" />)}
                </span>
                <span className="text-xs text-[#8a7a6a] truncate">{cls.teachers.map(t => t.name).join(', ')}</span>
              </span>
            ) : (
              <span className="mt-1.5 flex"><Pill tone="amber"><TriangleAlert /> მასწავლებელი არ ჰყავს</Pill></span>
            )}
          </span>
          {/* room for the ✎ that lies over the card's corner */}
          <span aria-hidden className="w-7 shrink-0" />
        </span>
        <span className="flex flex-wrap gap-1.5">
          <Pill tone="muted"><Users /> {cls.members.length} წევრი</Pill>
          {cls.program.length > 0 && <Pill tone="muted"><ListMusic /> პროგრამაში {cls.program.length}</Pill>}
          {group && <ClassGroupLine group={group} />}
        </span>
        {rate !== null && (
          <span className="mt-auto flex items-center gap-2.5">
            <span className="text-[12px] font-semibold text-[#8a7a6a] shrink-0">დასწრება</span>
            <span className="flex-1 min-w-0"><Bar value={rate} max={100} tone={rate >= 75 ? 'green' : 'wine'} /></span>
            <span className="text-sm font-bold tabular-nums text-[#4a3426] shrink-0">{rate}%</span>
          </span>
        )}
      </button>
      <IconBtn label={`${cls.name} — სახელი, ლოგო, მასწავლებლები`} onClick={onEdit} className="absolute top-3 right-3 bg-white/90 ring-1 ring-[#e8dcc8]"><Pencil /></IconBtn>
    </li>
  );
};
