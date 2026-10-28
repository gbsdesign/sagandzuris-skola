import React, { useState } from 'react';
import { Check, Download, Plus, School } from 'lucide-react';
import { useAuth } from '../../context';
import { SchoolClass } from '../../hooks/useClasses';
import { setCentreMember, useCentreDownloadSettings } from '../../hooks/useCentreDownload';
import { logChange } from '../../utils/adminLog';
import { errorText } from '../../utils/errorText';
import { askConfirm, Btn, Sheet } from '../ui/kit';
import { ClassLogo } from '../classes/ClassLogo';
import { AccessRecord, saveAccess } from './AccessRequests';
import { addClassMembers, removeClassMembers } from './ClassesAdmin';
import { changed } from './changed';
import { roleOf } from './PersonSheet';
import type { StaffRecord, UserRecord } from './UsersTab';

type Msg = (text: string, type: 'success' | 'error') => void;

// „მონიშვნა“ in the members list (admin review, idea 8, 2026-10-28): several people ticked, then one tap — into a class
// (with „გაუქმება“ for a few seconds), let in (superadmins; those still waiting, after one question) or the folklore
// centre's recordings switched on (members; staff always may). The bar stands at the screen's bottom while people are
// ticked; every action is logged like the same change made in a person's window.
export const BulkBar: React.FC<{
  picked: UserRecord[];
  staff: StaffRecord[];
  classes: SchoolClass[];
  access: Record<string, AccessRecord>;
  onDone: () => void;
  onMessage: Msg;
}> = ({ picked, staff, classes, access, onDone, onMessage }) => {
  const { user, isSuperAdmin } = useAuth();
  const centre = useCentreDownloadSettings();
  const [busy, setBusy] = useState(false);
  const [choosing, setChoosing] = useState(false);

  const waiting = isSuperAdmin ? picked.filter(u => roleOf(u, staff) === 'member' && access[u.userId]?.status === 'pending') : [];
  const noRight = centre.everyone ? [] : picked.filter(u => roleOf(u, staff) === 'member' && !centre.uids.includes(u.userId));
  const n = picked.length;

  const toClass = async (c: SchoolClass) => {
    setBusy(true);
    try {
      const people = picked.map(u => ({ uid: u.userId, name: u.name, photoURL: u.photoURL }));
      const { added, failed, lost, after } = await addClassMembers(c, people);
      setChoosing(false);
      if (!added.length) {
        onMessage(lost ? `კლასში „${c.name}“ ვერავინ ჩაიწერა — შეამოწმე ინტერნეტი.` : `ყველა მონიშნული უკვე კლასშია „${c.name}“.`, lost ? 'error' : 'success');
        return;
      }
      if (lost || failed) {
        onMessage(`${added.length} ჩაიწერა${lost ? `, ${lost} ვერა` : ''}${failed ? ` · ${failed} ადამიანის გზაზე პროგრამა ვერ დაემატა — კლასის გვერდიდან სცადე თავიდან` : ''}.`, 'error');
      }
      const names = picked.filter(u => added.includes(u.userId)).map(u => u.name);
      changed('member', `${added.length} ადამიანი ჩაიწერა კლასში „${c.name}“: ${names.join(', ')}`.slice(0, 300), c.id,
        () => removeClassMembers(after, added), `${added.length} ადამიანი ჩაიწერა კლასში „${c.name}“`);
      onDone();
    } catch (e) {
      onMessage(`კლასში ვერ ჩაიწერა: ${errorText(e)}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const letIn = async () => {
    const k = waiting.length;
    const ok = await askConfirm({
      title: `${k} ადამიანის დაშვება?`,
      text: `${waiting.map(u => u.name).join(', ')}. ყველა მიიღებს სრულ წვდომას; ცალკე შეზღუდვა მერე მის ფანჯარაში შეიძლება.`,
      ok: 'დაშვება',
    });
    if (!ok) return;
    setBusy(true);
    let bad = 0;
    for (const u of waiting) {
      try {
        await saveAccess(u.userId, user?.email || '', 'approved', 'all');
        logChange('access', `${u.name} დაემატა სკოლაში`, u.userId);
      } catch {
        bad++;
      }
    }
    setBusy(false);
    onMessage(bad ? `${k - bad} დაემატა, ${bad} ვერა — სცადე თავიდან.` : `${k} ადამიანი დაემატა.`, bad ? 'error' : 'success');
    if (!bad) onDone();
  };

  const giveRight = async () => {
    const list = noRight;
    setBusy(true);
    try {
      await Promise.all(list.map(u => setCentreMember(u.userId, true)));
      changed('right', `${list.length} წევრს ჩაერთო ცენტრის ჩანაწერების ჩამოწერა: ${list.map(u => u.name).join(', ')}`.slice(0, 300), '',
        () => Promise.all(list.map(u => setCentreMember(u.userId, false))), `${list.length} წევრს ჩაერთო ცენტრის ჩანაწერები`);
      onDone();
    } catch (e) {
      onMessage('ვერ შეინახა: ' + errorText(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* above the bottom edge (and the phone's bar); wraps into two rows on a narrow phone */}
      <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none">
        <div role="toolbar" aria-label="მონიშნულები"
          className="pointer-events-auto mx-auto max-w-4xl rounded-3xl bg-[#2a2017] text-[#fbf6ec] shadow-[0_12px_32px_-12px_rgba(42,32,23,0.7)] px-3 py-2.5 flex flex-wrap items-center gap-2 sg-in">
          <span className="px-1.5 text-[14px] font-bold tabular-nums mr-auto">{n ? `${n} მონიშნული` : 'მონიშნე ადამიანები'}</span>
          <Btn kind="light" size="sm" icon={<School />} onClick={() => setChoosing(true)} disabled={busy || !n || !classes.length}>კლასში</Btn>
          {waiting.length > 0 && (
            <Btn kind="light" size="sm" icon={<Check />} onClick={letIn} disabled={busy}>დაშვება · {waiting.length}</Btn>
          )}
          {noRight.length > 0 && (
            <Btn kind="light" size="sm" icon={<Download />} onClick={giveRight} disabled={busy}
              title="ფოლკლორის ცენტრის ჩანაწერების ჩამოწერა (MP3 / ინტერნეტის გარეშე) — მონიშნულ წევრებს">
              ჩანაწერები · {noRight.length}
            </Btn>
          )}
        </div>
      </div>

      {choosing && (
        <Sheet open onClose={() => setChoosing(false)} title={`კლასში ჩაწერა · ${n}`}>
          <p className="mb-3 text-[13px] text-[#75685a] leading-snug">აირჩიე კლასი — მონიშნულები ერთად ჩაიწერებიან (ვინც უკვე იქაა, ისე დარჩება).</p>
          <ul className="rounded-2xl ring-1 ring-[#e8dcc8] bg-white divide-y divide-[#f1e8d9]">
            {classes.map(c => {
              const fresh = picked.filter(u => !c.memberIds.includes(u.userId)).length;
              return (
                <li key={c.id}>
                  <button type="button" onClick={() => toClass(c)} disabled={busy || !fresh}
                    className="w-full min-h-14 px-3 py-2 flex items-center gap-3 text-left cursor-pointer hover:bg-[#7a2028]/[0.04] disabled:opacity-50 disabled:cursor-default">
                    <ClassLogo name={c.name} logo={c.logo} className="w-10 h-10 text-xs shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[14px] font-semibold text-[#2a2017] leading-snug break-words">{c.name}</span>
                      <span className="block text-[12px] text-[#8a7a6a]">{c.members.length} წევრი{fresh < n && ` · ${n - fresh} უკვე აქაა`}</span>
                    </span>
                    {fresh > 0 ? (
                      <span className="shrink-0 h-8 px-2.5 rounded-full bg-[#7a2028]/[0.08] text-[#7a2028] text-[13px] font-bold inline-flex items-center gap-1 tabular-nums">
                        <Plus className="w-4 h-4" />{fresh}
                      </span>
                    ) : <Check className="w-4 h-4 shrink-0 text-[#b3a594]" aria-label="ყველა უკვე აქაა" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </Sheet>
      )}
    </>
  );
};
