import React, { useRef, useState } from 'react';
import { Plus, Trash2, Upload, Check, RefreshCw, ExternalLink, Pencil, BookOpen, Users, ListMusic, TriangleAlert } from 'lucide-react';
import { arrayUnion, collection, deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth, useNavigation } from '../../context';
import { SchoolClass, ProgramItem, imageFileToDataUrl } from '../../hooks/useClasses';
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

/** Takes one member out of the class (the teacher's button on their card); the class's untouched items leave their path. */
export const removeClassMember = async (cls: SchoolClass, uid: string) => {
  await updateDoc(doc(db, 'classes', cls.id), {
    memberIds: cls.memberIds.filter(x => x !== uid),
    members: cls.members.filter(m => m.uid !== uid),
    updatedAt: new Date().toISOString(),
  });
  await syncMemberPaths(cls.id, cls.program, [], [uid]);
  await leaveClassGroup(cls, uid).catch(() => {});
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

type Draft = {
  id: string | null; name: string; logo: string; memberIds: string[]; savedMemberIds: string[]; program: ProgramItem[];
  teacherIds: string[]; classMode: boolean; defaultShortcuts: string[];
};
const EMPTY: Draft = { id: null, name: '', logo: '', memberIds: [], savedMemberIds: [], program: [], teacherIds: [], classMode: false, defaultShortcuts: [] };

// Classes: the admin's list of every class as a card; a tap opens the class page (the one workplace: members, program,
// mode, paths), ✎ opens a small window for what only admins set — name, logo, its teachers from `staff` — and
// creating or deleting a class. (The teachers' old members window with its long list of ticks is gone, 2026-10-28:
// a class page's „+“ adds one person at a time, and the members' starting buttons are in the class's ✎.)
export const ClassesAdmin: React.FC<{
  classes: SchoolClass[];
  loading: boolean;
  onMessage: (text: string, type: 'success' | 'error') => void;
  staff?: AdminStudent[];
  /** psalter groups, so a class row shows its own group (a group lives only inside its class) */
  groups?: PsalterGroup[];
}> = ({ classes, loading, onMessage, staff = [], groups = [] }) => {
  const { user } = useAuth();
  const { openClass } = useNavigation();
  const tell = onMessage;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const edit = (c?: SchoolClass) => {
    setDraft(c ? {
      id: c.id, name: c.name, logo: c.logo || '', memberIds: [...c.memberIds], savedMemberIds: [...c.memberIds],
      program: c.program.map(p => ({ ...p })), teacherIds: [...c.teacherIds], classMode: Boolean(c.classMode),
      defaultShortcuts: [...(c.defaultShortcuts || [])],
    } : { ...EMPTY });
  };

  // admin: every class as a card (two columns on wide screens); the open class's window lies over them
  const list = (
    <section>
      {/* the tab and the big number already say „კლასები“: no title here, only the button */}
      <div className="mb-3 px-1 flex justify-end">
        <Btn size="sm" kind="soft" icon={<Plus />} onClick={() => edit()}>ახალი კლასი</Btn>
      </div>
      {loading ? (
        <p className="py-6 text-center text-sm text-[#8a7a6a]">იტვირთება...</p>
      ) : classes.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-[#dccbb0] px-4 py-8 text-center text-sm text-[#8a7a6a]">კლასი ჯერ არ შექმნილა. შექმენი პირველი და დაამატე წევრები.</p>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-3">
          {classes.map(c => <ClassRow key={c.id} cls={c} group={groups.find(g => g.id === c.psalterGroupId)} onOpen={() => openClass(c.id)} onEdit={() => edit(c)} />)}
        </ul>
      )}
    </section>
  );

  if (!draft) return list;

  const set = (patch: Partial<Draft>) => setDraft(d => (d ? { ...d, ...patch } : d));

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
        .map(uid => staff.find(s => s.userId === uid))
        .filter(Boolean)
        .map(s => ({ uid: s!.userId, name: s!.name, photoURL: s!.photoURL || '' }));
      const teacherIds = teachers.map(t => t.uid);
      await setDoc(ref, {
        name,
        logo: draft.logo,
        teacherIds,
        teachers,
        updatedAt: now,
        ...(draft.id ? {} : { memberIds: [], members: [], program: [], classMode: false, defaultShortcuts: [], createdAt: now, createdBy: user?.email || '' }),
      }, { merge: true });
      // the class's teachers may now see and arrange the members' paths
      if (teacherIds.length) {
        await Promise.all(draft.savedMemberIds.map(uid =>
          setDoc(doc(db, 'students', uid), { teacherIds: arrayUnion(...teacherIds) }, { merge: true }).catch(() => {})
        ));
      }
      triggerHaptic(30);
      setDraft(d => (d ? { ...d, id: ref.id } : d));
      tell(draft.id ? `კლასი „${name}“ შენახულია.` : `კლასი „${name}“ შეიქმნა — წევრებს და პროგრამას კლასის გვერდზე დაამატებ.`, 'success');
    } catch (err: any) {
      tell('კლასი ვერ შეინახა: ' + (err?.code === 'permission-denied' ? 'ბაზის წესებში კლასები ჯერ არ არის დამატებული.' : err?.message || ''), 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!draft.id) return;
    if (!(await askConfirm({ title: `წავშალო კლასი „${draft.name}“?`, text: 'წევრები თავად არ წაიშლებიან.', ok: 'წაშლა', danger: true }))) return;
    try {
      await deleteDoc(doc(db, 'classes', draft.id));
      onMessage(`კლასი „${draft.name}“ წაიშალა.`, 'success');
      setDraft(null);
    } catch (err: any) {
      onMessage('კლასი ვერ წაიშალა: ' + (err?.message || ''), 'error');
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
        <LeaderChips
          people={staff.map(s => ({ uid: s.userId, name: s.name, photoURL: s.photoURL }))}
          selected={draft.teacherIds}
          onChange={teacherIds => set({ teacherIds })}
        />
      </div>
    </>
  );

  const saveIcon = saving ? <RefreshCw className="animate-spin" /> : <Check />;

  // the class's own window over the list
  const saved = classes.find(c => c.id === draft.id);
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
            {saved && <Btn kind="danger" size="lg" icon={<Trash2 />} onClick={remove}>წაშლა</Btn>}
            <Btn size="lg" icon={saveIcon} className="flex-1" onClick={save} disabled={saving}>შენახვა</Btn>
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
