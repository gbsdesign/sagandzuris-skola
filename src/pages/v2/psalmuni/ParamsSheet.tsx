import React, { useEffect, useState } from 'react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useAuth } from '../../../context';
import { Button, Choice, Field, FOCUS, Note, Press, Row, Rows, Sheet, Stepper, ToggleRow, Val, cx } from '../../../components/ui2';
import type { SchoolClass } from '../../../hooks/useClasses';
import type { PsalterGroup } from '../../../hooks/usePsalter';
import { MAX_CYCLE_DAYS, parseShiftDays, shiftDaysText } from '../../../utils/psalter';
import { Msg, useMsg } from './parts';
import { REMIND_TIMES, removeGroup, saveSettings, setReading, type SettingsPatch } from './groupOps';

type Edit = null | 'name' | 'cycle' | 'shift' | 'daily' | 'final';

const TITLES: Record<Exclude<Edit, null>, string> = {
  name: 'ჯგუფის სახელი', cycle: 'ციკლი', shift: 'გადასვლა', daily: 'შეხსენება', final: 'ციკლის ბოლოს',
};

const timeText = (t: string) => t || 'გამორთული';

/** x-psalmuni-parametrebi — the leader's group settings: one line each (name, cycle, shift days, the two reminders), each
 *  opening its small editor in place; „მეც ვკითხულობ“ saves at once; „განაწილება“ goes to its screen; the group's deletion
 *  at the bottom asks first. Every save is the old settings window's (`groupOps.saveSettings`). */
export const ParamsSheet: React.FC<{
  open: boolean; onClose: () => void; group: PsalterGroup; cls?: SchoolClass; onDistribute: () => void; onDeleted: () => void;
}> = ({ open, onClose, group, cls, onDistribute, onDeleted }) => {
  const { user } = useAuth();
  const msg = useMsg();
  const [edit, setEdit] = useState<Edit>(null);
  const [name, setName] = useState(group.name);
  const [cycleDays, setCycleDays] = useState(group.cycleDays);
  const [shiftText, setShiftText] = useState(group.shiftDays.join(', '));
  const [busy, setBusy] = useState(false);
  const reading = !!user && group.memberIds.includes(user.uid);

  // a window opened again starts from what is saved
  useEffect(() => {
    if (!open) return;
    setEdit(null); setName(group.name); setCycleDays(group.cycleDays); setShiftText(group.shiftDays.join(', ')); msg.clear();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const typedShift = parseShiftDays(shiftText);
  const save = async (patch: SettingsPatch) => {
    setBusy(true);
    const r = await saveSettings(group, patch);
    setBusy(false);
    if (r.error) { msg.fail(r.error); return; }
    if (r.done) { setEdit(null); msg.ok('შენახულია.'); }
  };

  const toggleReading = async (on: boolean) => {
    if (!user) return;
    const err = await setReading(group, cls, user, on);
    if (err) msg.fail(err);
  };

  const del = async () => {
    const r = await removeGroup(group, cls);
    if (r === 'deleted') onDeleted();
    else if (r) msg.fail(r);
  };

  const title = edit ? TITLES[edit] : 'ჯგუფის პარამეტრები';
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {edit === null ? (
        <>
          <Msg msg={msg.msg} onClose={msg.clear} />
          <Rows>
            <Row title="სახელი" right={<Val>{group.name}</Val>} onClick={() => setEdit('name')} />
            <Row title="ციკლი" right={<Val>{group.cycleDays} დღე</Val>} onClick={() => setEdit('cycle')} />
            <Row title="გადასვლა" right={<Val>{shiftDaysText(group.shiftDays)} რიცხვში</Val>} onClick={() => setEdit('shift')} />
            <Row title="შეხსენება" right={<Val>{timeText(group.remindDaily)}</Val>} onClick={() => setEdit('daily')} />
            <Row title="ციკლის ბოლოს" right={<Val>{timeText(group.remindFinal)}</Val>} onClick={() => setEdit('final')} />
            <ToggleRow title="მეც ვკითხულობ" on={reading} onChange={on => void toggleReading(on)} />
            <Row title="განაწილება" right={<Val>ვინ რომელ კანონს</Val>} onClick={onDistribute} />
          </Rows>
          <Press onClick={() => void del()} className={cx('mx-auto mt-3 flex h-tap shrink-0 cursor-pointer items-center gap-2 px-4 text-body font-bold text-danger', FOCUS)}>
            <Trash2 className="size-[18px]" /> ჯგუფის წაშლა
          </Press>
        </>
      ) : (
        <>
          <Press onClick={() => setEdit(null)} className={cx('flex h-tap shrink-0 cursor-pointer items-center gap-2 self-start text-body font-bold text-wine', FOCUS)}>
            <ArrowLeft className="size-[18px]" /> პარამეტრები
          </Press>
          <Msg msg={msg.msg} onClose={msg.clear} />
          {edit === 'name' && (
            <>
              <Field label="ჯგუფის სახელი" value={name} onChange={setName} />
              <Button full disabled={busy || !name.trim()} onClick={() => void save({ name })}>შენახვა</Button>
            </>
          )}
          {edit === 'cycle' && (
            <>
              <Rows><Row title="ციკლი" sub={`დღე · ${20} კანონი`} right={<Stepper label="ციკლის დღეები" value={cycleDays} min={1} max={MAX_CYCLE_DAYS} onChange={setCycleDays} />} /></Rows>
              <Note>ციკლში 20-ვე კანონი იკითხება (1–{MAX_CYCLE_DAYS} დღე).</Note>
              <Button full disabled={busy} onClick={() => void save({ cycleDays })}>შენახვა</Button>
            </>
          )}
          {edit === 'shift' && (
            <>
              <Field label="კანონის შეცვლის რიცხვები" value={shiftText} onChange={setShiftText} inputMode="text" placeholder="1, 15"
                hint={typedShift ? `${shiftDaysText(typedShift)} რიცხვში ყველა შემდეგ კანონზე გადადის.` : 'ჩაწერე 1-დან 28-მდე, მძიმით: მაგ. 1, 15.'} />
              <Button full disabled={busy || !typedShift} onClick={() => typedShift && void save({ shiftDays: typedShift })}>შენახვა</Button>
            </>
          )}
          {(edit === 'daily' || edit === 'final') && (
            <Rows role="radiogroup" aria-label={TITLES[edit]}>
              {REMIND_TIMES.map(t => {
                const cur = edit === 'daily' ? group.remindDaily : group.remindFinal;
                return <Choice key={t || 'off'} title={timeText(t)} on={cur === t} disabled={busy}
                  onClick={() => void save(edit === 'daily' ? { remindDaily: t } : { remindFinal: t })} />;
              })}
            </Rows>
          )}
        </>
      )}
    </Sheet>
  );
};
