import React, { useEffect, useRef, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { Camera, Check, MapPin, Music } from 'lucide-react';
import { db } from '../../../../firebase';
import { imageFileToDataUrl, type SchoolClass } from '../../../../hooks/useClasses';
import { triggerHaptic } from '../../../../utils/haptics';
import { shortcutLabel } from '../../../../utils/shortcuts';
import { useFlash } from '../../../../components/ui/kit';
import { ShortcutPicker } from '../../../../components/home/ShortcutShelf';
import { Avatar, Button, Dot, Field, Helper, Row, Rows, Sheet, ToggleRow } from '../../../../components/ui2';

type Editable = Partial<Pick<SchoolClass, 'name' | 'logo' | 'classMode' | 'defaultShortcuts'>>;

/** x-klasi-sakheli — the logo, the name, „გალობაში მხოლოდ პროგრამა“ and the members' starting home buttons. Every change
 *  is saved by itself (the name when the field is left or the window closes), as the old ClassHeader did. */
export const NameLogoSheet: React.FC<{ cls: SchoolClass; open: boolean; onClose: () => void }> = ({ cls, open, onClose }) => {
  const msg = useFlash();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(cls.name);
  const [picking, setPicking] = useState(false);
  useEffect(() => { if (open) { setName(cls.name); msg.clear(); } }, [open, cls.name]); // eslint-disable-line react-hooks/exhaustive-deps
  const mode = !!cls.classMode;
  const buttons = cls.defaultShortcuts || [];

  const save = async (patch: Editable) => {
    try {
      await updateDoc(doc(db, 'classes', cls.id), { ...patch, updatedAt: new Date().toISOString() });
      triggerHaptic(15);
    } catch {
      msg.fail('ვერ შეინახა.');
    }
  };
  const dirty = !!name.trim() && name.trim() !== cls.name;
  const saveName = () => (dirty ? save({ name: name.trim() }) : setName(cls.name));
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
  const close = () => { void saveName(); onClose(); };

  const line = buttons.length
    ? buttons.map(id => shortcutLabel(id)?.label).filter(Boolean).join(', ')
    : 'არ არის — თავად აირჩევენ';

  return (
    <>
      <Sheet open={open} onClose={close} title="სახელი და ლოგო">
        <div className="flex items-center gap-2.5">
          <Avatar name={cls.name} photo={cls.logo} size={64} color="wine" />
          <Button kind="ghost" size="md" icon={<Camera />} className="min-w-0 flex-1" onClick={() => fileRef.current?.click()}>ფოტოს შეცვლა</Button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickLogo} />
        </div>
        <Field
          label="კლასის სახელი"
          value={name}
          onChange={setName}
          placeholder="კლასის სახელი"
          onBlur={saveName}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        />
        <Rows>
          <ToggleRow lead={<Dot icon={<Music />} />} title="გალობაში მხოლოდ პროგრამა" on={mode} onChange={v => void save({ classMode: v })} wrap />
          <Row lead={<Dot icon={<MapPin />} />} title="საწყისი ღილაკები წევრებს" sub={line} onClick={() => setPicking(true)} />
        </Rows>
        {msg.flash
          ? <p className="px-1.5 text-meta text-danger">{msg.flash.text}</p>
          : <Helper icon={<Check />}>ცვლილება თავისით ინახება.</Helper>}
      </Sheet>
      <ShortcutPicker open={picking} onClose={() => setPicking(false)} current={buttons} onChange={next => void save({ defaultShortcuts: next })} />
    </>
  );
};
