import React, { useEffect, useRef, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { Check, Info, PenLine, Upload } from 'lucide-react';
import { db } from '../../firebase';
import { SchoolClass, imageFileToDataUrl } from '../../hooks/useClasses';
import { triggerHaptic } from '../../utils/haptics';
import { ClassLogo } from '../classes/ClassLogo';
import { CLASS_MODE_HINT } from '../admin/ClassesAdmin';
import { Card, Flash, useFlash } from '../ui/kit';

type Editable = Partial<Pick<SchoolClass, 'name' | 'logo' | 'classMode'>>;

// The class's ✎ window on the class page: the logo and name (edited in place, saved at once) and the class mode.
// The timetable and the psalter group are edited where they show, on the class page itself (stage 2, 2026-10-25).
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
      {msg.flash && <div className="mt-3"><Flash flash={msg.flash} onClose={msg.clear} /></div>}
    </Card>
  );
};
