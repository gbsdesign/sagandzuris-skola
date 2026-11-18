import React, { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, Plus, RefreshCw, Users } from 'lucide-react';
import { useAuth, useNavigation } from '../../../context';
import { Button, Dot, Field, FOCUS, Helper, Press, Row, Rows, Sheet, Stepper, Val, cx } from '../../../components/ui2';
import type { SchoolClass } from '../../../hooks/useClasses';
import { openPsalterGroup } from '../../../components/psalter/selectedGroup';
import { DEFAULT_SHIFT_DAYS, MAX_CYCLE_DAYS, parseShiftDays, shiftDaysText } from '../../../utils/psalter';
import { Msg, useMsg } from './parts';
import { createClassGroup } from './groupOps';

/** x-psalmuni-akhali — making the class's psalter group: the name (the class's to start with), the cycle's days with − / +, the
 *  shift days (a small editor in place), the line on the class's members, and „+ შექმნა“ — made as the old class header made it
 *  (`createClassGroup`), then the group's page opens. */
export const NewGroupSheet: React.FC<{ cls: SchoolClass; open: boolean; onClose: () => void }> = ({ cls, open, onClose }) => {
  const { user } = useAuth();
  const { navigateTo } = useNavigation();
  const msg = useMsg();
  const [name, setName] = useState(cls.name);
  const [days, setDays] = useState(2);
  const [shiftText, setShiftText] = useState(DEFAULT_SHIFT_DAYS.join(', '));
  const [editShift, setEditShift] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setName(cls.name); setEditShift(false); msg.clear(); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const shiftDays = parseShiftDays(shiftText);

  const create = async () => {
    if (!user) return;
    if (!name.trim()) { msg.fail('დაარქვი ჯგუფს სახელი.'); return; }
    if (shiftDays === null) { msg.fail('გადასვლის რიცხვები 1-დან 28-მდე ჩაწერე, მძიმით: მაგ. 1, 15.'); return; }
    setSaving(true);
    try {
      const id = await createClassGroup(cls, user, name, days, shiftDays);
      openPsalterGroup(id);
      onClose();
      navigateTo('psalter');
    } catch {
      msg.fail('ჯგუფი ვერ შეიქმნა.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="ახალი ფსალმუნთა ჯგუფი">
      {editShift ? (
        <>
          <Press onClick={() => setEditShift(false)} className={cx('flex h-tap shrink-0 cursor-pointer items-center gap-2 self-start text-body font-bold text-wine', FOCUS)}>
            <ArrowLeft className="size-[18px]" /> უკან
          </Press>
          <Field label="კანონის შეცვლის რიცხვები" value={shiftText} onChange={setShiftText} inputMode="text" placeholder="1, 15"
            hint={shiftDays ? `${shiftDaysText(shiftDays)} რიცხვში ყველა შემდეგ კანონზე გადადის.` : 'ჩაწერე 1-დან 28-მდე, მძიმით: მაგ. 1, 15.'} />
          <Button full disabled={!shiftDays} onClick={() => setEditShift(false)}>მზადაა</Button>
        </>
      ) : (
        <>
          <Field label="სახელი" value={name} onChange={setName} placeholder="მაგ: წმ. ნინოს სახელობის ჯგუფი" />
          <Rows>
            <Row lead={<Dot icon={<RefreshCw />} size={40} />} title="ციკლი" sub="დღე · 20 კანონი"
              right={<Stepper label="ციკლის დღეები" value={days} min={1} max={MAX_CYCLE_DAYS} onChange={setDays} />} />
            <Row lead={<Dot icon={<CalendarDays />} size={40} />} title="გადასვლა" sub="კანონის შეცვლის რიცხვები"
              right={<Val>{shiftDays ? shiftDaysText(shiftDays) : '—'}</Val>} onClick={() => setEditShift(true)} />
          </Rows>
          <Helper icon={<Users />}>კლასის {cls.members.length} წევრი ჯგუფში თავიდანვე იქნება. კანონებს მერე გაუნაწილებ.</Helper>
          <Msg msg={msg.msg} onClose={msg.clear} />
          <Button full icon={<Plus />} disabled={saving} onClick={() => void create()}>{saving ? 'იქმნება…' : 'შექმნა'}</Button>
        </>
      )}
    </Sheet>
  );
};
