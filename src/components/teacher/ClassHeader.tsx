import React, { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { BookOpen, CalendarClock, Check, ChevronRight, Info, PenLine, Plus, Upload } from 'lucide-react';
import { db } from '../../firebase';
import { useNavigation } from '../../context';
import { SchoolClass, imageFileToDataUrl } from '../../hooks/useClasses';
import { PsalterGroup, toGroup, useGroupNow } from '../../hooks/usePsalter';
import { KATHISMA_COUNT, formatRange, readCount } from '../../utils/psalter';
import { triggerHaptic } from '../../utils/haptics';
import { ClassLogo } from '../classes/ClassLogo';
import { CLASS_MODE_HINT } from '../admin/ClassesAdmin';
import { openPsalterGroup } from '../psalter/selectedGroup';
import { CreateGroupSheet } from '../../pages/PsalterPage';
import { LessonPills, ScheduleSheet } from './Schedule';
import { Bar, Btn, Card, Flash, IconBtn, useFlash } from '../ui/kit';

type Editable = Partial<Pick<SchoolClass, 'name' | 'logo' | 'classMode' | 'psalterGroupId'>>;

// The top of the class tab: the class's logo and name (edited in place, saved at once), the class mode, and the
// class's own psalter group — made by its teacher; a class without one shows a button to make it.
export const ClassHeader: React.FC<{ cls: SchoolClass }> = ({ cls }) => {
  const msg = useFlash();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(cls.name);
  const [info, setInfo] = useState(false);
  useEffect(() => setName(cls.name), [cls.name]);
  const dirty = !!name.trim() && name.trim() !== cls.name;
  const mode = !!cls.classMode;

  const save = async (patch: Editable) => {
    try {
      await updateDoc(doc(db, 'classes', cls.id), { ...patch, updatedAt: new Date().toISOString() });
      triggerHaptic(15);
    } catch {
      msg.fail('ვერ შეინახა.');
    }
  };
  const saveName = () => (dirty ? void save({ name: name.trim() }) : setName(cls.name));
  const pickLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      await save({ logo: await imageFileToDataUrl(file) });
    } catch {
      msg.fail('ლოგოს სურათი ვერ წაიკითხა.');
    }
  };

  return (
    <Card>
      <div className="flex items-center gap-3.5">
        <button type="button" onClick={() => fileRef.current?.click()} aria-label="ლოგოს შეცვლა" title="ლოგოს შეცვლა" className="relative shrink-0 cursor-pointer group">
          <ClassLogo name={cls.name} logo={cls.logo} className="w-16 h-16 text-2xl" />
          <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white ring-1 ring-[#e8dcc8] text-[#7a2028] shadow-sm flex items-center justify-center group-hover:bg-[#7a2028] group-hover:text-white transition-colors">
            <Upload className="w-3.5 h-3.5" />
          </span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickLogo} />
        <div className="flex-1 min-w-0">
          <div className="relative">
            <input value={name} onChange={e => setName(e.target.value)} onBlur={saveName} onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
              aria-label="კლასის სახელი" placeholder="კლასის სახელი"
              className="w-full h-11 -ml-2 pl-2 pr-11 rounded-xl bg-transparent hover:bg-white focus:bg-white ring-1 ring-transparent hover:ring-[#e8dcc8] focus:ring-2 focus:ring-[#7a2028]/35 font-serif-ge text-[19px] font-bold text-[#4a3426] outline-none transition text-ellipsis" />
            {dirty ? (
              <button type="button" onMouseDown={e => e.preventDefault()} onClick={saveName} aria-label="სახელის შენახვა"
                className="absolute right-[-6px] top-1 w-9 h-9 rounded-lg bg-[#7a2028] text-white flex items-center justify-center cursor-pointer sg-in">
                <Check className="w-4 h-4 stroke-[3]" />
              </button>
            ) : (
              <PenLine className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 text-[#cdbb9f] pointer-events-none" />
            )}
          </div>
          <div className="mt-1 flex items-center gap-1">
            <button type="button" role="switch" aria-checked={mode} onClick={() => save({ classMode: !mode })}
              className={`inline-flex items-center gap-2 h-8 pl-1.5 pr-3 rounded-full text-[13px] font-semibold cursor-pointer transition ${mode ? 'bg-[#7a2028]/[0.08] text-[#7a2028]' : 'bg-[#f6efe3] text-[#75685a] hover:text-[#4a3426]'}`}>
              <span className={`relative w-8 h-[18px] rounded-full transition-colors ${mode ? 'bg-[#7a2028]' : 'bg-[#d9c8ac]'}`}>
                <span className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-all ${mode ? 'left-[16px]' : 'left-[2px]'}`} />
              </span>
              კლასის რეჟიმი
            </button>
            <button type="button" onClick={() => setInfo(v => !v)} aria-label="რას აკეთებს კლასის რეჟიმი" aria-expanded={info}
              className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition ${info ? 'bg-[#7a2028]/[0.1] text-[#7a2028]' : 'text-[#b3a594] hover:text-[#7a2028]'}`}>
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      {info && <p className="mt-2 text-[13px] text-[#75685a] leading-relaxed sg-in">{CLASS_MODE_HINT}</p>}
      <ClassSchedule cls={cls} />
      <ClassPsalter cls={cls} onLink={id => save({ psalterGroupId: id })} />
      {msg.flash && <div className="mt-3"><Flash flash={msg.flash} onClose={msg.clear} /></div>}
    </Card>
  );
};

/** The lessons as chips (the next one filled in); the pencil opens the timetable's window. */
const ClassSchedule: React.FC<{ cls: SchoolClass }> = ({ cls }) => {
  const [editing, setEditing] = useState(false);
  const has = cls.schedule.length > 0;
  // a place written on every lesson is shown once, beside the title
  const notes = new Set(cls.schedule.map(s => s.note?.trim() || ''));
  const place = notes.size === 1 ? [...notes][0] : '';
  return (
    <div className="mt-3.5 pt-3.5 border-t border-[#f1e8d9]">
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-xl bg-[#7a2028]/[0.08] text-[#7a2028] flex items-center justify-center shrink-0"><CalendarClock className="w-[18px] h-[18px]" /></span>
        <span className="flex-1 min-w-0">
          <span className="flex items-baseline gap-1.5 min-w-0">
            <span className="text-sm font-bold text-[#4a3426]">გაკვეთილები</span>
            {place && <span className="text-xs text-[#8a7a6a] truncate">· {place}</span>}
          </span>
          {has ? <LessonPills slots={cls.schedule} /> : <span className="block text-xs text-[#8a7a6a]">ცხრილი ჯერ არ არის</span>}
        </span>
        {has ? (
          <IconBtn label="ცხრილის შეცვლა" onClick={() => setEditing(true)}><PenLine /></IconBtn>
        ) : (
          <Btn kind="soft" size="sm" icon={<Plus />} onClick={() => setEditing(true)}>დამატება</Btn>
        )}
      </div>
      <ScheduleSheet cls={cls} open={editing} onClose={() => setEditing(false)} />
    </div>
  );
};

/** The class's own group, live; undefined while loading or when it can't be read. */
const useClassGroup = (id?: string) => {
  const [group, setGroup] = useState<PsalterGroup | null | undefined>(undefined);
  useEffect(() => {
    if (!id) { setGroup(null); return; }
    setGroup(undefined);
    return onSnapshot(doc(db, 'psalterGroups', id), s => setGroup(s.exists() ? toGroup(s.id, s.data()) : null), () => setGroup(undefined));
  }, [id]);
  return group;
};

const ClassPsalter: React.FC<{ cls: SchoolClass; onLink: (id: string) => Promise<void> }> = ({ cls, onLink }) => {
  const group = useClassGroup(cls.psalterGroupId);
  const [creating, setCreating] = useState(false);
  if (group === undefined) return null;
  const people = (list: SchoolClass['members']) => list.map(m => ({ uid: m.uid, name: m.name, photoURL: m.photoURL || '' }));
  return (
    <div className="mt-3.5 pt-3.5 border-t border-[#f1e8d9]">
      {group ? <GroupLine group={group} /> : (
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-[#7a2028]/[0.08] text-[#7a2028] flex items-center justify-center shrink-0"><BookOpen className="w-[18px] h-[18px]" /></span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-[#4a3426]">ფსალმუნთა ჯგუფი</span>
            <span className="block text-xs text-[#8a7a6a]">ჯერ არ შექმნილა</span>
          </span>
          <Btn kind="soft" size="sm" icon={<Plus />} onClick={() => setCreating(true)}>შექმნა</Btn>
        </div>
      )}
      <CreateGroupSheet open={creating} onClose={() => setCreating(false)} onCreated={onLink}
        preset={{ name: cls.name, members: people(cls.members), teachers: people(cls.teachers) }} />
    </div>
  );
};

/** The group in one line: name, members, the current cycle, kathismas read; a tap opens it on the psalter page. */
const GroupLine: React.FC<{ group: PsalterGroup }> = ({ group }) => {
  const { navigateTo } = useNavigation();
  const { cycle, slots } = useGroupNow(group, null);
  const read = readCount(slots);
  return (
    <button type="button" onClick={() => { openPsalterGroup(group.id); navigateTo('psalter'); }} className="w-full text-left cursor-pointer group">
      <span className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-xl bg-[#7a2028] text-[#fbf6ec] flex items-center justify-center shrink-0"><BookOpen className="w-[18px] h-[18px]" /></span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold text-[#2a2017] truncate">{group.name}</span>
          <span className="block text-xs text-[#8a7a6a] truncate">ფსალმუნთა ჯგუფი · {group.members.length} წევრი{cycle ? ` · ${formatRange(cycle)}` : ''}</span>
        </span>
        <span className="text-sm font-bold tabular-nums text-[#7a2028]">{read}/{KATHISMA_COUNT}</span>
        <ChevronRight className="w-4 h-4 text-[#b3a594] group-hover:text-[#7a2028] transition-colors" />
      </span>
      <span className="block mt-2 pl-12"><Bar value={read} max={KATHISMA_COUNT} tone={read === KATHISMA_COUNT ? 'green' : 'wine'} /></span>
    </button>
  );
};
