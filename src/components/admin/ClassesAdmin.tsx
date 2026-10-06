import React, { useMemo, useRef, useState } from 'react';
import { Plus, Search, Trash2, Upload, X, Check, ArrowUp, ArrowDown, RefreshCw, ExternalLink } from 'lucide-react';
import { arrayUnion, collection, deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth, useNavigation } from '../../context';
import { SchoolClass, ProgramItem, imageFileToDataUrl } from '../../hooks/useClasses';
import { ClassLogo } from '../classes/ClassLogo';
import { triggerHaptic } from '../../utils/haptics';
import { filterValidVariants } from '../../utils/variantValidation';
import { PathItem, sortPathItems, findCatalogEntry, voicesOf, CATEGORY_LABEL } from '../../utils/pathItems';
import { CatalogPicker } from './CatalogPicker';
import { MemberPathEditor, writePath } from './MemberPathEditor';
import { linkTeachers } from '../../hooks/useTeaching';
import { Toggle } from '../ui/kit';

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

export interface AdminStudent {
  userId: string;
  name: string;
  email?: string;
  photoURL?: string;
}

const field = 'w-full h-11 px-3.5 rounded-xl bg-white ring-1 ring-[#e8dcc8] focus:ring-2 focus:ring-[#7a2028]/40 text-sm text-[#2a2017] placeholder:text-[#b3a594] outline-none transition';

type Draft = {
  id: string | null; name: string; logo: string; memberIds: string[]; savedMemberIds: string[]; program: ProgramItem[];
  teacherIds: string[]; classMode: boolean;
};
const EMPTY: Draft = { id: null, name: '', logo: '', memberIds: [], savedMemberIds: [], program: [], teacherIds: [], classMode: false };

// Classes: list + editor (name, logo, members, common program, "კლასის რეჟიმი").
// mode 'admin': every class; create, delete, choose the class's teachers (from `staff`); members from all users.
// mode 'teacher': the teacher's own class (opened at once with `openId`); members from the people list.
export const ClassesAdmin: React.FC<{
  classes: SchoolClass[];
  loading: boolean;
  students: AdminStudent[];
  onMessage: (text: string, type: 'success' | 'error') => void;
  mode?: 'admin' | 'teacher';
  staff?: AdminStudent[];
  openId?: string;
}> = ({ classes, loading, students, onMessage, mode = 'admin', staff = [], openId }) => {
  const { user } = useAuth();
  const { openClass } = useNavigation();
  const isAdminMode = mode === 'admin';
  const [draft, setDraft] = useState<Draft | null>(null);
  const [memberQuery, setMemberQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [pathOf, setPathOf] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const edit = (c?: SchoolClass) => {
    setMemberQuery('');
    setPathOf(null);
    setDraft(c ? {
      id: c.id, name: c.name, logo: c.logo || '', memberIds: [...c.memberIds], savedMemberIds: [...c.memberIds],
      program: c.program.map(p => ({ ...p })), teacherIds: [...c.teacherIds], classMode: Boolean(c.classMode),
    } : { ...EMPTY });
  };

  // the teacher panel opens its class straight away
  const opened = classes.find(c => c.id === openId);
  React.useEffect(() => {
    if (opened && draft?.id !== opened.id) edit(opened);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened?.id]);

  const shownStudents = useMemo(() => {
    const q = memberQuery.toLowerCase().trim();
    const list = q ? students.filter(s => `${s.name} ${s.email || ''}`.toLowerCase().includes(q)) : students;
    // selected first, then by name
    return [...list].sort((a, b) =>
      Number(draft?.memberIds.includes(b.userId)) - Number(draft?.memberIds.includes(a.userId)) || a.name.localeCompare(b.name, 'ka'));
  }, [students, memberQuery, draft?.memberIds]);

  if (!draft) {
    if (!isAdminMode) return loading ? <p className="py-8 text-center text-sm text-[#8a7a6a]">იტვირთება...</p> : null;
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => edit()}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-[#7a2028] hover:bg-[#5e1820] text-[#fbf6ec] font-bold text-sm cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" /> ახალი კლასი
        </button>

        {loading ? (
          <p className="py-8 text-center text-sm text-[#8a7a6a]">იტვირთება...</p>
        ) : classes.length === 0 ? (
          <p className="py-10 text-center text-sm text-[#8a7a6a] rounded-2xl border border-dashed border-[#e8dcc8]">
            კლასი ჯერ არ შექმნილა. შექმენი პირველი და დაამატე წევრები.
          </p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {classes.map(c => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 p-3.5 rounded-2xl bg-white ring-1 ring-[#e8dcc8]">
                <ClassLogo name={c.name} logo={c.logo} className="w-12 h-12 text-lg shrink-0" />
                <div className="min-w-0 flex-1 basis-40">
                  <p className="font-serif-ge font-bold text-[#4a3426] leading-snug">{c.name}</p>
                  <p className="text-xs text-[#8a7a6a]">{c.members.length} წევრი · პროგრამაში {c.program.length} პუნქტი</p>
                  <p className={`text-xs ${c.teachers.length ? 'text-[#4a3426]' : 'text-[#9a3324]'}`}>
                    {c.teachers.length ? `მასწავლებელი: ${c.teachers.map(t => t.name).join(', ')}` : 'მასწავლებელი არ ჰყავს'}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <button type="button" onClick={() => openClass(c.id)} title="კლასის გვერდი" className="w-9 h-9 rounded-full ring-1 ring-[#e8dcc8] text-[#8a7a6a] hover:text-[#7a2028] flex items-center justify-center cursor-pointer">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => edit(c)} className="h-9 px-3.5 rounded-full ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40 text-sm font-semibold text-[#4a3426] cursor-pointer">
                    შეცვლა
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const set = (patch: Partial<Draft>) => setDraft(d => (d ? { ...d, ...patch } : d));
  const toggleMember = (uid: string) =>
    set({ memberIds: draft.memberIds.includes(uid) ? draft.memberIds.filter(x => x !== uid) : [...draft.memberIds, uid] });
  const moveItem = (i: number, dir: -1 | 1) => {
    const p = [...draft.program];
    const j = i + dir;
    if (j < 0 || j >= p.length) return;
    [p[i], p[j]] = [p[j], p[i]];
    set({ program: p });
  };

  const pickLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      set({ logo: await imageFileToDataUrl(file) });
    } catch {
      onMessage('ლოგოს სურათი ვერ წაიკითხა.', 'error');
    }
  };

  const save = async () => {
    const name = draft.name.trim();
    if (!name) { onMessage('კლასს სახელი სჭირდება.', 'error'); return; }
    setSaving(true);
    try {
      const ref = draft.id ? doc(db, 'classes', draft.id) : doc(collection(db, 'classes'));
      const members = draft.memberIds
        .map(uid => students.find(s => s.userId === uid))
        .filter(Boolean)
        .map(s => ({ uid: s!.userId, name: s!.name, photoURL: s!.photoURL || '' }));
      const now = new Date().toISOString();
      const teachers = draft.teacherIds
        .map(uid => staff.find(s => s.userId === uid))
        .filter(Boolean)
        .map(s => ({ uid: s!.userId, name: s!.name, photoURL: s!.photoURL || '' }));
      const existing = classes.find(c => c.id === draft.id);
      const teacherIds = isAdminMode ? teachers.map(t => t.uid) : existing?.teacherIds || [];
      await setDoc(ref, {
        name,
        logo: draft.logo,
        memberIds: members.map(m => m.uid),
        members,
        program: draft.program.map(p => ({ ...(p.id ? { id: p.id, code: p.code || '' } : {}), title: p.title.trim(), note: (p.note || '').trim() })).filter(p => p.title),
        classMode: draft.classMode,
        // only admins choose a class's teachers
        ...(isAdminMode ? { teacherIds, teachers } : {}),
        updatedAt: now,
        ...(draft.id ? {} : { createdAt: now, createdBy: user?.email || '' }),
      }, { merge: true });
      const ids = members.map(m => m.uid);
      // the class's teachers may now see and arrange the members' paths
      if (teacherIds.length) {
        await Promise.all(ids.map(uid =>
          (isAdminMode
            ? setDoc(doc(db, 'students', uid), { teacherIds: arrayUnion(...teacherIds) }, { merge: true })
            : draft.savedMemberIds.includes(uid) ? Promise.resolve() : linkTeachers(uid, { id: ref.id, teacherIds })
          ).catch(() => {})
        ));
      }
      const failed = await syncMemberPaths(ref.id, draft.program, ids, draft.savedMemberIds.filter(x => !ids.includes(x)));
      triggerHaptic(30);
      onMessage(
        failed ? `კლასი „${name}“ შენახულია, მაგრამ ${failed} წევრის გზა ვერ განახლდა.` : `კლასი „${name}“ შენახულია და პროგრამა წევრებს მიენიჭა.`,
        failed ? 'error' : 'success'
      );
      setDraft(d => (d ? { ...d, id: ref.id, memberIds: ids, savedMemberIds: ids } : d));
    } catch (err: any) {
      onMessage('კლასი ვერ შეინახა: ' + (err?.code === 'permission-denied' ? 'ბაზის წესებში კლასები ჯერ არ არის დამატებული.' : err?.message || ''), 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!draft.id || !window.confirm(`წავშალო კლასი „${draft.name}“? წევრები თავად არ წაიშლებიან.`)) return;
    try {
      await deleteDoc(doc(db, 'classes', draft.id));
      onMessage(`კლასი „${draft.name}“ წაიშალა.`, 'success');
      setDraft(null);
    } catch (err: any) {
      onMessage('კლასი ვერ წაიშალა: ' + (err?.message || ''), 'error');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-serif-ge text-lg font-bold text-[#4a3426]">{draft.id ? 'კლასის შეცვლა' : 'ახალი კლასი'}</h3>
        {!openId && (
          <button type="button" onClick={() => setDraft(null)} title="გაუქმება" className="w-9 h-9 rounded-full ring-1 ring-[#e8dcc8] text-[#8a7a6a] hover:text-[#7a2028] flex items-center justify-center cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

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
        {isAdminMode ? (
          staff.length === 0 ? (
            <p className="text-sm text-[#8a7a6a]">მასწავლებელი ჯერ არავინაა დანიშნული — „მომხმარებლებში“ მიანიჭე როლი „მასწავლებელი“.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {staff.map(t => {
                const on = draft.teacherIds.includes(t.userId);
                return (
                  <button key={t.userId} type="button"
                    onClick={() => set({ teacherIds: on ? draft.teacherIds.filter(x => x !== t.userId) : [...draft.teacherIds, t.userId] })}
                    className={`inline-flex items-center gap-2 h-10 pl-1 pr-3.5 rounded-full text-sm font-semibold cursor-pointer transition-colors ${on ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] hover:ring-[#7a2028]/40'}`}>
                    {t.photoURL ? <img src={t.photoURL} alt="" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" /> : <span className="w-8 h-8 rounded-full bg-[#efe5d4] text-[#4a3426] text-sm font-bold flex items-center justify-center">{t.name.charAt(0)}</span>}
                    {t.name}
                    {on && <Check className="w-4 h-4" />}
                  </button>
                );
              })}
            </div>
          )
        ) : (
          <p className="text-sm font-semibold text-[#2a2017]">{classes.find(c => c.id === draft.id)?.teachers.map(t => t.name).join(', ') || '—'}</p>
        )}
      </div>

      {/* members */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <label className="text-xs font-semibold text-[#75685a]">წევრები</label>
          <span className="text-xs font-bold text-[#7a2028]">{draft.memberIds.length} არჩეულია</span>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-[#b3a594] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={memberQuery} onChange={e => setMemberQuery(e.target.value)} placeholder="მოძებნე სახელით ან ელფოსტით" className={`${field} pl-10`} />
        </div>
        <ul className="max-h-72 overflow-y-auto rounded-2xl ring-1 ring-[#e8dcc8] bg-white divide-y divide-[#f1e8d9]">
          {shownStudents.map(s => {
            const on = draft.memberIds.includes(s.userId);
            return (
              <li key={s.userId}>
                <button type="button" onClick={() => toggleMember(s.userId)} className={`w-full flex items-center gap-3 px-3 py-2.5 text-left cursor-pointer transition-colors ${on ? 'bg-[#7a2028]/5' : 'hover:bg-[#fbf6ec]'}`}>
                  <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${on ? 'bg-[#7a2028] text-white' : 'ring-1 ring-[#d9c8ac]'}`}>
                    {on && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </span>
                  {s.photoURL ? (
                    <img src={s.photoURL} alt="" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="w-8 h-8 rounded-full bg-[#efe5d4] text-[#4a3426] text-sm font-bold flex items-center justify-center">{s.name.charAt(0)}</span>
                  )}
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-[#2a2017] truncate">{s.name}</span>
                    {s.email && <span className="block text-xs text-[#8a7a6a] truncate">{s.email}</span>}
                  </span>
                </button>
              </li>
            );
          })}
          {shownStudents.length === 0 && <li className="px-3 py-6 text-center text-sm text-[#8a7a6a]">ვერ მოიძებნა.</li>}
        </ul>
      </div>

      {/* program: picked from the catalogue, given to every member on save */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <label className="text-xs font-semibold text-[#75685a]">საერთო პროგრამა</label>
          <span className="text-xs text-[#8a7a6a]">შენახვისას ყველა წევრის საგანძურის გზას დაემატება</span>
        </div>
        <CatalogPicker
          isTaken={id => draft.program.some(p => p.id === id)}
          onPick={e => set({ program: [...draft.program, { id: e.id, title: e.title, code: e.code }] })}
        />
        {draft.program.length > 0 && (
          <ol className="rounded-2xl ring-1 ring-[#e8dcc8] bg-white divide-y divide-[#f1e8d9]">
            {draft.program.map((p, i) => {
              const cat = p.id ? findCatalogEntry(p.id)?.category : undefined;
              return (
                <li key={p.id || i} className="flex items-center gap-2 px-3 py-2">
                  <span className="w-7 h-7 shrink-0 rounded-full bg-[#7a2028]/10 text-[#7a2028] text-sm font-bold flex items-center justify-center tabular-nums">{i + 1}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-[#2a2017] truncate">{p.title}</span>
                    <span className="block text-xs text-[#8a7a6a]">{cat ? `${CATEGORY_LABEL[cat]} · ${p.code}` : 'ტექსტი'}</span>
                  </span>
                  <button type="button" onClick={() => moveItem(i, -1)} disabled={i === 0} title="ზემოთ" className="w-8 h-8 rounded-full text-[#8a7a6a] hover:bg-[#fbf6ec] disabled:opacity-30 flex items-center justify-center cursor-pointer"><ArrowUp className="w-4 h-4" /></button>
                  <button type="button" onClick={() => moveItem(i, 1)} disabled={i === draft.program.length - 1} title="ქვემოთ" className="w-8 h-8 rounded-full text-[#8a7a6a] hover:bg-[#fbf6ec] disabled:opacity-30 flex items-center justify-center cursor-pointer"><ArrowDown className="w-4 h-4" /></button>
                  <button type="button" onClick={() => set({ program: draft.program.filter((_, j) => j !== i) })} title="პროგრამიდან ამოღება" className="w-8 h-8 rounded-full text-[#8a7a6a] hover:text-red-600 hover:bg-red-50 flex items-center justify-center cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3.5">
        <Toggle
          on={draft.classMode}
          onChange={on => set({ classMode: on })}
          label="კლასის რეჟიმი"
          hint="წევრები გალობაში ხედავენ მხოლოდ კლასის პროგრამის ვერსიებს — დამწყები აღარ იკარგება 1 130 ვერსიაში. „ყველაფრის ჩვენება“ ერთი შეხებით."
        />
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
        {draft.id && isAdminMode && (
          <button type="button" onClick={remove} className="h-12 px-5 rounded-2xl ring-1 ring-red-200 text-red-700 hover:bg-red-50 font-semibold text-sm cursor-pointer inline-flex items-center justify-center gap-2">
            <Trash2 className="w-4 h-4" /> კლასის წაშლა
          </button>
        )}
        <button type="button" onClick={save} disabled={saving} className="flex-1 h-12 rounded-2xl bg-[#7a2028] hover:bg-[#5e1820] text-[#fbf6ec] font-bold text-[15px] cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2">
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          შენახვა
        </button>
      </div>

      {/* each saved member's path: assign, remove, reorder, confirm voices */}
      {draft.id && draft.savedMemberIds.length > 0 && (
        <div className="pt-5 mt-2 border-t border-[#e8dcc8] space-y-3">
          <h3 className="font-serif-ge text-lg font-bold text-[#4a3426]">წევრების საგანძურის გზა</h3>
          <div className="flex flex-wrap gap-2">
            {draft.savedMemberIds.map(uid => {
              const st = students.find(s => s.userId === uid);
              const on = pathOf === uid;
              return (
                <button
                  key={uid}
                  type="button"
                  onClick={() => setPathOf(on ? null : uid)}
                  className={`inline-flex items-center gap-2 h-10 pl-1 pr-3.5 rounded-full text-sm font-semibold cursor-pointer transition-colors ${
                    on ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] hover:ring-[#7a2028]/40'
                  }`}
                >
                  {st?.photoURL ? (
                    <img src={st.photoURL} alt="" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="w-8 h-8 rounded-full bg-[#efe5d4] text-[#4a3426] text-sm font-bold flex items-center justify-center">{(st?.name || '?').charAt(0)}</span>
                  )}
                  {st?.name || 'წევრი'}
                </button>
              );
            })}
          </div>
          {pathOf ? (
            <MemberPathEditor
              key={pathOf}
              uid={pathOf}
              name={students.find(s => s.userId === pathOf)?.name || 'მოსწავლე'}
              onError={t => onMessage(t, 'error')}
            />
          ) : (
            <p className="text-sm text-[#8a7a6a]">აირჩიე წევრი, რომ მისი გზა ნახო, შეცვალო და ხმები ჩაუთვალო.</p>
          )}
        </div>
      )}
    </div>
  );
};
